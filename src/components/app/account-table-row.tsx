
"use client";

import * as React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { ChevronRight, Eye, Trash2, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { parseISO, isBefore, startOfDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { EnrichedAccount, TeamMember, OrderStatus, NextActionType } from "@/types";
import { useAuth } from "@/contexts/auth-context";

// Assume these components will be created for inline editing
// import { StatusEditor } from './status-editor'; 
// import { NextActionEditor } from './next-action-editor';
// import { ResponsibleEditor } from './responsible-editor';

interface AccountTableRowProps {
    account: EnrichedAccount;
    allTeamMembers: TeamMember[];
    onStatusUpdate: (orderId: string, newStatus: OrderStatus) => void;
    onNextActionUpdate: (orderId: string, newAction: NextActionType, newDate?: Date) => void;
}

const AccountTableRow: React.FC<AccountTableRowProps> = ({ 
    account, 
    allTeamMembers, 
    onStatusUpdate, 
    onNextActionUpdate 
}) => {
    const { userRole } = useAuth();
    const [isExpanded, setIsExpanded] = React.useState(false);
    
    const isAdmin = userRole === 'Admin';

    const nextActionDate = account.nextInteraction?.status === 'Programada' 
        ? account.nextInteraction.visitDate 
        : account.nextInteraction?.nextActionDate;
    
    const isOverdue = nextActionDate ? isBefore(parseISO(nextActionDate), startOfDay(new Date())) : false;
    const dateToDisplay = nextActionDate ? parseISO(nextActionDate) : null;

    const leadScoreColor = account.leadScore > 75 ? 'bg-green-500' : account.leadScore > 40 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <>
            <TableRow 
                className={cn("border-b", isOverdue && "bg-red-50/50 dark:bg-red-900/10")}
                data-state={isExpanded ? "selected" : ""}
            >
                <TableCell className="p-1 text-center">
                    <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} aria-label="Expandir historial">
                        <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                    </Button>
                </TableCell>
                <TableCell className="font-medium text-base">
                    <Link href={`/accounts/${account.id}`} className="hover:underline text-primary">{account.nombre}</Link>
                </TableCell>
                <TableCell>
                    {/* Placeholder for ResponsibleEditor */}
                    <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                            <AvatarImage src={account.responsableAvatar} data-ai-hint="person face" />
                            <AvatarFallback className="text-xs">{account.responsableName?.split(' ').map(n => n[0]).join('') || 'S/A'}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">{account.responsableName || 'Sin Asignar'}</span>
                    </div>
                </TableCell>
                <TableCell className="text-center">
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <div className="flex items-center justify-center gap-1">
                                {isOverdue && <AlertTriangle className="h-4 w-4 text-red-600" />}
                                <StatusBadge type="account" status={account.status} isOverdue={isOverdue} />
                           </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            {isOverdue ? `Caducó el ${format(dateToDisplay!, 'dd/MM/yyyy', { locale: es })}` : `Estado actual de la cuenta`}
                        </TooltipContent>
                    </Tooltip>
                </TableCell>
                <TableCell>
                    {/* Placeholder for NextActionEditor */}
                    {account.nextInteraction ? (
                        <div className="text-sm">
                            <p>{account.nextInteraction.status === 'Programada' ? 'Visita Programada' : account.nextInteraction.nextActionType}</p>
                            {dateToDisplay && <p className="text-xs text-muted-foreground">{format(dateToDisplay, 'PPPP', { locale: es })}</p>}
                        </div>
                    ) : '—'}
                </TableCell>
                <TableCell className="text-center">
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center justify-center gap-1.5">
                                <div className={cn("h-2.5 w-2.5 rounded-full", leadScoreColor)}></div>
                                <span className="font-semibold">{account.leadScore}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Puntuación de Prioridad</p>
                        </TooltipContent>
                    </Tooltip>
                </TableCell>
                <TableCell>{account.ciudad || 'N/D'}</TableCell>
                <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                        <Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" asChild className="hover:text-primary"><Link href={`/accounts/${account.id}`}><Eye className="h-4 w-4" /></Link></Button>
                        </TooltipTrigger><TooltipContent><p>Ver Ficha</p></TooltipContent></Tooltip>
                        
                        {isAdmin && (
                             <Tooltip><TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                             </TooltipTrigger><TooltipContent><p>Eliminar Cuenta</p></TooltipContent></Tooltip>
                        )}
                    </div>
                </TableCell>
            </TableRow>
            {isExpanded && (
                <TableRow>
                    <TableCell colSpan={8} className="p-0">
                       {/* Placeholder for AccountHistory component */}
                       <div className="p-4 bg-muted/50">
                            <p className="text-center text-sm text-muted-foreground">Historial de interacciones (componente en desarrollo).</p>
                       </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
};

export default AccountTableRow;
