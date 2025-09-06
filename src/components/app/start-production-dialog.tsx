
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { Loader2 } from "lucide-react";
import type { ProductionRun, ConsumptionPlanItem } from "@/types";
import { Input } from "@/components/ui/input";

interface StartProductionDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (actualConsumption: ConsumptionPlanItem[]) => void;
    run: ProductionRun | null;
    consumptionPlan: ConsumptionPlanItem[] | null;
    isLoading: boolean;
}

export default function StartProductionDialog({
    isOpen,
    onOpenChange,
    onConfirm,
    run,
    consumptionPlan,
    isLoading,
}: StartProductionDialogProps) {
    const [isCleaningConfirmed, setIsCleaningConfirmed] = React.useState(false);
    const [actualPlan, setActualPlan] = React.useState<ConsumptionPlanItem[]>([]);
    
    React.useEffect(() => {
        if (isOpen) {
            setIsCleaningConfirmed(false);
            setActualPlan(consumptionPlan || []);
        }
    }, [isOpen, consumptionPlan]);
    
    const handleQuantityChange = (index: number, newQuantityStr: string) => {
        const newQuantity = parseFloat(newQuantityStr);
        if (!isNaN(newQuantity)) {
            const updatedPlan = [...actualPlan];
            updatedPlan[index] = { ...updatedPlan[index], quantityToConsume: newQuantity };
            setActualPlan(updatedPlan);
        } else {
            const updatedPlan = [...actualPlan];
            updatedPlan[index] = { ...updatedPlan[index], quantityToConsume: 0 };
            setActualPlan(updatedPlan);
        }
    };
    
    const handleConfirmClick = () => {
        if (!isCleaningConfirmed) return;
        onConfirm(actualPlan);
    };

    if (!run) return null;

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent className="sm:max-w-3xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Inicio de Producción</AlertDialogTitle>
                    <AlertDialogDescription>
                        Vas a iniciar la orden <strong>{run.opCode}</strong> para fabricar <strong><FormattedNumericValue value={run.qtyPlanned} /></strong> unidades de <strong>{run.productName}</strong>.
                        <br/>
                        Esto consumirá el stock de los lotes especificados. Revisa y ajusta las cantidades si es necesario. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                
                <div className="py-4">
                    <h4 className="font-semibold mb-2">Plan de Consumo</h4>
                    {actualPlan && actualPlan.length > 0 ? (
                        <ScrollArea className="h-64 border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Componente</TableHead>
                                        <TableHead>Lote a Usar</TableHead>
                                        <TableHead className="text-right">Planificado</TableHead>
                                        <TableHead className="w-32 text-right">Real a Usar</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {consumptionPlan?.map((item, index) => (
                                        <TableRow key={item.componentId + item.batchInternalCode}>
                                            <TableCell>{item.componentName}</TableCell>
                                            <TableCell className="font-mono text-xs">{item.batchInternalCode}</TableCell>
                                            <TableCell className="text-right"><FormattedNumericValue value={item.quantityToConsume} /> {item.uom}</TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                  type="number"
                                                  step="any"
                                                  value={actualPlan[index]?.quantityToConsume || ''}
                                                  onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                  className="h-8 text-right"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    ) : (
                        <div className="h-48 flex items-center justify-center border rounded-md bg-muted">
                            <p className="text-muted-foreground">No se ha podido determinar el plan de consumo.</p>
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox id="cleaning-check" checked={isCleaningConfirmed} onCheckedChange={(checked) => setIsCleaningConfirmed(!!checked)} />
                    <Label htmlFor="cleaning-check" className="font-medium text-destructive">
                        Confirmo que la línea/tanque de producción está limpia y preparada.
                    </Label>
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmClick} disabled={!isCleaningConfirmed || isLoading}>
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Iniciando...</>
                        ) : "Confirmar e Iniciar"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
