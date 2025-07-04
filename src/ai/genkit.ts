import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// In a managed environment, Genkit would typically use Application Default Credentials.
// To resolve the current authentication issue, we are explicitly using the provided API key.
export const ai = genkit({
  plugins: [
    googleAI({apiKey: process.env.GEMINI_API_KEY}),
  ],
  model: 'googleai/gemini-1.0-pro-latest',
});
