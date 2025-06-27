
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList, Cell } from "recharts";
import { useMemo } from "react";

const distributionChartConfig = {
  value: { label: "Botellas" },
  ventasEquipo: { label: "Ventas Equipo", color: "hsl(var(--brand-turquoise-hsl))" },
  restoCanales: { label: "Resto Canales", color: "hsl(var(--primary))" },
};

interface SalesDistributionChartProps {
  teamSales: number;
  otherSales: number;
}

export function SalesDistributionChart({ teamSales, otherSales }: SalesDistributionChartProps) {

  const chartData = useMemo(() => [
    { name: "Ventas Equipo", value: teamSales, fill: "hsl(var(--brand-turquoise-hsl))" },
    { name: "Resto Canales", value: otherSales, fill: "hsl(var(--primary))" },
  ].filter(item => item.value > 0), [teamSales, otherSales]);

  if (teamSales === 0 && otherSales === 0) {
    return (
        <Card className="md:col-span-2 shadow-subtle">
            <CardHeader>
                <CardTitle>Distribución de Ventas (Botellas)</CardTitle>
                <CardDescription>Aún no hay datos de ventas para mostrar la distribución.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
                 <p className="text-muted-foreground">Sin datos de ventas.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="md:col-span-2 shadow-subtle hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <CardTitle>Distribución de Ventas (Botellas)</CardTitle>
        <CardDescription>Visualiza la contribución de las ventas del equipo frente a otros canales de venta.</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] pr-0">
        <ChartContainer config={distributionChartConfig} className="h-full w-full">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={(value) => `${value / 1000}k`} />
            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={100} />
            <ChartTooltip cursor={{ fill: 'hsl(var(--muted)/0.5)' }} content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="value" radius={4}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <LabelList dataKey="value" position="right" offset={8} className="fill-foreground" fontSize={12} formatter={(value: number) => value.toLocaleString('es-ES')} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
