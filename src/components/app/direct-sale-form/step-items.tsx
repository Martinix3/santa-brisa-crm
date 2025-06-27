
"use client";

import * as React from 'react';
import { useFieldArray } from 'react-hook-form';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Trash2, PlusCircle } from 'lucide-react';
import type { useDirectSaleWizard } from '@/hooks/use-direct-sale-wizard';
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';

type WizardHookReturn = ReturnType<typeof useDirectSaleWizard>;

interface StepItemsProps extends Pick<WizardHookReturn, 'form' | 'handleBack' | 'handleNextStep' | 'subtotal' | 'tax' | 'totalAmount'> {}

export const StepItems: React.FC<StepItemsProps> = ({ 
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
          <CardTitle>Paso 3: Artículos de la Venta</CardTitle>
          <CardDescription>Añade los productos, cantidades y precios netos (sin IVA) de la venta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-72 overflow-y-auto p-1">
            {fields.map((field, index) => (
             <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md bg-secondary/20">
                <FormField control={form.control} name={`items.${index}.productName`} render={({ field }) => (<FormItem className="flex-grow"><FormLabel className="text-xs">Producto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (<FormItem className="w-24"><FormLabel className="text-xs">Cantidad</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name={`items.${index}.netUnitPrice`} render={({ field }) => (<FormItem className="w-28"><FormLabel className="text-xs">Precio Neto</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
             </div>
            ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => append({ productName: "", quantity: 1, netUnitPrice: undefined })}><PlusCircle className="mr-2 h-4 w-4" />Añadir Artículo</Button>
        
        <Separator className="!my-6" />

        <div className="p-4 bg-muted/50 rounded-md space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span><FormattedNumericValue value={subtotal} options={{ style: 'currency', currency: 'EUR' }} /></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA (21%):</span><FormattedNumericValue value={tax} options={{ style: 'currency', currency: 'EUR' }} /></div>
            <Separator className="my-1"/>
            <div className="flex justify-between text-lg font-bold"><span className="text-foreground">TOTAL:</span><FormattedNumericValue value={totalAmount} options={{ style: 'currency', currency: 'EUR' }} /></div>
        </div>

      </CardContent>
      <CardFooter className="flex justify-between">
        <Button type="button" variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
        <Button type="button" onClick={handleNextStep}>Continuar <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </CardFooter>
    </>
  );
};
