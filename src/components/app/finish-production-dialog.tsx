

"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { ProductionRun, FinishProductionRunFormValues } from "@/types";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const finishProductionFormSchema = z.object({
  qtyActual: z.coerce.number().min(0.001, "La cantidad real debe ser mayor que cero."),
  notesProd: z.string().optional(),
  cleaningConfirmed: z.boolean().default(false).optional(),
  cleaningMaterial: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.cleaningConfirmed && (!data.cleaningMaterial || data.cleaningMaterial.trim().length < 3)) {
        ctx.addIssue({
            path: ["cleaningMaterial"],
            message: "Debe especificar el material de limpieza si confirma la acción.",
        });
    }
});


interface FinishProductionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: FinishProductionRunFormValues) => void;
  run: ProductionRun | null;
  isLoading: boolean;
}

export default function FinishProductionDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  run,
  isLoading,
}: FinishProductionDialogProps) {
  
  const form = useForm<FinishProductionRunFormValues>({
    resolver: zodResolver(finishProductionFormSchema),
    defaultValues: {
      qtyActual: 0,
      notesProd: "",
      cleaningConfirmed: false,
      cleaningMaterial: "",
    },
  });

  React.useEffect(() => {
    if (isOpen && run) {
      form.reset({
        qtyActual: run.qtyPlanned,
        notesProd: run.notesProd || "",
        cleaningConfirmed: false,
        cleaningMaterial: "",
      });
    }
  }, [isOpen, run, form]);
  
  const onSubmit = (data: FinishProductionRunFormValues) => {
    onConfirm(data);
  };

  if (!run) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Finalizar Orden de Producción</AlertDialogTitle>
          <AlertDialogDescription>
            Confirma la cantidad real producida para la orden <strong>{run.opCode}</strong>.
            La cantidad planificada era de <strong><FormattedNumericValue value={run.qtyPlanned} /></strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <FormField
                    control={form.control}
                    name="qtyActual"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Cantidad Real Producida</FormLabel>
                            <FormControl>
                                <Input type="number" step="any" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="notesProd"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notas de Producción (Opcional)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Añade cualquier observación sobre la producción..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                 />
                 <div className="space-y-4 pt-4 border-t">
                    <FormField
                        control={form.control}
                        name="cleaningConfirmed"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>
                                        Confirmar y registrar limpieza final de línea/tanque
                                    </FormLabel>
                                </div>
                            </FormItem>
                        )}
                    />
                    {form.watch("cleaningConfirmed") && (
                        <FormField
                            control={form.control}
                            name="cleaningMaterial"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Material de Limpieza Utilizado</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Sosa Cáustica 2%, Agua Caliente" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>
                 <AlertDialogFooter className="pt-4">
                    <AlertDialogCancel asChild>
                        <Button type="button" variant="outline" disabled={isLoading}>Cancelar</Button>
                    </AlertDialogCancel>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Finalizando...</>
                      ) : "Confirmar y Finalizar"}
                    </Button>
                </AlertDialogFooter>
            </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
