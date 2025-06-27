
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
import type { DirectSale, DirectSaleStatus, DirectSaleChannel, Account } from "@/types";
import { directSaleStatusList, directSaleChannelList } from "@/lib/data";
import { Loader2, Calendar as CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import { Separator } from "../ui/separator";
import FormattedNumericValue from "../lib/formatted-numeric-value";
import { useToast } from "@/hooks/use-toast";


const directSaleItemSchema = z.object({
  productId: z.string().optional(), // No tenemos un catálogo de productos aún, así que es opcional
  productName: z.string().min(1, "El nombre del producto es obligatorio."),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  netUnitPrice: z.coerce.number().min(0.01, "El precio debe ser positivo."),
});

const directSaleFormSchema = z.object({
  customerId: z.string().min(1, "Debe seleccionar un cliente."),
  customerName: z.string(), // Se autocompletará
  channel: z.enum(directSaleChannelList as [DirectSaleChannel, ...DirectSaleChannel[]], { required_error: "El canal de venta es obligatorio." }),
  items: z.array(directSaleItemSchema).min(1, "Debe añadir al menos un producto a la venta."),
  issueDate: z.date({ required_error: "La fecha de emisión es obligatoria." }),
  dueDate: z.date().optional(),
  invoiceNumber: z.string().optional(),
  status: z.enum(directSaleStatusList as [DirectSaleStatus, ...DirectSaleStatus[]]),
  relatedPlacementOrders: z.string().optional(),
  notes: z.string().optional(),
});

export type DirectSaleFormValues = z.infer<typeof directSaleFormSchema>;

interface VentaDirectaDialogProps {
  sale: DirectSale | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: DirectSaleFormValues, saleId?: string) => Promise<void>;
  accounts: Account[];
}

export default function VentaDirectaDialog({ sale, isOpen, onOpenChange, onSave, accounts }: VentaDirectaDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<DirectSaleFormValues>({
    resolver: zodResolver(directSaleFormSchema),
    defaultValues: {
      customerId: "",
      customerName: "",
      channel: undefined,
      items: [{ productName: "", quantity: 1, netUnitPrice: undefined }],
      issueDate: new Date(),
      dueDate: undefined,
      invoiceNumber: "",
      status: "Borrador",
      relatedPlacementOrders: "",
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const watchedItems = form.watch("items");
  const customerIdWatched = form.watch("customerId");

  const { subtotal, tax, totalAmount } = React.useMemo(() => {
    const currentSubtotal = watchedItems.reduce((sum, item) => {
      const quantity = item.quantity || 0;
      const unitPrice = item.netUnitPrice || 0;
      return sum + quantity * unitPrice;
    }, 0);
    const currentTax = currentSubtotal * 0.21; // Asumimos 21% IVA fijo
    const currentTotalAmount = currentSubtotal + currentTax;
    return { subtotal: currentSubtotal, tax: currentTax, totalAmount: currentTotalAmount };
  }, [watchedItems]);

  React.useEffect(() => {
    if (customerIdWatched) {
        const selectedAccount = accounts.find(acc => acc.id === customerIdWatched);
        if (selectedAccount) {
            form.setValue('customerName', selectedAccount.name);
        }
    }
  }, [customerIdWatched, accounts, form]);

  React.useEffect(() => {
    if (isOpen) {
      if (sale) {
        form.reset({
          customerId: sale.customerId,
          customerName: sale.customerName,
          channel: sale.channel,
          items: sale.items.map(item => ({ ...item, productId: item.productId || ''})),
          issueDate: parseISO(sale.issueDate),
          dueDate: sale.dueDate ? parseISO(sale.dueDate) : undefined,
          invoiceNumber: sale.invoiceNumber,
          status: sale.status,
          relatedPlacementOrders: sale.relatedPlacementOrders?.join(', '),
          notes: sale.notes,
        });
      } else {
        form.reset({
          customerId: "",
          customerName: "",
          channel: undefined,
          items: [{ productName: "Santa Brisa 750ml", quantity: 1, netUnitPrice: undefined }],
          issueDate: new Date(),
          dueDate: undefined,
          invoiceNumber: "",
          status: "Borrador",
          relatedPlacementOrders: "",
          notes: "",
        });
      }
    }
  }, [sale, isOpen, form]);

  const onSubmit = async (data: DirectSaleFormValues) => {
    setIsSaving(true);
    await onSave(data, sale?.id);
    setIsSaving(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sale ? "Editar Venta Directa" : "Crear Nueva Venta Directa"}</DialogTitle>
          <DialogDescription>
            {sale ? "Modifica los detalles de la venta." : "Introduce la información de la nueva venta."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar un cliente..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.type})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="channel" render={({ field }) => (
                  <FormItem><FormLabel>Canal de Venta</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar canal" /></SelectTrigger></FormControl><SelectContent>{directSaleChannelList.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Estado</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger></FormControl><SelectContent>{directSaleStatusList.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
              )} />
            </div>

            <Separator />
            <h3 className="text-md font-semibold">Artículos de la Venta</h3>
            <div className="space-y-3">
              {fields.map((field, index) => (
                 <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md bg-secondary/20">
                    <FormField control={form.control} name={`items.${index}.productName`} render={({ field }) => (<FormItem className="flex-grow"><FormLabel className="text-xs">Producto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (<FormItem className="w-24"><FormLabel className="text-xs">Cantidad</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`items.${index}.netUnitPrice`} render={({ field }) => (<FormItem className="w-28"><FormLabel className="text-xs">Precio Neto</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                 </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append({ productName: "", quantity: 1, netUnitPrice: undefined })}><PlusCircle className="mr-2 h-4 w-4" />Añadir Artículo</Button>
            </div>
            
            <Separator />
            <h3 className="text-md font-semibold">Totales y Fechas</h3>
             <div className="p-4 bg-muted/50 rounded-md space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span><FormattedNumericValue value={subtotal} options={{ style: 'currency', currency: 'EUR' }} /></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA (21%):</span><FormattedNumericValue value={tax} options={{ style: 'currency', currency: 'EUR' }} /></div>
                <Separator className="my-1"/>
                <div className="flex justify-between text-lg font-bold"><span className="text-foreground">TOTAL:</span><FormattedNumericValue value={totalAmount} options={{ style: 'currency', currency: 'EUR' }} /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="issueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Emisión</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="dueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Vencimiento (Opcional)</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
            </div>

            <FormField control={form.control} name="invoiceNumber" render={({ field }) => (<FormItem><FormLabel>Nº Factura (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            
             <Separator />
             <FormField control={form.control} name="relatedPlacementOrders" render={({ field }) => (<FormItem><FormLabel>Órdenes de Colocación Asociadas (Opcional)</FormLabel><FormControl><Input placeholder="IDs de pedidos, separados por comas" {...field} /></FormControl><FormMessage /></FormItem>)} />
             <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas (Opcional)</FormLabel><FormControl><Textarea placeholder="Cualquier nota adicional sobre esta venta..." {...field} /></FormControl><FormMessage /></FormItem>)} />


            <DialogFooter className="pt-6">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving || !form.formState.isDirty}>{isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : (sale ? "Guardar Cambios" : "Añadir Venta")}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
