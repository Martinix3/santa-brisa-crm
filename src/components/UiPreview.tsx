
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, Info, Loader2, PartyPopper, PlusCircle, Trash2, TriangleAlert, Truck, X, Settings } from 'lucide-react';
import { Bar, BarChart, Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

const chartData = [
  { month: "Enero", desktop: 186, mobile: 80 },
  { month: "Febrero", desktop: 305, mobile: 200 },
  { month: "Marzo", desktop: 237, mobile: 120 },
  { month: "Abril", desktop: 73, mobile: 190 },
  { month: "Mayo", desktop: 209, mobile: 130 },
  { month: "Junio", desktop: 214, mobile: 140 },
];
const chartConfig = {
  desktop: { label: "Desktop", color: "#618E8F" },
  mobile: { label: "Mobile", color: "#D7713E" },
};

export default function UiPreview() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);

    const handleAction = () => {
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 1500);
    }

  return (
    <div className="p-4 md:p-8 space-y-12 bg-background">
      <header>
        <h1 className="text-4xl font-bold font-headline text-foreground">UI Component & Design Token Preview</h1>
        <p className="text-muted-foreground mt-2">Catálogo de componentes visuales y tokens de diseño para el CRM de Santa Brisa.</p>
      </header>
      
      {/* Colors Section */}
      <section>
        <h2 className="text-2xl font-semibold font-headline mb-4">Paleta de Colores Semánticos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-primary text-primary-foreground shadow-md">
            <p className="font-bold">Primary</p>
            <p className="text-sm opacity-80">Usado para acciones principales.</p>
          </div>
          <div className="p-4 rounded-lg bg-secondary text-secondary-foreground shadow-md">
            <p className="font-bold">Secondary</p>
            <p className="text-sm opacity-80">Acciones secundarias.</p>
          </div>
          <div className="p-4 rounded-lg bg-destructive text-destructive-foreground shadow-md">
            <p className="font-bold">Destructive</p>
            <p className="text-sm opacity-80">Peligro, eliminar.</p>
          </div>
           <div className="p-4 rounded-lg bg-accent text-accent-foreground shadow-md border">
            <p className="font-bold">Accent</p>
            <p className="text-sm opacity-80">Énfasis sutil.</p>
          </div>
        </div>
      </section>

      {/* Cards Section */}
      <section>
        <h2 className="text-2xl font-semibold font-headline mb-4">Tarjetas (Cards)</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader><CardTitle>Tarjeta Base</CardTitle><CardDescription>Estándar, neutra.</CardDescription></CardHeader>
            <CardContent><p>Contenido principal de la tarjeta.</p></CardContent>
            <CardFooter><Button variant="secondary">Acción</Button></CardFooter>
          </Card>
          <Card className="shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer">
            <CardHeader><CardTitle>Tarjeta Clickable</CardTitle><CardDescription>Con efecto al pasar el ratón.</CardDescription></CardHeader>
            <CardContent><p>Contenido interactivo.</p></CardContent>
          </Card>
          <div className="rounded-lg p-4 bg-primary/10 text-foreground">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Ventas</div>
            <div className="mt-1 text-2xl font-bold">€ 12.480</div>
            <div className="mt-1 text-xs text-green-700 font-semibold">▲ +8.4% vs. mes anterior</div>
          </div>
        </div>
      </section>

      {/* Chart Section */}
      <section>
        <h2 className="text-2xl font-semibold font-headline mb-4">Gráfico (Recharts)</h2>
         <Card>
            <CardHeader><CardTitle>Rendimiento Mensual</CardTitle></CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-64 w-full">
                    <BarChart accessibilityLayer data={chartData}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)"/>
                      <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} stroke="hsl(var(--muted-foreground))"/>
                      <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))"/>
                      <RechartsTooltip cursor={false} content={<ChartTooltipContent indicator="dot" className="sb-chart-tooltip" />} />
                      <Bar dataKey="desktop" fill="var(--color-desktop)" radius={8} />
                      <Bar dataKey="mobile" fill="var(--color-mobile)" radius={8} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
      </section>

      {/* Table Section */}
       <section>
        <h2 className="text-2xl font-semibold font-headline mb-4">Tabla</h2>
        <Card>
            <Table>
            <TableHeader>
                <TableRow className="bg-muted/50 border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow className="border-b border-border hover:bg-secondary/10">
                    <TableCell className="font-medium">PRJ-001</TableCell>
                    <TableCell>Diseño de Packaging</TableCell>
                    <TableCell><Badge className="bg-green-100 text-green-800 border border-green-200">Completado</Badge></TableCell>
                    <TableCell className="text-right">€2,500.00</TableCell>
                </TableRow>
                <TableRow className="border-b border-border hover:bg-secondary/10 border-l-4 border-l-secondary">
                    <TableCell className="font-medium">PRJ-002</TableCell>
                    <TableCell>Campaña de Lanzamiento Q3</TableCell>
                    <TableCell><Badge className="bg-amber-100 text-amber-800 border border-amber-200">En Progreso</Badge></TableCell>
                    <TableCell className="text-right">€15,000.00</TableCell>
                </TableRow>
                 <TableRow className="border-b border-border hover:bg-secondary/10">
                    <TableCell className="font-medium">PRJ-003</TableCell>
                    <TableCell>Estudio de Mercado Latam</TableCell>
                    <TableCell><Badge className="bg-red-100 text-red-800 border border-red-200">Cancelado</Badge></TableCell>
                    <TableCell className="text-right">€5,000.00</TableCell>
                </TableRow>
            </TableBody>
            </Table>
        </Card>
      </section>

      {/* Buttons and Modals */}
      <section>
        <h2 className="text-2xl font-semibold font-headline mb-4">Acciones y Modales</h2>
        <div className="flex flex-wrap items-center gap-4">
            <Button>Botón Primario</Button>
            <Button variant="secondary">Botón Secundario</Button>
            <Button variant="ghost">Botón Ghost</Button>
            <Button variant="destructive">Eliminar</Button>
            <Button size="icon" variant="outline" className="rounded-full w-10 h-10 border-border bg-background/50 hover:bg-muted/80 active:scale-95"><Settings className="h-5 w-5 text-foreground"/></Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline">Abrir Modal (Glass)</Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sb-chart-tooltip">
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar acción?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction>Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </section>
      
      <Toaster />
    </div>
  );
}
