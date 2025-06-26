import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// In a managed environment, Genkit automatically uses Application Default Credentials.
// We remove the explicit API key to allow Genkit to use the environment's
// more secure, built-in authentication method.
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-pro-latest',
});
