
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TeamMember } from "@/types";
import { mockTeamMembers } from "@/lib/data";
import { Package, Briefcase, Footprints, Users, Eye } from 'lucide-react';
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
  const salesTeamMembers = useMemo(() => mockTeamMembers.filter(m => m.role === 'SalesRep'), []);

  const teamTotalBottlesValue = useMemo(() => salesTeamMembers.reduce((sum, m) => sum + (m.bottlesSold || 0), 0), [salesTeamMembers]);
  const teamTotalOrdersValue = useMemo(() => salesTeamMembers.reduce((sum, m) => sum + (m.orders || 0), 0), [salesTeamMembers]);
  const teamTotalVisitsValue = useMemo(() => salesTeamMembers.reduce((sum, m) => sum + (m.visits || 0), 0), [salesTeamMembers]);
  
  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Seguimiento de Equipo de Ventas</h1>
      </header>
      
      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Rendimiento del Equipo de Ventas</CardTitle>
          <CardDescription>Métricas de rendimiento individual y progreso hacia objetivos mensuales de los Representantes de Ventas.</CardDescription>
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
              {salesTeamMembers.map((member: TeamMember) => {
                const bottlesSold = member.bottlesSold || 0;
                const accountsAchieved = member.orders || 0; // Using 'orders' as proxy for 'cuentas conseguidas mes' for now
                const visitsMade = member.visits || 0; // Using 'visits' as proxy for 'visitas hechas mes'
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
                           <p className="text-xs text-muted-foreground">{member.role === 'SalesRep' ? 'Rep. Ventas' : member.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <FormattedNumericValue value={bottlesSold} locale="es-ES" />
                    </TableCell>
                    <TableCell>
                      {renderProgress(accountsAchieved, targetAccounts, "cuentas", "¡Obj. Cuentas Cumplido!")}
                    </TableCell>
                    <TableCell>
                       {renderProgress(visitsMade, targetVisits, "visitas", "¡Obj. Visitas Cumplido!")}
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
              })}
               {salesTeamMembers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No hay Representantes de Ventas para mostrar.
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
              <FormattedNumericValue value={teamTotalBottlesValue} locale="es-ES" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cuentas Equipo (Pedidos)</CardTitle>
            <Briefcase className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <FormattedNumericValue value={teamTotalOrdersValue} locale="es-ES" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visitas Equipo</CardTitle>
            <Footprints className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                 <FormattedNumericValue value={teamTotalVisitsValue} locale="es-ES" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
