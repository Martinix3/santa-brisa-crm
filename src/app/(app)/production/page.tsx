
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { ProductionRun, InventoryItem } from "@/types";
import { PlusCircle, Edit, Trash2, MoreHorizontal, Cog, Loader2, CheckCircle, XCircle, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import ProductionRunDialog from "@/components/app/production-run-dialog";
import type { ProductionRunFormValues } from "@/components/app/production-run-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getProductionRunsFS, addProductionRunFS, updateProductionRunFS, deleteProductionRunFS, closeProductionRunFS } from "@/services/production-run-service";
import { getInventoryItemsFS } from "@/services/inventory-item-service";
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { format, parseISO, addMonths } from "date-fns";
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function ProductionPage() {
  const { toast } = useToast();
  
  const [runs, setRuns] = React.useState<ProductionRun[]>([]);
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [editingRun, setEditingRun] = React.useState<ProductionRun | null>(null);
  const [runToFinalize, setRunToFinalize] = React.useState<ProductionRun | null>(null);
  const [finalizeQty, setFinalizeQty] = React.useState<number>(0);
  const [finalizeExpiryDate, setFinalizeExpiryDate] = React.useState<Date | undefined>();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [runToDelete, setRunToDelete] = React.useState<ProductionRun | null>(null);
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const fetchRuns = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedRuns, fetchedItems] = await Promise.all([getProductionRunsFS(), getInventoryItemsFS()]);
      setRuns(fetchedRuns);
      setInventoryItems(fetchedItems);
    } catch (error) {
      console.error("Error fetching production runs:", error);
      toast({ title: "Error al Cargar Datos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const toggleRowExpansion = (runId: string) => {
    setExpandedRows(prev => {
        const newSet = new Set(prev);
        if (newSet.has(runId)) {
            newSet.delete(runId);
        } else {
            newSet.add(runId);
        }
        return newSet;
    });
  };

  const handleAddNewRun = () => {
    setEditingRun(null);
    setIsDialogOpen(true);
  };

  const handleEditRun = (run: ProductionRun) => {
    setEditingRun(run);
    setIsDialogOpen(true);
  };
  
  const handleSaveRun = async (data: ProductionRunFormValues, runId?: string) => {
    setIsLoading(true);
    try {
      if (runId) {
        await updateProductionRunFS(runId, data);
        toast({ title: "Orden Actualizada" });
      } else {
        await addProductionRunFS(data);
        toast({ title: "Orden Añadida" });
      }
      fetchRuns();
    } catch (error: any) {
      console.error("Error saving production run:", error);
      toast({ title: "Error al Guardar", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
    }
  };

  const handleDeleteRun = (run: ProductionRun) => {
    setRunToDelete(run);
  };

  const confirmDeleteRun = async () => {
    if (!runToDelete) return;
    setIsLoading(true);
    try {
      await deleteProductionRunFS(runToDelete.id);
      fetchRuns();
      toast({ title: "Orden Eliminada", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting production run:", error);
      toast({ title: "Error al Eliminar", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setRunToDelete(null);
    }
  };

  const handleFinalizeRun = async () => {
    if (!runToFinalize || finalizeQty <= 0) return;
    setIsLoading(true);
    try {
      await closeProductionRunFS(runToFinalize.id, finalizeQty, finalizeExpiryDate);
      toast({ title: "Producción Finalizada", description: `Se ha cerrado la orden para ${getItemName(runToFinalize.productSku)}` });
      fetchRuns();
    } catch (error: any) {
      console.error("Error finalizing run:", error);
      toast({ title: "Error al Finalizar", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setRunToFinalize(null);
      setFinalizeExpiryDate(undefined);
    }
  };

  const getItemName = (sku: string) => inventoryItems.find(item => item.sku === sku)?.name || sku;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
            <Cog className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Órdenes de Producción</h1>
        </div>
        <Button onClick={handleAddNewRun} disabled={isLoading}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nueva Orden de Producción
        </Button>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Listado de Producciones</CardTitle>
          <CardDescription>Gestiona y sigue el estado de todas las órdenes de producción.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[5%]"></TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Nº Lote</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Planificado</TableHead>
                  <TableHead>Producido</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.length > 0 ? runs.map(run => {
                  const isExpanded = expandedRows.has(run.id);
                  const canExpand = run.consumedComponents && run.consumedComponents.length > 0;
                  return (
                  <React.Fragment key={run.id}>
                    <TableRow onClick={() => canExpand && toggleRowExpansion(run.id)} className={cn(canExpand && "cursor-pointer")}>
                        <TableCell>
                            {canExpand && (
                                <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                            )}
                        </TableCell>
                        <TableCell className="font-medium">{getItemName(run.productSku)}</TableCell>
                        <TableCell className="font-mono text-xs">{run.batchNumber}</TableCell>
                        <TableCell>{format(parseISO(run.startDate), "dd/MM/yyyy")}</TableCell>
                        <TableCell><FormattedNumericValue value={run.qtyPlanned} /></TableCell>
                        <TableCell><FormattedNumericValue value={run.qtyProduced} /></TableCell>
                        <TableCell><StatusBadge type="production" status={run.status} /></TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {run.status === 'En Progreso' && (
                                <DropdownMenuItem onSelect={() => { setRunToFinalize(run); setFinalizeQty(run.qtyPlanned); setFinalizeExpiryDate(addMonths(new Date(), 18)); }}>
                                  <CheckCircle className="mr-2 h-4 w-4" /> Finalizar Producción
                                </DropdownMenuItem>
                              )}
                              {run.status === 'Borrador' && (
                                <>
                                  <DropdownMenuItem onSelect={() => handleEditRun(run)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => updateProductionRunFS(run.id, { status: 'En Progreso' }).then(fetchRuns)}>
                                    <Cog className="mr-2 h-4 w-4" /> Iniciar Producción
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(run.status === 'Borrador' || run.status === 'Cancelada') && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onSelect={() => handleDeleteRun(run)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                                </>
                              )}
                              {run.status === 'En Progreso' && (
                                <DropdownMenuItem onSelect={() => updateProductionRunFS(run.id, { status: 'Cancelada' }).then(fetchRuns)} className="text-destructive"><XCircle className="mr-2 h-4 w-4" /> Cancelar</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    {isExpanded && canExpand && (
                      <TableRow>
                          <TableCell colSpan={8} className="p-0 bg-muted/30">
                              <div className="p-4">
                                  <h4 className="font-semibold text-sm mb-2">Componentes Consumidos</h4>
                                  <Table>
                                      <TableHeader><TableRow><TableHead>Componente</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead>Lote Proveedor</TableHead></TableRow></TableHeader>
                                      <TableBody>
                                          {run.consumedComponents.map((comp, index) => (
                                              <TableRow key={`${run.id}-${index}`}>
                                                  <TableCell>{comp.componentName}</TableCell>
                                                  <TableCell>{comp.componentSku || 'N/A'}</TableCell>
                                                  <TableCell className="text-right"><FormattedNumericValue value={comp.quantity} /></TableCell>
                                                  <TableCell className="font-mono text-xs">{comp.supplierBatchCode || comp.batchId}</TableCell>
                                              </TableRow>
                                          ))}
                                      </TableBody>
                                  </Table>
                              </div>
                          </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                  );
                }) : (
                  <TableRow><TableCell colSpan={8} className="text-center h-24">No hay órdenes de producción.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ProductionRunDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveRun}
        productionRun={editingRun}
        inventoryItems={inventoryItems}
      />

      {runToDelete && (
        <AlertDialog open={!!runToDelete} onOpenChange={() => setRunToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>La orden de producción se eliminará permanentemente.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteRun} variant="destructive">Eliminar</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {runToFinalize && (
        <AlertDialog open={!!runToFinalize} onOpenChange={() => setRunToFinalize(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finalizar Producción</AlertDialogTitle>
              <AlertDialogDescription>Introduce la cantidad final producida y la fecha de caducidad para {getItemName(runToFinalize.productSku)}.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label htmlFor="finalize-qty">Cantidad Producida</Label>
                <Input id="finalize-qty" type="number" value={finalizeQty} onChange={e => setFinalizeQty(Number(e.target.value))} className="w-full mt-1" />
              </div>
               <div>
                  <Label>Fecha de Caducidad</Label>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal mt-1", !finalizeExpiryDate && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {finalizeExpiryDate ? format(finalizeExpiryDate, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={finalizeExpiryDate} onSelect={setFinalizeExpiryDate} initialFocus locale={es} />
                      </PopoverContent>
                  </Popover>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleFinalizeRun} disabled={finalizeQty <= 0 || !finalizeExpiryDate}>Confirmar y Cerrar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
