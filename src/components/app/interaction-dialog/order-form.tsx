
"use client";

import * as React from 'react';
import { useFormContext, useWatch, useFieldArray, type FieldArrayWithId } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Loader2, ArrowLeft, Send, Package, CreditCard, Award, Zap, Trash2, PlusCircle, Truck } from "lucide-react";
import type { InteractionFormValues } from '@/lib/schemas/interaction-schema';
import type { InventoryItem, TeamMember, UserRole, Account } from '@/types';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { paymentMethodList, canalOrigenColocacionList } from '@/lib/data';
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';

const NO_CLAVADISTA_VALUE = "##NONE##";
const DIRECT_SALE_VALUE = "##DIRECT##";


interface OrderFormProps {
  onBack: () => void;
  isSubmitting: boolean;
  availableMaterials: InventoryItem[];
  materialFields: FieldArrayWithId<InteractionFormValues, "assignedMaterials", "id">[];
  appendMaterial: (item: { materialId: string; quantity: number | undefined; }) => void;
  removeMaterial: (index: number) => void;
  userRole: UserRole | null;
  salesRepsList: TeamMember[];
  clavadistas: TeamMember[];
  distributorAccounts: Account[];
}

export function OrderForm({ 
    onBack, 
    isSubmitting, 
    availableMaterials,
    materialFields,
    appendMaterial,
    removeMaterial,
    clavadistas,
    distributorAccounts
}: OrderFormProps) {
    const form = useFormContext<InteractionFormValues>();

    const watchedUnits = useWatch({ control: form.control, name: 'unidades' });
    const watchedPrice = useWatch({ control: form.control, name: 'precioUnitario' });
    const watchedMaterials = useWatch({ control: form.control, name: 'assignedMaterials' });

    const { subtotal, total } = React.useMemo(() => {
        const sub = (watchedUnits || 0) * (watchedPrice || 0);
        return { subtotal: sub, total: sub * 1.21 };
    }, [watchedUnits, watchedPrice]);

    const totalEstimatedMaterialCost = React.useMemo(() => {
        return watchedMaterials.reduce((total, current) => {
            const materialDetails = availableMaterials.find(m => m.id === current.materialId);
            const unitCost = materialDetails?.latestPurchase?.calculatedUnitCost || 0;
            return total + ((current.quantity || 0) * unitCost);
        }, 0);
    }, [watchedMaterials, availableMaterials]);
    
    return (
        <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-6">
                <section className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold">Detalles del Pedido</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="unidades" render={({ field }) => (<FormItem><FormLabel>Unidades</FormLabel><FormControl><Input type="number" min={1} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="precioUnitario" render={({ field }) => (<FormItem><FormLabel>Precio (€ sin IVA)</FormLabel><FormControl><Input type="number" min={0.01} step="0.01" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="paymentMethod" render={({ field }) => (<FormItem><FormLabel>Forma de Pago</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger></FormControl><SelectContent>{paymentMethodList.map(m=>(<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent></Select><FormMessage/></FormItem>)}/>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="distributorId" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-1.5"><Truck className="h-4 w-4"/>Gestionado Por</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? ""} >
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar distribuidor..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value={DIRECT_SALE_VALUE}>Venta Directa (Gestiona Santa Brisa)</SelectItem>
                                        <Separator className="my-1"/>
                                        {distributorAccounts.map(d => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage/>
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="clavadistaId" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center"><Award className="mr-2 h-4 w-4"/>Clavadista</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? NO_CLAVADISTA_VALUE}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value={NO_CLAVADISTA_VALUE}>Ninguno</SelectItem>
                                        {clavadistas.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage/>
                            </FormItem>
                        )} />
                    </div>

                    <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem><FormLabel>Notas del Pedido</FormLabel><FormControl><Textarea placeholder="Añade cualquier detalle importante sobre el pedido..." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <Separator className="!my-6"/>

                    <div className="space-y-2">
                        <h3 className="text-base font-semibold">Material Promocional</h3>
                        <FormDescription>Añade los materiales que se han entregado.</FormDescription>
                        {materialFields.map((field, index) => (
                            <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md bg-muted/50">
                                <FormField control={form.control} name={`assignedMaterials.${index}.materialId`} render={({ field }) => (
                                    <FormItem className="flex-grow"><FormLabel className="text-xs">Material</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{availableMaterials.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name={`assignedMaterials.${index}.quantity`} render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs">Cantidad</FormLabel><FormControl><Input type="number" min={1} className="w-24" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendMaterial({ materialId: '', quantity: 1 })}><PlusCircle className="mr-2 h-4 w-4" /> Añadir</Button>
                    </div>

                </section>
                <aside className="lg:col-span-1 space-y-4">
                    <div className="p-4 bg-muted/50 rounded-md space-y-2 sticky top-6">
                        <h3 className="font-semibold text-lg">Resumen</h3>
                        <Separator/>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span><FormattedNumericValue value={subtotal} options={{ style: 'currency', currency: 'EUR' }} /></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA (21%):</span><FormattedNumericValue value={subtotal * 0.21} options={{ style: 'currency', currency: 'EUR' }} /></div>
                        <Separator/>
                        <div className="flex justify-between text-xl font-bold"><span className="text-foreground">TOTAL:</span><FormattedNumericValue value={total} options={{ style: 'currency', currency: 'EUR' }} /></div>
                         <Separator/>
                         <div className="flex justify-between text-sm pt-2"><span className="text-muted-foreground">Coste Materiales:</span><FormattedNumericValue value={totalEstimatedMaterialCost} options={{ style: 'currency', currency: 'EUR' }} /></div>
                    </div>
                </aside>
            </div>
             <DialogFooter className="pt-6 flex justify-between sm:justify-between w-full">
                <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Confirmar Pedido
                </Button>
            </DialogFooter>
        </div>
    );
}
