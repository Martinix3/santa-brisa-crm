
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
async function findProductionRunByFinishedGoodBatch(batchNumber: string) {
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

async function findComponentsForProductionRun(runId: string) {
      if (runId === 'run_12345') {
        return [
          { name: 'Tequila Blanco 100% Agave', batchNumber: 'TQ-JAL-2024-08-A', quantity: 850 },
          { name: 'Botella de Vidrio 750ml', batchNumber: 'BOTT-VID-MX-Q3-2024', quantity: 5000 },
          { name: 'Etiqueta Frontal Santa Brisa', batchNumber: 'ETIQ-FR-24-V1', quantity: 5100 },
        ];
      }
      return [];
}

async function findSalesForFinishedGoodBatch(batchNumber: string) {
      if (batchNumber.startsWith('PROD-')) {
        return [
          { customerName: 'Distribuidor Central', invoiceNumber: 'INV-2024-09-101', quantitySold: 2500 },
          { customerName: 'Importador Costa Este', invoiceNumber: 'INV-2024-09-105', quantitySold: 2500 },
        ];
      }
      return [];
}

const ReportDataSchema = z.object({
  batchNumber: z.string(),
  productionRun: z.object({
      id: z.string(),
      date: z.string(),
      productName: z.string(),
      quantityProduced: z.number(),
    }).optional(),
  components: z.array(z.object({
      name: z.string(),
      batchNumber: z.string(),
      quantity: z.number(),
    })).optional(),
  sales: z.array(z.object({
      customerName: z.string(),
      invoiceNumber: z.string(),
      quantitySold: z.number(),
    })).optional(),
});

const reportGenerationPrompt = ai.definePrompt({
  name: 'reportGenerationPrompt',
  input: { schema: ReportDataSchema },
  output: { schema: TraceabilityReportOutputSchema },
  prompt: `You are a supply chain and traceability expert for Santa Brisa.
Your task is to generate a detailed traceability report in Markdown format using the data provided below.

Batch Number to Report On: {{{batchNumber}}}

{{#if productionRun}}
## Traceability Report for Batch: {{{batchNumber}}}

### Upward Traceability (Origen del Lote)
- **Production Run ID:** {{{productionRun.id}}}
- **Production Date:** {{{productionRun.date}}}
- **Product:** {{{productionRun.productName}}}
- **Quantity Produced:** {{{productionRun.quantityProduced}}}

#### Componentes Utilizados
{{#if components.length}}
{{#each components}}
- **{{name}}:** Lote \`{{batchNumber}}\` (Cantidad: {{quantity}})
{{/each}}
{{else}}
- No se encontraron componentes para esta producción.
{{/if}}

### Downward Traceability (Destino del Lote)
{{#if sales.length}}
{{#each sales}}
- **Vendido a:** {{customerName}} (Factura: {{invoiceNumber}}, Cantidad: {{quantitySold}})
{{/each}}
{{else}}
- No se encontraron ventas para este lote.
{{/if}}

{{else}}
## Traceability Report for Batch: {{{batchNumber}}}

This batch number does not correspond to a finished good. Traceability for raw materials is currently under development.
{{/if}}
`,
});

const traceabilityFlow = ai.defineFlow(
  {
    name: 'traceabilityFlow',
    inputSchema: TraceabilityReportInputSchema,
    outputSchema: TraceabilityReportOutputSchema,
  },
  async (input) => {
    // Orchestration Logic: Code controls the flow, AI just formats the final data.
    const productionRun = await findProductionRunByFinishedGoodBatch(input.batchNumber);

    if (!productionRun) {
        // If no production run, generate the "raw material" report.
        const { output } = await reportGenerationPrompt({ batchNumber: input.batchNumber });
        if (!output) throw new Error("AI failed to generate raw material report.");
        return output;
    }

    // If production run exists, gather all related data.
    const [components, sales] = await Promise.all([
        findComponentsForProductionRun(productionRun.id),
        findSalesForFinishedGoodBatch(input.batchNumber),
    ]);
    
    const reportData = {
        batchNumber: input.batchNumber,
        productionRun,
        components,
        sales,
    };
    
    // Pass the complete dataset to the AI for formatting.
    const { output } = await reportGenerationPrompt(reportData);
    if (!output) throw new Error("AI failed to format the final report.");
    return output;
  }
);


export async function getTraceabilityReport(input: TraceabilityReportInput): Promise<TraceabilityReportOutput> {
    const result = await traceabilityFlow(input);
    return result;
}
