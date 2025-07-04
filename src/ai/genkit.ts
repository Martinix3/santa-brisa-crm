
import {genkit} from 'genkit';
import {vertexAI} from '@genkit-ai/vertexai';

// Configure a Genkit instance to use the Vertex AI plugin.
// This will use Application Default Credentials for authentication.
export const ai = genkit({
  plugins: [
    vertexAI({ location: 'us-central1' }),
  ],
});
