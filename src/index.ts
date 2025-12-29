import http from 'http';
import { PrismaClient } from '@prisma/client';

const hostname = '0.0.0.0';
const port = 3000;

const prisma = new PrismaClient();

const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.url === '/health') {
        try {
            await prisma.$connect();
            res.statusCode = 200;
            res.end(JSON.stringify({ status: 'ok', message: 'Database connection successful' }));
        } catch (error) {
            console.error('DB Error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ status: 'error', message: 'Database connection failed' }));
        }
        return;
    }

    if (req.url === '/experiments') {
        try {
            const experiments = await prisma.experiments.findMany({
                take: 5,
                select: { id: true, name: true, status: true }
            });
            res.statusCode = 200;
            res.end(JSON.stringify(experiments));
        } catch (error) {
            console.error('Query Error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to fetch experiments' }));
        }
        return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello Antigravity!\n');
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
