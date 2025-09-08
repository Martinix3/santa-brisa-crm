
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
    }
  }, [open, defaultMode, initialAccount, toast]);

  const handleSuccess = (type: 'account' | 'interaction' | 'order', id: string, accountId?: string, accountName?: string) => {
    onOpenChange(false);
    refreshDataSignature();
    
    // If a new account was implicitly created, guide the user to edit it.
    if ((type === 'interaction' || type === 'order') && !accountId) {
       toast({
          title: "Acción registrada",
          description: `Se ha creado la interacción/pedido para "${accountName}". Ahora, por favor completa los datos de la nueva cuenta.`
       });
       // Here you could programmatically switch the tab and set the account,
       // for a more advanced flow.
       // For now, we just close and let the user re-open.
    }
    
  };

  const handleAccountSelection = (account: Account | null) => {
    setSelectedAccount(account);
    if(account) {
        if (mode === 'cuenta') setMode('interaccion');
    } else {
        setMode('cuenta');
    }
  };

  const handleGoCreateAccount = (name: string) => {
      setSelectedAccount({ name, id: 'new' } as Partial<Account> as Account); 
      setMode('cuenta');
  }

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
            <TabsTrigger value="interaccion">Interacción</TabsTrigger>
            <TabsTrigger value="pedido">Pedido</TabsTrigger>
          </TabsList>

          <TabsContent value="cuenta" className="mt-4">
            <CreateAccountForm
              key={`account-form-${selectedAccount?.id || 'new'}`}
              initialAccount={selectedAccount}
              onCreated={(id, name) => {
                toast({ title: "Cuenta creada/actualizada", description: name });
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
                        handleSuccess('interaction', iid, accId, selectedAccount.name);
                    }}
                />
             )}
              {!selectedAccount && <div className="text-center p-4 text-muted-foreground">Selecciona o crea una cuenta para registrar una interacción.</div>}
          </TabsContent>

          <TabsContent value="pedido" className="mt-4">
            {selectedAccount && (
                <CreateOrderFormLite
                    key={`order-form-${selectedAccount.id}`}
                    selectedAccount={selectedAccount}
                    onCreated={(oid, accId) => {
                        handleSuccess('order', oid, accId, selectedAccount.name);
                    }}
                />
            )}
            {!selectedAccount && <div className="text-center p-4 text-muted-foreground">Selecciona o crea una cuenta para registrar un pedido.</div>}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
