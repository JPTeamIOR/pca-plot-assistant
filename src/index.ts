import http from 'http';
import { PrismaClient } from '@prisma/client';
import { handleUserQuery } from './services/ai-query.service';
import { generateTransformFunction } from './services/ai-plot.service';

const hostname = '0.0.0.0';
const port = 3000;

const prisma = new PrismaClient();

const server = http.createServer(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    res.setHeader('Content-Type', 'application/json');

    if (req.url === '/ai' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const { query } = JSON.parse(body);
                if (!query) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: 'Missing query parameter' }));
                    return;
                }
                const sqlQuery = await handleUserQuery(query);

                // Execute the generated SQL query
                const dbResults = await prisma.$queryRawUnsafe(sqlQuery);

                // Prepare Data (Handle BigInts before processing)
                // We serialize and deserialize to get clean number/string types
                const cleanData = JSON.parse(JSON.stringify(dbResults, (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                ));

                // Take a sample for the AI to understand the structure
                const sampleData = Array.isArray(cleanData) ? cleanData.slice(0, 5) : [];

                // 1. Generate the transformation logic (code string)
                const functionCode = await generateTransformFunction(query, sampleData);
                console.log("=========> Generated Function Code:", functionCode);

                // 2. Compile the function dynamically
                // We wrap it to return the named function instance
                // Safety: We trust the AI output here for this demo, in prod use isolated VM
                const transformData = new Function(`${functionCode}; return transformData;`)();

                // 3. Execute on full data
                let plotConfig;
                try {
                    plotConfig = transformData(cleanData);
                } catch (err) {
                    console.error("Transform Execution Error:", err);
                    plotConfig = { error: "Failed to transform data", details: String(err) };
                }

                // Helper to handle BigInt serialization (redundant but safe for final output)
                const jsonResult = JSON.stringify({
                    plot: plotConfig
                });

                res.statusCode = 200;
                res.end(jsonResult);
            } catch (error) {
                console.error('AI/DB Error:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Processing failed', details: String(error) }));
            }
        });
        return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello Antigravity!\n');
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
