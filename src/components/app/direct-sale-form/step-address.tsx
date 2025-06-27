"use client";

import * as React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { provincesSpainList } from '@/lib/data';
import type { useDirectSaleWizard } from '@/hooks/use-direct-sale-wizard';

type WizardHookReturn = ReturnType<typeof useDirectSaleWizard>;

interface StepAddressProps extends Pick<WizardHookReturn, 'form' | 'client' | 'handleBack' | 'handleNextStep'> {}

export const StepAddress: React.FC<StepAddressProps> = ({ form, client, handleBack, handleNextStep }) => {
  const watchSameAsBilling = form.watch('sameAsBilling');
  
  return (
    <>
      <CardHeader>
          <CardTitle>Paso 4: Datos de Facturación y Entrega para "{client?.name}"</CardTitle>
          <CardDescription>Completa la información para la nueva cuenta. Los campos con * son obligatorios.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
          <Separator/><h3 className="font-semibold text-base mt-2">Datos de Facturación</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="nombreFiscal" render={({ field }) => (<FormItem><FormLabel>Nombre Fiscal *</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="cif" render={({ field }) => (<FormItem><FormLabel>CIF *</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
          </div>
          <FormField control={form.control} name="direccionFiscal_street" render={({ field }) => (<FormItem><FormLabel>Calle Fiscal *</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <FormField control={form.control} name="direccionFiscal_number" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="direccionFiscal_postalCode" render={({ field }) => (<FormItem><FormLabel>C.P. *</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="direccionFiscal_city" render={({ field }) => (<FormItem><FormLabel>Ciudad *</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="direccionFiscal_province" render={({ field }) => (<FormItem><FormLabel>Provincia *</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger></FormControl><SelectContent>{provincesSpainList.map(p=>(<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
          </div>
          
          <Separator/><h3 className="font-semibold text-base mt-2">Datos de Entrega</h3>
          <FormField control={form.control} name="sameAsBilling" render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">La dirección de entrega es la misma que la de facturación</FormLabel></FormItem>
          )} />

          {!watchSameAsBilling && (
              <div className="space-y-4 pt-2 border-l-2 pl-4 border-primary">
                  <FormField control={form.control} name="direccionEntrega_street" render={({ field }) => (<FormItem><FormLabel>Calle Entrega *</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <FormField control={form.control} name="direccionEntrega_number" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="direccionEntrega_postalCode" render={({ field }) => (<FormItem><FormLabel>C.P. *</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="direccionEntrega_city" render={({ field }) => (<FormItem><FormLabel>Ciudad *</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="direccionEntrega_province" render={({ field }) => (<FormItem><FormLabel>Provincia *</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger></FormControl><SelectContent>{provincesSpainList.map(p=>(<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                  </div>
              </div>
          )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button type="button" variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
        <Button type="button" onClick={handleNextStep}>Continuar <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </CardFooter>
    </>
  );
};
