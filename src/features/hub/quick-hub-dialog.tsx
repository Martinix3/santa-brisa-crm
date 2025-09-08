
"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Account, TeamMember } from "@/types";
import { getAccountsFS } from "@/services/account-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { useAuth } from "@/contexts/auth-context";

// Importar los nuevos componentes de formulario
import { CreateAccountForm } from './CreateAccountForm';
import { CreateInteractionForm } from './CreateInteractionForm';
import { CreateOrderFormLite } from './CreateOrderFormLite';
import { AccountSelector } from "./AccountSelector";

type HubMode = "cuenta" | "interaccion" | "pedido";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialAccount?: Account | null;
  defaultMode?: HubMode;
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
  const { refreshDataSignature } = useAuth();

  const [mode, setMode] = React.useState<HubMode>(defaultMode);
  const [selectedAccount, setSelectedAccount] = React.useState<Account | null>(initialAccount || null);
  const [newAccountName, setNewAccountName] = React.useState<string | null>(null);
  
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (open) {
      setIsLoading(true);
      Promise.all([
        getAccountsFS(),
        getTeamMembersFS(['Ventas', 'Admin', 'Clavadista', 'Líder Clavadista'])
      ]).then(([accounts, members]) => {
        setAllAccounts(accounts);
        setTeamMembers(members);
      }).catch(() => toast({ title: "Error", description: "No se pudieron cargar los datos necesarios."}))
        .finally(() => setIsLoading(false));
      
      setMode(initialAccount ? 'interaccion' : defaultMode);
      setSelectedAccount(initialAccount || null);
      setNewAccountName(null);
    }
  }, [open, defaultMode, initialAccount, toast]);

  const handleSuccess = (type: 'account' | 'interaction' | 'order', id: string, accountId: string) => {
    onOpenChange(false);
    refreshDataSignature();
    if (type === 'account') onAccountCreated?.(id);
    if (type === 'interaction') onInteractionCreated?.(id, accountId);
    if (type === 'order') onOrderCreated?.(id, accountId);
  };

  const handleAccountSelection = (account: Account | null) => {
    setSelectedAccount(account);
    setNewAccountName(null); // Clear new name if an existing one is selected
    if(account) {
        if (mode === 'cuenta') setMode('interaccion');
    } else {
        setMode('cuenta');
    }
  };

  const handleGoCreateAccount = (name: string) => {
      setSelectedAccount(null);
      setNewAccountName(name);
      setMode('cuenta');
  }
  
  const distributors = React.useMemo(() => allAccounts.filter(a => a.type === 'Distribuidor' || a.type === 'Importador'), [allAccounts]);

  const accountForForm = selectedAccount || (newAccountName ? { name: newAccountName } : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Acciones rápidas</DialogTitle>
          <DialogDescription>
            Busca una cuenta, registra una interacción o crea un pedido.
          </DialogDescription>
        </DialogHeader>

        <AccountSelector
            accounts={allAccounts}
            selectedAccount={selectedAccount}
            onAccountSelected={handleAccountSelection}
            onGoCreateAccount={handleGoCreateAccount}
            isLoading={isLoading}
        />

        <Tabs value={mode} onValueChange={(v) => setMode(v as HubMode)} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="cuenta">Cuenta</TabsTrigger>
            <TabsTrigger value="interaccion" disabled={!selectedAccount}>Interacción</TabsTrigger>
            <TabsTrigger value="pedido" disabled={!selectedAccount}>Pedido</TabsTrigger>
          </TabsList>

          <TabsContent value="cuenta" className="mt-4">
            <CreateAccountForm
              key={`account-form-${selectedAccount?.id || newAccountName || 'new'}`}
              initialAccount={accountForForm}
              onCreated={(id, name) => {
                toast({ title: "Cuenta creada", description: name });
                handleSuccess('account', id, id);
              }}
              allAccounts={allAccounts}
              allTeamMembers={teamMembers}
            />
          </TabsContent>

          <TabsContent value="interaccion" className="mt-4">
             {selectedAccount && (
                 <CreateInteractionForm
                    key={`interaction-form-${selectedAccount.id}`}
                    selectedAccount={selectedAccount}
                    onCreated={(iid, accId) => {
                        toast({ title: "Interacción registrada" });
                        handleSuccess('interaction', iid, accId);
                    }}
                />
             )}
          </TabsContent>

          <TabsContent value="pedido" className="mt-4">
            {selectedAccount && (
                <CreateOrderFormLite
                    key={`order-form-${selectedAccount.id}`}
                    selectedAccount={selectedAccount}
                    onCreated={(oid, accId) => {
                        toast({ title: "Pedido creado" });
                        handleSuccess('order', oid, accId);
                    }}
                />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
