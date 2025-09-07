

"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { getAccountsFS } from "@/services/account-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { getInventoryItemsAction } from "@/services/server/inventory-actions"; 
import { saveInteractionFS } from "@/services/interaction-service";
import type { Account, TeamMember, Order, InventoryItem, UserRole } from "@/types";
import { interactionFormSchema, type InteractionFormValues } from "@/lib/schemas/interaction-schema";

type UseInteractionWizardReturn = {
  form: ReturnType<typeof useForm<InteractionFormValues>>;
  onSubmit: (values: InteractionFormValues) => Promise<void>;
  isLoading: boolean;
  isSubmitting: boolean;
  errorLoadingData: boolean; // New state to indicate data loading failure
  availableMaterials: InventoryItem[];
  materialFields: { id: string }[];
  appendMaterial: ReturnType<typeof useFieldArray<InteractionFormValues>["append"]>;
  removeMaterial: ReturnType<typeof useFieldArray<InteractionFormValues>["remove"]>;
  userRole: UserRole | null;
  salesRepsList: TeamMember[];
  clavadistas: TeamMember[];
  distributorAccounts: Account[];
};

export function useInteractionWizard(
  client: Account | null,
  originatingTask: Order | null,
  onSuccess: () => void,
): UseInteractionWizardReturn {
  const { toast } = useToast();
  const { teamMember, userRole, refreshDataSignature } = useAuth();

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorLoadingData, setErrorLoadingData] = React.useState(false);

  const [availableMaterials, setAvailableMaterials] = React.useState<InventoryItem[]>([]);
  const [salesRepsList, setSalesRepsList] = React.useState<TeamMember[]>([]);
  const [clavadistas, setClavadistas] = React.useState<TeamMember[]>([]);
  const [distributorAccounts, setDistributorAccounts] = React.useState<Account[]>([]);

  const form = useForm<InteractionFormValues>({
    resolver: zodResolver(interactionFormSchema),
    mode: "onBlur",
    defaultValues: {
      outcome: "Visita",
      notes: "",
      unidades: undefined,
      precioUnitario: undefined,
      assignedMaterials: [],
      accountId: client?.id,
      clientName: client?.nombre,
      distributorId: client?.distributorId ?? undefined,
    },
  });

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control: form.control,
    name: "assignedMaterials",
  });

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      setErrorLoadingData(false);
      try {
        const [fetchedAccounts, fetchedSalesReps, fetchedClavadistas, fetchedMaterials] = await Promise.all([
          getAccountsFS(),
          getTeamMembersFS(["SalesRep", "Admin"]),
          getTeamMembersFS(["Clavadista", "Líder Clavadista"]),
          getInventoryItemsAction(),
        ]);
        if (!mounted) return;

        setSalesRepsList(
          [...fetchedSalesReps].sort((a, b) => a.name.localeCompare(b.name, "es"))
        );
        setClavadistas(
          [...fetchedClavadistas].sort((a, b) => a.name.localeCompare(b.name, "es"))
        );
        setAvailableMaterials(
          fetchedMaterials.filter(m => Number(m.stock) > 0)
                          .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "es"))
        );
        setDistributorAccounts(
          fetchedAccounts
            .filter(acc => acc.type === "distributor" || acc.type === "importer")
            .sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? "", "es"))
        );
      } catch (error: any) {
        toast({
          title: "Error cargando datos",
          description: "No se pudieron cargar los materiales o miembros del equipo.",
          variant: "destructive",
        });
        setErrorLoadingData(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  // Sincroniza defaults cuando cambia el cliente
  React.useEffect(() => {
    if (!client) return;
    form.reset({
      ...form.getValues(),
      accountId: client.id,
      clientName: client.nombre,
      distributorId: client.distributorId ?? undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id, client?.nombre, client?.distributorId]); 

  const onSubmit = async (values: InteractionFormValues) => {
    if (!teamMember) {
      toast({ title: "Error", description: "Falta información del usuario.", variant: "destructive" });
      return;
    }
    if (!values.accountId) {
      toast({ title: "Error", description: "Falta seleccionar la cuenta.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await saveInteractionFS(
        values.accountId,
        originatingTask?.id,
        values,
        teamMember.id,
        teamMember.name,
      );
      toast({ title: "¡Interacción registrada!", description: "Se ha guardado el resultado de la visita." });
      // si refreshDataSignature invalida caches, considera await si devuelve promesa
      refreshDataSignature?.();
      onSuccess();
    } catch (e: any) {
      toast({
        title: "Error al guardar",
        description: e?.message ? `No se pudo guardar: ${e.message}` : "No se pudo guardar la interacción.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    onSubmit,
    isLoading,
    isSubmitting,
    errorLoadingData,
    availableMaterials,
    materialFields,
    appendMaterial,
    removeMaterial,
    userRole,
    salesRepsList,
    clavadistas,
    distributorAccounts,
  };
}
