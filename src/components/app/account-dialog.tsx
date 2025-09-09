
"use client";

import * as React from "react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Building2, UserRound, Link2, MapPin, Tag, PlusCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import type { TeamMember, Account } from "@/types";
import { TIPOS_CUENTA_VALUES, type TipoCuenta } from "@ssot";
import { updateAccountAction, upsertAccountAction } from "@/app/(app)/accounts/actions";
import { useToast } from "@/hooks/use-toast";
import { accountToForm, formToAccountPartial } from "@/services/account-mapper";
import type { AccountFormValues } from "@/lib/schemas/account-schema";
import { accountSchema } from "@/lib/schemas/account-schema";

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
}: {
  onSubmit: (data: AccountFormValues) => Promise<void> | void;
  onCancel?: () => void;
  defaultValues?: Partial<AccountFormValues>;
  teamMembers?: TeamMember[];
  distributors?: Array<{ id: string; name: string }>;
  parentAccounts?: Array<{ id: string; name: string }>;
  isSaving: boolean;
}) {
  const { user } = useAuth();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      accountType: TIPOS_CUENTA_VALUES[0],
      city: "",
      country: "ES",
      salesRepId: user?.id ?? "",
      mainContactName: "",
      mainContactEmail: "",
      mainContactPhone: "",
      distributorId: "",
      parentAccountId: "",
      addressBilling: "",
      addressShipping: "",
      notes: "",
      tags: [],
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (user?.id && !form.getValues('salesRepId')) {
      form.setValue("salesRepId", user.id, { shouldDirty: false });
    }
  }, [user?.id, form]);
  
  useEffect(() => {
    form.reset({
      name: "",
      accountType: TIPOS_CUENTA_VALUES[0],
      city: "",
      country: "ES",
      salesRepId: user?.id ?? "",
      mainContactName: "",
      mainContactEmail: "",
      mainContactPhone: "",
      distributorId: "",
      parentAccountId: "",
      addressBilling: "",
      addressShipping: "",
      notes: "",
      tags: [],
      ...defaultValues,
    })
  }, [defaultValues, form, user?.id]);

  const [tagInput, setTagInput] = React.useState("");
  const tags = form.watch("tags") ?? [];
  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!tags.includes(t)) form.setValue("tags", [...tags, t], { shouldDirty: true });
    setTagInput("");
  };
  const removeTag = (t: string) => form.setValue("tags", tags.filter(x => x!==t), { shouldDirty: true });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (data) => {
        await onSubmit(data);
      })}
    >
      <div className="rounded-2xl overflow-hidden border border-zinc-200 bg-white">
        <div className="px-4 py-3 border-b" style={{ background: waterHeader("NuevaCuenta:basicos") }}>
          <div className="flex items-center gap-2 text-zinc-800"><Building2 className="h-4 w-4"/> <span className="text-sm font-medium">Datos básicos</span></div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="name">Nombre de la cuenta</Label>
            <Input id="name" {...form.register("name")} placeholder="Ej. Bar Pepe" />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.name.message as string}</p>
            )}
          </div>

          <div>
            <Label>Tipo de cuenta</Label>
            <Select
              value={String(form.watch("accountType") ?? "")}
              onValueChange={(v) => form.setValue("accountType", v as TipoCuenta, { shouldDirty: true })}
            >
              <SelectTrigger><SelectValue placeholder="Selecciona tipo"/></SelectTrigger>
              <SelectContent>
                {TIPOS_CUENTA_VALUES.map((t) => (
                  <SelectItem key={t} value={t}>{t.replaceAll("_"," ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Ciudad</Label>
            <Input {...form.register("city")} placeholder="Ej. Zaragoza" />
          </div>

          <div>
            <Label>País</Label>
            <Input {...form.register("country")} placeholder="Ej. ES" />
          </div>

          <div className="md:col-span-2">
            <Label>Responsable comercial</Label>
            <Select
              value={form.watch("salesRepId")}
              onValueChange={(v) => form.setValue("salesRepId", v, { shouldDirty: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona responsable" />
              </SelectTrigger>
              <SelectContent>
                {(teamMembers && teamMembers.length>0 ? teamMembers : (user ? [{ id: user.id, name: (user as any).name || (user as any).email || "Usuario actual" }] : [])).map(tm => (
                  <SelectItem key={tm.id} value={tm.id}>{tm.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.salesRepId && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.salesRepId.message as string}</p>
            )}
          </div>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["contacto"]} className="space-y-3">
        <AccordionItem value="contacto" className="border border-zinc-200 rounded-2xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3">
            <div className="flex items-center gap-2 text-zinc-800"><UserRound className="h-4 w-4"/> <span className="text-sm font-medium">Contacto principal</span></div>
          </AccordionTrigger>
          <AccordionContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Nombre</Label>
              <Input {...form.register("mainContactName")} placeholder="Nombre y apellidos" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" {...form.register("mainContactEmail")} placeholder="nombre@empresa.com" />
              {form.formState.errors.mainContactEmail && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.mainContactEmail.message as string}</p>
              )}
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input {...form.register("mainContactPhone")} placeholder="+34 …" />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="relacion" className="border border-zinc-200 rounded-2xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3">
            <div className="flex items-center gap-2 text-zinc-800"><Link2 className="h-4 w-4"/> <span className="text-sm font-medium">Relación comercial</span></div>
          </AccordionTrigger>
          <AccordionContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Distribuidor asignado</Label>
              <Select
                value={form.watch("distributorId") || ""}
                onValueChange={(v) => form.setValue("distributorId", v, { shouldDirty: true })}
              >
                <SelectTrigger><SelectValue placeholder="(Opcional)" /></SelectTrigger>
                <SelectContent>
                  {(distributors ?? []).map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cuenta matriz</Label>
              <Select
                value={form.watch("parentAccountId") || ""}
                onValueChange={(v) => form.setValue("parentAccountId", v, { shouldDirty: true })}
              >
                <SelectTrigger><SelectValue placeholder="(Opcional)" /></SelectTrigger>
                <SelectContent>
                  {(parentAccounts ?? []).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="direcciones" className="border border-zinc-200 rounded-2xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3">
            <div className="flex items-center gap-2 text-zinc-800"><MapPin className="h-4 w-4"/> <span className="text-sm font-medium">Direcciones</span></div>
          </AccordionTrigger>
          <AccordionContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Facturación</Label>
              <Textarea rows={3} {...form.register("addressBilling")} placeholder="Calle…, CP… Ciudad…, País" />
            </div>
            <div>
              <Label>Envío</Label>
              <Textarea rows={3} {...form.register("addressShipping")} placeholder="Calle…, CP… Ciudad…, País" />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="extras" className="border border-zinc-200 rounded-2xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3">
            <div className="flex items-center gap-2 text-zinc-800"><Tag className="h-4 w-4"/> <span className="text-sm font-medium">Extras</span></div>
          </AccordionTrigger>
          <AccordionContent className="p-4 space-y-3">
            <div>
              <Label>Notas</Label>
              <Textarea rows={3} {...form.register("notes")} placeholder="Información adicional…" />
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={tagInput}
                  onChange={(e)=>setTagInput(e.target.value)}
                  onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); addTag(); } }}
                  placeholder="Escribe un tag y Enter"
                />
                <Button type="button" variant="secondary" onClick={addTag} className="inline-flex items-center gap-1"><PlusCircle className="h-4 w-4"/>Añadir</Button>
              </div>
              {tags.length>0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map(t => (
                    <span key={t} className="px-2 py-0.5 text-xs rounded-md border border-zinc-300 bg-zinc-50">
                      {t}
                      <button type="button" className="ml-2 text-zinc-500 hover:text-zinc-700" onClick={()=>removeTag(t)}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
        )}
        <Button type="submit" disabled={isSaving} className="bg-[var(--sb-primary)] text-zinc-900 hover:brightness-95">Guardar cuenta</Button>
      </div>
    </form>
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
  
  const distributors = useMemo(() => {
    return allAccounts.filter(a => a.accountType === "DISTRIBUIDOR" || a.accountType === "IMPORTADOR").map(a => ({ id: a.id, name: a.name }));
  }, [allAccounts]);
  
  const parentAccounts = useMemo(() => {
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
          <AccountFormCore
              onSubmit={handleSubmit}
              onCancel={() => onOpenChange(false)}
              defaultValues={account ? accountToForm(account as Account) : undefined}
              teamMembers={allTeamMembers}
              distributors={distributors}
              parentAccounts={parentAccounts}
              isSaving={isSaving}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
