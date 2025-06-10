
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TeamMember } from "@/types";
import { mockTeamMembers } from "@/lib/data";
import { Package, ShoppingCart, Users } from 'lucide-react'; // Cambiado DollarSign por Package
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';

const chartConfig = (color: string) => ({
  bottles: { // Cambiado de sales a bottles
    label: "Botellas", // Etiqueta actualizada
    color: color,
  },
});

export default function TeamTrackingPage() {
  const teamTotalBottlesValue = useMemo(() => mockTeamMembers.reduce((sum, m) => sum + m.bottlesSold, 0), []); // Cambiado de sales a bottlesSold
  const teamTotalOrdersValue = useMemo(() => mockTeamMembers.reduce((sum, m) => sum + m.orders, 0), []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold">Seguimiento de Equipo</h1>
      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Rendimiento del Equipo de Ventas</CardTitle>
          <CardDescription>Métricas de rendimiento individual para cada representante de ventas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Representante</TableHead>
                <TableHead className="text-right">Botellas Vendidas</TableHead> {/* Encabezado actualizado */}
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Visitas</TableHead>
                <TableHead className="w-[200px] text-center">Tendencia Mensual (Botellas)</TableHead> {/* Encabezado actualizado */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTeamMembers.map((member: TeamMember) => (
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
                  </TableCell><TableCell className="text-right font-medium">
                    <FormattedNumericValue value={member.bottlesSold} locale="es-ES" options={{ style: undefined, currency: undefined }}/>
                  </TableCell><TableCell className="text-right">{member.orders}</TableCell><TableCell className="text-right">{member.visits}</TableCell><TableCell className="p-0 h-[60px]">
                    <ChartContainer config={chartConfig('hsl(var(--primary))')} className="h-full w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={member.performanceData.map(d => ({...d, month: d.month.substring(0,3)}))} margin={{ top: 10, right: 5, left: 5, bottom: 0 }}>
                          <Line type="monotone" dataKey="bottles" stroke="var(--color-bottles)" strokeWidth={2} dot={false} /> {/* dataKey y stroke actualizados */}
                          <Tooltip 
                            cursor={{stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3'}}
                            contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}
                            itemStyle={{color: 'hsl(var(--foreground))'}}
                            formatter={(value: number) => [`${value.toLocaleString('es-ES')} botellas`, 'Botellas']} // Formato de tooltip actualizado
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Botellas del Equipo</CardTitle> {/* Título actualizado */}
            <Package className="h-5 w-5 text-muted-foreground" /> {/* Icono actualizado */}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <FormattedNumericValue value={teamTotalBottlesValue} locale="es-ES" options={{ style: undefined, currency: undefined }}/> {/* Valor y formato actualizados */}
            </div>
            <p className="text-xs text-muted-foreground">+9% del último mes</p> {/* Ejemplo de texto */}
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
            <p className="text-xs text-muted-foreground">+8% del último mes</p>
          </CardContent>
        </Card>
        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rep. de Ventas Activos</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockTeamMembers.length}</div>
            <p className="text-xs text-muted-foreground">Todos los reps activos</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
