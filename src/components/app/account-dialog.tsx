
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
import type { Account, AccountType, AccountStatus } from "@/types";
import { accountTypeList, accountStatusList, mockTeamMembers } from "@/lib/data";
import { Loader2 } from "lucide-react";
import { Separator } from "../ui/separator";

const NO_SALES_REP_VALUE = "##NONE##"; // Special value for "Sin asignar"

const accountFormSchema = z.object({
  name: z.string().min(2, "El nombre comercial debe tener al menos 2 caracteres."),
  legalName: z.string().optional(),
  cif: z.string().min(5, "El CIF/NIF debe tener al menos 5 caracteres."),
  type: z.enum(accountTypeList as [AccountType, ...AccountType[]], { required_error: "El tipo de cuenta es obligatorio." }),
  status: z.enum(accountStatusList as [AccountStatus, ...AccountStatus[]], { required_error: "El estado de la cuenta es obligatorio." }),
  addressBilling: z.string().optional(),
  addressShipping: z.string().optional(),
  mainContactName: z.string().optional(),
  mainContactEmail: z.string().email("Formato de correo inválido.").optional().or(z.literal("")),
  mainContactPhone: z.string().optional(),
  notes: z.string().optional(),
  salesRepId: z.string().optional(), // This will hold either a real ID or NO_SALES_REP_VALUE in the form
});

export type AccountFormValues = z.infer<typeof accountFormSchema>;

interface AccountDialogProps {
  account: Account | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: AccountFormValues) => void; // The onSave expects salesRepId as string | undefined
  allAccounts: Account[]; // For CIF uniqueness check
  isReadOnly?: boolean;
}

export default function AccountDialog({ account, isOpen, onOpenChange, onSave, allAccounts, isReadOnly = false }: AccountDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema.refine(
      (data) => {
        if (!data.cif) return true;
        const existingAccountWithCif = allAccounts.find(
          (acc) => acc.cif.toLowerCase() === data.cif.toLowerCase() && acc.id !== account?.id
        );
        return !existingAccountWithCif;
      },
      {
        message: "Ya existe una cuenta con este CIF/NIF.",
        path: ["cif"],
      }
    )),
    defaultValues: {
      name: "",
      legalName: "",
      cif: "",
      type: undefined,
      status: "Potencial",
      addressBilling: "",
      addressShipping: "",
      mainContactName: "",
      mainContactEmail: "",
      mainContactPhone: "",
      notes: "",
      salesRepId: NO_SALES_REP_VALUE, // Default to "Sin asignar"
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (account) {
        form.reset({
          name: account.name,
          legalName: account.legalName || "",
          cif: account.cif,
          type: account.type,
          status: account.status,
          addressBilling: account.addressBilling || "",
          addressShipping: account.addressShipping || "",
          mainContactName: account.mainContactName || "",
          mainContactEmail: account.mainContactEmail || "",
          mainContactPhone: account.mainContactPhone || "",
          notes: account.notes || "",
          salesRepId: account.salesRepId || NO_SALES_REP_VALUE,
        });
      } else {
        form.reset({ 
          name: "",
          legalName: "",
          cif: "",
          type: undefined,
          status: "Potencial",
          addressBilling: "",
          addressShipping: "",
          mainContactName: "",
          mainContactEmail: "",
          mainContactPhone: "",
          notes: "",
          salesRepId: NO_SALES_REP_VALUE,
        });
      }
    }
  }, [account, isOpen, form]);

  const onSubmit = async (data: AccountFormValues) => {
    if (isReadOnly) return;
    setIsSaving(true);
    
    const dataToSave = { ...data };
    if (dataToSave.salesRepId === NO_SALES_REP_VALUE) {
      dataToSave.salesRepId = undefined; // Convert back for saving
    }

    await new Promise(resolve => setTimeout(resolve, 500)); 
    onSave(dataToSave); // Pass the processed data
    setIsSaving(false);
  };
  
  const salesRepList = mockTeamMembers.filter(member => member.role === 'SalesRep' || member.role === 'Admin');


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? "Detalles de la Cuenta" : (account ? "Editar Cuenta" : "Añadir Nueva Cuenta")}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? `Viendo detalles de ${account?.name}.` : (account ? "Modifica los detalles de la cuenta." : "Introduce la información de la nueva cuenta.")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nombre Comercial</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej: Bar Manolo" {...field} disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="legalName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nombre Fiscal (Opcional)</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej: Restauración Manolo S.L." {...field} disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <FormField
              control={form.control}
              name="cif"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CIF/NIF</FormLabel>
                  <FormControl>
                    <Input placeholder="Identificador fiscal" {...field} disabled={isReadOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tipo de Cuenta</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione un tipo" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {accountTypeList.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Estado de la Cuenta</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione un estado" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {accountStatusList.map(status => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <Separator className="my-4"/>
            <h3 className="text-md font-medium text-muted-foreground">Direcciones</h3>

            <FormField
              control={form.control}
              name="addressBilling"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección Fiscal/Facturación (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Calle, número, ciudad, CP, provincia..." {...field} disabled={isReadOnly} className="min-h-[60px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="addressShipping"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección de Entrega Principal (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Calle, número, ciudad, CP, provincia..." {...field} disabled={isReadOnly} className="min-h-[60px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Separator className="my-4"/>
            <h3 className="text-md font-medium text-muted-foreground">Contacto Principal</h3>

            <FormField
              control={form.control}
              name="mainContactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Contacto (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: María López" {...field} disabled={isReadOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="mainContactEmail"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Email del Contacto (Opcional)</FormLabel>
                    <FormControl>
                        <Input type="email" placeholder="contacto@ejemplo.com" {...field} disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="mainContactPhone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Teléfono del Contacto (Opcional)</FormLabel>
                    <FormControl>
                        <Input type="tel" placeholder="+34 600 000 000" {...field} disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <Separator className="my-4"/>
             <FormField
              control={form.control}
              name="salesRepId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Representante Asignado (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar representante" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_SALES_REP_VALUE}>Sin asignar</SelectItem>
                      {salesRepList.map(rep => (
                        <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas Adicionales (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Cualquier información relevante sobre la cuenta..." {...field} disabled={isReadOnly} className="min-h-[80px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving && !isReadOnly}>
                  {isReadOnly ? "Cerrar" : "Cancelar"}
                </Button>
              </DialogClose>
              {!isReadOnly && (
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    account ? "Guardar Cambios" : "Añadir Cuenta"
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

