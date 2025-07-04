import { gemini15Pro, googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

// Configure a Genkit instance to use the Google AI plugin.
// It will automatically use the GOOGLE_API_KEY from the .env file.
export const ai = genkit({
  plugins: [googleAI()],
  model: gemini15Pro, // Set default model to the more powerful preview version
});
