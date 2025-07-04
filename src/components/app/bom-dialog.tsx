
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
import { Loader2, PlusCircle, Trash2, Sparkles, CheckCircle } from "lucide-react";
import { useCategories } from "@/contexts/categories-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { matchMaterial } from "@/ai/flows/material-matching-flow";
import { useToast } from "@/hooks/use-toast";

const uomList: UoM[] = ['unit', 'kg', 'g', 'l', 'ml'];

const bomComponentSchema = z.object({
  materialId: z.string().optional(),
  description: z.string().min(3, "La descripción del componente es obligatoria."),
  componentSku: z.string().optional(),
  quantity: z.coerce.number().min(0.000001, "La cantidad debe ser un número positivo."),
  uom: z.enum(uomList as [UoM, ...UoM[]]).default('unit'),
});

const getBomRecipeSchema = (inventoryItems: InventoryItem[]) => z.object({
  isNewProduct: z.boolean().default(false),
  productSku: z.string().optional(),
  newProductName: z.string().optional(),
  newProductSku: z.string().optional(),
  components: z.array(bomComponentSchema).min(1, "Debe añadir al menos un componente."),
}).superRefine((data, ctx) => {
  const finalProductSku = data.isNewProduct ? data.newProductSku : data.productSku;

  if (data.isNewProduct) {
    if (!data.newProductName || data.newProductName.length < 3) {
      ctx.addIssue({ path: ["newProductName"], message: "El nombre es obligatorio (mín. 3 caracteres)." });
    }
    const normalizedNewSku = data.newProductSku?.trim().toLowerCase();
    if (!normalizedNewSku || normalizedNewSku.length < 3) {
      ctx.addIssue({ path: ["newProductSku"], message: "El SKU es obligatorio (mín. 3 caracteres)." });
    } else {
      const skuExists = inventoryItems.some(item => item.sku && item.sku.trim().toLowerCase() === normalizedNewSku);
      if (skuExists) {
        ctx.addIssue({ path: ["newProductSku"], message: "Este SKU ya existe en el inventario." });
      }
    }
  } else {
    if (!data.productSku) {
      ctx.addIssue({ path: ["productSku"], message: "Debe seleccionar un producto existente." });
    }
  }

  // Check for recursion
  if (finalProductSku) {
    const normalizedProductSku = finalProductSku.trim().toLowerCase();
    data.components.forEach((component, index) => {
        const componentItem = inventoryItems.find(item => item.id === component.materialId);
        if (componentItem && componentItem.sku && componentItem.sku.trim().toLowerCase() === normalizedProductSku) {
            ctx.addIssue({
                path: [`components.${index}.description`],
                message: "Un producto no puede ser componente de sí mismo.",
            });
        }
    });
  }

  // Check if all components are matched
  data.components.forEach((component, index) => {
    if (!component.materialId) {
        ctx.addIssue({
            path: [`components.${index}.description`],
            message: "Busca y asocia un componente del inventario.",
        });
    }
  });

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
  const [matchingStatus, setMatchingStatus] = React.useState<Record<number, 'idle' | 'matching' | 'matched' | 'failed'>>({});
  const { toast } = useToast();
  
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
    const subscription = form.watch((value, { name, type }) => {
      if (name === 'isNewProduct' && type === 'change') {
        if (!value.isNewProduct) {
          form.setValue('newProductName', '');
          form.setValue('newProductSku', '');
        } else {
          form.setValue('productSku', undefined);
        }
        form.clearErrors(["newProductName", "newProductSku", "productSku"]);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  React.useEffect(() => {
    if (isOpen) {
      setMatchingStatus({});
      if (recipe) {
        const componentsFromRecipe = recipe.lines.map(line => {
            const material = inventoryItems.find(item => item.sku === line.componentSku);
            return {
                materialId: material?.id || '',
                description: material?.name || `SKU: ${line.componentSku}`,
                componentSku: line.componentSku,
                quantity: line.quantity,
                uom: line.uom,
            };
        });
        form.reset({
            isNewProduct: false,
            productSku: recipe.productSku,
            newProductName: "",
            newProductSku: "",
            components: componentsFromRecipe,
        });
      } else {
        form.reset({ isNewProduct: false, productSku: "", newProductName: "", newProductSku: "", components: [] });
      }
    }
  }, [recipe, isOpen, form, inventoryItems]);

  const handleSmartMatch = async (index: number) => {
    const description = form.getValues(`components.${index}.description`);
    if (!description || inventoryItems.length === 0) return;

    setMatchingStatus(prev => ({ ...prev, [index]: 'matching' }));
    
    try {
        const result = await matchMaterial({
            itemName: description,
            existingMaterials: inventoryItems.map(m => ({
                id: m.id,
                name: m.name,
                description: m.description,
                categoryId: m.categoryId,
            }))
        });

        if (result.matchType === 'perfect' || result.matchType === 'suggested') {
            const matchedMaterial = inventoryItems.find(m => m.id === result.matchedMaterialId);
            if (matchedMaterial) {
                form.setValue(`components.${index}.materialId`, matchedMaterial.id);
                form.setValue(`components.${index}.componentSku`, matchedMaterial.sku || '');
                form.setValue(`components.${index}.uom`, matchedMaterial.uom || 'unit');
                form.setValue(`components.${index}.description`, matchedMaterial.name);
                setMatchingStatus(prev => ({ ...prev, [index]: 'matched' }));
                toast({ title: "Componente Encontrado", description: `"${matchedMaterial.name}" ha sido asociado.` });
            }
        } else {
            setMatchingStatus(prev => ({ ...prev, [index]: 'failed' }));
            toast({ title: "Sin Coincidencia Clara", description: "No se encontró un componente exacto. Revisa la descripción.", variant: "default" });
        }

    } catch (error) {
        console.error("Smart match failed:", error);
        setMatchingStatus(prev => ({ ...prev, [index]: 'failed' }));
        toast({ title: "Error de IA", description: "No se pudo realizar la búsqueda inteligente.", variant: "destructive" });
    }
  }


  const onSubmit = async (data: BomRecipeFormValues) => {
    setIsSaving(true);
    await onSave(data);
    setIsSaving(false);
  };
  
  const { categoriesMap } = useCategories();

  const finishedGoods = React.useMemo(() => 
    inventoryItems.filter(i => i.sku && categoriesMap.get(i.categoryId)?.name === "Producto Terminado"),
    [inventoryItems, categoriesMap]
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
            <fieldset disabled={isSaving} className="space-y-4">
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
                      <div key={field.id} className="flex flex-col gap-3 p-3 border rounded-md bg-secondary/30">
                          <div className="flex items-end gap-2">
                              <FormField control={form.control} name={`components.${index}.description`} render={({ field }) => (<FormItem className="flex-grow"><FormLabel className="text-xs">Descripción Componente</FormLabel><FormControl><Input placeholder="Ej: Botella de vidrio 750ml" {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <Button type="button" variant="outline" size="sm" onClick={() => handleSmartMatch(index)} disabled={matchingStatus[index] === 'matching'}>{matchingStatus[index] === 'matching' ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>} Buscar</Button>
                          </div>
                          <div className="flex items-end gap-2">
                              <FormField control={form.control} name={`components.${index}.quantity`} render={({ field }) => (<FormItem className="w-28"><FormLabel className="text-xs">Cantidad</FormLabel><FormControl><Input type="number" step="any" placeholder="Cant." {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name={`components.${index}.uom`} render={({ field }) => (<FormItem className="w-24"><FormLabel className="text-xs">UoM</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Unidad"/></SelectTrigger></FormControl><SelectContent>{uomList.map(u => (<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                              <div className="flex-grow text-right pr-2">
                                {form.getValues(`components.${index}.materialId`) && matchingStatus[index] !== 'matching' && (<div className="flex items-center justify-end gap-1 text-green-600 text-xs"><CheckCircle className="h-4 w-4"/> Asociado</div>)}
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                      </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ materialId: '', description: '', componentSku: '', quantity: 1, uom: 'unit' })}><PlusCircle className="mr-2 h-4 w-4" />Añadir Componente</Button>
                  <FormMessage className="p-2">{form.formState.errors.components?.root?.message}</FormMessage>
                  </div>
              </ScrollArea>
            </fieldset>

            <DialogFooter className="pt-4 flex justify-between w-full">
              <div>
                {isEditing && (
                   <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" disabled={isSaving}>Eliminar Receta</Button>
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
                <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button></DialogClose>
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
