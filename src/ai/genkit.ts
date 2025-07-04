
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Configure a Genkit instance to use the standard Google AI plugin.
// This will automatically use the GOOGLE_API_KEY from the .env file.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});
