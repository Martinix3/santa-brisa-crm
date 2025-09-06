import { onRequest, type Request } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { listProjects, createProject } from "./holdedClient";
import type { Response } from "express";

const HOLDED_API_KEY = defineSecret("HOLDED_API_KEY");

// --- UTILITY FOR CORS ---
function setCorsHeaders(res: Response) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-control-allow-headers", "Content-Type, Authorization");
}


// --- PROJECTS ENDPOINT ---
export const holdedProjects = onRequest(
  { region: "europe-west1", secrets: [HOLDED_API_KEY], cors: true },
  async (req: Request, res: Response): Promise<void> => {
    setCorsHeaders(res);
    
    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      const apiKey = HOLDED_API_KEY.value();
      if (!apiKey) {
        logger.error("Holded API Key secret is not defined or unavailable.");
        res.status(500).json({ ok: false, error: "Falta la configuración de la clave de API de Holded en el servidor." });
        return;
      }

      if (req.method === 'GET') {
          logger.info("Handling GET /holdedProjects");
          const projects = await listProjects(apiKey);
          logger.info("Successfully fetched projects from Holded.");
          res.status(200).json({ ok: true, data: projects });

      } else if (req.method === 'POST') {
          logger.info("Handling POST /holdedProjects");
          const projectData = req.body;
          if (!projectData || !projectData.name) {
              res.status(400).json({ ok: false, error: "El nombre del proyecto ('name') es obligatorio." });
              return;
          }
          const newProject = await createProject(apiKey, projectData);
          logger.info(`Successfully created project "${newProject.name}" in Holded.`);
          res.status(201).json({ ok: true, data: newProject });
      
      } else {
          res.setHeader('Allow', ['GET', 'POST']);
          res.status(405).end(`Method ${req.method} Not Allowed`);
      }

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error("ERROR during Holded API call:", {
        errorMessage: msg,
        errorStack: e instanceof Error ? e.stack : undefined,
      });
      res.status(500).json({ ok: false, error: msg || "Error al consultar Holded" });
    }
  }
);
