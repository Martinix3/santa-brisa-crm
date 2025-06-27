
"use client";

import * as React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { useDirectSaleWizard } from '@/hooks/use-direct-sale-wizard';

type WizardHookReturn = ReturnType<typeof useDirectSaleWizard>;

interface StepOptionalInfoProps extends Pick<WizardHookReturn, 'form' | 'handleBack' | 'handleNextStep'> {}

export const StepOptionalInfo: React.FC<StepOptionalInfoProps> = ({ form, handleBack, handleNextStep }) => (
  <>
    <CardHeader>
        <CardTitle>Paso 4: Información Adicional (Opcional)</CardTitle>
        <CardDescription>Puedes añadir detalles extra como el número de factura o notas internas. Si no los tienes, puedes continuar.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField control={form.control} name="invoiceNumber" render={({ field }) => (<FormItem><FormLabel>Nº Factura</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="dueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Vencimiento</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
      </div>
      <FormField control={form.control} name="relatedPlacementOrders" render={({ field }) => (<FormItem><FormLabel>Órdenes de Colocación Asociadas</FormLabel><FormControl><Input placeholder="IDs de pedidos, separados por comas" {...field} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea placeholder="Cualquier nota adicional sobre esta venta..." {...field} /></FormControl><FormMessage /></FormItem>)} />
    </CardContent>
    <CardFooter className="flex justify-between">
      <Button type="button" variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
      <Button type="button" onClick={handleNextStep}>Continuar al Resumen <ArrowRight className="ml-2 h-4 w-4" /></Button>
    </CardFooter>
  </>
);
