import { runPcaAgent } from './services/ai-agent.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function testAgent() {
    console.log("--- Testing PCA Agent ---");
    const prompt = "Mostrami un plot 3D dei primi 20 campioni bulk pubblici con i valori di pc1, pc2 e pc3";

    try {
        const result = await runPcaAgent(prompt);
        console.log("--- Final Agent Output ---");
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Agent failed:", error);
    }
}

testAgent();
