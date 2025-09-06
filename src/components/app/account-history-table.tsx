
"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { Order } from "@/types";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { Send, CheckCircle, Eye, FileText, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { getInteractionType } from '@/lib/interaction-utils';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InteractionEditor } from "./interaction-inline-form";
import { saveInteractionFS } from "@/services/interaction-service";
import { useToast } from "@/hooks/use-toast";

interface AccountHistoryTableProps {
  interactions: Order[];
}

export default function AccountHistoryTable({ interactions }: AccountHistoryTableProps) {
  const { userRole, teamMember, refreshDataSignature } = useAuth();
  const { toast } = useToast();

  const handleSaveInteraction = async (accountId: string, data: any) => {
    if (!teamMember) return;
    try {
        await saveInteractionFS(accountId, undefined, data, teamMember.id, teamMember.name);
        toast({ title: "Interacción Guardada", description: "Se ha registrado la nueva interacción." });
        refreshDataSignature();
    } catch (error: any) {
        toast({ title: "Error", description: `No se pudo guardar la interacción: ${error.message}`, variant: "destructive" });
    }
  };

  if (!interactions) {
    return <div className="text-center text-sm text-muted-foreground p-4">No hay historial de interacciones para esta cuenta.</div>;
  }
  
  const accountId = interactions[0]?.accountId;

  return (
    <div className="p-2 bg-muted/20">
        <div className="max-h-64 overflow-y-auto">
            <Table>
                <TableBody>
                    {interactions.length > 0 ? (
                      interactions.slice(0, 10).map(interaction => {
                        const isOpenTask = ['Programada', 'Seguimiento'].includes(interaction.status);
                        const canRegisterResult = userRole === 'Admin' || (userRole === 'SalesRep' && teamMember?.name === interaction.salesRep) || (userRole === 'Clavadista' && interaction.clavadistaId === teamMember?.id);

                        return (
                            <TableRow key={interaction.id} className="text-xs">
                                <TableCell className="py-1.5 px-2 w-[20%] font-medium truncate" title={interaction.clientName}>
                                    {/* Empty cell for alignment with Account Name */}
                                </TableCell>
                                 <TableCell className="py-1.5 px-2 w-[15%] truncate" title={interaction.salesRep}>
                                    {interaction.salesRep}
                                </TableCell>
                                <TableCell className="py-1.5 px-2 w-[20%]">
                                     <p className="truncate" title={getInteractionType(interaction)}>{getInteractionType(interaction)}</p>
                                     <p className="text-muted-foreground/80">{isValid(parseISO(interaction.createdAt)) ? format(parseISO(interaction.createdAt), "dd MMM yyyy", { locale: es }) : 'N/D'}</p>
                                </TableCell>
                                <TableCell className="py-1.5 px-2 w-[15%]">
                                    {/* Placeholder for next action */}
                                </TableCell>
                                <TableCell className="py-1.5 px-2 w-[10%] text-right">
                                    <FormattedNumericValue value={interaction.value} options={{style: 'currency', currency: 'EUR'}} placeholder="—" />
                                </TableCell>
                                 <TableCell className="py-1.5 px-2 w-[10%] text-center">
                                    <StatusBadge type="order" status={interaction.status} />
                                </TableCell>
                                <TableCell className="text-right py-1.5 px-2 w-[10%]">
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
                    })
                    ) : (
                        <TableRow><TableCell colSpan={7} className="h-16 text-center">No hay interacciones registradas.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
        {interactions.length > 10 && <p className="text-center text-xs text-muted-foreground mt-2">Mostrando las 10 interacciones más recientes.</p>}
        {accountId && (
             <div className="flex gap-2 pt-3 mt-2 border-t">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4"/>Registrar Interacción</Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-96">
                        <InteractionEditor account={{ id: accountId }} onSave={handleSaveInteraction} />
                    </PopoverContent>
                </Popover>
                <Button variant="secondary" size="sm" asChild>
                    <Link href={`/order-form?accountId=${accountId}`}>
                        <FileText className="mr-2 h-4 w-4"/>Completar Datos
                    </Link>
                </Button>
            </div>
        )}
    </div>
  );
}
