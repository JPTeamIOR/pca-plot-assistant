import { GoogleGenerativeAI } from "@google/generative-ai";

async function listModels() {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        console.error("Missing GOOGLE_GENAI_API_KEY");
        return;
    }

    try {
        console.log("Checking for available models...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
