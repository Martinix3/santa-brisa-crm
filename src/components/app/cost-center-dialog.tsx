
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CostCenter } from "@/types";
import { Loader2 } from "lucide-react";

const costCenterTypes = ['Marketing', 'Event', 'COGS', 'Incentive', 'General'] as const;

const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  type: z.enum(costCenterTypes, { required_error: "Debe seleccionar un tipo." }),
});

export type CostCenterFormValues = z.infer<typeof formSchema>;

interface CostCenterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CostCenterFormValues, id?: string) => void;
  center: CostCenter | null;
}

export default function CostCenterDialog({ isOpen, onOpenChange, onSave, center }: CostCenterDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const isEditMode = !!center;

  const form = useForm<CostCenterFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", type: undefined },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (center) {
        form.reset({ name: center.name, type: center.type });
      } else {
        form.reset({ name: "", type: undefined });
      }
    }
  }, [isOpen, center, form]);

  const onSubmit = async (data: CostCenterFormValues) => {
    setIsSaving(true);
    await onSave(data, center?.id);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Centro de Coste" : "Nuevo Centro de Coste"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? `Modifica los detalles de "${center.name}".` : "Crea un nuevo centro de coste para la imputación de gastos."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl><Input placeholder="Ej: Evento Lanzamiento Madrid" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {costCenterTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
