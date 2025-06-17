
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
import type { Order, OrderStatus, UserRole } from "@/types";
import { orderStatusesList } from "@/lib/data"; 
import { Loader2 } from "lucide-react";

const editOrderFormSchema = z.object({
  clientName: z.string().min(2, "El nombre del cliente debe tener al menos 2 caracteres."),
  products: z.string().min(3, "Debe haber al menos un producto listado."),
  value: z.coerce.number().positive("El valor del pedido debe ser positivo."),
  status: z.enum(orderStatusesList as [OrderStatus, ...OrderStatus[]]), 
});

export type EditOrderFormValues = z.infer<typeof editOrderFormSchema>;

interface EditOrderDialogProps {
  order: Order | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: EditOrderFormValues, orderId: string) => void;
  currentUserRole: UserRole;
}

export default function EditOrderDialog({ order, isOpen, onOpenChange, onSave, currentUserRole }: EditOrderDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const form = useForm<EditOrderFormValues>({
    resolver: zodResolver(editOrderFormSchema),
    defaultValues: {
      clientName: "",
      products: "",
      value: 0,
      status: "Pendiente",
    },
  });

  React.useEffect(() => {
    if (order && isOpen) {
      form.reset({
        clientName: order.clientName,
        products: order.products.join(",\n"),
        value: order.value,
        status: order.status,
      });
    }
  }, [order, isOpen, form]);

  const onSubmit = async (data: EditOrderFormValues) => {
    if (!order) return;
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 700)); 
    onSave(data, order.id);
    setIsSaving(false);
    onOpenChange(false); 
  };

  if (!order) return null;

  const isDistributor = currentUserRole === 'Distributor';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Editar Pedido: {order.id}</DialogTitle>
          <DialogDescription>
            {isDistributor 
              ? "Modifique el estado del pedido. Haga clic en guardar cuando haya terminado."
              : "Modifique los detalles del pedido. Haga clic en guardar cuando haya terminado."
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del cliente" {...field} disabled={isDistributor} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="products"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Productos Pedidos</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Listar productos y cantidades, separados por coma o nueva línea..."
                      className="min-h-[100px]"
                      {...field}
                      disabled={isDistributor}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor del Pedido (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="p. ej., 250.75"
                      {...field}
                      onChange={event => field.onChange(parseFloat(event.target.value))}
                      value={field.value === undefined ? '' : field.value}
                      disabled={isDistributor}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado del Pedido</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {orderStatusesList.map((statusVal) => (
                        <SelectItem key={statusVal} value={statusVal}>
                          {statusVal}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
