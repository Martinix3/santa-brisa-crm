
"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { FormField, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import type { Supplier } from "@/types";
import type { PurchaseFormValues } from '@/lib/schemas/purchase-schema';

const NEW_SUPPLIER_SENTINEL = '##NEW##';

export function StepSupplier({ allSuppliers }: { allSuppliers: Supplier[] }) {
    const { control, watch, setValue } = useFormContext<PurchaseFormValues>();
    const watchedProveedorId = useWatch({ control, name: "proveedorId" });

    const handleSupplierSelect = (id: string) => {
        setValue("proveedorId", id);
        if (id === NEW_SUPPLIER_SENTINEL) {
            setValue("proveedorNombre", "");
            setValue("proveedorCif", "");
        } else {
            const supplier = allSuppliers.find(s => s.id === id);
            if (supplier) {
                setValue("proveedorNombre", supplier.name);
                setValue("proveedorCif", supplier.cif || "");
            }
        }
    };
    
    const watchedItems = watch("items");
    const subtotal = watchedItems?.reduce((acc: number, item: any) => acc + (item.cantidad || 0) * (item.costeUnitario || 0), 0) || 0;
    const tax = Number(watch("impuestos")) || 0;
    const shipping = Number(watch("gastosEnvio")) || 0;
    const total = subtotal + tax + shipping;

    return (
        <div className="space-y-6">
            <FormField
                control={control}
                name="proveedorId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Proveedor</FormLabel>
                        <Select onValueChange={handleSupplierSelect} value={field.value ?? ""}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar proveedor existente..."/></SelectTrigger></FormControl>
                            <SelectContent>
                                {allSuppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                <SelectItem value={NEW_SUPPLIER_SENTINEL}>Crear nuevo proveedor...</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            {watchedProveedorId === NEW_SUPPLIER_SENTINEL && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-l-2 pl-4 border-primary">
                    <FormField control={control} name="proveedorNombre" render={({ field }) => (<FormItem><FormLabel>Nombre Nuevo Proveedor</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={control} name="proveedorCif" render={({ field }) => (<FormItem><FormLabel>CIF (Opcional)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
                </div>
            )}
            <Separator className="!my-6" />
            
            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle>Resumen del Registro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Concepto:</span><span className="font-medium text-right">{watch("concepto")}</span></div>
                    <div className="flex justify-between"><span>Proveedor:</span><span className="font-medium text-right">{watch("proveedorNombre") || "No especificado"}</span></div>
                    <Separator/>
                    <div className="flex justify-between"><span>Subtotal artículos:</span><span className="font-medium text-right"><FormattedNumericValue value={subtotal} options={{style:'currency', currency:'EUR'}} /></span></div>
                    <div className="flex justify-between"><span>Costes extra:</span><span className="font-medium text-right"><FormattedNumericValue value={tax + shipping} options={{style:'currency', currency:'EUR'}} /></span></div>
                    <Separator/>
                    <div className="flex justify-between text-lg font-bold"><span>Total:</span><span className="text-right"><FormattedNumericValue value={total} options={{style:'currency', currency:'EUR'}} /></span></div>
                </CardContent>
            </Card>
        </div>
    );
}
