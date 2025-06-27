"use client";

import * as React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { directSaleChannelList, directSaleStatusList } from '@/lib/data';
import type { useDirectSaleWizard } from '@/hooks/use-direct-sale-wizard';

type WizardHookReturn = ReturnType<typeof useDirectSaleWizard>;

interface StepCoreDetailsProps extends Pick<WizardHookReturn, 'form' | 'handleBack' | 'handleNextStep' | 'client'> {}

export const StepCoreDetails: React.FC<StepCoreDetailsProps> = ({ form, handleBack, handleNextStep, client }) => (
  <>
    <CardHeader>
        <CardTitle>Paso 2: Detalles Principales de la Venta</CardTitle>
        <CardDescription>Indica el canal y estado para la venta a "{client?.name}".</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <FormField control={form.control} name="channel" render={({ field }) => (
          <FormItem><FormLabel>Canal de Venta</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar canal" /></SelectTrigger></FormControl><SelectContent>{directSaleChannelList.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem><FormLabel>Estado de la Venta</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger></FormControl><SelectContent>{directSaleStatusList.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
      )} />
    </CardContent>
    <CardFooter className="flex justify-between">
      <Button type="button" variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
      <Button type="button" onClick={handleNextStep}>Continuar <ArrowRight className="ml-2 h-4 w-4" /></Button>
    </CardFooter>
  </>
);
