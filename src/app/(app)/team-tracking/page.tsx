
"use client";

import React, { useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TeamMember, Order, Account } from "@/types";
import { Package, Briefcase, Footprints, Users, Eye, Loader2 } from 'lucide-react';
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getOrdersFS } from '@/services/order-service';
import { getAccountsFS } from '@/services/account-service';
import { getTeamMembersFS } from '@/services/team-member-service';
import { parseISO, isSameMonth, isSameYear, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from "@/contexts/auth-context";
import { VALID_SALE_STATUSES, ALL_VISIT_STATUSES } from '@/lib/constants';
import { EstadoPedido } from "@ssot";

interface EnrichedTeamMember extends TeamMember {
  monthlyAccountsAchieved: number;
  monthlyVisitsAchieved: number;
  bottlesSold: number;
}

const renderProgress = (current: number, target: number, unit: string, targetAchievedText: string) => {
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : (current > 0 ? 100 : 0);
  const remaining = Math.max(0, target - current);
  const targetAchieved = current >= target && target > 0;

  return (
    <div className="flex flex-col items-center w-full">
      <Progress 
        value={progress} 
        className={cn(
            "h-2 mb-1 w-full",
            targetAchieved ? "[&>div]:bg-green-500" : "[&>div]:bg-primary"
        )} 
        aria-label={`${progress.toFixed(0)}% del objetivo de ${unit}`} 
      />
      <p className="text-xs text-muted-foreground text-center">
        Actual: <FormattedNumericValue value={current} /> / <FormattedNumericValue value={target} /> {unit}
      </p>
      <p className={cn(
          "text-xs text-center",
          targetAchieved ? "text-green-600 font-semibold" : "text-muted-foreground/80"
        )}
      >
        {target === 0 && current === 0 ? "Sin objetivo" :
         target === 0 && current > 0 ? targetAchievedText : 
         targetAchieved ? targetAchievedText : 
         `Faltan: ${remaining.toLocaleString('es-ES')}`}
      </p>
    </div>
  );
};


export default function TeamTrackingPage() {
  const { toast } = useToast();
  const { userRole, teamMember, dataSignature } = useAuth(); 
  const [teamStats, setTeamStats] = useState<EnrichedTeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
        setIsLoading(true);
        try {
            const [fetchedOrders, fetchedAccounts, fetchedMembers] = await Promise.all([
                getOrdersFS(),
                getAccountsFS(),
                getTeamMembersFS(['Ventas', 'Líder Clavadista'])
            ]);
            
            const currentDate = new Date();
            
            const accountNameMap = new Map<string, string>();
            fetchedAccounts.forEach(account => {
                if (account.nombre) {
                    accountNameMap.set(account.nombre.toLowerCase().trim(), account.id);
                }
            });

            const allSuccessfulOrders = fetchedOrders
                .filter(o => VALID_SALE_STATUSES.includes(o.status as EstadoPedido) && (o.createdAt || o.visitDate))
                .map(o => {
                    const dateString = o.visitDate || o.createdAt!;
                    const isoDateString = dateString.includes(' ') ? dateString.replace(' ', 'T') : dateString;
                    let finalAccountId = o.accountId;
                    if (!finalAccountId && o.clientName) {
                        finalAccountId = accountNameMap.get(o.clientName.toLowerCase().trim());
                    }
                    return { ...o, accountId: finalAccountId, relevantDate: parseISO(isoDateString) };
                })
                .filter(o => isValid(o.relevantDate) && o.accountId)
                .sort((a,b) => a.relevantDate.getTime() - b.relevantDate.getTime());

            const stats: EnrichedTeamMember[] = fetchedMembers.map(member => {
                const memberInteractions = fetchedOrders.filter(o => o.salesRep === member.name);
                
                const bottlesSold = memberInteractions
                    .filter(order => VALID_SALE_STATUSES.includes(order.status as EstadoPedido))
                    .reduce((sum, order) => sum + (order.numberOfUnits || 0), 0);
                
                const monthlyVisitsAchieved = memberInteractions.filter(order => {
                    const date = order.visitDate || order.createdAt;
                    return date && isValid(parseISO(date)) && isSameMonth(parseISO(date), currentDate) && isSameYear(parseISO(date), currentDate) && ALL_VISIT_STATUSES.includes(order.status as EstadoPedido);
                }).length;
                
                const firstOrdersForMemberAccounts = new Map<string, typeof allSuccessfulOrders[0]>();
                for (const order of allSuccessfulOrders) {
                    if (order.salesRep === member.name && order.accountId && !firstOrdersForMemberAccounts.has(order.accountId)) {
                    firstOrdersForMemberAccounts.set(order.accountId, order);
                    }
                }
                
                const monthlyAccountsAchieved = Array.from(firstOrdersForMemberAccounts.values()).filter(o => 
                    isSameMonth(o.relevantDate, currentDate) && isSameYear(o.relevantDate, currentDate)
                ).length;

                return {
                    ...member,
                    bottlesSold,
                    monthlyAccountsAchieved,
                    monthlyVisitsAchieved,
                };
            });
            setTeamStats(stats.sort((a,b) => b.bottlesSold - a.bottlesSold));
        } catch (error) {
            console.error("Error loading team tracking data:", error);
            toast({ title: "Error al Cargar Estadísticas", description: "No se pudieron cargar las estadísticas del equipo.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
    loadData();
  }, [toast, dataSignature]); 

  const { totalBottles, totalAccounts, totalVisits } = useMemo(() => {
    return teamStats.reduce((acc, member) => ({
      totalBottles: acc.totalBottles + member.bottlesSold,
      totalAccounts: acc.totalAccounts + member.monthlyAccountsAchieved,
      totalVisits: acc.totalVisits + member.monthlyVisitsAchieved
    }), { totalBottles: 0, totalAccounts: 0, totalVisits: 0 });
  }, [teamStats]);
  

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando datos del equipo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Rendimiento del Equipo de Ventas</h1>
      </header>
      
      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Rendimiento Individual y Objetivos del Equipo de Ventas</CardTitle>
          <CardDescription>Visualiza el rendimiento general e individual de los representantes de ventas, incluyendo progreso hacia objetivos y métricas clave.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[25%]">Representante</TableHead>
                <TableHead className="text-right w-[15%]">Botellas Vendidas (Total)</TableHead>
                <TableHead className="text-center w-[20%]">Progreso Cuentas (Mes)</TableHead>
                <TableHead className="text-center w-[20%]">Progreso Visitas (Mes)</TableHead>
                <TableHead className="text-right w-[20%]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamStats.length > 0 ? teamStats.map((member) => {
                const targetAccounts = member.monthlyTargetAccounts || 0;
                const targetVisits = member.monthlyTargetVisits || 0;
                
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={member.avatarUrl || `https://placehold.co/40x40.png?text=${member.name.split(' ').map(n => n[0]).join('')}`} alt={member.name} data-ai-hint="person portrait" />
                          <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                           <Link href={`/team-tracking/${member.id}`} className="font-medium hover:underline text-primary">
                            {member.name}
                          </Link>
                           <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <FormattedNumericValue value={member.bottlesSold} locale="es-ES" />
                    </TableCell>
                    <TableCell>
                      {renderProgress(member.monthlyAccountsAchieved, targetAccounts, "cuentas", "¡Obj. Cuentas Cumplido!")}
                    </TableCell>
                    <TableCell>
                       {renderProgress(member.monthlyVisitsAchieved, targetVisits, "visitas", "¡Obj. Visitas Cumplido!")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/team-tracking/${member.id}`}>
                          <Eye className="mr-1 h-3 w-3" /> Ver Perfil
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No hay representantes de ventas configurados o no se encontraron datos.
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Botellas del Equipo</CardTitle> 
            <Package className="h-5 w-5 text-muted-foreground" /> 
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <FormattedNumericValue value={totalBottles} locale="es-ES" />
            </div>
            <p className="text-xs text-muted-foreground">Suma de todas las botellas vendidas por el equipo.</p>
          </CardContent>
        </Card>
        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cuentas Nuevas (Mes)</CardTitle>
            <Briefcase className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <FormattedNumericValue value={totalAccounts} locale="es-ES" />
            </div>
            <p className="text-xs text-muted-foreground">Suma de cuentas nuevas este mes por el equipo.</p>
          </CardContent>
        </Card>
        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visitas (Mes)</CardTitle>
            <Footprints className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                 <FormattedNumericValue value={totalVisits} locale="es-ES" />
            </div>
            <p className="text-xs text-muted-foreground">Suma de todas las interacciones registradas este mes.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
