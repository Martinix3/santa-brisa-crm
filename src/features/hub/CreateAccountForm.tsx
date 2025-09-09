"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Account, TeamMember, InventoryItem } from "@/types";
import { getHubDialogDataAction } from "./actions";
import { useAuth } from "@/contexts/auth-context";
import { upsertAccountAction } from "@/app/(app)/accounts/actions";

import { AccountFormCore } from "@/components/app/account-dialog"; 
import { CreateInteractionForm } from "./CreateInteractionForm";
import { CreateOrderFormLite } from "./CreateOrderFormLite";

import { useAccountAutocomplete } from "@/features/accounts/hooks/use-account-autocomplete";
import { AccountAutocompleteInput } from "@/features/accounts/components/account-autocomplete-input";

type HubMode = "cuenta" | "interaccion" | "pedido";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialAccount?: Account | null;
  defaultMode?: HubMode;
};

export default function QuickHubDialog({
  open,
  onOpenChange,
  initialAccount,
  defaultMode = "cuenta",
}: Props) {
  const { toast } = useToast();
  const { refreshDataSignature } = useAuth();

  const [mode, setMode] = React.useState<HubMode>(defaultMode);
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItem[]>([]);
  const [distributors, setDistributors] = React.useState<Account[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);


  // Autocomplete reutilizable
  const {
    inputValue,
    draftAccountName,
    selectedAccount,
    matches,
    setInputValue,
    selectAccount,
    reset,
  } = useAccountAutocomplete({ accounts: allAccounts, initialAccount });

  // Carga segura con flag de montaje + roles canónicos
  React.useEffect(() => {
    if (!open) return;

    let mounted = true;
    setIsLoading(true);

    const roleFilter = ["Admin", "Ventas", "Manager", "Operaciones", "Marketing", "Distributor"];

    getHubDialogDataAction()
      .then(({ distributors, inventoryItems }) => {
        if (!mounted) return;
        setDistributors(distributors);
        setInventoryItems(inventoryItems);
      })
      .catch(() => {
        if (!mounted) return;
        toast({ title: "Error", description: "No se pudieron cargar los datos necesarios." });
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    
    // Reset state on open
    reset();
    setMode(initialAccount ? "interaccion" : defaultMode);

    return () => {
      mounted = false;
    };
  }, [open, defaultMode, initialAccount, toast, reset]);
  
  React.useEffect(() => {
    selectAccount(initialAccount ?? null);
  }, [initialAccount, selectAccount]);


  const handleSuccess = (
    type: "account" | "interaction" | "order",
    payload: { id: string; accountId?: string; accountName?: string }
  ) => {
    const { id, accountId, accountName } = payload;

    if (type === "account") {
      toast({ title: "Cuenta guardada", description: accountName || "Cuenta actualizada" });
      const createdAccount = { id, name: accountName || "", type: 'HORECA' } as Account;
      selectAccount(createdAccount);
      setAllAccounts(prev => [...prev, createdAccount]);
      setMode("interaccion");
      refreshDataSignature();
      return;
    }

    toast({
      title: type === "interaction" ? "Interacción registrada" : "Pedido creado",
      description: accountName ? `Para “${accountName}”` : "Acción registrada",
    });

    refreshDataSignature();
    onOpenChange(false);
  };
  
  const goCreateFromDraft = () => {
    const newAccountDraft = {
      id: "new",
      name: (draftAccountName || "Nueva cuenta").trim(),
      type: "HORECA",
    } as Account;

    selectAccount(newAccountDraft);
    setAllAccounts(prev => [...prev, newAccountDraft]); // Add to list for the form
    setMode("cuenta");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Acciones rápidas</DialogTitle>
          <DialogDescription>Busca una cuenta, registra una interacción o crea un pedido.</DialogDescription>
        </DialogHeader>

        <AccountAutocompleteInput
          inputValue={inputValue}
          matches={matches}
          selectedAccount={selectedAccount}
          onInputChange={setInputValue}
          onPick={(acc) => {
            selectAccount(acc);
            if (mode === "cuenta") setMode("interaccion");
          }}
          isLoading={isLoading}
        />

        { (mode === "interaccion" || mode === "pedido") && !selectedAccount && (draftAccountName?.trim().length ?? 0) > 0 && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-zinc-800">
            La cuenta <span className="font-medium">“{draftAccountName.trim()}”</span> no existe.
            Puedes seguir o{" "}
            <button type="button" className="underline underline-offset-2" onClick={goCreateFromDraft}>
              rellenar ahora la nueva cuenta
            </button>.
          </div>
        )}

        <Tabs value={mode} onValueChange={(v) => setMode(v as HubMode)} className="w-full mt-3">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="cuenta">Cuenta</TabsTrigger>
            <TabsTrigger value="interaccion">Interacción</TabsTrigger>
            <TabsTrigger value="pedido">Pedido</TabsTrigger>
          </TabsList>

          <TabsContent value="cuenta" className="mt-4">
             <AccountFormCore
                key={`account-form-${selectedAccount?.id || "draft"}`}
                defaultValues={{
                    name: selectedAccount?.name,
                    accountType: 'HORECA', // Default value
                }}
                onCancel={() => onOpenChange(false)}
                onSubmit={async (data) => {
                     setIsSaving(true);
                     const res = await upsertAccountAction({
                        id: selectedAccount?.id !== 'new' ? selectedAccount?.id : undefined,
                        ...data,
                     });
                     handleSuccess("account", { id: res.id, accountName: data.name });
                     setIsSaving(false);
                }}
                isSaving={isSaving}
                teamMembers={teamMembers}
                distributors={distributors}
                parentAccounts={allAccounts}
             />
          </TabsContent>

          <TabsContent value="interaccion" className="mt-4">
            <CreateInteractionForm
              key={`interaction-form-${selectedAccount?.id || "draft"}`}
              selectedAccount={selectedAccount || undefined}
              accountNameFallback={!selectedAccount ? (draftAccountName || "").trim() : undefined}
              onCreated={(iid, accId) => {
                const name = selectedAccount?.name ?? draftAccountName;
                handleSuccess("interaction", { id: iid, accountId: accId, accountName: name });
              }}
            />
          </TabsContent>

          <TabsContent value="pedido" className="mt-4">
            <CreateOrderFormLite
              key={`order-form-${selectedAccount?.id || "draft"}`}
              selectedAccount={selectedAccount || undefined}
              accountNameFallback={!selectedAccount ? (draftAccountName || "").trim() : undefined}
              onCreated={(oid, accId) => {
                const name = selectedAccount?.name ?? draftAccountName;
                handleSuccess("order", { id: oid, accountId: accId, accountName: name });
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}