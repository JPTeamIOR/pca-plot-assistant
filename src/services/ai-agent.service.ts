import fs from 'fs';
import path from 'path';
import { startGeminiChat } from "./ai-client.service";
import { isSafeQuery } from "./queryValidator";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Paths for specialized Prisma schemas
const PRISMA_DIR = path.join(process.cwd(), 'prisma');
const SCHEMAS = {
    full: path.join(PRISMA_DIR, 'schema.prisma'),
    bulk: path.join(PRISMA_DIR, 'bulk.prisma'),
    singlecell: path.join(PRISMA_DIR, 'singlecell.prisma')
};

/**
 * Helper to read schema file safely
 */
function readSchema(type: keyof typeof SCHEMAS): string {
    try {
        if (fs.existsSync(SCHEMAS[type])) {
            return fs.readFileSync(SCHEMAS[type], 'utf-8');
        }
    } catch (e) {
        console.error(`Error reading schema ${type}:`, e);
    }
    return "";
}

/**
 * Helper to recursively convert BigInt to string for JSON serialization
 */
function serializeData(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
        // Gestione BigInt
        return typeof obj === 'bigint' ? obj.toString() : obj;
    }

    // AGGIUNTA CRITICA: Gestione dei tipi Decimal di Prisma/PostgreSQL
    // Se l'oggetto ha un metodo d ed e (tipico di Decimal.js usato da Prisma) 
    // o se è un'istanza di Decimal, lo convertiamo in numero float.
    if (obj.constructor && (obj.constructor.name === 'Decimal' || obj.d !== undefined)) {
        return parseFloat(obj.toString());
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
                description: "Returns a specialized Prisma schema. Use 'bulk' for global/sample data and 'singlecell' for single-cell specific tables.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        schemaType: {
                            type: "string",
                            enum: ["bulk", "singlecell"],
                            description: "The type of schema to retrieve."
                        }
                    },
                    required: ["schemaType"]
                }
            }
        ]
    }
];

const systemInstruction = `You are the expert autonomous assistant for the Prostate Cancer Atlas. 
Your primary and exclusive goal is to help researchers analyze and visualize data (bulk, single-cell) by creating interactive plots.

IDENTITY & BEHAVIOR:
1. You are a specialized plotting agent.
2. If the user's request does not involve creating a graph or analyzing data for a visualization, you MUST explicitly state: "I am an agent specifically designed to create graphs and analyze data for the Prostate Cancer Atlas. How can I help you visualize your data today?"
3. Do not engage in general conversation or tasks unrelated to PCA data analysis and plotting.

STRATEGY:
1. When a user asks a question, determine if it relates to 'bulk' data or 'single-cell' data.
2. If you need the database structure, use 'get_schema_details' with the appropriate 'schemaType'.
   - Use 'bulk' for: samples, metadata, genes, transcripts, ssgsea, etc.
   - Use 'singlecell' for: sc_cells, sc_gene_expression, UMAP, STAGE (sc), subgroup, etc.
3. Once you have the schema, use 'query_database' to fetch data.
4. You will only see a SAMPLE (first 3 rows) of the database results to save tokens.
5. Write a transformation function in JavaScript that will process the FULL results array.

DATABASE RULES:
- Bulk data: user_id = 'PUBLIC_USER' in 'samples' table. Metadata is in 'metadata' table linked via 'metadatakeys'. The expression of genes is in 'gc_txi_data', the expression of transcripts is in 'txi_data'.
- Single-cell data: 'sc_cells' table. Compartment 0 = cancer, Compartment 1 = non-cancer.
- Only SELECT queries are allowed. Forbidden: INSERT, UPDATE, DELETE.

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
                const type = (call.args as any).schemaType as keyof typeof SCHEMAS;
                const schema = readSchema(type) || "Schema not found or empty.";
                toolOutputs.push({
                    functionResponse: {
                        name: "get_schema_details",
                        response: { schema }
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
        return { explanation: finalResult };
    }
}
