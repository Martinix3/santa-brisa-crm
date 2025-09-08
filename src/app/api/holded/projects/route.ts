// src/app/api/holded/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { listHoldedProjects, createHoldedProject } from "@/services/server/holded-service";

export const dynamic = 'force-dynamic'; // Ensures the route is always dynamic

export async function GET(req: NextRequest) {
  try {
    const projects = await listHoldedProjects();
    return NextResponse.json({ ok: true, data: projects });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const projectData = await req.json();
     if (!projectData || !projectData.name) {
      return NextResponse.json(
        { ok: false, error: "El nombre del proyecto ('name') es obligatorio." },
        { status: 400 }
      );
    }
    const newProject = await createHoldedProject(projectData);
    return NextResponse.json({ ok: true, data: newProject }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
