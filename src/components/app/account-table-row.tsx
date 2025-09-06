
"use client";

import * as React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StatusBadge from "@/components/app/status-badge";
import { Eye, Trash2, Check, PlusCircle, ChevronRight, Flame, Edit, CheckCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { parseISO, isBefore, startOfDay, format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import type { EnrichedAccount, TeamMember, Order, AccountStatus, Interaction } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { getInteractionType } from '@/lib/interaction-utils';

interface AccountTableRowProps {
    account: EnrichedAccount;
    allTeamMembers: TeamMember[];
    onResponsibleUpdate: (accountId: string, newResponsibleId: string | null) => Promise<void>;
    onDeleteAccount: (account: EnrichedAccount) => void;
    lineColor: string;
    isExpanded: boolean;
    onToggleExpand: () => void;
}

const AccountTableRow: React.FC<AccountTableRowProps> = ({ account, allTeamMembers, onResponsibleUpdate, onDeleteAccount, lineColor, isExpanded, onToggleExpand }) => {
    const { userRole } = useAuth();
    const isAdmin = userRole === 'Admin';
    const salesAndAdminMembers = allTeamMembers.filter(m => m.role === 'Admin' || m.role === 'SalesRep');

    const nextActionDate = account.nextInteraction?.status === 'Programada'
        ? (account.nextInteraction.visitDate ? parseISO(account.nextInteraction.visitDate) : null)
        : (account.nextInteraction?.nextActionDate ? parseISO(account.nextInteraction.nextActionDate) : null);
    
    const isOverdue = nextActionDate ? isBefore(nextActionDate, startOfDay(new Date())) : false;
    
    let priorityIcon;
    if (account.leadScore > 75) {
        priorityIcon = <Flame className="h-5 w-5 text-red-500" />;
    } else if (account.leadScore > 50) {
        priorityIcon = <Flame className="h-5 w-5 text-orange-400" />;
    } else if (account.leadScore > 25) {
        priorityIcon = <Flame className="h-5 w-5 text-yellow-400" />;
    } else {
        priorityIcon = <Flame className="h-5 w-5 text-gray-300" />;
    }

    const lastInteraction = account.interactions.length > 0 ? account.interactions[0] : null;

    return (
        <TooltipProvider>
            <TableRow className={cn("transition-colors hover:bg-secondary/10", isExpanded && "bg-secondary/10", isOverdue && "bg-rose-50/50 dark:bg-rose-900/10")}>
                <TableCell className="p-0 w-2">
                    <div className={cn("w-1.5 h-full min-h-[4rem] transition-all", isExpanded ? lineColor : 'bg-transparent')}></div>
                </TableCell>
                <TableCell className="table-cell-main-text">
                    <Link href={`/accounts/${account.id}`} className="hover:underline text-primary">
                        {account.nombre}
                    </Link>
                </TableCell>
                <TableCell className="table-cell-std text-center">
                    <StatusBadge type="account" status={account.status} />
                </TableCell>
                <TableCell className="table-cell-std text-left">
                    {isAdmin ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-auto p-1 -ml-1 flex items-center gap-2 text-left w-full justify-start">
                                    <Avatar className="h-7 w-7"><AvatarImage src={account.responsableAvatar} data-ai-hint="person face" /><AvatarFallback className="text-xs">{account.responsableName?.split(' ').map(n => n[0]).join('') || 'S/A'}</AvatarFallback></Avatar>
                                    <span className="text-sm truncate">{account.responsableName || 'Sin Asignar'}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuRadioGroup value={account.responsableId || '##NONE##'} onValueChange={(newId) => onResponsibleUpdate(account.id, newId === '##NONE##' ? null : newId)}>
                                    <DropdownMenuRadioItem value="##NONE##">Sin Asignar</DropdownMenuRadioItem>
                                    {salesAndAdminMembers.map(m => <DropdownMenuRadioItem key={m.id} value={m.id}>{m.name}</DropdownMenuRadioItem>)}
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="flex items-center gap-2"><Avatar className="h-7 w-7"><AvatarImage src={account.responsableAvatar} data-ai-hint="person face" /><AvatarFallback className="text-xs">{account.responsableName?.split(' ').map(n => n[0]).join('') || 'S/A'}</AvatarFallback></Avatar><span className="text-sm truncate">{account.responsableName || 'Sin Asignar'}</span></div>
                    )}
                </TableCell>
                <TableCell className="table-cell-std text-xs">
                    {lastInteraction ? (
                        <div>
                            <p className="text-muted-foreground truncate" title={getInteractionType(lastInteraction)}>{getInteractionType(lastInteraction)}</p>
                            <p className="text-muted-foreground/80">{isValid(parseISO(lastInteraction.createdAt)) ? format(parseISO(lastInteraction.createdAt), "dd MMM yyyy", { locale: es }) : 'N/D'}</p>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">—</span>
                    )}
                </TableCell>
                 <TableCell className="table-cell-std text-xs">
                    {account.nextInteraction ? (
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className="text-muted-foreground truncate" title={getInteractionType(account.nextInteraction)}>{getInteractionType(account.nextInteraction)}</p>
                                {nextActionDate && isValid(nextActionDate) && (
                                    <p className={cn("font-semibold", isOverdue ? "text-red-600" : "text-muted-foreground/80")}>
                                        {format(nextActionDate, "dd MMM yyyy", { locale: es })}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">—</span>
                    )}
                </TableCell>
                <TableCell className="table-cell-std text-center">
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <div className="flex items-center justify-center gap-1">
                                {priorityIcon}
                                <span className="font-semibold text-sm">{account.leadScore}</span>
                           </div>
                        </TooltipTrigger>
                        <TooltipContent><p>Puntuación de Prioridad (Lead Score)</p></TooltipContent>
                    </Tooltip>
                </TableCell>
                <TableCell className="table-cell-std text-right pr-4">
                     <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleExpand}>
                            <Edit className="h-4 w-4 text-teal-600" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                               <DropdownMenuItem asChild><Link href={`/accounts/${account.id}`}><Eye className="mr-2 h-4 w-4"/>Ver Ficha Completa</Link></DropdownMenuItem>
                               <DropdownMenuSeparator />
                               {isAdmin && (<>
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
                     </div>
                </TableCell>
            </TableRow>
        </TooltipProvider>
    );
};

export default AccountTableRow;
