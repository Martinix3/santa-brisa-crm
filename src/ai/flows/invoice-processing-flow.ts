
'use server';
/**
 * @fileOverview An AI agent for processing invoices.
 *
 * - processInvoice - a function that handles the invoice data extraction.
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
type ProcessInvoiceInput = z.infer<typeof ProcessInvoiceInputSchema>;

const ProcessInvoiceOutputSchema = z.object({
  supplier: z.string().describe("The name of the supplier or vendor from the invoice."),
  supplierCif: z.string().optional().describe("The supplier's CIF/VAT ID, if present."),
  supplierAddress: z.object({
      street: z.string().describe("The street name and number of the supplier's address."),
      city: z.string().describe("The city of the supplier's address."),
      province: z.string().describe("The province or state of the supplier's address."),
      postalCode: z.string().describe("The postal code of the supplier's address."),
      country: z.string().describe("The country of the supplier's address."),
  }).optional().describe("The structured address of the supplier, if available."),
  orderDate: z.string().describe("The issue date of the invoice in YYYY-MM-DD format."),
  items: z.array(z.object({
    description: z.string().describe("The description of the item or service."),
    quantity: z.number().default(1).describe("The quantity of the item. Defaults to 1 if not specified."),
    unitPrice: z.number().describe("The price per unit of the item, without tax."),
  })).describe("A list of all items from the invoice."),
  shippingCost: z.number().default(0).describe("The shipping cost, if specified separately. Defaults to 0 if not present."),
  taxRate: z.number().default(0).describe("The tax rate as a percentage (e.g., 21 for 21%). If multiple rates, provide the most common one. Defaults to 0 if not specified."),
  notes: z.string().optional().describe("Any relevant notes or invoice numbers found."),
});
type ProcessInvoiceOutput = z.infer<typeof ProcessInvoiceOutputSchema>;


export async function processInvoice(input: ProcessInvoiceInput): Promise<ProcessInvoiceOutput> {
  return invoiceProcessingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'invoiceProcessingPrompt',
  model: 'google/gemini-1.5-flash',
  input: {schema: ProcessInvoiceInputSchema},
  output: {schema: ProcessInvoiceOutputSchema},
  prompt: `You are an expert accounting assistant. Your task is to extract structured information from an invoice file with the highest possible accuracy, especially with numbers.

Analyze the provided invoice image or PDF and extract the following details. Be extremely precise.

**Critically Important Instructions:**
- **Input Type Awareness**: If the input is a PDF, be aware that the underlying text data can be messy or different from what is visually presented. Prioritize the visual information in the document. If you see "10.290,00" visually, use that, even if the extracted text layer says "11290". Treat the PDF as an image first and foremost.
- **Number Format Detection**: Before processing numbers, analyze the invoice to determine its locale.
  - If it appears to be a **Spanish/European** invoice, the period (\`.\`) is the thousands separator and the comma (\`,\`) is the decimal separator. Example: \`1.234,56\` must be interpreted as \`1234.56\`.
  - If it appears to be an **Anglo-Saxon (US/UK)** invoice, the comma (\`,\`) is the thousands separator and the period (\`.\`) is the decimal separator. Example: \`1,234.56\` must be interpreted as \`1234.56\`.
  - This step is CRUCIAL. Misinterpreting the decimal separator will lead to incorrect financial data.
- **Unit Price vs. Total Price Calculation**: Pay close attention to the line item table structure. Some invoices list the **total price** for the line (quantity x unit price) in the main price column, not the unit price.
  - **Check the column header**: Headers like "Importe" or "Total" suggest a total line price. Headers like "P/U" or "Unit Price" suggest a unit price. The header "Precio" is ambiguous and requires checking the subtotal.
  - **Verify with Subtotal**: After extracting items, mentally calculate \`sum(quantity * price_from_column)\`. If this sum is wildly different from the document's \`Subtotal\`, it's likely the column shows the unit price. If the \`sum(price_from_column)\` is very close to the \`Subtotal\`, then the column shows the total line price.
  - **Your Duty**: If you determine the column is a **total line price**, you **must calculate the correct \`unitPrice\` for the output** by dividing that total line price by the \`quantity\`. For example, if quantity is 2 and the line price is 318.00, the \`unitPrice\` you must output is 159.00.
- **Double-Check Numbers**: After determining the format, double-check your transcription of all numbers (quantity, price, total). Be aware of common OCR errors (e.g., '1' vs 'l', '0' vs 'O', '8' vs 'B'). Accuracy is paramount.
- **Line Items Source:** Extract line items ONLY from the main table with columns like CANT, PRECIO, IMPORTE. Ignore any summary text below the table (like pallet details or production notes) when creating the list of items.

**Data to Extract:**
- **Supplier Name**: Identify the vendor or company that issued the invoice.
- **Supplier CIF/VAT ID**: Extract the supplier's tax identification number (CIF, NIF, VAT ID, etc.).
- **Supplier Address**: Extract the supplier's full mailing address and break it down into structured fields: street, city, province, postalCode, and country.
- **Invoice Date**: Find the issue date and format it as YYYY-MM-DD.
- **Line Items**: For each item in the main table, provide its description, quantity, and unit price (before tax). If quantity is not specified for an item, assume it is 1. Remember your duty to calculate the unit price if the invoice shows a total line price.
- **Shipping Cost**: If there is a separate charge for shipping, delivery, or "portes", extract that value. If not present, this should be 0 or omitted.
- **Tax Rate**: Identify the VAT or tax rate percentage (e.g., IVA 21%). If there are multiple, provide the most prominent one.
- **Notes**: Extract any invoice number (Nº Factura), order number, or other relevant text notes from the document.

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
