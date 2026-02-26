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
3. Once you have the data, you MUST return a final response that is a VALID JSON object for Plotly.js.

DATABASE RULES:
- The samples for bulk data are always 'PUBLIC_USER' (user_id = 'PUBLIC_USER').
- Bulk metadata is in 'metadata' table (linked to 'metadatakeys').
- Single-cell data is in 'sc_cells'.
- Forbidden keywords: INSERT, UPDATE, DELETE, etc. Only SELECT is allowed.

RESPONSE FORMAT:
Your final answer must be a JSON object with this structure:
{
  "plot": {
    "data": [...],
    "layout": { "title": "...", "xaxis": {...}, "yaxis": {...} }
  },
  "explanation": "A brief explanation of what is shown in the plot."
}

Do not include any markdown formatting outside the JSON if you are providing the final plot.`;

/**
 * Process a user request using an autonomous agent loop
 */
export async function runPcaAgent(userInput: string) {
    const chat = await startGeminiChat(systemInstruction, tools);

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
                        // Limit data size sent back to model
                        const dataSummary = Array.isArray(data) ? data.slice(0, 50) : data;
                        toolOutputs.push({
                            functionResponse: {
                                name: "query_database",
                                response: {
                                    result: dataSummary,
                                    total_rows: Array.isArray(data) ? data.length : 1
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
    console.log("[Agent] Final Result:", finalResult);

    try {
        // Attempt to parse if it's JSON
        return JSON.parse(finalResult.replace(/```json/gi, '').replace(/```/g, '').trim());
    } catch (e) {
        return { message: finalResult };
    }
}
