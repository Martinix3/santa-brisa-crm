
'use server';
/**
 * @fileOverview A simple Genkit flow for testing cloud integration.
 * 
 * - testFlow - A function that echoes a message using an AI model.
 * - TestFlowInput - The input type for the testFlow function.
 * - TestFlowOutput - The return type for the testFlow function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai';

export const TestFlowInputSchema = z.object({
  message: z.string().describe('The message to echo.'),
});
export type TestFlowInput = z.infer<typeof TestFlowInputSchema>;

export const TestFlowOutputSchema = z.object({
  echo: z.string().describe('The echoed message from the AI.'),
  timestamp: z.string().describe('The server timestamp when the flow was run.'),
});
export type TestFlowOutput = z.infer<typeof TestFlowOutputSchema>;


const testPrompt = ai.definePrompt({
    name: 'testFlowPrompt',
    model: gemini15Flash,
    input: { schema: TestFlowInputSchema },
    output: { schema: TestFlowOutputSchema },
    prompt: `
        You are a test assistant. Your only job is to echo back the user's message.
        Also, provide the current server timestamp in ISO format.
        
        User's message: {{{message}}}
    `,
});

const testFlowFn = ai.defineFlow(
  {
    name: 'testFlow',
    inputSchema: TestFlowInputSchema,
    outputSchema: TestFlowOutputSchema,
  },
  async (input) => {
    const { output } = await testPrompt(input);
    
    // The prompt might not always include the timestamp, so we ensure it's there.
    if (!output?.timestamp) {
        return {
            echo: output?.echo || "The AI did not provide an echo.",
            timestamp: new Date().toISOString()
        }
    }
    
    return output;
  }
);


export async function testFlow(input: TestFlowInput): Promise<TestFlowOutput> {
  return testFlowFn(input);
}
