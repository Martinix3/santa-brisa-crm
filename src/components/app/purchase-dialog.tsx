
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Purchase, PurchaseFormValues as PurchaseFormValuesType, PurchaseStatus, PromotionalMaterial, PromotionalMaterialFormValues, PurchaseCategory } from "@/types";
import { purchaseStatusList, purchaseCategoryList } from "@/lib/data";
import { Loader2, Calendar as CalendarIcon, DollarSign, PlusCircle, Trash2, FileCheck2, Link2, Sparkles, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import { Separator } from "../ui/separator";
import FormattedNumericValue from "../lib/formatted-numeric-value";
import Link from 'next/link';
import { getPromotionalMaterialsFS, addPromotionalMaterialFS } from "@/services/promotional-material-service";
import { useToast } from "@/hooks/use-toast";
import { matchMaterial } from "@/ai/flows/material-matching-flow";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";


const purchaseItemSchema = z.object({
  materialId: z.string().min(1, "Debe seleccionar un material del sistema."),
  description: z.string().optional(),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  unitPrice: z.coerce.number().min(0.01, "El precio debe ser positivo."),
});

const purchaseFormSchema = z.object({
  supplier: z.string().min(2, "El nombre del proveedor es obligatorio."),
  supplierCif: z.string().optional(),
  supplierAddress_street: z.string().optional(),
  supplierAddress_number: z.string().optional(),
  supplierAddress_city: z.string().optional(),
  supplierAddress_province: z.string().optional(),
  supplierAddress_postalCode: z.string().optional(),
  supplierAddress_country: z.string().optional(),
  orderDate: z.date({ required_error: "La fecha del pedido es obligatoria." }),
  status: z.enum(purchaseStatusList as [PurchaseStatus, ...PurchaseStatus[]]),
  category: z.enum(purchaseCategoryList as [PurchaseCategory, ...PurchaseCategory[]], { required_error: "La categoría del gasto es obligatoria." }),
  items: z.array(purchaseItemSchema).min(1, "Debe añadir al menos un artículo a la compra."),
  shippingCost: z.coerce.number().min(0, "Los portes no pueden ser negativos.").optional(),
  taxRate: z.coerce.number().min(0, "El IVA no puede ser negativo.").default(21),
  notes: z.string().optional(),
  invoiceDataUri: z.string().optional(), 
  invoiceUrl: z.string().url("URL no válida").optional().or(z.literal("")),
  storagePath: z.string().optional(),
});

export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

interface PurchaseDialogProps {
  purchase: Purchase | null;
  prefilledData: Partial<PurchaseFormValues> | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PurchaseFormValues, purchaseId?: string) => Promise<void>;
  isReadOnly?: boolean;
}

export default function PurchaseDialog({ purchase, prefilledData, isOpen, onOpenChange, onSave, isReadOnly = false }: PurchaseDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [availableMaterials, setAvailableMaterials] = React.useState<PromotionalMaterial[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = React.useState(true);
  const [matchingItems, setMatchingItems] = React.useState<Record<number, boolean>>({});
  const { toast } = useToast();

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplier: "",
      orderDate: new Date(),
      status: "Borrador",
      category: "Material Promocional",
      items: [{ materialId: "", description: "", quantity: 1, unitPrice: undefined }],
      shippingCost: 0,
      taxRate: 21,
      notes: "",
      invoiceUrl: "",
      storagePath: "",
      invoiceDataUri: "",
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const watchedShippingCost = form.watch("shippingCost");
  const watchedTaxRate = form.watch("taxRate");
  const watchedInvoiceUrl = form.watch("invoiceUrl");
  const watchedInvoiceDataUri = form.watch("invoiceDataUri");

  const { subtotal, taxAmount, totalAmount } = React.useMemo(() => {
    const currentSubtotal = watchedItems.reduce((sum, item) => {
      const quantity = item.quantity || 0;
      const unitPrice = item.unitPrice || 0;
      return sum + quantity * unitPrice;
    }, 0);

    const shipping = watchedShippingCost || 0;
    const subtotalWithShipping = currentSubtotal + shipping;
    const currentTaxAmount = subtotalWithShipping * (watchedTaxRate / 100);
    const currentTotalAmount = subtotalWithShipping + currentTaxAmount;

    return {
      subtotal: currentSubtotal,
      taxAmount: currentTaxAmount,
      totalAmount: currentTotalAmount,
    };
  }, [watchedItems, watchedShippingCost, watchedTaxRate]);

  const fetchMaterials = React.useCallback(async () => {
    setIsLoadingMaterials(true);
    try {
      const materials = await getPromotionalMaterialsFS();
      setAvailableMaterials(materials);
    } catch (error) {
      console.error("Failed to load promotional materials:", error);
      toast({ title: "Error", description: "No se pudieron cargar los materiales promocionales.", variant: "destructive" });
    } finally {
      setIsLoadingMaterials(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (isOpen) {
      fetchMaterials();
    }
  }, [isOpen, fetchMaterials]);

  const runSmartMatching = React.useCallback(async (itemsToMatch: PurchaseFormValues['items']) => {
    if (isLoadingMaterials) return;
    setMatchingItems(itemsToMatch.reduce((acc, _, index) => ({ ...acc, [index]: true }), {}));
    
    const updatedItems = await Promise.all(itemsToMatch.map(async (item, index) => {
      if (item.materialId) return item; // Already matched
      const result = await matchMaterial({ 
        itemName: item.description, 
        existingMaterials: availableMaterials.map(m => ({ id: m.id, name: m.name, description: m.description, type: m.type }))
      });
      if (result.matchType === 'perfect' || result.matchType === 'suggested') {
        return { ...item, materialId: result.matchedMaterialId! };
      }
      return item;
    }));

    form.setValue('items', updatedItems);
    setMatchingItems({});
  }, [availableMaterials, form, isLoadingMaterials]);

  React.useEffect(() => {
    if (isOpen && !isLoadingMaterials) {
      const initialItems = prefilledData?.items || purchase?.items;
      if (initialItems && initialItems.some(item => !item.materialId)) {
        runSmartMatching(initialItems as PurchaseFormValues['items']);
      }
    }
  }, [isOpen, isLoadingMaterials, prefilledData, purchase, runSmartMatching]);


  React.useEffect(() => {
    if (isOpen) {
      const defaultValues: Partial<PurchaseFormValues> = {
          supplier: "",
          orderDate: new Date(),
          status: "Borrador",
          category: "Material Promocional",
          items: [{ materialId: "", description: "", quantity: 1, unitPrice: undefined }],
          shippingCost: 0,
          taxRate: 21,
          notes: "",
          invoiceUrl: "",
          storagePath: "",
          invoiceDataUri: "",
      };

      if (prefilledData) {
        form.reset({ ...defaultValues, ...prefilledData });
      } else if (purchase) {
        form.reset({
          ...defaultValues,
          supplier: purchase.supplier,
          category: purchase.category,
          orderDate: parseISO(purchase.orderDate),
          status: purchase.status,
          items: purchase.items.map(item => ({ materialId: item.materialId, description: item.description, quantity: item.quantity, unitPrice: item.unitPrice })),
          shippingCost: purchase.shippingCost || 0,
          taxRate: purchase.taxRate,
          notes: purchase.notes || "",
          invoiceUrl: purchase.invoiceUrl || "",
          storagePath: purchase.storagePath || "",
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [purchase, prefilledData, isOpen, form, toast]);

  const handleCreateNewMaterial = async (index: number, itemName: string) => {
    setIsSaving(true);
    try {
        const result = await matchMaterial({ 
          itemName, 
          existingMaterials: availableMaterials.map(m => ({ id: m.id, name: m.name, description: m.description, type: m.type }))
        });

        const newMaterialData: PromotionalMaterialFormValues = {
            name: result.suggestedName || itemName,
            type: result.suggestedType || 'Otro',
        };
        const newMaterialId = await addPromotionalMaterialFS(newMaterialData);
        await fetchMaterials(); // Refresh material list
        update(index, { ...watchedItems[index], materialId: newMaterialId });
        toast({ title: "Material Creado", description: `Se ha creado el material "${newMaterialData.name}".`});
    } catch (error) {
        toast({ title: "Error", description: "No se pudo crear el nuevo material.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const onSubmit = async (data: PurchaseFormValues) => {
    if (isReadOnly) return;
    setIsSaving(true);
    await onSave(data, purchase?.id);
    setIsSaving(false);
  };

  const hasInvoicePreview = !!watchedInvoiceDataUri;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[95vh]", hasInvoicePreview ? "sm:max-w-6xl" : "sm:max-w-2xl")}>
        <DialogHeader>
          <DialogTitle>{isReadOnly ? "Detalles de Gasto" : (purchase ? "Editar Gasto" : "Registrar Nuevo Gasto")}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? `Viendo detalles de la compra a ${purchase?.supplier}.` : (purchase ? "Modifica los detalles del gasto." : "Introduce la información del nuevo gasto o compra.")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className={cn("h-[calc(90vh-220px)]", hasInvoicePreview && "grid grid-cols-1 lg:grid-cols-2 gap-8")}>
              
              <ScrollArea className={cn("h-full", hasInvoicePreview && "pr-4")}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="supplier" render={({ field }) => (<FormItem><FormLabel>Proveedor</FormLabel><FormControl><Input placeholder="Ej: Proveedor de Tequila" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="orderDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Gasto/Pedido</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={isReadOnly} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
                  </div>
                  <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>Categoría del Gasto</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione una categoría" /></SelectTrigger></FormControl><SelectContent>{purchaseCategoryList.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />


                  <Separator />
                  <h3 className="text-md font-semibold">Artículos del Gasto</h3>
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md bg-secondary/20">
                        <div className="flex-grow space-y-2">
                            <FormField control={form.control} name={`items.${index}.materialId`} render={({ field: selectField }) => (
                              <FormItem>
                                  <FormLabel className="text-xs flex items-center gap-1">
                                    {matchingItems[index] && <Loader2 className="h-3 w-3 animate-spin"/>}
                                    Concepto del Sistema
                                  </FormLabel>
                                  <Select
                                      onValueChange={selectField.onChange}
                                      value={selectField.value || ""}
                                      disabled={isReadOnly || isLoadingMaterials}
                                  >
                                      <FormControl><SelectTrigger><SelectValue placeholder="Asociar a material..." /></SelectTrigger></FormControl>
                                      <SelectContent>
                                          {availableMaterials.map(material => (
                                              <SelectItem key={material.id} value={material.id}>{material.name}</SelectItem>
                                          ))}
                                      </SelectContent>
                                  </Select>
                                  <FormMessage />
                              </FormItem>
                            )} />
                            
                            <FormField
                              control={form.control}
                              name={`items.${index}.description`}
                              render={({ field: descField }) => (
                                  <FormItem>
                                      <FormLabel className="text-xs text-muted-foreground">
                                        {prefilledData ? 'Concepto de Factura (Editable)' : 'Descripción Manual'}
                                      </FormLabel>
                                      <FormControl>
                                          <Textarea
                                              {...descField}
                                              placeholder="Descripción del artículo de la compra..."
                                              className={cn(
                                                  "text-xs h-auto",
                                                  !watchedItems[index]?.materialId && watchedItems[index]?.description
                                                  ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-700 focus:border-yellow-500"
                                                  : "bg-background"
                                              )}
                                              disabled={isReadOnly}
                                              rows={2}
                                          />
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                            />

                            {!watchedItems[index]?.materialId && watchedItems[index]?.description && (
                              <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-300">
                                <HelpCircle className="h-4 w-4" />
                                <span>Asocia o crea un nuevo material.</span>
                                {!isReadOnly && (
                                    <Button
                                      size="sm"
                                      variant="link"
                                      type="button"
                                      className="text-xs h-auto p-0"
                                      onClick={() => handleCreateNewMaterial(index, watchedItems[index].description || "")}
                                    >
                                        <PlusCircle className="mr-1 h-3 w-3"/>Crear material desde esta descripción
                                    </Button>
                                )}
                              </div>
                            )}
                        </div>
                        <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: quantityField }) => (
                          <FormItem className="w-24">
                              <FormLabel className="text-xs">Cantidad</FormLabel>
                              <FormControl>
                                  <Input type="number" {...quantityField} disabled={isReadOnly}
                                        value={quantityField.value ?? ""}
                                        onChange={e => { const val = e.target.value; quantityField.onChange(val === '' ? undefined : parseInt(val, 10)); }}
                                  />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field: priceField }) => (
                          <FormItem className="w-28">
                              <FormLabel className="text-xs">Precio Unit. (€)</FormLabel>
                              <FormControl>
                                  <Input type="number" step="0.01" {...priceField} disabled={isReadOnly}
                                        value={priceField.value ?? ""}
                                        onChange={e => { const val = e.target.value; priceField.onChange(val === '' ? undefined : parseFloat(val)); }}
                                  />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                        )} />
                        {!isReadOnly && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                    ))}
                    {!isReadOnly && <Button type="button" variant="outline" size="sm" onClick={() => append({ materialId: "", description: "", quantity: 1, unitPrice: undefined })}><PlusCircle className="mr-2 h-4 w-4" />Añadir Artículo Manual</Button>}
                  </div>

                  <Separator />
                  <h3 className="text-md font-semibold">Totales y Estado</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="shippingCost" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Gastos de Envío (€)</FormLabel>
                              <FormControl>
                                  <Input type="number" step="0.01" {...field} disabled={isReadOnly}
                                        value={field.value ?? ""}
                                        onChange={e => { const val = e.target.value; field.onChange(val === '' ? undefined : parseFloat(val)); }}
                                  />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )} />
                      <FormField control={form.control} name="taxRate" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Tasa de IVA (%)</FormLabel>
                              <FormControl>
                                  <Input type="number" {...field} disabled={isReadOnly} 
                                        value={field.value ?? ""}
                                        onChange={e => { const val = e.target.value; field.onChange(val === '' ? undefined : parseFloat(val)); }}
                                  />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )} />
                  </div>

                  <div className="p-4 bg-muted/50 rounded-md space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal (Artículos):</span><FormattedNumericValue value={subtotal} options={{ style: 'currency', currency: 'EUR' }} /></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Portes:</span><FormattedNumericValue value={watchedShippingCost || 0} options={{ style: 'currency', currency: 'EUR' }} /></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA ({watchedTaxRate}%):</span><FormattedNumericValue value={taxAmount} options={{ style: 'currency', currency: 'EUR' }} /></div>
                      <Separator className="my-1"/>
                      <div className="flex justify-between text-lg font-bold"><span className="text-foreground">TOTAL:</span><FormattedNumericValue value={totalAmount} options={{ style: 'currency', currency: 'EUR' }} /></div>
                  </div>

                  <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Estado</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un estado" /></SelectTrigger></FormControl><SelectContent>{purchaseStatusList.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas (Opcional)</FormLabel><FormControl><Textarea placeholder="Cualquier información adicional, n.º de proforma, etc." {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                  
                  {watchedInvoiceUrl && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                              <FileCheck2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                              <div>
                                  <p className="font-semibold text-blue-800">Factura Adjunta</p>
                                  <p className="text-xs text-blue-600">El archivo se ha subido a Firebase Storage.</p>
                              </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={watchedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                                  <Link2 className="mr-2 h-4 w-4" /> Ver Archivo
                            </Link>
                          </Button>
                      </div>
                  )}
                </div>
              </ScrollArea>
              
              {hasInvoicePreview && (
                 <div className="flex flex-col h-full">
                    <Label>Previsualización de Factura</Label>
                    <div className="mt-2 border rounded-md h-[calc(100%-24px)] overflow-hidden bg-muted">
                        {watchedInvoiceDataUri.startsWith('data:application/pdf') ? (
                            <embed src={`${watchedInvoiceDataUri}#toolbar=0&navpanes=0`} type="application/pdf" width="100%" height="100%" />
                        ) : watchedInvoiceDataUri.startsWith('data:image/') ? (
                            <img src={watchedInvoiceDataUri} alt="Previsualización de la factura" className="object-contain w-full h-full"/>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <p className="text-muted-foreground text-sm">Formato no previsualizable.</p>
                          </div>
                        )}
                    </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-6">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>{isReadOnly ? "Cerrar" : "Cancelar"}</Button></DialogClose>
              {!isReadOnly && (<Button type="submit" disabled={isSaving || (!form.formState.isDirty && !!purchase && !prefilledData)}>{isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : (purchase ? "Guardar Cambios" : "Añadir Gasto")}</Button>)}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
