
"use client";

import React, { useMemo, useState, useEffect } from "react";
import type { Order, Account, TeamMember, UserRole, Kpi, StrategicObjective } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { getOrdersFS } from "@/services/order-service";
import { getAccountsFS } from "@/services/account-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { parseISO, isSameYear, isSameMonth, isValid } from 'date-fns';
import { Loader2, PlusCircle, SendHorizonal, FileText, Target, AlertTriangle } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";


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

    const successfulOrders = orders
      .filter(o => VALID_SALE_STATUSES.includes(o.status) && (o.createdAt || o.visitDate))
      .map(o => ({
        ...o,
        relevantDate: parseISO(o.createdAt || o.visitDate!),
      }))
      .filter(o => isValid(o.relevantDate))
      .sort((a,b) => a.relevantDate.getTime() - b.relevantDate.getTime());

    const totalBottlesSoldOverall = successfulOrders.reduce((sum, o) => sum + (o.numberOfUnits || 0), 0);
    const teamBottlesSoldOverall = successfulOrders.filter(o => salesRepNamesSet.has(o.salesRep)).reduce((sum, o) => sum + (o.numberOfUnits || 0), 0);
    
    // --- CORRECTED/NEW LOGIC ---

    // New Accounts calculation based on Account creation date and status
    const activeAccounts = accounts.filter(acc => 
        acc.status === 'Activo' && acc.createdAt && isValid(parseISO(acc.createdAt))
    );
    const newAccountsThisYear = activeAccounts.filter(acc => isSameYear(parseISO(acc.createdAt!), currentDate)).length;
    const newAccountsThisMonth = activeAccounts.filter(acc => isSameMonth(parseISO(acc.createdAt!), currentDate)).length;
    
    // Repurchase Rate Calculation
    const accountNameMap = new Map<string, string>();
    accounts.forEach(account => {
        if (account.nombre && !accountNameMap.has(account.nombre.toLowerCase().trim())) {
            accountNameMap.set(account.nombre.toLowerCase().trim(), account.id);
        }
    });

    const ordersByAccount = successfulOrders.reduce((acc, order) => {
        let accountId = order.accountId;
        // Fallback to name matching if accountId is missing
        if (!accountId && order.clientName) {
            accountId = accountNameMap.get(order.clientName.toLowerCase().trim());
        }

        if (accountId) {
            if (!acc[accountId]) acc[accountId] = [];
            acc[accountId].push(order);
        }
        return acc;
    }, {} as Record<string, Order[]>);

    const accountIdsWithOrders = Object.keys(ordersByAccount);
    const totalAccountsWithOrders = accountIdsWithOrders.length;
    const accountsWithRepurchase = accountIdsWithOrders.filter(id => ordersByAccount[id].length > 1).length;
    const repurchaseRate = totalAccountsWithOrders > 0
        ? Math.round((accountsWithRepurchase / totalAccountsWithOrders) * 100)
        : 0;

    // --- END OF CORRECTED LOGIC ---

    const calculatedKpis = initialKpiDataLaunch.map(kpi => {
      let currentValue = 0;
      switch(kpi.id) {
        case 'kpi1': currentValue = totalBottlesSoldOverall; break;
        case 'kpi2': currentValue = teamBottlesSoldOverall; break;
        case 'kpi3': currentValue = newAccountsThisYear; break; // Corrected logic
        case 'kpi4': currentValue = newAccountsThisMonth; break; // Corrected logic
        case 'kpi5': currentValue = repurchaseRate; break; // Corrected logic
      }
      return { ...kpi, currentValue };
    });

    // Monthly progress calculations
    let monthlyProgressMetrics: any[] = [];
    if(userRole === 'SalesRep' && teamMember) {
      // Logic for individual SalesRep
      const memberAccounts = accounts.filter(acc => 
        acc.salesRepId === teamMember.id &&
        acc.status === 'Activo' &&
        acc.createdAt &&
        isValid(parseISO(acc.createdAt)) &&
        isSameMonth(parseISO(acc.createdAt), currentDate) &&
        isSameYear(parseISO(acc.createdAt), currentDate)
      );
      const monthlyAccounts = memberAccounts.length;
      
      const monthlyVisits = orders.filter(o => 
        o.salesRep === teamMember.name && 
        isValid(parseISO(o.createdAt || o.visitDate!)) && 
        isSameMonth(parseISO(o.createdAt || o.visitDate!), currentDate) &&
        ALL_VISIT_STATUSES.includes(o.status)
      ).length;

      monthlyProgressMetrics = [
        { title: "Cuentas Nuevas", target: teamMember.monthlyTargetAccounts || 0, current: monthlyAccounts, unit: 'cuentas', colorClass: "[&>div]:bg-primary" },
        { title: "Visitas Realizadas", target: teamMember.monthlyTargetVisits || 0, current: monthlyVisits, unit: 'visitas', colorClass: "[&>div]:bg-primary" },
      ];
    } else if (userRole === 'Admin') {
       // Logic for Admin (Team view)
       const teamMonthlyTargetAccounts = salesReps.reduce((sum, rep) => sum + (rep.monthlyTargetAccounts || 0), 0);
       const teamMonthlyTargetVisits = salesReps.reduce((sum, rep) => sum + (rep.monthlyTargetVisits || 0), 0);
       
       const teamMonthlyAccounts = newAccountsThisMonth; // Reuse the already calculated correct value

       const teamMonthlyVisits = orders.filter(o => 
          salesRepNamesSet.has(o.salesRep) && 
          isValid(parseISO(o.createdAt || o.visitDate!)) && 
          isSameMonth(parseISO(o.createdAt || o.visitDate!), currentDate) &&
          ALL_VISIT_STATUSES.includes(o.status)
        ).length;

      monthlyProgressMetrics = [
        { title: "Cuentas Nuevas del Equipo", target: teamMonthlyTargetAccounts, current: teamMonthlyAccounts, unit: 'cuentas', colorClass: "[&>div]:bg-[hsl(var(--brand-turquoise-hsl))]" },
        { title: "Visitas del Equipo", target: teamMonthlyTargetVisits, current: teamMonthlyVisits, unit: 'visitas', colorClass: "[&>div]:bg-[hsl(var(--brand-turquoise-hsl))]" },
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
  const showActionButtons = userRole === 'Admin' || userRole === 'SalesRep' || userRole === 'Clavadista';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold">
        Hola, {teamMember?.name || "Santa Brisa"}
      </h1>

      <Alert className="bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-100">
        <AlertTriangle className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
        <AlertTitle className="font-bold text-amber-900 dark:text-amber-200">¡Atención! Entorno de Pruebas con Datos Reales</AlertTitle>
        <AlertDescription className="text-amber-800 dark:text-amber-300">
          Este es un entorno de pruebas activo, pero toda la información que introduzcas (clientes, pedidos, interacciones) <strong>se está guardando en la base de datos real.</strong>
          <br />
          Tu feedback es crucial. Si encuentras algún fallo, tienes alguna duda o una sugerencia para mejorar la herramienta, por favor, <strong>comunícalo directamente al administrador.</strong> ¡Gracias por tu colaboración!
        </AlertDescription>
      </Alert>
      
      {showActionButtons && (
        <div className="grid grid-cols-2 gap-4">
          {userRole === 'Admin' ? (
            <>
              <Button asChild className="h-20 text-base flex-col gap-1 bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/direct-sales-sb/new">
                  <PlusCircle className="h-6 w-6 mb-1" /> Añadir Venta
                </Link>
              </Button>
              <Button asChild className="h-20 text-base flex-col gap-1 bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/request-sample">
                  <SendHorizonal className="h-6 w-6 mb-1" /> Solicitar Muestras
                </Link>
              </Button>
            </>
          ) : (
             <>
              <Button asChild className="h-20 text-base flex-col gap-1 bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/order-form">
                  <FileText className="h-6 w-6 mb-1" /> Registrar Interacción
                </Link>
              </Button>
              <Button asChild className="h-20 text-base flex-col gap-1 bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/request-sample">
                  <SendHorizonal className="h-6 w-6 mb-1" /> Solicitar Muestras
                </Link>
              </Button>
            </>
          )}
        </div>
      )}

      {showMonthlyProgress && monthlyProgressMetrics.length > 0 && (
        <Card className="shadow-subtle">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5 text-primary" />
              Mis Objetivos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {monthlyProgressMetrics.map((metric) => {
              const progress = metric.target > 0 ? Math.min((metric.current / metric.target) * 100, 100) : (metric.current > 0 ? 100 : 0);
              const isTargetAchieved = metric.target > 0 && metric.current >= metric.target;
              return (
                <div key={metric.title}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm font-medium">{metric.title}</span>
                    <span className="text-sm text-muted-foreground">
                      <FormattedNumericValue value={metric.current} /> / <FormattedNumericValue value={metric.target} />
                    </span>
                  </div>
                  <Progress value={progress} className={cn("h-2", isTargetAchieved ? "[&>div]:bg-green-500" : metric.colorClass)} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}


      {showDashboardContent && (
        <>
          <h2 className="text-2xl font-headline font-semibold pt-4 border-t">Panel de Lanzamiento</h2>
          
          <KpiGrid kpis={kpis} />

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
