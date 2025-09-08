
"use client";

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, UploadCloud, Info } from 'lucide-react';
import type { PurchaseFormValues } from '@/lib/schemas/purchase-schema';
import type { Supplier } from '@/types';
import { useCategories } from '@/contexts/categories-context';
import { ESTADOS_DOCUMENTO, ESTADOS_PAGO } from '@ssot';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const NEW_SUPPLIER_SENTINEL = '##NEW##';

interface StepGeneralProps {
    suppliers: Supplier[];
}

export function StepGeneral({ suppliers }: StepGeneralProps) {
    const { control, watch } = useFormContext<PurchaseFormValues>();
    const { inventoryCategories, costCategories } = useCategories();
    const isInventoryPurchase = watch('isInventoryPurchase');
    const selectedSupplierId = watch('proveedorId');
    const selectedDocStatus = watch('estadoDocumento');
    
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={control} name="categoriaId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Categoría *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una categoría..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                {costCategories.length > 0 && <SelectGroup><FormLabel className="px-2 text-xs text-muted-foreground">Gastos Generales</FormLabel>{costCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectGroup>}
                                {inventoryCategories.length > 0 && <SelectGroup><FormLabel className="px-2 text-xs text-muted-foreground">Compras de Inventario</FormLabel>{inventoryCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectGroup>}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                {!isInventoryPurchase && <FormField control={control} name="monto" render={({ field }) => (<FormItem><FormLabel>Importe Total (€) *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />}
            </div>
            <FormField control={control} name="concepto" render={({ field }) => (<FormItem><FormLabel>Concepto *</FormLabel><FormControl><Input placeholder="Ej: Compra de botellas, Licencia Adobe" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={control} name="proveedorId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Proveedor</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value={NEW_SUPPLIER_SENTINEL}>-- Añadir Nuevo Proveedor --</SelectItem>
                                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                {selectedSupplierId === NEW_SUPPLIER_SENTINEL && (
                    <FormField control={control} name="proveedorNombre" render={({ field }) => (<FormItem><FormLabel>Nombre Nuevo Proveedor *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                )}
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={control} name="estadoDocumento" render={({ field }) => (<FormItem><FormLabel>Estado del Documento</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{ESTADOS_DOCUMENTO.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={control} name="estadoPago" render={({ field }) => (<FormItem><FormLabel>Estado del Pago</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{ESTADOS_PAGO.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
             </div>
             {selectedDocStatus === 'factura_recibida' && isInventoryPurchase && (
                <Alert className="bg-sky-50 border-sky-200">
                    <Info className="h-4 w-4 !text-sky-600" />
                    <AlertTitle className="text-sky-800">Recepción de Stock</AlertTitle>
                    <AlertDescription className="text-sky-700">
                        Al guardar con estado "Factura Recibida", se dará entrada al stock de los artículos de inventario y se calculará el coste unitario del lote.
                    </AlertDescription>
                </Alert>
             )}
        </div>
    );
}
