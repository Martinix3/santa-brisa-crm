import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import axios from "axios";
import * as logger from "firebase-functions/logger";

const HOLDED_API_KEY = defineSecret("HOLDED_API_KEY");

// Región: ajusta si usabas otra (antes pusiste europe-west1)
export const holdedListProjects = onRequest(
  { region: "europe-west1", secrets: [HOLDED_API_KEY], cors: true },
  async (_req, res) => {
    // This handles the preflight OPTIONS request for CORS
    if (_req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.status(204).send("");
        return;
    }
    // Set CORS headers for actual requests
    res.set("Access-Control-Allow-Origin", "*");
    
    try {
      const apiKey = HOLDED_API_KEY.value();
      if (!apiKey) {
        logger.error("Holded API Key secret is not defined or unavailable.");
        res.status(500).json({ ok: false, error: "Falta la configuración de la clave de API de Holded en el servidor." });
        return;
      }
      
      logger.info("Successfully loaded Holded API Key.");

      const url = "https://api.holded.com/api/invoicing/v1/projects";
      logger.info(`Making GET request to: ${url}`);
      
      const r = await axios.get(url, { 
          headers: { 
            "key": apiKey,
            "Content-Type": "application/json",
          } 
      });
      
      logger.info("Successfully received response from Holded.", { status: r.status });
      res.status(200).json({ ok: true, data: r.data });

    } catch (e: any) {
      logger.error("ERROR during Holded API call:", {
            isAxiosError: axios.isAxiosError(e),
            axiosErrorData: axios.isAxiosError(e) ? {
                code: e.code,
                status: e.response?.status,
                data: e.response?.data,
            } : null,
            errorMessage: e.message,
            errorStack: e.stack,
        });

      if (axios.isAxiosError(e)) {
          const status = e.response?.status || 502;
          const errorMessage = e.response?.data?.info || e.message;
          res.status(status).json({ ok: false, error: `Error de la API de Holded: ${errorMessage}` });
      } else {
          res.status(500).json({ ok: false, error: e?.message ?? "Error al consultar Holded" });
      }
    }
  }
);
