
"use client";

import * as React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { ChevronRight, Eye, Trash2, AlertTriangle, Send, PlusCircle, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { parseISO, isBefore, startOfDay, format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import type { EnrichedAccount, TeamMember, Order } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import AccountHistoryTable from './account-history-table';

interface AccountTableRowProps {
    account: EnrichedAccount;
    allTeamMembers: TeamMember[];
    onResponsibleUpdate: (accountId: string, newResponsibleId: string | null) => Promise<void>;
    onOpenFollowUpDialog: (task: Order) => void;
    onDeleteAccount: (account: EnrichedAccount) => void;
}

const AccountTableRow: React.FC<AccountTableRowProps> = ({ account, allTeamMembers, onResponsibleUpdate, onOpenFollowUpDialog, onDeleteAccount }) => {
    const { userRole } = useAuth();
    const [isExpanded, setIsExpanded] = React.useState(false);
    const isAdmin = userRole === 'Admin';
    const salesAndAdminMembers = allTeamMembers.filter(m => m.role === 'Admin' || m.role === 'SalesRep');

    const handleResponsibleUpdate = async (newResponsibleId: string) => {
        const finalId = newResponsibleId === '##NONE##' ? null : newResponsibleId;
        await onResponsibleUpdate(account.id, finalId);
    };

    const nextActionDate = account.nextInteraction?.status === 'Programada'
        ? (account.nextInteraction.visitDate ? parseISO(account.nextInteraction.visitDate) : null)
        : (account.nextInteraction?.nextActionDate ? parseISO(account.nextInteraction.nextActionDate) : null);
    
    const isOverdue = nextActionDate ? isBefore(nextActionDate, startOfDay(new Date())) : false;
    const leadScoreColor = account.leadScore > 75 ? 'bg-green-500' : account.leadScore > 40 ? 'bg-yellow-500' : 'bg-red-500';

    const accountIsActive = account.status === 'Pedido' || account.status === 'Repetición';

    const nextActionText = account.nextInteraction
        ? account.nextInteraction.status === 'Programada'
            ? 'Visita Programada'
            : account.nextInteraction.nextActionType || 'Seguimiento'
        : '—';


    return (
        <TooltipProvider>
        <>
            <TableRow className={cn("border-b", isOverdue && "bg-red-50/50 dark:bg-red-900/10")} data-state={isExpanded ? "selected" : ""}>
                <TableCell className="p-1 text-center align-middle">
                     <div className={cn("w-1 h-10 rounded-full",
                        accountIsActive ? "bg-green-400" :
                        account.status === "Programada" || account.status === "Seguimiento" ? "bg-blue-400" :
                        "bg-red-400"
                    )}></div>
                </TableCell>
                <TableCell className="font-medium align-middle">
                     <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} aria-label="Expandir historial" className="h-8 w-8">
                            <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                        </Button>
                        <Link href={`/accounts/${account.id}`} className="hover:underline text-primary text-base font-semibold">{account.nombre}</Link>
                    </div>
                </TableCell>
                <TableCell className="align-middle">
                    {isAdmin ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-auto p-1 -ml-1 flex items-center gap-2">
                                    <Avatar className="h-7 w-7"><AvatarImage src={account.responsableAvatar} data-ai-hint="person face" /><AvatarFallback className="text-xs">{account.responsableName?.split(' ').map(n => n[0]).join('') || 'S/A'}</AvatarFallback></Avatar>
                                    <span className="text-sm truncate">{account.responsableName || 'Sin Asignar'}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuRadioGroup value={account.responsableId || '##NONE##'} onValueChange={handleResponsibleUpdate}>
                                    <DropdownMenuRadioItem value="##NONE##">Sin Asignar</DropdownMenuRadioItem>
                                    {salesAndAdminMembers.map(m => <DropdownMenuRadioItem key={m.id} value={m.id}>{m.name}</DropdownMenuRadioItem>)}
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="flex items-center gap-2"><Avatar className="h-7 w-7"><AvatarImage src={account.responsableAvatar} data-ai-hint="person face" /><AvatarFallback className="text-xs">{account.responsableName?.split(' ').map(n => n[0]).join('') || 'S/A'}</AvatarFallback></Avatar><span className="text-sm truncate">{account.responsableName || 'Sin Asignar'}</span></div>
                    )}
                </TableCell>
                <TableCell className="text-center align-middle">
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <div className="flex items-center justify-center gap-1">
                                {isOverdue && <AlertTriangle className="h-4 w-4 text-red-600" />}
                                <StatusBadge type="account" status={account.status} />
                           </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            {isOverdue && nextActionDate ? `Caducó el ${format(nextActionDate, 'dd/MM/yyyy', { locale: es })}` : `Estado actual de la cuenta`}
                        </TooltipContent>
                    </Tooltip>
                </TableCell>
                <TableCell className="align-middle">
                    {account.nextInteraction ? (
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-muted-foreground truncate" title={nextActionText}>
                                {nextActionText}
                            </span>
                            <Button variant="outline" size="sm" onClick={() => onOpenFollowUpDialog(account.nextInteraction!)}>
                                <Check className="mr-1 h-4 w-4" /> Completar
                            </Button>
                        </div>
                    ) : accountIsActive ? (
                         <Button asChild variant="outline" size="sm">
                            <Link href={`/order-form?accountId=${account.id}`}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Generar Nuevo Pedido
                            </Link>
                        </Button>
                    ) : (
                        '—'
                    )}
                </TableCell>
                <TableCell className="text-center align-middle">
                     <Tooltip>
                        <TooltipTrigger asChild><div className="flex items-center justify-center gap-1.5"><div className={cn("h-2.5 w-2.5 rounded-full", leadScoreColor)}></div><span className="font-semibold">{account.leadScore}</span></div></TooltipTrigger>
                        <TooltipContent><p>Puntuación de Prioridad</p></TooltipContent>
                    </Tooltip>
                </TableCell>
                <TableCell className="align-middle">{account.ciudad || 'N/D'}</TableCell>
                <TableCell className="text-right pr-4 align-middle">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem asChild><Link href={`/accounts/${account.id}`}><Eye className="mr-2 h-4 w-4"/>Ver Ficha Completa</Link></DropdownMenuItem>
                           <DropdownMenuSeparator />
                           {accountIsActive ? (
                                <DropdownMenuItem asChild><Link href={`/order-form?accountId=${account.id}`}><PlusCircle className="mr-2 h-4 w-4"/>Registrar Nuevo Pedido</Link></DropdownMenuItem>
                           ) : (
                                <DropdownMenuItem asChild><Link href={`/order-form?accountId=${account.id}`}><PlusCircle className="mr-2 h-4 w-4"/>Registrar Interacción</Link></DropdownMenuItem>
                           )}
                           {isAdmin && (<>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onSelect={(e) => { e.preventDefault(); onDeleteAccount(account); }}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar Cuenta
                            </DropdownMenuItem>
                           </>)}
                        </DropdownMenuContent>
                     </DropdownMenu>
                </TableCell>
            </TableRow>
            {isExpanded && (
                <TableRow>
                    <TableCell colSpan={8} className="p-0">
                       <AccountHistoryTable interactions={account.interactions} />
                    </TableCell>
                </TableRow>
            )}
        </>
        </TooltipProvider>
    );
};

export default AccountTableRow;
