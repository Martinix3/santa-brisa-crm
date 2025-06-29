
"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { getAccountsFS } from "@/services/account-service";
import { getOrdersFS, updateOrderFS } from "@/services/order-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import type { Account, Order, TeamMember, OrderStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ClipboardList, Loader2, Target, AlertTriangle, Eye, Edit, Search, MoreHorizontal, Send } from "lucide-react";
import { format, isValid, parseISO, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils";

type TaskTypeFilter = "Todos" | "Programada" | "Seguimiento";

export default function CrmFollowUpPage() {
    const { userRole, teamMember, loading: authContextLoading, refreshDataSignature } = useAuth();
    const { toast } = useToast();
    
    const [isLoading, setIsLoading] = React.useState(true);
    const [tasks, setTasks] = React.useState<Order[]>([]);
    const [filteredTasks, setFilteredTasks] = React.useState<Order[]>([]);
    const [accountsMap, setAccountsMap] = React.useState<Map<string, Account>>(new Map());
    const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);

    const [searchTerm, setSearchTerm] = React.useState("");
    const [cityFilter, setCityFilter] = React.useState("");
    const [userFilter, setUserFilter] = React.useState<string>("Todos");
    const [typeFilter, setTypeFilter] = React.useState<TaskTypeFilter>("Todos");
    
    React.useEffect(() => {
        if (authContextLoading) return;

        async function loadData() {
            setIsLoading(true);
            try {
                const [allOrders, allAccounts, allTeamMembers] = await Promise.all([
                    getOrdersFS(),
                    getAccountsFS(),
                    userRole === 'Admin' ? getTeamMembersFS(['SalesRep', 'Clavadista', 'Admin']) : Promise.resolve([])
                ]);
                
                let userTasks = allOrders.filter(o => ['Programada', 'Seguimiento'].includes(o.status));
                
                if (userRole === 'SalesRep' && teamMember) {
                    userTasks = userTasks.filter(task => task.salesRep === teamMember.name);
                } else if (userRole === 'Clavadista' && teamMember) {
                    userTasks = userTasks.filter(task => task.clavadistaId === teamMember.id);
                }

                setTasks(userTasks);
                setAccountsMap(new Map(allAccounts.map(acc => [acc.id, acc])));
                setTeamMembers(allTeamMembers);

            } catch (error) {
                console.error("Error loading follow-up data:", error);
                toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar las tareas.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [authContextLoading, userRole, teamMember, refreshDataSignature, toast]);
    
    React.useEffect(() => {
        let tasksToFilter = tasks;
        
        if (userFilter !== 'Todos' && userRole === 'Admin') {
            const selectedMember = teamMembers.find(m => m.id === userFilter);
            if(selectedMember?.role === 'Clavadista') {
                tasksToFilter = tasksToFilter.filter(task => task.clavadistaId === selectedMember.id);
            } else if (selectedMember) {
                tasksToFilter = tasksToFilter.filter(task => task.salesRep === selectedMember.name);
            }
        }

        if(typeFilter !== 'Todos') {
            tasksToFilter = tasksToFilter.filter(task => task.status === typeFilter);
        }

        if (searchTerm) {
            tasksToFilter = tasksToFilter.filter(task => 
                task.clientName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (cityFilter) {
            tasksToFilter = tasksToFilter.filter(task => {
                if (!task.accountId) return false;
                const account = accountsMap.get(task.accountId);
                return account?.ciudad?.toLowerCase().includes(cityFilter.toLowerCase()) || 
                       account?.addressBilling?.city?.toLowerCase().includes(cityFilter.toLowerCase()) ||
                       account?.addressShipping?.city?.toLowerCase().includes(cityFilter.toLowerCase());
            });
        }

        setFilteredTasks(tasksToFilter);
    }, [searchTerm, cityFilter, userFilter, typeFilter, tasks, accountsMap, teamMembers, userRole]);
    
    const handleDateUpdate = async (taskId: string, newDate: Date) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const dateFieldToUpdate = task.status === 'Programada' ? 'visitDate' : 'nextActionDate';
        const updatePayload = { [dateFieldToUpdate]: format(newDate, "yyyy-MM-dd") };

        try {
            await updateOrderFS(taskId, updatePayload);
            toast({ title: "Fecha actualizada", description: `La fecha de la tarea para ${task.clientName} se ha actualizado.` });
            refreshDataSignature();
        } catch (error) {
            toast({ title: "Error al actualizar", description: "No se pudo cambiar la fecha de la tarea.", variant: "destructive" });
        }
    };


    if (authContextLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    const isAdmin = userRole === 'Admin';

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                    <ClipboardList className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-headline font-semibold">Panel de Actividad Comercial</h1>
                </div>
            </header>
            
            <Card className="shadow-subtle">
                <CardHeader>
                    <CardTitle>Gestión de Tareas y Seguimientos</CardTitle>
                    <CardDescription>Visualiza las tareas pendientes y vencidas. Haz clic en una tarea para gestionarla.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 flex-wrap">
                        <Input placeholder="Buscar por cuenta..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-xs"/>
                        <Input placeholder="Filtrar por ciudad..." value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="max-w-xs"/>
                        {isAdmin && (
                             <Select value={userFilter} onValueChange={setUserFilter}>
                                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filtrar por usuario" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Todos">Todos los Usuarios</SelectItem>
                                    {teamMembers.map(member => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TaskTypeFilter)}>
                            <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filtrar por tipo" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Todos">Todos los Tipos</SelectItem>
                                <SelectItem value="Programada">Visitas Programadas</SelectItem>
                                <SelectItem value="Seguimiento">Seguimientos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[25%]">Cuenta</TableHead>
                                    <TableHead className="w-[20%]">Próxima Acción</TableHead>
                                    <TableHead className="w-[15%]">Fecha Límite</TableHead>
                                    {isAdmin && <TableHead className="w-[15%]">Responsable</TableHead>}
                                    <TableHead className="w-[15%]" />
                                    <TableHead className="w-[10%] text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTasks.length > 0 ? filteredTasks.map((task) => {
                                    const dateField = task.status === 'Programada' ? task.visitDate : task.nextActionDate;
                                    const taskDate = dateField ? parseISO(dateField) : null;
                                    const isOverdue = taskDate && isBefore(taskDate, startOfDay(new Date()));

                                    return (
                                        <TableRow key={task.id} className={cn(isOverdue && 'bg-red-50 dark:bg-red-900/20')}>
                                            <TableCell className="font-medium">
                                                {task.accountId ? (
                                                    <Link href={`/accounts/${task.accountId}`} className="hover:underline text-primary">{task.clientName}</Link>
                                                ) : (
                                                    task.clientName
                                                )}
                                            </TableCell>
                                            <TableCell>{task.status === 'Programada' ? 'Visita Programada' : task.nextActionType}</TableCell>
                                            <TableCell>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="ghost" className="p-1 h-auto font-normal text-left w-full justify-start">
                                                            {isOverdue && <AlertTriangle className="mr-2 h-4 w-4 text-red-600"/>}
                                                            {taskDate ? format(taskDate, 'dd/MM/yyyy') : 'Sin fecha'}
                                                            <Edit className="ml-2 h-3 w-3 text-muted-foreground opacity-50 hover:opacity-100" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar mode="single" selected={taskDate || undefined} onSelect={(date) => date && handleDateUpdate(task.id, date)} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                            </TableCell>
                                            {isAdmin && <TableCell>{task.salesRep}</TableCell>}
                                            <TableCell>
                                                 {task.status === 'Programada' ? 'Visita' : 'Seguimiento'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                         <DropdownMenuItem asChild>
                                                            <Link href={`/order-form?originatingTaskId=${task.id}`}>
                                                                <Send className="mr-2 h-4 w-4" /> Registrar Resultado
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        {task.accountId && (
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/accounts/${task.accountId}`}>
                                                                    <Eye className="mr-2 h-4 w-4" /> Ver Ficha de la Cuenta
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center">No se encontraron tareas con los filtros actuales.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                 <CardFooter>
                    <p className="text-xs text-muted-foreground">Mostrando {filteredTasks.length} de {tasks.length} tareas abiertas.</p>
                </CardFooter>
            </Card>
        </div>
    );
}
