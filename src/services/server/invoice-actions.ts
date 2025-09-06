
'use server';

import { processInvoice, type InvoiceProcessingInput, type InvoiceProcessingOutput } from '@/ai/flows/invoice-processing-flow';

export async function processInvoiceAction(input: InvoiceProcessingInput): Promise<InvoiceProcessingOutput> {
  return processInvoice(input);
}
