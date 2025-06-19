
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PromotionalMaterial, PromotionalMaterialType } from "@/types";
import { promotionalMaterialTypeList } from "@/lib/data";
import { Loader2 } from "lucide-react";

const materialFormSchema = z.object({
  name: z.string().min(3, "El nombre del material debe tener al menos 3 caracteres."),
  description: z.string().optional(),
  type: z.enum(promotionalMaterialTypeList as [PromotionalMaterialType, ...PromotionalMaterialType[]], {
    required_error: "El tipo de material es obligatorio.",
  }),
  unitCost: z.coerce.number().min(0, "El coste unitario debe ser un número no negativo."),
});

export type PromotionalMaterialFormValues = z.infer<typeof materialFormSchema>;

interface PromotionalMaterialDialogProps {
  material: PromotionalMaterial | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PromotionalMaterialFormValues, materialId?: string) => void;
  isReadOnly?: boolean;
}

export default function PromotionalMaterialDialog({ material, isOpen, onOpenChange, onSave, isReadOnly = false }: PromotionalMaterialDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<PromotionalMaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      name: "",
      description: "",
      type: undefined,
      unitCost: 0,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (material) {
        form.reset({
          name: material.name,
          description: material.description || "",
          type: material.type,
          unitCost: material.unitCost,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          type: undefined,
          unitCost: 0,
        });
      }
    }
  }, [material, isOpen, form]);

  const onSubmit = async (data: PromotionalMaterialFormValues) => {
    if (isReadOnly) return;
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500)); 
    onSave(data, material?.id);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? "Detalles del Material Promocional" : (material ? "Editar Material Promocional" : "Añadir Nuevo Material Promocional")}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? `Viendo detalles de "${material?.name}".` : (material ? "Modifica los detalles del material." : "Introduce la información del nuevo material promocional.")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Material</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Cubitera Metálica Grande" {...field} disabled={isReadOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Material</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Seleccione un tipo" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {promotionalMaterialTypeList.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unitCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coste Unitario (€)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="Ej: 15.50" {...field} disabled={isReadOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Breve descripción del material, características..." {...field} disabled={isReadOnly} className="min-h-[80px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving && !isReadOnly}>
                  {isReadOnly ? "Cerrar" : "Cancelar"}
                </Button>
              </DialogClose>
              {!isReadOnly && (
                <Button type="submit" disabled={isSaving || !form.formState.isDirty && !!material}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    material ? "Guardar Cambios" : "Añadir Material"
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
