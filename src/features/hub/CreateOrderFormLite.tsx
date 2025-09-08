
"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  orderSchema, type OrderFormValues, type OrderLine
} from "@/lib/schemas/order-schema";
import { createOrderAction } from "@/app/(app)/orders/actions";
import { getHubDialogDataAction } from "./actions";
import type { InventoryItem, Account } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { ORDER_CHANNEL_VALUES, orderChannelOptions } from "@ssot";
import { OrderChannel } from "@ssot";

type Props = {
  selectedAccount: Account;
  onCreated: (orderId: string, accountId: string) => void;
};

export function CreateOrderFormLite({ selectedAccount, onCreated }: Props) {
  const [inventory, setInventory] = React.useState<InventoryItem[]>([]);
  const [invKind, setInvKind] = React.useState<"all" | "product" | "plv">("all");

  React.useEffect(() => {
    getHubDialogDataAction({ inventoryKind: invKind === "all" ? undefined : (invKind as any) })
      .then(({ inventoryItems }) => setInventory(inventoryItems));
  }, [invKind]);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      accountId: selectedAccount?.id,
      accountName: selectedAccount?.name,
      channel: "propio",
      currency: "EUR",
      lines: [],
    },
  });

  const busy = form.formState.isSubmitting;

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const lines = form.watch("lines");

  function addFromInventory(id: string) {
    const p = inventory.find(x => x.id === id);
    if (!p) return;
    append({
      inventoryId: p.id,
      lineType: p.categoryId === "INV_PROMO_MATERIAL" ? "plv" : "product",
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
    form.setValue("lines", currentLines.map((l, idx) => (idx === i ? updatedLine : l)), { shouldValidate: true, shouldDirty: true });
  }

  const orderTotal = (lines || []).reduce((s, l) => s + (l.total || 0), 0);

  async function onSubmit(values: OrderFormValues) {
    const res = await createOrderAction({ 
      ...values, 
      lines,
      accountId: selectedAccount!.id,
      accountName: selectedAccount!.name,
      ownershipHint: values.channel === "distribuidor" ? "distribuidor" : "propio",
    });
    onCreated(res.id, res.accountId!);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Canal">
          <Select
            value={form.watch("channel")}
            onValueChange={(v)=> form.setValue("channel", v as OrderChannel)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {orderChannelOptions.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Moneda">
          <Select value={form.watch("currency")} onValueChange={(v)=>form.setValue("currency", v as any)}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="space-y-2">
        <Label>Líneas</Label>
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground [&>th]:p-2 [&>th]:font-medium [&>th]:text-left">
                <th>Producto</th><th className="text-right">Cant.</th><th className="text-right">Precio</th><th className="text-right">Total</th><th></th>
              </tr>
            </thead>
            <tbody>
              {fields.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Añade productos...</td></tr>}
              {fields.map((l, i) => (
                <tr key={l.id} className="border-t">
                  <td className="p-2">{lines[i]?.name}</td>
                  <td className="p-2 text-right">
                    <Input className="text-right h-8" type="number" min={1} step="1" value={lines[i]?.qty ?? ''} onChange={(e) => updateLine(i, { qty: Number(e.target.value || 0) })} />
                  </td>
                  <td className="p-2 text-right">
                    <Input className="text-right h-8" type="number" min={0} step="0.01" value={lines[i]?.unitPrice ?? ''} onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value || 0) })} />
                  </td>
                  <td className="p-2 text-right tabular-nums">{lines[i]?.total.toFixed(2)}</td>
                  <td className="p-2 text-right"><Button size="icon" variant="ghost" type="button" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Select onValueChange={(id) => addFromInventory(id)}>
          <SelectTrigger><SelectValue placeholder="Añadir producto del catálogo..." /></SelectTrigger>
          <SelectContent>
            {inventory.map(p => (<SelectItem key={p.id} value={p.id}>{p.sku} — {p.name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="size-4 mr-2 animate-spin" />} Crear pedido
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
