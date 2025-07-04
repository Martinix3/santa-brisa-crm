

'use server';
/**
 * @fileOverview An AI agent for matching invoice items to existing inventory items.
 *
 * - matchMaterial - A function that handles the inventory item matching process.
 * - MatchMaterialInput - The input type for the matchMaterial function.
 * - MatchMaterialOutput - The return type for the matchMaterial function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MatchMaterialInputSchema = z.object({
  itemName: z.string().describe("The name of the item from an invoice (e.g., 'CUBITERAS METAL GRANDE')."),
  existingMaterials: z.array(
    z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        categoryId: z.string(),
    })
  ).describe("A list of all inventory items currently in the system."),
});
export type MatchMaterialInput = z.infer<typeof MatchMaterialInputSchema>;

const MatchMaterialOutputSchema = z.object({
  matchType: z.enum(['perfect', 'suggested', 'none']).describe("The type of match found: 'perfect' for a confident match, 'suggested' for a likely but not certain match, and 'none' if no suitable match is found."),
  matchedMaterialId: z.string().optional().describe("The ID of the matched material from the existing list, if a match was found."),
  suggestedName: z.string().optional().describe("If no match is found, a cleaned-up, suggested name for creating a new item based on the invoice item name."),
  suggestedCategoryId: z.string().optional().describe("If no match is found, the most likely category ID for the new item."),
});
export type MatchMaterialOutput = z.infer<typeof MatchMaterialOutputSchema>;

export async function matchMaterial(input: MatchMaterialInput): Promise<MatchMaterialOutput> {
  return materialMatchingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'materialMatchingPrompt',
  model: 'gemini-1.5-flash',
  input: {schema: MatchMaterialInputSchema},
  output: {schema: MatchMaterialOutputSchema},
  prompt: `Eres un experto gestor de inventario y tu tarea es asociar un artículo de una factura de proveedor con un artículo existente en el sistema.

Analiza el nombre del artículo de la factura: \`{{{itemName}}}\`.

Compara este nombre con la siguiente lista de artículos de inventario existentes:
{{#each existingMaterials}}
- ID: {{id}}, Nombre: {{name}}, Categoría ID: {{categoryId}}{{#if description}}, Desc: {{description}}{{/if}}
{{/each}}

Tu objetivo es determinar la mejor coincidencia posible. Sigue estas reglas:
1.  **Coincidencia Perfecta:** Si el nombre del artículo de la factura es idéntico o un sinónimo/abreviatura muy obvio de un artículo existente (p. ej., 'Posavasos' y 'Posavasos de Cartón'), establece \`matchType\` como 'perfect' y devuelve el \`matchedMaterialId\` del artículo existente.
2.  **Sugerencia:** Si no hay una coincidencia perfecta pero un artículo existente es muy similar o podría ser el mismo (p. ej., 'Cubitera Grande' y 'Cubitera Metálica'), establece \`matchType\` como 'suggested' y devuelve el \`matchedMaterialId\` del artículo sugerido.
3.  **Sin Coincidencia:** Si no encuentras ningún artículo que coincida razonablemente, establece \`matchType\` como 'none'. En este caso, limpia el nombre del artículo de la factura para crear un \`suggestedName\` (p. ej., de 'CUBITERAS METAL GRANDE' a 'Cubitera Metálica Grande') y sugiere el \`suggestedCategoryId\` más apropiado. No devuelvas un \`matchedMaterialId\`.

Sé preciso y lógico en tu decisión.
`,
});

const materialMatchingFlow = ai.defineFlow(
  {
    name: 'materialMatchingFlow',
    inputSchema: MatchMaterialInputSchema,
    outputSchema: MatchMaterialOutputSchema,
  },
  async input => {
    // Basic normalization for a quick check before calling the LLM
    const normalizedItemName = input.itemName.toLowerCase().trim();
    const perfectMatch = input.existingMaterials.find(
        m => m.name.toLowerCase().trim() === normalizedItemName
    );

    if(perfectMatch) {
        return {
            matchType: 'perfect',
            matchedMaterialId: perfectMatch.id,
        };
    }
    
    // If no exact match, proceed with the LLM for smarter matching.
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("The AI failed to process the material matching request.");
    }
    return output;
  }
);
