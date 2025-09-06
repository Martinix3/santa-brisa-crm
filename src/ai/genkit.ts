
/**
 * @fileoverview Centralized AI configuration for Genkit.
 * This file initializes the Genkit instance and exports the configured AI object
 * and a singleton Document AI client. This setup uses Application Default
 * Credentials (ADC) from the environment, which is the most robust and secure method
 * for services like Cloud Workstations, Cloud Run, or local development authenticated
 * via `gcloud auth application-default login`.
 */
import { googleAI, gemini15Pro } from '@genkit-ai/googleai';
import { genkit } from 'genkit';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

// Initialize Genkit with the Google AI plugin.
// By not passing an explicit API key, it will automatically use the 
// Application Default Credentials (ADC) provided by the environment.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: gemini15Pro,
});


/**
 * Initializes and exports a singleton Document AI client.
 * This simplified function creates the client without any explicit options.
 * This allows the Google Cloud SDK to automatically use the Application Default
 * Credentials (ADC) provided by the environment, which is the most reliable method
 * for services like Cloud Workstations or local development with `gcloud`.
 * @returns {DocumentProcessorServiceClient} An authenticated Document AI client instance.
 */
function getDocAIClient(): DocumentProcessorServiceClient {
    // By providing no options, the client will use ADC from the environment.
    // This is the most reliable way to handle authentication in managed environments.
    return new DocumentProcessorServiceClient();
}

// Export a singleton instance of the client.
export const docAIClient = getDocAIClient();
