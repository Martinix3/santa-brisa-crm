
"use client";

import React, { useMemo, useState, useEffect } from "react";
import type { Order, Account, TeamMember, UserRole, Kpi, StrategicObjective } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { getOrdersFS } from "@/services/order-service";
import { getAccountsFS } from "@/services/account-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { parseISO, isSameYear, isSameMonth, isValid } from 'date-fns';
import { Loader2 } from "lucide-react";
import {
  kpiDataLaunch as initialKpiDataLaunch,
  mockStrategicObjectives
} from "@/lib/launch-dashboard-data";
import { VALID_SALE_STATUSES, ALL_VISIT_STATUSES } from "@/lib/constants";

// Import new widget components
import { KpiGrid } from "@/components/app/dashboard/kpi-grid";
import { MonthlyProgress } from "@/components/app/dashboard/monthly-progress";
import { SalesDistributionChart } from "@/components/app/dashboard/sales-distribution-chart";
import { StrategicObjectivesList } from "@/components/app/dashboard/strategic-objectives-list";
import { PieChart, Pie, Cell, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";


export default function DashboardPage() {
  const { userRole, teamMember, dataSignature } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [salesReps, setSalesReps] = useState<TeamMember[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const [fetchedOrders, fetchedAccounts, fetchedTeamMembers] = await Promise.all([
          getOrdersFS(),
          getAccountsFS(),
          getTeamMembersFS(['SalesRep']),
        ]);
        setOrders(fetchedOrders);
        setAccounts(fetchedAccounts);
        setSalesReps(fetchedTeamMembers);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, [dataSignature]);

  const dashboardData = useMemo(() => {
    if (isLoading) return null;

    const salesRepNamesSet = new Set(salesReps.map(m => m.name));
    const currentDate = new Date();

    let totalBottlesSoldOverall = 0;
    let teamBottlesSoldOverall = 0;
    let ordersFromExistingCustomersCount = 0;
    let totalValidOrdersCount = 0;

    const successfulOrders = orders
      .filter(o => VALID_SALE_STATUSES.includes(o.status) && (o.createdAt || o.visitDate))
      .map(o => ({
        ...o,
        // Use createdAt for accuracy, fallback to visitDate for older records
        relevantDate: parseISO(o.createdAt || o.visitDate),
      }))
      .filter(o => isValid(o.relevantDate))
      .sort((a,b) => a.relevantDate.getTime() - b.relevantDate.getTime());

    for (const order of successfulOrders) {
      if (order.numberOfUnits) {
        totalBottlesSoldOverall += order.numberOfUnits;
        if (salesRepNamesSet.has(order.salesRep)) {
          teamBottlesSoldOverall += order.numberOfUnits;
        }
      }
      totalValidOrdersCount++;
      if (order.clientStatus === 'existing') {
        ordersFromExistingCustomersCount++;
      }
    }
    
    // Correct "New Account" calculation
    const firstOrderDateByAccount = new Map<string, Date>();
    for (const order of successfulOrders) {
        if (order.accountId && !firstOrderDateByAccount.has(order.accountId)) {
            firstOrderDateByAccount.set(order.accountId, order.relevantDate);
        }
    }
    
    const accountsCreatedByTeamThisYear = new Set<string>();
    const accountsCreatedByTeamThisMonth = new Set<string>();
    
    for (const [accountId, firstOrderDate] of firstOrderDateByAccount.entries()) {
      const order = successfulOrders.find(o => o.accountId === accountId);
      if(order && salesRepNamesSet.has(order.salesRep)) {
          if (isSameYear(firstOrderDate, currentDate)) {
              accountsCreatedByTeamThisYear.add(accountId);
          }
          if (isSameMonth(firstOrderDate, currentDate)) {
              accountsCreatedByTeamThisMonth.add(accountId);
          }
      }
    }

    const calculatedKpis = initialKpiDataLaunch.map(kpi => {
      let currentValue = 0;
      switch(kpi.id) {
        case 'kpi1': currentValue = totalBottlesSoldOverall; break;
        case 'kpi2': currentValue = teamBottlesSoldOverall; break;
        case 'kpi3': currentValue = accountsCreatedByTeamThisYear.size; break;
        case 'kpi4': currentValue = accountsCreatedByTeamThisMonth.size; break;
        case 'kpi5':
          currentValue = totalValidOrdersCount > 0 
            ? Math.round((ordersFromExistingCustomersCount / totalValidOrdersCount) * 100) 
            : 0;
          break;
      }
      return { ...kpi, currentValue };
    });

    // Monthly progress calculations
    let monthlyProgressMetrics: any[] = [];
    if(userRole === 'SalesRep' && teamMember) {
      const monthlyAccounts = Array.from(accountsCreatedByTeamThisMonth).filter(id => successfulOrders.find(o => o.accountId === id)?.salesRep === teamMember.name).length;
      const monthlyVisits = orders.filter(o => 
        o.salesRep === teamMember.name && 
        isValid(parseISO(o.visitDate)) && 
        isSameMonth(parseISO(o.visitDate), currentDate) &&
        ALL_VISIT_STATUSES.includes(o.status)
      ).length;

      monthlyProgressMetrics = [
        { title: "Cuentas Nuevas (Este Mes)", target: teamMember.monthlyTargetAccounts || 0, current: monthlyAccounts, unit: 'cuentas', colorClass: "[&>div]:bg-primary" },
        { title: "Visitas Realizadas (Este Mes)", target: teamMember.monthlyTargetVisits || 0, current: monthlyVisits, unit: 'visitas', colorClass: "[&>div]:bg-primary" },
      ];
    } else if (userRole === 'Admin') {
       const teamMonthlyTargetAccounts = salesReps.reduce((sum, rep) => sum + (rep.monthlyTargetAccounts || 0), 0);
       const teamMonthlyTargetVisits = salesReps.reduce((sum, rep) => sum + (rep.monthlyTargetVisits || 0), 0);
       const teamMonthlyVisits = orders.filter(o => 
          salesRepNamesSet.has(o.salesRep) && 
          isValid(parseISO(o.visitDate)) && 
          isSameMonth(parseISO(o.visitDate), currentDate) &&
          ALL_VISIT_STATUSES.includes(o.status)
        ).length;

      monthlyProgressMetrics = [
        { title: "Cuentas Nuevas del Equipo (Este Mes)", target: teamMonthlyTargetAccounts, current: accountsCreatedByTeamThisMonth.size, unit: 'cuentas', colorClass: "[&>div]:bg-[hsl(var(--brand-turquoise-hsl))]" },
        { title: "Visitas del Equipo (Este Mes)", target: teamMonthlyTargetVisits, current: teamMonthlyVisits, unit: 'visitas', colorClass: "[&>div]:bg-[hsl(var(--brand-turquoise-hsl))]" },
      ];
    }
    
    // Chart data
    const kpiVentasEquipo = calculatedKpis.find(k => k.id === 'kpi2');
    const objetivoTotalVentasEquipo = kpiVentasEquipo?.targetValue ?? 0;
    const ventasEquipoActuales = kpiVentasEquipo?.currentValue ?? 0;
    const faltanteVentasEquipo = Math.max(0, objetivoTotalVentasEquipo - ventasEquipoActuales);
    const progresoVentasEquipoData = [
        { name: "Alcanzado", value: ventasEquipoActuales, color: "hsl(var(--brand-turquoise-hsl))" },
        { name: "Faltante", value: faltanteVentasEquipo, color: "hsl(var(--muted))" },
    ];
    
    const kpiCuentasAnual = calculatedKpis.find(k => k.id === 'kpi3');
    const objetivoTotalCuentasEquipoAnual = kpiCuentasAnual?.targetValue ?? 0;
    const cuentasEquipoActualesAnual = kpiCuentasAnual?.currentValue ?? 0;
    const faltanteCuentasEquipoAnual = Math.max(0, objetivoTotalCuentasEquipoAnual - cuentasEquipoActualesAnual);
    const progresoCuentasEquipoData = [
        { name: "Alcanzado", value: cuentasEquipoActualesAnual, color: "hsl(var(--brand-turquoise-hsl))" },
        { name: "Faltante", value: faltanteCuentasEquipoAnual, color: "hsl(var(--muted))" },
    ];

    return {
      kpis: calculatedKpis,
      monthlyProgressTitle: userRole === 'Admin' ? "Progreso Mensual del Equipo" : "Tu Progreso Mensual",
      showMonthlyProgress: userRole === 'Admin' || userRole === 'SalesRep',
      monthlyProgressMetrics,
      teamSales: teamBottlesSoldOverall,
      otherSales: Math.max(0, totalBottlesSoldOverall - teamBottlesSoldOverall),
      progresoVentasEquipoData,
      progresoCuentasEquipoData,
      objectives: mockStrategicObjectives,
    };
  }, [isLoading, orders, accounts, salesReps, userRole, teamMember]);

  if (isLoading || !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8" role="status" aria-live="polite">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando datos del dashboard...</p>
      </div>
    );
  }

  const {
    kpis,
    monthlyProgressTitle,
    showMonthlyProgress,
    monthlyProgressMetrics,
    teamSales,
    otherSales,
    progresoVentasEquipoData,
    progresoCuentasEquipoData,
    objectives
  } = dashboardData;

  const showDashboardContent = userRole === 'Admin' || userRole === 'SalesRep' || userRole === 'Distributor' || userRole === 'Clavadista';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold">Panel Principal: Lanzamiento de Producto</h1>
      
      {showDashboardContent && (
        <>
          <KpiGrid kpis={kpis} />
          {showMonthlyProgress && monthlyProgressMetrics.length > 0 && (
            <MonthlyProgress title={monthlyProgressTitle} metrics={monthlyProgressMetrics} />
          )}

          <section className="grid gap-6 md:grid-cols-3">
            <SalesDistributionChart teamSales={teamSales} otherSales={otherSales} />
            
            <div className="space-y-6 md:col-span-1">
                 <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
                    <CardHeader>
                    <CardTitle>Progreso Ventas del Equipo</CardTitle>
                    <CardDescription>Seguimiento del objetivo anual de ventas en botellas para el equipo comercial.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[150px] flex items-center justify-center">
                    <ChartContainer config={{}} className="h-full w-full aspect-square" aria-label="Gráfico de progreso de ventas del equipo">
                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <Pie data={progresoVentasEquipoData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={2} labelLine={false}>
                                {progresoVentasEquipoData.map((entry) => (<Cell key={`cell-${entry.name}`} fill={entry.color} stroke={entry.color} /> ))}
                            </Pie>
                             <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator formatter={(value, name, props) => ( <div className="flex flex-col items-center"> <span className="font-medium text-sm" style={{color: props.payload?.color}}>{props.payload?.name}</span> <span className="text-xs"><FormattedNumericValue value={props.payload?.value as number} /> botellas</span> </div> )}/>} />
                             <Legend verticalAlign="bottom" height={36} content={({ payload }) => ( <ul className="flex items-center justify-center gap-x-4 text-xs"> {payload?.map((entry) => ( <li key={`item-${entry.value}`} className="flex items-center gap-1"> <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} /> {entry.value} </li> ))} </ul> )}/>
                        </PieChart>
                    </ChartContainer>
                    </CardContent>
                </Card>
                
                <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
                    <CardHeader>
                    <CardTitle>Progreso Cuentas Equipo (Anual)</CardTitle>
                    <CardDescription>Seguimiento del objetivo anual de creación de nuevas cuentas para el equipo comercial.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[150px] flex items-center justify-center">
                        <ChartContainer config={{}} className="h-full w-full aspect-square" aria-label="Gráfico de progreso de cuentas anuales del equipo">
                            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                <Pie data={progresoCuentasEquipoData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={2} labelLine={false}>
                                    {progresoCuentasEquipoData.map((entry) => ( <Cell key={`cell-${entry.name}`} fill={entry.color} stroke={entry.color}/> ))}
                                </Pie>
                                <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator formatter={(value, name, props) => ( <div className="flex flex-col items-center"> <span className="font-medium text-sm" style={{color: props.payload?.color}}>{props.payload?.name}</span> <span className="text-xs"><FormattedNumericValue value={props.payload?.value as number} /> cuentas</span> </div> )}/>} />
                                <Legend verticalAlign="bottom" height={36} content={({ payload }) => ( <ul className="flex items-center justify-center gap-x-4 text-xs"> {payload?.map((entry) => ( <li key={`item-${entry.value}`} className="flex items-center gap-1"> <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} /> {entry.value} </li> ))} </ul> )}/>
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
          </section>

          <StrategicObjectivesList objectives={objectives} />
        </>
      )}
    </div>
  );
}
