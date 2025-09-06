
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
import type { Supplier, SupplierFormValues } from "@/types";
import { provincesSpainList } from "@/lib/data"; 
import { Loader2 } from "lucide-react";
import { Separator } from "../ui/separator";

const supplierFormSchema = z.object({
  name: z.string().min(2, "El nombre del proveedor debe tener al menos 2 caracteres."),
  code: z.string().length(3, "El código debe tener 3 caracteres.").regex(/^[A-Z0-9]+$/i, "Solo letras y números.").transform(v => v.toUpperCase()),
  cif: z.string().optional(),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_city: z.string().optional(),
  address_province: z.string().optional(),
  address_postalCode: z.string().optional(),
  address_country: z.string().optional().default("España"),
  contactName: z.string().optional(),
  contactEmail: z.string().email("Formato de correo inválido.").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  notes: z.string().optional(),
});

interface SupplierDialogProps {
  supplier: Supplier | null; 
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: SupplierFormValues) => Promise<any>; 
  isReadOnly?: boolean;
}

export default function SupplierDialog({ supplier, isOpen, onOpenChange, onSave, isReadOnly = false }: SupplierDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "", code: "", cif: "", notes: "", contactName: "", contactEmail: "", contactPhone: "",
      address_street: "", address_number: "", address_city: "", address_province: "", address_postalCode: "", address_country: "España",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (supplier) {
        form.reset({
          name: supplier.name,
          code: supplier.code || "",
          cif: supplier.cif || "",
          notes: supplier.notes || "",
          contactName: supplier.contactName || "",
          contactEmail: supplier.contactEmail || "",
          contactPhone: supplier.contactPhone || "",
          address_street: supplier.address?.street || "",
          address_number: supplier.address?.number || "",
          address_city: supplier.address?.city || "",
          address_province: supplier.address?.province || "",
          address_postalCode: supplier.address?.postalCode || "",
          address_country: supplier.address?.country || "España",
        });
      } else {
        form.reset({
          name: "", code: "", cif: "", notes: "", contactName: "", contactEmail: "", contactPhone: "",
          address_street: "", address_number: "", address_city: "", address_province: "", address_postalCode: "", address_country: "España",
        });
      }
    }
  }, [supplier, isOpen, form]);

  const onSubmit = async (data: SupplierFormValues) => {
    if (isReadOnly) return;
    setIsSaving(true);
    await onSave(data); 
    setIsSaving(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? "Detalles del Proveedor" : (supplier ? "Editar Proveedor" : "Añadir Nuevo Proveedor")}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? `Viendo detalles de ${supplier?.name}.` : "Introduce la información del proveedor."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Ej: Tequilas del Agave S.A." {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Código (3 Letras/Números)</FormLabel><FormControl><Input placeholder="Ej: TEQ" {...field} value={field.value ?? ""} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
            </div>
             <FormField control={form.control} name="cif" render={({ field }) => (<FormItem><FormLabel>CIF/NIF (Opcional)</FormLabel><FormControl><Input placeholder="Identificador fiscal" {...field} value={field.value ?? ''} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />

            <Separator className="my-4"/><h3 className="text-md font-medium text-muted-foreground">Dirección (Opcional)</h3>
            <FormField control={form.control} name="address_street" render={({ field }) => (<FormItem><FormLabel>Calle</FormLabel><FormControl><Input placeholder="Ej: Av. de la Industria" {...field} value={field.value ?? ''} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField control={form.control} name="address_number" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input placeholder="Ej: 42" {...field} value={field.value ?? ''} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="address_postalCode" render={({ field }) => (<FormItem><FormLabel>Cód. Postal</FormLabel><FormControl><Input placeholder="Ej: 28108" {...field} value={field.value ?? ''} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="address_city" render={({ field }) => (<FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input placeholder="Ej: Alcobendas" {...field} value={field.value ?? ''} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="address_province" render={({ field }) => (<FormItem><FormLabel>Provincia</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger></FormControl><SelectContent>{provincesSpainList.map(prov => (<SelectItem key={prov} value={prov}>{prov}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="address_country" render={({ field }) => (<FormItem><FormLabel>País</FormLabel><FormControl><Input placeholder="Ej: España" {...field} value={field.value ?? ''} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />

            <Separator className="my-4"/><h3 className="text-md font-medium text-muted-foreground">Contacto Principal (Opcional)</h3>
            <FormField control={form.control} name="contactName" render={({ field }) => (<FormItem><FormLabel>Nombre del Contacto</FormLabel><FormControl><Input placeholder="Ej: Juan Pérez" {...field} value={field.value ?? ''} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="contactEmail" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="juan.perez@proveedor.com" {...field} value={field.value ?? ''} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="contactPhone" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input type="tel" placeholder="+34 91 000 00 00" {...field} value={field.value ?? ''} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <Separator className="my-4"/>

            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas Adicionales (Opcional)</FormLabel><FormControl><Textarea placeholder="Cualquier información relevante sobre el proveedor..." {...field} value={field.value ?? ''} disabled={isReadOnly} className="min-h-[80px]" /></FormControl><FormMessage /></FormItem>)} />

            <DialogFooter className="pt-6">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving && !isReadOnly}>{isReadOnly ? "Cerrar" : "Cancelar"}</Button></DialogClose>
              {!isReadOnly && (<Button type="submit" disabled={isSaving || (!form.formState.isDirty && !!supplier )}>{isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : (supplier ? "Guardar Cambios" : "Añadir Proveedor")}</Button>)}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
