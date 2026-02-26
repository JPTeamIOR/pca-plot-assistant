import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { startGeminiChat } from "./ai-client.service";
import { isSafeQuery } from "./queryValidator";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Read the Prisma schema file for context
const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
const prismaSchema = fs.readFileSync(schemaPath, 'utf-8');

/**
 * Helper to recursively convert BigInt to string for JSON serialization
 */
function serializeData(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
        return typeof obj === 'bigint' ? obj.toString() : obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(serializeData);
    }

    const result: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[key] = serializeData(obj[key]);
        }
    }
    return result;
}

/**
 * Tools available for the Agent
 */
const tools = [
    {
        functionDeclarations: [
            {
                name: "query_database",
                description: "Executes a READ-ONLY SQL query on the Prostate Cancer Atlas database. Use this to retrieve data for the user.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        sql: {
                            type: "string",
                            description: "The SQL SELECT query to execute."
                        }
                    },
                    required: ["sql"]
                }
            },
            {
                name: "get_schema_details",
                description: "Returns the full Prisma schema of the database to understand table relations and columns.",
                parameters: { type: "OBJECT", properties: {} }
            }
        ]
    }
];

const systemInstruction = `You are the expert autonomous assistant for the Prostate Cancer Atlas. 
Your goal is to help researchers analyze and visualize data (bulk, single-cell, proteomics).

STRATEGY:
1. When a user asks a question, if you need data, use the 'query_database' tool.
2. If you are unsure about the schema, use 'get_schema_details'.
3. You will only see a SAMPLE (first 3 rows) of the database results to save tokens.
4. Your goal is to write a transformation function in JavaScript that will process the FULL results array.

DATABASE RULES:
- The samples for bulk data are always 'PUBLIC_USER' (user_id = 'PUBLIC_USER').
- Bulk metadata is in 'metadata' table (linked to 'metadatakeys').
- Single-cell data is in 'sc_cells', divided in cancer (compartment 0) and non-cancer (compartment 1).
- Compartment is DIFFERENT than dataset.
- Forbidden keywords: INSERT, UPDATE, DELETE, etc. Only SELECT is allowed.

RESPONSE FORMAT:
Your final answer must be a JSON object with this structure:
{
  "transformCode": "function transformData(data) { ... return { data: [...], layout: {...} }; }",
  "explanation": "A brief explanation of what is shown in the plot."
}

The 'transformCode' must be a single string containing a function named 'transformData' that takes 'data' (the full array of objects from the DB) and returns a Plotly.js configuration object.`;

/**
 * Process a user request using an autonomous agent loop
 */
export async function runPcaAgent(userInput: string) {
    const chat = await startGeminiChat(systemInstruction, tools);
    let fullResults: any[] = [];

    let result = await chat.sendMessage(userInput);
    let response = result.response;

    // Agent Loop: Handle function calls until we get a text response
    while (response.functionCalls()?.length) {
        const functionCalls = response.functionCalls();
        const toolOutputs = [];

        for (const call of functionCalls!) {
            console.log(`[Agent] Calling tool: ${call.name} with args:`, call.args);

            if (call.name === "get_schema_details") {
                toolOutputs.push({
                    functionResponse: {
                        name: "get_schema_details",
                        response: { schema: prismaSchema }
                    }
                });
            } else if (call.name === "query_database") {
                const sql = (call.args as any).sql;

                if (!isSafeQuery(sql)) {
                    toolOutputs.push({
                        functionResponse: {
                            name: "query_database",
                            response: { error: "Security Alert: Forbidden keyword detected in SQL." }
                        }
                    });
                } else {
                    try {
                        const data = await prisma.$queryRawUnsafe(sql);
                        fullResults = Array.isArray(data) ? data : [data];

                        // Limit data size sent back to model (only first 3 rows)
                        const dataSample = fullResults.slice(0, 3);

                        // Serialize BigInt values to strings
                        const cleanSample = serializeData(dataSample);

                        toolOutputs.push({
                            functionResponse: {
                                name: "query_database",
                                response: {
                                    result_snippet: cleanSample,
                                    total_rows: fullResults.length,
                                    message: "I am sending only the first 3 rows to save tokens. Use the full results structure to build your transform function."
                                }
                            }
                        });
                    } catch (error: any) {
                        toolOutputs.push({
                            functionResponse: {
                                name: "query_database",
                                response: { error: error.message }
                            }
                        });
                    }
                }
            }
        }

        // Send tool results back to the agent
        result = await chat.sendMessage(toolOutputs);
        response = result.response;
    }

    const finalResult = response.text();
    console.log("[Agent] Final Result Content:", finalResult);

    try {
        const parsed = JSON.parse(finalResult.replace(/```json/gi, '').replace(/```/g, '').trim());

        if (parsed.transformCode) {
            console.log("[Agent] Executing generated transformCode on full dataset...");
            // Execute the transform function on the fullResults
            const transformData = new Function(`${parsed.transformCode}; return transformData;`)();
            const cleanFullData = serializeData(fullResults);
            const plotConfig = transformData(cleanFullData);

            return {
                plot: plotConfig,
                explanation: parsed.explanation
            };
        }

        return parsed;
    } catch (e) {
        console.error("[Agent] Error parsing/executing response:", e);
        return { message: finalResult };
    }
}
