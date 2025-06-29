
"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { getAccountsFS } from "@/services/account-service";
import { getInteractionsFS } from "@/services/interaction-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { processCarteraData, type TaskBucket } from "@/services/cartera-service";
import type { Account, Interaction, TeamMember, EnrichedAccount } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { ClipboardList, Loader2, Target, AlertTriangle, Eye, Clock, CalendarCheck, AlertOctagon } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LeadScoreBadge: React.FC<{ score: number }> = ({ score }) => {
    const scoreColor = score > 70 ? 'bg-green-500' : score > 40 ? 'bg-yellow-400 text-black' : 'bg-red-500';
    return (
        <div className="flex items-center gap-2">
            <span className={cn("inline-block w-3 h-3 rounded-full", scoreColor)}></span>
            <span className="font-semibold">{score.toFixed(0)}</span>
        </div>
    );
};

export default function CarteraPage() {
    const { userRole, teamMember, loading: authContextLoading, refreshDataSignature } = useAuth();
    const { toast } = useToast();
    
    const [isLoading, setIsLoading] = React.useState(true);
    const [enrichedAccounts, setEnrichedAccounts] = React.useState<EnrichedAccount[]>([]);
    const [filteredAccounts, setFilteredAccounts] = React.useState<EnrichedAccount[]>([]);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [activeBucket, setActiveBucket] = React.useState<TaskBucket | 'all'>('all');

    React.useEffect(() => {
        if (authContextLoading) return;

        async function loadCarteraData() {
            setIsLoading(true);
            try {
                const [accounts, interactions, teamMembers] = await Promise.all([
                    getAccountsFS(),
                    getInteractionsFS(),
                    getTeamMembersFS()
                ]);
                
                let processedData = await processCarteraData(accounts as any, interactions, teamMembers);
                
                if (userRole === 'SalesRep' && teamMember) {
                    processedData = processedData.filter(acc => acc.responsableId === teamMember.id);
                }
                
                setEnrichedAccounts(processedData);
                setFilteredAccounts(processedData);

            } catch (error) {
                console.error("Error loading cartera data:", error);
                toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los datos de la cartera.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        }
        loadCarteraData();
    }, [authContextLoading, userRole, teamMember, refreshDataSignature, toast]);
    
    React.useEffect(() => {
        let accountsToFilter = enrichedAccounts;
        
        if(activeBucket !== 'all') {
            accountsToFilter = accountsToFilter.filter(acc => {
                if (!acc.nextInteraction) return false;
                const nextDate = parseISO(acc.nextInteraction.fecha_prevista);
                const today = new Date();
                today.setHours(0,0,0,0);
                
                if(!isValid(nextDate)) return false;

                if(activeBucket === 'vencida') return nextDate < today;
                if(activeBucket === 'hoy') return nextDate.toDateString() === today.toDateString();
                if(activeBucket === 'pendiente') return nextDate > today;
                return false;
            });
        }
        
        if (searchTerm) {
            accountsToFilter = accountsToFilter.filter(acc => 
                acc.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (acc.ciudad && acc.ciudad.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        setFilteredAccounts(accountsToFilter);

    }, [searchTerm, activeBucket, enrichedAccounts]);

    if (authContextLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (userRole !== 'Admin' && userRole !== 'SalesRep') {
        return <Card><CardHeader><CardTitle>Acceso no permitido</CardTitle></CardHeader><CardContent><p>Esta sección es solo para Administradores y Comerciales.</p></CardContent></Card>;
    }

    const taskCounts = enrichedAccounts.reduce((acc, account) => {
        if (!account.nextInteraction) return acc;
        const nextDate = parseISO(account.nextInteraction.fecha_prevista);
        const today = new Date();
        today.setHours(0,0,0,0);

        if(!isValid(nextDate)) return acc;

        if (nextDate < today) acc.vencida++;
        else if (nextDate.toDateString() === today.toDateString()) acc.hoy++;
        else if (nextDate > today) acc.pendiente++;
        return acc;
    }, { vencida: 0, hoy: 0, pendiente: 0 });

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                    <ClipboardList className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-headline font-semibold">Cartera de Cuentas</h1>
                </div>
            </header>
            
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Cartera</CardTitle>
                    <CardDescription>Visualiza el estado de tus cuentas, próximas acciones y prioridades. Haz clic en una cuenta para ver más detalles.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                        <Input
                          placeholder="Buscar por cuenta o ciudad..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="max-w-sm"
                        />
                         <div className="flex items-center gap-2 border rounded-md p-1 bg-muted">
                            <Button size="sm" variant={activeBucket === 'all' ? 'secondary' : 'ghost'} onClick={() => setActiveBucket('all')}>Todos ({enrichedAccounts.length})</Button>
                            <Button size="sm" variant={activeBucket === 'vencida' ? 'destructive' : 'ghost'} onClick={() => setActiveBucket('vencida')}><AlertOctagon className="mr-2 h-4 w-4"/>Vencidas ({taskCounts.vencida})</Button>
                            <Button size="sm" variant={activeBucket === 'hoy' ? 'default' : 'ghost'} onClick={() => setActiveBucket('hoy')}><Target className="mr-2 h-4 w-4"/>Para Hoy ({taskCounts.hoy})</Button>
                            <Button size="sm" variant={activeBucket === 'pendiente' ? 'ghost' : 'ghost'} onClick={() => setActiveBucket('pendiente')}><CalendarCheck className="mr-2 h-4 w-4"/>Pendientes ({taskCounts.pendiente})</Button>
                         </div>
                    </div>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[25%]">Cuenta</TableHead>
                                    <TableHead className="w-[15%]">Estado</TableHead>
                                    <TableHead className="w-[20%]">Próxima Acción</TableHead>
                                    <TableHead className="w-[15%]">Fecha Límite</TableHead>
                                    <TableHead className="w-[15%]">Lead Score</TableHead>
                                    <TableHead className="w-[10%]">Ciudad</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAccounts.length > 0 ? filteredAccounts.map((acc) => (
                                    <TableRow key={acc.id}>
                                        <TableCell className="font-medium">
                                            <Link href={`/accounts/${acc.id}`} className="hover:underline text-primary">{acc.nombre}</Link>
                                        </TableCell>
                                        <TableCell><StatusBadge type="account" status={acc.status} /></TableCell>
                                        <TableCell>{acc.nextInteraction?.tipo || '—'}</TableCell>
                                        <TableCell>{acc.nextInteraction ? format(parseISO(acc.nextInteraction.fecha_prevista), 'dd/MM/yyyy') : '—'}</TableCell>
                                        <TableCell><LeadScoreBadge score={acc.leadScore} /></TableCell>
                                        <TableCell>{acc.ciudad || 'N/D'}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">No se encontraron cuentas con los filtros actuales.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                 <CardFooter>
                    <p className="text-xs text-muted-foreground">Mostrando {filteredAccounts.length} de {enrichedAccounts.length} cuentas.</p>
                </CardFooter>
            </Card>
        </div>
    );
}

