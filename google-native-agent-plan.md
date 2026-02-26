# Piano per Agente AI Nativo Google (PCA Plot Assistant)

Questo documento descrive come consolidare l'attuale workflow sequenziale (TS -> Gemini -> SQL -> Results -> Gemini -> Plotly) in un unico **Agente AI autoregressivo** utilizzando le funzionalità native di Google Gemini.

## Obiettivo
Trasformare i servizi `ai-query.service.ts` e `ai-plot.service.ts` in un unico Agente capace di:
1. Comprendere l'intento dell'utente.
2. Interagire autonomamente con il database tramite **Function Calling**.
3. Generare una configurazione Plotly valida tramite **Structured Outputs**.

## Architettura Proposta

### Supporto Tecnologico
*   **Modello**: `gemini-1.5-flash` o `gemini-2.0-flash-exp` (ottimi per velocità e tool use).
*   **Framework**: **Firebase Genkit** (consigliato da Google per TypeScript) o integrazione diretta via `@google/generative-ai`.
*   **Meccanismo**: **Function Calling (Tools)** per l'esecuzione di SQL e **Schema-based JSON Output** per Plotly.

---

## Cambiamenti Proposti

### 1. Definizione dei Tool (Backend)
Invece di chiamare Gemini due volte, definiamo dei "Tool" che Gemini può invocare:
*   `query_database(sql: string)`: Esegue la query SQL e restituisce i dati.
*   `get_schema()`: Fornisce lo schema Prisma attuale.

### 2. Consolidamento del Servizio
Creazione di un nuovo servizio `src/services/ai-agent.service.ts` che sostituisce la logica manuale di concatenazione.

### 3. Output Strutturato per Plotly
Utilizzare lo `responseMimeType: "application/json"` e `responseSchema` per forzare Gemini a restituire direttamente l'oggetto Plotly `{ data, layout }`, eliminando la necessità di generare ed eseguire codice JavaScript (`transformData`).

---

## Vantaggi dell'Approccio Agente
1.  **Recupero Errori**: Se la query SQL fallisce, l'agente può leggere l'errore e correggere la query autonomamente.
2.  **Meno Codice**: Rimuove il "tramite" manuale tra i due servizi.
3.  **Prompt Consolidato**: Un'unica system instruction permette all'agente di avere pieno contesto su schema DB e stile di visualizzazione.

## Esempio di Codice (Agente con Tool)
```typescript
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  tools: [{
    functionDeclarations: [
      {
        name: "query_database",
        description: "Executes a SQL query on the PCA database",
        parameters: { type: "OBJECT", properties: { sql: { type: "string" } } }
      }
    ]
  }]
});

// L'agente gestirà autonomamente il loop prompt -> schema -> query -> plotly
```
