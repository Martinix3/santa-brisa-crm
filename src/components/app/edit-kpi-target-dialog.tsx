
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Kpi } from "@/types";
import { Loader2 } from "lucide-react";

const editKpiTargetFormSchema = z.object({
  targetValue: z.coerce.number().min(0, "El valor objetivo debe ser un número no negativo."),
});

export type EditKpiTargetFormValues = z.infer<typeof editKpiTargetFormSchema>;

interface EditKpiTargetDialogProps {
  kpi: Kpi | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (kpiId: string, newTargetValue: number) => void;
}

export default function EditKpiTargetDialog({ kpi, isOpen, onOpenChange, onSave }: EditKpiTargetDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<EditKpiTargetFormValues>({
    resolver: zodResolver(editKpiTargetFormSchema),
    defaultValues: {
      targetValue: 0,
    },
  });

  React.useEffect(() => {
    if (kpi && isOpen) {
      form.reset({
        targetValue: kpi.targetValue,
      });
    }
  }, [kpi, isOpen, form]);

  const onSubmit = async (data: EditKpiTargetFormValues) => {
    if (!kpi) return;
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    onSave(kpi.id, data.targetValue);
    setIsSaving(false);
    // onOpenChange(false); // Dialog close is handled by parent
  };

  if (!kpi) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Meta para: {kpi.title}</DialogTitle>
          <DialogDescription>
            Ajusta el valor objetivo para este KPI. La unidad es: {kpi.unit}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
            <FormField
              control={form.control}
              name="targetValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuevo Valor Objetivo ({kpi.unit})</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder={`p. ej., ${kpi.targetValue}`} 
                      {...field} 
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Meta"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
