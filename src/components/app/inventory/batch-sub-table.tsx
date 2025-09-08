
"use client";

import * as React from "react";
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import type { ItemBatch } from "@/types";
import { Edit, CheckCircle, XCircle, History, EyeOff } from "lucide-react";
import { EstadoQC as QcStatus } from "@ssot";

interface BatchSubTableProps {
  batches: ItemBatch[];
  onEditBatch: (batch: ItemBatch) => void;
  onQuickUpdateBatchStatus: (batchId: string, newStatus: QcStatus) => void;
}

export const BatchSubTable: React.FC<BatchSubTableProps> = ({ batches, onEditBatch, onQuickUpdateBatchStatus }) => {
  const [showDepleted, setShowDepleted] = React.useState(false);

  const activeBatches = batches.filter(b => b.qtyRemaining > 0);
  const depletedBatches = batches.filter(b => b.qtyRemaining <= 0);

  const renderBatchRow = (batch: ItemBatch) => {
    const daysToExpiry = batch.expiryDate ? differenceInDays(parseISO(batch.expiryDate), new Date()) : null;
    const isNearExpiry = daysToExpiry !== null && daysToExpiry <= 90 && daysToExpiry > 0;
    const isExpired = daysToExpiry !== null && daysToExpiry <= 0;
    const isDepleted = batch.qtyRemaining <= 0;

    const rowClass = 
      isDepleted ? 'opacity-50' :
      batch.qcStatus === 'Rejected' ? 'bg-red-50/50' : 
      batch.qcStatus === 'Pending' ? 'bg-yellow-50/50' : 
      isExpired ? 'bg-red-50/50' :
      isNearExpiry ? 'bg-orange-50/50' :
      '';

    return (
        <TableRow key={batch.id} className={cn("text-xs", rowClass)}>
            <TableCell className="font-mono">{batch.internalBatchCode || batch.supplierBatchCode}</TableCell>
            <TableCell className="text-right"><FormattedNumericValue value={batch.qtyRemaining} /></TableCell>
            <TableCell className="text-right"><FormattedNumericValue value={batch.unitCost} options={{ style: 'currency', currency: 'EUR' }} /></TableCell>
            <TableCell className={cn(isExpired && "text-red-600 font-bold", isNearExpiry && "text-orange-600 font-semibold")}>
                {batch.expiryDate ? format(parseISO(batch.expiryDate), 'dd/MM/yyyy', { locale: es }) : 'N/D'}
            </TableCell>
            <TableCell><StatusBadge type="qc" status={batch.qcStatus} /></TableCell>
            <TableCell className="text-right space-x-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:bg-green-100 hover:text-green-700" onClick={() => onQuickUpdateBatchStatus(batch.id, 'Released')} aria-label="Liberar lote">
                    <CheckCircle size={16} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-100 hover:text-red-700" onClick={() => onQuickUpdateBatchStatus(batch.id, 'Rejected')} aria-label="Rechazar lote">
                    <XCircle size={16} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditBatch(batch)} aria-label="Editar lote">
                    <Edit size={16} />
                </Button>
            </TableCell>
        </TableRow>
    );
  };

  return (
    <div className="p-4 bg-muted/30">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-sm">Desglose de Lotes</h4>
        {depletedBatches.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowDepleted(!showDepleted)}>
            {showDepleted ? (
                <><EyeOff className="mr-2 h-4 w-4"/> Ocultar agotados</>
            ) : (
                <><History className="mr-2 h-4 w-4"/> Mostrar {depletedBatches.length} agotado(s)</>
            )}
          </Button>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lote Interno/Proveedor</TableHead>
            <TableHead className="text-right">Cant. Restante</TableHead>
            <TableHead className="text-right">Coste Unitario</TableHead>
            <TableHead>Fecha Caducidad</TableHead>
            <TableHead>Estado QC</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeBatches.map(renderBatchRow)}
          {showDepleted && depletedBatches.map(renderBatchRow)}
          {batches.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center h-16">No hay lotes para este artículo.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
