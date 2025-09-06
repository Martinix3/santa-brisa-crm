

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { Tank, TankFormValues } from "@/types";
import { Server, Loader2, PlusCircle, MoreHorizontal, Edit } from "lucide-react";
import { getTanksFS, addTankFS, updateTankFS } from "@/services/tank-service";
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { useAuth } from "@/contexts/auth-context";
import TankDialog from "@/components/app/tank-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function TanksPage() {
  const { toast } = useToast();
  const { dataSignature, refreshDataSignature } = useAuth();
  
  const [tanks, setTanks] = React.useState<Tank[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingTank, setEditingTank] = React.useState<Tank | null>(null);
  
  React.useEffect(() => {
    const fetchTanks = async () => {
      setIsLoading(true);
      try {
        const fetchedTanks = await getTanksFS();
        setTanks(fetchedTanks);
      } catch (error) {
        console.error("Error fetching tanks:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los tanques.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchTanks();
  }, [toast, dataSignature]);

  const handleAddNew = () => {
    setEditingTank(null);
    setIsDialogOpen(true);
  };
  
  const handleEdit = (tank: Tank) => {
    setEditingTank(tank);
    setIsDialogOpen(true);
  };

  const handleSaveTank = async (data: TankFormValues, tankId?: string) => {
    try {
        if (tankId) {
            await updateTankFS(tankId, data);
            toast({ title: "¡Tanque Actualizado!", description: `El tanque "${data.name}" ha sido actualizado.` });
        } else {
            await addTankFS(data);
            toast({ title: "¡Tanque Creado!", description: `El tanque "${data.name}" ha sido añadido.` });
        }
        refreshDataSignature();
        setIsDialogOpen(false);
    } catch (error: any) {
        toast({ title: "Error al Guardar", description: error.message, variant: "destructive"});
    }
  };

  return (
    <>
      <div className="space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
              <Server className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-headline font-semibold">Gestión de Tanques</h1>
          </div>
          <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Tanque
          </Button>
        </header>
        
        <Card>
          <CardHeader>
            <CardTitle>Listado de Tanques de Mezcla</CardTitle>
            <CardDescription>Visualiza el estado y la disponibilidad de los tanques de producción.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre / ID</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead className="text-right">Capacidad (L)</TableHead>
                    <TableHead className="text-right">Cantidad Actual (L)</TableHead>
                    <TableHead>Lote Actual</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tanks.length > 0 ? tanks.map(tank => (
                    <TableRow key={tank.id}>
                        <TableCell className="font-medium">{tank.name}</TableCell>
                        <TableCell>{tank.location}</TableCell>
                        <TableCell className="text-right"><FormattedNumericValue value={tank.capacity} /></TableCell>
                        <TableCell className="text-right font-semibold">
                            {tank.status === 'Ocupado' && tank.currentQuantity ? (
                                <FormattedNumericValue value={tank.currentQuantity} />
                            ) : (
                                "—"
                            )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{tank.currentBatchId || 'N/A'}</TableCell>
                        <TableCell><StatusBadge type="tank" status={tank.status} /></TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onSelect={() => handleEdit(tank)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Editar
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="text-center h-24">No hay tanques registrados en el sistema.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <TankDialog 
        tank={editingTank}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveTank}
      />
    </>
  );
}

