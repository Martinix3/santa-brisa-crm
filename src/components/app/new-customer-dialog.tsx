

"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account, AccountType, AccountFormValues } from "@/types";
import { Loader2 } from "lucide-react";
import { addAccountFS } from "@/services/account-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { TIPOS_CUENTA as accountTypeList } from "@ssot";

const accountFormSchema = z.object({
  name: z.string().min(2, "El nombre comercial debe tener al menos 2 caracteres."),
  legalName: z.string().optional(),
  cif: z.string().optional(),
  type: z.enum(accountTypeList as [AccountType, ...AccountType[]], { required_error: "El tipo de cuenta es obligatorio." }),
});

export type NewCustomerFormValues = z.infer<typeof accountFormSchema>;

interface NewCustomerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated: (newAccount: Account) => void;
}

export function NewCustomerDialog({ isOpen, onOpenChange, onCustomerCreated }: NewCustomerDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();
  const { refreshDataSignature } = useAuth();
  
  const form = useForm<NewCustomerFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { name: "", legalName: "", cif: "", type: "HORECA" },
  });

  const onSubmit = async (data: NewCustomerFormValues) => {
    setIsSaving(true);
    try {
      const newAccountId = await addAccountFS(data as any as AccountFormValues);
      toast({ title: "Cliente Creado", description: `Se ha creado el cliente ${data.name}.` });
      
      const newAccount: Account = {
        id: newAccountId,
        nombre: data.name,
        legalName: data.legalName,
        cif: data.cif,
        type: data.type,
        potencial: 'medio',
        status: 'Pendiente',
        leadScore: 0,
        responsableId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: data.name,
      };
      
      refreshDataSignature(); // This is the new line to trigger a global data refetch
      onCustomerCreated(newAccount);
      
    } catch(error: any) {
        toast({ title: "Error al crear cliente", description: error.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Cliente</DialogTitle>
          <DialogDescription>Introduce los datos básicos del nuevo cliente.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre Comercial</FormLabel><FormControl><Input placeholder="Ej: Bar Manolo" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="legalName" render={({ field }) => (<FormItem><FormLabel>Nombre Fiscal (Opcional)</FormLabel><FormControl><Input placeholder="Ej: Restauración Manolo S.L." {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="cif" render={({ field }) => (<FormItem><FormLabel>CIF/NIF (Opcional)</FormLabel><FormControl><Input placeholder="Identificador fiscal" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Tipo de Cuenta</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un tipo" /></SelectTrigger></FormControl><SelectContent>{accountTypeList.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Guardar Cliente"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
