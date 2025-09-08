"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import OrderDialog from "@/features/orders/components/order-dialog";

export default function QuickOrder() {
  const [open, setOpen] = React.useState(false);
  // Usamos un ID de cuenta real para pruebas, puedes cambiarlo por uno que exista en tu Firestore.
  const account = { id: "02zK2aV5k7jC4bYp0Wf8", name: "Bar Pepe (Demo)" }; 

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Sandbox · Tramo 3 — Crear Pedido</h1>
      <Button onClick={()=>setOpen(true)}>Nuevo pedido para {account.name}</Button>
      <OrderDialog open={open} onOpenChange={setOpen} account={account} onCreated={(id)=>console.log("Pedido creado:",id)}/>
      <p className="text-sm text-muted-foreground">
        Tras guardar, verifica el nuevo pedido en la colección `orders` de Firestore.
      </p>
    </div>
  );
}
