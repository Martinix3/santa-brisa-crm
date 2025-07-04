
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { useCategories } from "@/contexts/categories-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

const uomList: UoM[] = ['unit', 'kg', 'g', 'l', 'ml'];

const bomComponentSchema = z.object({
  componentSku: z.string().min(1, "Debe seleccionar un componente."),
  quantity: z.coerce.number().min(0.000001, "La cantidad debe ser un número positivo."),
  uom: z.enum(uomList as [UoM, ...UoM[]]),
});

const getBomRecipeSchema = (inventoryItems: InventoryItem[]) => z.object({
  isNewProduct: z.boolean().default(false),
  productSku: z.string().optional(),
  newProductName: z.string().optional(),
  newProductSku: z.string().optional(),
  components: z.array(bomComponentSchema).min(1, "Debe añadir al menos un componente."),
}).superRefine((data, ctx) => {
  if (data.isNewProduct) {
    if (!data.newProductName || data.newProductName.length < 3) {
      ctx.addIssue({ path: ["newProductName"], message: "El nombre es obligatorio (mín. 3 caracteres)." });
    }
    if (!data.newProductSku || data.newProductSku.length < 3) {
      ctx.addIssue({ path: ["newProductSku"], message: "El SKU es obligatorio (mín. 3 caracteres)." });
    } else {
      const skuExists = inventoryItems.some(item => item.sku?.toLowerCase() === data.newProductSku?.toLowerCase());
      if (skuExists) {
        ctx.addIssue({ path: ["newProductSku"], message: "Este SKU ya existe en el inventario." });
      }
    }
  } else {
    if (!data.productSku) {
      ctx.addIssue({ path: ["productSku"], message: "Debe seleccionar un producto existente." });
    }
  }
});


export type BomRecipeFormValues = z.infer<ReturnType<typeof getBomRecipeSchema>>;

interface BomDialogProps {
  recipe: { productSku: string; lines: BomLine[] } | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: BomRecipeFormValues) => void;
  onDelete: (productSku: string) => void;
  inventoryItems: InventoryItem[];
}

export default function BomDialog({ recipe, isOpen, onOpenChange, onSave, onDelete, inventoryItems }: BomDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  
  const bomRecipeSchema = React.useMemo(() => getBomRecipeSchema(inventoryItems), [inventoryItems]);

  const form = useForm<BomRecipeFormValues>({
    resolver: zodResolver(bomRecipeSchema),
    defaultValues: {
      isNewProduct: false,
      productSku: "",
      newProductName: "",
      newProductSku: "",
      components: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "components",
  });

  const isNewProduct = form.watch("isNewProduct");

  React.useEffect(() => {
    if (isOpen) {
      if (recipe) {
        form.reset({
            isNewProduct: false,
            productSku: recipe.productSku,
            newProductName: "",
            newProductSku: "",
            components: recipe.lines.map(line => ({
                componentSku: line.componentSku,
                quantity: line.quantity,
                uom: line.uom,
            })),
        });
      } else {
        form.reset({ isNewProduct: false, productSku: "", newProductName: "", newProductSku: "", components: [] });
      }
    }
  }, [recipe, isOpen, form]);

  const onSubmit = async (data: BomRecipeFormValues) => {
    setIsSaving(true);
    await onSave(data);
    setIsSaving(false);
  };
  
  const { categoriesMap, costCategories } = useCategories();

  const finishedGoods = React.useMemo(() => 
    inventoryItems.filter(i => i.sku && categoriesMap.get(i.categoryId)?.name === "Producto Terminado"),
    [inventoryItems, categoriesMap]
  );
  
  const cogsCategoryIds = React.useMemo(() => {
    return costCategories.map(c => c.id);
  }, [costCategories]);

  const components = React.useMemo(() => 
    inventoryItems.filter(i => i.sku && i.categoryId && cogsCategoryIds.includes(i.categoryId)),
    [inventoryItems, cogsCategoryIds]
  );
  
  const isEditing = !!recipe;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Receta" : "Crear Nueva Receta"}</DialogTitle>
          <DialogDescription>
            Define los componentes y cantidades para fabricar un producto terminado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            {!isEditing && (
              <FormField
                control={form.control}
                name="isNewProduct"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-3 shadow-sm">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Crear un nuevo producto terminado</FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            )}

            {isNewProduct && !isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="newProductName" render={({ field }) => ( <FormItem><FormLabel>Nombre Nuevo Producto</FormLabel><FormControl><Input placeholder="Ej: Santa Brisa 200ml" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="newProductSku" render={({ field }) => ( <FormItem><FormLabel>SKU Nuevo Producto</FormLabel><FormControl><Input placeholder="Ej: SB-200ML" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              </div>
            ) : (
              <FormField control={form.control} name="productSku" render={({ field }) => ( <FormItem><FormLabel>Producto a Fabricar</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isEditing}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar producto terminado..." /></SelectTrigger></FormControl><SelectContent>{finishedGoods.map(item => (<SelectItem key={item.id} value={item.sku!}>{item.name} ({item.sku})</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
            )}
            
            <h4 className="font-medium">Componentes de la Receta</h4>
            <ScrollArea className="h-64 border rounded-md p-2">
                <div className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md bg-secondary/30">
                        <FormField control={form.control} name={`components.${index}.componentSku`} render={({ field }) => (<FormItem className="flex-grow"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar componente..." /></SelectTrigger></FormControl><SelectContent>{components.map(item => (<SelectItem key={item.id} value={item.sku!}>{item.name} ({item.sku})</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`components.${index}.quantity`} render={({ field }) => (<FormItem className="w-28"><FormControl><Input type="number" step="any" placeholder="Cant." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`components.${index}.uom`} render={({ field }) => (<FormItem className="w-24"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{uomList.map(u => (<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                ))}
                 <Button type="button" variant="outline" size="sm" onClick={() => append({ componentSku: "", quantity: 1, uom: 'unit' })}><PlusCircle className="mr-2 h-4 w-4" />Añadir Componente</Button>
                </div>
            </ScrollArea>
             <FormMessage>{form.formState.errors.components?.root?.message}</FormMessage>

            <DialogFooter className="pt-4 flex justify-between w-full">
              <div>
                {isEditing && (
                   <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive">Eliminar Receta</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción es irreversible y eliminará toda la receta para este producto.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(recipe.productSku)} variant="destructive">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                )}
              </div>
              <div className="flex gap-2">
                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Guardar Receta"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
