
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Kpi, StrategicObjective, Order, Account, TeamMember, UserRole } from "@/types";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, LabelList, PieChart, Pie, Cell, Legend } from "recharts";
import { Progress } from "@/components/ui/progress";
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';
import { cn } from "@/lib/utils";
import {
  kpiDataLaunch as initialKpiDataLaunch, 
  objetivoTotalVentasEquipo, 
  objetivoTotalCuentasEquipoAnual,
  mockStrategicObjectives
} from "@/lib/launch-dashboard-data";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { parseISO, getYear, getMonth, isSameYear, isSameMonth, isValid } from 'date-fns';
import { useAuth } from "@/contexts/auth-context"; 
import { getOrdersFS } from "@/services/order-service";
import { getAccountsFS } from "@/services/account-service";
import { getTeamMembersFS } from "@/services/team-member-service"; 


const distributionChartConfig = {
  value: { label: "Botellas" },
  VentasEquipo: { label: "Ventas Equipo", color: "hsl(var(--brand-turquoise-hsl))" },
  RestoCanales: { label: "Resto Canales", color: "hsl(var(--primary))" },
};

const calculateProgressValue = (current: number, target: number): number => {
  if (target <= 0) return current > 0 ? 100 : 0;
  return Math.min((current / target) * 100, 100);
};


export default function DashboardPage() {
  const { userRole, teamMember } = useAuth(); 
  const [isLoading, setIsLoading] = React.useState(true);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [allTeamMembers, setAllTeamMembers] = React.useState<TeamMember[]>([]); 
  const [calculatedKpiData, setCalculatedKpiData] = React.useState<Kpi[]>(initialKpiDataLaunch);


  React.useEffect(() => {
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
        setAllTeamMembers(fetchedTeamMembers); 

        const validOrderStatusesForSales = ['Confirmado', 'Procesando', 'Enviado', 'Entregado'];
        
        const salesTeamMemberIds = fetchedTeamMembers 
            .filter(m => m.role === 'SalesRep')
            .map(m => m.id);
        
        let totalBottlesSoldOverall = 0;
        let teamBottlesSoldOverall = 0;
        let accountsCreatedByTeamThisYear = 0;
        let accountsCreatedByTeamThisMonth = 0;
        let ordersFromExistingCustomersCount = 0;
        let totalValidOrdersCount = 0;

        fetchedOrders.forEach(order => {
          if (validOrderStatusesForSales.includes(order.status)) {
            if (order.numberOfUnits) {
              totalBottlesSoldOverall += order.numberOfUnits;
              const orderSalesRepDetails = fetchedTeamMembers.find(m => m.name === order.salesRep); 
              if (orderSalesRepDetails && orderSalesRepDetails.role === 'SalesRep') {
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
        fetchedAccounts.forEach(account => {
          if (account.salesRepId && salesTeamMemberIds.includes(account.salesRepId)) {
            const accountCreationDate = parseISO(account.createdAt);
             if (isValid(accountCreationDate)) {
                if (isSameYear(accountCreationDate, currentDate)) {
                  accountsCreatedByTeamThisYear++;
                }
                if (isSameMonth(accountCreationDate, currentDate) && isSameYear(accountCreationDate, currentDate)) {
                  accountsCreatedByTeamThisMonth++;
                }
            }
          }
        });

        const updatedKpis = initialKpiDataLaunch.map(kpi => {
          let newCurrentValue = 0;
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
          return { ...kpi, currentValue: newCurrentValue };
        });
        setCalculatedKpiData(updatedKpis);

      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const currentMonthNewAccountsByRep = React.useMemo(() => {
    if (!teamMember || userRole !== 'SalesRep' || accounts.length === 0) return 0; 
    const currentDate = new Date();
    return accounts.filter(acc => 
      acc.salesRepId === teamMember.id &&
      isValid(parseISO(acc.createdAt)) &&
      isSameMonth(parseISO(acc.createdAt), currentDate) &&
      isSameYear(parseISO(acc.createdAt), currentDate)
    ).length;
  }, [teamMember, userRole, accounts]);

  const currentMonthVisitsByRep = React.useMemo(() => {
    if (!teamMember || userRole !== 'SalesRep' || orders.length === 0) return 0; 
    const currentDate = new Date();
    return orders.filter(order =>
      order.salesRep === teamMember.name &&
      isValid(parseISO(order.visitDate)) &&
      isSameMonth(parseISO(order.visitDate), currentDate) &&
      isSameYear(parseISO(order.visitDate), currentDate) &&
      order.status !== 'Programada' 
    ).length;
  }, [teamMember, userRole, orders]);

  const salesRepsForTeamProgress = React.useMemo(() => allTeamMembers.filter(m => m.role === 'SalesRep'), [allTeamMembers]);
  
  const teamMonthlyTargetAccounts = React.useMemo(() => {
    if (userRole !== 'Admin') return 0;
    return salesRepsForTeamProgress.reduce((sum, rep) => sum + (rep.monthlyTargetAccounts || 0), 0);
  }, [userRole, salesRepsForTeamProgress]);

  const teamMonthlyAchievedAccounts = React.useMemo(() => {
    if (userRole !== 'Admin' || accounts.length === 0 || salesRepsForTeamProgress.length === 0) return 0;
    const currentDate = new Date();
    const salesRepIds = salesRepsForTeamProgress.map(rep => rep.id);
    return accounts.filter(acc => 
      acc.salesRepId && salesRepIds.includes(acc.salesRepId) &&
      isValid(parseISO(acc.createdAt)) &&
      isSameMonth(parseISO(acc.createdAt), currentDate) &&
      isSameYear(parseISO(acc.createdAt), currentDate)
    ).length;
  }, [userRole, salesRepsForTeamProgress, accounts]);

  const teamMonthlyTargetVisits = React.useMemo(() => {
    if (userRole !== 'Admin') return 0;
    return salesRepsForTeamProgress.reduce((sum, rep) => sum + (rep.monthlyTargetVisits || 0), 0);
  }, [userRole, salesRepsForTeamProgress]);

  const teamMonthlyAchievedVisits = React.useMemo(() => {
    if (userRole !== 'Admin' || orders.length === 0 || salesRepsForTeamProgress.length === 0) return 0;
    const currentDate = new Date();
    const salesRepNames = salesRepsForTeamProgress.map(rep => rep.name);
    return orders.filter(order =>
      salesRepNames.includes(order.salesRep) &&
      isValid(parseISO(order.visitDate)) &&
      isSameMonth(parseISO(order.visitDate), currentDate) &&
      isSameYear(parseISO(order.visitDate), currentDate) &&
      order.status !== 'Programada'
    ).length;
  }, [userRole, salesRepsForTeamProgress, orders]);


  const kpiVentasTotales = calculatedKpiData.find(k => k.id === 'kpi1');
  const kpiVentasEquipo = calculatedKpiData.find(k => k.id === 'kpi2');
  const kpiCuentasAnual = calculatedKpiData.find(k => k.id === 'kpi3');

  const ventasTotalesActuales = kpiVentasTotales?.currentValue ?? 0;
  const ventasEquipoActuales = kpiVentasEquipo?.currentValue ?? 0;
  const restoCanalesVentas = ventasTotalesActuales - ventasEquipoActuales;

  const ventasDistribucionData = [
    { name: "Ventas Equipo", value: ventasEquipoActuales, fill: "hsl(var(--brand-turquoise-hsl))" },
    { name: "Resto Canales", value: Math.max(0, restoCanalesVentas), fill: "hsl(var(--primary))" }, 
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

  const monthlyProgressTitle = userRole === 'Admin' ? "Progreso Mensual del Equipo" : "Tu Progreso Mensual";
  const showMonthlyProgressSection = userRole === 'Admin' || (userRole === 'SalesRep' && teamMember);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando datos del dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold">Panel Principal: Lanzamiento de Producto</h1>
      
      {(userRole === 'Admin' || userRole === 'SalesRep' || userRole === 'Distributor') && (
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
      )}

      {showMonthlyProgressSection && (
        <section className="mt-6">
          <h2 className="text-2xl font-headline font-semibold mb-4">{monthlyProgressTitle}</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {userRole === 'Admin' && (
              <>
                <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle>Cuentas Nuevas del Equipo (Este Mes)</CardTitle>
                    <CardDescription>
                      Objetivo Equipo: <FormattedNumericValue value={teamMonthlyTargetAccounts} locale="es-ES" /> cuentas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      <FormattedNumericValue value={teamMonthlyAchievedAccounts} locale="es-ES" />
                    </div>
                    <Progress 
                      value={calculateProgressValue(teamMonthlyAchievedAccounts, teamMonthlyTargetAccounts)} 
                      className={cn("mt-2 h-2", calculateProgressValue(teamMonthlyAchievedAccounts, teamMonthlyTargetAccounts) >= 100 ? "[&>div]:bg-green-500" : "[&>div]:bg-[hsl(var(--brand-turquoise-hsl))]")} 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {teamMonthlyAchievedAccounts >= teamMonthlyTargetAccounts && teamMonthlyTargetAccounts > 0
                        ? "¡Objetivo mensual del equipo cumplido!"
                        : `Faltan: ${Math.max(0, teamMonthlyTargetAccounts - teamMonthlyAchievedAccounts)} cuentas`}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle>Visitas del Equipo (Este Mes)</CardTitle>
                    <CardDescription>
                      Objetivo Equipo: <FormattedNumericValue value={teamMonthlyTargetVisits} locale="es-ES" /> visitas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      <FormattedNumericValue value={teamMonthlyAchievedVisits} locale="es-ES" />
                    </div>
                    <Progress 
                        value={calculateProgressValue(teamMonthlyAchievedVisits, teamMonthlyTargetVisits)} 
                        className={cn("mt-2 h-2", calculateProgressValue(teamMonthlyAchievedVisits, teamMonthlyTargetVisits) >= 100 ? "[&>div]:bg-green-500" : "[&>div]:bg-[hsl(var(--brand-turquoise-hsl))]")} 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        {teamMonthlyAchievedVisits >= teamMonthlyTargetVisits && teamMonthlyTargetVisits > 0
                          ? "¡Objetivo mensual del equipo cumplido!"
                          : `Faltan: ${Math.max(0, teamMonthlyTargetVisits - teamMonthlyAchievedVisits)} visitas`}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
            {userRole === 'SalesRep' && teamMember && (
              <>
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
              </>
            )}
          </div>
        </section>
      )}

      {(userRole === 'Admin' || userRole === 'SalesRep' || userRole === 'Distributor') && (
        <section className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 shadow-subtle hover:shadow-md transition-shadow duration-300">
            <CardHeader>
                <CardTitle>Distribución de Ventas (Botellas)</CardTitle>
                <CardDescription>Visualiza la contribución de las ventas del equipo frente a otros canales de venta de la empresa.</CardDescription>
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
                <CardDescription>Seguimiento del objetivo anual de ventas en botellas para el equipo comercial.</CardDescription>
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
                <CardDescription>Seguimiento del objetivo anual de creación de nuevas cuentas para el equipo comercial.</CardDescription>
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
      )}

      <section>
        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
            <CardHeader>
                <CardTitle>Objetivos Estratégicos Clave</CardTitle>
                <CardDescription>Resumen de los principales objetivos estratégicos cualitativos de la empresa. Gestión completa en Configuración.</CardDescription>
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
                    <p className="text-sm text-muted-foreground">No hay objetivos estratégicos definidos. Pueden gestionarse desde la sección de Configuración.</p>
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
