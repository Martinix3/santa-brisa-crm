
import { NextResponse } from 'next/server';
import { listHoldedProjects, createHoldedProject } from '@/services/server/holded-service';

export const dynamic = 'force-dynamic';

/**
 * GET handler for fetching Holded projects.
 */
export async function GET(request: Request) {
  try {
    const projects = await listHoldedProjects();
    return NextResponse.json({ ok: true, data: projects });
  } catch (error: any) {
    console.error("Error in GET /api/holded/projects:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error del servidor al obtener proyectos de Holded." },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating a new Holded project.
 */
export async function POST(request: Request) {
  try {
    const projectData = await request.json();
    if (!projectData || !projectData.name) {
      return NextResponse.json(
        { ok: false, error: "El nombre del proyecto ('name') es obligatorio." },
        { status: 400 }
      );
    }
    const newProject = await createHoldedProject(projectData);
    return NextResponse.json({ ok: true, data: newProject }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/holded/projects:", error);
     return NextResponse.json(
      { ok: false, error: error.message || "Error del servidor al crear el proyecto en Holded." },
      { status: 500 }
    );
  }
}
