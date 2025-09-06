
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Check, Info, Loader2, PartyPopper, PlusCircle, Trash2, TriangleAlert, Truck, X } from 'lucide-react';

export default function UiPreview() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);

    const handleAction = () => {
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 1500);
    }

  return (
    <div className="p-4 md:p-8 space-y-12 bg-surface-background">
      <header>
        <h1 className="text-4xl font-bold font-headline text-text-primary">UI Component & Design Token Preview</h1>
        <p className="text-text-secondary mt-2">Catálogo de componentes visuales y tokens de diseño para el CRM de Santa Brisa.</p>
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

      {/* Typography Section */}
      <section>
        <h2 className="text-2xl font-semibold font-headline mb-4">Tipografía (Inter)</h2>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold font-headline">Titular H1 (Headline)</h1>
          <h2 className="text-2xl font-semibold font-headline">Titular H2</h2>
          <h3 className="text-xl font-medium">Titular H3</h3>
          <p className="text-base">Párrafo de cuerpo (Body). Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.</p>
          <Label>Etiqueta de formulario (Label)</Label>
          <p className="text-sm text-text-secondary">Texto secundario o descripción.</p>
          <p className="text-xs text-text-subtle">Texto sutil para leyendas o metadatos.</p>
        </div>
      </section>

      {/* Buttons Section */}
       <section>
        <h2 className="text-2xl font-semibold font-headline mb-4">Botones</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg" onClick={handleAction} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
            Botón Primario (L)
          </Button>
          <Button onClick={handleAction} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            Botón Primario
          </Button>
           <Button size="sm" onClick={handleAction} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
            Primario (S)
          </Button>
          <Button variant="secondary">Botón Secundario</Button>
          <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4"/> Destructivo</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </section>

      {/* Cards Section */}
      <section>
        <h2 className="text-2xl font-semibold font-headline mb-4">Tarjetas (Cards)</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Tarjeta Estándar</CardTitle>
              <CardDescription>Descripción de la tarjeta.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Contenido de la tarjeta. Este es un buen lugar para mostrar información clave.</p>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="secondary">Acción</Button>
            </CardFooter>
          </Card>
           <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Tarjeta Elevada</CardTitle>
              <CardDescription>Con una sombra más pronunciada.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Ideal para elementos que necesitan destacar, como modales o popovers.</p>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>Acción Primaria</Button>
            </CardFooter>
          </Card>
        </div>
      </section>
      
      {/* Form Elements Section */}
      <section>
        <h2 className="text-2xl font-semibold font-headline mb-4">Elementos de Formulario</h2>
        <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="input-text">Campo de Texto</Label>
                    <Input id="input-text" placeholder="Escribe aquí..."/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="input-disabled">Campo Deshabilitado</Label>
                    <Input id="input-disabled" placeholder="No puedes escribir aquí" disabled/>
                </div>
            </div>
             <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="select-field">Selector</Label>
                     <Select>
                        <SelectTrigger id="select-field">
                            <SelectValue placeholder="Selecciona una opción" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="opcion1">Opción 1</SelectItem>
                            <SelectItem value="opcion2">Opción 2</SelectItem>
                            <SelectItem value="opcion3">Opción 3 (larga)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
      </section>

      {/* Notifications and Badges */}
      <section>
        <h2 className="text-2xl font-semibold font-headline mb-4">Notificaciones y Estados</h2>
        <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
                 <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Información</AlertTitle>
                    <AlertDescription>Esta es una notificación informativa estándar.</AlertDescription>
                </Alert>
                 <Alert variant="destructive">
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>Error Crítico</AlertTitle>
                    <AlertDescription>Algo ha salido mal y requiere tu atención inmediata.</AlertDescription>
                </Alert>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => toast({ title: "Notificación programada", description: "Tu reunión ha sido agendada para el viernes.", })}>Mostrar Toast</Button>
                     <Button variant="destructive" onClick={() => toast({ variant: 'destructive', title: "Acción fallida", description: "No se pudo eliminar el registro.", })}>Toast de Error</Button>
                </div>
            </div>
            <div className="space-y-4">
                <h3 className="font-medium">Badges de Estado</h3>
                <div className="flex flex-wrap gap-2">
                    <Badge className="bg-status-success text-white"><Check className="mr-1 h-3 w-3"/> Éxito</Badge>
                    <Badge className="bg-status-warning text-black"><Loader2 className="mr-1 h-3 w-3 animate-spin"/> Pendiente</Badge>
                    <Badge className="bg-status-error text-white"><X className="mr-1 h-3 w-3"/> Error</Badge>
                    <Badge className="bg-status-info text-black"><Info className="mr-1 h-3 w-3"/> Informativo</Badge>
                     <Badge variant="outline">Neutral</Badge>
                </div>
            </div>
        </div>
      </section>

      {/* Table Section */}
       <section>
        <h2 className="text-2xl font-semibold font-headline mb-4">Tabla</h2>
        <Card className="shadow-sm">
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell className="font-medium">PRJ-001</TableCell>
                    <TableCell>Diseño de Packaging</TableCell>
                    <TableCell><Badge variant="outline" className="bg-status-success text-white">Completado</Badge></TableCell>
                    <TableCell className="text-right">€2,500.00</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell className="font-medium">PRJ-002</TableCell>
                    <TableCell>Campaña de Lanzamiento Q3</TableCell>
                    <TableCell><Badge variant="outline" className="bg-status-warning text-black">En Progreso</Badge></TableCell>
                    <TableCell className="text-right">€15,000.00</TableCell>
                </TableRow>
                 <TableRow>
                    <TableCell className="font-medium">PRJ-003</TableCell>
                    <TableCell>Estudio de Mercado Latam</TableCell>
                    <TableCell><Badge variant="outline" className="bg-status-error text-white">Cancelado</Badge></TableCell>
                    <TableCell className="text-right">€5,000.00</TableCell>
                </TableRow>
            </TableBody>
            </Table>
        </Card>
      </section>
      
      <Toaster />
    </div>
  );
}
