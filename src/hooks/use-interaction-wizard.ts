
"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { saveInteractionFS } from "@/services/interaction-service";
import type { Account, TeamMember, Order, InventoryItem } from "@/types";
import { orderFormSchema, type OrderFormValues } from "@/lib/schemas/order-form-schema";
import { getAccountsAction } from "@/services/server/account-actions";
import { getInventoryItemsAction } from "@/services/server/inventory-actions";
import { RolUsuario as UserRole } from "@ssot";

type UseInteractionWizardReturn = {
  form: ReturnType<typeof useForm<OrderFormValues>>;
  onSubmit: (values: OrderFormValues) => Promise<void>;
  isLoading: boolean;
  isSubmitting: boolean;
  errorLoadingData: boolean; // New state to indicate data loading failure
  availableMaterials: InventoryItem[];
  materialFields: { id: string }[];
  appendMaterial: ReturnType<typeof useFieldArray<OrderFormValues>["append"]>;
  removeMaterial: ReturnType<typeof useFieldArray<OrderFormValues>["remove"]>;
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

  const form = useForm<any>({
    resolver: zodResolver(orderFormSchema),
    mode: "onBlur",
    defaultValues: {
      outcome: "Visita",
      notes: "",
      unidades: undefined,
      precioUnitario: undefined,
      assignedMaterials: [],
      accountId: client?.id,
      clientName: client?.name,
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
        const [{ accounts, teamMembers }, fetchedMaterials] = await Promise.all([
            getAccountsAction(),
            getInventoryItemsAction()
        ]);
        if (!mounted) return;

        setSalesRepsList(
          teamMembers.filter(m => m.role === 'Ventas' || m.role === 'Admin').sort((a, b) => a.name.localeCompare(b.name, "es"))
        );
        setClavadistas(
            teamMembers.filter(m => m.role === 'Clavadista' || m.role === 'Líder Clavadista').sort((a, b) => a.name.localeCompare(b.name, "es"))
        );
        setAvailableMaterials(
          fetchedMaterials.filter(m => Number(m.stock) > 0)
                          .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "es"))
        );
        setDistributorAccounts(
          accounts
            .filter(acc => acc.type === "Distribuidor" || acc.type === "Importador")
            .sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? "", "es"))
        );
      } catch (error: any) {
        toast({
          title: "Error cargando datos",
          description: "No se pudieron cargar los datos necesarios para el formulario.",
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
      clientName: client.name,
      distributorId: client.distributorId ?? undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id, client?.name, client?.distributorId]); 

  const onSubmit = async (values: OrderFormValues) => {
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
