
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductionRun, InventoryItem } from "@/types";
import { Loader2 } from "lucide-react";
import { useCategories } from "@/contexts/categories-context";

const productionRunFormSchema = z.object({
  productSku: z.string().min(1, "Debe seleccionar el producto a fabricar."),
  productName: z.string(), // This will be set automatically
  qtyPlanned: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
});

export type ProductionRunFormValues = z.infer<typeof productionRunFormSchema>;

interface ProductionRunDialogProps {
  productionRun: ProductionRun | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ProductionRunFormValues, runId?: string) => void;
  inventoryItems: InventoryItem[];
}

export default function ProductionRunDialog({ productionRun, isOpen, onOpenChange, onSave, inventoryItems }: ProductionRunDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const { categoriesMap } = useCategories();
  
  const form = useForm<ProductionRunFormValues>({
    resolver: zodResolver(productionRunFormSchema),
    defaultValues: {
      productSku: "",
      productName: "",
      qtyPlanned: 1,
    },
  });

  const handleProductSelectChange = (sku: string) => {
    const selectedItem = inventoryItems.find(item => item.sku === sku);
    form.setValue("productSku", sku);
    form.setValue("productName", selectedItem?.name || "");
  };

  React.useEffect(() => {
    if (isOpen) {
      if (productionRun) {
        form.reset({
            productSku: productionRun.productSku,
            productName: productionRun.productName,
            qtyPlanned: productionRun.qtyPlanned,
        });
      } else {
        form.reset({ productSku: "", productName: "", qtyPlanned: 1 });
      }
    }
  }, [productionRun, isOpen, form]);

  const onSubmit = async (data: ProductionRunFormValues) => {
    setIsSaving(true);
    await onSave(data, productionRun?.id);
    setIsSaving(false);
  };
  
  const finishedGoods = inventoryItems.filter(i => categoriesMap.get(i.categoryId)?.name === "Producto Terminado");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{productionRun ? "Editar Orden" : "Nueva Orden de Producción"}</DialogTitle>
          <DialogDescription>
            Planifica la producción de un nuevo lote de producto terminado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control} name="productSku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Producto a Fabricar (SKU)</FormLabel>
                  <Select onValueChange={handleProductSelectChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger></FormControl>
                    <SelectContent>{finishedGoods.map(item => (<SelectItem key={item.id} value={item.sku!}>{item.name} ({item.sku})</SelectItem>))}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control} name="qtyPlanned"
                render={({ field }) => (<FormItem><FormLabel>Cantidad Planificada</FormLabel><FormControl><Input type="number" step="1" {...field} /></FormControl><FormMessage /></FormItem>)}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Guardar Orden"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
