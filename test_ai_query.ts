import { handleUserQuery } from './src/services/ai-query.service';

async function test() {
    const queries = [
        "Give me bulk samples where the stage is T3",
        "Search for single cells where the method is 10x version 2",
        "Find bulk samples with Abiraterone drug therapy",
        "Show me single cells with AR cancer annotation"
    ];

    for (const q of queries) {
        console.log(`User Query: ${q}`);
        try {
            const sql = await handleUserQuery(q);
            console.log(`Generated SQL:\n${sql}\n`);
        } catch (anyError: any) {
            console.error(`Error: ${anyError.message}\n`);
        }
    }
}

test();
