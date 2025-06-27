
"use client";

import * as React from 'react';
import { useFieldArray } from 'react-hook-form';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Trash2, PlusCircle, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { directSaleChannelList, directSaleStatusList } from '@/lib/data';
import type { useDirectSaleWizard } from '@/hooks/use-direct-sale-wizard';
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';

type WizardHookReturn = ReturnType<typeof useDirectSaleWizard>;

interface StepDetailsProps extends Pick<WizardHookReturn, 'form' | 'handleBack' | 'handleNextStep' | 'subtotal' | 'tax' | 'totalAmount'> {}

export const StepDetails: React.FC<StepDetailsProps> = ({ 
    form, 
    handleBack, 
    handleNextStep,
    subtotal,
    tax,
    totalAmount
}) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  return (
    <>
      <CardHeader>
          <CardTitle>Paso 2: Detalles de la Venta</CardTitle>
          <CardDescription>Completa la información de la venta, los productos y las fechas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="channel" render={({ field }) => (
                <FormItem><FormLabel>Canal de Venta</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar canal" /></SelectTrigger></FormControl><SelectContent>{directSaleChannelList.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Estado</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger></FormControl><SelectContent>{directSaleStatusList.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
            )} />
        </div>

        <Separator />
        <h3 className="text-md font-semibold">Artículos de la Venta</h3>
        <div className="space-y-3">
            {fields.map((field, index) => (
             <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md bg-secondary/20">
                <FormField control={form.control} name={`items.${index}.productName`} render={({ field }) => (<FormItem className="flex-grow"><FormLabel className="text-xs">Producto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (<FormItem className="w-24"><FormLabel className="text-xs">Cantidad</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name={`items.${index}.netUnitPrice`} render={({ field }) => (<FormItem className="w-28"><FormLabel className="text-xs">Precio Neto</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
             </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ productName: "", quantity: 1, netUnitPrice: undefined })}><PlusCircle className="mr-2 h-4 w-4" />Añadir Artículo</Button>
        </div>

        <Separator />
        <h3 className="text-md font-semibold">Totales y Fechas</h3>
        <div className="p-4 bg-muted/50 rounded-md space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span><FormattedNumericValue value={subtotal} options={{ style: 'currency', currency: 'EUR' }} /></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA (21%):</span><FormattedNumericValue value={tax} options={{ style: 'currency', currency: 'EUR' }} /></div>
            <Separator className="my-1"/>
            <div className="flex justify-between text-lg font-bold"><span className="text-foreground">TOTAL:</span><FormattedNumericValue value={totalAmount} options={{ style: 'currency', currency: 'EUR' }} /></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="issueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Emisión</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="dueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Vencimiento (Opcional)</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
        </div>

        <FormField control={form.control} name="invoiceNumber" render={({ field }) => (<FormItem><FormLabel>Nº Factura (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
        
         <Separator />
         <FormField control={form.control} name="relatedPlacementOrders" render={({ field }) => (<FormItem><FormLabel>Órdenes de Colocación Asociadas (Opcional)</FormLabel><FormControl><Input placeholder="IDs de pedidos, separados por comas" {...field} /></FormControl><FormMessage /></FormItem>)} />
         <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas (Opcional)</FormLabel><FormControl><Textarea placeholder="Cualquier nota adicional sobre esta venta..." {...field} /></FormControl><FormMessage /></FormItem>)} />

      </CardContent>
      <CardFooter className="flex justify-between">
        <Button type="button" variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
        <Button type="button" onClick={handleNextStep}>Continuar <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </CardFooter>
    </>
  );
};
