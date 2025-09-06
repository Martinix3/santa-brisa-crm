

"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type ControllerRenderProps } from "react-hook-form";
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
  FormDescription,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { InventoryItem, Category, InventoryItemFormValues, ItemBatch } from "@/types";
import { Loader2, Calendar as CalendarIcon, Info, Sparkles } from "lucide-react";
import { Separator } from "../ui/separator";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid, subDays, isEqual } from "date-fns";
import { es } from 'date-fns/locale';
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { useCategories } from "@/contexts/categories-context";
import { Label } from "../ui/label";


const itemFormSchema = z.object({
  name: z.string().min(3, "El nombre del artículo debe tener al menos 3 caracteres."),
  description: z.string().optional(),
  categoryId: z.string().min(1, "La categoría es obligatoria."),
  uom: z.enum(['unit', 'kg', 'g', 'l', 'ml']).optional(),
  safetyStock: z.coerce.number().min(0, "El stock de seguridad no puede ser negativo.").optional(),
});

// Helper component to avoid repetition and ensure controlled inputs
function NumberInput({ field, ...props }: { field: ControllerRenderProps<any, any>, [key: string]: any }) {
  const { ref, ...restOfField } = field;
  return (
    <Input
      type="number"
      ref={ref}
      {...restOfField}
      {...props}
      value={field.value ?? ""}
      onChange={(e) => {
        const value = e.target.value;
        // Send undefined back to the form state if the input is empty
        field.onChange(value === "" ? undefined : Number(value));
      }}
    />
  );
}


interface InventoryItemDialogProps {
  item: InventoryItem | null;
  itemBatches?: ItemBatch[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: InventoryItemFormValues, itemId?: string) => Promise<any>;
  isReadOnly?: boolean;
}

export default function InventoryItemDialog({ item, itemBatches = [], isOpen, onOpenChange, onSave, isReadOnly = false }: InventoryItemDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const { inventoryCategories, isLoading: isLoadingCategories } = useCategories();
  
  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: undefined,
      uom: 'unit',
      safetyStock: undefined,
    },
  });

  const weightedAverageCost = React.useMemo(() => {
    if (!itemBatches || itemBatches.length === 0) return 0;
    const totalValue = itemBatches.reduce((sum, batch) => sum + (batch.qtyRemaining * batch.unitCost), 0);
    const totalStock = itemBatches.reduce((sum, batch) => sum + batch.qtyRemaining, 0);
    return totalStock > 0 ? totalValue / totalStock : 0;
  }, [itemBatches]);


  React.useEffect(() => {
    if (isOpen) {
      if (item) {
        form.reset({
          name: item.name,
          description: item.description || "",
          categoryId: item.categoryId,
          uom: item.uom || 'unit',
          safetyStock: item.safetyStock,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          categoryId: undefined,
          uom: 'unit',
          safetyStock: undefined,
        });
      }
    }
  }, [item, isOpen, form]);

  const onSubmit = async (data: InventoryItemFormValues) => {
    if (isReadOnly) return;
    setIsSaving(true);
    await onSave(data, item?.id);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? "Detalles del Artículo de Inventario" : (item ? "Editar Artículo de Inventario" : "Añadir Nuevo Artículo de Inventario")}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? `Viendo detalles de "${item?.name}".` : (item ? "Modifica los detalles del artículo." : "Introduce la información del nuevo artículo.")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Artículo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Cubitera Metálica Grande" {...field} disabled={isReadOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {item && item.sku && (
                <div>
                    <Label>SKU (Automático)</Label>
                    <p className="font-mono text-sm text-muted-foreground p-2 border rounded-md bg-muted">{item.sku}</p>
                </div>
            )}
             {!item && (
                 <div className="flex flex-col space-y-2">
                    <Label>SKU</Label>
                    <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Se generará automáticamente al guardar
                    </div>
                </div>
            )}
            {item && (
                 <div className="p-3 bg-muted rounded-md border">
                    <Label>Coste Medio Ponderado (PMP)</Label>
                    <p className="font-semibold text-lg">
                    <FormattedNumericValue value={weightedAverageCost} options={{ style: 'currency', currency: 'EUR', minimumFractionDigits: 4 }} placeholder="Sin stock" />
                    </p>
                    <p className="text-xs text-muted-foreground">Calculado sobre el stock disponible en todos los lotes.</p>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría de Inventario</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly || isLoadingCategories}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={isLoadingCategories ? "Cargando..." : "Seleccione una categoría"} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {inventoryCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Breve descripción del artículo, características..." {...field} disabled={isReadOnly} className="min-h-[80px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="safetyStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Mínimo de Seguridad</FormLabel>
                    <FormControl>
                      <NumberInput field={field} placeholder="Ej: 100" disabled={isReadOnly} />
                    </FormControl>
                    <FormDescription className="text-xs">
                        Cuando el stock sea igual o inferior a este valor, se mostrará una alerta visual.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            
            <DialogFooter className="pt-6">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving && !isReadOnly}>{isReadOnly ? "Cerrar" : "Cancelar"}</Button></DialogClose>
              {!isReadOnly && (<Button type="submit" disabled={isSaving || (!form.formState.isDirty && !!item )}>{isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : (item ? "Guardar Cambios" : "Añadir Artículo")}</Button>)}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
