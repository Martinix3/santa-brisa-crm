
"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { orderFormSchema, type OrderFormValues } from "@/lib/schemas/order-form-schema";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { addAccountFS, getAccountsFS, getAccountByIdFS } from "@/services/account-service";
import { addOrderFS, getOrderByIdFS } from "@/services/order-service";
import { getInventoryItemsFS } from "@/services/inventory-item-service";
import type { Account, InventoryItem, TeamMember, Order, AccountFormValues as AccountFormValuesType } from "@/types";
import { format } from 'date-fns';
import { getTeamMembersFS } from "@/services/team-member-service";


export function useOrderFormWizard(
    initialClient: Account | { id: 'new'; nombre: string } | null = null,
    initialOriginatingTask: Order | null = null
) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { teamMember, userRole, refreshDataSignature } = useAuth();
  
  const [step, setStep] = React.useState<'client' | 'outcome' | 'details' | 'verify'>('client');
  const [isLoading, setIsLoading] = React.useState(true);
  const [client, setClient] = React.useState(initialClient);
  const [originatingTask, setOriginatingTask] = React.useState(initialOriginatingTask);
  
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([]);
  const [availableMaterials, setAvailableMaterials] = React.useState<InventoryItem[]>([]);
  const [salesRepsList, setSalesRepsList] = React.useState<TeamMember[]>([]);
  const [clavadistas, setClavadistas] = React.useState<TeamMember[]>([]);
  const [distributorAccounts, setDistributorAccounts] = React.useState<Account[]>([]);
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState('');
  
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    mode: "onBlur",
    defaultValues: {
      userRole: userRole,
      isNewClient: false,
      outcome: undefined,
      distributorId: undefined,
      clavadistaId: userRole === 'Clavadista' ? teamMember?.id : undefined,
      selectedSalesRepId: userRole === 'Admin' ? '##ADMIN_SELF##' : teamMember?.id,
      clavadistaSelectedSalesRepId: undefined,
      paymentMethod: 'Adelantado',
      sameAsBilling: true,
      assignedMaterials: [],
    },
  });

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({ control: form.control, name: "assignedMaterials" });
  
  React.useEffect(() => {
    const handler = setTimeout(() => { setDebouncedSearchTerm(searchTerm); }, 300);
    return () => { clearTimeout(handler); };
  }, [searchTerm]);

  const filteredAccounts = React.useMemo(() => {
    if (!debouncedSearchTerm) return [];
    return allAccounts.filter(acc =>
      acc.nombre.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (acc.cif && acc.cif.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
    );
  }, [debouncedSearchTerm, allAccounts]);

  const onFormError = (errors: any) => {
    console.error("Form validation errors:", errors);
    const firstError = Object.values(errors)[0];
    const errorMessage = typeof firstError?.message === 'string' ? firstError.message : "Por favor, revisa los campos marcados en rojo.";
    toast({ title: "Error de Validación", description: errorMessage, variant: "destructive" });
  };
  
  React.useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      const taskId = searchParams.get('originatingTaskId');
      const accountId = searchParams.get('accountId');

      try {
        const [
          fetchedAccounts, 
          fetchedMaterials, 
          fetchedSalesReps, 
          fetchedClavadistas
        ] = await Promise.all([
          getAccountsFS(),
          getInventoryItemsFS(),
          getTeamMembersFS(['Admin', 'SalesRep']),
          getTeamMembersFS(['Clavadista', 'Líder Clavadista']),
        ]);

        setAllAccounts(fetchedAccounts);
        setAvailableMaterials(fetchedMaterials.filter(m => m.latestPurchase?.calculatedUnitCost && m.latestPurchase.calculatedUnitCost > 0));
        setSalesRepsList(fetchedSalesReps);
        setClavadistas(fetchedClavadistas);
        setDistributorAccounts(fetchedAccounts.filter(acc => acc.type === 'Distribuidor' || acc.type === 'Importador'));

        if (taskId) {
          const task = await getOrderByIdFS(taskId);
          if (task) {
            const taskClient = await getAccountByIdFS(task.accountId || '');
            setOriginatingTask(task);
            if (taskClient) setClient(taskClient);
            setStep('outcome');
          }
        } else if (accountId) {
            const preselectedClient = await getAccountByIdFS(accountId);
            if (preselectedClient) {
              setClient(preselectedClient);
              form.setValue('isNewClient', false);
              form.setValue('clientName', preselectedClient.nombre);
              setStep('details');
            }
        } else {
            setStep('client');
        }

      } catch (error) {
        toast({ title: "Error", description: "No se pudieron cargar los datos necesarios para el formulario.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [searchParams, toast, form]);


  const handleClientSelect = (selectedClient: Account | { id: 'new'; nombre: string }) => {
    setClient(selectedClient);
    const isNew = selectedClient.id === 'new';
    form.setValue('isNewClient', isNew);
    form.setValue('clientName', selectedClient.nombre);
    if (!isNew) {
      form.setValue('accountId', selectedClient.id);
    } else {
      form.setValue('accountId', undefined);
    }
    setStep('details');
  };
  
  const handleBack = () => {
    if (step === 'outcome') setStep('client');
    else if (step === 'details') setStep('outcome');
    else if (step === 'verify') setStep('details');
  };

  const handleNextStep = async () => {
    const isValid = await form.trigger();
    if (isValid) setStep('verify');
    else onFormError(form.formState.errors);
  };

  const onSubmit = async (values: OrderFormValues) => {
    if (!teamMember) return;
    
    form.clearErrors(); // Clear previous errors
    
    let salesRepName = teamMember.name;
    let salesRepId = teamMember.id;
    if (userRole === 'Admin' && values.selectedSalesRepId && values.selectedSalesRepId !== '##ADMIN_SELF##') {
        const rep = salesRepsList.find(r => r.id === values.selectedSalesRepId);
        if(rep) { salesRepName = rep.name; salesRepId = rep.id; }
    } else if (userRole === 'Clavadista' && values.clavadistaSelectedSalesRepId) {
        const rep = salesRepsList.find(r => r.id === values.clavadistaSelectedSalesRepId);
        if(rep) { salesRepName = rep.name; salesRepId = rep.id; }
    }
    
    try {
        let accountIdToSave: string | undefined = client && client.id !== 'new' ? client.id : undefined;
        let distributorIdToSave: string | undefined = client && client.id !== 'new' ? (client as Account).distributorId : (values.distributorId === '##DIRECT##' ? undefined : values.distributorId);

        if (values.isNewClient && client) {
            const newAccountData: Partial<AccountFormValuesType> = {
                name: client.nombre, legalName: values.nombreFiscal, cif: values.cif, type: 'HORECA',
                salesRepId: salesRepId, distributorId: distributorIdToSave,
                addressBilling: { street: values.direccionFiscal_street, number: values.direccionFiscal_number, city: values.direccionFiscal_city, province: values.direccionFiscal_province, postalCode: values.direccionFiscal_postalCode, country: 'España' },
                addressShipping: values.sameAsBilling ? { street: values.direccionFiscal_street, number: values.direccionFiscal_number, city: values.direccionFiscal_city, province: values.direccionFiscal_province, postalCode: values.direccionFiscal_postalCode, country: 'España' } : { street: values.direccionEntrega_street, number: values.direccionEntrega_number, city: values.direccionEntrega_city, province: values.direccionEntrega_province, postalCode: values.direccionEntrega_postalCode, country: 'España' },
                mainContactName: values.contactoNombre, mainContactEmail: values.contactoCorreo, mainContactPhone: values.contactoTelefono, notes: values.observacionesAlta
            };
            accountIdToSave = await addAccountFS(newAccountData as AccountFormValuesType);
        }

        const baseData: Partial<Order> = {
            clientName: client?.nombre || 'Desconocido', accountId: accountIdToSave, visitDate: new Date().toISOString(), salesRep: salesRepName,
            clavadistaId: userRole === 'Clavadista' ? teamMember.id : (values.clavadistaId === '##NONE##' ? undefined : values.clavadistaId),
            assignedMaterials: values.assignedMaterials || [], canalOrigenColocacion: values.canalOrigenColocacion, notes: values.notes,
            clientStatus: values.isNewClient ? 'new' : 'existing', originatingTaskId: originatingTask?.id, distributorId: distributorIdToSave,
        };

        if (values.outcome === 'successful') {
             const subtotal = (values.numberOfUnits || 0) * (values.unitPrice || 0);
             const totalValue = subtotal * 1.21;
             await addOrderFS({ ...baseData, status: 'Confirmado', products: ["Santa Brisa 750ml"], numberOfUnits: values.numberOfUnits, unitPrice: values.unitPrice, value: totalValue, paymentMethod: values.paymentMethod }, originatingTask?.id);
        } else if (values.outcome === 'follow-up') {
            await addOrderFS({ ...baseData, status: 'Seguimiento', nextActionType: values.nextActionType, nextActionCustom: values.nextActionType === 'Opción personalizada' ? values.nextActionCustom : '', nextActionDate: values.nextActionDate ? format(values.nextActionDate, 'yyyy-MM-dd') : undefined }, originatingTask?.id);
        } else if (values.outcome === 'failed') {
            await addOrderFS({ ...baseData, status: 'Fallido', failureReasonType: values.failureReasonType, failureReasonCustom: values.failureReasonType === 'Otro (especificar)' ? values.failureReasonCustom : '' }, originatingTask?.id);
        }
        
        refreshDataSignature();
        toast({ title: "Interacción Registrada", description: "Se ha guardado el resultado de tu visita." });
        router.push('/accounts');
        
    } catch (err: any) {
        toast({ title: "Error al Guardar", description: `No se pudo guardar la interacción: ${err.message}`, variant: "destructive" });
    }
  };

  return {
    form,
    step,
    setStep,
    client,
    originatingTask,
    handleClientSelect,
    searchTerm,
    setSearchTerm,
    filteredAccounts,
    debouncedSearchTerm,
    handleBack,
    handleNextStep,
    isSubmitting: form.formState.isSubmitting,
    isLoading,
    availableMaterials,
    materialFields,
    appendMaterial,
    removeMaterial,
    userRole,
    salesRepsList,
    clavadistas,
    distributorAccounts,
    onSubmit,
    onFormError,
  };
}
