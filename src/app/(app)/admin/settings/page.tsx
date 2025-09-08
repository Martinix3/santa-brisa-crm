
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, Goal, Target, Settings, Archive, PackageCheck, Wrench, Waypoints, KeyRound, Award, Euro, Receipt, HardHat, Briefcase, Server, Cog } from "lucide-react"; 
import { useAuth } from "@/contexts/auth-context";
import { AlertTriangle } from "lucide-react";

const adminSections = [
  {
    title: "Gestión de Usuarios",
    description: "Añadir, editar o ver usuarios del sistema.",
    href: "/admin/user-management",
    icon: Users,
    group: "General"
  },
   {
    title: "Centros de Coste",
    description: "Crear y administrar centros de coste para imputar gastos.",
    href: "/admin/cost-centers",
    icon: Waypoints,
    group: "General"
  },
  {
    title: "Proveedores",
    description: "Gestionar el directorio de proveedores.",
    href: "/suppliers",
    icon: Briefcase,
    group: "General"
  },
  {
    title: "Gestión de Permisos",
    description: "Visualizar los permisos detallados para cada rol de usuario.",
    href: "/admin/permissions",
    icon: KeyRound,
    group: "General"
  },
  {
    title: "Inventario y Lotes",
    description: "Gestionar el catálogo de artículos inventariables y su stock.",
    href: "/admin/inventory",
    icon: Archive,
    group: "Producción"
  },
  {
    title: "Gestión de Tanques",
    description: "Visualizar y gestionar los tanques de producción.",
    href: "/tanks",
    icon: Server,
    group: "Producción"
  },
  {
    title: "Gestión de Recetas (BOM)",
    description: "Definir los componentes y cantidades para fabricar productos.",
    href: "/admin/bom-management",
    icon: Wrench,
    group: "Producción"
  },
  {
    title: "Órdenes de Producción",
    description: "Planificar y seguir las órdenes de producción.",
    href: "/production",
    icon: Cog,
    group: "Producción"
  },
  {
    title: "Ventas Propias",
    description: "Registrar ventas facturadas directamente por Santa Brisa.",
    href: "/direct-sales-sb",
    icon: Briefcase, // Changed from Briefcase
    group: "Finanzas"
  },
  {
    title: "Gestión de Gastos y Compras",
    description: "Registrar gastos generales y compras de inventario a proveedores.",
    href: "/purchases",
    icon: Receipt,
    group: "Finanzas"
  },
  {
    title: "Condiciones de Clavadistas",
    description: "Gestionar las comisiones y bonos para el programa de clavadistas.",
    href: "/admin/ambassador-settings",
    icon: Award,
    group: "Ventas & Marketing"
  },
  {
    title: "Objetivos Estratégicos",
    description: "Definir y gestionar los objetivos cualitativos de la empresa.",
    href: "/admin/objectives-management",
    icon: Goal,
    group: "Ventas & Marketing"
  },
  {
    title: "Metas KPIs Lanzamiento",
    description: "Ajustar las metas numéricas para los KPIs del panel de lanzamiento.",
    href: "/admin/kpi-launch-targets",
    icon: Target,
    group: "Ventas & Marketing"
  },
  {
    title: "Gestión de Muestras",
    description: "Aprobar y seguir las solicitudes de muestras de producto.",
    href: "/admin/sample-management",
    icon: PackageCheck,
    group: "Ventas & Marketing"
  }
];

const groupOrder = ["Producción", "Finanzas", "Ventas & Marketing", "General", "Integraciones"];

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

  const groupedSections = adminSections.reduce((acc, section) => {
    const group = section.group || "General";
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(section);
    return acc;
  }, {} as Record<string, typeof adminSections>);

  return (
    <div className="space-y-8">
      <header className="flex items-center space-x-2">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Configuración de Administración</h1>
      </header>
      <CardDescription>
        Accede a las diferentes secciones de configuración para gestionar usuarios, objetivos y KPIs.
      </CardDescription>

      {groupOrder.map(groupName => (
        <div key={groupName} className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">{groupName}</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groupedSections[groupName]?.map((section) => (
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
      ))}
    </div>
  );
}
