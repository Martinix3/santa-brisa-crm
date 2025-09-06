import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import axios from "axios";
const HOLDED_API_BASE_URL = "https://api.holded.com/api";
// Define the function using onRequest from v2, which is better for HTTP triggers
export const holdedListProjects = onRequest({
    region: "europe-west1",
    timeoutSeconds: 30,
    memory: "256MiB",
    cors: true,
}, async (req, res) => {
    logger.info("holdedListProjects function triggered", { method: req.method, path: req.path });
    // This handles the preflight OPTIONS request for CORS
    if (req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.status(204).send("");
        return;
    }
    // Set CORS headers for actual requests
    res.set("Access-Control-Allow-Origin", "*");
    try {
        const apiKey = process.env.HOLDED_API_KEY;
        if (!apiKey) {
            logger.error("CRITICAL: HOLDED_API_KEY secret is not defined in process.env.");
            res.status(500).json({ ok: false, error: "La clave de API para Holded no está configurada en el servidor." });
            return;
        }
        logger.info(`API Key found (length: ${apiKey.length}).`);
        const url = `${HOLDED_API_BASE_URL}/invoicing/v1/projects`;
        logger.info(`Making request to Holded API: ${url}`);
        const response = await axios.get(url, {
            headers: {
                "key": apiKey,
                "Content-Type": "application/json",
            },
            timeout: 10000,
        });
        logger.info("Successfully received response from Holded API.", { status: response.status });
        res.status(200).json({ ok: true, data: response.data });
    }
    catch (error) {
        logger.error("ERROR during Holded API call:", {
            // Log rich error information if it's an Axios error
            isAxiosError: axios.isAxiosError(error),
            axiosErrorData: axios.isAxiosError(error) ? {
                code: error.code,
                status: error.response?.status,
                headers: error.response?.headers,
                data: error.response?.data,
                requestConfig: {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers, // Headers are redacted for security by default
                },
            } : null,
            // Fallback for non-Axios errors
            errorMessage: error.message,
            errorStack: error.stack,
        });
        if (axios.isAxiosError(error)) {
            const status = error.response?.status || 502; // Default to 502 Bad Gateway if no response
            const errorMessage = error.response?.data?.info || error.message;
            res.status(status).json({ ok: false, error: `Error de la API de Holded: ${errorMessage}` });
        }
        else {
            res.status(500).json({ ok: false, error: "Ocurrió un error inesperado en el servidor." });
        }
    }
});
