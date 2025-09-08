"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  accountSchema,
  type AccountFormValues,
} from "@/lib/schemas/account-schema";
import { TIPOS_CUENTA, OWNERSHIP_OPTIONS } from "@ssot";
import { upsertAccountAction } from "@/app/(app)/accounts/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Si tienes server action para listar distribuidores, cámbiala aquí.
// Para Tramo 1, dejamos el campo como text si ownership=distribuidor.
type DistributorOpt = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<AccountFormValues> | null; // para editar
  onSaved?: (id: string) => void;
  distributors?: DistributorOpt[]; // opcional: pásalos si ya los tienes
};

export default function AccountDialog({ open, onOpenChange, initial, onSaved, distributors = [] }: Props) {
  const { toast } = useToast();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      id: initial?.id,
      name: initial?.name ?? "",
      cif: (initial?.cif as any) ?? "",
      type: (initial?.type as any) ?? "prospect",
      phone: (initial?.phone as any) ?? "",
      email: (initial?.email as any) ?? "",
      address: (initial?.address as any) ?? "",
      city: (initial?.city as any) ?? "",
      notes: (initial?.notes as any) ?? "",
      ownership: (initial?.ownership as any) ?? "propio",
      distributorId: (initial?.distributorId as any) ?? "",
    },
  });

  const busy = form.formState.isSubmitting;
  const ownership = form.watch("ownership");

  async function onSubmit(values: AccountFormValues) {
    try {
        const res = await upsertAccountAction(values);
        toast({
            title: res.op === "created" ? "Cuenta creada" : "Cuenta actualizada",
            description: values.name,
        });
        onSaved?.(res.id);
        onOpenChange(false); // autocierre
    } catch(e: any) {
        toast({
            title: "Error al guardar",
            description: e.message || "No se pudo guardar la cuenta.",
            variant: "destructive"
        });
    }
  }
  
  React.useEffect(() => {
    if (open) {
      form.reset({
        id: initial?.id,
        name: initial?.name ?? "",
        cif: (initial?.cif as any) ?? "",
        type: (initial?.type as any) ?? "prospect",
        phone: (initial?.phone as any) ?? "",
        email: (initial?.email as any) ?? "",
        address: (initial?.address as any) ?? "",
        city: (initial?.city as any) ?? "",
        notes: (initial?.notes as any) ?? "",
        ownership: (initial?.ownership as any) ?? "propio",
        distributorId: (initial?.distributorId as any) ?? "",
      });
    }
  }, [open, initial, form]);

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar cuenta" : "Nueva cuenta"}</DialogTitle>
          <DialogDescription>Completa los datos básicos. El estado comercial se calculará automáticamente por actividad.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre comercial" error={form.formState.errors.name?.message}>
              <Input placeholder="Bar Las Tablas" {...form.register("name")} />
            </Field>

            <Field label="CIF/NIF">
              <Input placeholder="Opcional" {...form.register("cif")} />
            </Field>

            <Field label="Tipo">
              <Select value={form.watch("type")} onValueChange={(v) => form.setValue("type", v as any, { shouldDirty: true })}>
                <SelectTrigger><SelectValue placeholder="Selecciona"/></SelectTrigger>
                <SelectContent>
                  {TIPOS_CUENTA.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Vinculada a">
              <Select value={ownership} onValueChange={(v) => form.setValue("ownership", v as any, { shouldDirty: true })}>
                <SelectTrigger><SelectValue placeholder="Selecciona"/></SelectTrigger>
                <SelectContent>
                  {OWNERSHIP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            {ownership === "distribuidor" && (
              <Field label="Distribuidor" error={form.formState.errors.distributorId?.message as string | undefined}>
                {distributors.length > 0 ? (
                  <Select
                    value={form.watch("distributorId") ?? ""}
                    onValueChange={(v) => form.setValue("distributorId", v, { shouldDirty: true })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecciona distribuidor"/></SelectTrigger>
                    <SelectContent>
                      {distributors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input placeholder="ID distribuidor" {...form.register("distributorId")} />
                )}
              </Field>
            )}

            <Field label="Teléfono">
              <Input placeholder="+34 ..." {...form.register("phone")} />
            </Field>

            <Field label="Email" error={form.formState.errors.email?.message}>
              <Input placeholder="contacto@ejemplo.com" {...form.register("email")} />
            </Field>

            <Field label="Dirección" colSpan={2}>
              <Input placeholder="Calle, número, piso..." {...form.register("address")} />
            </Field>

            <Field label="Ciudad">
              <Input placeholder="Madrid" {...form.register("city")} />
            </Field>

            <Field label="Notas" colSpan={2}>
              <Textarea rows={3} placeholder="Observaciones internas…" {...form.register("notes")} />
            </Field>
          </section>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {initial?.id ? "Guardar cambios" : "Crear cuenta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label, children, error, colSpan,
}: { label: string; children: React.ReactNode; error?: string; colSpan?: 1|2 }) {
  return (
    <div className={colSpan === 2 ? "md:col-span-2 space-y-2" : "space-y-2"}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
