import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY!);

export async function generateTransformFunction(userInput: string, sampleData: any[]) {
    const systemInstruction = `You are a Senior JavaScript Developer. 
Your task is to write a high-performance transformation function that converts a database result (array of objects) into a Plotly.js configuration.

RULES:
1. Return ONLY the code for the function. No markdown, no comments, no explanations.
2. The function must be named 'transformData' and take one argument 'data'.
3. The function must return an object with { data: [...], layout: {...} }.
4. For Bulk data (look for pc1, pc2, pc3), create a scatter3d plot.
5. For Single-cell (UMAP_1, UMAP_2), create a scatter plot.
6. Use the user's intent to set titles and colors.

Example of expected output:
function transformData(data) {
    return {
        data: [{
            x: data.map(d => d.pc1),
            y: data.map(d => d.pc2),
            z: data.map(d => d.pc3),
            type: 'scatter3d',
            mode: 'markers'
        }],
        layout: { title: 'PCA Plot' }
    };
}`;

    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite",
        systemInstruction: systemInstruction
    });

    const prompt = `User Intent: "${userInput}"
    Sample Data (first elements): ${JSON.stringify(sampleData)}`;

    const result = await model.generateContent(prompt);
    return result.response.text().replace(/```javascript/gi, '').replace(/```/g, '').trim();
}