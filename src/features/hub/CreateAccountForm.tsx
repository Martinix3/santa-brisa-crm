
"use client";

import * as React from "react";
import { AccountForm } from "@/components/app/account-dialog";
import type { Account, TeamMember } from "@/types";
import { upsertAccountAction } from "@/app/(app)/accounts/actions";
import { useToast } from "@/hooks/use-toast";

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

  const handleSave = async (data: Partial<Account>) => {
    setIsSaving(true);
    try {
      const res = await upsertAccountAction({
        id: initialAccount?.id !== 'new' ? initialAccount?.id : undefined,
        ...data,
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
  
  return (
    <AccountForm
        account={initialAccount}
        onSave={handleSave}
        allAccounts={allAccounts}
        allTeamMembers={allTeamMembers}
        isSaving={isSaving}
        onCancel={onCancel}
    />
  );
}
