"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  orderSchema, type OrderFormValues, orderChannelOptions
} from "@/lib/schemas/order-schema";
import { createOrderAction } from "@/app/(app)/orders/actions";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { OrderLine } from "@/lib/schemas/order-schema";
import { OrderChannel } from "@ssot";


type Props = {
  open: boolean;
  onOpenChange: (v: boolean)=>void;
  account: { id:string; name:string };
  onCreated?: (id:string)=>void;
};

export default function OrderDialog({ open, onOpenChange, account, onCreated }: Props) {
  const { toast } = useToast();
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      accountId: account.id,
      accountName: account.name,
      channel: "propio",
      currency: "EUR",
      lines: [],
    },
  });
  
  const [lines, setLines] = React.useState<OrderLine[]>([]);
  const busy = form.formState.isSubmitting;

  async function onSubmit(values: OrderFormValues) {
    try {
      const res = await createOrderAction({ ...values, lines });
      toast({ title: "Pedido creado", description: `ID ${res.id}` });
      onCreated?.(res.id);
      onOpenChange(false);
    } catch (error: any) {
        toast({ title: "Error al crear pedido", description: error.message, variant: "destructive" });
    }
  }
  
  React.useEffect(() => {
    if(open) {
      form.reset({
        accountId: account.id,
        accountName: account.name,
        channel: "propio",
        currency: "EUR",
        lines: [],
      });
      setLines([]);
    }
  }, [open, account, form]);

  return (
    <Dialog open={open} onOpenChange={(v)=>!busy&&onOpenChange(v)}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nuevo pedido para: {account.name}</DialogTitle>
          <DialogDescription>Selecciona productos/PLV del inventario y guarda el pedido.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <SelectItem value="MXN">MXN</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="space-y-2">
            <Label>Líneas</Label>
            {lines.map((l, idx)=>(
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  placeholder="SKU"
                  value={l.sku}
                  onChange={(e)=> setLines(prev => prev.map((x,i)=> i===idx? {...x, sku:e.target.value, inventoryId: e.target.value}:x))}
                />
                <Input
                  type="number"
                  placeholder="Cant."
                  value={l.qty}
                  onChange={(e)=> setLines(prev => prev.map((x,i)=> i===idx? {...x, qty:Number(e.target.value)}:x))}
                />
                <Input
                  type="number"
                  placeholder="Precio"
                  value={l.unitPrice}
                  onChange={(e)=> setLines(prev => prev.map((x,i)=> i===idx? {...x, unitPrice:Number(e.target.value)}:x))}
                />
                <Button type="button" size="icon" variant="ghost" onClick={()=> setLines(prev => prev.filter((_,i)=> i!==idx))}><Trash2 className="h-4 w-4"/></Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={()=> setLines([...lines, { inventoryId:"tmp", lineType:"product", sku:"", name:"", uom:"ud", qty:1, unitPrice:0, total:0 }])}>
              <Plus className="h-4 w-4 mr-1"/> Añadir línea
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={()=> onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
              Crear pedido
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
