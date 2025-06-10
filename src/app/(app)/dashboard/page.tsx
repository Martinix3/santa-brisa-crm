"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Kpi, StrategicObjective } from "@/types";
import { mockKpis, mockStrategicObjectives, salesData } from "@/lib/data";
import { CheckCircle, Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, LabelList } from "recharts";
import { Progress } from "@/components/ui/progress";

const chartConfig = {
  totalSales: {
    label: "Total Sales",
    color: "hsl(var(--primary))",
  },
};

export default function DashboardPage() {
  const completedObjectives = mockStrategicObjectives.filter(obj => obj.completed).length;
  const totalObjectives = mockStrategicObjectives.length;
  const objectivesProgress = totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold">Dashboard</h1>
      
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {mockKpis.map((kpi: Kpi) => (
          <Card key={kpi.id} className="shadow-subtle hover:shadow-md transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              {kpi.icon && <kpi.icon className="h-5 w-5 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpi.value}</div>
              {kpi.trend && kpi.trendValue && (
                <p className="text-xs text-muted-foreground flex items-center">
                  {kpi.trend === 'up' && <TrendingUp className="h-4 w-4 mr-1 text-green-500" />}
                  {kpi.trend === 'down' && <TrendingDown className="h-4 w-4 mr-1 text-red-500" />}
                  {kpi.trend === 'neutral' && <Minus className="h-4 w-4 mr-1 text-yellow-500" />}
                  <span className={kpi.colorClass}>{kpi.trendValue}</span> vs last period
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <CardTitle>Monthly Sales Performance</CardTitle>
            <CardDescription>Overview of total sales for the past months.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pr-0">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `$${value / 1000}k`} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <Bar dataKey="totalSales" fill="var(--color-totalSales)" radius={4}>
                     <LabelList dataKey="totalSales" position="top" offset={8} className="fill-foreground" fontSize={12} formatter={(value: number) => `$${(value / 1000).toFixed(1)}k`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <CardTitle>Strategic Objectives</CardTitle>
            <CardDescription>Track progress towards key company goals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{completedObjectives} of {totalObjectives} objectives completed</span>
              <span className="text-sm font-bold text-primary">{objectivesProgress.toFixed(0)}%</span>
            </div>
            <Progress value={objectivesProgress} aria-label={`${objectivesProgress.toFixed(0)}% of objectives completed`} className="h-3"/>
            <ul className="space-y-3 mt-4 max-h-[220px] overflow-y-auto pr-2">
              {mockStrategicObjectives.map((objective: StrategicObjective) => (
                <li key={objective.id} className="flex items-start space-x-3">
                  {objective.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Target className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  )}
                  <span className={`text-sm ${objective.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {objective.text}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
