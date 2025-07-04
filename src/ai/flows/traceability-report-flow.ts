
'use server';
/**
 * @fileOverview An AI agent for generating supply chain traceability reports.
 *
 * - getTraceabilityReport - A function that handles report generation.
 * - TraceabilityReportInput - The input type.
 * - TraceabilityReportOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TraceabilityReportInputSchema = z.object({
  batchNumber: z.string().describe('The batch number to trace. Can be for a finished good or a raw material.'),
});
export type TraceabilityReportInput = z.infer<typeof TraceabilityReportInputSchema>;

const TraceabilityReportOutputSchema = z.object({
  report: z.string().describe('The full traceability report in Markdown format.'),
});
export type TraceabilityReportOutput = z.infer<typeof TraceabilityReportOutputSchema>;

// Mock functions that simulate database queries.
// In a real implementation, these would query Firestore.
const findProductionRunByFinishedGoodBatch = ai.defineTool(
  {
    name: 'findProductionRunByFinishedGoodBatch',
    description: 'Finds the production run details for a given finished good batch number.',
    inputSchema: z.object({ batchNumber: z.string() }),
    outputSchema: z.object({
      id: z.string(),
      date: z.string(),
      productName: z.string(),
      quantityProduced: z.number(),
    }).nullable(),
  },
  async ({ batchNumber }) => {
    if (batchNumber.startsWith('PROD-')) {
      return {
        id: 'run_12345',
        date: '2024-09-25',
        productName: 'Santa Brisa 750ml',
        quantityProduced: 5000,
      };
    }
    return null;
  }
);

const findComponentsForProductionRun = ai.defineTool(
    {
      name: 'findComponentsForProductionRun',
      description: 'Finds the component batches used in a specific production run.',
      inputSchema: z.object({ runId: z.string() }),
      outputSchema: z.array(z.object({
        name: z.string(),
        batchNumber: z.string(),
        quantity: z.number(),
      })),
    },
    async ({ runId }) => {
      if (runId === 'run_12345') {
        return [
          { name: 'Tequila Blanco 100% Agave', batchNumber: 'TQ-JAL-2024-08-A', quantity: 850 },
          { name: 'Botella de Vidrio 750ml', batchNumber: 'BOTT-VID-MX-Q3-2024', quantity: 5000 },
          { name: 'Etiqueta Frontal Santa Brisa', batchNumber: 'ETIQ-FR-24-V1', quantity: 5100 },
        ];
      }
      return [];
    }
);

const findSalesForFinishedGoodBatch = ai.defineTool(
    {
      name: 'findSalesForFinishedGoodBatch',
      description: 'Finds all customer sales that included a specific finished good batch.',
      inputSchema: z.object({ batchNumber: z.string() }),
      outputSchema: z.array(z.object({
        customerName: z.string(),
        invoiceNumber: z.string(),
        quantitySold: z.number(),
      })),
    },
    async ({ batchNumber }) => {
      if (batchNumber.startsWith('PROD-')) {
        return [
          { customerName: 'Distribuidor Central', invoiceNumber: 'INV-2024-09-101', quantitySold: 2500 },
          { customerName: 'Importador Costa Este', invoiceNumber: 'INV-2024-09-105', quantitySold: 2500 },
        ];
      }
      return [];
    }
);


const prompt = ai.definePrompt({
  name: 'traceabilityReportPrompt',
  tools: [findProductionRunByFinishedGoodBatch, findComponentsForProductionRun, findSalesForFinishedGoodBatch],
  system: `You are a supply chain and traceability expert for Santa Brisa. The user will provide a batch number.
Your task is to determine if the batch is for a finished good or a raw material and generate a detailed traceability report using the provided tools.

- If the user provides a batch number for a **finished good** (e.g., starting with 'PROD-'), your report must have two sections:
  1.  **Upward Traceability (Origen del Lote):**
      - Use 'findProductionRunByFinishedGoodBatch' to get the production details.
      - Then, use 'findComponentsForProductionRun' with the returned run ID to list all component batches (raw materials) used.
  2.  **Downward Traceability (Destino del Lote):**
      - Use 'findSalesForFinishedGoodBatch' to list all customer sales where this specific batch was shipped.

- If the user provides a batch number for a **raw material**, state that this functionality is under development.

Present the final report clearly in **Markdown** format. Use bold headings and lists. Be concise but thorough.
`,
});

const traceabilityFlow = ai.defineFlow(
  {
    name: 'traceabilityFlow',
    inputSchema: TraceabilityReportInputSchema,
    outputSchema: TraceabilityReportOutputSchema,
  },
  async (input) => {
    const response = await prompt(input.batchNumber);

    if (!response) {
      throw new Error("The AI failed to generate the traceability report.");
    }

    return { report: response.text };
  }
);


export async function getTraceabilityReport(input: TraceabilityReportInput): Promise<TraceabilityReportOutput> {
    console.log("Invoking traceability flow with input:", input);
    const result = await traceabilityFlow(input);
    console.log("Flow result:", result);
    return result;
}
