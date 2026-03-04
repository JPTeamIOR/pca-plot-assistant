---
name: Gemini & Agent Core
description: Expert knowledge on project's AI architecture, Gemini integration, and autonomous agent loop.
---

# Gemini & Agent Core

This skill encapsulates the core logic for the Prostate Cancer Atlas autonomous agent, including client integration and the execution loop.

## Core Services

### AI Client Service (`ai-client.service.ts`)
Handles communication with AI providers (Gemini, OpenAI).

- **`startGeminiChat(systemInstruction: string, tools?: any[])`**: Initializes a stateful chat session with tool-calling capabilities.
- **`generateAiText(input: GenerateAiTextInput)`**: A lower-level helper for one-off completions.
- **`getAiRuntimeConfig()`**: Retrieves the current provider and model configuration from environment variables.

### AI Agent Service (`ai-agent.service.ts`)
Implements the autonomous execution loop.

- **Loop Pattern**:
    1. Send user input to the chat.
    2. While there are `functionCalls()` in the response:
        a. Execute the corresponding local tools.
        b. Collect results in a `toolOutputs` array.
        c. Send results back to the chat using `chat.sendMessage(toolOutputs)`.
    3. Return the final text response.
- **Tools**:
    - `query_database`: Executes read-only SQL queries.
    - `get_schema_details`: Provides database schema context to the model.

## Best Practices

### Security & Validation
- **`isSafeQuery(sql: string)`**: Always validate generated SQL against forbidden keywords (DROP, DELETE, UPDATE, etc.) before execution.
- **`cleanQuery(query: string)`**: Use to strip markdown formatting or common AI prefixes/suffixes from the raw response.

### Data Handling
- **`serializeData(obj: any)`**: Crucial for converting `BigInt` (returned by Prisma for some DB types) to strings before sending data to the model or returning JSON, as `JSON.stringify` does not support `BigInt`.

### Token Optimization
- When returning database results to the agent, send only a small sample (e.g., `results.slice(0, 3)`) to provide context without exhausting the token window. Instruct the agent to write transformation code that works on the *full* dataset.

## Tool Definition Example
```typescript
const tools = [
    {
        functionDeclarations: [
            {
                name: "query_database",
                description: "Executes a READ-ONLY SQL query...",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        sql: { type: "string" }
                    },
                    required: ["sql"]
                }
            }
        ]
    }
];
```
