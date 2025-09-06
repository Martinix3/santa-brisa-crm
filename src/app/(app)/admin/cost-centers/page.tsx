
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { CostCenter } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Edit, Trash2, MoreHorizontal, Waypoints, Loader2 } from "lucide-react";
import CostCenterDialog from "@/components/app/cost-center-dialog";
import type { CostCenterFormValues } from "@/components/app/cost-center-dialog";
import { getCostCentersFS, addCostCenterFS, updateCostCenterFS, deleteCostCenterFS } from "@/services/costcenter-service";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function CostCentersPage() {
    const { toast } = useToast();
    const { dataSignature, refreshDataSignature } = useAuth();
    const [costCenters, setCostCenters] = React.useState<CostCenter[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingCenter, setEditingCenter] = React.useState<CostCenter | null>(null);
    const [centerToDelete, setCenterToDelete] = React.useState<CostCenter | null>(null);

    React.useEffect(() => {
        setIsLoading(true);
        getCostCentersFS()
            .then(setCostCenters)
            .catch(err => {
                console.error("Failed to fetch cost centers:", err);
                toast({ title: "Error", description: "No se pudieron cargar los centros de coste.", variant: "destructive" });
            })
            .finally(() => setIsLoading(false));
    }, [dataSignature, toast]);

    const handleAddNew = () => {
        setEditingCenter(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (center: CostCenter) => {
        setEditingCenter(center);
        setIsDialogOpen(true);
    };

    const handleDelete = (center: CostCenter) => {
        setCenterToDelete(center);
    };
    
    const confirmDelete = async () => {
        if (!centerToDelete) return;
        try {
            await deleteCostCenterFS(centerToDelete.id);
            toast({ title: "Centro de Coste Eliminado", description: `"${centerToDelete.name}" ha sido eliminado.`, variant: "destructive" });
            refreshDataSignature();
        } catch (error: any) {
            toast({ title: "Error al Eliminar", description: error.message, variant: "destructive" });
        } finally {
            setCenterToDelete(null);
        }
    };

    const handleSave = async (data: CostCenterFormValues, id?: string) => {
        try {
            if (id) {
                await updateCostCenterFS(id, data);
                toast({ title: "Centro de Coste Actualizado" });
            } else {
                await addCostCenterFS(data);
                toast({ title: "Centro de Coste Creado" });
            }
            refreshDataSignature();
            setIsDialogOpen(false);
        } catch (error: any) {
            toast({ title: "Error al Guardar", description: error.message, variant: "destructive" });
        }
    };
    
    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                    <Waypoints className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-headline font-semibold">Gestión de Centros de Coste</h1>
                </div>
                <Button onClick={handleAddNew} disabled={isLoading}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Centro de Coste
                </Button>
            </header>
            
            <Card>
                <CardHeader>
                    <CardTitle>Listado de Centros de Coste</CardTitle>
                    <CardDescription>Crea, edita y gestiona los centros de coste para la imputación de gastos en contabilidad analítica.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {costCenters.length > 0 ? costCenters.map(center => (
                                    <TableRow key={center.id}>
                                        <TableCell className="font-medium">{center.name}</TableCell>
                                        <TableCell>{center.type}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(center)}><Edit className="mr-2 h-4 w-4"/>Editar</Button>
                                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(center)}><Trash2 className="mr-2 h-4 w-4"/>Eliminar</Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={3} className="text-center h-24">No hay centros de coste definidos.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <CostCenterDialog 
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={handleSave}
                center={editingCenter}
            />

            <AlertDialog open={!!centerToDelete} onOpenChange={(open) => !open && setCenterToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción es irreversible y eliminará el centro de coste "{centerToDelete?.name}".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} variant="destructive">Sí, eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
