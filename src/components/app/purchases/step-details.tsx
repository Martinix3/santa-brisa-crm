
"use client";

import * as React from 'react';
import { useFormContext, useFieldArray, useWatch, FieldError } from "react-hook-form";
import { FormField, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Trash2, PlusCircle, Calendar as CalendarIcon } from "lucide-react";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { useMemo } from "react";
import type { InventoryItem } from "@/types";
import type { PurchaseFormValues } from '@/lib/schemas/purchase-schema';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const NEW_ITEM_SENTINEL = '##NEW##';

export function StepDetails({ allItems }: { allItems: InventoryItem[] }) {
    const { control, register, watch, setValue, formState: { errors } } = useFormContext<PurchaseFormValues>();
    
    const isInventoryPurchase = useWatch({
      control,
      name: "isInventoryPurchase",
    });

    const { fields, append, remove } = useFieldArray({ control, name: "items" });
    const watchedItems = watch("items");

    const availableItems = useMemo(() => {
        const addedIds = new Set(
          watchedItems?.filter(i => i.productoId !== NEW_ITEM_SENTINEL).map(i => i.productoId) || []
        );
        return allItems.filter(item => !addedIds.has(item.id));
    }, [watchedItems, allItems]);

    const { subtotal, impuestos, gastosEnvio, total } = useMemo(() => {
        const sub = watchedItems?.reduce((acc: number, item: any) => acc + (item.cantidad || 0) * (item.costeUnitario || 0), 0) || 0;
        const tax = Number(watch("impuestos")) || 0;
        const shipping = Number(watch("gastosEnvio")) || 0;
        return { subtotal: sub, impuestos: tax, gastosEnvio: shipping, total: sub + tax + shipping };
    }, [watchedItems, watch]);
    
    React.useEffect(() => {
        if(isInventoryPurchase) {
            setValue('monto', total, { shouldValidate: true });
        }
    }, [total, setValue, isInventoryPurchase]);

    return (
      <div className="space-y-4">
        {isInventoryPurchase && (
          <div className="space-y-4 pt-4 border-t">
            <Button type="button" size="sm" variant="outline" onClick={() => append({ productoId: "", newItemName: "", cantidad: 1, costeUnitario: 0, proveedorLote: "", caducidad: undefined })}>
                <PlusCircle className="mr-2 h-4 w-4"/>Añadir Artículo
            </Button>
            {fields.length > 0 && (
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-3 border rounded-md bg-secondary/20 space-y-2">
                             <div className="flex items-end gap-2">
                                <FormField control={control} name={`items.${index}.productoId`} render={({ field: selectField }) => (
                                    <FormItem className="flex-grow"><FormLabel className="text-xs">Artículo</FormLabel><Select onValueChange={selectField.onChange} value={selectField.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger></FormControl><SelectContent>{availableItems.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}<SelectItem value={NEW_ITEM_SENTINEL}>Crear nuevo artículo...</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                                 <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </div>
                            {watch(`items.${index}.productoId`) === NEW_ITEM_SENTINEL && (
                                <FormField control={control} name={`items.${index}.newItemName`} render={({ field }) => <FormItem><FormLabel className="text-xs">Nombre Nuevo Artículo</FormLabel><FormControl><Input placeholder="Nombre del nuevo artículo" {...field} value={field.value ?? ""} /></FormControl><FormMessage/></FormItem>}/>
                            )}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <FormField control={control} name={`items.${index}.cantidad`} render={({ field }) => <FormItem><FormLabel className="text-xs">Cantidad</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></FormControl><FormMessage/></FormItem>} />
                                <FormField control={control} name={`items.${index}.costeUnitario`} render={({ field }) => <FormItem><FormLabel className="text-xs">Coste Unitario (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></FormControl><FormMessage/></FormItem>} />
                                <FormField control={control} name={`items.${index}.proveedorLote`} render={({ field }) => <FormItem><FormLabel className="text-xs">Lote Proveedor</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage/></FormItem>} />
                                <FormField control={control} name={`items.${index}.caducidad`} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel className="text-xs">Caducidad</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button type="button" variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
             {errors.items && (
                <p className="text-sm font-medium text-destructive">
                    {(errors.items as any)?.message || 'Revisa los artículos añadidos.'}
                </p>
             )}
          </div>
        )}

        <Separator className="!my-6" />
        <h4 className="text-md font-medium">Costes Adicionales y Resumen</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={control} name="gastosEnvio" render={({ field }) => (<FormItem><FormLabel>Gastos de Envío (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></FormControl><FormMessage/></FormItem>)}/>
          <FormField control={control} name="impuestos" render={({ field }) => (<FormItem><FormLabel>Impuestos (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></FormControl><FormMessage/></FormItem>)}/>
           <div className="p-3 bg-muted rounded-md">
                <FormLabel>Importe Total Calculado</FormLabel>
                <div className="font-bold text-lg"><FormattedNumericValue value={total} options={{style:'currency', currency:'EUR'}} /></div>
           </div>
        </div>
      </div>
    );
}
