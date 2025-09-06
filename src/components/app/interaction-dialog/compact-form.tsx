
"use client";

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { CardContent, CardFooter } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { OrderFormValues } from '@/lib/schemas/order-form-schema';

interface CompactFormProps {
  onGoOrder: () => void;
  onClose: () => void;
  isSubmitting: boolean;
}

const interactionOutcomes = [
    { value: "Visita", label: "Visita" },
    { value: "Llamada", label: "Llamada" },
    { value: "Email", label: "Email" },
    { value: "Seguimiento", label: "Seguimiento" },
    { value: "Otro", label: "Otro" },
];

export function CompactForm({ onGoOrder, onClose, isSubmitting }: CompactFormProps) {
    const { control, formState, trigger, getValues } = useFormContext<OrderFormValues>();

    const handleContinue = async () => {
        const result = await trigger(["outcome"]);
        if (result) {
            onGoOrder();
        }
    };

    return (
        <div className="p-6">
            <div className="space-y-6">
                 <FormField
                    control={control}
                    name="outcome"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Interacción</FormLabel>
                            <FormControl>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="grid grid-cols-2 gap-4"
                                >
                                    {interactionOutcomes.map(outcome => (
                                        <FormItem key={outcome.value} className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value={outcome.value} />
                                            </FormControl>
                                            <FormLabel className="font-normal">{outcome.label}</FormLabel>
                                        </FormItem>
                                    ))}
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notas / Resumen</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Añade un resumen de la interacción..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <DialogFooter className="pt-6 flex justify-between sm:justify-between w-full">
                <Button type="button" variant="outline" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={handleContinue}>
                    Registrar Pedido <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Guardar Interacción
                    </Button>
                </div>
            </DialogFooter>
        </div>
    );
}
