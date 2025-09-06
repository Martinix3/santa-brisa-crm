
"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getAccountsFS } from "@/services/account-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { getInventoryItemsFS } from "@/services/inventory-item-service";
import { addOrderFS } from "@/services/order-service";
import type { Account, TeamMember, Order, InventoryItem } from "@/types";
import { interactionFormSchema, type InteractionFormValues } from '@/lib/schemas/interaction-schema';
import { saveInteractionFS } from "@/services/interaction-service";


export function useInteractionWizard(
    client: Account | { id: 'new'; nombre: string } | null,
    originatingTask: Order | null
) {
  const { toast } = useToast();
  const router = useRouter();
  const { teamMember, userRole, refreshDataSignature } = useAuth();
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [availableMaterials, setAvailableMaterials] = React.useState<InventoryItem[]>([]);
  const [salesRepsList, setSalesRepsList] = React.useState<TeamMember[]>([]);
  const [clavadistas, setClavadistas] = React.useState<TeamMember[]>([]);
  const [distributorAccounts, setDistributorAccounts] = React.useState<Account[]>([]);

  const form = useForm<InteractionFormValues>({
    resolver: zodResolver(interactionFormSchema),
    mode: "onBlur",
    defaultValues: {
      outcome: 'Visita',
      notes: "",
      unidades: undefined,
      precioUnitario: undefined,
    },
  });

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [
          fetchedAccounts,
          fetchedSalesReps,
          fetchedClavadistas,
          fetchedMaterials
        ] = await Promise.all([
          getAccountsFS(),
          getTeamMembersFS(['SalesRep', 'Admin']),
          getTeamMembersFS(['Clavadista', 'Líder Clavadista']),
          getInventoryItemsFS()
        ]);
        
        setSalesRepsList(fetchedSalesReps);
        setClavadistas(fetchedClavadistas);
        setAvailableMaterials(fetchedMaterials.filter(m => m.stock > 0));
        setDistributorAccounts(fetchedAccounts.filter(acc => acc.type === 'Distribuidor' || acc.type === 'Importador'));
      } catch (error) {
        toast({ title: "Error", description: "No se pudieron cargar los datos necesarios para el diálogo.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [toast]);
  
  React.useEffect(() => {
    if(client && client.id === 'new') { // New client from search
       form.setValue('clientName', client.nombre);
       form.setValue('isNewClient', true);
    } else if (client) { // Existing client
       form.setValue('isNewClient', false);
       form.setValue('accountId', client.id);
       form.setValue('clientName', client.nombre);
       form.setValue('distributorId', client.distributorId || undefined);
    }
    if (originatingTask) {
        // You can pre-fill from originating task if needed
    }
  }, [client, originatingTask, form]);


  const onSubmit = async (values: InteractionFormValues) => {
    if (!teamMember || !client) {
        toast({ title: "Error", description: "Falta información del cliente o del usuario.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    
    try {
      await saveInteractionFS(client.id, originatingTask?.id, values, teamMember.id, teamMember.name);
      toast({ title: "¡Interacción Registrada!", description: "Se ha guardado el resultado de la visita." });
      refreshDataSignature();
      // Let parent component handle closing
    } catch(e: any) {
       toast({ title: "Error al Guardar", description: `No se pudo guardar la interacción: ${e.message}`, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return {
    form, 
    onSubmit,
    isLoading, 
    isSubmitting,
    availableMaterials,
    userRole,
    salesRepsList,
    clavadistas,
    distributorAccounts,
  };
}
