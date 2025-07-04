
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
import { Label } from "@/components/ui/label";

const uomList: UoM[] = ['unit', 'kg', 'g', 'l', 'ml'];

const bomComponentSchema = z.object({
  materialId: z.string().min(1, "Componente no asociado. Usa la búsqueda inteligente."),
  description: z.string().min(3, "La descripción del componente es obligatoria."),
  quantity: z.coerce.number().min(0.000001, "La cantidad debe ser un número positivo."),
  uom: z.enum(uomList as [UoM, ...UoM[]]).default('unit'),
});

const normalizeString = (s: string) => s.trim().toUpperCase();

const getBomRecipeSchema = (inventoryItems: InventoryItem[], currentRecipeSku?: string) => z.object({
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
    const normalizedNewSku = data.newProductSku ? normalizeString(data.newProductSku) : "";
    if (!normalizedNewSku || normalizedNewSku.length < 3) {
      ctx.addIssue({ path: ["newProductSku"], message: "El SKU es obligatorio (mín. 3 caracteres)." });
    } else {
      const skuExists = inventoryItems.some(item => item.sku && normalizeString(item.sku) === normalizedNewSku);
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
    const normalizedProductSku = normalizeString(finalProductSku);
    data.components.forEach((component, index) => {
        const componentItem = inventoryItems.find(item => item.id === component.materialId);
        if (componentItem && componentItem.sku && normalizeString(componentItem.sku) === normalizedProductSku) {
            ctx.addIssue({
                path: [`components.${index}.description`],
                message: "Un producto no puede ser componente de sí mismo.",
            });
        }
    });
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
  const [isAdding, setIsAdding] = React.useState(false);
  const [newComponentDesc, setNewComponentDesc] = React.useState("");

  const { toast } = useToast();
  
  const bomRecipeSchema = React.useMemo(() => getBomRecipeSchema(inventoryItems, recipe?.productSku), [inventoryItems, recipe?.productSku]);

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
        if (value.isNewProduct === false) {
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

  const { allCategories, isLoading: isLoadingCategories } = useCategories();
  
  const componentMaterials = React.useMemo(() => {
    if (isLoadingCategories) return [];
    
    const targetCategoryNames = ['materia prima (cogs)', 'material de embalaje (cogs)'];
    
    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    
    const normalizedTargetNames = targetCategoryNames.map(normalize);
    
    const targetCategoryIds = allCategories
      .filter(c => c.kind === 'cost' && c.isConsumable)
      .map(c => c.id);

    return inventoryItems.filter(i => i.categoryId && targetCategoryIds.includes(i.categoryId));

  }, [inventoryItems, allCategories, isLoadingCategories]);

  React.useEffect(() => {
    if (isOpen) {
      if (recipe) {
        const componentsFromRecipe = recipe.lines.map(line => {
            const material = inventoryItems.find(item => item.id === line.componentId);
            return {
                materialId: material?.id || '',
                description: material?.name || line.componentName || `ID: ${line.componentId}`,
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

  const handleAddViaAI = async () => {
    if (!newComponentDesc || componentMaterials.length === 0) return;
    setIsAdding(true);
    
    try {
        const result = await matchMaterial({
            itemName: newComponentDesc,
            existingMaterials: componentMaterials.map(m => ({
                id: m.id, name: m.name, description: m.description, categoryId: m.categoryId,
            }))
        });

        if (result.matchType === 'perfect' || result.matchType === 'suggested') {
            const matchedMaterial = inventoryItems.find(m => m.id === result.matchedMaterialId);
            if (matchedMaterial) {
                append({
                    materialId: matchedMaterial.id,
                    description: matchedMaterial.name,
                    quantity: 1,
                    uom: matchedMaterial.uom || 'unit',
                });
                toast({ title: "Componente Añadido", description: `"${matchedMaterial.name}" se ha añadido a la receta.` });
                setNewComponentDesc("");
            }
        } else {
            toast({ title: "Sin Coincidencia Clara", description: "No se encontró un componente exacto. Revisa la descripción o añádelo primero al inventario.", variant: "default" });
        }
    } catch (error) {
        console.error("Smart match failed:", error);
        toast({ title: "Error de IA", description: "No se pudo realizar la búsqueda inteligente.", variant: "destructive" });
    } finally {
        setIsAdding(false);
    }
  }


  const onSubmit = async (data: BomRecipeFormValues) => {
    setIsSaving(true);
    await onSave(data);
    setIsSaving(false);
  };
  
  const finishedGoods = React.useMemo(() => {
      const normalize = (s: string) => s.trim().toLowerCase();
      const finishedGoodCategory = allCategories.find(c => normalize(c.name) === 'producto terminado');
      if (!finishedGoodCategory) return [];
      return inventoryItems.filter(i => i.sku && i.categoryId === finishedGoodCategory.id);
  }, [inventoryItems, allCategories]);

  
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
            <fieldset disabled={isSaving || isAdding} className="space-y-4">
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
              <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-grow">
                      <Label htmlFor="new-component-desc" className="text-xs font-medium">Descripción del componente a añadir</Label>
                      <Input 
                        id="new-component-desc"
                        placeholder="Ej: Botella de vidrio 750ml, Etiqueta frontal..."
                        value={newComponentDesc}
                        onChange={(e) => setNewComponentDesc(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddViaAI(); } }}
                      />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddViaAI} disabled={isAdding || !newComponentDesc}>
                    {isAdding ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>} 
                    Añadir con IA
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-48 border rounded-md p-2">
                  <div className="space-y-3">
                  {fields.map((field, index) => (
                      <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md bg-secondary/30">
                          <div className="flex-grow space-y-2">
                              <p className="font-medium text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600"/>{field.description}</p>
                          </div>
                          <FormField control={form.control} name={`components.${index}.quantity`} render={({ field }) => (<FormItem className="w-28"><FormLabel className="text-xs">Cantidad</FormLabel><FormControl><Input type="number" step="any" placeholder="Cant." {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name={`components.${index}.uom`} render={({ field }) => (<FormItem className="w-24"><FormLabel className="text-xs">UoM</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Unidad"/></SelectTrigger></FormControl><SelectContent>{uomList.map(u => (<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                  ))}
                  {fields.length === 0 && (
                     <div className="text-center text-sm text-muted-foreground p-4">Añade componentes usando la búsqueda con IA.</div>
                  )}
                  </div>
                   <FormMessage className="p-2">{form.formState.errors.components?.root?.message}</FormMessage>
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
                <Button type="submit" disabled={isSaving || isAdding}>
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

