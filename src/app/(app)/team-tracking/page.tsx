
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TeamMember } from "@/types";
import { mockTeamMembers } from "@/lib/data"; // globalTeamMonthlyTarget will be calculated dynamically
import { Package, ShoppingCart, Users, Target } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const chartConfig = (color: string) => ({
  bottles: { 
    label: "Botellas", 
    color: color,
  },
});

export default function TeamTrackingPage() {
  const salesTeamMembers = useMemo(() => mockTeamMembers.filter(m => m.role === 'SalesRep'), [mockTeamMembers]);

  const teamTotalBottlesValue = useMemo(() => salesTeamMembers.reduce((sum, m) => sum + (m.bottlesSold || 0), 0), [salesTeamMembers]);
  const teamTotalOrdersValue = useMemo(() => salesTeamMembers.reduce((sum, m) => sum + (m.orders || 0), 0), [salesTeamMembers]);
  const teamTotalVisitsValue = useMemo(() => salesTeamMembers.reduce((sum, m) => sum + (m.visits || 0), 0), [salesTeamMembers]);
  
  const globalTeamMonthlyTarget = useMemo(() => salesTeamMembers.reduce((sum, m) => sum + (m.monthlyTarget || 0), 0), [salesTeamMembers]);

  const teamGlobalProgress = globalTeamMonthlyTarget > 0 ? (teamTotalBottlesValue / globalTeamMonthlyTarget) * 100 : 0;
  const teamGlobalRemaining = Math.max(0, globalTeamMonthlyTarget - teamTotalBottlesValue);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold">Seguimiento de Equipo de Ventas</h1>
      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Rendimiento del Equipo de Ventas</CardTitle>
          <CardDescription>Métricas de rendimiento individual y progreso hacia objetivos mensuales de los Representantes de Ventas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Representante</TableHead>
                <TableHead className="text-right">Botellas Vendidas</TableHead>
                <TableHead className="text-center">Progreso Objetivo Mensual</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Visitas</TableHead>
                <TableHead className="w-[200px] text-center">Tendencia Mensual (Botellas)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesTeamMembers.map((member: TeamMember) => {
                const bottlesSold = member.bottlesSold || 0;
                const monthlyTarget = member.monthlyTarget || 0;
                const progress = monthlyTarget > 0 ? (bottlesSold / monthlyTarget) * 100 : 0;
                const remaining = Math.max(0, monthlyTarget - bottlesSold);
                const targetAchieved = bottlesSold >= monthlyTarget;
                
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={member.avatarUrl || `https://placehold.co/100x100.png?text=${member.name.split(' ').map(n => n[0]).join('')}`} alt={member.name} data-ai-hint="person portrait" />
                          <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          {/* Role display can be generic or specific if needed */}
                           <p className="text-xs text-muted-foreground">{member.role === 'SalesRep' ? 'Rep. Ventas' : member.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <FormattedNumericValue value={bottlesSold} locale="es-ES" />
                    </TableCell>
                    <TableCell className="w-[200px]">
                      <div className="flex flex-col items-center">
                        <Progress value={progress} className="h-2 mb-1 w-full [&>div]:bg-primary" aria-label={`${progress.toFixed(0)}% del objetivo mensual`} />
                        <p className="text-xs text-muted-foreground text-center">
                          {targetAchieved && monthlyTarget > 0
                            ? `¡Objetivo Cumplido! (+${(bottlesSold - monthlyTarget).toLocaleString('es-ES')})`
                            : monthlyTarget > 0 ? `Faltan: ${remaining.toLocaleString('es-ES')}` : "Sin objetivo"}
                        </p>
                         <p className="text-xs text-muted-foreground/80 text-center">
                            {monthlyTarget > 0 ? `Meta: ${monthlyTarget.toLocaleString('es-ES')}` : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <FormattedNumericValue value={member.orders || 0} locale="es-ES" />
                    </TableCell>
                    <TableCell className="text-right">
                      <FormattedNumericValue value={member.visits || 0} locale="es-ES" />
                    </TableCell>
                    <TableCell className="p-0 h-[60px]">
                      {member.performanceData && member.performanceData.length > 0 && (
                        <ChartContainer config={chartConfig('hsl(var(--primary))')} className="h-full w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={member.performanceData.map(d => ({...d, month: d.month.substring(0,3)}))} margin={{ top: 10, right: 5, left: 5, bottom: 0 }}>
                              <Line type="monotone" dataKey="bottles" stroke="var(--color-bottles)" strokeWidth={2} dot={false} /> 
                              <Tooltip 
                                cursor={{stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3'}}
                                contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}
                                itemStyle={{color: 'hsl(var(--foreground))'}}
                                formatter={(value: number) => [`${value.toLocaleString('es-ES')} botellas`, 'Botellas']} 
                                labelFormatter={(label: string) => {
                                    const monthMap: { [key: string]: string } = { Ene: 'Enero', Feb: 'Febrero', Mar: 'Marzo', Abr: 'Abril', May: 'Mayo', Jun: 'Junio', Jul: 'Julio', Ago: 'Agosto', Sep: 'Septiembre', Oct: 'Octubre', Nov: 'Noviembre', Dic: 'Diciembre'};
                                    return monthMap[label] || label;
                                }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
               {salesTeamMembers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No hay Representantes de Ventas para mostrar.
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Pedidos Totales del Equipo</CardTitle>
            <ShoppingCart className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <FormattedNumericValue value={teamTotalOrdersValue} locale="es-ES" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitas Totales Equipo</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                 <FormattedNumericValue value={teamTotalVisitsValue} locale="es-ES" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-2">
            <div className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Progreso Objetivo Global Mensual</CardTitle>
                <Target className="h-5 w-5 text-muted-foreground" />
            </div>
             <CardDescription className="text-xs pt-1">
                Objetivo del equipo: <FormattedNumericValue value={globalTeamMonthlyTarget} locale="es-ES" /> botellas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={teamGlobalProgress} className="h-3 mb-2 [&>div]:bg-primary" aria-label={`${teamGlobalProgress.toFixed(0)}% del objetivo global`} />
            <div className="text-sm text-muted-foreground">
              Actual: <FormattedNumericValue value={teamTotalBottlesValue} locale="es-ES" /> / <FormattedNumericValue value={globalTeamMonthlyTarget} locale="es-ES" />
            </div>
            <p className={cn("text-xs mt-1", teamTotalBottlesValue >= globalTeamMonthlyTarget && globalTeamMonthlyTarget > 0 ? "text-green-600" : "text-muted-foreground")}>
              {globalTeamMonthlyTarget === 0 ? "No hay objetivo global definido." :
               teamTotalBottlesValue >= globalTeamMonthlyTarget
                ? `¡Objetivo Cumplido! (+${(teamTotalBottlesValue - globalTeamMonthlyTarget).toLocaleString('es-ES')})`
                : `Faltan: ${teamGlobalRemaining.toLocaleString('es-ES')} para el objetivo global.`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
