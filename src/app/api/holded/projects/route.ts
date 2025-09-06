// src/app/api/holded/projects/route.ts
import 'server-only';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const preferredRegion = 'europe-west1';
export const dynamic = 'force-dynamic';

const API_BASE = process.env.HOLDED_API_BASE ?? 'https://api.holded.com/api';
const API_KEY = process.env.HOLDED_API_KEY;

function authHeaders(key: string) {
  return { Authorization: `Bearer ${key}`, key };
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET(req: NextRequest) {
  if (!API_KEY) {
    return json(
      { ok: false, error: 'Falta HOLDED_API_KEY en .env.local' },
      500
    );
  }

  try {
    const url = new URL(req.url);
    const page = url.searchParams.get('page') ?? '1';
    const limit = url.searchParams.get('limit') ?? '50';

    const upstream = `${API_BASE.replace(/\/$/, '')}/projects?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`;

    const res = await fetch(upstream, {
      method: 'GET',
      headers: { ...authHeaders(API_KEY), Accept: 'application/json' },
      cache: 'no-store',
    });

    const text = await res.text();
    let data: unknown = text;
    try { data = JSON.parse(text); } catch {}

    if (!res.ok) {
      return json({ ok: false, status: res.status, upstream, error: data }, res.status);
    }

    return json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: message }, 500);
  }
}
