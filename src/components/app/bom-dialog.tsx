
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
import type { BomLine, InventoryItem, UoM } from "@/types";
import { Loader2 } from "lucide-react";
import { useCategories } from "@/contexts/categories-context";

const uomList: UoM[] = ['unit', 'kg', 'g', 'l', 'ml'];

const bomLineFormSchema = z.object({
  productSku: z.string().min(1, "Debe seleccionar el producto a fabricar."),
  componentSku: z.string().min(1, "Debe seleccionar un componente."),
  quantity: z.coerce.number().min(0.000001, "La cantidad debe ser un número positivo."),
  uom: z.enum(uomList as [UoM, ...UoM[]]),
});

export type BomLineFormValues = z.infer<typeof bomLineFormSchema>;

interface BomDialogProps {
  bomLine: BomLine | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: BomLineFormValues, lineId?: string) => void;
  inventoryItems: InventoryItem[];
}

export default function BomDialog({ bomLine, isOpen, onOpenChange, onSave, inventoryItems }: BomDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<BomLineFormValues>({
    resolver: zodResolver(bomLineFormSchema),
    defaultValues: {
      productSku: "",
      componentSku: "",
      quantity: 1,
      uom: "unit",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (bomLine) {
        form.reset(bomLine);
      } else {
        form.reset({ productSku: "", componentSku: "", quantity: 1, uom: "unit" });
      }
    }
  }, [bomLine, isOpen, form]);

  const onSubmit = async (data: BomLineFormValues) => {
    setIsSaving(true);
    await onSave(data, bomLine?.id);
    setIsSaving(false);
  };
  
  const { categoriesMap } = useCategories();
  const finishedGoods = inventoryItems.filter(i => categoriesMap.get(i.categoryId)?.name === "Producto Terminado" && i.sku);
  const components = inventoryItems.filter(i => categoriesMap.get(i.categoryId)?.name !== "Producto Terminado" && i.sku);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bomLine ? "Editar Línea de Receta" : "Añadir Línea a Receta"}</DialogTitle>
          <DialogDescription>
            Define qué componente se necesita y en qué cantidad para fabricar un producto terminado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control} name="productSku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Producto a Fabricar (SKU)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar producto terminado..." /></SelectTrigger></FormControl>
                    <SelectContent>{finishedGoods.map(item => (<SelectItem key={item.id} value={item.sku!}>{item.name} ({item.sku})</SelectItem>))}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control} name="componentSku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Componente Requerido (SKU)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar componente..." /></SelectTrigger></FormControl>
                    <SelectContent>{components.map(item => (<SelectItem key={item.id} value={item.sku!}>{item.name} ({item.sku})</SelectItem>))}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control} name="quantity"
                    render={({ field }) => (<FormItem><FormLabel>Cantidad de Componente</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>)}
                />
                <FormField
                    control={form.control} name="uom"
                    render={({ field }) => (<FormItem><FormLabel>Unidad de Medida (UoM)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{uomList.map(u => (<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}
                />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Guardar Línea"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
