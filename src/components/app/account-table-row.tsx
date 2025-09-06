
"use client";

import * as React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format, isValid, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { ChevronDown, Send } from "lucide-react";
import type { EnrichedAccount, TeamMember } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InteractionDialog } from "../app/interaction-dialog"; 

interface AccountTableRowProps {
  account: EnrichedAccount;
  allTeamMembers: TeamMember[];
  onResponsibleUpdate: (accountId: string, newResponsibleId: string | null) => Promise<void>;
  onDeleteAccount: (account: EnrichedAccount) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const NO_SALES_REP_VALUE = "##NONE##";

export function AccountTableRow({ account, allTeamMembers, onResponsibleUpdate, onDeleteAccount, isExpanded, onToggleExpand }: AccountTableRowProps) {
    const { userRole } = useAuth();
    const isAdmin = userRole === 'Admin';
    const [isInteractionDialogOpen, setIsInteractionDialogOpen] = React.useState(false);

    const salesAndAdminMembers = React.useMemo(() => {
        return allTeamMembers.filter(m => m.role === 'Admin' || m.role === 'SalesRep');
    }, [allTeamMembers]);
    
    const nextActionDate = account.nextInteraction?.status === 'Programada'
        ? (account.nextInteraction.visitDate ? new Date(account.nextInteraction.visitDate) : null)
        : (account.nextInteraction?.nextActionDate ? new Date(account.nextInteraction.nextActionDate) : null);
    
    const lastInteractionDate = account.lastInteractionDate ? new Date(account.lastInteractionDate) : null;
    
    const handleOpenDialog = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsInteractionDialogOpen(true);
    };

    return (
        <>
            <TableRow data-state={isExpanded ? "selected" : ""} onClick={onToggleExpand} className="cursor-pointer">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                     <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                     <Link href={`/accounts/${account.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline text-primary">{account.nombre}</Link>
                  </div>
                   <p className="text-xs text-muted-foreground pl-6">{account.ciudad || 'Ubicación no especificada'}</p>
                </TableCell>
                <TableCell>
                    {isAdmin ? (
                        <Select
                            value={account.responsableId || NO_SALES_REP_VALUE}
                            onValueChange={(value) => onResponsibleUpdate(account.id, value === NO_SALES_REP_VALUE ? null : value)}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <SelectTrigger className="text-xs h-8">
                                <SelectValue placeholder="Asignar..."/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_SALES_REP_VALUE}>Sin Asignar</SelectItem>
                                {salesAndAdminMembers.map(m => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    ) : (
                        account.responsableName || <span className="text-muted-foreground">Sin Asignar</span>
                    )}
                </TableCell>
                <TableCell className="text-xs">
                    <p className="truncate" title={account.lastInteraction?.notes}>{account.lastInteraction?.notes || "Sin interacciones"}</p>
                    {lastInteractionDate && isValid(lastInteractionDate) && <p className="text-muted-foreground/80">{format(lastInteractionDate, "dd MMM yyyy", { locale: es })}</p>}
                </TableCell>
                <TableCell className="text-xs">
                    <p>{account.nextInteraction?.nextActionType || <span className="text-muted-foreground">Ninguna</span>}</p>
                    {nextActionDate && isValid(nextActionDate) && <p className="text-muted-foreground/80">{format(nextActionDate, "dd MMM yyyy", { locale: es })}</p>}
                </TableCell>
                <TableCell className="text-right">
                    <FormattedNumericValue value={account.totalValue} options={{ style: 'currency', currency: 'EUR' }} placeholder="—" />
                </TableCell>
                <TableCell className="text-center">
                    <StatusBadge type="account" status={account.status} isOverdue={account.nextInteraction?.status === 'Seguimiento' && nextActionDate ? nextActionDate < new Date() : false}/>
                </TableCell>
                <TableCell className="text-right">
                    <Button size="sm" onClick={handleOpenDialog}>
                        <Send className="mr-2 h-3 w-3" />
                        Completar
                    </Button>
                </TableCell>
            </TableRow>
            <InteractionDialog
                open={isInteractionDialogOpen}
                onOpenChange={setIsInteractionDialogOpen}
                client={account}
                originatingTask={account.nextInteraction || null}
            />
        </>
    );
}

