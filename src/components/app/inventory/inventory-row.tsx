
"use client";

import * as React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { ChevronDown, Edit, MoreHorizontal, Trash2, AlertTriangle, Circle } from "lucide-react";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { InventoryItem, ItemBatch } from "@/types";
import { Badge } from "@/components/ui/badge";

interface InventoryRowProps {
  item: InventoryItem & { averageCost: number | null };
  itemBatches: ItemBatch[];
  categoryName: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const QcStatusIndicator = ({ batches }: { batches: ItemBatch[] }) => {
    const statusInfo = React.useMemo(() => {
        const activeBatches = batches.filter(b => b.qtyRemaining > 0);
        if (!activeBatches || activeBatches.length === 0) {
            return { text: "N/D", className: "bg-gray-100 text-gray-800", tooltip: "Sin lotes con stock." };
        }
        if (activeBatches.some(b => b.qcStatus === 'Pending')) {
            return { text: "Pendiente", className: "bg-orange-100 text-orange-800 border-orange-200", tooltip: "Al menos un lote está pendiente de revisión." };
        }
        if (activeBatches.every(b => b.qcStatus === 'Released' || b.qcStatus === 'Rejected')) {
            return { text: "Liberado", className: "bg-green-100 text-green-800 border-green-200", tooltip: "Todos los lotes con stock están revisados." };
        }
        return { text: "N/D", className: "bg-gray-100 text-gray-800", tooltip: "Estado de calidad mixto." };
    }, [batches]);
    
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <Badge variant="outline" className={cn("font-semibold", statusInfo.className)}>
                        {statusInfo.text}
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{statusInfo.tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};


export const InventoryRow: React.FC<InventoryRowProps> = ({ item, itemBatches, categoryName, isExpanded, onToggleExpand, onEdit, onDelete }) => {
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const canExpand = itemBatches.length > 0;
  const isLowStock = typeof item.safetyStock === 'number' && item.stock <= item.safetyStock;

  return (
    <TableRow data-state={isExpanded ? "selected" : ""} className="table-row-std">
      <TableCell className="table-cell-std w-[5%]">
        {canExpand && (
          <Button variant="ghost" size="icon" onClick={onToggleExpand} aria-label={isExpanded ? "Colapsar lotes" : "Expandir lotes"} className="h-8 w-8">
            <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
          </Button>
        )}
      </TableCell>
      <TableCell className="table-cell-std w-[25%] table-cell-main-text">{item.name}</TableCell>
      <TableCell className="table-cell-std w-[15%] text-xs text-muted-foreground">{item.sku || 'N/A'}</TableCell>
      <TableCell className="table-cell-std w-[15%]">{categoryName}</TableCell>
      <TableCell className="table-cell-std w-[10%] text-right font-bold">
        <div className={cn("flex items-center justify-end gap-1.5", isLowStock && "text-destructive")}>
          {isLowStock && <AlertTriangle className="h-4 w-4" />}
          <FormattedNumericValue value={item.stock} />
        </div>
      </TableCell>
      <TableCell className="table-cell-std w-[10%] text-right">
        <FormattedNumericValue 
          value={item.averageCost} 
          locale="es-ES" 
          options={{ style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 4 }} 
          placeholder="N/D"
        />
      </TableCell>
      <TableCell className="table-cell-std w-[10%] text-center">
          <QcStatusIndicator batches={itemBatches} />
      </TableCell>
      <TableCell className="table-cell-std w-[10%] text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Abrir menú</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}><Edit className="mr-2 h-4 w-4" /> Editar Artículo</DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
              <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4" /> Eliminar Artículo</DropdownMenuItem></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente el artículo: <br /><strong className="mt-2 block">"{item.name}"</strong></AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={onDelete} variant="destructive">Sí, eliminar</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};
