import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// In a managed environment, Genkit automatically uses Application Default Credentials.
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash-latest',
});
