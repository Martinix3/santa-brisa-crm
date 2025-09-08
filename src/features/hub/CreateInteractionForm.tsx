
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { interactionSchema, type InteractionFormValues } from "@/lib/schemas/interaction-schema";
import { createInteractionAction } from "@/services/interaction-service";
import { TIPOS_INTERACCION, RESULTADOS_INTERACCION } from "@ssot";
import type { Account } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Props = {
  selectedAccount?: Account | null;
  accountNameFallback?: string;
  onCreated: (interactionId: string, accountId: string) => void;
};

export function CreateInteractionForm({ selectedAccount, accountNameFallback, onCreated }: Props) {
  const { toast } = useToast();
  
  const form = useForm<InteractionFormValues>({
    resolver: zodResolver(interactionSchema),
    defaultValues: {
      accountId: selectedAccount?.id,
      accountName: selectedAccount?.name ?? accountNameFallback,
      type: "VISITA",
      date: new Date(),
      outcome: "PENDIENTE",
      note: "",
    },
  });

  const busy = form.formState.isSubmitting;

  async function onSubmit(values: InteractionFormValues) {
    try {
      const res = await createInteractionAction(values);
      onCreated(res.id, res.accountId!);
    } catch(e:any) {
       toast({
            title: "Error al guardar",
            description: e.message || "No se pudo registrar la interacción.",
            variant: "destructive"
        });
    }
  }

  function toLocalInputValue(d?: Date) {
    if (!d) return "";
    const date = new Date(d);
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, -1);
    return localISOTime.substring(0, 16);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Tipo">
          <Select value={form.watch("type")} onValueChange={(v) => form.setValue("type", v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS_INTERACCION.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Resultado">
          <Select value={form.watch("outcome") ?? "PENDIENTE"} onValueChange={(v) => form.setValue("outcome", v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {RESULTADOS_INTERACCION.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Fecha">
          <Input type="datetime-local" defaultValue={toLocalInputValue(form.watch("date")!)} onChange={(e) => form.setValue("date", new Date(e.target.value))} />
        </Field>
        <Field label="Próxima acción (opcional)">
          <Input type="datetime-local" defaultValue={toLocalInputValue(form.watch("nextActionAt") ?? undefined)} onChange={(e) => form.setValue("nextActionAt", e.target.value ? new Date(e.target.value) : undefined)} />
        </Field>
      </div>
      <Field label="Notas"><Textarea rows={3} placeholder="Resumen…" {...form.register("note")} /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 mr-2 animate-spin" />}Guardar interacción</Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
