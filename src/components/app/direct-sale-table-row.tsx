
"use client";

import * as React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { MoreHorizontal, Eye, Edit, Trash2, ChevronRight, ChevronDown, RefreshCw, Printer, FileText } from "lucide-react";
import type { DirectSale, DirectSaleStatus, PaidStatus } from "@/types";
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Link from 'next/link';

const directSaleStatusList: DirectSaleStatus[] = ['borrador', 'confirmado', 'enviado', 'entregado', 'facturado', 'pagado', 'cancelado', 'en depósito'];
const paidStatusList: PaidStatus[] = ['Pendiente', 'Pagado', 'Parcial'];

interface DirectSaleTableRowProps {
  sale: DirectSale & { regularizations: DirectSale[] };
  onViewOrEditClick: (sale: DirectSale) => void;
  onRegularizeClick: (sale: DirectSale) => void;
  onDeleteSale: (sale: DirectSale) => void;
  onChangeStatus: (saleId: string, newStatus: DirectSaleStatus) => void;
  onChangePaidStatus: (saleId: string, newStatus: PaidStatus) => void;
  onPrintDeliveryNote: (sale: DirectSale) => void;
  onPrintInvoice: (sale: DirectSale) => void;
}

export function DirectSaleTableRow({ sale, onViewOrEditClick, onRegularizeClick, onDeleteSale, onChangeStatus, onChangePaidStatus, onPrintDeliveryNote, onPrintInvoice }: DirectSaleTableRowProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const hasRegularizations = sale.regularizations && sale.regularizations.length > 0;
  const canChangeStatus = sale.status !== 'cancelado' && sale.status !== 'pagado';
  const canChangePaidStatus = sale.paidStatus !== 'Pagado';

  return (
    <>
      <TableRow className="table-row-std" data-state={isExpanded ? "selected" : ""}>
        <TableCell className="w-[1%] p-1">
            {hasRegularizations && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsExpanded(!isExpanded)}>
                    <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                </Button>
            )}
        </TableCell>
        <TableCell className="table-cell-std font-mono text-xs">{sale.id.substring(0, 8)}...</TableCell>
        <TableCell className="table-cell-main-text">
            {sale.customerId ? (
                <Link href={`/accounts/${sale.customerId}`} className="hover:underline text-primary">
                    {sale.customerName}
                </Link>
            ) : (
                sale.customerName
            )}
        </TableCell>
        <TableCell className="table-cell-std">{sale.issueDate && isValid(parseISO(sale.issueDate)) ? format(parseISO(sale.issueDate), "dd/MM/yy", { locale: es }) : 'N/D'}</TableCell>
        
        <TableCell className="table-cell-std">
            <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={!canChangeStatus}>
                    <Button variant="ghost" className="p-0 h-auto">
                        <StatusBadge type="directSale" status={sale.status} className={canChangeStatus ? "cursor-pointer" : ""} />
                        {canChangeStatus && <ChevronDown className="ml-1 h-3 w-3 opacity-70" />}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuRadioGroup value={sale.status} onValueChange={(v) => onChangeStatus(sale.id, v as DirectSaleStatus)}>
                        {directSaleStatusList.map(s => <DropdownMenuRadioItem key={s} value={s}>{s}</DropdownMenuRadioItem>)}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </TableCell>
        
        <TableCell className="table-cell-std">
             <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={!canChangePaidStatus}>
                    <Button variant="ghost" className="p-0 h-auto">
                        <StatusBadge type="payment" status={sale.paidStatus || 'Pendiente'} className={canChangePaidStatus ? "cursor-pointer" : ""} />
                        {canChangePaidStatus && <ChevronDown className="ml-1 h-3 w-3 opacity-70" />}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuRadioGroup value={sale.paidStatus || 'Pendiente'} onValueChange={(v) => onChangePaidStatus(sale.id, v as PaidStatus)}>
                        {paidStatusList.map(s => <DropdownMenuRadioItem key={s} value={s}>{s}</DropdownMenuRadioItem>)}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </TableCell>

        <TableCell className="table-cell-std text-right">
          <FormattedNumericValue value={sale.totalAmount} options={{ style: 'currency', currency: 'EUR' }} />
        </TableCell>
        <TableCell className="table-cell-std text-right">
          {sale.status === 'en depósito' && (
            <Button size="sm" onClick={() => onRegularizeClick(sale)} className="mr-2 bg-amber-500 hover:bg-amber-600 text-amber-950">
              <RefreshCw className="mr-2 h-4 w-4" /> Regularizar
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onViewOrEditClick(sale)}>
                <Eye className="mr-2 h-4 w-4" /> Ver/Editar Detalles
              </DropdownMenuItem>
              <DropdownMenuSeparator />
               <DropdownMenuItem onSelect={() => onPrintDeliveryNote(sale)}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir Albarán
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onPrintInvoice(sale)}>
                <FileText className="mr-2 h-4 w-4" /> Imprimir Factura
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onSelect={() => onDeleteSale(sale)}
                >
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar Pedido
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {isExpanded && hasRegularizations && sale.regularizations.map(reg => (
        <TableRow key={reg.id} className="bg-muted/30 hover:bg-muted/50">
            <TableCell></TableCell>
            <TableCell className="pl-8 text-muted-foreground font-mono text-xs">{reg.id.substring(0,8)}...</TableCell>
            <TableCell className="text-muted-foreground">{reg.customerName}</TableCell>
            <TableCell className="text-muted-foreground">{reg.issueDate && isValid(parseISO(reg.issueDate)) ? format(parseISO(reg.issueDate), "dd/MM/yy") : 'N/D'}</TableCell>
            <TableCell><StatusBadge type="directSale" status={reg.status} /></TableCell>
            <TableCell><StatusBadge type="payment" status={reg.paidStatus || 'Pendiente'} /></TableCell>
            <TableCell className="text-right text-muted-foreground">
                <FormattedNumericValue value={reg.totalAmount} options={{ style: 'currency', currency: 'EUR' }} />
            </TableCell>
            <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onViewOrEditClick(reg)}>Ver</Button>
            </TableCell>
        </TableRow>
      ))}
    </>
  );
}
