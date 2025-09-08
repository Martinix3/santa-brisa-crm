
"use client";

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, UploadCloud } from 'lucide-react';
import type { PurchaseFormValues } from '@/lib/schemas/purchase-schema';

export function StepInvoice() {
    const { control } = useFormContext<PurchaseFormValues>();

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Detalles de la Factura (Opcional)</h3>
             <FormField control={control} name="invoiceNumber" render={({ field }) => (<FormItem><FormLabel>Número de Factura</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={control} name="fechaEmision" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Emisión</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
                <FormField control={control} name="fechaVencimiento" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Vencimiento</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
            </div>
            <FormField control={control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <div>
                <FormLabel>Adjuntar Factura</FormLabel>
                <Button variant="outline" className="w-full mt-2" type="button"><UploadCloud className="mr-2 h-4 w-4" /> Subir archivo... (Próximamente)</Button>
            </div>
        </div>
    );
}
