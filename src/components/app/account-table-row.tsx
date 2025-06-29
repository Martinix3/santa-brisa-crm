
"use client";

import * as React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { ChevronRight, Eye, Trash2, AlertTriangle, Calendar as CalendarIcon, Edit } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { parseISO, isBefore, startOfDay, format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import type { EnrichedAccount, TeamMember, OrderStatus, NextActionType } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { nextActionTypeList } from '@/lib/data';
import AccountHistoryTable from './account-history-table';

const nextActionSchema = z.object({
  nextActionType: z.enum(nextActionTypeList as [string, ...string[]], {required_error: "Debe seleccionar un tipo de acción."}),
  nextActionDate: z.date().optional(),
});
type NextActionFormValues = z.infer<typeof nextActionSchema>;


interface AccountTableRowProps {
    account: EnrichedAccount;
    allTeamMembers: TeamMember[];
    onResponsibleUpdate: (accountId: string, newResponsibleId: string | null) => Promise<void>;
    onTaskUpdate: (interactionId: string, newAction: NextActionType, newDate?: Date) => Promise<void>;
}

const AccountTableRow: React.FC<AccountTableRowProps> = ({ account, allTeamMembers, onResponsibleUpdate, onTaskUpdate }) => {
    const { userRole } = useAuth();
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [isNextActionPopoverOpen, setIsNextActionPopoverOpen] = React.useState(false);
    const isAdmin = userRole === 'Admin';
    const salesAndAdminMembers = allTeamMembers.filter(m => m.role === 'Admin' || m.role === 'SalesRep');

    const form = useForm<NextActionFormValues>({
      resolver: zodResolver(nextActionSchema),
      defaultValues: {
        nextActionType: account.nextInteraction?.nextActionType,
        nextActionDate: account.nextInteraction?.nextActionDate ? parseISO(account.nextInteraction.nextActionDate) : undefined,
      }
    });

    const handleResponsibleUpdate = async (newResponsibleId: string) => {
        const finalId = newResponsibleId === '##NONE##' ? null : newResponsibleId;
        await onResponsibleUpdate(account.id, finalId);
    };

    const handleNextActionSubmit = async (values: NextActionFormValues) => {
        if (!account.nextInteraction) return;
        await onTaskUpdate(account.nextInteraction.id, values.nextActionType, values.nextActionDate);
        setIsNextActionPopoverOpen(false);
    };

    const nextActionDate = account.nextInteraction?.status === 'Programada'
        ? (account.nextInteraction.visitDate ? parseISO(account.nextInteraction.visitDate) : null)
        : (account.nextInteraction?.nextActionDate ? parseISO(account.nextInteraction.nextActionDate) : null);
    
    const isOverdue = nextActionDate ? isBefore(nextActionDate, startOfDay(new Date())) : false;
    const leadScoreColor = account.leadScore > 75 ? 'bg-green-500' : account.leadScore > 40 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <TooltipProvider>
        <>
            <TableRow className={cn("border-b", isOverdue && "bg-red-50/50 dark:bg-red-900/10")} data-state={isExpanded ? "selected" : ""}>
                <TableCell className="p-1 text-center align-middle">
                     <div className={cn("w-1 h-10 rounded-full",
                        account.status === "Pedido" || account.status === "Repetición" ? "bg-green-400" :
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
                        <Popover open={isNextActionPopoverOpen} onOpenChange={setIsNextActionPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" disabled={!isAdmin} className="flex flex-col items-start h-auto p-1 -ml-1 text-left">
                                     <p>{account.nextInteraction.status === 'Programada' ? 'Visita Programada' : account.nextInteraction.nextActionType}</p>
                                     {nextActionDate && <p className="text-xs text-muted-foreground">{format(nextActionDate, 'PPPP', { locale: es })}</p>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(handleNextActionSubmit)} className="space-y-4">
                                        <h4 className="font-medium">Editar Próxima Acción</h4>
                                        <FormField control={form.control} name="nextActionType" render={({ field }) => (<FormItem><FormLabel>Acción</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{nextActionTypeList.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)} />
                                        <FormField control={form.control} name="nextActionDate" render={({ field }) => (<FormItem><FormLabel>Fecha</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", {locale:es}) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50"/></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/></PopoverContent></Popover><FormMessage/></FormItem>)} />
                                        <Button type="submit">Guardar</Button>
                                    </form>
                                </Form>
                            </PopoverContent>
                        </Popover>
                    ) : '—'}
                </TableCell>
                <TableCell className="text-center align-middle">
                     <Tooltip>
                        <TooltipTrigger asChild><div className="flex items-center justify-center gap-1.5"><div className={cn("h-2.5 w-2.5 rounded-full", leadScoreColor)}></div><span className="font-semibold">{account.leadScore}</span></div></TooltipTrigger>
                        <TooltipContent><p>Puntuación de Prioridad</p></TooltipContent>
                    </Tooltip>
                </TableCell>
                <TableCell className="align-middle">{account.ciudad || 'N/D'}</TableCell>
                <TableCell className="text-right pr-4 align-middle">
                    <div className="flex items-center justify-end gap-1"><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" asChild className="hover:text-primary"><Link href={`/accounts/${account.id}`}><Eye className="h-4 w-4" /></Link></Button></TooltipTrigger><TooltipContent><p>Ver Ficha</p></TooltipContent></Tooltip>{isAdmin && (<Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Eliminar Cuenta</p></TooltipContent></Tooltip>)}</div>
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
