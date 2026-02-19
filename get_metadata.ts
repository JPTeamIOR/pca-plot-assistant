import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- BULK METADATA ---");
    const bulkMetadata = await prisma.$queryRaw`
        SELECT DISTINCT mk.name, m.value 
        FROM metadata m 
        JOIN metadatakeys mk ON m.metadatakey_id = mk.id
        ORDER BY mk.name, m.value
    `;
    console.log(JSON.stringify(bulkMetadata, null, 2));

    console.log("\n--- SINGLE CELL METADATA ---");
    // Identifying metadata columns in sc_cells
    // Based on schema, these are the candidates: 
    // RAW_PATIENT, DATASET, METHOD, FACS, STAGE, MacroPopulation, Annotation, subgroup
    const scMetadataColumns = [
        'RAW_PATIENT', 'DATASET', 'METHOD', 'FACS', 'STAGE',
        'MacroPopulation', 'Annotation', 'subgroup'
    ];

    for (const col of scMetadataColumns) {
        const values = await prisma.$queryRawUnsafe(`
            SELECT DISTINCT "${col}" as value FROM sc_cells WHERE "${col}" IS NOT NULL ORDER BY value
        `);
        console.log(`Column: ${col}`);
        console.log(JSON.stringify(values, null, 2));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
