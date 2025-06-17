
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Kpi } from "@/types";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, LabelList, PieChart, Pie, Cell, Legend } from "recharts";
import { Progress } from "@/components/ui/progress";
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';
import { cn } from "@/lib/utils";
import { 
  kpiDataLaunch,
  ventasDistribucionData,
  progresoVentasEquipoData,
  progresoCuentasEquipoData,
  objetivoTotalVentasEquipo,
  objetivoTotalCuentasEquipoAnual
} from "@/lib/launch-dashboard-data";


const distributionChartConfig = {
  value: { label: "Botellas" },
  VentasEquipo: { label: "Ventas Equipo", color: "hsl(var(--primary))" },
  RestoCanales: { label: "Resto Canales", color: "hsl(var(--brand-turquoise-hsl))" },
};


export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold">Panel de Lanzamiento de Producto</h1>
      
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpiDataLaunch.map((kpi: Kpi) => {
          const progress = kpi.targetValue > 0 ? (kpi.currentValue / kpi.targetValue) * 100 : 0;
          const isTurquoiseKpi = ['kpi2', 'kpi3', 'kpi4'].includes(kpi.id);
          const isPrimaryKpi = kpi.id === 'kpi1';
          
          let progressBarClass = "";
          if (isTurquoiseKpi) {
            progressBarClass = "[&>div]:bg-[hsl(var(--brand-turquoise-hsl))]";
          } else if (isPrimaryKpi) {
            progressBarClass = "[&>div]:bg-primary";
          }

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
    </div>
  );
}
