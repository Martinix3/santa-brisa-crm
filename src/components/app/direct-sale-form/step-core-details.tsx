
"use client";

import * as React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { directSaleChannelList } from '@/lib/data';
import type { useDirectSaleWizard } from '@/hooks/use-direct-sale-wizard';

type WizardHookReturn = ReturnType<typeof useDirectSaleWizard>;

interface StepCoreDetailsProps extends Pick<WizardHookReturn, 'form' | 'handleBack' | 'handleNextStep' | 'client'> {}

export const StepCoreDetails: React.FC<StepCoreDetailsProps> = ({ form, handleBack, handleNextStep, client }) => (
  <>
    <CardHeader>
        <CardTitle>Paso 2: Detalles Principales de la Venta</CardTitle>
        <CardDescription>Indica el canal de venta y la fecha de emisión para la venta a "{client?.name}".</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <FormField control={form.control} name="channel" render={({ field }) => (
          <FormItem><FormLabel>Canal de Venta</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar canal" /></SelectTrigger></FormControl><SelectContent>{directSaleChannelList.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="issueDate" render={({ field }) => (
          <FormItem className="flex flex-col"><FormLabel>Fecha Emisión</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>
      )} />
    </CardContent>
    <CardFooter className="flex justify-between">
      <Button type="button" variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
      <Button type="button" onClick={handleNextStep}>Continuar <ArrowRight className="ml-2 h-4 w-4" /></Button>
    </CardFooter>
  </>
);
