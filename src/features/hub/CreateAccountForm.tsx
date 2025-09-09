
"use client";

import * as React from "react";
import type { Account, TeamMember, InventoryItem } from "@/types";
import { AccountFormCore } from "@/components/app/account-dialog";
import { accountToForm, type AccountFormValues } from "@/services/account-mapper";
import { upsertAccountAction } from "@/app/(app)/accounts/actions";
import { useToast } from "@/hooks/use-toast";

type Props = {
  initialAccount?: Partial<Account> | null;
  onSaved: (id: string) => void;
  isSaving: boolean;
  setIsSaving: (isSaving: boolean) => void;
  teamMembers: TeamMember[];
  distributors: Account[];
  parentAccounts: Account[];
  inventoryItems: InventoryItem[];
};

export function CreateAccountForm({
  initialAccount,
  onSaved,
  isSaving,
  setIsSaving,
  teamMembers,
  distributors,
  parentAccounts,
}: Props) {
  const { toast } = useToast();

  const defaultValues = React.useMemo(() => {
    return initialAccount ? accountToForm(initialAccount as Account) : undefined;
  }, [initialAccount]);

  const handleSubmit = async (data: AccountFormValues) => {
    setIsSaving(true);
    try {
      const res = await upsertAccountAction({
        id: initialAccount?.id !== 'new' ? initialAccount?.id : undefined,
        ...data,
      });
      toast({
        title: res.op === 'created' ? 'Cuenta Creada' : 'Cuenta Actualizada',
        description: `Se ha guardado "${data.name}".`,
      });
      onSaved(res.id);
    } catch (e: any) {
      toast({
        title: "Error al guardar",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AccountFormCore
      onSubmit={handleSubmit}
      defaultValues={defaultValues}
      teamMembers={teamMembers}
      distributors={distributors}
      parentAccounts={parentAccounts}
      isSaving={isSaving}
    />
  );
}
