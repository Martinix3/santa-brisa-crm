
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
};

export function CreateAccountForm({ 
  initialAccount, 
  onCreated, 
  allAccounts, 
  allTeamMembers 
}: Props) {
  const { toast } = useToast();

  const handleSave = async (data: Partial<Account>) => {
    try {
      const res = await upsertAccountAction({
        id: initialAccount?.id,
        ...data,
      } as any); // Type assertion might be needed depending on upsert function signature

      toast({
        title: res.op === "created" ? "Cuenta creada" : "Cuenta actualizada",
        description: data.name,
      });

      onCreated(res.id, data.name!);
    } catch (e: any) {
      toast({
        title: "Error al guardar",
        description: e.message || "No se pudo guardar la cuenta.",
        variant: "destructive",
      });
    }
  };

  // We render the full AccountDialog but stripped of its Dialog shell
  // The state for this needs to be managed carefully. We pass a fake isOpen=true
  // and an empty onOpenChange because the visibility is controlled by the parent Tabs component.
  return (
    <div className="p-1">
      <AccountDialog
        isOpen={true} // It's always "open" inside its tab
        onOpenChange={() => {}} // Parent controls visibility
        account={initialAccount}
        onSave={handleSave}
        allAccounts={allAccounts}
        allTeamMembers={allTeamMembers}
      />
    </div>
  );
}
