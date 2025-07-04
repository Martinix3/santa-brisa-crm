
import {genkit} from 'genkit';
import {googleAI, gemini15Flash} from '@genkit-ai/googleai';

// Configure a Genkit instance to use the Google AI plugin.
// It will automatically use the GOOGLE_API_KEY from the .env file.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: gemini15Flash, // Set default model
});
