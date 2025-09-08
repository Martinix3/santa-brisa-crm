
"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import * as React from 'react';

// Placeholders for the forms that would go inside the tabs
const InteractionForm = ({ accountId }: { accountId: string | null }) => <div>Formulario de Interacción para cuenta {accountId}</div>;
const OrderQuickForm = ({ accountId }: { accountId: string | null }) => <div>Formulario de Pedido Rápido para cuenta {accountId}</div>;
const AccountForm = ({ accountId }: { accountId: string | null }) => <div>Formulario de Edición de Cuenta para {accountId}</div>;

type HubMode = "registrar" | "editar" | "pedido";

export function AccountHubDialog({
  open, 
  onOpenChange, 
  accountId, 
  defaultMode = "registrar",
}: { 
  open: boolean; 
  onOpenChange:(v: boolean) => void; 
  accountId: string | null; 
  defaultMode?: HubMode 
}) {
  if (!accountId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Centro de Mando de la Cuenta</DialogTitle></DialogHeader>
        <Tabs defaultValue={defaultMode}>
          <TabsList>
            <TabsTrigger value="registrar">Registrar interacción</TabsTrigger>
            <TabsTrigger value="pedido">Nuevo pedido</TabsTrigger>
            <TabsTrigger value="editar">Editar cuenta</TabsTrigger>
          </TabsList>
          <TabsContent value="registrar"><InteractionForm accountId={accountId}/></TabsContent>
          <TabsContent value="pedido"><OrderQuickForm accountId={accountId}/></TabsContent>
          <TabsContent value="editar"><AccountForm accountId={accountId}/></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
