
"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { Order } from "@/types";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { Send, CheckCircle } from "lucide-react";
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
    <div className="p-4 bg-muted/30 border-t-2 border-primary/20">
        <h4 className="font-semibold mb-2 text-base">Historial de Interacciones</h4>
        <div className="max-h-64 overflow-y-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo / Resultado</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Comercial</TableHead>
                        <TableHead>Notas</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {interactions.slice(0, 10).map(interaction => {
                        const isOpenTask = ['Programada', 'Seguimiento'].includes(interaction.status);
                        const canRegisterResult = userRole === 'Admin' || (userRole === 'SalesRep' && teamMember?.name === interaction.salesRep) || (userRole === 'Clavadista' && interaction.clavadistaId === teamMember?.id);

                        return (
                            <TableRow key={interaction.id}>
                                <TableCell>{isValid(parseISO(interaction.createdAt)) ? format(parseISO(interaction.createdAt), "dd/MM/yy HH:mm", { locale: es }) : 'N/D'}</TableCell>
                                <TableCell>{getInteractionType(interaction)}</TableCell>
                                <TableCell><FormattedNumericValue value={interaction.value} options={{style: 'currency', currency: 'EUR'}} placeholder="—" /></TableCell>
                                <TableCell>{interaction.salesRep}</TableCell>
                                <TableCell className="text-xs max-w-[150px] truncate" title={interaction.notes}>{interaction.notes || 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                    {isOpenTask && canRegisterResult ? (
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/order-form?originatingTaskId=${interaction.id}`}>
                                                <Send className="mr-1 h-3 w-3" /> Registrar Resultado
                                            </Link>
                                        </Button>
                                    ) : (
                                       <Button variant="ghost" size="sm" disabled>
                                            <CheckCircle className="mr-1 h-3 w-3 text-green-500" /> Gestionado
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
