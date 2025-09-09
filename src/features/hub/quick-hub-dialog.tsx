
"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Account, TeamMember } from "@/types";
import { getAccountsFS } from "@/services/account-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { useAuth } from "@/contexts/auth-context";

import { NewAccountHubPanel } from "./NewAccountHubPanel"; // Corrected import
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
  const [isLoading, setIsLoading] = React.useState(true);

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

    Promise.all([getAccountsFS(), getTeamMembersFS(roleFilter)])
      .then(([accounts, members]) => {
        if (!mounted) return;
        setAllAccounts(accounts);
        setTeamMembers(members);
      })
      .catch(() => {
        if (!mounted) return;
        toast({ title: "Error", description: "No se pudieron cargar los datos necesarios." });
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    setMode(initialAccount ? "interaccion" : defaultMode);

    return () => {
      mounted = false;
    };
  }, [open, defaultMode, initialAccount?.id, toast]);

  // Firma unificada y llamadas coherentes
  const handleSuccess = (
    type: "account" | "interaction" | "order",
    payload: { id: string; accountId?: string; accountName?: string }
  ) => {
    const { id, accountId, accountName } = payload;

    if (type === "account") {
      toast({ title: "Cuenta guardada", description: accountName || "Cuenta actualizada" });
      // Selecciona la cuenta guardada y pasa a interacción (UX rápida)
      const a = allAccounts.find(x => x.id === id) || ({ id, name: accountName || "" } as Account);
      selectAccount(a);
      setMode("interaccion");
      // No cierres el diálogo: el user puede registrar ya la interacción
      refreshDataSignature();
      return;
    }

    // Interacción o pedido
    toast({
      title: type === "interaction" ? "Interacción registrada" : "Pedido creado",
      description: accountName ? `Para “${accountName}”` : "Acción registrada",
    });

    refreshDataSignature();
    onOpenChange(false);
  };

  // Invitación no intrusiva (si no existe cuenta y hay texto en Interacción/Pedido)
  const showInviteCreate =
    (mode === "interaccion" || mode === "pedido") &&
    !selectedAccount &&
    (draftAccountName?.trim().length ?? 0) > 0;

  const goCreateFromDraft = () => {
    // Placeholder canónico mínimo
    selectAccount({
      id: "new",
      name: (draftAccountName || "Nueva cuenta").trim(),
      type: "HORECA",
    } as Account);
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

        {/* Autocomplete de cuenta — match por nombre/ciudad; si eliges, selecciona; si editas, des-selecciona y deja borrador */}
        <AccountAutocompleteInput
          inputValue={inputValue}
          matches={matches}
          selectedAccount={selectedAccount}
          onInputChange={setInputValue}
          onPick={(acc) => {
            selectAccount(acc);
            // Si el user estaba en "cuenta" y elige una existente, UX: saltamos a "interacción"
            if (mode === "cuenta") setMode("interaccion");
          }}
          isLoading={isLoading}
        />

        {showInviteCreate && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-zinc-800">
            La cuenta <span className="font-medium">“{draftAccountName.trim()}”</span> no existe.
            Puedes seguir con la {mode === "interaccion" ? "interacción" : "creación del pedido"} sin crearla,
            o{" "}
            <button type="button" className="underline underline-offset-2" onClick={goCreateFromDraft}>
              rellenar ahora la nueva cuenta
            </button>.
          </div>
        )}

        {/* Pestañas SIEMPRE habilitadas */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as HubMode)} className="w-full mt-3">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="cuenta">Cuenta</TabsTrigger>
            <TabsTrigger value="interaccion">Interacción</TabsTrigger>
            <TabsTrigger value="pedido">Pedido</TabsTrigger>
          </TabsList>

          {/* CUENTA */}
          <TabsContent value="cuenta" className="mt-4">
            <NewAccountHubPanel
              key={`account-form-${selectedAccount?.id || "draft"}`}
              initialAccount={
                selectedAccount ??
                ({
                  id: "new",
                  name: draftAccountName || "",
                  type: "HORECA",
                } as Account)
              }
              onCreated={(id, name) => {
                handleSuccess("account", { id, accountName: name });
              }}
              allAccounts={allAccounts}
              allTeamMembers={teamMembers}
              onCancel={() => onOpenChange(false)}
            />
          </TabsContent>

          {/* INTERACCIÓN */}
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

          {/* PEDIDO */}
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
