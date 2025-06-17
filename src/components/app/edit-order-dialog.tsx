
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
import type { Order, OrderStatus, UserRole, TeamMember } from "@/types";
import { orderStatusesList, mockTeamMembers } from "@/lib/data";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const editOrderFormSchema = z.object({
  clientName: z.string().min(2, "El nombre del cliente debe tener al menos 2 caracteres."),
  products: z.string().min(3, "Debe haber al menos un producto listado."),
  value: z.coerce.number().positive("El valor del pedido debe ser positivo."),
  status: z.enum(orderStatusesList as [OrderStatus, ...OrderStatus[]]),
  salesRep: z.string().min(1, "El representante de ventas es obligatorio."),
  // Customer and billing information - optional for editing context
  nombreFiscal: z.string().optional(),
  cif: z.string().optional(),
  direccionFiscal: z.string().optional(),
  direccionEntrega: z.string().optional(),
  contactoNombre: z.string().optional(),
  contactoCorreo: z.string().email("El formato del correo no es válido.").optional().or(z.literal('')),
  contactoTelefono: z.string().optional(),
  observacionesAlta: z.string().optional(),
  notes: z.string().optional(),
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
      salesRep: "",
      nombreFiscal: "",
      cif: "",
      direccionFiscal: "",
      direccionEntrega: "",
      contactoNombre: "",
      contactoCorreo: "",
      contactoTelefono: "",
      observacionesAlta: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (order && isOpen) {
      form.reset({
        clientName: order.clientName,
        products: order.products.join(",\n"),
        value: order.value,
        status: order.status,
        salesRep: order.salesRep,
        nombreFiscal: order.nombreFiscal || "",
        cif: order.cif || "",
        direccionFiscal: order.direccionFiscal || "",
        direccionEntrega: order.direccionEntrega || "",
        contactoNombre: order.contactoNombre || "",
        contactoCorreo: order.contactoCorreo || "",
        contactoTelefono: order.contactoTelefono || "",
        observacionesAlta: order.observacionesAlta || "",
        notes: order.notes || "",
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
  const isSalesRep = currentUserRole === 'SalesRep';
  
  const canEditOrderDetails = currentUserRole === 'Admin'; // This includes salesRep
  const canEditStatusOnly = isDistributor;
  const isReadOnly = isSalesRep;


  const formFieldsGenericDisabled = isReadOnly || canEditStatusOnly; // For most fields
  const statusFieldDisabled = isReadOnly;
  const salesRepFieldDisabled = !canEditOrderDetails;


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isReadOnly ? "Detalles del Pedido:" : "Editar Pedido:"} {order.id}
          </DialogTitle>
          <DialogDescription>
            {isReadOnly
              ? "Viendo los detalles del pedido."
              : canEditStatusOnly
              ? "Modifique el estado del pedido. Haga clic en guardar cuando haya terminado."
              : "Modifique los detalles del pedido y del cliente. Haga clic en guardar cuando haya terminado."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <h3 className="text-md font-medium text-muted-foreground pt-2">Detalles del Pedido</h3>
            <Separator />
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del cliente" {...field} disabled={formFieldsGenericDisabled} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="salesRep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Representante de Ventas</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={salesRepFieldDisabled}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un representante" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mockTeamMembers.map((member: TeamMember) => (
                          <SelectItem key={member.id} value={member.name}>
                            {member.name} ({member.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      placeholder="Listar productos y cantidades..."
                      className="min-h-[80px]"
                      {...field}
                      disabled={formFieldsGenericDisabled}
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
                      disabled={formFieldsGenericDisabled}
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={statusFieldDisabled}>
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

            <h3 className="text-md font-medium text-muted-foreground pt-4">Información de Cliente y Facturación</h3>
            <Separator />
             <FormField
              control={form.control}
              name="nombreFiscal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Fiscal</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre legal" {...field} disabled={formFieldsGenericDisabled}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cif"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CIF</FormLabel>
                  <FormControl>
                    <Input placeholder="CIF/NIF" {...field} disabled={formFieldsGenericDisabled}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="direccionFiscal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección Fiscal</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Dirección fiscal completa" {...field} className="min-h-[60px]" disabled={formFieldsGenericDisabled}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="direccionEntrega"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección de Entrega</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Dirección de entrega completa" {...field} className="min-h-[60px]" disabled={formFieldsGenericDisabled}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <h4 className="text-sm font-medium text-muted-foreground pt-2">Datos de Contacto</h4>
             <Separator />
            <FormField
              control={form.control}
              name="contactoNombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de Contacto</FormLabel>
                  <FormControl>
                    <Input placeholder="Persona de contacto" {...field} disabled={formFieldsGenericDisabled}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactoCorreo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo de Contacto</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@ejemplo.com" {...field} disabled={formFieldsGenericDisabled}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactoTelefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono de Contacto</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="Número de teléfono" {...field} disabled={formFieldsGenericDisabled}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <h3 className="text-md font-medium text-muted-foreground pt-4">Notas y Observaciones</h3>
            <Separator />
            <FormField
              control={form.control}
              name="observacionesAlta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones (Alta Cliente)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observaciones específicas del alta" {...field} className="min-h-[60px]" disabled={formFieldsGenericDisabled}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas Adicionales Generales</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas generales sobre el pedido o visita" {...field} className="min-h-[60px]" disabled={formFieldsGenericDisabled}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving}>
                  Cancelar
                </Button>
              </DialogClose>
              {!isReadOnly && (
                <Button type="submit" disabled={isSaving || (canEditStatusOnly && !form.formState.dirtyFields.status) || (!canEditOrderDetails && !form.formState.dirtyFields.status) }>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Cambios"
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


    