"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { ProductionRun, InventoryItem, BomLine, Tank, Shortage, ProductionRunFormValues, ConsumptionPlanItem, FinishProductionRunFormValues } from "@/types";
import { PlusCircle, Edit, Trash2, MoreHorizontal, Cog, Loader2, AlertTriangle, Play, Pause, RefreshCcw, CheckCircle } from "lucide-react";
import ProductionRunDialog from "@/components/app/production-run-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getProductionRunsFS, addProductionRunFS, updateProductionRunFS, deleteProductionRunFS, startProductionRunFS, pauseProductionRunFS, resumeProductionRunFS, closeProductionRunFS } from "@/services/production-run-service";
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import { getInventoryItemsFS } from "@/services/inventory-item-service";
import { getBomLinesFS } from "@/services/bom-service";
import { getTanksFS } from "@/services/tank-service";
import { useAuth } from "@/contexts/auth-context";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import StartProductionDialog from "@/components/app/start-production-dialog";
import { planBatchConsumption } from "@/services/batch-service";
import FinishProductionDialog from "@/components/app/finish-production-dialog";


export default function ProductionPage() {
  const { toast } = useToast();
  const { teamMember, dataSignature, refreshDataSignature } = useAuth();
  
  const [runs, setRuns] = React.useState<ProductionRun[]>([]);
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItem[]>([]);
  const [bomLines, setBomLines] = React.useState<BomLine[]>([]);
  const [tanks, setTanks] = React.useState<Tank[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [editingRun, setEditingRun] = React.useState<ProductionRun | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [runToDelete, setRunToDelete] = React.useState<ProductionRun | null>(null);
  const [actionInProgress, setActionInProgress] = React.useState<string | null>(null);

  const [runToStart, setRunToStart] = React.useState<ProductionRun | null>(null);
  const [isStartDialogOpen, setIsStartDialogOpen] = React.useState(false);
  const [consumptionPlan, setConsumptionPlan] = React.useState<ConsumptionPlanItem[] | null>(null);
  const [isCalculatingPlan, setIsCalculatingPlan] = React.useState<string | null>(null);

  const [runToFinish, setRunToFinish] = React.useState<ProductionRun | null>(null);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = React.useState(false);


  const fetchRuns = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedRuns, fetchedItems, fetchedBoms, fetchedTanks] = await Promise.all([
          getProductionRunsFS(),
          getInventoryItemsFS(),
          getBomLinesFS(),
          getTanksFS(),
      ]);
      setRuns(fetchedRuns);
      setInventoryItems(fetchedItems);
      setBomLines(fetchedBoms);
      setTanks(fetchedTanks);
    } catch (error) {
      console.error("Error fetching production data:", error);
      toast({ title: "Error al Cargar Datos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchRuns();
  }, [fetchRuns, dataSignature]);

  const handleAddNewRun = () => {
    setEditingRun(null);
    setIsDialogOpen(true);
  };

  const handleEditRun = (run: ProductionRun) => {
    setEditingRun(run);
    setIsDialogOpen(true);
  };
  
  const handleSaveRun = async (data: ProductionRunFormValues, runId?: string) => {
    setActionInProgress('saving');
    try {
        if (runId) {
            await updateProductionRunFS(runId, data);
            toast({ title: "Próximamente", description: "La edición de órdenes estará disponible en futuras fases."});
        } else {
            await addProductionRunFS(data);
            toast({ title: "Orden de Producción Creada", description: "La nueva orden se ha guardado como borrador."});
        }
        refreshDataSignature();
        setIsDialogOpen(false);
    } catch(error: any) {
        toast({ title: "Error al Guardar", description: error.message, variant: "destructive"});
    } finally {
        setActionInProgress(null);
    }
  };

  const handleDeleteRun = (run: ProductionRun) => {
    // Check for run.status has been removed to allow deleting any run.
    setRunToDelete(run);
  };

  const confirmDeleteRun = async () => {
    if (!runToDelete) return;
    setActionInProgress(runToDelete.id);
    try {
        await deleteProductionRunFS(runToDelete.id);
        toast({ title: "Orden Eliminada", variant: "destructive"});
        refreshDataSignature();
    } catch(error: any) {
        toast({ title: "Error al Eliminar", description: error.message, variant: "destructive"});
    } finally {
        setActionInProgress(null);
        setRunToDelete(null);
    }
  };

  const handlePrepareAndStartRun = async (run: ProductionRun) => {
    if (run.shortages.length > 0) {
        toast({ title: "Faltan Componentes", description: "No se puede iniciar la orden porque hay escasez de material.", variant: "destructive" });
        return;
    }
    setIsCalculatingPlan(run.id);
    try {
        const productBom = bomLines.filter(bom => bom.productSku === run.productSku);
        if (productBom.length === 0) {
            throw new Error(`No se encontró receta (BOM) para el producto SKU: ${run.productSku}`);
        }

        const allConsumptionPlans = await Promise.all(productBom.map(async (line) => {
            const qtyToConsume = line.quantity * run.qtyPlanned;
            const planItems = await planBatchConsumption(line.componentId, qtyToConsume, line.componentName);
            return planItems.map(plan => ({
                componentId: line.componentId,
                componentName: line.componentName,
                componentSku: line.componentSku,
                uom: line.uom,
                quantityToConsume: plan.quantity,
                batchId: plan.batchId,
                batchInternalCode: plan.batchData.internalBatchCode,
                unitCost: plan.batchData.unitCost,
                supplierBatchCode: plan.batchData.supplierBatchCode,
                batchData: plan.batchData, // Ensure the full batch data is passed
            }));
        }));
        const flatPlan: ConsumptionPlanItem[] = allConsumptionPlans.flat();

        setConsumptionPlan(flatPlan);
        setRunToStart(run);
        setIsStartDialogOpen(true);

    } catch (error: any) {
        console.error("Error preparing consumption plan:", error);
        toast({ title: "Error al Preparar", description: `No se pudo preparar la orden: ${error.message}`, variant: "destructive" });
    } finally {
        setIsCalculatingPlan(null);
    }
  };


  const handleStartRun = async (actualConsumption: ConsumptionPlanItem[]) => {
    if (!runToStart || !teamMember) return;
    setActionInProgress(runToStart.id);
    setIsStartDialogOpen(false);
    try {
        await startProductionRunFS(runToStart.id, actualConsumption, teamMember.id);
        toast({ title: "Producción Iniciada", description: "La orden ha comenzado y se ha descontado el stock."});
        refreshDataSignature();
    } catch (error: any) {
        toast({ title: "Error al Iniciar", description: error.message, variant: "destructive" });
    } finally {
        setActionInProgress(null);
        setRunToStart(null);
        setConsumptionPlan(null);
    }
  };
  
  const handlePauseRun = async (runId: string) => {
    setActionInProgress(runId);
    try {
        await pauseProductionRunFS(runId);
        toast({ title: "Producción Pausada", description: "La orden se ha puesto en pausa."});
        refreshDataSignature();
    } catch (error: any) {
        toast({ title: "Error al Pausar", description: error.message, variant: "destructive" });
    } finally {
        setActionInProgress(null);
    }
  };

  const handleResumeRun = async (runId: string) => {
    setActionInProgress(runId);
    try {
        await resumeProductionRunFS(runId);
        toast({ title: "Producción Reanudada", description: "La orden está en curso de nuevo."});
        refreshDataSignature();
    } catch (error: any) {
        toast({ title: "Error al Reanudar", description: error.message, variant: "destructive" });
    } finally {
        setActionInProgress(null);
    }
  };

  const handlePrepareToFinishRun = (run: ProductionRun) => {
      setRunToFinish(run);
      setIsFinishDialogOpen(true);
  };
  
  const handleConfirmFinishRun = async (data: FinishProductionRunFormValues) => {
      if (!runToFinish || !teamMember) return;
      setActionInProgress(runToFinish.id);
      setIsFinishDialogOpen(false);
      try {
          await closeProductionRunFS(runToFinish.id, data, teamMember.id);
          toast({ title: "Producción Finalizada", description: "La orden ha sido completada y el stock actualizado." });
          refreshDataSignature();
      } catch (error: any) {
          toast({ title: "Error al Finalizar", description: error.message, variant: "destructive" });
      } finally {
          setActionInProgress(null);
          setRunToFinish(null);
      }
  };
  
  
  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
            <Cog className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Órdenes de Producción</h1>
        </div>
        <Button onClick={handleAddNewRun} disabled={isLoading}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nueva Orden de Producción
        </Button>
      </header>
      
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>Listado de Producciones</CardTitle>
          <CardDescription>Planifica y sigue el estado de todas las órdenes de producción, tanto de mezcla como de embotellado.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-header-std">OP Code</TableHead>
                  <TableHead className="table-header-std">Producto</TableHead>
                  <TableHead className="table-header-std">Tipo</TableHead>
                  <TableHead className="table-header-std">Línea/Tanque</TableHead>
                  <TableHead className="table-header-std">Fecha Planificada</TableHead>
                  <TableHead className="table-header-std text-right">Planificado / Real</TableHead>
                  <TableHead className="table-header-std">Estado</TableHead>
                  <TableHead className="table-header-std text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.length > 0 ? runs.map(run => (
                  <TableRow key={run.id} className={run.shortages?.length > 0 ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                      <TableCell className="table-cell-std font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            {run.opCode}
                            {run.shortages?.length > 0 && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Esta orden tiene {run.shortages.length} componente(s) con stock insuficiente.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                          </div>
                      </TableCell>
                      <TableCell className="table-cell-std font-medium">{run.productName}</TableCell>
                      <TableCell className="table-cell-std">{run.type}</TableCell>
                      <TableCell className="table-cell-std">{run.lineId}{run.tankId ? ` / ${run.tankId}`: ''}</TableCell>
                      <TableCell className="table-cell-std">{format(parseISO(run.startPlanned), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="table-cell-std text-right">
                        <FormattedNumericValue value={run.qtyPlanned} />
                        {run.qtyActual !== undefined && ` / ${run.qtyActual.toLocaleString('es-ES')}`}
                      </TableCell>
                      <TableCell className="table-cell-std"><StatusBadge type="production" status={run.status} /></TableCell>
                      <TableCell className="table-cell-std text-right">
                        {actionInProgress === run.id || isCalculatingPlan === run.id ? (<Loader2 className="h-4 w-4 animate-spin ml-auto"/>) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {run.status === 'Draft' && (
                                    <DropdownMenuItem onSelect={() => handlePrepareAndStartRun(run)} disabled={run.shortages.length > 0 || !!isCalculatingPlan}>
                                        <Play className="mr-2 h-4 w-4" /> 
                                        Iniciar Producción
                                    </DropdownMenuItem>
                                )}
                                {(run.status === 'En curso' || run.status === 'Pausada') && (
                                     <DropdownMenuItem onSelect={() => handlePrepareToFinishRun(run)}>
                                        <CheckCircle className="mr-2 h-4 w-4" /> Finalizar Producción
                                    </DropdownMenuItem>
                                )}
                                {run.status === 'En curso' && (
                                    <DropdownMenuItem onSelect={() => handlePauseRun(run.id)}>
                                        <Pause className="mr-2 h-4 w-4" /> Pausar Producción
                                    </DropdownMenuItem>
                                )}
                                {run.status === 'Pausada' && (
                                    <DropdownMenuItem onSelect={() => handleResumeRun(run.id)}>
                                        <RefreshCcw className="mr-2 h-4 w-4" /> Reanudar Producción
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={() => handleEditRun(run)}>
                                    <Edit className="mr-2 h-4 w-4" /> Editar / Ver Detalles
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog open={!!runToDelete && runToDelete.id === run.id} onOpenChange={(open) => !open && setRunToDelete(null)}>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()} onClick={() => handleDeleteRun(run)}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle><AlertDialogDescription>¿Seguro que quieres eliminar la orden {run.opCode}? Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteRun} variant="destructive">Eliminar</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                      </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={8} className="text-center h-24">No hay órdenes de producción. Haz clic en "Nueva Orden" para empezar.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <ProductionRunDialog
        productionRun={editingRun}
        isOpen={isDialogOpen}
        onOpenChange={(open) => {
            if (!open) setEditingRun(null);
            setIsDialogOpen(open);
        }}
        onSave={handleSaveRun}
        inventoryItems={inventoryItems}
        bomLines={bomLines}
        tanks={tanks}
      />
      
      <StartProductionDialog
        isOpen={isStartDialogOpen}
        onOpenChange={setIsStartDialogOpen}
        onConfirm={handleStartRun}
        run={runToStart}
        consumptionPlan={consumptionPlan}
        isLoading={!!actionInProgress}
      />

      <FinishProductionDialog
        isOpen={isFinishDialogOpen}
        onOpenChange={setIsFinishDialogOpen}
        onConfirm={handleConfirmFinishRun}
        run={runToFinish}
        isLoading={!!actionInProgress}
      />
    </div>
  );
}
