
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
import type { PromotionalMaterial, Category, PromotionalMaterialFormValues } from "@/types";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid, subDays, isEqual } from "date-fns";
import { es } from 'date-fns/locale';
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { getCategoriesFS } from "@/services/category-service";
import { useToast } from "@/hooks/use-toast";


const materialFormSchema = z.object({
  name: z.string().min(3, "El nombre del material debe tener al menos 3 caracteres."),
  description: z.string().optional(),
  categoryId: z.string().min(1, "La categoría es obligatoria."),
  sku: z.string().optional(),
  latestPurchaseQuantity: z.coerce.number().min(1, "La cantidad comprada debe ser al menos 1.").optional(),
  latestPurchaseTotalCost: z.coerce.number().min(0.01, "El coste total debe ser positivo.").optional(),
  latestPurchaseDate: z.date().optional(),
  latestPurchaseNotes: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.latestPurchaseQuantity || data.latestPurchaseTotalCost || data.latestPurchaseDate) {
        if (data.latestPurchaseQuantity === undefined || data.latestPurchaseQuantity <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cantidad es obligatoria si se registran datos de compra.", path: ["latestPurchaseQuantity"]});
        }
        if (data.latestPurchaseTotalCost === undefined || data.latestPurchaseTotalCost <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Coste total es obligatorio si se registran datos de compra.", path: ["latestPurchaseTotalCost"]});
        }
        if (data.latestPurchaseDate === undefined) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Fecha de compra es obligatoria si se registran datos de compra.", path: ["latestPurchaseDate"]});
        }
    }
});


interface PromotionalMaterialDialogProps {
  material: PromotionalMaterial | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PromotionalMaterialFormValues, materialId?: string) => void;
  isReadOnly?: boolean;
}

export default function PromotionalMaterialDialog({ material, isOpen, onOpenChange, onSave, isReadOnly = false }: PromotionalMaterialDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [calculatedUnitCost, setCalculatedUnitCost] = React.useState<number | null>(null);
  const [inventoryCategories, setInventoryCategories] = React.useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = React.useState(false);
  const { toast } = useToast();
  
  const form = useForm<PromotionalMaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: undefined,
      sku: "",
      latestPurchaseQuantity: undefined,
      latestPurchaseTotalCost: undefined,
      latestPurchaseDate: undefined,
      latestPurchaseNotes: "",
    },
  });

  const watchedQuantity = form.watch("latestPurchaseQuantity");
  const watchedTotalCost = form.watch("latestPurchaseTotalCost");

  React.useEffect(() => {
    if (typeof watchedQuantity === 'number' && typeof watchedTotalCost === 'number' && watchedQuantity > 0) {
      setCalculatedUnitCost(watchedTotalCost / watchedQuantity);
    } else {
      setCalculatedUnitCost(null);
    }
  }, [watchedQuantity, watchedTotalCost]);
  
  React.useEffect(() => {
    async function loadCategories() {
        if (isOpen) {
            setIsLoadingCategories(true);
            try {
                const categories = await getCategoriesFS('inventory');
                setInventoryCategories(categories);
            } catch (error) {
                console.error("Error loading inventory categories:", error);
                toast({ title: "Error", description: "No se pudieron cargar las categorías de inventario.", variant: "destructive" });
            } finally {
                setIsLoadingCategories(false);
            }
        }
    }
    loadCategories();
  }, [isOpen, toast]);

  React.useEffect(() => {
    if (isOpen) {
      if (material) {
        form.reset({
          name: material.name,
          description: material.description || "",
          categoryId: material.categoryId,
          sku: material.sku || "",
          latestPurchaseQuantity: material.latestPurchase?.quantityPurchased,
          latestPurchaseTotalCost: material.latestPurchase?.totalPurchaseCost,
          latestPurchaseDate: material.latestPurchase?.purchaseDate && isValid(parseISO(material.latestPurchase.purchaseDate)) ? parseISO(material.latestPurchase.purchaseDate) : undefined,
          latestPurchaseNotes: material.latestPurchase?.notes || "",
        });
        if (material.latestPurchase) {
          setCalculatedUnitCost(material.latestPurchase.calculatedUnitCost);
        } else {
          setCalculatedUnitCost(null);
        }
      } else {
        form.reset({
          name: "",
          description: "",
          categoryId: undefined,
          sku: "",
          latestPurchaseQuantity: undefined,
          latestPurchaseTotalCost: undefined,
          latestPurchaseDate: new Date(), 
          latestPurchaseNotes: "",
        });
        setCalculatedUnitCost(null);
      }
    }
  }, [material, isOpen, form]);

  const onSubmit = async (data: PromotionalMaterialFormValues) => {
    if (isReadOnly) return;
    setIsSaving(true);
    
    await new Promise(resolve => setTimeout(resolve, 500)); 
    onSave(data, material?.id);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? "Detalles del Material Promocional" : (material ? "Editar Material Promocional" : "Añadir Nuevo Material Promocional")}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? `Viendo detalles de "${material?.name}".` : (material ? "Modifica los detalles del material y/o registra la última compra." : "Introduce la información del nuevo material y los detalles de su adquisición.")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Material</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Cubitera Metálica Grande" {...field} disabled={isReadOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU / Lote (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: SB-CUB-001" {...field} disabled={isReadOnly} />
                    </FormControl>
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
                    <Textarea placeholder="Breve descripción del material, características..." {...field} disabled={isReadOnly} className="min-h-[80px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Separator className="my-6" />
            <h3 className="text-md font-semibold text-primary">Detalles de la Última Compra Registrada</h3>
            <FormDescription>
              {material ? "Actualice los datos si ha habido una nueva compra." : "Introduzca los datos de la primera compra de este material."}
              Si no introduce datos de compra, el material se guardará sin un coste unitario definido.
            </FormDescription>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <FormField
                control={form.control}
                name="latestPurchaseQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad Comprada</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ej: 500" {...field} disabled={isReadOnly} 
                             onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                             value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="latestPurchaseTotalCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coste Total de esta Compra (€)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ej: 550.25 (incluye todo)" {...field} disabled={isReadOnly} 
                             onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                             value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="latestPurchaseDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de esta Compra</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} 
                          disabled={isReadOnly || ((date: Date) => date > new Date() || date < new Date("2000-01-01"))} 
                          initialFocus 
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="latestPurchaseNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas de la Compra (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Lote con descuento, proveedor XYZ..." {...field} disabled={isReadOnly} className="min-h-[60px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {calculatedUnitCost !== null && (
              <div className="mt-3 p-3 bg-secondary/30 rounded-md">
                <p className="text-sm font-medium">
                  Coste Unitario Calculado para esta Compra: 
                  <strong className="ml-1 text-primary">
                    <FormattedNumericValue value={calculatedUnitCost} options={{ style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 4 }} />
                  </strong>
                </p>
                <p className="text-xs text-muted-foreground">Este será el coste utilizado al asignar este material a eventos/pedidos.</p>
              </div>
            )}
            
            <DialogFooter className="pt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving && !isReadOnly}>
                  {isReadOnly ? "Cerrar" : "Cancelar"}
                </Button>
              </DialogClose>
              {!isReadOnly && (
                <Button type="submit" disabled={isSaving || (!form.formState.isDirty && !!material )}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    material ? "Guardar Cambios" : "Añadir Material"
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
