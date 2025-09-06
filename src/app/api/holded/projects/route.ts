
import 'server-only';
import { NextResponse } from 'next/server';

const BASE = 'https://api.holded.com/api/projects/v1';

export async function GET() {
  const key = process.env.HOLDED_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'No HOLDED_API_KEY configurada en el servidor' },
      { status: 500 }
    );
  }

  const r = await fetch(`${BASE}/projects`, {
    method: 'GET',
    headers: { key: key }, // Holded autentica con el header "key"
  });

  const body = await r.json().catch(() => ({ error: 'Respuesta no-JSON' }));
  return NextResponse.json(body, { status: r.status });
}
