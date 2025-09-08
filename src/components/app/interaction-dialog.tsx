
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  interactionSchema,
  type InteractionFormValues,
} from "@/lib/schemas/interaction-schema";
import { createInteractionAction, listAccountsForSelectAction } from "@/services/interaction-service";
import { interactionTypeOptions, interactionOutcomeOptions } from "@ssot";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultAccountId?: string | null; // if coming from an account, pass it
  onCreated?: (id: string) => void;
};

export default function InteractionDialog({ open, onOpenChange, defaultAccountId, onCreated }: Props) {
  const { toast } = useToast();
  const form = useForm<InteractionFormValues>({
    resolver: zodResolver(interactionSchema),
    defaultValues: {
      accountId: defaultAccountId ?? "",
      type: "visita",
      date: new Date(),
      outcome: "pendiente",
      note: "",
      nextActionAt: undefined,
    },
  });

  const busy = form.formState.isSubmitting;
  const [accountOpts, setAccountOpts] = React.useState<{id:string;name:string}[]>([]);
  const needsAccount = !defaultAccountId;

  React.useEffect(() => {
    if (!open) return;
    
    // Reset form when opening
    form.reset({
      accountId: defaultAccountId ?? "",
      type: "visita",
      date: new Date(),
      outcome: "pendiente",
      note: "",
      nextActionAt: undefined,
    });
    
    if (needsAccount) {
      (async () => {
        try { setAccountOpts(await listAccountsForSelectAction()); }
        catch { setAccountOpts([]); }
      })();
    }
  }, [open, needsAccount, defaultAccountId, form]);

  async function onSubmit(values: InteractionFormValues) {
    try {
        const res = await createInteractionAction(values);
        toast({ title: "Interacción registrada", description: `ID: ${res.id}` });
        onCreated?.(res.id);
        onOpenChange(false);
    } catch(e: any) {
        toast({
            title: "Error al guardar",
            description: e.message || "No se pudo registrar la interacción.",
            variant: "destructive"
        });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar interacción</DialogTitle>
          <DialogDescription>Guarda visitas, llamadas o notas de seguimiento. El estado de la cuenta se recalculará en la Cartera.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Cuenta */}
          {needsAccount ? (
            <Field label="Cuenta" error={form.formState.errors.accountId?.message}>
              <Select
                value={form.watch("accountId")}
                onValueChange={(v) => form.setValue("accountId", v, { shouldDirty: true })}
              >
                <SelectTrigger><SelectValue placeholder="Selecciona cuenta"/></SelectTrigger>
                <SelectContent>
                  {accountOpts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <input type="hidden" value={defaultAccountId ?? ""} {...form.register("accountId")} />
          )}

          {/* Tipo */}
          <Field label="Tipo">
            <Select
              value={form.watch("type")}
              onValueChange={(v) => form.setValue("type", v as any, { shouldDirty: true })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {interactionTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          {/* Resultado */}
          <Field label="Resultado">
            <Select
              value={form.watch("outcome") ?? "pendiente"}
              onValueChange={(v) => form.setValue("outcome", v as any, { shouldDirty: true })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {interactionOutcomeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          {/* Fecha y próxima acción */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Fecha">
              <Input
                type="datetime-local"
                defaultValue={toLocalInputValue(form.watch("date"))}
                onChange={(e) => form.setValue("date", new Date(e.target.value))}
              />
            </Field>
            <Field label="Próxima acción (opcional)">
              <Input
                type="datetime-local"
                defaultValue={toLocalInputValue(form.watch("nextActionAt") ?? undefined)}
                onChange={(e) => form.setValue("nextActionAt", e.target.value ? new Date(e.target.value) : null)}
              />
            </Field>
          </div>

          {/* Nota */}
          <Field label="Notas">
            <Textarea rows={3} placeholder="Resumen de la visita, acuerdos, objeciones…" {...form.register("note")} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function toLocalInputValue(d?: Date | null) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  
  // Adjust for timezone offset
  const tzoffset = (new Date()).getTimezoneOffset() * 60000;
  const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, -1);
  
  return localISOTime.substring(0, 16); // YYYY-MM-DDTHH:mm
}
