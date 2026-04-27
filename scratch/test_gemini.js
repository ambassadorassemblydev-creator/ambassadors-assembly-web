import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function testGemini() {
    const key = process.env.GEMINI_API_KEY;
    console.log('Testing Gemini Key:', key ? 'FOUND' : 'MISSING');
    if (!key) return;

    try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello, are you online?");
        console.log('Gemini Response:', result.response.text());
    } catch (error) {
        console.error('Gemini Error:', error.message);
    }
}

testGemini();
