'use server';
/**
 * @fileOverview An AI agent for processing invoices.
 *
 * - processInvoice - A function that handles the invoice data extraction.
 * - ProcessInvoiceInput - The input type for the processInvoice function.
 * - ProcessInvoiceOutput - The return type for the processInvoice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProcessInvoiceInputSchema = z.object({
  invoiceDataUri: z
    .string()
    .describe(
      "A photo or PDF of an invoice, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ProcessInvoiceInput = z.infer<typeof ProcessInvoiceInputSchema>;

const ProcessInvoiceOutputSchema = z.object({
  supplier: z.string().describe("The name of the supplier or vendor from the invoice."),
  orderDate: z.string().describe("The issue date of the invoice in YYYY-MM-DD format."),
  items: z.array(z.object({
    description: z.string().describe("The description of the item or service."),
    quantity: z.number().describe("The quantity of the item."),
    unitPrice: z.number().describe("The price per unit of the item, without tax."),
  })).describe("A list of all items from the invoice."),
  shippingCost: z.number().optional().describe("The shipping cost, if specified separately."),
  taxRate: z.number().optional().describe("The tax rate as a percentage (e.g., 21 for 21%). If multiple rates, provide the most common one."),
  notes: z.string().optional().describe("Any relevant notes or invoice numbers found."),
});
export type ProcessInvoiceOutput = z.infer<typeof ProcessInvoiceOutputSchema>;


export async function processInvoice(input: ProcessInvoiceInput): Promise<ProcessInvoiceOutput> {
  return invoiceProcessingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'invoiceProcessingPrompt',
  input: {schema: ProcessInvoiceInputSchema},
  output: {schema: ProcessInvoiceOutputSchema},
  prompt: `You are an expert accounting assistant. Your task is to extract structured information from an invoice file.

Analyze the provided invoice image or PDF and extract the following details. Be precise.

- **Supplier Name**: Identify the vendor or company that issued the invoice.
- **Invoice Date**: Find the issue date and format it as YYYY-MM-DD.
- **Line Items**: Extract each line item from the invoice. For each item, provide its description, quantity, and unit price (before tax). If quantity or unit price are not specified, infer them if possible (e.g., if only total is given for a quantity of 1).
- **Shipping Cost**: If there is a separate charge for shipping, delivery, or "portes", extract that value.
- **Tax Rate**: Identify the VAT or tax rate percentage (e.g., IVA 21%). If there are multiple, provide the most prominent one.
- **Notes**: Extract any invoice number (Nº Factura), order number, or other relevant text notes.

Here is the invoice:
{{media url=invoiceDataUri}}`,
});

const invoiceProcessingFlow = ai.defineFlow(
  {
    name: 'invoiceProcessingFlow',
    inputSchema: ProcessInvoiceInputSchema,
    outputSchema: ProcessInvoiceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("The AI failed to extract data from the invoice. It might be unreadable or in an unsupported format.");
    }
    return output;
  }
);
