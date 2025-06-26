
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
import type { Purchase, PurchaseFormValues, PurchaseStatus } from "@/types";
import { purchaseStatusList } from "@/lib/data";
import { Loader2, Calendar as CalendarIcon, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';

const purchaseFormSchema = z.object({
  supplier: z.string().min(2, "El nombre del proveedor es obligatorio."),
  description: z.string().min(5, "La descripción debe tener al menos 5 caracteres."),
  orderDate: z.date({ required_error: "La fecha del pedido es obligatoria." }),
  amount: z.coerce.number().min(0.01, "El importe debe ser un valor positivo."),
  status: z.enum(purchaseStatusList as [PurchaseStatus, ...PurchaseStatus[]], {
    required_error: "El estado es obligatorio.",
  }),
  notes: z.string().optional(),
});

export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

interface PurchaseDialogProps {
  purchase: Purchase | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PurchaseFormValues, purchaseId?: string) => Promise<void>;
  isReadOnly?: boolean;
}

export default function PurchaseDialog({ purchase, isOpen, onOpenChange, onSave, isReadOnly = false }: PurchaseDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplier: "",
      description: "",
      orderDate: new Date(),
      amount: undefined,
      status: "Borrador",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (purchase) {
        form.reset({
          supplier: purchase.supplier,
          description: purchase.description,
          orderDate: parseISO(purchase.orderDate),
          amount: purchase.amount,
          status: purchase.status,
          notes: purchase.notes || "",
        });
      } else {
        form.reset({
          supplier: "",
          description: "",
          orderDate: new Date(),
          amount: undefined,
          status: "Borrador",
          notes: "",
        });
      }
    }
  }, [purchase, isOpen, form]);

  const onSubmit = async (data: PurchaseFormValues) => {
    if (isReadOnly) return;
    setIsSaving(true);
    await onSave(data, purchase?.id);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? "Detalles de Compra" : (purchase ? "Editar Compra/Gasto" : "Registrar Nueva Compra/Gasto")}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? `Viendo detalles de la compra a ${purchase?.supplier}.` : (purchase ? "Modifica los detalles de la compra." : "Introduce la información de la nueva compra o gasto.")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
            <FormField control={form.control} name="supplier" render={({ field }) => (<FormItem><FormLabel>Proveedor</FormLabel><FormControl><Input placeholder="Ej: Proveedor de Tequila" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Concepto</FormLabel><FormControl><Textarea placeholder="Ej: Compra de 1000L de Tequila Blanco Lote #23" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="orderDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Pedido/Gasto</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={isReadOnly} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Importe Total (€)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ej: 1500.50" {...field} disabled={isReadOnly} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Estado</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un estado" /></SelectTrigger></FormControl><SelectContent>{purchaseStatusList.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas (Opcional)</FormLabel><FormControl><Textarea placeholder="Cualquier información adicional, n.º de proforma, etc." {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter className="pt-6">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>{isReadOnly ? "Cerrar" : "Cancelar"}</Button></DialogClose>
              {!isReadOnly && (<Button type="submit" disabled={isSaving || !form.formState.isDirty}>{isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : (purchase ? "Guardar Cambios" : "Añadir Compra")}</Button>)}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
