const fs = require('fs');
const path = require('path');

const mainSchemaPath = path.join(__dirname, 'schema.prisma');
const schemaContent = fs.readFileSync(mainSchemaPath, 'utf-8');

// Define which tables belong to what in english
const bulkTables = ['metadata', 'metadatakeys', 'datasets', 'gc_txi_data', 'genes', 'genetypes',
    'samples', 'msigdbcategories', 'msigdbnames', 'msigdbsubcategories', 'patients', 'ssgseas', 'transcripts', 'transcripttypes', 'txi_data', 'genes', 'genetypes'];
const scTables = ['sc_cells', 'sc_gene_expression'];

function extractTables(tablesToKeep) {
    // Extract the generator and datasource block (the first blocks of the file)
    const header = schemaContent.split('model')[0];

    // Regex to capture each model and its content
    const modelRegex = /model\s+(\w+)\s+\{[^}]*\}/g;
    let models = [];
    let match;

    while ((match = modelRegex.exec(schemaContent)) !== null) {
        if (tablesToKeep.includes(match[1])) {
            models.push(match[0]);
        }
    }

    return header + '\n' + models.join('\n\n');
}

// Write the two files
fs.writeFileSync(path.join(__dirname, 'bulk.prisma'), extractTables(bulkTables));
fs.writeFileSync(path.join(__dirname, 'singlecell.prisma'), extractTables(scTables));

console.log("✅ Filtered schemas (bulk.prisma and singlecell.prisma) generated successfully!");