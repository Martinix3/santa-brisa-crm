"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.holdedProjects = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const logger = __importStar(require("firebase-functions/logger"));
const holdedClient_1 = require("./holdedClient");
const HOLDED_API_KEY = (0, params_1.defineSecret)("HOLDED_API_KEY");
// --- UTILITY FOR CORS ---
function setCorsHeaders(res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-control-allow-headers", "Content-Type, Authorization");
}
// --- PROJECTS ENDPOINT ---
exports.holdedProjects = (0, https_1.onRequest)({ region: "europe-west1", secrets: [HOLDED_API_KEY], cors: true }, async (req, res) => {
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
            const projects = await (0, holdedClient_1.listProjects)(apiKey);
            logger.info("Successfully fetched projects from Holded.");
            res.status(200).json({ ok: true, data: projects });
        }
        else if (req.method === 'POST') {
            logger.info("Handling POST /holdedProjects");
            const projectData = req.body;
            if (!projectData || !projectData.name) {
                res.status(400).json({ ok: false, error: "El nombre del proyecto ('name') es obligatorio." });
                return;
            }
            const newProject = await (0, holdedClient_1.createProject)(apiKey, projectData);
            logger.info(`Successfully created project "${newProject.name}" in Holded.`);
            res.status(201).json({ ok: true, data: newProject });
        }
        else {
            res.setHeader('Allow', ['GET', 'POST']);
            res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error("ERROR during Holded API call:", {
            errorMessage: msg,
            errorStack: e instanceof Error ? e.stack : undefined,
        });
        res.status(500).json({ ok: false, error: msg || "Error al consultar Holded" });
    }
});
