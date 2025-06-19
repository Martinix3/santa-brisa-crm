'use server';
/**
 * @fileOverview Un asistente de IA para marketing y ventas de Santa Brisa.
 *
 * - askMarketingAssistant - Función que maneja las preguntas al asistente.
 * - MarketingAssistantInput - Tipo de entrada para la función askMarketingAssistant.
 * - MarketingAssistantOutput - Tipo de salida para la función askMarketingAssistant.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MarketingAssistantInputSchema = z.object({
  question: z.string().describe('La pregunta del vendedor para el asistente de IA.'),
});
export type MarketingAssistantInput = z.infer<typeof MarketingAssistantInputSchema>;

const MarketingAssistantOutputSchema = z.object({
  answer: z.string().describe('La respuesta generada por la IA a la pregunta del vendedor.'),
});
export type MarketingAssistantOutput = z.infer<typeof MarketingAssistantOutputSchema>;

export async function askMarketingAssistant(input: MarketingAssistantInput): Promise<MarketingAssistantOutput> {
  return marketingAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'marketingAssistantPrompt',
  input: {schema: MarketingAssistantInputSchema},
  output: {schema: MarketingAssistantOutputSchema},
  prompt: `Eres 'Santi', el asistente experto en marketing y ventas de Santa Brisa, una marca de agua premium.
Tu objetivo es ayudar a los representantes de ventas proporcionando respuestas claras, concisas y útiles.
Base tus respuestas en información sobre:
- Productos Santa Brisa: origen, propiedades únicas, formatos disponibles, beneficios.
- Argumentos de venta: diferenciadores clave, puntos fuertes frente a la competencia (si se dispone de información general, evita criticar directamente a otras marcas).
- Filosofía de la empresa: valores, compromiso con la calidad y sostenibilidad.
- Preguntas frecuentes de clientes.

Formato de respuesta:
- Directa y al grano.
- Si es apropiado, utiliza listas con guiones para facilitar la lectura.
- Mantén un tono profesional, amable y entusiasta por la marca Santa Brisa.

Pregunta del vendedor:
{{{question}}}

Respuesta de Santi:`,
});

const marketingAssistantFlow = ai.defineFlow(
  {
    name: 'marketingAssistantFlow',
    inputSchema: MarketingAssistantInputSchema,
    outputSchema: MarketingAssistantOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      // Esto no debería ocurrir si el LLM sigue el schema, pero es un fallback.
      return { answer: "No se pudo generar una respuesta en este momento." };
    }
    return output;
  }
);
