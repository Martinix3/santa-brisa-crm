
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Kpi, StrategicObjective, Order, Account, TeamMember } from "@/types";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, LabelList, PieChart, Pie, Cell, Legend } from "recharts";
import { Progress } from "@/components/ui/progress";
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';
import { cn } from "@/lib/utils";
import {
  kpiDataLaunch, 
  objetivoTotalVentasEquipo, 
  objetivoTotalCuentasEquipoAnual,
  mockStrategicObjectives
} from "@/lib/launch-dashboard-data";
import { mockOrders, mockAccounts, mockTeamMembers } from "@/lib/data"; 
import { CheckCircle2, Circle } from "lucide-react";
import { parseISO, getYear, getMonth, isSameYear, isSameMonth } from 'date-fns';
import { useAuth } from "@/contexts/auth-context"; 

const distributionChartConfig = {
  value: { label: "Botellas" },
  VentasEquipo: { label: "Ventas Equipo", color: "hsl(var(--brand-turquoise-hsl))" }, // Actualizado a turquesa
  RestoCanales: { label: "Resto Canales", color: "hsl(var(--primary))" }, // Actualizado a primario (amarillo)
};

const calculateProgressValue = (current: number, target: number): number => {
  if (target <= 0) return current > 0 ? 100 : 0;
  return Math.min((current / target) * 100, 100);
};


export default function DashboardPage() {
  const { userRole, teamMember } = useAuth(); 

  const calculatedKpiData = React.useMemo(() => {
    const validOrderStatusesForSales = ['Confirmado', 'Procesando', 'Enviado', 'Entregado'];
    const salesTeamMemberIds = mockTeamMembers
        .filter(m => m.role === 'SalesRep' || m.role === 'Admin')
        .map(m => m.id);
    
    let totalBottlesSoldOverall = 0;
    let teamBottlesSoldOverall = 0;
    let accountsCreatedByTeamThisYear = 0;
    let accountsCreatedByTeamThisMonth = 0; 
    let ordersFromExistingCustomersCount = 0;
    let totalValidOrdersCount = 0;

    mockOrders.forEach(order => {
      if (validOrderStatusesForSales.includes(order.status)) {
        if (order.numberOfUnits) {
          totalBottlesSoldOverall += order.numberOfUnits;
          const orderSalesRep = mockTeamMembers.find(m => m.name === order.salesRep);
          if (orderSalesRep && (orderSalesRep.role === 'SalesRep' || orderSalesRep.role === 'Admin')) {
            teamBottlesSoldOverall += order.numberOfUnits;
          }
        }
        totalValidOrdersCount++;
        if (order.clientStatus === 'existing') {
          ordersFromExistingCustomersCount++;
        }
      }
    });

    const currentDate = new Date();
    const currentYear = getYear(currentDate);
    const currentMonth = getMonth(currentDate);

    const uniqueAccountIdsByTeamThisYear = new Set<string>();
    const uniqueAccountIdsByTeamThisMonth = new Set<string>();

    mockAccounts.forEach(account => {
      if (account.salesRepId && salesTeamMemberIds.includes(account.salesRepId)) {
        const accountCreationDate = parseISO(account.createdAt);
        if (isSameYear(accountCreationDate, currentDate)) {
           uniqueAccountIdsByTeamThisYear.add(account.id);
        }
        if (isSameMonth(accountCreationDate, currentDate) && isSameYear(accountCreationDate, currentDate)) {
           uniqueAccountIdsByTeamThisMonth.add(account.id);
        }
      }
    });
    accountsCreatedByTeamThisYear = uniqueAccountIdsByTeamThisYear.size;
    accountsCreatedByTeamThisMonth = uniqueAccountIdsByTeamThisMonth.size; 

    return kpiDataLaunch.map(kpi => {
      let newCurrentValue = 0;
      const originalKpi = kpiDataLaunch.find(ik => ik.id === kpi.id); 
      switch (kpi.id) {
        case 'kpi1': newCurrentValue = totalBottlesSoldOverall; break;
        case 'kpi2': newCurrentValue = teamBottlesSoldOverall; break;
        case 'kpi3': newCurrentValue = accountsCreatedByTeamThisYear; break;
        case 'kpi4': newCurrentValue = accountsCreatedByTeamThisMonth; break; 
        case 'kpi5':
          newCurrentValue = totalValidOrdersCount > 0 
            ? Math.round((ordersFromExistingCustomersCount / totalValidOrdersCount) * 100) 
            : 0;
          break;
        default: newCurrentValue = kpi.currentValue; 
      }
      return {
        ...kpi, 
        icon: originalKpi?.icon, 
        currentValue: newCurrentValue,
      };
    });
  }, []); 

  const currentMonthNewAccountsByRep = React.useMemo(() => {
    if (!teamMember) return 0; 
    const currentDate = new Date();
    return mockAccounts.filter(acc => 
      acc.salesRepId === teamMember.id &&
      isSameMonth(parseISO(acc.createdAt), currentDate) &&
      isSameYear(parseISO(acc.createdAt), currentDate)
    ).length;
  }, [teamMember]);

  const currentMonthVisitsByRep = React.useMemo(() => {
    if (!teamMember) return 0; 
    const currentDate = new Date();
    return mockOrders.filter(order =>
      order.salesRep === teamMember.name &&
      isSameMonth(parseISO(order.visitDate), currentDate) &&
      isSameYear(parseISO(order.visitDate), currentDate)
    ).length;
  }, [teamMember]);


  const kpiVentasTotales = calculatedKpiData.find(k => k.id === 'kpi1');
  const kpiVentasEquipo = calculatedKpiData.find(k => k.id === 'kpi2');
  const kpiCuentasAnual = calculatedKpiData.find(k => k.id === 'kpi3');

  const ventasTotalesActuales = kpiVentasTotales?.currentValue ?? 0;
  const ventasEquipoActuales = kpiVentasEquipo?.currentValue ?? 0;
  const restoCanalesVentas = ventasTotalesActuales - ventasEquipoActuales;

  const ventasDistribucionData = [
    { name: "Ventas Equipo", value: ventasEquipoActuales, fill: "hsl(var(--brand-turquoise-hsl))" }, // Actualizado a turquesa
    { name: "Resto Canales", value: restoCanalesVentas, fill: "hsl(var(--primary))" }, // Actualizado a primario (amarillo)
  ];

  const faltanteVentasEquipo = Math.max(0, objetivoTotalVentasEquipo - ventasEquipoActuales);
  const progresoVentasEquipoData = [
    { name: "Alcanzado", value: ventasEquipoActuales, color: "hsl(var(--brand-turquoise-hsl))" },
    { name: "Faltante", value: faltanteVentasEquipo, color: "hsl(var(--muted))" },
  ];

  const cuentasEquipoActualesAnual = kpiCuentasAnual?.currentValue ?? 0;
  const faltanteCuentasEquipoAnual = Math.max(0, objetivoTotalCuentasEquipoAnual - cuentasEquipoActualesAnual);
  const progresoCuentasEquipoData = [
    { name: "Alcanzado", value: cuentasEquipoActualesAnual, color: "hsl(var(--brand-turquoise-hsl))" },
    { name: "Faltante", value: faltanteCuentasEquipoAnual, color: "hsl(var(--muted))" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold">Panel de Lanzamiento de Producto</h1>
      
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {calculatedKpiData.map((kpi: Kpi) => {
          const progress = kpi.targetValue > 0 ? Math.min((kpi.currentValue / kpi.targetValue) * 100, 100) : (kpi.currentValue > 0 ? 100 : 0);
          const isTurquoiseKpi = ['kpi2', 'kpi3', 'kpi4'].includes(kpi.id);
          const isPrimaryKpi = kpi.id === 'kpi1';
          const isAccentKpi = kpi.id === 'kpi5';
          
          let progressBarClass = "";
          if (isTurquoiseKpi) progressBarClass = "[&>div]:bg-[hsl(var(--brand-turquoise-hsl))]";
          else if (isPrimaryKpi) progressBarClass = "[&>div]:bg-primary";
          else if (isAccentKpi) progressBarClass = "[&>div]:bg-accent";

          return (
            <Card key={kpi.id} className="shadow-subtle hover:shadow-md transition-shadow duration-300">
              <CardHeader className="pb-2">
                <div className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                  {kpi.icon && <kpi.icon className="h-5 w-5 text-muted-foreground" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold">
                  <FormattedNumericValue value={kpi.currentValue} locale="es-ES" />
                  {kpi.unit === '%' && '%'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Objetivo: <FormattedNumericValue value={kpi.targetValue} locale="es-ES" /> {kpi.unit}
                </p>
                <Progress
                  value={progress}
                  aria-label={`${progress.toFixed(0)}% completado`}
                  className={cn("h-2", progressBarClass)}
                />
              </CardContent>
            </Card>
          );
        })}
      </section>

      {(userRole === 'SalesRep' || userRole === 'Admin') && teamMember && (
        <section className="mt-6">
          <h2 className="text-2xl font-headline font-semibold mb-4">Tu Progreso Mensual Personal</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
              <CardHeader>
                <CardTitle>Cuentas Nuevas (Este Mes)</CardTitle>
                <CardDescription>
                  Objetivo: <FormattedNumericValue value={teamMember.monthlyTargetAccounts || 0} locale="es-ES" /> cuentas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <FormattedNumericValue value={currentMonthNewAccountsByRep} locale="es-ES" />
                </div>
                <Progress 
                  value={calculateProgressValue(currentMonthNewAccountsByRep, teamMember.monthlyTargetAccounts || 0)} 
                  className={cn("mt-2 h-2", calculateProgressValue(currentMonthNewAccountsByRep, teamMember.monthlyTargetAccounts || 0) >= 100 ? "[&>div]:bg-green-500" : "[&>div]:bg-primary")} 
                />
                 <p className="text-xs text-muted-foreground mt-1">
                    {currentMonthNewAccountsByRep >= (teamMember.monthlyTargetAccounts || 0) && (teamMember.monthlyTargetAccounts || 0) > 0
                      ? "¡Objetivo mensual cumplido!"
                      : `Faltan: ${Math.max(0, (teamMember.monthlyTargetAccounts || 0) - currentMonthNewAccountsByRep)} cuentas`}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
              <CardHeader>
                <CardTitle>Visitas Realizadas (Este Mes)</CardTitle>
                <CardDescription>
                  Objetivo: <FormattedNumericValue value={teamMember.monthlyTargetVisits || 0} locale="es-ES" /> visitas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <FormattedNumericValue value={currentMonthVisitsByRep} locale="es-ES" />
                </div>
                <Progress 
                    value={calculateProgressValue(currentMonthVisitsByRep, teamMember.monthlyTargetVisits || 0)} 
                    className={cn("mt-2 h-2", calculateProgressValue(currentMonthVisitsByRep, teamMember.monthlyTargetVisits || 0) >= 100 ? "[&>div]:bg-green-500" : "[&>div]:bg-primary")} 
                />
                <p className="text-xs text-muted-foreground mt-1">
                    {currentMonthVisitsByRep >= (teamMember.monthlyTargetVisits || 0) && (teamMember.monthlyTargetVisits || 0) > 0
                      ? "¡Objetivo mensual cumplido!"
                      : `Faltan: ${Math.max(0, (teamMember.monthlyTargetVisits || 0) - currentMonthVisitsByRep)} visitas`}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      <section className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <CardTitle>Distribución de Ventas (Botellas)</CardTitle>
            <CardDescription>Comparativa de ventas del equipo vs. otros canales.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pr-0">
            <ChartContainer config={distributionChartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ventasDistribucionData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(value) => `${value / 1000}k`} />
                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={100} />
                  <ChartTooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="value" radius={4}>
                    {ventasDistribucionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                    <LabelList dataKey="value" position="right" offset={8} className="fill-foreground" fontSize={12} formatter={(value: number) => value.toLocaleString('es-ES')} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="space-y-6 md:col-span-1">
          <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
            <CardHeader>
              <CardTitle>Progreso Ventas del Equipo</CardTitle>
              <CardDescription>Objetivo: <FormattedNumericValue value={objetivoTotalVentasEquipo} locale="es-ES" /> botellas</CardDescription>
            </CardHeader>
            <CardContent className="h-[150px] flex items-center justify-center">
              <ChartContainer config={{}} className="h-full w-full aspect-square">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={progresoVentasEquipoData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="80%"
                      paddingAngle={2}
                      labelLine={false}
                    >
                      {progresoVentasEquipoData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator formatter={(value, name, props) => (
                        <div className="flex flex-col items-center">
                           <span className="font-medium text-sm" style={{color: props.payload?.color}}>{props.payload?.name}</span>
                           <span className="text-xs"><FormattedNumericValue value={props.payload?.value} /> botellas</span>
                        </div>
                    )} />} />
                     <Legend verticalAlign="bottom" height={36} content={({ payload }) => (
                        <ul className="flex items-center justify-center gap-x-4 text-xs">
                        {payload?.map((entry, index) => (
                            <li key={`item-${index}`} className="flex items-center gap-1">
                            <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            {entry.value}
                            </li>
                        ))}
                        </ul>
                    )}/>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
          
          <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
            <CardHeader>
              <CardTitle>Progreso Cuentas Equipo (Anual)</CardTitle>
              <CardDescription>Objetivo: <FormattedNumericValue value={objetivoTotalCuentasEquipoAnual} locale="es-ES" /> cuentas</CardDescription>
            </CardHeader>
            <CardContent className="h-[150px] flex items-center justify-center">
                <ChartContainer config={{}} className="h-full w-full aspect-square">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Pie
                        data={progresoCuentasEquipoData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="80%"
                        paddingAngle={2}
                        labelLine={false}
                        >
                        {progresoCuentasEquipoData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color}/>
                        ))}
                        </Pie>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator formatter={(value, name, props) => (
                             <div className="flex flex-col items-center">
                               <span className="font-medium text-sm" style={{color: props.payload?.color}}>{props.payload?.name}</span>
                               <span className="text-xs"><FormattedNumericValue value={props.payload?.value} /> cuentas</span>
                            </div>
                        )} />} />
                        <Legend verticalAlign="bottom" height={36} content={({ payload }) => (
                            <ul className="flex items-center justify-center gap-x-4 text-xs">
                            {payload?.map((entry, index) => (
                                <li key={`item-${index}`} className="flex items-center gap-1">
                                <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                {entry.value}
                                </li>
                            ))}
                            </ul>
                        )}/>
                    </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
            <CardHeader>
                <CardTitle>Objetivos Estratégicos Clave</CardTitle>
                <CardDescription>Un vistazo rápido a los objetivos estratégicos actuales de la empresa.</CardDescription>
            </CardHeader>
            <CardContent>
                {mockStrategicObjectives.length > 0 ? (
                    <ul className="space-y-3">
                        {mockStrategicObjectives.slice(0, 5).map((objective: StrategicObjective) => (
                            <li key={objective.id} className="flex items-start space-x-3 p-3 bg-secondary/20 rounded-md shadow-sm">
                                {objective.completed ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                    <Circle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                )}
                                <p className={cn("text-sm", objective.completed && "line-through text-muted-foreground")}>
                                    {objective.text}
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">No hay objetivos estratégicos definidos.</p>
                )}
                {mockStrategicObjectives.length > 5 && (
                    <p className="text-xs text-muted-foreground mt-3">
                        Y {mockStrategicObjectives.length - 5} más objetivos. Ver todos en Configuración.
                    </p>
                )}
            </CardContent>
        </Card>
      </section>

    </div>
  );
}
    

    