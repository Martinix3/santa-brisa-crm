
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
  onOpenChange: (open: boolean) => void;
};

export function CreateAccountForm({ 
  initialAccount, 
  onCreated, 
  allAccounts, 
  allTeamMembers,
  onOpenChange,
}: Props) {
  const { toast } = useToast();

  const handleSave = async (data: Partial<Account>) => {
    try {
      const res = await upsertAccountAction({
        id: initialAccount?.id !== 'new' ? initialAccount?.id : undefined,
        ...data,
      } as any);

      toast({
        title: res.op === "created" ? "Cuenta creada" : "Cuenta actualizada",
        description: data.name,
      });

      onCreated(res.id, data.name!);
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Error al guardar",
        description: e.message || "No se pudo guardar la cuenta.",
        variant: "destructive",
      });
    }
  };
  
  return (
     <div className="p-1">
         <AccountDialog
            isOpen={true} // It's always "open" inside its container
            onOpenChange={() => {}} // Controlled by parent Tabs
            account={initialAccount}
            onSave={handleSave}
            allAccounts={allAccounts}
            allTeamMembers={allTeamMembers}
        />
     </div>
  );
}
