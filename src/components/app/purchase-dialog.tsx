
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
import type { Purchase, PurchaseItem, PurchaseFormValues as PurchaseFormValuesType, PurchaseStatus } from "@/types";
import { purchaseStatusList } from "@/lib/data";
import { Loader2, Calendar as CalendarIcon, DollarSign, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import { Separator } from "../ui/separator";
import FormattedNumericValue from "../lib/formatted-numeric-value";

const purchaseItemSchema = z.object({
  description: z.string().min(3, "El concepto debe tener al menos 3 caracteres."),
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
  invoiceDataUri: z.string().optional(),
  invoiceFileName: z.string().optional(),
  orderDate: z.date({ required_error: "La fecha del pedido es obligatoria." }),
  status: z.enum(purchaseStatusList as [PurchaseStatus, ...PurchaseStatus[]]),
  items: z.array(purchaseItemSchema).min(1, "Debe añadir al menos un artículo a la compra."),
  shippingCost: z.coerce.number().min(0, "Los portes no pueden ser negativos.").optional(),
  taxRate: z.coerce.number().min(0, "El IVA no puede ser negativo.").default(21),
  notes: z.string().optional(),
});

export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

interface PurchaseDialogProps {
  purchase: Purchase | null;
  initialData?: Partial<PurchaseFormValues> | null;
  pendingInvoice?: { uri: string; name: string } | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PurchaseFormValues, purchaseId?: string) => Promise<void>;
  isReadOnly?: boolean;
}

export default function PurchaseDialog({ purchase, initialData, pendingInvoice, isOpen, onOpenChange, onSave, isReadOnly = false }: PurchaseDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplier: "",
      orderDate: new Date(),
      status: "Borrador",
      items: [{ description: "", quantity: 1, unitPrice: undefined as any }],
      shippingCost: 0,
      taxRate: 21,
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const watchedShippingCost = form.watch("shippingCost");
  const watchedTaxRate = form.watch("taxRate");

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
      if (initialData) {
        form.reset({
            supplier: initialData.supplier || "",
            supplierCif: initialData.supplierCif,
            supplierAddress_street: initialData.supplierAddress_street,
            supplierAddress_city: initialData.supplierAddress_city,
            supplierAddress_province: initialData.supplierAddress_province,
            supplierAddress_postalCode: initialData.supplierAddress_postalCode,
            supplierAddress_country: initialData.supplierAddress_country,
            orderDate: initialData.orderDate || new Date(),
            status: "Borrador",
            items: initialData.items && initialData.items.length > 0 ? initialData.items : [{ description: "", quantity: 1, unitPrice: undefined as any }],
            shippingCost: initialData.shippingCost || 0,
            taxRate: initialData.taxRate || 21,
            notes: initialData.notes || "",
        });
      } else if (purchase) {
        form.reset({
          supplier: purchase.supplier,
          orderDate: parseISO(purchase.orderDate),
          status: purchase.status,
          items: purchase.items.map(item => ({ description: item.description, quantity: item.quantity, unitPrice: item.unitPrice })),
          shippingCost: purchase.shippingCost || 0,
          taxRate: purchase.tax ? (purchase.tax / (purchase.subtotal + (purchase.shippingCost || 0))) * 100 : 21,
          notes: purchase.notes || "",
        });
      } else {
        form.reset({
          supplier: "",
          orderDate: new Date(),
          status: "Borrador",
          items: [{ description: "", quantity: 1, unitPrice: undefined as any }],
          shippingCost: 0,
          taxRate: 21,
          notes: "",
        });
      }
    }
  }, [purchase, initialData, isOpen, form]);

  const onSubmit = async (data: PurchaseFormValues) => {
    if (isReadOnly) return;
    setIsSaving(true);
    
    const finalData = { ...data };
    if (pendingInvoice) {
      finalData.invoiceDataUri = pendingInvoice.uri;
      finalData.invoiceFileName = pendingInvoice.name;
    }
    
    await onSave(finalData, purchase?.id);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? "Detalles de Compra" : (purchase || initialData ? "Editar Compra/Gasto" : "Registrar Nueva Compra/Gasto")}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? `Viendo detalles de la compra a ${purchase?.supplier}.` : (purchase || initialData ? "Modifica los detalles de la compra." : "Introduce la información de la nueva compra o gasto.")}
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
                  <FormField control={form.control} name={`items.${index}.description`} render={({ field }) => (<FormItem className="flex-grow"><FormLabel className="text-xs">Concepto</FormLabel><FormControl><Input placeholder="Descripción del producto o servicio" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (<FormItem className="w-24"><FormLabel className="text-xs">Cantidad</FormLabel><FormControl><Input type="number" {...field} disabled={isReadOnly} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field }) => (<FormItem className="w-28"><FormLabel className="text-xs">Precio Unit. (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} disabled={isReadOnly} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                  {!isReadOnly && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                </div>
              ))}
               {!isReadOnly && <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", quantity: 1, unitPrice: undefined as any })}><PlusCircle className="mr-2 h-4 w-4" />Añadir Artículo</Button>}
            </div>

            <Separator />
            <h3 className="text-md font-semibold">Totales y Estado</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="shippingCost" render={({ field }) => (<FormItem><FormLabel>Gastos de Envío (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} disabled={isReadOnly} onChange={e => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="taxRate" render={({ field }) => (<FormItem><FormLabel>Tasa de IVA (%)</FormLabel><FormControl><Input type="number" {...field} disabled={isReadOnly} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
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

            <DialogFooter className="pt-6">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>{isReadOnly ? "Cerrar" : "Cancelar"}</Button></DialogClose>
              {!isReadOnly && (<Button type="submit" disabled={isSaving || (!form.formState.isDirty && !!purchase)}>{isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : (purchase ? "Guardar Cambios" : "Añadir Compra")}</Button>)}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
