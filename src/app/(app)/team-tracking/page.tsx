
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TeamMember } from "@/types";
import { mockTeamMembers } from "@/lib/data";
import { Package, Briefcase, Footprints, Users } from 'lucide-react'; // Changed Walking to Footprints
import { ChartContainer } from "@/components/ui/chart";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const chartConfig = (color: string) => ({
  bottles: { 
    label: "Botellas", 
    color: color,
  },
});

const renderProgress = (current: number, target: number, unit: string, targetAchievedText: string) => {
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : (current > 0 ? 100 : 0); // Cap progress at 100% if target is 0 but current is >0
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
         target === 0 && current > 0 ? targetAchievedText : // If no target but has value, consider achieved
         targetAchieved ? targetAchievedText : 
         `Faltan: ${remaining.toLocaleString('es-ES')}`}
      </p>
    </div>
  );
};


export default function TeamTrackingPage() {
  const salesTeamMembers = useMemo(() => mockTeamMembers.filter(m => m.role === 'SalesRep'), []);

  const teamTotalBottlesValue = useMemo(() => salesTeamMembers.reduce((sum, m) => sum + (m.bottlesSold || 0), 0), [salesTeamMembers]);
  const teamTotalOrdersValue = useMemo(() => salesTeamMembers.reduce((sum, m) => sum + (m.orders || 0), 0), [salesTeamMembers]); // Used as "cuentas"
  const teamTotalVisitsValue = useMemo(() => salesTeamMembers.reduce((sum, m) => sum + (m.visits || 0), 0), [salesTeamMembers]);
  
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
                <TableHead className="w-[200px]">Representante</TableHead>
                <TableHead className="text-right">Botellas Vendidas</TableHead>
                <TableHead className="text-center w-[200px]">Progreso Cuentas (Mes)</TableHead>
                <TableHead className="text-center w-[200px]">Progreso Visitas (Mes)</TableHead>
                <TableHead className="w-[180px] text-center">Tendencia Mensual (Botellas)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesTeamMembers.map((member: TeamMember) => {
                const bottlesSold = member.bottlesSold || 0;
                const accountsAchieved = member.orders || 0;
                const visitsMade = member.visits || 0;
                const targetAccounts = member.monthlyTargetAccounts || 0;
                const targetVisits = member.monthlyTargetVisits || 0;
                
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
                           <p className="text-xs text-muted-foreground">{member.role === 'SalesRep' ? 'Rep. Ventas' : member.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <FormattedNumericValue value={bottlesSold} locale="es-ES" />
                    </TableCell>
                    <TableCell className="w-[200px]">
                      {renderProgress(accountsAchieved, targetAccounts, "cuentas", "¡Obj. Cuentas Cumplido!")}
                    </TableCell>
                    <TableCell className="w-[200px]">
                       {renderProgress(visitsMade, targetVisits, "visitas", "¡Obj. Visitas Cumplido!")}
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

