// src/app/api/holded/projects/route.ts
import { NextRequest } from "next/server";

const BASE = "https://api.holded.com/api/projects/v1";

export async function GET(req: NextRequest) {
  const apiKey = process.env.HOLDED_API_KEY;
  if (!apiKey) {
    return Response.json(
      { ok: false, error: "Falta HOLDED_API_KEY en variables de entorno" },
      { status: 500 }
    );
  }

  // reenvía querystring si lo necesitas: ?limit=.. etc.
  const qs = req.nextUrl.search ?? "";
  const url = `${BASE}/projects${qs}`;

  const res = await fetch(url, {
    headers: {
      key: apiKey,
      accept: "application/json",
      "content-type": "application/json",
    },
    // Opcional: 30s por si hay respuestas lentas
    cache: "no-store",
  });

  // Si Holded devuelve HTML (404/403), lo verás aquí
  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) {
    const body = await res.text(); // no intentes .json() en error
    return Response.json(
      { ok: false, status: res.status, body: body.slice(0, 1200) },
      { status: res.status }
    );
  }

  // OK -> JSON
  if (contentType.includes("application/json")) {
    const data = await res.json();
    return Response.json({ ok: true, data });
  } else {
    const text = await res.text();
    return Response.json({ ok: true, data: text }); // por si acaso
  }
}
