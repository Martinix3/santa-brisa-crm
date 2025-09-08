
"use client";

import * as React from 'react';
import { useForm, useFieldArray, useWatch, useFormContext } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover';
import { Calendar } from "@/components/ui/calendar';
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';
import { Loader2, PlusCircle, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { PurchaseFormValues } from '@/lib/schemas/purchase-schema';
import type { InventoryItem } from '@/types';
import { useCategories } from '@/contexts/categories-context';

const NEW_ITEM_SENTINEL = '##NEW##';

interface StepDetailsProps {
    inventoryItems: InventoryItem[];
}

export function StepDetails({ inventoryItems }: StepDetailsProps) {
    const form = useFormContext<PurchaseFormValues>();
    const { control } = form;
    
    const { fields, append, remove } = useFieldArray({
        control,
        name: "items",
    });

    const watchedItems = useWatch({ control, name: 'items' });
    const { inventoryCategories } = useCategories();
    
    const itemsSubtotal = React.useMemo(() => 
        (watchedItems || []).reduce((sum, item) => sum + ((item.cantidad || 0) * (item.costeUnitario || 0)), 0),
        [watchedItems]
    );
    const gastosEnvio = useWatch({ control, name: 'gastosEnvio' }) || 0;
    const impuestos = useWatch({ control, name: 'impuestos' }) || 0;
    const totalAmount = itemsSubtotal + gastosEnvio + impuestos;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Detalles de los Artículos</h3>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40%]">Artículo de Inventario</TableHead>
                            <TableHead className="w-[15%]">Lote Proveedor</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                            <TableHead className="text-right">Coste/ud</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-12"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field, index) => {
                            const currentItem = watchedItems?.[index];
                            const showNewItemName = currentItem?.productoId === NEW_ITEM_SENTINEL;
                            return (
                                <TableRow key={field.id} className="align-top">
                                    <TableCell className="pt-2 pb-1">
                                        <FormField control={control} name={`items.${index}.productoId`} render={({ field }) => (
                                            <FormItem>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                            <SelectItem value={NEW_ITEM_SENTINEL}>-- Añadir Nuevo Artículo --</SelectItem>
                                                        </SelectGroup>
                                                        <SelectGroup>
                                                            {inventoryItems.map(item => <SelectItem key={item.id} value={item.id}>{item.name} ({item.sku})</SelectItem>)}
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        {showNewItemName && (
                                            <FormField control={control} name={`items.${index}.newItemName`} render={({ field }) => (
                                                <FormItem className="mt-2"><FormControl><Input placeholder="Nombre del nuevo artículo..." {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        )}
                                    </TableCell>
                                     <TableCell className="pt-2 pb-1"><FormField control={control} name={`items.${index}.proveedorLote`} render={({ field }) => (<FormItem><FormControl><Input placeholder="Lote..." {...field} /></FormControl><FormMessage /></FormItem>)} /></TableCell>
                                     <TableCell className="pt-2 pb-1"><FormField control={control} name={`items.${index}.cantidad`} render={({ field }) => (<FormItem><FormControl><Input type="number" className="text-right" {...field} /></FormControl><FormMessage /></FormItem>)} /></TableCell>
                                     <TableCell className="pt-2 pb-1"><FormField control={control} name={`items.${index}.costeUnitario`} render={({ field }) => (<FormItem><FormControl><Input type="number" step="0.01" className="text-right" {...field} /></FormControl><FormMessage /></FormItem>)} /></TableCell>
                                    <TableCell className="pt-4 text-right"><FormattedNumericValue value={(currentItem?.cantidad || 0) * (currentItem?.costeUnitario || 0)} options={{ style: 'currency', currency: 'EUR' }} /></TableCell>
                                    <TableCell className="pt-2 pb-1 text-right"><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ productoId: "", cantidad: 1, costeUnitario: 0, proveedorLote: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Artículo
            </Button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={control} name="gastosEnvio" render={({ field }) => (<FormItem><FormLabel>Gastos de Envío</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="impuestos" render={({ field }) => (<FormItem><FormLabel>Otros Impuestos</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-right">
                <p className="text-xl font-bold">Total Factura: <FormattedNumericValue value={totalAmount} options={{ style: 'currency', currency: 'EUR' }} /></p>
            </div>
        </div>
    );
}
