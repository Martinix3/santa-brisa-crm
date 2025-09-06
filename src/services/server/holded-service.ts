
'use server';
/**
 * @fileoverview A server-side client for interacting with the Holded API.
 * This service runs exclusively on the server and uses the API key
 * from environment variables, accessed via Google Secret Manager.
 */
import axios from "axios";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const HOLDED_API_KEY_SECRET_NAME = "projects/200195875400/secrets/HOLDED_API_KEY/versions/latest";
const HOLDED_API_BASE_URL = "https://api.holded.com/api";

let cachedApiKey: string | null = null;

/**
 * Fetches the Holded API key from Google Secret Manager with in-memory caching.
 * @returns {Promise<string>} The Holded API key.
 */
async function getApiKey(): Promise<string> {
    if (cachedApiKey) {
        return cachedApiKey;
    }

    try {
        const client = new SecretManagerServiceClient();
        const [version] = await client.accessSecretVersion({
            name: HOLDED_API_KEY_SECRET_NAME,
        });
        
        const payload = version.payload?.data?.toString();
        if (!payload) {
            throw new Error("El secreto de la API de Holded está vacío o no se pudo acceder a él.");
        }
        
        cachedApiKey = payload;
        return payload;
    } catch (error) {
        console.error("Error accessing secret from Secret Manager:", error);
        throw new Error("No se pudo obtener la clave de API para Holded desde el servidor. Asegúrate de que esté configurada correctamente en Google Secret Manager y que la cuenta de servicio tenga permisos.");
    }
}


/**
 * Fetches a list of projects from the Holded API.
 * @returns A promise that resolves to the JSON response from the API.
 * @throws An error if the API call fails.
 */
export async function listHoldedProjects() {
  const apiKey = await getApiKey();
  const url = `${HOLDED_API_BASE_URL}/invoicing/v1/projects`;

  try {
    const response = await axios.get(url, {
      headers: {
        "key": apiKey,
        "Content-Type": "application/json",
      },
      timeout: 8000,
    });
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      const errorMessage = data?.info || error.message;
      throw new Error(`Holded API error ${status}: ${errorMessage}`);
    }
    throw new Error(`An unexpected error occurred: ${error.message}`);
  }
}

/**
 * Creates a new project in Holded.
 * @param projectData The data for the new project.
 * @returns A promise that resolves to the JSON response from the API.
 * @throws An error if the API call fails.
 */
export async function createHoldedProject(projectData: { name: string, description?: string }) {
  const apiKey = await getApiKey();
  const url = `${HOLDED_API_BASE_URL}/invoicing/v1/projects`;
  try {
    const response = await axios.post(url, projectData, {
      headers: {
        "key": apiKey,
        "Content-Type": "application/json",
      },
       timeout: 8000,
    });
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      const errorMessage = data?.info || error.message;
      throw new Error(`Holded API error on create ${status}: ${errorMessage}`);
    }
    throw new Error(`An unexpected error occurred during project creation: ${error.message}`);
  }
}
