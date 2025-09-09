
"use client";

import * as React from "react";
import { AccountFormCore } from "@/components/app/account-dialog";
import type { Account, TeamMember } from "@/types";
import { upsertAccountAction } from "@/app/(app)/accounts/actions";
import { useToast } from "@/hooks/use-toast";
import type { AccountFormValues } from "@/lib/schemas/account-schema";
import { formToAccountPartial, accountToForm } from "@/services/account-mapper";

type Props = {
  initialAccount: Partial<Account> | null;
  onCreated: (id: string, name: string) => void;
  allAccounts: Account[];
  allTeamMembers: TeamMember[];
  onCancel: () => void;
};

export function CreateAccountForm({ 
  initialAccount, 
  onCreated, 
  allAccounts, 
  allTeamMembers,
  onCancel,
}: Props) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSubmit = async (data: AccountFormValues) => {
    setIsSaving(true);
    try {
      const patch = formToAccountPartial(data);
      const res = await upsertAccountAction({
        id: initialAccount?.id !== 'new' ? initialAccount?.id : undefined,
        ...patch,
      } as any);

      onCreated(res.id, data.name!);
    } catch (e: any) {
      toast({
        title: "Error al guardar",
        description: e.message || "No se pudo guardar la cuenta.",
        variant: "destructive",
      });
    } finally {
        setIsSaving(false);
    }
  };

  const distributors = React.useMemo(() => {
    return allAccounts.filter(a => a.accountType === "DISTRIBUIDOR" || a.accountType === "IMPORTADOR").map(a => ({ id: a.id, name: a.name }));
  }, [allAccounts]);
  
  const parentAccounts = React.useMemo(() => {
    return allAccounts.map(a => ({ id: a.id, name: a.name }));
  }, [allAccounts]);
  
  return (
    <AccountFormCore
        onSubmit={handleSubmit}
        onCancel={onCancel}
        defaultValues={initialAccount ? accountToForm(initialAccount as Account) : undefined}
        teamMembers={allTeamMembers}
        distributors={distributors}
        parentAccounts={parentAccounts}
        isSaving={isSaving}
    />
  );
}
