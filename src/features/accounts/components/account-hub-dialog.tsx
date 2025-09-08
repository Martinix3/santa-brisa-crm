

"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import * as React from 'react';
import AccountDialog from "./account-dialog"; // Assuming this is the full form
import type { Account } from "@/types";

// Placeholders for the forms that would go inside the tabs
const InteractionForm = ({ accountId }: { accountId: string | null }) => <div>Formulario de Interacción para cuenta {accountId}</div>;
const OrderQuickForm = ({ accountId }: { accountId: string | null }) => <div>Formulario de Pedido Rápido para cuenta {accountId}</div>;

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
  const [activeTab, setActiveTab] = React.useState<HubMode>(defaultMode);

  React.useEffect(() => {
    if (open) {
      setActiveTab(defaultMode);
    }
  }, [open, defaultMode]);

  if (!accountId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
            <DialogTitle>Centro de Mando de la Cuenta</DialogTitle>
            <DialogDescription>
                Accede rápidamente a las acciones más comunes para esta cuenta.
            </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HubMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="registrar">Registrar interacción</TabsTrigger>
            <TabsTrigger value="pedido">Nuevo pedido</TabsTrigger>
            <TabsTrigger value="editar">Editar cuenta</TabsTrigger>
          </TabsList>
          <TabsContent value="registrar" className="mt-4">
              <InteractionForm accountId={accountId}/>
          </TabsContent>
          <TabsContent value="pedido" className="mt-4">
              <OrderQuickForm accountId={accountId}/>
          </TabsContent>
          <TabsContent value="editar" className="mt-4">
            {/* Here we can render the full AccountDialog, passing the account ID */}
            {/* This assumes AccountDialog can fetch the account data itself or we pass it */}
            <p className="p-4 text-center text-sm">El formulario de edición completo aparecerá aquí.</p>
            {/* 
            <AccountDialog
              open={true} // This is tricky, needs state management refactor
              onOpenChange={() => {}}
              initial={{ id: accountId }} // Pass initial data
              onSaved={() => onOpenChange(false)}
            />
            */}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
