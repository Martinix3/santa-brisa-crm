
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockTeamMembers, mockOrders, mockAccounts } from "@/lib/data";
import type { TeamMember, Order, Account } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { ArrowLeft, Mail, Phone, Package, Briefcase, Footprints, Target, Users, TrendingUp, AlertTriangle, ShoppingCart, ListChecks, Building2, FileText } from "lucide-react";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import StatusBadge from "@/components/app/status-badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

const chartConfig = (color: string) => ({
  bottles: { 
    label: "Botellas", 
    color: color,
  },
});

export default function TeamMemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { userRole } = useAuth();

  const [member, setMember] = React.useState<TeamMember | null>(null);
  const [memberOrders, setMemberOrders] = React.useState<Order[]>([]);
  const [memberAccounts, setMemberAccounts] = React.useState<Account[]>([]);
  
  const memberId = params.memberId as string;

  React.useEffect(() => {
    const foundMember = mockTeamMembers.find(m => m.id === memberId);
    if (foundMember) {
      setMember(foundMember);
      const orders = mockOrders
        .filter(order => order.salesRep === foundMember.name)
        .sort((a,b) => parseISO(b.visitDate).getTime() - parseISO(a.visitDate).getTime()); // Sort by visit date desc
      setMemberOrders(orders);

      const accounts = mockAccounts
        .filter(acc => acc.salesRepId === foundMember.id)
        .sort((a,b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1));
      setMemberAccounts(accounts);

    } else {
      setMember(null);
    }
  }, [memberId]);

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Comercial no Encontrado</h1>
        <p className="text-muted-foreground mb-6">El comercial que estás buscando no existe o ha sido eliminado.</p>
        <Button onClick={() => router.push('/team-tracking')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Equipo de Ventas
        </Button>
      </div>
    );
  }
  
  const isAdmin = userRole === 'Admin';

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
            <p className="text-sm text-muted-foreground">{member.role === 'SalesRep' ? 'Representante de Ventas' : member.role}</p>
            <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
                <Mail size={14} /> <span>{member.email}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-subtle">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Botellas Vendidas (Total)</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={member.bottlesSold || 0} /></div></CardContent>
        </Card>
        <Card className="shadow-subtle">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pedidos Registrados (Total)</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={member.orders || 0} /></div></CardContent>
        </Card>
         <Card className="shadow-subtle">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Visitas Registradas (Total)</CardTitle><Footprints className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={member.visits || 0} /></div></CardContent>
        </Card>
        <Card className="shadow-subtle">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Obj. Cuentas (Mes)</CardTitle><Briefcase className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={member.monthlyTargetAccounts || 0} /></div><p className="text-xs text-muted-foreground">Objetivo mensual de nuevas cuentas.</p></CardContent>
        </Card>
      </div>
      
      {member.performanceData && member.performanceData.length > 0 && (
        <Card className="shadow-subtle">
          <CardHeader>
            <CardTitle>Tendencia de Ventas Mensuales (Botellas)</CardTitle>
            <CardDescription>Evolución de las ventas de botellas en los últimos meses.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pr-0">
            <ChartContainer config={chartConfig('hsl(var(--primary))')} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={member.performanceData.map(d => ({...d, month: d.month.substring(0,3)}))} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} dy={5}/>
                   <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} dx={-5} />
                   <RechartsTooltip 
                        contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}
                        itemStyle={{color: 'hsl(var(--foreground))'}}
                        formatter={(value: number) => [`${value.toLocaleString('es-ES')} botellas`, 'Botellas']} 
                        labelFormatter={(label: string) => {
                            const monthMap: { [key: string]: string } = { Ene: 'Enero', Feb: 'Febrero', Mar: 'Marzo', Abr: 'Abril', May: 'Mayo', Jun: 'Junio', Jul: 'Julio', Ago: 'Agosto', Sep: 'Septiembre', Oct: 'Octubre', Nov: 'Noviembre', Dic: 'Diciembre'};
                            return monthMap[label] || label;
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
                        <TableCell>{format(parseISO(order.visitDate), "dd/MM/yy", { locale: es })}</TableCell>
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
            {memberAccounts.length > 0 ? (
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
                    {memberAccounts.slice(0, 10).map(account => ( 
                      <TableRow key={account.id}>
                        <TableCell>
                          <Link href={`/accounts/${account.id}`} className="font-medium hover:underline text-primary">
                            {account.name}
                          </Link>
                        </TableCell>
                        <TableCell>{account.type}</TableCell>
                        <TableCell className="text-center"><StatusBadge type="account" status={account.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {memberAccounts.length > 10 && <p className="text-xs text-muted-foreground mt-2 text-center">Mostrando 10 de {memberAccounts.length} cuentas. Ver todas en el módulo de Cuentas.</p>}
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

    