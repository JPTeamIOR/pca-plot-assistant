import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';
import { cleanQuery, isSafeQuery } from './queryValidator';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY!);

// Read the Prisma schema file
const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
const prismaSchema = fs.readFileSync(schemaPath, 'utf-8');

export async function handleUserQuery(userInput: string) {
    const systemInstruction = `You are the expert assistant for the Prostate Cancer Atlas. Your task is to help researchers query the data we have in the database, mainly bulk, single-cell and proteomics data. Here is the database schema:

${prismaSchema}
The samples you need to look for in bulk are always and only public ones user_id = 'PUBLIC_USER'.
Always respond by sending me the query I need to run on the database to retrieve the data requested by the user. `;

    const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        systemInstruction: systemInstruction
    });


    const result = await model.generateContent(userInput);
    const aiResponse = result.response.text();

    console.log("=========> Raw AI Response:", aiResponse);

    const cleanedQuery = cleanQuery(aiResponse);
    console.log("=========> Cleaned Query:", cleanedQuery);

    if (!isSafeQuery(cleanedQuery)) {
        throw new Error("Security Alert: The generated query contains forbidden keywords (Modification/Deletion detected).");
    }

    return cleanedQuery;
}