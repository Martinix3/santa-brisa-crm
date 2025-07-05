
"use client";

import * as React from 'react';
import { useFieldArray } from 'react-hook-form';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Trash2, PlusCircle } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { useDirectSaleWizard } from '@/hooks/use-direct-sale-wizard';
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';
import type { ItemBatch } from '@/types';
import { format } from 'date-fns';

type WizardHookReturn = ReturnType<typeof useDirectSaleWizard>;

interface StepItemsProps extends Pick<WizardHookReturn, 'form' | 'handleBack' | 'handleNextStep' | 'subtotal' | 'tax' | 'totalAmount' | 'finishedGoods' | 'allBatches'> {}

export const StepItems: React.FC<StepItemsProps> = ({ 
    form, 
    handleBack, 
    handleNextStep,
    subtotal,
    tax,
    totalAmount,
    finishedGoods,
    allBatches
}) => {
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const watchedItems = form.watch("items");

  const batchesByProductId = React.useMemo(() => {
    return allBatches.reduce((acc, batch) => {
      if (!acc[batch.inventoryItemId]) {
        acc[batch.inventoryItemId] = [];
      }
      acc[batch.inventoryItemId].push(batch);
      return acc;
    }, {} as Record<string, ItemBatch[]>);
  }, [allBatches]);
  
  const handleProductChange = (index: number, newProductId: string) => {
    const product = finishedGoods.find(p => p.id === newProductId);
    if (product) {
      update(index, {
        ...watchedItems[index],
        productId: product.id,
        productName: product.name,
        batchId: '', // Reset batch on product change
        batchNumber: '',
      });
    }
  };

  const handleBatchChange = (index: number, newBatchId: string) => {
    const selectedProductId = watchedItems[index].productId;
    const batch = batchesByProductId[selectedProductId]?.find(b => b.id === newBatchId);
    if (batch) {
      update(index, {
        ...watchedItems[index],
        batchId: batch.id,
        batchNumber: batch.internalBatchCode,
        netUnitPrice: batch.unitCost
      });
    }
  };

  return (
    <>
      <CardHeader>
          <CardTitle>Paso 3: Artículos de la Venta</CardTitle>
          <CardDescription>Añade los productos, selecciona el lote y especifica las cantidades y precios netos (sin IVA) de la venta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-72 overflow-y-auto p-1">
            {fields.map((field, index) => {
              const selectedProductId = watchedItems[index]?.productId;
              const availableBatchesForProduct = batchesByProductId[selectedProductId] || [];
              const selectedBatchId = watchedItems[index]?.batchId;
              const selectedBatch = availableBatchesForProduct.find(b => b.id === selectedBatchId);
              
              return (
                 <div key={field.id} className="flex flex-col gap-2 p-3 border rounded-md bg-secondary/20">
                    <div className="flex items-end gap-2">
                        <FormField
                            control={form.control}
                            name={`items.${index}.productId`}
                            render={({ field }) => (
                            <FormItem className="flex-grow">
                                <FormLabel className="text-xs">Producto</FormLabel>
                                <Select onValueChange={(value) => handleProductChange(index, value)} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {finishedGoods.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    {selectedProductId && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <FormField
                                control={form.control}
                                name={`items.${index}.batchId`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Lote</FormLabel>
                                    <Select onValueChange={(value) => handleBatchChange(index, value)} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar lote..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {availableBatchesForProduct.map(b => (
                                            <SelectItem key={b.id} value={b.id}>
                                                {b.internalBatchCode} (Disp: {b.qtyRemaining})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                                <FormItem><FormLabel className="text-xs">Cantidad</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="1" max={selectedBatch?.qtyRemaining} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>)} 
                            />
                            <FormField control={form.control} name={`items.${index}.netUnitPrice`} render={({ field }) => (
                                <FormItem><FormLabel className="text-xs">Precio Neto</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>)} 
                            />
                        </div>
                    )}
                 </div>
              );
            })}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: "", productName: "", batchId: "", quantity: 1, netUnitPrice: undefined })}><PlusCircle className="mr-2 h-4 w-4" />Añadir Artículo</Button>
        
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
