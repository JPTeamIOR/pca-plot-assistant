import { GoogleGenerativeAI } from "@google/generative-ai";

type AiProvider = "gemini" | "openai";

interface GenerateAiTextInput {
    systemInstruction: string;
    prompt: string;
    tools?: any[];
    responseMimeType?: string;
    responseSchema?: any;
}

const DEFAULT_MODELS: Record<AiProvider, string> = {
    gemini: "gemini-2.5-flash-lite",
    openai: "gpt-4.1-mini"
};

let geminiClient: GoogleGenerativeAI | null = null;

function getAiProvider(): AiProvider {
    const configuredProvider = (process.env.AI_PROVIDER || "gemini").trim().toLowerCase();

    if (
        configuredProvider === "gemini" ||
        configuredProvider === "openai"
    ) {
        return configuredProvider;
    }

    throw new Error(`Unsupported AI_PROVIDER '${configuredProvider}'. Use 'gemini' or 'openai'.`);
}

function getModelName(provider: AiProvider): string {
    const configuredModel = process.env.AI_MODEL?.trim();
    if (configuredModel) {
        return configuredModel;
    }

    return DEFAULT_MODELS[provider];
}

function getGeminiClient(): GoogleGenerativeAI {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing GOOGLE_GENAI_API_KEY for Gemini provider.");
    }

    if (!geminiClient) {
        geminiClient = new GoogleGenerativeAI(apiKey);
    }

    return geminiClient;
}



async function generateWithGemini(modelName: string, input: GenerateAiTextInput): Promise<string> {
    const model = getGeminiClient().getGenerativeModel({
        model: modelName,
        systemInstruction: input.systemInstruction,
        tools: input.tools,
        generationConfig: {
            responseMimeType: input.responseMimeType,
            responseSchema: input.responseSchema,
        }
    });

    const result = await model.generateContent(input.prompt);
    return result.response.text();
}

/**
 * Higher level interface for chat-based agentic interactions
 */
export async function startGeminiChat(systemInstruction: string, tools?: any[]) {
    const model = getGeminiClient().getGenerativeModel({
        model: getModelName("gemini"),
        systemInstruction,
        tools,
    });

    return model.startChat();
}

async function generateWithOpenAI(modelName: string, input: GenerateAiTextInput): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY for OpenAI provider.");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: modelName,
            temperature: 0,
            messages: [
                { role: "system", content: input.systemInstruction },
                { role: "user", content: input.prompt }
            ]
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI request failed (${response.status}): ${errorBody}`);
    }

    const payload = await response.json() as {
        choices?: Array<{
            message?: {
                content?: string;
            };
        }>;
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
        throw new Error("OpenAI response did not contain text content.");
    }

    return content;
}



export async function generateAiText(input: GenerateAiTextInput): Promise<string> {
    const provider = getAiProvider();
    const modelName = getModelName(provider);

    if (provider === "gemini") {
        return generateWithGemini(modelName, input);
    }

    return generateWithOpenAI(modelName, input);
}

export function getAiRuntimeConfig() {
    const provider = getAiProvider();
    const config = {
        provider,
        model: getModelName(provider)
    };

    return config;
}
