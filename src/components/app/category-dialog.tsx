

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
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TipoCategoria as CategoryKind } from "@ssot";

const categoryFormSchema = z.object({
  name: z.string().min(3, "El nombre de la categoría debe tener al menos 3 caracteres."),
  kind: z.enum(['inventory', 'cost'], { required_error: 'Debe seleccionar un tipo de categoría.' }),
  isConsumable: z.boolean().default(true),
  costType: z.enum(['fixed', 'variable']).optional(),
}).superRefine((data, ctx) => {
    if (data.kind === 'cost' && !data.costType) {
        ctx.addIssue({ path: ['costType'], message: 'Debe seleccionar un tipo de coste.' });
    }
});

export type CategoryFormValues = Omit<z.infer<typeof categoryFormSchema>, 'id' | 'createdAt' | 'updatedAt' | 'idOverride'>;

interface CategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CategoryFormValues) => void;
}

export default function CategoryDialog({ isOpen, onOpenChange, onSave }: CategoryDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<z.infer<typeof categoryFormSchema>>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      kind: 'cost',
      isConsumable: false,
      costType: 'variable',
    },
  });

  const watchKind = form.watch('kind');

  React.useEffect(() => {
    if (isOpen) {
      form.reset({ name: "", kind: 'cost', isConsumable: false, costType: 'variable' });
    }
  }, [isOpen, form]);

  const onSubmit = async (data: z.infer<typeof categoryFormSchema>) => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const dataToSave: CategoryFormValues = {
        ...data,
    };
    if (data.kind === 'inventory') {
        dataToSave.costType = undefined;
    } else {
        dataToSave.isConsumable = false; // Costs are not consumable in stock terms
    }
    onSave(dataToSave);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Categoría</DialogTitle>
          <DialogDescription>
            Crea una nueva categoría para organizar tus artículos o gastos.
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
                    <Input placeholder="Ej: Materia Prima (COGS)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Tipo de Categoría</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="cost" /></FormControl>
                          <FormLabel className="font-normal">Gasto / Coste</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="inventory" /></FormControl>
                          <FormLabel className="font-normal">Inventario</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            {watchKind === 'inventory' ? (
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
                        Marcar si el stock se agota (ej: botellas, folletos).
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            ) : (
                <FormField
                control={form.control}
                name="costType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Clasificación del Coste</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="variable" /></FormControl>
                          <FormLabel className="font-normal">Variable</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="fixed" /></FormControl>
                          <FormLabel className="font-normal">Fijo</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
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
