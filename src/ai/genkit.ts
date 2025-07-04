
import {genkit} from 'genkit';
import {vertexAI} from '@genkit-ai/vertexai';

// In a managed environment, Genkit would typically use Application Default Credentials.
// This configuration points to the Vertex AI service, which will use the project's
// billing and credits, avoiding free-tier limitations.
export const ai = genkit({
  plugins: [
    vertexAI({ location: 'us-central1' }),
  ],
});
