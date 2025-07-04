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
import type { Purchase, PurchaseFormValues as PurchaseFormValuesType, PurchaseStatus, InventoryItem, Currency, Category, CostCenter, InventoryItemFormValues } from "@/types";
import { purchaseStatusList } from "@/lib/data";
import { Loader2, Calendar as CalendarIcon, DollarSign, PlusCircle, Trash2, FileCheck2, Link2, Sparkles, HelpCircle, Briefcase, Building } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import { Separator } from "../ui/separator";
import FormattedNumericValue from "../lib/formatted-numeric-value";
import Link from 'next/link';
import { getInventoryItemsFS, addInventoryItemFS } from "@/services/inventory-item-service";
import { getCategoriesFS } from "@/services/category-service";
import { getCostCentersFS } from "@/services/costcenter-service";
import { useToast } from "@/hooks/use-toast";
import { matchMaterial } from "@/ai/flows/material-matching-flow";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";


const purchaseItemSchema = z.object({
  materialId: z.string().min(1, "Debe seleccionar un material del sistema."),
  description: z.string().optional(),
  quantity: z.coerce.number({invalid_type_error: "Cantidad debe ser un número."}).min(1, "La cantidad debe ser al menos 1.").nullable(),
  unitPrice: z.coerce.number({invalid_type_error: "Precio debe ser un número."}).min(0.01, "El precio debe ser positivo.").nullable(),
  batchNumber: z.string().optional(),
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
  categoryId: z.string({ required_error: "La categoría del gasto es obligatoria." }),
  costCenterIds: z.array(z.string()).optional(),
  currency: z.enum(["EUR", "USD", "MXN"]).default("EUR"),
  items: z.array(purchaseItemSchema).min(1, "Debe añadir al menos un artículo a la compra."),
  shippingCost: z.coerce.number().min(0, "Los portes no pueden ser negativos.").optional().nullable(),
  taxRate: z.coerce.number().min(0, "El IVA no puede ser negativo.").default(21),
  notes: z.string().optional(),
  invoiceFile: z.any().refine(v => v == null || v instanceof File, { message: "Debe ser un archivo." }).optional().nullable(),
  invoiceDataUri: z.string().optional().nullable(),
  invoiceUrl: z.union([z.literal(""), z.string().url("URL no válida")]).optional(),
  invoiceContentType: z.string().optional(),
  storagePath: z.string().optional(),
});

export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

interface PurchaseDialogProps {
  purchase: Purchase | null;
  prefilledData: Partial<PurchaseFormValues> | null;
  prefilledFile: File | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PurchaseFormValues, purchaseId?: string) => Promise<void>;
  isReadOnly?: boolean;
}

async function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
  });
}

export default function PurchaseDialog({ purchase, prefilledData, prefilledFile, isOpen, onOpenChange, onSave, isReadOnly = false }: PurchaseDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [availableMaterials, setAvailableMaterials] = React.useState<InventoryItem[]>([]);
  const [availableCategories, setAvailableCategories] = React.useState<Category[]>([]);
  const [availableCostCenters, setAvailableCostCenters] = React.useState<CostCenter[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = React.useState(true);
  const [matchingItems, setMatchingItems] = React.useState<Record<number, boolean>>({});
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewType, setPreviewType] = React.useState<'image' | 'pdf' | null>(null);
  const { toast } = useToast();

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplier: "", orderDate: new Date(), status: "Borrador", categoryId: "", costCenterIds: [],
      currency: "EUR",
      items: [{ materialId: "", description: "", quantity: 1, unitPrice: null, batchNumber: "" }],
      shippingCost: 0, taxRate: 21, notes: "", invoiceUrl: "", storagePath: "", invoiceFile: null,
    },
  });

  const { fields, append, remove, update } = useFieldArray({ control: form.control, name: "items" });
  const watchedItems = form.watch("items");
  const watchedShippingCost = form.watch("shippingCost");
  const watchedTaxRate = form.watch("taxRate");
  const watchedCurrency = form.watch("currency");
  const watchedInvoiceFile = form.watch("invoiceFile");
  const watchedInvoiceUrl = form.watch("invoiceUrl");
  const watchedInvoiceContentType = form.watch("invoiceContentType");

  const { subtotal, taxAmount, totalAmount } = React.useMemo(() => {
    const currentSubtotal = watchedItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0) || 0;
    const shipping = watchedShippingCost || 0;
    const subtotalWithShipping = currentSubtotal + shipping;
    const taxRate = watchedTaxRate !== undefined ? watchedTaxRate : 21;
    const currentTaxAmount = subtotalWithShipping * (taxRate / 100);
    const currentTotalAmount = subtotalWithShipping + currentTaxAmount;
    return { subtotal: currentSubtotal, taxAmount: currentTaxAmount, totalAmount: currentTotalAmount };
  }, [watchedItems, watchedShippingCost, watchedTaxRate]);

  const fetchDropdownData = React.useCallback(async () => {
    setIsLoadingDropdowns(true);
    try {
        const [materials, categories, costCenters] = await Promise.all([
            getInventoryItemsFS(),
            getCategoriesFS('cost'),
            getCostCentersFS()
        ]);
      setAvailableMaterials(materials);
      setAvailableCategories(categories);
      setAvailableCostCenters(costCenters);
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los datos maestros.", variant: "destructive" });
    } finally {
      setIsLoadingDropdowns(false);
    }
  }, [toast]);
  
  const runSmartMatching = React.useCallback(async (itemsToMatch: PurchaseFormValues['items']) => {
    if (availableMaterials.length === 0) return;
    const itemsToProcess = itemsToMatch.filter(item => !item.materialId);
    if(itemsToProcess.length === 0) return;

    setMatchingItems(itemsToMatch.reduce((acc, item, index) => ({ ...acc, [index]: !item.materialId }), {}));

    try {
        const updatedItems = await Promise.all(itemsToMatch.map(async (item, index) => {
            const currentFormItem = form.getValues(`items.${index}`);
            if (currentFormItem.materialId) {
                return currentFormItem;
            }
            const result = await matchMaterial({ itemName: item.description || "", existingMaterials: availableMaterials });
            if (result.matchType === 'perfect' || result.matchType === 'suggested') {
                return { ...item, materialId: result.matchedMaterialId! };
            }
            return item;
        }));
        form.setValue('items', updatedItems, { shouldDirty: true });
    } catch (error) {
        console.error("Error during smart matching:", error);
        toast({ title: "Error de IA", description: "El autocompletado inteligente falló.", variant: "destructive"});
    } finally {
        setMatchingItems({});
    }
  }, [availableMaterials, form, toast]);
  
  React.useEffect(() => {
    if (isOpen) {
      fetchDropdownData();
    }
  }, [isOpen, fetchDropdownData]);
  
  React.useEffect(() => {
    if (!isOpen) return;

    const source = prefilledData ? prefilledData : purchase;
    const fileSource = prefilledFile ? prefilledFile : null;

    const initialValues: Partial<PurchaseFormValues> = {
      supplier: source?.supplier || "",
      orderDate: source?.orderDate ? (typeof source.orderDate === 'string' ? parseISO(source.orderDate) : source.orderDate) : new Date(),
      status: source?.status || "Borrador",
      categoryId: (source as Purchase)?.categoryId || "",
      costCenterIds: (source as Purchase)?.costCenterIds || [],
      currency: (source as Purchase)?.currency || "EUR",
      items: source?.items?.map(i => ({...i, quantity: i.quantity || null, unitPrice: i.unitPrice || null })) || [{ materialId: "", description: "", quantity: 1, unitPrice: null, batchNumber: "" }],
      shippingCost: (source as Purchase)?.shippingCost || 0,
      taxRate: (source as Purchase)?.taxRate ?? 21,
      notes: source?.notes || "",
      invoiceFile: fileSource,
      invoiceUrl: source?.invoiceUrl || "",
      invoiceContentType: (source as Purchase)?.invoiceContentType || "",
      storagePath: source?.storagePath || "",
      supplierCif: prefilledData?.supplierCif,
      supplierAddress_street: prefilledData?.supplierAddress_street,
      supplierAddress_number: prefilledData?.supplierAddress_number,
      supplierAddress_city: prefilledData?.supplierAddress_city,
      supplierAddress_province: prefilledData?.supplierAddress_province,
      supplierAddress_postalCode: prefilledData?.supplierAddress_postalCode,
      supplierAddress_country: prefilledData?.supplierAddress_country,
    };

    form.reset(initialValues as any);
    
    if (!isLoadingDropdowns && initialValues.items && initialValues.items.some(item => !item.materialId)) {
        runSmartMatching(initialValues.items as PurchaseFormValues['items']);
    }
  }, [isOpen, purchase, prefilledData, prefilledFile, form, isLoadingDropdowns, runSmartMatching]);


  // Effect for auto-detecting batch numbers
  React.useEffect(() => {
    const batchRegex = /(?:lote|batch)[\s:#-]+(\S+)/i;
    watchedItems.forEach((item, index) => {
        if(item.description && !item.batchNumber) {
            const match = item.description.match(batchRegex);
            if(match && match[1]) {
                form.setValue(`items.${index}.batchNumber`, match[1].toUpperCase());
            }
        }
    });
  }, [watchedItems, form]);


  React.useEffect(() => {
    let objectUrl: string | null = null;
    if (watchedInvoiceFile) {
      objectUrl = URL.createObjectURL(watchedInvoiceFile);
      setPreviewUrl(objectUrl);
      setPreviewType(watchedInvoiceFile.type.startsWith('application/pdf') ? 'pdf' : 'image');
    } else if (watchedInvoiceUrl) {
      setPreviewUrl(watchedInvoiceUrl);
      setPreviewType(watchedInvoiceContentType?.startsWith('application/pdf') ? 'pdf' : 'image');
    } else {
      setPreviewUrl(null);
      setPreviewType(null);
    }
    
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [watchedInvoiceFile, watchedInvoiceUrl, watchedInvoiceContentType]);


  const handleCreateNewMaterial = async (index: number, itemName: string) => {
    setIsSaving(true);
    try {
        const result = await matchMaterial({ itemName, existingMaterials: availableMaterials });

        if (result.matchType === 'none' && result.suggestedName && result.suggestedCategoryId) {
            const newMaterialData: InventoryItemFormValues = {
                name: result.suggestedName,
                categoryId: result.suggestedCategoryId,
                description: `Creado automáticamente desde factura para: ${itemName}`,
            };
            const newMaterialId = await addInventoryItemFS(newMaterialData);
            
            await fetchDropdownData();

            form.setValue(`items.${index}.materialId`, newMaterialId, { shouldDirty: true });

            toast({ title: "Nuevo artículo creado", description: `"${result.suggestedName}" ha sido añadido al inventario y seleccionado.` });
        } else if(result.matchedMaterialId) {
            toast({ title: "Sugerencia Encontrada", description: `Se encontró un artículo similar. Por favor, selecciónelo manualmente.`, variant: "default" });
        } else {
            toast({ title: "No se pudo crear", description: `La IA no pudo sugerir una categoría para "${itemName}". Intente crearlo manualmente.`, variant: "destructive" });
        }
    } catch (error) {
        console.error("Error creating new material from dialog:", error);
        toast({ title: "Error", description: "No se pudo crear el nuevo artículo.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };


  const onSubmit = async (data: PurchaseFormValues) => {
    if (isReadOnly) return;
    setIsSaving(true);
    try {
      const { invoiceFile, ...rest } = data;
      const dataToSave: Partial<PurchaseFormValues> = rest;
      
      if (invoiceFile) {
        dataToSave.invoiceDataUri = await fileToDataUri(invoiceFile);
      }
      
      await onSave(dataToSave as PurchaseFormValues, purchase?.id);
    } catch (error) {
      console.error("Submission failed in dialog:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasInvoicePreview = !!previewUrl;

  const costCenterOptions: MultiSelectOption[] = availableCostCenters.map(cc => ({ value: cc.id, label: cc.name }));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[95vh]", hasInvoicePreview ? "sm:max-w-6xl" : "sm:max-w-2xl")}>
        <DialogHeader>
          <DialogTitle>{isReadOnly ? "Detalles de Gasto" : (purchase ? "Editar Gasto" : "Registrar Nuevo Gasto")}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? `Viendo detalles de la compra a ${purchase?.supplier}.` : "Introduce la información del nuevo gasto o compra."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className={cn("h-[calc(90vh-220px)]", hasInvoicePreview && "grid grid-cols-1 lg:grid-cols-2 gap-8")}>
              
              <ScrollArea className={cn("h-full", hasInvoicePreview && "pr-4")}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="supplier" render={({ field }) => (<FormItem><FormLabel className="flex items-center"><Building className="mr-2 h-4 w-4"/>Proveedor</FormLabel><FormControl><Input placeholder="Ej: Proveedor de Tequila" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="orderDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Gasto/Pedido</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={isReadOnly} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
                  </div>
                  <FormField control={form.control} name="categoryId" render={({ field }) => (<FormItem><FormLabel>Categoría del Gasto</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly || isLoadingDropdowns}><FormControl><SelectTrigger><SelectValue placeholder={isLoadingDropdowns ? "Cargando..." : "Seleccione una categoría"} /></SelectTrigger></FormControl><SelectContent>{availableCategories.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="costCenterIds" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Centros de Coste (Opcional)</FormLabel>
                          <MultiSelect
                            options={costCenterOptions}
                            selected={field.value || []}
                            onChange={field.onChange}
                            placeholder="Asignar a centros de coste..."
                            disabled={isReadOnly || isLoadingDropdowns}
                          />
                          <FormDescription className="text-xs">Permite prorratear el gasto entre varios ejes analíticos.</FormDescription>
                          <FormMessage />
                      </FormItem>
                  )} />
                  
                  <Separator /><h3 className="text-md font-semibold">Artículos del Gasto</h3>
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex flex-col gap-2 p-3 border rounded-md bg-secondary/20">
                        <div className="flex items-end gap-2">
                            <FormField control={form.control} name={`items.${index}.materialId`} render={({ field: selectField }) => (
                              <FormItem className="flex-grow">
                                  <FormLabel className="text-xs flex items-center gap-1">
                                    {matchingItems[index] && <Loader2 className="h-3 w-3 animate-spin"/>}
                                    Concepto del Sistema
                                  </FormLabel>
                                  {isLoadingDropdowns ? (
                                    <Skeleton className="h-10 w-full" />
                                  ) : (
                                    <Select onValueChange={selectField.onChange} value={selectField.value || ""} disabled={isReadOnly}>
                                      <FormControl><SelectTrigger><SelectValue placeholder="Asociar a material..." /></SelectTrigger></FormControl>
                                      <SelectContent>
                                        {availableMaterials.map(material => (<SelectItem key={material.id} value={material.id}>{material.name}</SelectItem>))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                  <FormMessage />
                              </FormItem>
                            )} />
                            {!isReadOnly && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                        <FormField control={form.control} name={`items.${index}.description`} render={({ field: descField }) => (<FormItem><FormLabel className="text-xs text-muted-foreground">{prefilledData ? 'Concepto de Factura (Editable)' : 'Descripción Manual'}</FormLabel><FormControl><Textarea {...descField} placeholder="Descripción del artículo..." className={cn("text-xs h-auto", !watchedItems[index]?.materialId && watchedItems[index]?.description && "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400")} disabled={isReadOnly} rows={2} /></FormControl><FormMessage /></FormItem>)}/>
                        {!watchedItems[index]?.materialId && watchedItems[index]?.description && (<div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-300"><HelpCircle className="h-4 w-4" /><span>Asocia o crea un nuevo material.</span>{!isReadOnly && (<Button size="sm" variant="link" type="button" className="text-xs h-auto p-0" onClick={() => handleCreateNewMaterial(index, watchedItems[index].description || "")}><PlusCircle className="mr-1 h-3 w-3"/>Crear material</Button>)}</div>)}
                        <div className="flex items-end gap-2">
                           <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: qField }) => (<FormItem className="w-24"><FormLabel className="text-xs">Cantidad</FormLabel><FormControl><Input type="number" {...qField} disabled={isReadOnly} value={qField.value ?? ""} onChange={e => qField.onChange(e.target.value === '' ? null : Number(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                           <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field: pField }) => (<FormItem className="w-28"><FormLabel className="text-xs">Precio Unit. (€)</FormLabel><FormControl><Input type="number" step="0.01" {...pField} disabled={isReadOnly} value={pField.value ?? ""} onChange={e => pField.onChange(e.target.value === '' ? null : Number(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                           <FormField control={form.control} name={`items.${index}.batchNumber`} render={({ field: bField }) => (<FormItem className="flex-grow"><FormLabel className="text-xs">Nº Lote</FormLabel><FormControl><Input {...bField} disabled={isReadOnly} placeholder="Opcional" /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                      </div>
                    ))}
                    {!isReadOnly && <Button type="button" variant="outline" size="sm" onClick={() => append({ materialId: "", description: "", quantity: 1, unitPrice: null, batchNumber: "" })}><PlusCircle className="mr-2 h-4 w-4" />Añadir Artículo</Button>}
                  </div>

                  <Separator />
                  <h3 className="text-md font-semibold">Totales y Estado</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="shippingCost" render={({ field }) => (<FormItem><FormLabel>Gastos de Envío</FormLabel><FormControl><Input type="number" step="0.01" {...field} disabled={isReadOnly} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="taxRate" render={({ field }) => (<FormItem><FormLabel>Tasa de IVA (%)</FormLabel><FormControl><Input type="number" {...field} disabled={isReadOnly} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                  </div>

                  <div className="p-4 bg-muted/50 rounded-md space-y-2">
                    <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">Moneda:</span><FormField control={form.control} name="currency" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger></FormControl><SelectContent>{["EUR", "USD", "MXN"].map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} /></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span><FormattedNumericValue value={subtotal} options={{ style: 'currency', currency: watchedCurrency }} /></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Portes:</span><FormattedNumericValue value={watchedShippingCost || 0} options={{ style: 'currency', currency: watchedCurrency }} /></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA ({watchedTaxRate}%):</span><FormattedNumericValue value={taxAmount} options={{ style: 'currency', currency: watchedCurrency }} /></div>
                    <Separator className="my-1"/>
                    <div className="flex justify-between text-lg font-bold"><span>TOTAL:</span><FormattedNumericValue value={totalAmount} options={{ style: 'currency', currency: watchedCurrency }} /></div>
                  </div>

                  <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Estado</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un estado" /></SelectTrigger></FormControl><SelectContent>{purchaseStatusList.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas (Opcional)</FormLabel><FormControl><Textarea placeholder="Cualquier información adicional, n.º de proforma, etc." {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                  
                  {watchedInvoiceUrl && (<div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm flex items-center justify-between gap-3"><div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-blue-600 flex-shrink-0" /><div><p className="font-semibold text-blue-800">Factura Adjunta</p><p className="text-xs text-blue-600">El archivo se ha subido al sistema.</p></div></div><Button variant="outline" size="sm" asChild><Link href={watchedInvoiceUrl} target="_blank" rel="noopener noreferrer"><Link2 className="mr-2 h-4 w-4" /> Ver Archivo</Link></Button></div>)}
                </div>
              </ScrollArea>
              
              {hasInvoicePreview && (
                 <div className="flex-col h-full hidden lg:flex">
                  <Label>Previsualización de Factura</Label>
                  <div className="mt-2 border rounded-md h-[calc(100%-24px)] overflow-hidden bg-muted">
                    {previewType === 'pdf' ? (
                      <embed src={previewUrl!} type="application/pdf" width="100%" height="100%" />
                    ) : previewType === 'image' ? (
                      <img src={previewUrl!} alt="Previsualización de la factura" className="object-contain w-full h-full"/>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>No hay previsualización disponible o el tipo de archivo no es soportado.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-6">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>{isReadOnly ? "Cerrar" : "Cancelar"}</Button></DialogClose>
              {!isReadOnly && (<Button type="submit" disabled={isSaving || (!form.formState.isDirty && !!purchase )}>{isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : (purchase ? "Guardar Cambios" : "Añadir Gasto")}</Button>)}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
