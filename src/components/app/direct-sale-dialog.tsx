
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
import type { DirectSale } from "@/types";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { EstadoVentaDirecta as DirectSaleStatus, CanalVentaDirecta as DirectSaleChannel, EstadoPago as PaidStatus, CANALES_VENTA_DIRECTA as directSaleChannelList, ESTADOS_VENTA_DIRECTA as directSaleStatusList } from "@ssot";

const paidStatusList: PaidStatus[] = ['Pendiente', 'Pagado', 'Parcial'];

const editDirectSaleFormSchema = z.object({
  status: z.enum(directSaleStatusList as [DirectSaleStatus, ...DirectSaleStatus[]]),
  paidStatus: z.enum(paidStatusList as [PaidStatus, ...PaidStatus[]]),
  channel: z.enum(directSaleChannelList as [DirectSaleChannel, ...DirectSaleChannel[]]),
  issueDate: z.date(),
  dueDate: z.date().optional(),
  invoiceNumber: z.string().optional(),
  relatedPlacementOrders: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => {
    if (data.dueDate && data.issueDate > data.dueDate) {
      return false;
    }
    return true;
}, {
    message: "La fecha de vencimiento no puede ser anterior a la de emisión.",
    path: ["dueDate"],
});


export type EditDirectSaleFormValues = z.infer<typeof editDirectSaleFormSchema>;

interface DirectSaleDialogProps {
  sale: DirectSale | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: EditDirectSaleFormValues, saleId: string) => void;
  isReadOnly?: boolean;
}

export default function DirectSaleDialog({ sale, isOpen, onOpenChange, onSave, isReadOnly = false }: DirectSaleDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<EditDirectSaleFormValues>({
    resolver: zodResolver(editDirectSaleFormSchema),
    defaultValues: {
      status: "borrador",
      paidStatus: "Pendiente",
      channel: undefined,
      issueDate: new Date(),
      dueDate: undefined,
      invoiceNumber: "",
      relatedPlacementOrders: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (sale && isOpen) {
      form.reset({
        status: sale.status,
        paidStatus: sale.paidStatus || 'Pendiente',
        channel: sale.channel,
        issueDate: sale.issueDate ? parseISO(sale.issueDate) : new Date(),
        dueDate: sale.dueDate ? parseISO(sale.dueDate) : undefined,
        invoiceNumber: sale.invoiceNumber || "",
        relatedPlacementOrders: sale.relatedPlacementOrders?.join(', ') || "",
        notes: sale.notes || "",
      });
    }
  }, [sale, isOpen, form]);

  const onSubmit = async (data: EditDirectSaleFormValues) => {
    if (isReadOnly || !sale) return;
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onSave(data, sale.id);
    setIsSaving(false);
  };
  
  if (!sale) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? "Detalles de Venta" : "Editar Venta"}: {sale.id.substring(0, 8)}...</DialogTitle>
          <DialogDescription>
            {isReadOnly ? `Viendo detalles de la venta a ${sale.customerName}.` : "Modifica los detalles de la venta."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Cliente</Label>
                <p className="font-semibold text-sm mt-2">{sale.customerName}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Estado Logístico</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{directSaleStatusList.map((s) => (<SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>))}</SelectContent></Select><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="paidStatus" render={({ field }) => (
                  <FormItem><FormLabel>Estado de Pago</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{paidStatusList.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select><FormMessage/></FormItem>
                )}/>
              </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="issueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Emisión</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={isReadOnly} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="dueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Vencimiento</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={isReadOnly} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="invoiceNumber" render={({ field }) => (<FormItem><FormLabel>Nº Factura</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="channel" render={({ field }) => (<FormItem><FormLabel>Canal de Venta</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione canal" /></SelectTrigger></FormControl><SelectContent>{directSaleChannelList.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
             </div>
             
             <Separator />
             <h4 className="font-semibold">Artículos</h4>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Precio Neto</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sale.items && sale.items.map((item, index) => (
                        <TableRow key={index}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell className="font-mono text-xs">{item.batchNumber}</TableCell>
                            <TableCell className="text-right"><FormattedNumericValue value={item.quantity} /></TableCell>
                            <TableCell className="text-right"><FormattedNumericValue value={item.netUnitPrice} options={{style: 'currency', currency: 'EUR'}} /></TableCell>
                            <TableCell className="text-right font-medium"><FormattedNumericValue value={item.total} options={{style: 'currency', currency: 'EUR'}} /></TableCell>
                        </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                        <TableCell colSpan={4} className="text-right">Subtotal</TableCell>
                        <TableCell className="text-right"><FormattedNumericValue value={sale.subtotal} options={{style: 'currency', currency: 'EUR'}} /></TableCell>
                    </TableRow>
                     <TableRow className="font-bold">
                        <TableCell colSpan={4} className="text-right">IVA (21%)</TableCell>
                        <TableCell className="text-right"><FormattedNumericValue value={sale.tax} options={{style: 'currency', currency: 'EUR'}} /></TableCell>
                    </TableRow>
                     <TableRow className="font-bold text-lg border-t-2 border-primary">
                        <TableCell colSpan={4} className="text-right">Total Factura</TableCell>
                        <TableCell className="text-right"><FormattedNumericValue value={sale.totalAmount} options={{style: 'currency', currency: 'EUR'}} /></TableCell>
                    </TableRow>
                </TableBody>
            </Table>

             <Separator />

             <FormField control={form.control} name="relatedPlacementOrders" render={({ field }) => (<FormItem><FormLabel>Órdenes de Colocación Asociadas</FormLabel><FormControl><Input placeholder="IDs, separados por comas" {...field} value={field.value ?? ""} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
             <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
            
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>{isReadOnly ? "Cerrar" : "Cancelar"}</Button></DialogClose>
              {!isReadOnly && <Button type="submit" disabled={isSaving || !form.formState.isDirty}>{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Guardando...</> : "Guardar Cambios"}</Button>}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
