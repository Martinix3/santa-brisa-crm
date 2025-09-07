

"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { TeamMember, Order, Account, OrderStatus, EnrichedAccount, AccountStatus, UserRole } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { ArrowLeft, Mail, Package, Briefcase, Footprints, AlertTriangle, ShoppingCart, Loader2 } from "lucide-react";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import StatusBadge from "@/components/app/status-badge";
import { ChartContainer } from "@/components/ui/chart";
import { Line, LineChart, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts";
import { format, parseISO, isValid, getMonth, getYear, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from "next/link";
import { getOrdersFS } from "@/services/order-service";
import { getAccountsFS } from "@/services/account-service";
import { getTeamMemberByIdFS } from "@/services/team-member-service";
import { useToast } from "@/hooks/use-toast";
import { calculateCommercialStatus } from "@/lib/account-logic";
import { VALID_SALE_STATUSES, ALL_VISIT_STATUSES } from '@/lib/constants';


const chartConfig = (color: string) => ({
  bottles: { 
    label: "Botellas", 
    color: color,
  },
});

interface PerformanceDataPoint {
  month: string; 
  yearMonth: string; 
  bottles: number;
}


export default function TeamMemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [member, setMember] = React.useState<TeamMember | null>(null);
  const [memberOrders, setMemberOrders] = React.useState<Order[]>([]);
  const [enrichedMemberAccounts, setEnrichedMemberAccounts] = React.useState<Account[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [performanceChartData, setPerformanceChartData] = React.useState<PerformanceDataPoint[]>([]);

  const [totalBottlesSold, setTotalBottlesSold] = React.useState(0);
  const [totalOrdersCount, setTotalOrdersCount] = React.useState(0);
  const [totalVisitsCount, setTotalVisitsCount] = React.useState(0);
  
  const memberId = params.memberId as string;

  React.useEffect(() => {
    async function loadMemberData() {
      if (!memberId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const foundMember = await getTeamMemberByIdFS(memberId);
        const validRoles: UserRole[] = ['SalesRep', 'Líder Clavadista'];
        if (!foundMember || !validRoles.includes(foundMember.role)) {
            setMember(null);
            if (foundMember && !validRoles.includes(foundMember.role)) {
                toast({ title: "Perfil No Válido", description: "Este perfil no corresponde a un miembro del equipo de ventas.", variant: "destructive" });
            }
            setIsLoading(false);
            return;
        }
        setMember(foundMember);

        const [fetchedOrders, fetchedAccounts] = await Promise.all([
          getOrdersFS(),
          getAccountsFS()
        ]);
        
        const isLider = foundMember.role === 'Líder Clavadista';
        const ordersByMember = fetchedOrders
          .filter(order => order.salesRep === foundMember.name)
          .sort((a,b) => parseISO(b.createdAt || b.visitDate).getTime() - parseISO(a.createdAt || a.visitDate).getTime());
        setMemberOrders(ordersByMember);

        const accountsForMember = fetchedAccounts.filter(acc => 
            acc.salesRepId === foundMember.id
        );
        
        const enrichedAccountsPromises = accountsForMember.map(async (account) => {
            const accountOrders = fetchedOrders.filter(order => order.accountId === account.id || order.clientName === account.nombre);
            
            const openTasks = accountOrders.filter(o => o.status === 'Programada' || o.status === 'Seguimiento');
            const nextInteraction = openTasks.sort((a, b) => {
                const dateA = parseISO((a.status === 'Programada' ? a.visitDate : a.nextActionDate) || '1970-01-01');
                const dateB = parseISO((b.status === 'Programada' ? b.visitDate : b.nextActionDate) || '1970-01-01');
                return dateA.getTime() - dateB.getTime();
            })[0];
            
            let status: AccountStatus;
            if (nextInteraction) {
                status = nextInteraction.status as 'Programada' | 'Seguimiento';
            } else {
                status = await calculateCommercialStatus(accountOrders);
            }

            return { ...account, status };
        });

        const calculatedAccounts = await Promise.all(enrichedAccountsPromises);
        setEnrichedMemberAccounts(calculatedAccounts.sort((a,b) => (a.nombre.toLowerCase() > b.nombre.toLowerCase() ? 1 : -1)));

        let bottles = 0;
        let orderCount = 0;
        let visitCount = 0;
        const monthlySales: Record<string, number> = {}; 

        ordersByMember.forEach(order => {
          if (ALL_VISIT_STATUSES.includes(order.status)) {
            visitCount++;
          }
          if (VALID_SALE_STATUSES.includes(order.status) && order.numberOfUnits) {
            bottles += order.numberOfUnits;
            orderCount++;

            const orderDate = parseISO(order.visitDate || order.createdAt);
            if (isValid(orderDate)) {
              const yearMonth = format(orderDate, 'yyyy-MM');
              monthlySales[yearMonth] = (monthlySales[yearMonth] || 0) + order.numberOfUnits;
            }
          }
        });
        setTotalBottlesSold(bottles);
        setTotalOrdersCount(orderCount);
        setTotalVisitsCount(visitCount);

        const chartData: PerformanceDataPoint[] = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
          const date = subMonths(today, i);
          const yearMonth = format(date, 'yyyy-MM');
          const monthName = format(date, 'MMM', { locale: es });
          chartData.push({
            month: monthName.charAt(0).toUpperCase() + monthName.slice(1), 
            yearMonth: yearMonth,
            bottles: monthlySales[yearMonth] || 0,
          });
        }
        setPerformanceChartData(chartData);

      } catch (error) {
        console.error("Error loading member profile data:", error);
        toast({ title: "Error al Cargar Perfil", description: "No se pudieron cargar los datos del comercial.", variant: "destructive" });
        setMember(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadMemberData();
  }, [memberId, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando perfil del miembro del equipo...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Miembro no Encontrado</h1>
        <p className="text-muted-foreground mb-6">El miembro del equipo que estás buscando no existe o no es un perfil válido.</p>
        <Button onClick={() => router.push('/team-tracking')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Equipo de Ventas
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/team-tracking')} aria-label="Volver al listado de equipo">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-16 w-16">
            <AvatarImage src={member.avatarUrl || `https://placehold.co/100x100.png?text=${member.name.split(' ').map(n => n[0]).join('')}`} alt={member.name} data-ai-hint="person portrait" />
            <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-headline font-semibold">Perfil de Rendimiento: {member.name}</h1>
            <p className="text-sm text-muted-foreground">{member.role}</p>
            <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
                <Mail size={14} /> <span>{member.email}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-subtle">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Botellas Vendidas (Total)</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={totalBottlesSold} /></div></CardContent>
        </Card>
        <Card className="shadow-subtle">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pedidos Registrados (Total)</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={totalOrdersCount} /></div></CardContent>
        </Card>
         <Card className="shadow-subtle">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Visitas Registradas (Total)</CardTitle><Footprints className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={totalVisitsCount} /></div></CardContent>
        </Card>
        <Card className="shadow-subtle">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Obj. Cuentas (Mes)</CardTitle><Briefcase className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={member.monthlyTargetAccounts || 0} /></div><p className="text-xs text-muted-foreground">Objetivo mensual de nuevas cuentas.</p></CardContent>
        </Card>
      </div>
      
      {performanceChartData && performanceChartData.length > 0 && (
        <Card className="shadow-subtle">
          <CardHeader>
            <CardTitle>Tendencia de Ventas Mensuales (Botellas)</CardTitle>
            <CardDescription>Evolución de las ventas de botellas en los últimos meses.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pr-0">
            <ChartContainer config={chartConfig('hsl(var(--primary))')} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} dy={5}/>
                   <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} dx={-5} />
                   <RechartsTooltip 
                        contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}
                        itemStyle={{color: 'hsl(var(--foreground))'}}
                        formatter={(value: number) => [`${value.toLocaleString('es-ES')} botellas`, 'Botellas']} 
                        labelFormatter={(label: string, payload: any[]) => {
                            if (payload && payload.length > 0 && payload[0].payload.yearMonth) {
                                const date = parseISO(payload[0].payload.yearMonth + "-01"); 
                                if (isValid(date)) return format(date, "MMMM yyyy", { locale: es });
                            }
                            return label;
                        }}
                      />
                  <Line type="monotone" dataKey="bottles" strokeWidth={2} stroke="hsl(var(--primary))" dot={{r:4, fill: "hsl(var(--primary))", strokeWidth:2, stroke: "hsl(var(--card))"}} activeDot={{r:6}} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-subtle">
          <CardHeader>
            <CardTitle>Interacciones y Pedidos Recientes de {member.name}</CardTitle>
            <CardDescription>Resumen de las últimas actividades, visitas y pedidos registrados por {member.name}.</CardDescription>
          </CardHeader>
          <CardContent>
            {memberOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[25%]">Cliente</TableHead>
                      <TableHead className="w-[15%]">Fecha</TableHead>
                      <TableHead className="w-[25%]">Tipo / Próx. Acción</TableHead>
                      <TableHead className="text-right w-[15%]">Valor</TableHead>
                      <TableHead className="text-center w-[20%]">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberOrders.slice(0, 10).map(order => { 
                       const interactionType = order.status === 'Programada' ? "Visita Programada"
                                            : (order.status === 'Seguimiento' || order.status === 'Fallido') ? `Seguimiento (${order.nextActionType || 'N/D'})`
                                            : "Pedido";
                      return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.clientName}</TableCell>
                        <TableCell>{format(parseISO(order.visitDate || order.createdAt), "dd/MM/yy", { locale: es })}</TableCell>
                        <TableCell>{interactionType}</TableCell>
                        <TableCell className="text-right">
                           {order.status !== 'Programada' && order.status !== 'Seguimiento' && order.status !== 'Fallido' && order.value !== undefined ? (
                             <FormattedNumericValue value={order.value} locale="es-ES" options={{ style: 'currency', currency: 'EUR' }} />
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-center"><StatusBadge type="order" status={order.status} /></TableCell>
                      </TableRow>
                    );
                  })}
                  </TableBody>
                </Table>
                {memberOrders.length > 10 && <p className="text-xs text-muted-foreground mt-2 text-center">Mostrando 10 de {memberOrders.length} interacciones. Ver todas en sus respectivos módulos.</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No hay interacciones o pedidos recientes registrados para {member.name}.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-subtle">
          <CardHeader>
            <CardTitle>Cuentas Gestionadas por {member.name}</CardTitle>
            <CardDescription>Directorio de las cuentas de clientes actualmente asignadas o creadas por {member.name}.</CardDescription>
          </CardHeader>
          <CardContent>
            {enrichedMemberAccounts.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Nombre Cuenta</TableHead>
                      <TableHead className="w-[30%]">Tipo</TableHead>
                      <TableHead className="text-center w-[30%]">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrichedMemberAccounts.slice(0, 10).map(account => ( 
                      <TableRow key={account.id}>
                        <TableCell>
                          <Link href={`/accounts/${account.id}`} className="font-medium hover:underline text-primary">
                            {account.nombre}
                          </Link>
                        </TableCell>
                        <TableCell>{account.type}</TableCell>
                        <TableCell className="text-center"><StatusBadge type="account" status={account.status as AccountStatus} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {enrichedMemberAccounts.length > 10 && <p className="text-xs text-muted-foreground mt-2 text-center">Mostrando 10 de {enrichedMemberAccounts.length} cuentas. Ver todas en el módulo de Cuentas.</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">{member.name} no tiene cuentas asignadas actualmente.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
