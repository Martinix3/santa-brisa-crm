
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { kpiDataLaunch } from "@/lib/seeds";
import type { Kpi } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { Edit, Target, AlertTriangle } from "lucide-react";
import EditKpiTargetDialog, { type EditKpiTargetFormValues } from "@/components/app/edit-kpi-target-dialog";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";

export default function KpiLaunchTargetsPage() {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [kpis, setKpis] = React.useState<Kpi[]>(() => [...kpiDataLaunch]); // Use kpiDataLaunch
  const [editingKpi, setEditingKpi] = React.useState<Kpi | null>(null);
  const [isKpiTargetDialogOpen, setIsKpiTargetDialogOpen] = React.useState(false);

  const isAdmin = userRole === 'Admin';

  const handleEditKpiTarget = (kpi: Kpi) => {
    if (!isAdmin) return;
    setEditingKpi(kpi);
    setIsKpiTargetDialogOpen(true);
  };

  const handleSaveKpiTarget = (kpiId: string, newTargetValue: number) => {
    if (!isAdmin) return;
    
    // Update state for UI
    const updatedKpis = kpis.map(k =>
      k.id === kpiId ? { ...k, targetValue: newTargetValue } : k
    );
    setKpis(updatedKpis);

    // Update mock data source (kpiDataLaunch)
    const kpiInMockData = kpiDataLaunch.find(k => k.id === kpiId);
    if (kpiInMockData) {
      kpiInMockData.targetValue = newTargetValue;
    }
    
    const kpiTitle = kpiInMockData?.title.substring(0,30) || "KPI";
    toast({ title: "¡Meta Actualizada!", description: `La meta para "${kpiTitle}..." ha sido actualizada a ${newTargetValue}.` });
    
    setIsKpiTargetDialogOpen(false);
    setEditingKpi(null);
  };

  if (!isAdmin) {
    return (
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle className="flex items-center"><AlertTriangle className="mr-2 h-6 w-6 text-destructive" />Acceso Denegado</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No tienes permisos para acceder a esta sección.</p>
        </CardContent>
      </Card>
    );
  }

  const kpisToManage = kpis.filter(k => ['kpi1', 'kpi2', 'kpi3', 'kpi4'].includes(k.id));


  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between space-x-2">
        <div className="flex items-center space-x-2">
            <Target className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Gestión de Metas de KPIs de Lanzamiento</h1>
        </div>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Lista de Metas de KPIs</CardTitle>
          <CardDescription>Define y actualiza los valores objetivo para los Indicadores Clave de Rendimiento (KPIs) que se muestran en el panel de lanzamiento de producto.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Indicador (KPI)</TableHead>
                  <TableHead className="text-right w-[20%]">Meta Actual</TableHead>
                  <TableHead className="w-[15%]">Unidad</TableHead>
                  <TableHead className="text-right w-[15%]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpisToManage.length > 0 ? kpisToManage.map((kpi) => (
                  <TableRow key={kpi.id}>
                    <TableCell className="font-medium">{kpi.title}</TableCell>
                    <TableCell className="text-right font-medium">
                        <FormattedNumericValue value={kpi.targetValue} locale="es-ES" />
                    </TableCell>
                    <TableCell>{kpi.unit}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditKpiTarget(kpi)} disabled={!isAdmin}>
                        <Edit className="mr-1 h-3 w-3" /> Editar Meta
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No hay metas de KPIs de lanzamiento definidas. Esta sección permite ajustar los objetivos numéricos para el panel.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {kpisToManage.length > 0 && (
            <CardFooter>
                <p className="text-xs text-muted-foreground">Total de metas de KPIs gestionables: {kpisToManage.length}</p>
            </CardFooter>
        )}
      </Card>

      {isAdmin && editingKpi && (
        <EditKpiTargetDialog
          kpi={editingKpi}
          isOpen={isKpiTargetDialogOpen}
          onOpenChange={setIsKpiTargetDialogOpen}
          onSave={handleSaveKpiTarget}
        />
      )}
    </div>
  );
}
