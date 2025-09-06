
"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { Order } from "@/types";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { Send, CheckCircle, Eye } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { getInteractionType } from '@/lib/interaction-utils';


interface AccountHistoryTableProps {
  interactions: Order[];
}

export default function AccountHistoryTable({ interactions }: AccountHistoryTableProps) {
  const { userRole, teamMember } = useAuth();

  if (!interactions || interactions.length === 0) {
    return <div className="text-center text-sm text-muted-foreground p-4">No hay historial de interacciones para esta cuenta.</div>;
  }

  return (
    <div className="p-2 bg-muted/20">
        <div className="max-h-64 overflow-y-auto">
            <Table>
                <TableHeader>
                    <TableRow className="text-xs">
                        <TableHead className="w-[20%]">Cuenta</TableHead>
                        <TableHead className="w-[15%]">Responsable</TableHead>
                        <TableHead className="w-[20%]">Interacción</TableHead>
                        <TableHead className="w-[15%]">Próx. Tarea</TableHead>
                        <TableHead className="w-[10%] text-right">Valor</TableHead>
                        <TableHead className="w-[10%] text-center">Estado/Prio</TableHead>
                        <TableHead className="w-[10%] text-right pr-4">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {interactions.slice(0, 10).map(interaction => {
                        const isOpenTask = ['Programada', 'Seguimiento'].includes(interaction.status);
                        const canRegisterResult = userRole === 'Admin' || (userRole === 'SalesRep' && teamMember?.name === interaction.salesRep) || (userRole === 'Clavadista' && interaction.clavadistaId === teamMember?.id);

                        return (
                            <TableRow key={interaction.id} className="text-xs">
                                <TableCell className="py-1.5 px-2 font-medium truncate" title={interaction.clientName}>
                                    {/* Placeholder for account name, data is in parent */}
                                </TableCell>
                                 <TableCell className="py-1.5 px-2 truncate" title={interaction.salesRep}>
                                    {interaction.salesRep}
                                </TableCell>
                                <TableCell className="py-1.5 px-2">
                                     <p className="truncate" title={getInteractionType(interaction)}>{getInteractionType(interaction)}</p>
                                     <p className="text-muted-foreground/80">{isValid(parseISO(interaction.createdAt)) ? format(parseISO(interaction.createdAt), "dd MMM yyyy", { locale: es }) : 'N/D'}</p>
                                </TableCell>
                                <TableCell className="py-1.5 px-2">
                                    {/* Placeholder for next action */}
                                </TableCell>
                                <TableCell className="py-1.5 px-2 text-right">
                                    <FormattedNumericValue value={interaction.value} options={{style: 'currency', currency: 'EUR'}} placeholder="—" />
                                </TableCell>
                                 <TableCell className="py-1.5 px-2 text-center">
                                    <StatusBadge type="order" status={interaction.status} />
                                </TableCell>
                                <TableCell className="text-right py-1.5 px-2">
                                    {isOpenTask && canRegisterResult ? (
                                        <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                                            <Link href={`/order-form?originatingTaskId=${interaction.id}`}>
                                                <Send className="mr-1 h-3 w-3" /> Registrar
                                            </Link>
                                        </Button>
                                    ) : (
                                       <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                            <Link href={`/accounts/${interaction.accountId}`}>
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
        {interactions.length > 10 && <p className="text-center text-xs text-muted-foreground mt-2">Mostrando las 10 interacciones más recientes.</p>}
    </div>
  );
}
