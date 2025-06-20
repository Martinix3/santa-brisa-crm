
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
  FormDescription,
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
import { ScrollArea } from "@/components/ui/scroll-area"; 
import type { Account, VentaDirectaSB, VentaDirectaSBFormValues, CanalVentaDirectaSB, EstadoVentaDirectaSB, AddressDetails } from "@/types";
import { canalVentaDirectaList, estadoVentaDirectaList } from "@/lib/data";
import { Loader2, Calendar as CalendarIcon, PlusCircle, Trash2, DollarSign, Percent } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";

const IVA_POR_DEFECTO = 21; 

const ventaDirectaSBItemSchema = z.object({
  productoDescripcion: z.string().min(3, "La descripción del producto es obligatoria."),
  cantidad: z.coerce.number().min(1, "Cantidad debe ser al menos 1."),
  precioUnitarioNetoSB: z.coerce.number().min(0.01, "Precio debe ser positivo."),
});

const ventaDirectaSBFormSchema = z.object({
  fechaEmision: z.date({ required_error: "La fecha de emisión es obligatoria." }),
  numeroFacturaSB: z.string().optional(),
  clienteId: z.string().min(1, "Debe seleccionar un cliente."),
  canalVentaDirectaSB: z.enum(canalVentaDirectaList as [CanalVentaDirectaSB, ...CanalVentaDirectaSB[]], {
    required_error: "El canal de venta es obligatorio.",
  }),
  items: z.array(ventaDirectaSBItemSchema).min(1, "Debe añadir al menos un ítem a la venta."),
  tipoIvaAplicadoSB: z.coerce.number().min(0, "El IVA no puede ser negativo.").optional(),
  estadoVentaDirectaSB: z.enum(estadoVentaDirectaList as [EstadoVentaDirectaSB, ...EstadoVentaDirectaSB[]], {
    required_error: "El estado de la venta es obligatorio.",
  }),
  fechaVencimientoPago: z.date().optional(),
  referenciasOrdenesColocacion: z.string().optional(),
  notasInternasSB: z.string().optional(),
});


interface VentaDirectaDialogProps {
  venta: VentaDirectaSB | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: VentaDirectaSBFormValues, ventaId?: string) => Promise<void>;
  allAccounts: Account[];
  isReadOnly?: boolean;
}

// Helper para formatear AddressDetails a un string
const formatAddressDetailsToString = (address?: AddressDetails): string => {
  if (!address) return "";
  const parts = [
    address.street,
    address.number,
    address.postalCode,
    address.city,
    address.province,
    address.country,
  ].filter(Boolean); // Filtra partes undefined o vacías
  return parts.join(', ');
};


export default function VentaDirectaDialog({ venta, isOpen, onOpenChange, onSave, allAccounts, isReadOnly = false }: VentaDirectaDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<VentaDirectaSBFormValues>({
    resolver: zodResolver(ventaDirectaSBFormSchema),
    defaultValues: {
      fechaEmision: new Date(),
      numeroFacturaSB: "",
      clienteId: "",
      canalVentaDirectaSB: undefined,
      items: [{ productoDescripcion: "Santa Brisa 750ml", cantidad: 1, precioUnitarioNetoSB: undefined }],
      tipoIvaAplicadoSB: IVA_POR_DEFECTO,
      estadoVentaDirectaSB: "Borrador",
      fechaVencimientoPago: undefined,
      referenciasOrdenesColocacion: "",
      notasInternasSB: "",
    },
  });

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const watchedTipoIva = form.watch("tipoIvaAplicadoSB");

  const subtotalGeneralNetoSB = React.useMemo(() => {
    return watchedItems.reduce((total, item) => {
      const cantidad = Number(item.cantidad) || 0;
      const precio = Number(item.precioUnitarioNetoSB) || 0;
      return total + (cantidad * precio);
    }, 0);
  }, [watchedItems]);

  const importeIvaSB = React.useMemo(() => {
    const tipoIva = Number(watchedTipoIva);
    if (isNaN(tipoIva) || tipoIva < 0) return 0;
    return subtotalGeneralNetoSB * (tipoIva / 100);
  }, [subtotalGeneralNetoSB, watchedTipoIva]);

  const totalFacturaSB = React.useMemo(() => {
    return subtotalGeneralNetoSB + importeIvaSB;
  }, [subtotalGeneralNetoSB, importeIvaSB]);


  React.useEffect(() => {
    if (isOpen) {
      if (venta) {
        form.reset({
          fechaEmision: venta.fechaEmision ? parseISO(venta.fechaEmision) : new Date(),
          numeroFacturaSB: venta.numeroFacturaSB || "",
          clienteId: venta.clienteId,
          canalVentaDirectaSB: venta.canalVentaDirectaSB,
          items: venta.items.map(item => ({
            productoDescripcion: item.productoDescripcion,
            cantidad: item.cantidad,
            precioUnitarioNetoSB: item.precioUnitarioNetoSB,
          })),
          tipoIvaAplicadoSB: venta.tipoIvaAplicadoSB === undefined ? IVA_POR_DEFECTO : venta.tipoIvaAplicadoSB,
          estadoVentaDirectaSB: venta.estadoVentaDirectaSB,
          fechaVencimientoPago: venta.fechaVencimientoPago ? parseISO(venta.fechaVencimientoPago) : undefined,
          referenciasOrdenesColocacion: venta.referenciasOrdenesColocacion?.join(', ') || "",
          notasInternasSB: venta.notasInternasSB || "",
        });
      } else {
        form.reset({
          fechaEmision: new Date(),
          numeroFacturaSB: "",
          clienteId: "",
          canalVentaDirectaSB: undefined,
          items: [{ productoDescripcion: "Santa Brisa 750ml", cantidad: 1, precioUnitarioNetoSB: undefined }],
          tipoIvaAplicadoSB: IVA_POR_DEFECTO,
          estadoVentaDirectaSB: "Borrador",
          fechaVencimientoPago: undefined,
          referenciasOrdenesColocacion: "",
          notasInternasSB: "",
        });
      }
    }
  }, [venta, isOpen, form]);

  const onSubmit = async (data: VentaDirectaSBFormValues) => {
    if (isReadOnly) return;
    setIsSaving(true);

    // La función onSave ahora espera el objeto VentaDirectaSBFormValues completo
    // La lógica de construir el objeto VentaDirectaSB completo (con AddressDetails, etc.)
    // se ha movido a la page.tsx `handleSaveVenta` para centralizarla.
    await onSave(data, venta?.id);
    setIsSaving(false);
  };
  
  const relevantAccounts = React.useMemo(() => 
    allAccounts.filter(acc => 
        acc.type === 'Importador' || 
        acc.type === 'Cliente Final Directo' || 
        acc.type === 'Gran Superficie' ||
        acc.type === 'Retail Minorista' ||
        acc.type === 'Evento Especial' ||
        acc.status === 'Activo' 
    ).sort((a,b) => a.name.localeCompare(b.name)), 
  [allAccounts]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? "Detalles de Venta Directa SB" : (venta ? "Editar Venta Directa SB" : "Registrar Nueva Venta Directa SB")}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? `Viendo detalles de la venta ${venta?.id}.` : (venta ? "Modifica los detalles de la venta directa." : "Introduce la información de la nueva venta directa.")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="fechaEmision" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Emisión</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={isReadOnly} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="numeroFacturaSB" render={({ field }) => (<FormItem><FormLabel>Nº Factura SB (Opcional)</FormLabel><FormControl><Input placeholder="Ej: SB-2024-001" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="estadoVentaDirectaSB" render={({ field }) => (<FormItem><FormLabel>Estado Venta</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione estado" /></SelectTrigger></FormControl><SelectContent>{estadoVentaDirectaList.map(status => (<SelectItem key={status} value={status}>{status}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="clienteId" render={({ field }) => (<FormItem><FormLabel>Cliente</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger></FormControl><SelectContent><ScrollArea className="h-48">{relevantAccounts.map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.type})</SelectItem>))}</ScrollArea></SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="canalVentaDirectaSB" render={({ field }) => (<FormItem><FormLabel>Canal de Venta</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione canal" /></SelectTrigger></FormControl><SelectContent>{canalVentaDirectaList.map(canal => (<SelectItem key={canal} value={canal}>{canal}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            </div>

            <Separator className="my-6" />
            <h3 className="text-lg font-medium text-primary">Ítems de la Venta</h3>
            <div className="space-y-3">
              {itemFields.map((item, index) => (
                <div key={item.id} className="flex flex-col md:flex-row items-start md:items-end gap-2 p-3 border rounded-md bg-secondary/30">
                  <FormField control={form.control} name={`items.${index}.productoDescripcion`} render={({ field }) => (<FormItem className="flex-grow"><FormLabel className="text-xs">Descripción Producto</FormLabel><FormControl><Input placeholder="Ej: Santa Brisa Clásica 750ml" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name={`items.${index}.cantidad`} render={({ field }) => (<FormItem className="w-full md:w-28"><FormLabel className="text-xs">Cantidad</FormLabel><FormControl><Input type="number" placeholder="Cant." {...field} disabled={isReadOnly} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name={`items.${index}.precioUnitarioNetoSB`} render={({ field }) => (<FormItem className="w-full md:w-36"><FormLabel className="text-xs">Precio Unit. Neto (€)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Precio" {...field} disabled={isReadOnly} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="w-full md:w-32 text-left md:text-right pt-2 md:pt-0 md:self-center">
                    <FormLabel className="text-xs block md:hidden">Subtotal</FormLabel>
                    <span className="font-medium">
                      <FormattedNumericValue value={(Number(watchedItems[index]?.cantidad) || 0) * (Number(watchedItems[index]?.precioUnitarioNetoSB) || 0)} options={{style:'currency', currency:'EUR'}} />
                    </span>
                  </div>
                  {!isReadOnly && (<Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-destructive hover:bg-destructive/10 self-center md:self-end mt-2 md:mt-0"><Trash2 className="h-4 w-4" /></Button>)}
                </div>
              ))}
              {!isReadOnly && (<Button type="button" variant="outline" size="sm" onClick={() => appendItem({ productoDescripcion: "Santa Brisa 750ml", cantidad: 1, precioUnitarioNetoSB: undefined })} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" />Añadir Ítem</Button>)}
            </div>
            
            <Separator className="my-6" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 items-end">
                <div className="md:col-span-1">
                    <FormField control={form.control} name="tipoIvaAplicadoSB" render={({ field }) => (<FormItem><FormLabel className="flex items-center"><Percent className="mr-1 h-4 w-4" />Tipo IVA Aplicado (%)</FormLabel><FormControl><Input type="number" placeholder="Ej: 21" {...field} disabled={isReadOnly} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} value={field.value ?? IVA_POR_DEFECTO} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-muted/50 rounded-md">
                        <p className="text-xs text-muted-foreground">Subtotal General Neto</p>
                        <p className="font-semibold"><FormattedNumericValue value={subtotalGeneralNetoSB} options={{style:'currency', currency:'EUR'}} /></p>
                    </div>
                     <div className="p-3 bg-muted/50 rounded-md">
                        <p className="text-xs text-muted-foreground">Importe IVA</p>
                        <p className="font-semibold"><FormattedNumericValue value={importeIvaSB} options={{style:'currency', currency:'EUR'}} /></p>
                    </div>
                     <div className="p-3 bg-primary/10 rounded-md">
                        <p className="text-xs text-primary/80">Total Factura</p>
                        <p className="font-bold text-lg text-primary"><FormattedNumericValue value={totalFacturaSB} options={{style:'currency', currency:'EUR'}} /></p>
                    </div>
                </div>
            </div>
            
            <Separator className="my-6" />
            <FormField control={form.control} name="fechaVencimientoPago" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Vencimiento Pago (Opcional)</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full md:w-1/2 justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={isReadOnly} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="referenciasOrdenesColocacion" render={({ field }) => (<FormItem><FormLabel>Ref. Órdenes de Colocación (Opcional)</FormLabel><FormControl><Textarea placeholder="IDs de pedidos de cliente final cubiertos, separados por comas..." {...field} disabled={isReadOnly} /></FormControl><FormDescription>Ayuda a trazar qué pedidos de clientes finales cubre esta venta directa.</FormDescription><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="notasInternasSB" render={({ field }) => (<FormItem><FormLabel>Notas Internas (Opcional)</FormLabel><FormControl><Textarea placeholder="Comentarios para uso interno..." {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />

            <DialogFooter className="pt-8">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving && !isReadOnly}>{isReadOnly ? "Cerrar" : "Cancelar"}</Button></DialogClose>
              {!isReadOnly && (<Button type="submit" disabled={isSaving || (!form.formState.isDirty && !!venta)}>{isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : (venta ? "Guardar Cambios" : "Registrar Venta")}</Button>)}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

```