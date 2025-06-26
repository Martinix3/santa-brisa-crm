
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
import type { Purchase, PurchaseFormValues as PurchaseFormValuesType, PurchaseStatus, PromotionalMaterial } from "@/types";
import { purchaseStatusList } from "@/lib/data";
import { Loader2, Calendar as CalendarIcon, DollarSign, PlusCircle, Trash2, FileCheck2, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import { Separator } from "../ui/separator";
import FormattedNumericValue from "../lib/formatted-numeric-value";
import Link from 'next/link';
import { getPromotionalMaterialsFS } from "@/services/promotional-material-service";
import { useToast } from "@/hooks/use-toast";

const purchaseItemSchema = z.object({
  materialId: z.string().min(1, "Debe seleccionar un material."),
  description: z.string().optional(), // Now optional, will be auto-filled
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
  const { toast } = useToast();

  React.useEffect(() => {
    async function loadMaterials() {
        setIsLoadingMaterials(true);
        try {
            const materials = await getPromotionalMaterialsFS();
            setAvailableMaterials(materials);
        } catch (error) {
            console.error("Failed to load promotional materials for purchase dialog:", error);
            toast({ title: "Error", description: "No se pudieron cargar los materiales promocionales.", variant: "destructive" });
        } finally {
            setIsLoadingMaterials(false);
        }
    }
    if (isOpen) {
        loadMaterials();
    }
  }, [isOpen, toast]);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplier: "",
      orderDate: new Date(),
      status: "Borrador",
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

  React.useEffect(() => {
    if (isOpen) {
      if (prefilledData) {
         form.reset(prefilledData as PurchaseFormValues);
      } else if (purchase) {
        form.reset({
          supplier: purchase.supplier,
          orderDate: parseISO(purchase.orderDate),
          status: purchase.status,
          items: purchase.items.map(item => ({ materialId: item.materialId, description: item.description, quantity: item.quantity, unitPrice: item.unitPrice })),
          shippingCost: purchase.shippingCost || 0,
          taxRate: purchase.taxRate,
          notes: purchase.notes || "",
          invoiceUrl: purchase.invoiceUrl || "",
          storagePath: purchase.storagePath || "",
          invoiceDataUri: "", 
        });
      } else {
        form.reset({
          supplier: "",
          orderDate: new Date(),
          status: "Borrador",
          items: [{ materialId: "", description: "", quantity: 1, unitPrice: undefined }],
          shippingCost: 0,
          taxRate: 21,
          notes: "",
          invoiceUrl: "",
          storagePath: "",
          invoiceDataUri: "",
        });
      }
    }
  }, [purchase, prefilledData, isOpen, form]);

  const onSubmit = async (data: PurchaseFormValues) => {
    if (isReadOnly) return;
    setIsSaving(true);
    await onSave(data, purchase?.id);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? "Detalles de Compra" : (purchase ? "Editar Compra/Gasto" : "Registrar Nueva Compra/Gasto")}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? `Viendo detalles de la compra a ${purchase?.supplier}.` : (purchase ? "Modifica los detalles de la compra." : "Introduce la información de la nueva compra o gasto.")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="supplier" render={({ field }) => (<FormItem><FormLabel>Proveedor</FormLabel><FormControl><Input placeholder="Ej: Proveedor de Tequila" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="orderDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Pedido/Gasto</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={isReadOnly} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
            </div>

            <Separator />
            <h3 className="text-md font-semibold">Artículos de la Compra</h3>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md bg-secondary/20">
                  <FormField control={form.control} name={`items.${index}.materialId`} render={({ field: selectField }) => (
                    <FormItem className="flex-grow">
                        <FormLabel className="text-xs">Concepto</FormLabel>
                        <Select
                            onValueChange={(value) => {
                                selectField.onChange(value);
                                const selectedMaterial = availableMaterials.find(m => m.id === value);
                                update(index, { ...watchedItems[index], materialId: value, description: selectedMaterial?.name || "" });
                            }}
                            value={selectField.value}
                            disabled={isReadOnly || isLoadingMaterials}
                        >
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar material" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {availableMaterials.map(material => (
                                    <SelectItem key={material.id} value={material.id}>{material.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                    <FormItem className="w-24">
                        <FormLabel className="text-xs">Cantidad</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} disabled={isReadOnly}
                                   value={field.value === undefined || isNaN(field.value) ? '' : field.value}
                                   onChange={e => { const val = e.target.value; field.onChange(val === '' ? undefined : parseInt(val, 10)); }}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field }) => (
                    <FormItem className="w-28">
                        <FormLabel className="text-xs">Precio Unit. (€)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" {...field} disabled={isReadOnly}
                                   value={field.value === undefined || isNaN(field.value) ? '' : field.value}
                                   onChange={e => { const val = e.target.value; field.onChange(val === '' ? undefined : parseFloat(val)); }}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                  )} />
                  {!isReadOnly && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                </div>
              ))}
               {!isReadOnly && <Button type="button" variant="outline" size="sm" onClick={() => append({ materialId: "", description: "", quantity: 1, unitPrice: undefined })}><PlusCircle className="mr-2 h-4 w-4" />Añadir Artículo</Button>}
            </div>

            <Separator />
            <h3 className="text-md font-semibold">Totales y Estado</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="shippingCost" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Gastos de Envío (€)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" {...field} disabled={isReadOnly}
                                   value={field.value === undefined || isNaN(field.value) ? '' : field.value}
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
                                   value={field.value === undefined || isNaN(field.value) ? '' : field.value}
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

            <DialogFooter className="pt-6">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>{isReadOnly ? "Cerrar" : "Cancelar"}</Button></DialogClose>
              {!isReadOnly && (<Button type="submit" disabled={isSaving || (!form.formState.isDirty && !!purchase && !prefilledData)}>{isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : (purchase ? "Guardar Cambios" : "Añadir Compra")}</Button>)}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
