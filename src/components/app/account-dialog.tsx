
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
import type { Account, TeamMember } from "@/types";
import { TIPOS_CUENTA, PROVINCIAS_ES, type TipoCuenta } from "@ssot";
import { Loader2, Truck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { accountToForm, formToAccountPartial } from "@/services/account-mapper";

const NO_SALES_REP_VALUE = "##NONE##";

const B2B_TYPES = ["Distribuidor", "Importador"] as const;
type B2BType = typeof B2B_TYPES[number];
const isB2B = (t?: TipoCuenta | null): t is B2BType =>
  !!t && (B2B_TYPES as readonly string[]).includes(t as string);

const accountFormSchemaBase = z.object({
  name: z.string().min(2, "El nombre comercial debe tener al menos 2 caracteres."),
  legalName: z.string().optional(),
  cif: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true; // Optional, so it's valid if empty
        const cifRegex = /^([A-Z]{1}|[0-9]{1})[0-9]{7}[A-Z0-9]{1}$/i;
        return cifRegex.test(val);
      },
      {
        message: "Formato de CIF/NIF no válido. Use 1 letra, 7 números y 1 carácter de control.",
      }
    ),
  type: z.enum(TIPOS_CUENTA as [TipoCuenta, ...TipoCuenta[]], {
    required_error: "El tipo de cuenta es obligatorio.",
  }),
  iban: z.string().optional(),
  distributorId: z.string().optional(),
  addressBilling_street: z.string().optional(),
  addressBilling_number: z.string().optional(),
  addressBilling_city: z.string().optional(),
  addressBilling_province: z.string().optional(),
  addressBilling_postalCode: z.string().optional(),
  addressBilling_country: z.string().optional().default("España"),
  addressShipping_street: z.string().optional(),
  addressShipping_number: z.string().optional(),
  addressShipping_city: z.string().optional(),
  addressShipping_province: z.string().optional(),
  addressShipping_postalCode: z.string().optional(),
  addressShipping_country: z.string().optional().default("España"),
  mainContactName: z.string().optional(),
  mainContactEmail: z.string().email("Formato de correo inválido.").optional().or(z.literal("")),
  mainContactPhone: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  salesRepId: z.string().optional(),
}).superRefine((data, ctx) => {
  const billingFields = [
    data.addressBilling_street, data.addressBilling_city,
    data.addressBilling_province, data.addressBilling_postalCode,
  ];
  const someBillingFieldFilled = billingFields.some((field) => field && field.trim() !== "");
  if (someBillingFieldFilled) {
    if (!data.addressBilling_street?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["addressBilling_street"], message: "Calle es obligatoria." });
    if (!data.addressBilling_city?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["addressBilling_city"], message: "Ciudad es obligatoria." });
    if (!data.addressBilling_province?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["addressBilling_province"], message: "Provincia es obligatoria." });
    if (!data.addressBilling_postalCode?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["addressBilling_postalCode"], message: "Código postal es obligatorio." });
  }

  const shippingFields = [
    data.addressShipping_street, data.addressShipping_city,
    data.addressShipping_province, data.addressShipping_postalCode,
  ];
  const someShippingFieldFilled = shippingFields.some((field) => field && field.trim() !== "");
  if (someShippingFieldFilled) {
    if (!data.addressShipping_street?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["addressShipping_street"], message: "Calle de entrega es obligatoria." });
    if (!data.addressShipping_city?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["addressShipping_city"], message: "Ciudad de entrega es obligatoria." });
    if (!data.addressShipping_province?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["addressShipping_province"], message: "Provincia de entrega es obligatoria." });
    if (!data.addressShipping_postalCode?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["addressShipping_postalCode"], message: "Código postal de entrega es obligatoria." });
  }
});

// We define the form values type directly from the schema
export type AccountFormValues = z.infer<typeof accountFormSchemaBase>;


interface AccountDialogProps {
  account: Account | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Account>) => void;
  allAccounts: Account[];
  allTeamMembers: TeamMember[];
  isReadOnly?: boolean;
}

export default function AccountDialog({
  account,
  isOpen,
  onOpenChange,
  onSave,
  allAccounts,
  allTeamMembers,
  isReadOnly = false,
}: AccountDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  
  const salesRepList = React.useMemo(() => 
    allTeamMembers.filter(m => m.role === 'Ventas' || m.role === 'Admin' || m.role === 'Manager'),
    [allTeamMembers]
  );
  const distributors = React.useMemo(() => 
    allAccounts.filter(a => isB2B(a.type)),
    [allAccounts]
  );


  const accountFormSchema = React.useMemo(() => {
    return accountFormSchemaBase.refine(
      (data) => {
        if (!data.cif || data.cif.trim() === "") return true;
        const cifToCompare = data.cif.toLowerCase();
        const existingAccountWithCif = allAccounts.find(
          (acc) => acc.cif && acc.cif.toLowerCase() === cifToCompare && acc.id !== account?.id
        );
        return !existingAccountWithCif;
      },
      { message: "Ya existe otra cuenta con este CIF/NIF.", path: ["cif"] }
    );
  }, [allAccounts, account?.id]);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: accountToForm({} as Account)
  });

  const accountType = form.watch("type");
  const showDistributorField = !!accountType && !isB2B(accountType);

  React.useEffect(() => {
    if (!isOpen) return;
    if (account) {
      form.reset(accountToForm(account));
    } else {
      form.reset(accountToForm({} as Account));
    }
  }, [isOpen, account, form]);

  const onSubmit = async (data: AccountFormValues) => {
    if (isReadOnly) return;
    setIsSaving(true);
    try {
      const patch = formToAccountPartial(data);
      await onSave(patch);
    } catch (e) {
      // Error is handled by the parent
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-lg">
            {isReadOnly ? "Detalles de la Cuenta" : account ? "Editar Cuenta" : "Añadir Nueva Cuenta"}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            {isReadOnly
              ? `Viendo detalles de ${account?.name}.`
              : account
              ? "Modifica los detalles de la cuenta."
              : "Introduce la información de la nueva cuenta."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4">
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre Comercial</FormLabel><FormControl><Input placeholder="Ej: Bar Manolo" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="legalName" render={({ field }) => (<FormItem><FormLabel>Nombre Fiscal</FormLabel><FormControl><Input placeholder="Ej: Restauración Manolo S.L." {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="cif" render={({ field }) => (<FormItem><FormLabel>CIF/NIF</FormLabel><FormControl><Input placeholder="Identificador fiscal" {...field} value={field.value ?? ""} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Tipo de Cuenta</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un tipo" /></SelectTrigger></FormControl><SelectContent>{(TIPOS_CUENTA as readonly string[]).map((type: string) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              </div>
            </div>
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="text-sm font-semibold text-zinc-600">Datos Financieros y Logísticos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="iban" render={({ field }) => (<FormItem><FormLabel>IBAN</FormLabel><FormControl><Input placeholder="ES00..." {...field} value={field.value ?? ""} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                {showDistributorField && (
                  <FormField control={form.control} name="distributorId" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-zinc-500" />Distribuidor</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="">Venta Directa (Gestiona Santa Brisa)</SelectItem><Separator />{distributors.map((d: Account) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="text-sm font-semibold text-zinc-600">Dirección de Facturación</h3>
                <FormField control={form.control} name="addressBilling_street" render={({ field }) => (<FormItem><FormLabel>Calle</FormLabel><FormControl><Input {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="addressBilling_postalCode" render={({ field }) => (<FormItem><FormLabel>C. Postal</FormLabel><FormControl><Input {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="addressBilling_city" render={({ field }) => (<FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="addressBilling_province" render={({ field }) => (<FormItem><FormLabel>Provincia</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl><SelectContent>{(PROVINCIAS_ES as readonly string[]).map((p: string) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              </div>
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="text-sm font-semibold text-zinc-600">Dirección de Envío</h3>
                <FormField control={form.control} name="addressShipping_street" render={({ field }) => (<FormItem><FormLabel>Calle</FormLabel><FormControl><Input {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="addressShipping_postalCode" render={({ field }) => (<FormItem><FormLabel>C. Postal</FormLabel><FormControl><Input {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="addressShipping_city" render={({ field }) => (<FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="addressShipping_province" render={({ field }) => (<FormItem><FormLabel>Provincia</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl><SelectContent>{(PROVINCIAS_ES as readonly string[]).map((p: string) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              </div>
            </div>
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="text-sm font-semibold text-zinc-600">Contacto y Notas</h3>
              <FormField control={form.control} name="mainContactName" render={({ field }) => (<FormItem><FormLabel>Nombre del Contacto</FormLabel><FormControl><Input {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="mainContactEmail" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ""} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="mainContactPhone" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input type="tel" {...field} value={field.value ?? ""} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="salesRepId" render={({ field }) => (<FormItem><FormLabel>Representante Asignado</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent><SelectItem value={NO_SALES_REP_VALUE}>Sin asignar</SelectItem>{salesRepList.map((rep) => (<SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="internalNotes" render={({ field }) => (<FormItem><FormLabel>Notas Internas (Equipo)</FormLabel><FormControl><Textarea {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <DialogFooter className="pt-6">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving && !isReadOnly}>{isReadOnly ? "Cerrar" : "Cancelar"}</Button></DialogClose>
              {!isReadOnly && (<Button type="submit" disabled={isSaving || (!form.formState.isDirty && !!account)}>{isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>) : account ? "Guardar Cambios" : "Añadir Cuenta"}</Button>)}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    