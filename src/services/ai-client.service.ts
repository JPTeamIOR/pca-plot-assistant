import { GoogleGenerativeAI } from "@google/generative-ai";

type AiProvider = "gemini" | "openai" | "ollama";

interface GenerateAiTextInput {
    systemInstruction: string;
    prompt: string;
}

const DEFAULT_MODELS: Record<AiProvider, string> = {
    gemini: "gemini-3-pro-preview",
    openai: "gpt-4.1-mini",
    ollama: "llama3"
};

let geminiClient: GoogleGenerativeAI | null = null;

function getAiProvider(): AiProvider {
    const configuredProvider = (process.env.AI_PROVIDER || "gemini").trim().toLowerCase();

    if (
        configuredProvider === "gemini" ||
        configuredProvider === "openai" ||
        configuredProvider === "ollama"
    ) {
        return configuredProvider;
    }

    throw new Error(`Unsupported AI_PROVIDER '${configuredProvider}'. Use 'gemini', 'openai' or 'ollama'.`);
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

function getOllamaBaseUrl(): string {
    return (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").trim().replace(/\/$/, "");
}

function formatOllamaConnectionError(baseUrl: string, error: unknown): Error {
    const fetchError = error as {
        message?: string;
        cause?: {
            code?: string;
            address?: string;
            port?: number;
        };
    };

    const code = fetchError?.cause?.code || "UNKNOWN";
    const address = fetchError?.cause?.address || "n/a";
    const port = fetchError?.cause?.port || "n/a";
    const detail = fetchError?.message || String(error);

    return new Error(
        `Cannot reach Ollama at ${baseUrl}. ` +
        `Cause=${code} (${address}:${port}). ` +
        `If backend runs in Docker and Ollama runs on host, keep OLLAMA_BASE_URL=http://host.docker.internal:11434 ` +
        `and start Ollama with OLLAMA_HOST=0.0.0.0:11434. ` +
        `Quick check from backend container: curl http://host.docker.internal:11434/api/tags. ` +
        `Original error: ${detail}`
    );
}

async function generateWithGemini(modelName: string, input: GenerateAiTextInput): Promise<string> {
    const model = getGeminiClient().getGenerativeModel({
        model: modelName,
        systemInstruction: input.systemInstruction
    });

    const result = await model.generateContent(input.prompt);
    return result.response.text();
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

async function generateWithOllama(modelName: string, input: GenerateAiTextInput): Promise<string> {
    const baseUrl = getOllamaBaseUrl();
    let response: Response;
    console.log("Ollama activated")
    try {
        response = await fetch(`${baseUrl}/api/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: modelName,
                stream: false,
                messages: [
                    { role: "system", content: input.systemInstruction },
                    { role: "user", content: input.prompt }
                ],
                options: {
                    temperature: 0
                }
            })
        });
    } catch (error) {
        throw formatOllamaConnectionError(baseUrl, error);
    }

    if (!response.ok) {
        const errorBody = await response.text();
        const modelHint = response.status === 404
            ? ` Model '${modelName}' may be missing. Run: ollama pull ${modelName}`
            : "";
        throw new Error(`Ollama request failed (${response.status}) at ${baseUrl}: ${errorBody}.${modelHint}`);
    }

    const payload = await response.json() as {
        message?: {
            content?: string;
        };
    };

    const content = payload.message?.content;
    if (!content || typeof content !== "string") {
        throw new Error("Ollama response did not contain text content.");
    }

    return content;
}

export async function generateAiText(input: GenerateAiTextInput): Promise<string> {
    const provider = getAiProvider();
    const modelName = getModelName(provider);

    if (provider === "gemini") {
        return generateWithGemini(modelName, input);
    }

    if (provider === "openai") {
        return generateWithOpenAI(modelName, input);
    }

    return generateWithOllama(modelName, input);
}

export function getAiRuntimeConfig() {
    const provider = getAiProvider();
    const config = {
        provider,
        model: getModelName(provider)
    };

    if (provider === "ollama") {
        return {
            ...config,
            baseUrl: getOllamaBaseUrl()
        };
    }

    return config;
}
