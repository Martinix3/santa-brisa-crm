
'use server';
/**
 * @fileOverview An AI agent for extracting structured client data from text or images.
 *
 * - extractClientData - A function that handles the client data extraction.
 * - ClientDataExtractionInput - The input type for the extractClientData function.
 * - ClientDataExtractionOutput - The return type for the extractClientData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ClientDataExtractionInputSchema = z.object({
  textBlock: z.string().optional().describe('A block of text containing client information like name, address, contact details, CIF, etc.'),
  imageDataUri: z.string().optional().describe("A photo of a business card, storefront, or screenshot, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ClientDataExtractionInput = z.infer<typeof ClientDataExtractionInputSchema>;

const ClientDataExtractionOutputSchema = z.object({
  legalName: z.string().optional().describe("The official legal name of the business (e.g., 'Restaurante El Puerto S.L.')."),
  cif: z.string().optional().describe("The tax identification number (CIF/NIF) of the business."),
  addressBilling: z.object({
      street: z.string().describe("The street name and number."),
      city: z.string().describe("The city."),
      province: z.string().describe("The province or state."),
      postalCode: z.string().describe("The postal code."),
      country: z.string().describe("The country."),
  }).optional().describe("The structured billing address."),
  addressShipping: z.object({
      street: z.string().describe("The street name and number."),
      city: z.string().describe("The city."),
      province: z.string().describe("The province or state."),
      postalCode: z.string().describe("The postal code."),
      country: z.string().describe("The country."),
  }).optional().describe("The structured shipping address. If not specified, assume it is the same as the billing address."),
  mainContactName: z.string().optional().describe("The name of the main contact person."),
  mainContactEmail: z.string().optional().describe("The email address of the main contact person."),
  mainContactPhone: z.string().optional().describe("The phone number of the main contact person."),
});
export type ClientDataExtractionOutput = z.infer<typeof ClientDataExtractionOutputSchema>;

export async function extractClientData(input: ClientDataExtractionInput): Promise<ClientDataExtractionOutput> {
  return clientDataExtractionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'clientDataExtractionPrompt',
  input: { schema: ClientDataExtractionInputSchema },
  output: { schema: ClientDataExtractionOutputSchema },
  model: 'googleai/gemini-1.5-pro-latest',
  prompt: `You are an expert data entry assistant. Your task is to extract and structure client information from a raw text block or an image with the highest possible accuracy.

The user will provide either a text block or an image. Analyze it and extract the following details. If a piece of information is not present, omit the field.

**Data to Extract:**
- **Legal Name**: The official registered name of the business.
- **CIF/NIF**: The tax ID.
- **Billing Address**: The full fiscal address, broken down into street, city, province, postal code, and country.
- **Shipping Address**: The delivery address. If it's not explicitly different, assume it's the same as the billing address.
- **Main Contact Person**: The name of a contact person.
- **Contact Email**: The contact's email.
- **Contact Phone**: The contact's phone number.

Be precise. Do not invent information.

{{#if textBlock}}
**Analyze the following text:**
---
{{{textBlock}}}
---
{{/if}}

{{#if imageDataUri}}
**Analyze the following image:**
{{media url=imageDataUri}}
{{/if}}
`,
});

const clientDataExtractionFlow = ai.defineFlow(
  {
    name: 'clientDataExtractionFlow',
    inputSchema: ClientDataExtractionInputSchema,
    outputSchema: ClientDataExtractionOutputSchema,
  },
  async (input) => {
    if (!input.textBlock && !input.imageDataUri) {
      throw new Error("Either a text block or an image data URI must be provided.");
    }

    const { output } = await prompt(input);
    if (!output) {
      throw new Error("The AI failed to extract any data. The input might be unreadable or empty.");
    }
    return output;
  }
);
