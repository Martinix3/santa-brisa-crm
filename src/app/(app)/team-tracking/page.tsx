
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TeamMember } from "@/types";
import { mockTeamMembers, globalTeamMonthlyTarget } from "@/lib/data";
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
  const teamTotalBottlesValue = useMemo(() => mockTeamMembers.reduce((sum, m) => sum + m.bottlesSold, 0), [mockTeamMembers]);
  const teamTotalOrdersValue = useMemo(() => mockTeamMembers.reduce((sum, m) => sum + m.orders, 0), [mockTeamMembers]);
  const teamTotalVisitsValue = useMemo(() => mockTeamMembers.reduce((sum, m) => sum + m.visits, 0), [mockTeamMembers]);

  const teamGlobalProgress = globalTeamMonthlyTarget > 0 ? (teamTotalBottlesValue / globalTeamMonthlyTarget) * 100 : 0;
  const teamGlobalRemaining = Math.max(0, globalTeamMonthlyTarget - teamTotalBottlesValue);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold">Seguimiento de Equipo</h1>
      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Rendimiento del Equipo de Ventas</CardTitle>
          <CardDescription>Métricas de rendimiento individual y progreso hacia objetivos mensuales.</CardDescription>
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
              {mockTeamMembers.map((member: TeamMember) => {
                const progress = member.monthlyTarget > 0 ? (member.bottlesSold / member.monthlyTarget) * 100 : 0;
                const remaining = Math.max(0, member.monthlyTarget - member.bottlesSold);
                const targetAchieved = member.bottlesSold >= member.monthlyTarget;
                
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="person portrait" />
                          <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <FormattedNumericValue value={member.bottlesSold} locale="es-ES" />
                    </TableCell>
                    <TableCell className="w-[200px]">
                      <div className="flex flex-col items-center">
                        <Progress value={progress} className="h-2 mb-1 w-full [&>div]:bg-primary" aria-label={`${progress.toFixed(0)}% del objetivo mensual`} />
                        <p className="text-xs text-muted-foreground text-center">
                          {targetAchieved
                            ? `¡Objetivo Cumplido! (+${(member.bottlesSold - member.monthlyTarget).toLocaleString('es-ES')})`
                            : `Faltan: ${remaining.toLocaleString('es-ES')}`}
                        </p>
                         <p className="text-xs text-muted-foreground/80 text-center">
                            Meta: {member.monthlyTarget.toLocaleString('es-ES')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <FormattedNumericValue value={member.orders} locale="es-ES" />
                    </TableCell>
                    <TableCell className="text-right">
                      <FormattedNumericValue value={member.visits} locale="es-ES" />
                    </TableCell>
                    <TableCell className="p-0 h-[60px]">
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
                    </TableCell>
                  </TableRow>
                );
              })}
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
            <p className={cn("text-xs mt-1", teamTotalBottlesValue >= globalTeamMonthlyTarget ? "text-green-600" : "text-muted-foreground")}>
              {teamTotalBottlesValue >= globalTeamMonthlyTarget
                ? `¡Objetivo Cumplido! (+${(teamTotalBottlesValue - globalTeamMonthlyTarget).toLocaleString('es-ES')})`
                : `Faltan: ${teamGlobalRemaining.toLocaleString('es-ES')} para el objetivo global.`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
