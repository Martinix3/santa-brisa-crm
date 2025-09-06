"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProjects = listProjects;
exports.createProject = createProject;
/**
 * @fileoverview A client for interacting with the Holded API.
 */
const axios_1 = __importDefault(require("axios"));
const HOLDED_API_BASE_URL = "https://api.holded.com/api";
/**
 * Fetches a list of projects from the Holded API.
 * @param apiKey The API key for authenticating with Holded.
 * @returns A promise that resolves to the JSON response from the API.
 * @throws An error if the API call fails.
 */
async function listProjects(apiKey) {
    const url = `${HOLDED_API_BASE_URL}/invoicing/v1/projects`;
    try {
        const response = await axios_1.default.get(url, {
            headers: {
                "key": apiKey,
                "Content-Type": "application/json",
            },
            timeout: 8000, // 8-second timeout
        });
        return response.data;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            const status = error.response?.status;
            const data = error.response?.data;
            const errorMessage = data?.info || error.message;
            throw new Error(`Holded API error ${status}: ${errorMessage}`);
        }
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`An unexpected error occurred: ${msg}`);
    }
}
/**
 * Creates a new project in Holded.
 * @param apiKey The API key for authenticating with Holded.
 * @param projectData The data for the new project.
 * @returns A promise that resolves to the JSON response from the API.
 * @throws An error if the API call fails.
 */
async function createProject(apiKey, projectData) {
    const url = `${HOLDED_API_BASE_URL}/invoicing/v1/projects`;
    try {
        const response = await axios_1.default.post(url, projectData, {
            headers: {
                "key": apiKey,
                "Content-Type": "application/json",
            },
            timeout: 8000,
        });
        return response.data;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            const status = error.response?.status;
            const data = error.response?.data;
            const errorMessage = data?.info || error.message;
            throw new Error(`Holded API error on create ${status}: ${errorMessage}`);
        }
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`An unexpected error occurred during project creation: ${msg}`);
    }
}
