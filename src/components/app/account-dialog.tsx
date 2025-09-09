
"use client";

import * as React from "react";
import { useEffect } from "react";
import { useForm } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Building2, UserRound, Link2, MapPin, Tag, PlusCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import type { TeamMember, Account } from "@/types";
import { TIPOS_CUENTA_VALUES, type TipoCuenta, OWNERSHIP_OPTIONS } from "@ssot";
import { useToast } from "@/hooks/use-toast";
import { accountToForm, formToAccountPartial } from "@/services/account-mapper";
import type { AccountFormValues } from "@/lib/schemas/account-schema";
import { accountSchema } from "@/lib/schemas/account-schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";


/** Helpers de estilo Santa Brisa (resumen) */
const hexToRgba = (hex: string, a: number) => {
  const h = hex.replace('#','');
  const f = h.length === 3 ? h.split('').map(c=>c+c).join('') : h;
  const n = parseInt(f,16); const r=(n>>16)&255, g=(n>>8)&255, b=n&255; return `rgba(${r},${g},${b},${a})`;
};
const waterHeader = (seed = "hdr", base = "#F7D15F") => {
  let a = Array.from(seed).reduce((s,c)=> (s*33+c.charCodeAt(0))>>>0,5381) || 1;
  const rnd = ()=> (a = (a*1664525+1013904223)>>>0, (a>>>8)/16777216);
  const L:string[]=[]; const blobs=4;
  for(let i=0;i<blobs;i++){
    const x = (i%2? 80+ rnd()*18 : rnd()*18).toFixed(2);
    const y = (rnd()*70+15).toFixed(2);
    const rx = 100 + rnd()*120, ry = 60 + rnd()*120;
    const a1 = 0.06 + rnd()*0.06; const a2 = a1*0.5; const s1=45+rnd()*10, s2=70+rnd()*12;
    L.push(`radial-gradient(${rx}px ${ry}px at ${x}% ${y}%, ${hexToRgba(base,a1)}, ${hexToRgba(base,a2)} ${s1}%, rgba(255,255,255,0) ${s2}%)`);
  }
  L.push(`linear-gradient(to bottom, ${hexToRgba(base,0.08)}, rgba(255,255,255,0.02))`);
  return L.join(',');
};


export function AccountForm({
  onSubmit,
  onCancel,
  defaultValues,
  teamMembers,
  distributors,
  parentAccounts,
  isSaving,
  isReadOnly,
}: {
  onSubmit: (data: AccountFormValues) => Promise<void> | void;
  onCancel?: () => void;
  defaultValues?: Partial<AccountFormValues>;
  teamMembers?: TeamMember[];
  distributors?: Array<{ id: string; name: string }>;
  parentAccounts?: Array<{ id: string; name: string }>;
  isSaving: boolean;
  isReadOnly?: boolean;
}) {
  const { user } = useAuth();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      type: "HORECA",
      ownership: 'propio',
      ...defaultValues,
    },
  });

  useEffect(() => {
    form.reset({
      name: "",
      type: "HORECA",
      ownership: 'propio',
      ...defaultValues,
    });
  }, [defaultValues, form]);


  return (
    <Form {...form}>
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (data) => {
        await onSubmit(data);
      })}
    >
        <div className="space-y-4 p-4 border rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre Comercial</FormLabel><FormControl><Input placeholder="Ej: Bar Manolo" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="legalName" render={({ field }) => (<FormItem><FormLabel>Nombre Fiscal</FormLabel><FormControl><Input placeholder="Ej: Restauración Manolo S.L." {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="cif" render={({ field }) => (<FormItem><FormLabel>CIF/NIF</FormLabel><FormControl><Input placeholder="Ej: B12345678" {...field} value={field.value ?? ""} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Tipo de Cuenta</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{(OPCIONES_TIPO_CUENTA ?? []).map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="ownership" render={({ field }) => (<FormItem><FormLabel>Vinculada a</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{(OWNERSHIP_OPTIONS ?? []).map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            {form.watch('ownership') === 'distribuidor' && (
                <FormField control={form.control} name="distributorId" render={({ field }) => (<FormItem><FormLabel>Distribuidor</FormLabel><Select onValueChange={field.onChange} value={field.value ?? "##DIRECT##"} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="##DIRECT##">Venta Directa (Gestiona Santa Brisa)</SelectItem>{(distributors ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            )}
            </div>
        </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
        )}
        <Button type="submit" disabled={isSaving || !form.formState.isDirty} className="bg-[var(--sb-primary)] text-zinc-900 hover:brightness-95">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar
        </Button>
      </div>
    </form>
    </Form>
  );
}

interface AccountDialogProps {
  account: Partial<Account> | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Account>) => void;
  allAccounts?: Account[];
  allTeamMembers?: TeamMember[];
  isReadOnly?: boolean;
}

export default function AccountDialog({
  account,
  isOpen,
  onOpenChange,
  onSave,
  allAccounts = [],
  allTeamMembers = [],
  isReadOnly = false,
}: AccountDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: AccountFormValues) => {
    if (isReadOnly) return;
    setIsSaving(true);
    try {
      const { id, ...formData } = data;
      const patch = formToAccountPartial(formData);
      await onSave({ ...patch, id: account?.id });
    } catch (e: any) {
        toast({
            title: "Error al guardar",
            description: e.message,
            variant: "destructive"
        })
    } finally {
      setIsSaving(false);
    }
  };
  
  const distributors = React.useMemo(() => {
    return allAccounts.filter(a => a.accountType === "DISTRIBUIDOR" || a.accountType === "IMPORTADOR").map(a => ({ id: a.id, name: a.name }));
  }, [allAccounts]);
  
  const parentAccounts = React.useMemo(() => {
    return allAccounts.map(a => ({ id: a.id, name: a.name }));
  }, [allAccounts]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-0">
        <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-lg">
            {isReadOnly ? "Detalles de la Cuenta" : account?.id && account.id !== 'new' ? "Editar Cuenta" : "Añadir Nueva Cuenta"}
            </DialogTitle>
            <DialogDescription>
            {isReadOnly
                ? `Viendo detalles de ${account?.name}.`
                : account?.id && account.id !== 'new'
                ? "Modifica los detalles de la cuenta."
                : "Introduce la información de la nueva cuenta."}
            </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6">
          <AccountForm
              onSubmit={handleSubmit}
              onCancel={() => onOpenChange(false)}
              defaultValues={account ? accountToForm(account as Account) : undefined}
              teamMembers={allTeamMembers}
              distributors={distributors}
              parentAccounts={parentAccounts}
              isSaving={isSaving}
              isReadOnly={isReadOnly}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

