

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
import type { Account, AccountType, TeamMember, AddressDetails } from "@/types";
import { accountTypeList, provincesSpainList } from "@/lib/data"; 
import { Loader2 } from "lucide-react";
import { Separator } from "../ui/separator";
import { getTeamMembersFS } from "@/services/team-member-service";


const NO_SALES_REP_VALUE = "##NONE##";

const accountFormSchemaBase = z.object({
  name: z.string().min(2, "El nombre comercial debe tener al menos 2 caracteres."),
  legalName: z.string().optional(),
  cif: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true; // Optional, so it's valid if empty
    const cifRegex = /^([A-Z]{1}|[0-9]{1})[0-9]{7}[A-Z0-9]{1}$/i;
    return cifRegex.test(val);
  }, {
    message: "Formato de CIF/NIF no válido. Use 1 letra, 7 números y 1 carácter de control.",
  }),
  type: z.enum(accountTypeList as [AccountType, ...AccountType[]], { required_error: "El tipo de cuenta es obligatorio." }),
  iban: z.string().optional(),
  
  // Campos de dirección de facturación desglosados
  addressBilling_street: z.string().optional(),
  addressBilling_number: z.string().optional(),
  addressBilling_city: z.string().optional(),
  addressBilling_province: z.string().optional(),
  addressBilling_postalCode: z.string().optional(),
  addressBilling_country: z.string().optional().default("España"),

  // Campos de dirección de envío desglosados
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
  // Validación para dirección de facturación si algún campo está relleno
  const billingFields = [data.addressBilling_street, data.addressBilling_city, data.addressBilling_province, data.addressBilling_postalCode];
  const someBillingFieldFilled = billingFields.some(field => field && field.trim() !== "");
  if (someBillingFieldFilled) {
    if (!data.addressBilling_street?.trim()) ctx.addIssue({ path: ["addressBilling_street"], message: "Calle es obligatoria si se rellena la dirección." });
    if (!data.addressBilling_city?.trim()) ctx.addIssue({ path: ["addressBilling_city"], message: "Ciudad es obligatoria si se rellena la dirección." });
    if (!data.addressBilling_province?.trim()) ctx.addIssue({ path: ["addressBilling_province"], message: "Provincia es obligatoria si se rellena la dirección." });
    if (!data.addressBilling_postalCode?.trim()) ctx.addIssue({ path: ["addressBilling_postalCode"], message: "Código postal es obligatorio si se rellena la dirección." });
  }

  // Validación para dirección de envío si algún campo está relleno
  const shippingFields = [data.addressShipping_street, data.addressShipping_city, data.addressShipping_province, data.addressShipping_postalCode];
  const someShippingFieldFilled = shippingFields.some(field => field && field.trim() !== "");
  if (someShippingFieldFilled) {
    if (!data.addressShipping_street?.trim()) ctx.addIssue({ path: ["addressShipping_street"], message: "Calle es obligatoria si se rellena la dirección." });
    if (!data.addressShipping_city?.trim()) ctx.addIssue({ path: ["addressShipping_city"], message: "Ciudad es obligatoria si se rellena la dirección." });
    if (!data.addressShipping_province?.trim()) ctx.addIssue({ path: ["addressShipping_province"], message: "Provincia es obligatoria si se rellena la dirección." });
    if (!data.addressShipping_postalCode?.trim()) ctx.addIssue({ path: ["addressShipping_postalCode"], message: "Código postal es obligatorio si se rellena la dirección." });
  }
});


export type AccountFormValues = z.infer<typeof accountFormSchemaBase>;

interface AccountDialogProps {
  account: Account | null; 
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: AccountFormValues) => void; 
  allAccounts: Account[]; 
  isReadOnly?: boolean;
}

export default function AccountDialog({ account, isOpen, onOpenChange, onSave, allAccounts, isReadOnly = false }: AccountDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [salesRepList, setSalesRepList] = React.useState<TeamMember[]>([]);
  
  const accountFormSchema = React.useMemo(() => {
    return accountFormSchemaBase.refine(
      (data) => {
        if (!data.cif) return true; 
        const existingAccountWithCif = allAccounts.find(
          (acc) => acc.cif && acc.cif.toLowerCase() === data.cif!.toLowerCase() && acc.id !== account?.id
        );
        return !existingAccountWithCif;
      },
      {
        message: "Ya existe otra cuenta con este CIF/NIF.",
        path: ["cif"],
      }
    );
  }, [allAccounts, account?.id]);


  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: "", legalName: "", cif: "", type: undefined, iban: "",
      addressBilling_street: "", addressBilling_number: "", addressBilling_city: "", addressBilling_province: "", addressBilling_postalCode: "", addressBilling_country: "España",
      addressShipping_street: "", addressShipping_number: "", addressShipping_city: "", addressShipping_province: "", addressShipping_postalCode: "", addressShipping_country: "España",
      mainContactName: "", mainContactEmail: "", mainContactPhone: "", notes: "", internalNotes: "", salesRepId: NO_SALES_REP_VALUE,
    },
  });

  React.useEffect(() => {
    async function loadSalesReps() {
      try {
        const reps = await getTeamMembersFS(['SalesRep', 'Admin']);
        setSalesRepList(reps);
      } catch (error) {
        console.error("Failed to load sales reps for account dialog", error);
      }
    }
    if (isOpen) {
      loadSalesReps();
      if (account) {
        form.reset({
          name: account.nombre,
          legalName: account.legalName || "", 
          cif: account.cif || "", 
          type: account.type, 
          iban: account.iban || "",
          addressBilling_street: account.addressBilling?.street || "",
          addressBilling_number: account.addressBilling?.number || "",
          addressBilling_city: account.addressBilling?.city || "",
          addressBilling_province: account.addressBilling?.province || "",
          addressBilling_postalCode: account.addressBilling?.postalCode || "",
          addressBilling_country: account.addressBilling?.country || "España",
          addressShipping_street: account.addressShipping?.street || "",
          addressShipping_number: account.addressShipping?.number || "",
          addressShipping_city: account.addressShipping?.city || "",
          addressShipping_province: account.addressShipping?.province || "",
          addressShipping_postalCode: account.addressShipping?.postalCode || "",
          addressShipping_country: account.addressShipping?.country || "España",
          mainContactName: account.mainContactName || "", 
          mainContactEmail: account.mainContactEmail || "",
          mainContactPhone: account.mainContactPhone || "", 
          notes: account.notes || "",
          internalNotes: account.internalNotes || "",
          salesRepId: account.salesRepId || NO_SALES_REP_VALUE,
        });
      } else {
        form.reset({ 
          name: "", legalName: "", cif: "", type: undefined, iban: "",
          addressBilling_street: "", addressBilling_number: "", addressBilling_city: "", addressBilling_province: "", addressBilling_postalCode: "", addressBilling_country: "España",
          addressShipping_street: "", addressShipping_number: "", addressShipping_city: "", addressShipping_province: "", addressShipping_postalCode: "", addressShipping_country: "España",
          mainContactName: "", mainContactEmail: "", mainContactPhone: "", 
          notes: "", internalNotes: "", salesRepId: NO_SALES_REP_VALUE,
        });
      }
    }
  }, [account, isOpen, form]);

  const onSubmit = async (data: AccountFormValues) => {
    if (isReadOnly) return;
    setIsSaving(true);
    
    const dataToSave = { ...data };
    if (dataToSave.salesRepId === NO_SALES_REP_VALUE) {
      dataToSave.salesRepId = undefined; 
    }

    await new Promise(resolve => setTimeout(resolve, 500)); 
    onSave(dataToSave); 
    setIsSaving(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? "Detalles de la Cuenta" : (account ? "Editar Cuenta" : "Añadir Nueva Cuenta")}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? `Viendo detalles de ${account?.nombre}.` : (account ? "Modifica los detalles de la cuenta." : "Introduce la información de la nueva cuenta.")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre Comercial</FormLabel><FormControl><Input placeholder="Ej: Bar Manolo" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="legalName" render={({ field }) => (<FormItem><FormLabel>Nombre Fiscal (Opcional)</FormLabel><FormControl><Input placeholder="Ej: Restauración Manolo S.L." {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="cif" render={({ field }) => (<FormItem><FormLabel>CIF/NIF (Opcional)</FormLabel><FormControl><Input placeholder="Identificador fiscal" {...field} value={field.value ?? ""} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Tipo de Cuenta</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un tipo" /></SelectTrigger></FormControl><SelectContent>{accountTypeList.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            </div>
            
            <Separator className="my-4"/><h3 className="text-md font-medium text-muted-foreground">Datos Financieros</h3>
            <FormField control={form.control} name="iban" render={({ field }) => (<FormItem><FormLabel>IBAN (Opcional)</FormLabel><FormControl><Input placeholder="ES00 0000 0000 0000 0000 0000" {...field} value={field.value ?? ""} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />


            <Separator className="my-4"/><h3 className="text-md font-medium text-muted-foreground">Dirección Fiscal/Facturación (Opcional)</h3>
            <FormField control={form.control} name="addressBilling_street" render={({ field }) => (<FormItem><FormLabel>Calle</FormLabel><FormControl><Input placeholder="Ej: Calle Mayor" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField control={form.control} name="addressBilling_number" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input placeholder="Ej: 123" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="addressBilling_postalCode" render={({ field }) => (<FormItem><FormLabel>Cód. Postal</FormLabel><FormControl><Input placeholder="Ej: 28001" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="addressBilling_city" render={({ field }) => (<FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input placeholder="Ej: Madrid" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="addressBilling_province" render={({ field }) => (<FormItem><FormLabel>Provincia</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger></FormControl><SelectContent>{provincesSpainList.map(prov => (<SelectItem key={prov} value={prov}>{prov}</SelectItem>))}</SelectContent></Select>
              <FormMessage /></FormItem>)} />
            </div>
             <FormField control={form.control} name="addressBilling_country" render={({ field }) => (<FormItem><FormLabel>País</FormLabel><FormControl><Input placeholder="Ej: España" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />


            <Separator className="my-4"/><h3 className="text-md font-medium text-muted-foreground">Dirección de Entrega Principal (Opcional)</h3>
            <FormField control={form.control} name="addressShipping_street" render={({ field }) => (<FormItem><FormLabel>Calle</FormLabel><FormControl><Input placeholder="Ej: Calle Secundaria" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField control={form.control} name="addressShipping_number" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input placeholder="Ej: 45" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="addressShipping_postalCode" render={({ field }) => (<FormItem><FormLabel>Cód. Postal</FormLabel><FormControl><Input placeholder="Ej: 08001" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="addressShipping_city" render={({ field }) => (<FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input placeholder="Ej: Barcelona" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="addressShipping_province" render={({ field }) => (<FormItem><FormLabel>Provincia</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger></FormControl><SelectContent>{provincesSpainList.map(prov => (<SelectItem key={prov} value={prov}>{prov}</SelectItem>))}</SelectContent></Select>
              <FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="addressShipping_country" render={({ field }) => (<FormItem><FormLabel>País</FormLabel><FormControl><Input placeholder="Ej: España" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />

            <Separator className="my-4"/><h3 className="text-md font-medium text-muted-foreground">Contacto Principal (Opcional)</h3>
            <FormField control={form.control} name="mainContactName" render={({ field }) => (<FormItem><FormLabel>Nombre del Contacto</FormLabel><FormControl><Input placeholder="Ej: María López" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="mainContactEmail" render={({ field }) => (<FormItem><FormLabel>Email del Contacto</FormLabel><FormControl><Input type="email" placeholder="contacto@ejemplo.com" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="mainContactPhone" render={({ field }) => (<FormItem><FormLabel>Teléfono del Contacto</FormLabel><FormControl><Input type="tel" placeholder="+34 600 000 000" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <Separator className="my-4"/>
             <FormField control={form.control} name="salesRepId" render={({ field }) => (<FormItem><FormLabel>Representante Asignado (Opcional)</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly || salesRepList.length === 0}><FormControl><SelectTrigger><SelectValue placeholder={salesRepList.length === 0 ? "Cargando..." : "Seleccionar representante"} /></SelectTrigger></FormControl><SelectContent><SelectItem value={NO_SALES_REP_VALUE}>Sin asignar</SelectItem>{salesRepList.map(rep => (<SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas Adicionales (Opcional)</FormLabel><FormControl><Textarea placeholder="Cualquier información relevante sobre la cuenta..." {...field} disabled={isReadOnly} className="min-h-[80px]" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="internalNotes" render={({ field }) => (<FormItem><FormLabel>Notas Internas (Equipo)</FormLabel><FormControl><Textarea placeholder="Información adicional visible solo para el equipo..." {...field} disabled={isReadOnly} className="min-h-[80px]" /></FormControl><FormMessage /></FormItem>)} />

            <DialogFooter className="pt-6">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving && !isReadOnly}>{isReadOnly ? "Cerrar" : "Cancelar"}</Button></DialogClose>
              {!isReadOnly && (<Button type="submit" disabled={isSaving || (!form.formState.isDirty && !!account )}>{isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : (account ? "Guardar Cambios" : "Añadir Cuenta")}</Button>)}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
