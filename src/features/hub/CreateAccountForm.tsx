
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountSchema, type AccountFormValues } from "@/lib/schemas/account-schema";
import { upsertAccountAction } from "@/app/(app)/accounts/actions";
import { OPCIONES_TIPO_CUENTA, OWNERSHIP_OPTIONS } from "@ssot";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Account } from "@/types";

type DistributorOpt = { id: string; name: string };

type Props = {
  initialAccount: Account | null;
  onCreated: (id: string, name: string) => void;
  distributors?: DistributorOpt[];
};

export function CreateAccountForm({ initialAccount, onCreated, distributors = [] }: Props) {
  const { toast } = useToast();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      id: initialAccount?.id,
      name: initialAccount?.name ?? "",
      cif: initialAccount?.cif ?? "",
      type: initialAccount?.type ?? "HORECA",
      ownership: initialAccount?.distributorId ? "distribuidor" : "propio",
      distributorId: initialAccount?.distributorId ?? "",
    },
  });

  const busy = form.formState.isSubmitting;
  const ownership = form.watch("ownership");

  async function onSubmit(values: AccountFormValues) {
    try {
      const res = await upsertAccountAction(values);
      onCreated(res.id, values.name);
    } catch (e: any) {
      toast({
        title: "Error al guardar",
        description: e.message || "No se pudo guardar la cuenta.",
        variant: "destructive",
      });
    }
  }

  React.useEffect(() => {
    form.reset({
      id: initialAccount?.id,
      name: initialAccount?.name ?? "",
      cif: initialAccount?.cif ?? "",
      type: initialAccount?.type ?? "HORECA",
      ownership: initialAccount?.distributorId ? "distribuidor" : "propio",
      distributorId: initialAccount?.distributorId ?? "",
    });
  }, [initialAccount, form]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre comercial" error={form.formState.errors.name?.message}>
          <Input placeholder="Bar Las Tablas" {...form.register("name")} />
        </Field>
        <Field label="CIF/NIF" error={form.formState.errors.cif?.message}>
          <Input placeholder="Opcional" {...form.register("cif")} />
        </Field>
        <Field label="Tipo">
          <Select value={form.watch("type")} onValueChange={(v) => form.setValue("type", v as any, { shouldDirty: true })}>
            <SelectTrigger><SelectValue placeholder="Selecciona"/></SelectTrigger>
            <SelectContent>
              {OPCIONES_TIPO_CUENTA.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Vinculada a">
          <Select value={ownership} onValueChange={(v) => form.setValue("ownership", v as any, { shouldDirty: true })}>
            <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
            <SelectContent>
              {OWNERSHIP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        {ownership === "distribuidor" && (
          <Field label="Distribuidor" error={form.formState.errors.distributorId?.message as string | undefined}>
            <Select value={form.watch("distributorId") ?? ""} onValueChange={(v) => form.setValue("distributorId", v, { shouldDirty: true })}>
              <SelectTrigger><SelectValue placeholder="Selecciona distribuidor"/></SelectTrigger>
              <SelectContent>
                {distributors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
          {initialAccount?.id ? "Guardar cambios" : "Crear cuenta"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children, error, colSpan }: { label: string; children: React.ReactNode; error?: string; colSpan?: 1 | 2 }) {
  return (
    <div className={colSpan === 2 ? "md:col-span-2 space-y-2" : "space-y-2"}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
