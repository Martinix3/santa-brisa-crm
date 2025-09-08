
"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Schemas/actions de tramos previos:
import {
  accountSchema,
  type AccountFormValues,
} from "@/lib/schemas/account-schema";
import { upsertAccountAction } from "@/app/(app)/accounts/actions";
import { TIPOS_CUENTA, OWNERSHIP_OPTIONS, TIPOS_INTERACCION, RESULTADOS_INTERACCION, orderChannelOptions } from "@ssot";


import {
  interactionSchema,
  type InteractionFormValues,
} from "@/lib/schemas/interaction-schema";
import { createInteractionAction, listAccountsForSelectAction } from "@/services/interaction-service";


import {
  orderSchema,
  type OrderFormValues,
  type OrderLine
} from "@/lib/schemas/order-schema";
import { createOrderAction } from "@/app/(app)/orders/actions";
import { getHubDialogDataAction } from "./actions";
import type { InventoryItem } from "@/types";


type HubMode = "cuenta" | "interaccion" | "pedido";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Contexto inicial: si vienes desde la ficha/tabla de cuentas */
  initialAccount?: { id: string; name: string } | null;
  /** Pestaña por defecto */
  defaultMode?: HubMode;
  /** Callbacks opcionales */
  onAccountCreated?: (accountId: string) => void;
  onInteractionCreated?: (interactionId: string, accountId: string) => void;
  onOrderCreated?: (orderId: string, accountId: string) => void;
};

export default function QuickHubDialog({
  open,
  onOpenChange,
  initialAccount,
  defaultMode = "cuenta",
  onAccountCreated,
  onInteractionCreated,
  onOrderCreated,
}: Props) {
  const { toast } = useToast();
  const [mode, setMode] = React.useState<HubMode>(defaultMode);
  const [selectedAccount, setSelectedAccount] = React.useState<{ id: string; name: string } | null>(
    initialAccount ?? null
  );

  React.useEffect(() => {
    if (!open) {
      setMode(defaultMode);
      setSelectedAccount(initialAccount ?? null);
    }
  }, [open, defaultMode, initialAccount]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Acciones rápidas</DialogTitle>
          <DialogDescription>
            Crea cuentas, registra interacciones o genera pedidos desde un solo lugar.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v)=> setMode(v as HubMode)} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="cuenta">Cuenta</TabsTrigger>
            <TabsTrigger value="interaccion">Interacción</TabsTrigger>
            <TabsTrigger value="pedido">Pedido</TabsTrigger>
          </TabsList>

          {/* --- TAB CUENTA --- */}
          <TabsContent value="cuenta" className="mt-4">
            <CreateAccountForm
              initialAccount={selectedAccount}
              onCreated={(id, name) => {
                setSelectedAccount({ id, name });
                onAccountCreated?.(id);
                toast({ title: "Cuenta creada", description: name });
                onOpenChange(false);
              }}
            />
          </TabsContent>

          {/* --- TAB INTERACCIÓN --- */}
          <TabsContent value="interaccion" className="mt-4">
            <CreateInteractionForm
              selectedAccount={selectedAccount}
              onResolvedAccount={(acc)=> setSelectedAccount(acc)}
              onCreated={(iid, accId) => {
                onInteractionCreated?.(iid, accId);
                toast({ title: "Interacción registrada", description: `Cuenta ${accId}` });
                onOpenChange(false);
              }}
            />
          </TabsContent>

          {/* --- TAB PEDIDO --- */}
          <TabsContent value="pedido" className="mt-4">
            <CreateOrderFormLite
              selectedAccount={selectedAccount}
              onResolvedAccount={(acc)=> setSelectedAccount(acc)}
              onCreated={(oid, accId) => {
                onOrderCreated?.(oid, accId);
                toast({ title: "Pedido creado", description: `ID ${oid}` });
                onOpenChange(false);
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}


function CreateAccountForm({
  initialAccount,
  onCreated,
}: {
  initialAccount: { id: string; name: string } | null;
  onCreated: (id: string, name: string) => void;
}) {
  const [distributors, setDistributors] = React.useState<{id:string; name:string}[]>([]);
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      id: initialAccount?.id,
      name: initialAccount?.name ?? "",
      cif: "",
      type: "prospect",
      phone: "",
      email: "",
      address: "",
      city: "",
      notes: "",
      ownership: "propio",
      distributorId: "",
    },
  });
  const busy = form.formState.isSubmitting;

  React.useEffect(() => {
    getHubDialogDataAction().then(({ distributors }) => setDistributors(distributors));
  }, []);

  async function onSubmit(values: AccountFormValues) {
    const res = await upsertAccountAction(values);
    onCreated(res.id, values.name);
  }

  const ownership = form.watch("ownership");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre comercial" error={form.formState.errors.name?.message}>
          <Input placeholder="Bar Las Tablas" {...form.register("name")} />
        </Field>
        <Field label="CIF/NIF">
          <Input placeholder="Opcional" {...form.register("cif")} />
        </Field>

        <Field label="Tipo">
          <Select value={form.watch("type")} onValueChange={(v)=> form.setValue("type", v as any, { shouldDirty:true })}>
            <SelectTrigger><SelectValue placeholder="Selecciona"/></SelectTrigger>
            <SelectContent>
              {TIPOS_CUENTA.map(o=> <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Vinculada a">
          <Select value={ownership} onValueChange={(v)=> form.setValue("ownership", v as any, { shouldDirty:true })}>
            <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
            <SelectContent>
              {OWNERSHIP_OPTIONS.map(o=> <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        {ownership === "distribuidor" && (
          <Field label="Distribuidor" error={form.formState.errors.distributorId?.message as string | undefined}>
            <Select value={form.watch("distributorId") ?? ""} onValueChange={(v)=> form.setValue("distributorId", v, { shouldDirty:true })}>
              <SelectTrigger><SelectValue placeholder="Selecciona distribuidor" /></SelectTrigger>
              <SelectContent>
                {distributors.map(d=> <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        )}

        <Field label="Teléfono"><Input placeholder="+34 ..." {...form.register("phone")} /></Field>
        <Field label="Email" error={form.formState.errors.email?.message}><Input placeholder="contacto@ejemplo.com" {...form.register("email")} /></Field>
        <Field label="Dirección" colSpan={2}><Input placeholder="Calle, número…" {...form.register("address")} /></Field>
        <Field label="Ciudad"><Input placeholder="Madrid" {...form.register("city")} /></Field>
        <Field label="Notas" colSpan={2}><Textarea rows={3} placeholder="Observaciones…" {...form.register("notes")} /></Field>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 mr-2 animate-spin" />}Crear cuenta</Button>
      </div>
    </form>
  );
}


function CreateInteractionForm({
  selectedAccount,
  onResolvedAccount,
  onCreated,
}: {
  selectedAccount: { id: string; name: string } | null;
  onResolvedAccount: (acc:{id:string; name:string}) => void;
  onCreated: (interactionId: string, accountId: string) => void;
}) {
  const form = useForm<InteractionFormValues>({
      resolver: zodResolver(interactionSchema),
      defaultValues: {
            accountId: selectedAccount?.id ?? "",
            accountName: selectedAccount?.name ?? "",
            type: "visita",
            date: new Date(),
            outcome: "pendiente",
            note: "",
            nextActionAt: undefined,
            ownershipHint: "propio",
      }
  });

  const busy = form.formState.isSubmitting;

  async function onSubmit(values: InteractionFormValues) {
    const res = await createInteractionAction(values);
    if (!selectedAccount) {
      onResolvedAccount({ id: res.accountId, name: values.accountName ?? "Cuenta" });
    }
    onCreated(res.id, res.accountId);
  }

  const hasPreset = !!selectedAccount?.id;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {!hasPreset ? (
        <Field label="Cuenta" error={form.formState.errors.accountName?.message}>
          <Input placeholder="Ej. Bar Las Tablas" {...form.register("accountName")} />
        </Field>
      ) : (
        <Field label="Cuenta">
            <Input value={selectedAccount.name} disabled />
        </Field>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Tipo">
          <Select value={form.watch("type")} onValueChange={(v)=> form.setValue("type", v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS_INTERACCION.map(o=> <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Resultado">
          <Select value={form.watch("outcome") ?? "pendiente"} onValueChange={(v)=> form.setValue("outcome", v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {RESULTADOS_INTERACCION.map(o=> <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Fecha">
          <Input type="datetime-local" defaultValue={toLocalInputValue(form.watch("date")!)} onChange={(e)=> form.setValue("date", new Date(e.target.value))} />
        </Field>
        <Field label="Próxima acción (opcional)">
          <Input type="datetime-local" defaultValue={toLocalInputValue(form.watch("nextActionAt") ?? undefined)} onChange={(e)=> form.setValue("nextActionAt", e.target.value ? new Date(e.target.value) : undefined)} />
        </Field>
      </div>

      <Field label="Notas"><Textarea rows={3} placeholder="Resumen…" {...form.register("note")} /></Field>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 mr-2 animate-spin" />}Guardar interacción</Button>
      </div>
    </form>
  );
}


function CreateOrderFormLite({
  selectedAccount,
  onResolvedAccount,
  onCreated,
}: {
  selectedAccount: { id: string; name: string } | null;
  onResolvedAccount: (acc:{id:string; name:string}) => void;
  onCreated: (orderId: string, accountId: string) => void;
}) {
  const [inventory, setInventory] = React.useState<InventoryItem[]>([]);
  const [invKind, setInvKind] = React.useState<"all"|"product"|"plv">("all");

  React.useEffect(() => {
    getHubDialogDataAction({ inventoryKind: invKind === 'all' ? undefined : invKind as any })
        .then(({ inventoryItems }) => setInventory(inventoryItems));
  }, [invKind]);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
        accountId: selectedAccount?.id ?? "",
        accountName: selectedAccount?.name ?? "",
        channel: "propio",
        distributorId: null,
        currency: "EUR",
        lines: [], 
        notes: "",
    }
  });

  const busy = form.formState.isSubmitting;
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });
  const lines = form.watch("lines");

  function addFromInventory(id: string) {
    const p = inventory.find(x => x.id === id);
    if (!p) return;
    append({
      inventoryId: p.id,
      lineType: (p.categoryId === 'INV_PROMO_MATERIAL' ? 'plv' : 'product'),
      sku: p.sku!,
      name: p.name,
      uom: p.uom ?? "unit",
      qty: 1,
      unitPrice: Number(p.latestPurchase?.calculatedUnitCost ?? 0),
      total: Number(p.latestPurchase?.calculatedUnitCost ?? 0),
    });
  }
  function updateLine(i: number, patch: Partial<OrderLine>) {
    const currentLines = form.getValues("lines");
    const updatedLine = { ...currentLines[i], ...patch };
    updatedLine.total = (updatedLine.unitPrice || 0) * (updatedLine.qty || 0);
    const newLines = currentLines.map((l, idx) => (idx === i ? updatedLine : l));
    form.setValue("lines", newLines, { shouldValidate: true, shouldDirty: true });
  }

  function removeLine(i: number) {
    remove(i);
  }

  const orderTotal = (lines || []).reduce((s,l)=> s + (l.total || 0), 0);

  async function onSubmit(values: OrderFormValues) {
    const res = await createOrderAction({
      ...values,
      accountName: hasPreset ? selectedAccount!.name : values.accountName!,
      ownershipHint: values.channel === "distribuidor" ? "distribuidor" : "propio",
    });
    if (!hasPreset && res.accountId) {
      onResolvedAccount({ id: res.accountId, name: values.accountName! });
    }
    onCreated(res.id, res.accountId ?? (selectedAccount?.id ?? ""));
  }

  const hasPreset = !!selectedAccount?.id;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {!hasPreset && (
        <Field label="Cuenta (escribe para crear)">
          <Input placeholder="Ej. Bar Las Tablas" {...form.register("accountName")} />
        </Field>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Canal">
          <Select value={form.watch("channel")} onValueChange={(v)=> form.setValue("channel", v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {orderChannelOptions.map(o=> <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        {form.watch("channel")==="distribuidor" && (
          <Field label="Distribuidor" colSpan={2}>
            <Input placeholder="ID distribuidor (opcional si ya se vincula por cuenta)" {...form.register("distributorId")} />
          </Field>
        )}
        <Field label="Moneda">
          <Select value={form.watch("currency")} onValueChange={(v)=>form.setValue("currency", v as any)}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="MXN">MXN</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <Field label="Catálogo">
          <Select value={invKind} onValueChange={(v)=> setInvKind(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="product">Productos</SelectItem>
              <SelectItem value="plv">PLV</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Añadir del inventario" colSpan={2}>
          <Select onValueChange={(id)=> addFromInventory(id)}>
            <SelectTrigger><SelectValue placeholder="Buscar/seleccionar" /></SelectTrigger>
            <SelectContent>
              {inventory.map(p=> (
                <SelectItem key={p.id} value={p.id}>
                  {(p.categoryId === "INV_PROMO_MATERIAL" ? "🪧" : "🍾")} {p.sku} — {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground">
            <tr className="[&>th]:py-2 [&>th]:px-3 [&>th]:text-left">
              <th>Producto</th><th>SKU</th><th className="text-right">Cant.</th><th className="text-right">Precio</th><th className="text-right">Total</th><th className="text-right">—</th>
            </tr>
          </thead>
          <tbody>
            {fields.length===0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Sin líneas.</td></tr>}
            {fields.map((l,i)=>(
              <tr key={l.id} className="border-t">
                <td className="py-2 px-3">{lines[i]?.name}</td>
                <td className="px-3">{lines[i]?.sku}</td>
                <td className="px-3 text-right">
                  <Input className="text-right" type="number" min={1} step="1" value={lines[i]?.qty} onChange={(e)=> updateLine(i,{ qty: Number(e.target.value||0) })} />
                </td>
                <td className="px-3 text-right">
                  <Input className="text-right" type="number" min={0} step="0.01" value={lines[i]?.unitPrice} onChange={(e)=> updateLine(i,{ unitPrice: Number(e.target.value||0) })} />
                </td>
                <td className="px-3 text-right tabular-nums">{lines[i]?.total.toFixed(2)}</td>
                <td className="px-3 text-right"><Button size="icon" variant="ghost" onClick={()=> removeLine(i)}><Trash2 className="h-4 w-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="md:col-span-2">
          <Label>Notas</Label>
          <Textarea rows={3} placeholder="Observaciones…" value={form.watch("notes") ?? ""} onChange={(e)=> form.setValue("notes", e.target.value)} />
        </div>
        <div className="p-4 rounded-lg border bg-muted/20">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-2xl font-semibold tabular-nums">{orderTotal.toFixed(2)} {form.watch("currency")}</div>
          <Button className="mt-3 w-full" type="submit" disabled={busy}>
            {busy && <Loader2 className="size-4 mr-2 animate-spin" />}Crear pedido
          </Button>
        </div>
      </div>
    </form>
  );
}

/* ===================== Helpers visuales ===================== */
function Field({ label, children, error, colSpan }: { label: string; children: React.ReactNode; error?: string; colSpan?: 1|2 }) {
  return (
    <div className={colSpan===2 ? "md:col-span-2 space-y-2" : "space-y-2"}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function useFormSafe<T extends z.ZodType<any, any, any>>(schema: T, defaults: z.infer<T>) {
    return useForm<z.infer<T>>({
        resolver: zodResolver(schema),
        defaultValues: defaults,
    });
}

function toLocalInputValue(d?: Date) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

    