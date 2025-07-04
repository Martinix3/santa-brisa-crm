"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { CategoryKind } from "@/types";
import { Loader2 } from "lucide-react";

const categoryFormSchema = z.object({
  name: z.string().min(3, "El nombre de la categoría debe tener al menos 3 caracteres."),
  isConsumable: z.boolean().default(true),
});

export type CategoryFormValues = Omit<z.infer<typeof categoryFormSchema>, 'id' | 'createdAt' | 'updatedAt'> & { kind: CategoryKind };

interface CategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CategoryFormValues) => void;
  categoryKind: CategoryKind;
}

export default function CategoryDialog({ isOpen, onOpenChange, onSave, categoryKind }: CategoryDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<z.infer<typeof categoryFormSchema>>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      isConsumable: true,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({ name: "", isConsumable: true });
    }
  }, [isOpen, form]);

  const onSubmit = async (data: z.infer<typeof categoryFormSchema>) => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onSave({ ...data, kind: categoryKind });
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Categoría de {categoryKind === 'inventory' ? 'Inventario' : 'Coste'}</DialogTitle>
          <DialogDescription>
            Crea una nueva categoría para organizar tus artículos.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Categoría</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Merchandising Físico" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {categoryKind === 'inventory' && (
              <FormField
                control={form.control}
                name="isConsumable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Es un artículo consumible
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Marcar si el stock de este tipo de artículo se agota (ej: botellas, folletos).
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                ) : (
                  "Crear Categoría"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
