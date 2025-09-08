
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
  // The 'open' and 'onOpenChange' are controlled by the parent Tabs component now.
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
      } as any);

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

  // We render the AccountDialog's content directly, not the dialog itself.
  // This is a placeholder for that refactor. For now, we reuse AccountDialog.
  // To make this work without re-writing the entire form, we can make the Dialog
  // render its content directly if a certain prop is passed.
  // Or, more simply for now, just render the dialog with isOpen=true within its tab.
  // It's not perfect but it's a step.
  
  return (
    <AccountDialog
      isOpen={true} // This will be rendered inside a tab, so it's always "open" relative to its container
      onOpenChange={() => {}} // The parent Tabs component handles visibility
      account={initialAccount}
      onSave={handleSave}
      allAccounts={allAccounts}
      allTeamMembers={allTeamMembers}
    />
  );
}
