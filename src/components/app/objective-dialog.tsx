
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { StrategicObjective } from "@/types";
import { Loader2 } from "lucide-react";

const objectiveFormSchema = z.object({
  text: z.string().min(10, "La descripción del objetivo debe tener al menos 10 caracteres."),
  completed: z.boolean().default(false),
});

export type ObjectiveFormValues = z.infer<typeof objectiveFormSchema>;

interface ObjectiveDialogProps {
  objective: StrategicObjective | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ObjectiveFormValues) => void;
}

export default function ObjectiveDialog({ objective, isOpen, onOpenChange, onSave }: ObjectiveDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<ObjectiveFormValues>({
    resolver: zodResolver(objectiveFormSchema),
    defaultValues: {
      text: "",
      completed: false,
    },
  });

  React.useEffect(() => {
    if (objective && isOpen) {
      form.reset({
        text: objective.text,
        completed: objective.completed,
      });
    } else if (!objective && isOpen) {
      form.reset({
        text: "",
        completed: false,
      });
    }
  }, [objective, isOpen, form]);

  const onSubmit = async (data: ObjectiveFormValues) => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    onSave(data);
    setIsSaving(false);
    // onOpenChange(false); // Dialog close is handled by parent
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{objective ? "Editar Objetivo Estratégico" : "Añadir Nuevo Objetivo Estratégico"}</DialogTitle>
          <DialogDescription>
            {objective ? "Modifica los detalles del objetivo." : "Define un nuevo objetivo estratégico para la empresa."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción del Objetivo</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Expandir al mercado de la región Norte para Q3..." {...field} className="min-h-[100px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="completed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Marcar como completado
                    </FormLabel>
                    <FormMessage />
                  </div>
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
                  objective ? "Guardar Cambios" : "Añadir Objetivo"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
