
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
import type { BomLine, InventoryItem, UoM, BomKind } from "@/types";
import { Loader2, PlusCircle, Trash2, Sparkles } from "lucide-react";
import { useCategories } from "@/contexts/categories-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { createNewProductAndRecipeFS, saveRecipeFS } from "@/services/bom-service";

const uomList: UoM[] = ['unit', 'kg', 'g', 'l', 'ml'];

const bomComponentSchema = z.object({
  materialId: z.string().min(1, "Componente no asociado. Usa la búsqueda inteligente."),
  description: z.string().min(3, "La descripción del componente es obligatoria."),
  quantity: z.coerce.number().min(0.000001, "La cantidad debe ser un número positivo."),
  uom: z.enum(uomList as [UoM, ...UoM[]]).default('unit'),
});

const normalizeStringForComparison = (s: string) => 
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const getBomRecipeSchema = (inventoryItems: InventoryItem[], currentRecipeSku?: string) => z.object({
  type: z.enum(["blend", "fill"], { required_error: "Debe seleccionar un tipo de orden." }),
  isNewProduct: z.boolean().default(false),
  productSku: z.string().optional(),
  newProductName: z.string().optional(),
  components: z.array(bomComponentSchema).min(1, "Debe añadir al menos un componente."),
}).superRefine((data, ctx) => {
  if (data.isNewProduct) {
    if (!data.newProductName || data.newProductName.length < 3) {
      ctx.addIssue({ code: 'custom', path: ["newProductName"], message: "El nombre es obligatorio (mín. 3 caracteres)." });
    }
  } else {
    if (!data.productSku) {
      ctx.addIssue({ code: 'custom', path: ["productSku"], message: "Debe seleccionar un producto existente." });
    }
  }

  // Check for recursion only for existing products
  if (!data.isNewProduct && data.productSku) {
    const normalizedProductSku = normalizeStringForComparison(data.productSku);
    data.components.forEach((component, index) => {
        const componentItem = inventoryItems.find(item => item.id === component.materialId);
        if (componentItem && componentItem.sku && normalizeStringForComparison(componentItem.sku) === normalizedProductSku) {
            ctx.addIssue({
                code: 'custom',
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
  onSave: () => Promise<void>; 
  onDelete: (productSku: string) => void;
  inventoryItems: InventoryItem[];
}

export default function BomDialog({ recipe, isOpen, onOpenChange, onSave, onDelete, inventoryItems }: BomDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedComponentId, setSelectedComponentId] = React.useState("");
  const { toast } = useToast();
  
  const bomRecipeSchema = React.useMemo(() => getBomRecipeSchema(inventoryItems, recipe?.productSku), [inventoryItems, recipe?.productSku]);

  const form = useForm<BomRecipeFormValues>({
    resolver: zodResolver(bomRecipeSchema),
    defaultValues: {
      type: undefined,
      isNewProduct: false,
      productSku: "",
      newProductName: "",
      components: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "components",
  });

  const isNewProduct = form.watch("isNewProduct");
  const bomType = form.watch("type");
  
  React.useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === 'isNewProduct' && type === 'change') {
        if (value.isNewProduct === false) {
          form.setValue('newProductName', '');
        } else {
          form.setValue('productSku', undefined);
        }
        form.clearErrors(["newProductName", "productSku"]);
      }
      if (name === 'type' && type === 'change') {
        // When type changes, clear the components as they might be invalid for the new type
        remove(); // This removes all components
        form.setValue("components", []);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, remove]);

  const { allCategories, isLoading: isLoadingCategories } = useCategories();
  
  const componentMaterials = React.useMemo(() => {
    if (isLoadingCategories || !bomType) return [];
    
    let allowedCategoryNames = new Set<string>();

    if (bomType === 'blend') {
      allowedCategoryNames = new Set(['materia prima (cogs)'].map(normalizeStringForComparison));
    } else if (bomType === 'fill') {
      allowedCategoryNames = new Set(['material embalaje (cogs)', 'producto intermedio'].map(normalizeStringForComparison));
    } else {
        return []; // Should not happen
    }
    
    const allowedCategoryIds = new Set(
      allCategories
        .filter(c => allowedCategoryNames.has(normalizeStringForComparison(c.name)))
        .map(c => c.id)
    );
    
    return inventoryItems.filter(i => i.categoryId && allowedCategoryIds.has(i.categoryId));

  }, [inventoryItems, allCategories, isLoadingCategories, bomType]);
  
  const unaddedComponentMaterials = React.useMemo(() => {
    const addedIds = new Set(fields.map(f => f.materialId));
    return componentMaterials.filter(m => !addedIds.has(m.id));
  }, [fields, componentMaterials]);


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
            type: recipe.lines[0]?.type,
            isNewProduct: false,
            productSku: recipe.productSku,
            newProductName: "",
            components: componentsFromRecipe,
        });
      } else {
        form.reset({ type: undefined, isNewProduct: false, productSku: "", newProductName: "", components: [] });
      }
      setSelectedComponentId("");
    }
  }, [recipe, isOpen, form, inventoryItems]);

  const handleAddComponent = () => {
    if (!selectedComponentId) return;
    const material = componentMaterials.find(m => m.id === selectedComponentId);
    if (material) {
        append({
            materialId: material.id,
            description: material.name,
            quantity: 1,
            uom: material.uom || 'unit',
        });
        setSelectedComponentId("");
    }
  };


  const onSubmit = async (data: BomRecipeFormValues) => {
    setIsSaving(true);
    try {
        const componentsToSave = data.components.map(c => {
            const material = inventoryItems.find(item => item.id === c.materialId)!;
            return { componentId: material.id, componentName: material.name, componentSku: material.sku, quantity: c.quantity, uom: c.uom, };
        });

        if (data.isNewProduct) {
            let targetCategoryName = '';
            if (data.type === 'blend') targetCategoryName = "Producto Intermedio";
            else if (data.type === 'fill') targetCategoryName = "Producto Terminado";

            const normalizedTargetName = normalizeStringForComparison(targetCategoryName);
            const finishedGoodCategory = allCategories.find(c => normalizeStringForComparison(c.name) === normalizedTargetName);

            if (!finishedGoodCategory) {
              throw new Error(`No se encontró la categoría '${targetCategoryName}'. Por favor, créala o revisa su nombre.`);
            }
            
            const { sku: newProductSku } = await createNewProductAndRecipeFS(data.newProductName!, finishedGoodCategory.id, componentsToSave, data.type!);
            toast({ title: "Receta y Producto Creados", description: `Se ha creado el producto con SKU: ${newProductSku}.`});
        
        } else {
            await saveRecipeFS(data.productSku!, componentsToSave, data.type!);
            toast({ title: "Receta Guardada", description: "La receta ha sido actualizada correctamente." });
        }
        await onSave();
    } catch (error: any) {
        toast({ title: "Error al Guardar", description: error.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };
  
  const finishedGoods = React.useMemo(() => {
    if (isLoadingCategories || !bomType) return [];
    
    let categoryName = '';
    if (bomType === 'blend') categoryName = "Producto Intermedio";
    else if (bomType === 'fill') categoryName = "Producto Terminado";
    else return [];

    const normalizedTargetName = normalizeStringForComparison(categoryName);
    const category = allCategories.find(c => normalizeStringForComparison(c.name) === normalizedTargetName);
    if (!category) return [];
    return inventoryItems.filter(i => i.sku && i.categoryId === category.id);
  }, [inventoryItems, allCategories, isLoadingCategories, bomType]);

  
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
              <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Tipo de Receta</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isEditing}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="blend">Mezcla (Granel)</SelectItem><SelectItem value="fill">Embotellado</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
              
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
                          disabled={!form.watch('type')}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Crear un nuevo producto terminado/intermedio</FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              )}

              {isNewProduct && !isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="newProductName" render={({ field }) => ( <FormItem><FormLabel>Nombre Nuevo Producto</FormLabel><FormControl><Input placeholder="Ej: Santa Brisa 200ml" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                   <div className="flex flex-col space-y-2">
                        <Label>SKU Nuevo Producto</Label>
                        <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                            <Sparkles className="mr-2 h-4 w-4" />
                            Se generará automáticamente
                        </div>
                    </div>
                </div>
              ) : (
                <FormField control={form.control} name="productSku" render={({ field }) => ( <FormItem><FormLabel>Producto a Fabricar</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isEditing || !form.watch('type')}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger></FormControl><SelectContent>{finishedGoods.map(item => (<SelectItem key={item.id} value={item.sku!}>{item.name} ({item.sku})</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
              )}
              
              <h4 className="font-medium">Componentes de la Receta</h4>
              <div className="flex items-end gap-2">
                <div className="flex-grow">
                  <Label>Añadir Componente</Label>
                  <Select onValueChange={setSelectedComponentId} value={selectedComponentId} disabled={!bomType}>
                    <SelectTrigger>
                      <SelectValue placeholder={!bomType ? "Selecciona un tipo de receta" : "Seleccionar componente..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-48">
                        {unaddedComponentMaterials.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.sku})
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddComponent}
                  disabled={!selectedComponentId}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir
                </Button>
              </div>

              <ScrollArea className="h-48 border rounded-md p-2">
                  <div className="space-y-3">
                  {fields.map((field, index) => (
                      <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md bg-secondary/30">
                          <div className="flex-grow space-y-2">
                              <p className="font-medium text-sm">{field.description}</p>
                          </div>
                          <FormField control={form.control} name={`components.${index}.quantity`} render={({ field }) => (<FormItem className="w-28"><FormLabel className="text-xs">Cantidad</FormLabel><FormControl><Input type="number" step="any" placeholder="Cant." {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name={`components.${index}.uom`} render={({ field }) => (<FormItem className="w-24"><FormLabel className="text-xs">UoM</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Unidad"/></SelectTrigger></FormControl><SelectContent>{uomList.map(u => (<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                  ))}
                  {fields.length === 0 && (
                     <div className="text-center text-sm text-muted-foreground p-4">
                        Añade componentes desde el desplegable de arriba.
                        <FormMessage className="mt-2">{form.formState.errors.components?.root?.message}</FormMessage>
                     </div>
                  )}
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
                          <AlertDialogAction asChild>
                            <Button onClick={() => onDelete(recipe.productSku)} variant="destructive">Eliminar</Button>
                          </AlertDialogAction>
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
