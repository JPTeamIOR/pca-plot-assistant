import http from 'http';
import { PrismaClient } from '@prisma/client';
import { handleUserQuery } from './services/aiService';

const hostname = '0.0.0.0';
const port = 3000;

const prisma = new PrismaClient();

const server = http.createServer(async (req, res) => {
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

                // Helper to handle BigInt serialization
                const jsonResult = JSON.stringify({ query: sqlQuery, data: dbResults }, (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                );

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
