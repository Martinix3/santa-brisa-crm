
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, Goal, Target, Settings } from "lucide-react"; 
import { useAuth } from "@/contexts/auth-context";
import { AlertTriangle } from "lucide-react";

const adminSections = [
  {
    title: "Gestión de Usuarios",
    description: "Añadir, editar o ver usuarios del sistema.",
    href: "/admin/user-management",
    icon: Users,
  },
  {
    title: "Objetivos Estratégicos",
    description: "Definir y gestionar los objetivos cualitativos de la empresa.",
    href: "/admin/objectives-management",
    icon: Goal,
  },
  {
    title: "Metas KPIs Lanzamiento",
    description: "Ajustar las metas numéricas para los KPIs del panel de lanzamiento.",
    href: "/admin/kpi-launch-targets",
    icon: Target,
  },
];

export default function AdminSettingsPage() {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'Admin';

  if (!isAdmin) {
    return (
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle className="flex items-center"><AlertTriangle className="mr-2 h-6 w-6 text-destructive" />Acceso Denegado</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No tienes permisos para acceder a esta sección de configuración.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center space-x-2">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Configuración de Administración</h1>
      </header>
      <CardDescription>
        Accede a las diferentes secciones de configuración para gestionar usuarios, objetivos y KPIs.
      </CardDescription>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => (
          <Card key={section.title} className="shadow-subtle hover:shadow-md transition-shadow duration-300 flex flex-col">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-2">
                <section.icon className="h-7 w-7 text-primary" />
                <CardTitle className="text-xl">{section.title}</CardTitle>
              </div>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-end">
              <Button asChild className="w-full mt-auto">
                <Link href={section.href}>Ir a {section.title}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
