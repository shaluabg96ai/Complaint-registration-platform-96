import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

let genAI = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
} else {
  console.warn(
    'WARNING: GEMINI_API_KEY is not set. The platform will run in Mock AI mode (returning simulated follow-up questions).'
  );
}

/**
 * Sends the complaint text to Gemini and asks it to generate one relevant follow-up question.
 * @param {string} complaintText - The original complaint text
 * @returns {Promise<string>} - The AI-generated follow-up question
 */
export async function generateFollowUpQuestion(complaintText) {
  if (!complaintText || complaintText.trim() === '') {
    throw new Error('Complaint text cannot be empty.');
  }

  if (!genAI) {
    console.log('[AI SIMULATOR] Mocking Gemini response for complaint:', complaintText);
    return `Regarding your concern, could you please specify when this issue first occurred, and what specific steps (if any) you have already attempted to resolve it?`;
  }

  try {
    // According to instructions, we must use model: gemini-2.5-flash-lite
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `You are a helpful customer support representative. A user has submitted the following complaint:
"${complaintText}"

Your task is to analyze this complaint and generate exactly ONE short, relevant, and professional follow-up question to gather more context or details needed to resolve this issue. Do not include any greeting, intro, conversational filler, or multiple choice. Return ONLY the question itself. Make sure it is short and direct.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let question = response.text().trim();

    // Clean up response just in case the model returns quotes
    if (question.startsWith('"') && question.endsWith('"')) {
      question = question.slice(1, -1).trim();
    }

    if (!question) {
      throw new Error('Gemini API returned an empty response.');
    }

    console.log(`[AI SERVICE] Generated question using Gemini: "${question}"`);
    return question;
  } catch (error) {
    console.error('[AI SERVICE ERROR] Failed to query Gemini:', error);
    // Graceful fallback in case of rate limits or API key issues
    return `Thank you for submitting your complaint. To help us investigate this further, could you provide any additional details, dates, or error messages related to this issue?`;
  }
}
