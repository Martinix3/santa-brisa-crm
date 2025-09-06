/**
 * @fileoverview A client for interacting with the Holded API.
 */
import axios from "axios";
const HOLDED_API_BASE_URL = "https://api.holded.com/api";
/**
 * Fetches a list of projects from the Holded API.
 * @param apiKey The API key for authenticating with Holded.
 * @returns A promise that resolves to the JSON response from the API.
 * @throws An error if the API call fails.
 */
export async function listProjects(apiKey) {
    const url = `${HOLDED_API_BASE_URL}/invoicing/v1/projects`;
    try {
        const response = await axios.get(url, {
            headers: {
                "key": apiKey,
                "Content-Type": "application/json",
            },
            timeout: 8000, // 8-second timeout
        });
        return response.data;
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const data = error.response?.data;
            const errorMessage = data?.info || error.message;
            throw new Error(`Holded API error ${status}: ${errorMessage}`);
        }
        // For non-axios errors
        throw new Error(`An unexpected error occurred: ${error.message}`);
    }
}
/**
 * Creates a new project in Holded.
 * @param apiKey The API key for authenticating with Holded.
 * @param projectData The data for the new project.
 * @returns A promise that resolves to the JSON response from the API.
 * @throws An error if the API call fails.
 */
export async function createProject(apiKey, projectData) {
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
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const data = error.response?.data;
            const errorMessage = data?.info || error.message;
            throw new Error(`Holded API error on create ${status}: ${errorMessage}`);
        }
        throw new Error(`An unexpected error occurred during project creation: ${error.message}`);
    }
}
