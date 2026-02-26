import http from 'http';
import { runPcaAgent } from './services/ai-agent.service';

const hostname = '0.0.0.0';
const port = 3000;

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

                console.log(`=========> Processing Request with Autonomous Agent: "${query}"`);

                // Use the new autonomous agent
                const result = await runPcaAgent(query);

                res.statusCode = 200;
                res.end(JSON.stringify(result));
            } catch (error) {
                console.error('AI Agent Error:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Processing failed', details: String(error) }));
            }
        });

        console.log('====================Finished processing request=======================')

        return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello Antigravity!\n');
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
