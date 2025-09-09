'use server';
import 'server-only';
/**
 * @fileOverview An AI agent for processing invoices using Document AI.
 *
 * - processInvoice - a function that handles invoice data extraction.
 * - InvoiceProcessingInput - The input type for the processInvoice function.
 * - InvoiceProcessingOutput - The return type for the processInvoice function.
 */
import { z } from 'genkit';
import { ai, docAIClient } from '@/ai/genkit';

const GCLOUD_PROJECT = process.env.GCLOUD_PROJECT;
const GCLOUD_LOCATION = process.env.GCLOUD_LOCATION;
const DOCUMENTAI_PROCESSOR_ID = process.env.DOCUMENTAI_PROCESSOR_ID;

const InvoiceProcessingInputSchema = z.object({
  invoiceDataUri: z
    .string()
    .describe(
      "An invoice document (image or PDF) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type InvoiceProcessingInput = z.infer<typeof InvoiceProcessingInputSchema>;

const InvoiceItemSchema = z.object({
  description: z.string().optional(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  totalAmount: z.number().optional(),
});

const InvoiceProcessingOutputSchema = z.object({
  supplierName: z.string().optional(),
  supplierTaxId: z.string().optional(),
  invoiceId: z.string().optional(),
  invoiceDate: z.string().optional().describe('Date in YYYY-MM-DD format'),
  dueDate: z.string().optional().describe('Date in YYYY-MM-DD format'),
  items: z.array(InvoiceItemSchema).optional(),
  subtotal: z.number().optional(),
  tax: z.number().optional(),
  shippingCost: z.number().optional(),
  total: z.number().optional(),
});
export type InvoiceProcessingOutput = z.infer<typeof InvoiceProcessingOutputSchema>;

function normalizeDate(date: { year?: number | null; month?: number | null; day?: number | null } | null | undefined): string | undefined {
    if (!date || !date.year || !date.month || !date.day) return undefined;
    const { year, month, day } = date;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const processInvoiceFlow = ai.defineFlow(
  {
    name: 'processInvoiceFlow',
    inputSchema: InvoiceProcessingInputSchema,
    outputSchema: InvoiceProcessingOutputSchema,
  },
  async (input) => {
    if (!GCLOUD_PROJECT || !GCLOUD_LOCATION || !DOCUMENTAI_PROCESSOR_ID) {
      throw new Error('Variables de entorno de Document AI no configuradas en el servidor.');
    }
    
    const matches = input.invoiceDataUri.match(/^data:(.+);base64,(.*)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Formato de data URI inválido.');
    }
    const mimeType = matches[1];
    const encodedData = matches[2];

    const name = `projects/${GCLOUD_PROJECT}/locations/${GCLOUD_LOCATION}/processors/${DOCUMENTAI_PROCESSOR_ID}`;

    try {
      const [result] = await docAIClient.processDocument({
        name,
        rawDocument: {
          content: encodedData,
          mimeType: mimeType,
        },
      });
      
      const { document } = result;
      if (!document || !document.entities) {
          throw new Error('La respuesta de Document AI no contenía un documento o entidades válidas.');
      }

      const entities = document.entities;
      const getEntity = (type: string) => entities.find((e) => e.type === type)?.mentionText || undefined;
      const getAmount = (type: string) => {
          const text = getEntity(type);
          if (!text) return undefined;
          const num = parseFloat(text.replace(/[€$,\s]/g, '').replace(',', '.'));
          return isNaN(num) ? undefined : num;
      };

      const lineItems = (entities.filter((e) => e.type === 'line_item') || [])
        .map((item) => {
            const description = item.properties?.find((p) => p.type === 'description')?.mentionText;
            const quantity = item.properties?.find((p) => p.type === 'quantity')?.mentionText;
            const unitPrice = item.properties?.find((p) => p.type === 'unit_price')?.mentionText;
            const amount = item.properties?.find((p) => p.type === 'amount')?.mentionText;
            
            return {
                description: description || undefined,
                quantity: quantity ? parseFloat(quantity) : undefined,
                unitPrice: unitPrice ? parseFloat(unitPrice.replace(/[€$,\s]/g, '').replace(',', '.')) : undefined,
                totalAmount: amount ? parseFloat(amount.replace(/[€$,\s]/g, '').replace(',', '.')) : undefined,
            };
        });

      const output: z.infer<typeof InvoiceProcessingOutputSchema> = {
          supplierName: getEntity('supplier_name'),
          supplierTaxId: getEntity('supplier_tax_id'),
          invoiceId: getEntity('invoice_id'),
          invoiceDate: normalizeDate(result.document?.entities?.find(e => e.type === 'invoice_date')?.normalizedValue?.dateValue),
          dueDate: normalizeDate(result.document?.entities?.find(e => e.type === 'due_date')?.normalizedValue?.dateValue),
          items: lineItems,
          subtotal: getAmount('net_amount'),
          tax: getAmount('total_tax_amount'),
          shippingCost: getAmount('freight_amount'),
          total: getAmount('total_amount'),
      };
      
      return output;

    } catch (err: any) {
        console.error('Error al llamar a Document AI:', err);
        throw new Error(`Error del servidor de Document AI: ${err.message || 'Error desconocido'}`);
    }
  }
);

export async function processInvoice(input: InvoiceProcessingInput): Promise<InvoiceProcessingOutput> {
  return processInvoiceFlow(input);
}
