import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
// No longer need defineSecret, as Firebase will inject the secret into process.env
import { listProjects, createProject } from "./holdedClient.js";
/**
 * A Cloud Function that acts as a secure proxy to Holded's /projects endpoint.
 * It fetches projects using the securely stored API key on the server.
 * The HOLDED_API_KEY secret is automatically populated into process.env by Firebase
 * when the function is deployed, if it has been set with `firebase functions:secrets:set`.
 */
export const holdedListProjects = onRequest({
    region: "europe-west1",
    timeoutSeconds: 30,
    memory: "256MiB",
    // The `secrets` property is removed from here. Firebase handles it.
    cors: true,
}, async (req, res) => {
    // Set CORS headers for all responses, including errors
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    try {
        // Read the secret value directly from the environment variables.
        const apiKey = process.env.HOLDED_API_KEY;
        if (!apiKey) {
            logger.error("The HOLDED_API_KEY environment variable is not configured or accessible in the function's runtime environment.");
            res.status(500).json({ ok: false, error: "La clave de API para Holded no está configurada en el servidor." });
            return;
        }
        if (req.method === 'GET') {
            const projects = await listProjects(apiKey);
            res.status(200).json({ ok: true, data: projects });
        }
        else if (req.method === 'POST') {
            const newProject = await createProject(apiKey, req.body);
            res.status(201).json({ ok: true, data: newProject });
        }
        else {
            res.status(405).json({ ok: false, error: "Method Not Allowed" });
        }
    }
    catch (e) {
        logger.error("Error in holdedListProjects proxy", {
            errorMessage: e.message,
            errorStack: e.stack,
        });
        res.status(502).json({ ok: false, error: e.message });
    }
});
