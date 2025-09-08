
"use client";

import * as React from "react";
import AccountDialog from "@/components/app/account-dialog";
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

  const handleSave = async (data: Partial<Account>) => {
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
    }
  };
  
  return (
    <div className="p-1 -m-6">
        <AccountDialog
            isOpen={true} // It's always "open" inside its container
            onOpenChange={(open) => { if(!open) onCancel() }}
            account={initialAccount}
            onSave={handleSave}
            allAccounts={allAccounts}
            allTeamMembers={allTeamMembers}
        />
    </div>
  );
}
