
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getAccountsFS } from "@/services/account-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { getInventoryItemsFS } from "@/services/inventory-item-service";
import { addOrderFS } from "@/services/order-service";
import type { Account, TeamMember, Order, InventoryItem, OrderFormValues } from "@/types";
import { orderFormSchema, type Step } from '@/lib/schemas/order-form-schema';

export function useOrderFormWizard(
    initialClient: Account | null,
    originatingTask: Order | null
) {
  const { toast } = useToast();
  const router = useRouter();
  const { teamMember, userRole, refreshDataSignature } = useAuth();
  
  const [step, setStep] = React.useState<Step>("outcome");
  const [client, setClient] = React.useState<Account | null>(initialClient);
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([]);
  const [salesRepsList, setSalesRepsList] = React.useState<TeamMember[]>([]);
  const [clavadistas, setClavadistas] = React.useState<TeamMember[]>([]);
  const [availableMaterials, setAvailableMaterials] = React.useState<InventoryItem[]>([]);
  const [distributorAccounts, setDistributorAccounts] = React.useState<Account[]>([]);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    mode: "onBlur",
    defaultValues: {
      isNewClient: false,
      outcome: undefined,
      distributorId: undefined,
      clavadistaId: undefined,
      canalOrigenColocacion: undefined,
      notes: "",
      assignedMaterials: [],
      paymentMethod: undefined,
      iban: "",
      numberOfUnits: undefined,
      unitPrice: undefined,
      nextActionType: undefined,
      nextActionCustom: "",
      nextActionDate: undefined,
      selectedSalesRepId: undefined,
      clavadistaSelectedSalesRepId: undefined,
      failureReasonType: undefined,
      failureReasonCustom: "",
      nombreFiscal: "",
      cif: "",
      direccionFiscal_street: "",
      direccionFiscal_number: "",
      direccionFiscal_city: "",
      direccionFiscal_province: "",
      direccionFiscal_postalCode: "",
      direccionFiscal_country: "España",
      sameAsBilling: true,
      direccionEntrega_street: "",
      direccionEntrega_number: "",
      direccionEntrega_city: "",
      direccionEntrega_province: "",
      direccionEntrega_postalCode: "",
      direccionEntrega_country: "España",
      contactoNombre: "",
      contactoCorreo: "",
      contactoTelefono: "",
      observacionesAlta: "",
      userRole: userRole,
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
        
        setAllAccounts(fetchedAccounts);
        setSalesRepsList(fetchedSalesReps);
        setClavadistas(fetchedClavadistas);
        setAvailableMaterials(fetchedMaterials.filter(m => m.stock > 0));
        setDistributorAccounts(fetchedAccounts.filter(acc => acc.type === 'Distribuidor' || acc.type === 'Importador'));
      } catch (error) {
        toast({ title: "Error", description: "No se pudieron cargar los datos necesarios.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [toast]);
  
  React.useEffect(() => {
    if(client) {
      const isNew = !client.id || client.id === 'new';
      form.setValue('isNewClient', isNew);
      form.setValue('clientName', client.nombre);
      if(!isNew) {
        form.setValue('accountId', client.id);
        // Pre-fill data for existing client
        form.setValue('nombreFiscal', client.legalName || '');
        form.setValue('cif', client.cif || '');
        // ... etc
      }
    }
    if (originatingTask) {
        setStep('outcome');
    } else {
        setStep('details');
    }
  }, [client, originatingTask, form]);


  const handleBack = () => {
    if (step === "details") setStep("outcome");
    if (step === "verify") setStep("details");
  };

  const handleNextStep = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    if (step === 'details') {
      setStep('verify');
    }
  };
  
  const onSubmit = async (values: OrderFormValues) => {
    if (!teamMember) {
        toast({ title: "Error", description: "No se pudo identificar al usuario.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    
    // Logic to save the data...
    try {
      await addOrderFS(values, originatingTask?.id);
      toast({ title: "¡Interacción Registrada!", description: "Se ha guardado el resultado de la visita." });
      refreshDataSignature();
      router.push('/accounts');
    } catch(e: any) {
       toast({ title: "Error al Guardar", description: `No se pudo guardar la interacción: ${e.message}`, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return {
    form, 
    client, 
    originatingTask, 
    isLoading, 
    isSubmitting,
    step,
    setStep,
    handleBack,
    handleNextStep,
    onSubmit,
    availableMaterials,
    userRole,
    salesRepsList,
    clavadistas,
    distributorAccounts,
    teamMember
  };
}
