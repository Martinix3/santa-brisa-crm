
"use client";

import * as React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Eye, Trash2, Check, PlusCircle, ChevronRight, Flame, Edit, CheckCircle, MoreHorizontal, FileText, CalendarClock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { parseISO, isBefore, startOfDay, format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import type { EnrichedAccount, TeamMember, Order, AccountStatus, Interaction, InlineEditorFormValues } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { getInteractionType } from '@/lib/interaction-utils';
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { InteractionEditor } from "./interaction-inline-form";
import StatusBadge from "./status-badge";
import { saveInteractionFS } from "@/services/interaction-service";
import { useToast } from "@/hooks/use-toast";


interface AccountTableRowProps {
    account: EnrichedAccount;
    allTeamMembers: TeamMember[];
    onResponsibleUpdate: (accountId: string, newResponsibleId: string | null) => Promise<void>;
    onDeleteAccount: (account: EnrichedAccount) => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
}

const AccountTableRow: React.FC<AccountTableRowProps> = ({ account, allTeamMembers, onResponsibleUpdate, onDeleteAccount, isExpanded, onToggleExpand }) => {
    const { userRole, teamMember, refreshDataSignature } = useAuth();
    const { toast } = useToast();
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

    const handleSaveInteraction = async (accountId: string, data: InlineEditorFormValues) => {
        if (!teamMember) return;
        try {
            await saveInteractionFS(accountId, undefined, data, teamMember.id, teamMember.name);
            toast({ title: "Interacción Guardada", description: "Se ha registrado la nueva interacción." });
            refreshDataSignature();
        } catch (error: any) {
            toast({ title: "Error", description: `No se pudo guardar la interacción: ${error.message}`, variant: "destructive" });
        }
    };


    return (
        <TooltipProvider>
            <TableRow className={cn("transition-colors hover:bg-secondary/10", isExpanded && "bg-secondary/10", isOverdue && "bg-rose-50/50 dark:bg-rose-900/10")}>
                <TableCell className="font-medium text-base py-3 px-2 w-[20%]">
                   <div className="flex items-center gap-1">
                     <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={onToggleExpand}>
                        <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                     </Button>
                     <Link href={`/accounts/${account.id}`} className="hover:underline text-primary">
                        {account.nombre}
                     </Link>
                   </div>
                </TableCell>
                <TableCell className="py-3 px-2 text-left w-[15%]">
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
                <TableCell className="py-3 px-2 text-xs w-[20%]">
                    {lastInteraction ? (
                        <div>
                            <p className="truncate" title={getInteractionType(lastInteraction)}>{getInteractionType(lastInteraction)}</p>
                            <p className="text-muted-foreground/80">{isValid(parseISO(lastInteraction.createdAt)) ? format(parseISO(lastInteraction.createdAt), "dd MMM yyyy", { locale: es }) : 'N/D'}</p>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">—</span>
                    )}
                </TableCell>
                 <TableCell className="py-3 px-2 text-xs w-[15%]">
                    {account.nextInteraction ? (
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className="truncate" title={getInteractionType(account.nextInteraction)}>{getInteractionType(account.nextInteraction)}</p>
                                {nextActionDate && isValid(nextActionDate) && (
                                    <p className={cn("font-semibold", isOverdue ? "text-red-600" : "text-muted-foreground/80")}>
                                        {format(nextActionDate, "dd MMM yyyy", { locale: es })}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4"/>Registrar</Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-96">
                                <InteractionEditor account={account} onSave={handleSaveInteraction} />
                            </PopoverContent>
                        </Popover>
                    )}
                </TableCell>
                <TableCell className="py-3 px-2 text-right w-[10%]">
                    <FormattedNumericValue value={account.totalValue} options={{style: 'currency', currency: 'EUR'}} placeholder="—" />
                </TableCell>
                <TableCell className="py-3 px-2 text-center w-[10%]">
                     <div className="flex flex-col items-center justify-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                            <div className="flex items-center justify-center gap-1">
                                {priorityIcon}
                                <span className="font-semibold text-sm">{account.leadScore}</span>
                            </div>
                            </TooltipTrigger>
                            <TooltipContent><p>Puntuación de Prioridad (Lead Score)</p></TooltipContent>
                        </Tooltip>
                        {account.lastOrder && <StatusBadge type="order" status={account.lastOrder.status} className="mt-1"/>}
                     </div>
                </TableCell>
                <TableCell className="py-3 px-2 text-right pr-4 w-[10%]">
                     <div className="flex items-center justify-end gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
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
