import 'dotenv/config'; // Asegura que las variables de entorno se carguen primero
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Se pasa la API Key explícitamente al plugin para evitar errores de autenticación.
// Esta es la forma más robusta de asegurar que Genkit tenga las credenciales.
export const ai = genkit({
  plugins: [googleAI({apiKey: process.env.GOOGLE_API_KEY})],
  model: 'googleai/gemini-1.5-flash',
});
