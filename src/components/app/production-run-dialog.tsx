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
import type { ProductionRun, InventoryItem } from "@/types";
import { Loader2, Sparkles, CheckCircle } from "lucide-react";
import { useCategories } from "@/contexts/categories-context";
import { useToast } from "@/hooks/use-toast";
import { matchMaterial } from "@/ai/flows/material-matching-flow";
import { Label } from "@/components/ui/label";

const productionRunFormSchema = z.object({
  productSearchTerm: z.string().optional(),
  productSku: z.string().min(1, "Debe buscar y asociar un producto a fabricar."),
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

const normalizeStringForComparison = (s: string) => 
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export default function ProductionRunDialog({ productionRun, isOpen, onOpenChange, onSave, inventoryItems }: ProductionRunDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const { allCategories } = useCategories();
  const { toast } = useToast();
  
  const form = useForm<ProductionRunFormValues>({
    resolver: zodResolver(productionRunFormSchema),
    defaultValues: {
      productSku: "",
      productName: "",
      productSearchTerm: "",
      qtyPlanned: 1,
    },
  });

  const handleProductSearch = async () => {
      const searchTerm = form.getValues("productSearchTerm");
      if (!searchTerm) return;
      
      setIsSearching(true);
      try {
          const normalizedTargetName = normalizeStringForComparison("Producto Terminado");
          const finishedGoodCategory = allCategories.find(c => normalizeStringForComparison(c.name) === normalizedTargetName);
          
          if (!finishedGoodCategory) {
              toast({ title: "Categoría no encontrada", description: "La categoría 'Producto Terminado' no existe. Por favor, créala.", variant: "destructive" });
              setIsSearching(false);
              return;
          }

          const finishedGoods = inventoryItems.filter(i => i.categoryId === finishedGoodCategory.id);
          
          if (finishedGoods.length === 0) {
              toast({ title: "Sin Productos Terminados", description: "No hay productos en la categoría 'Producto Terminado' para buscar.", variant: "destructive" });
              setIsSearching(false);
              return;
          }

          const result = await matchMaterial({
              itemName: searchTerm,
              existingMaterials: finishedGoods.map(m => ({ id: m.id, name: m.name, description: m.description, categoryId: m.categoryId }))
          });
          
          if (result.matchType === 'perfect' || result.matchType === 'suggested') {
              const matchedItem = finishedGoods.find(item => item.id === result.matchedMaterialId);
              if (matchedItem && matchedItem.sku) {
                  form.setValue("productSku", matchedItem.sku, { shouldValidate: true });
                  form.setValue("productName", matchedItem.name, { shouldValidate: true });
                  form.setValue("productSearchTerm", matchedItem.name); // Update search term to matched name
                  toast({ title: "Producto Encontrado", description: `Se ha seleccionado "${matchedItem.name}".`});
              } else {
                  toast({ title: "Producto sin SKU", description: "El producto encontrado no tiene un SKU asociado y no puede ser fabricado.", variant: "destructive"});
              }
          } else {
              toast({ title: "Sin Coincidencia Clara", description: "No se encontró un producto terminado que coincida con la búsqueda.", variant: "default" });
          }
      } catch (error) {
          console.error("Error during product search:", error);
          toast({ title: "Error de IA", description: "La búsqueda inteligente falló.", variant: "destructive"});
      } finally {
          setIsSearching(false);
      }
  };

  React.useEffect(() => {
    if (isOpen) {
      if (productionRun) {
        form.reset({
            productSku: productionRun.productSku,
            productName: productionRun.productName,
            productSearchTerm: productionRun.productName,
            qtyPlanned: productionRun.qtyPlanned,
        });
      } else {
        form.reset({ productSku: "", productName: "", productSearchTerm: "", qtyPlanned: 1 });
      }
    }
  }, [productionRun, isOpen, form]);

  const onSubmit = async (data: ProductionRunFormValues) => {
    setIsSaving(true);
    await onSave(data, productionRun?.id);
    setIsSaving(false);
  };
  
  const isProductSelected = !!form.watch("productSku");

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
            <fieldset disabled={isSaving}>
              <div className="space-y-2">
                  <Label>Producto a Fabricar</Label>
                  <div className="flex items-end gap-2">
                      <FormField
                          control={form.control}
                          name="productSearchTerm"
                          render={({ field }) => (
                              <FormItem className="flex-grow">
                                  <FormControl>
                                      <Input placeholder="Buscar producto terminado..." {...field} disabled={isProductSelected || isSearching} />
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={handleProductSearch} disabled={isSearching || isProductSelected}>
                          {isSearching ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>} 
                          Buscar
                      </Button>
                  </div>
              </div>
              
              {isProductSelected && (
                  <div className="p-3 border rounded-md bg-green-50 text-green-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5"/>
                        <p className="font-medium">{form.getValues("productName")}</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => {
                          form.setValue("productSku", "");
                          form.setValue("productName", "");
                          form.setValue("productSearchTerm", "");
                      }}>Cambiar</Button>
                  </div>
              )}
               <FormMessage>{form.formState.errors.productSku?.message}</FormMessage>

              <FormField
                  control={form.control} name="qtyPlanned"
                  render={({ field }) => (<FormItem><FormLabel>Cantidad Planificada</FormLabel><FormControl><Input type="number" step="1" {...field} /></FormControl><FormMessage /></FormItem>)}
              />
            </fieldset>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving || isSearching}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Guardar Orden"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
