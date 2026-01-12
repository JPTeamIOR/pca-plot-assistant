export function cleanQuery(response: string): string {
    // Remove markdown code blocks if present (e.g., ```sql ... ```)
    let query = response.replace(/```sql/gi, '').replace(/```/g, '').trim();
    return query;
}

export function isSafeQuery(query: string): boolean {
    const upperQuery = query.toUpperCase();

    // Check if it starts with SELECT or WITH
    if (!upperQuery.startsWith('SELECT') && !upperQuery.startsWith('WITH')) {
        return false;
    }

    const forbiddenKeywords = [
        'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE',
        'ALTER', 'GRANT', 'REVOKE', 'EXEC', 'CREATE', 'REPLACE'
    ];

    // Check for forbidden keywords with word boundaries
    for (const keyword of forbiddenKeywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(query)) {
            console.warn(`Security Block: Forbidden keyword '${keyword}' detected.`);
            return false;
        }
    }

    return true;
}
