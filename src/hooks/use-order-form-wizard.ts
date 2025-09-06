
"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { orderFormSchema, type OrderFormValues, type Step } from "@/lib/schemas/order-form-schema";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getAccountsFS, addAccountFS } from "@/services/account-service";
import { addOrderFS, getOrderByIdFS } from "@/services/order-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { getInventoryItemsFS } from "@/services/inventory-item-service";
import type { Account, InventoryItem, TeamMember, Order, AccountFormValues as AccountFormValuesType } from "@/types";
import { format, parseISO } from 'date-fns';

export function useOrderFormWizard() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { teamMember, userRole, refreshDataSignature } = useAuth();

  const [step, setStep] = React.useState<Step>("client");
  const [client, setClient] = React.useState<Account | { id: 'new'; nombre: string } | null>(null);
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [originatingTask, setOriginatingTask] = React.useState<Order | null>(null);

  const [allAccounts, setAllAccounts] = React.useState<Account[]>([]);
  const [availableMaterials, setAvailableMaterials] = React.useState<InventoryItem[]>([]);
  const [salesRepsList, setSalesRepsList] = React.useState<TeamMember[]>([]);
  const [clavadistas, setClavadistas] = React.useState<TeamMember[]>([]);
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("");

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const filteredAccounts = React.useMemo(() => {
    if (!debouncedSearchTerm) return [];
    return allAccounts.filter(acc =>
      (acc.nombre && acc.nombre.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
      (acc.cif && acc.cif.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
    );
  }, [debouncedSearchTerm, allAccounts]);
  
  const distributorAccounts = React.useMemo(() => {
    return allAccounts.filter(acc => acc.type === 'Distribuidor' || acc.type === 'Importador');
  }, [allAccounts]);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    mode: "onBlur",
    defaultValues: {
      userRole: userRole,
      isNewClient: false,
      outcome: undefined,
      distributorId: undefined,
      clavadistaId: undefined,
      selectedSalesRepId: undefined,
      clavadistaSelectedSalesRepId: undefined,
      canalOrigenColocacion: undefined,
      paymentMethod: undefined,
      iban: undefined,
      clientType: undefined,
      numberOfUnits: undefined,
      unitPrice: undefined,
      nombreFiscal: '',
      cif: '',
      direccionFiscal_street: '',
      direccionFiscal_number: '',
      direccionFiscal_city: '',
      direccionFiscal_province: '',
      direccionFiscal_postalCode: '',
      direccionFiscal_country: 'España',
      sameAsBilling: true,
      direccionEntrega_street: '',
      direccionEntrega_number: '',
      direccionEntrega_city: '',
      direccionEntrega_province: '',
      direccionEntrega_postalCode: '',
      direccionEntrega_country: 'España',
      contactoNombre: '',
      contactoCorreo: '',
      contactoTelefono: '',
      observacionesAlta: '',
      nextActionType: undefined,
      nextActionCustom: '',
      nextActionDate: undefined,
      failureReasonType: undefined,
      failureReasonCustom: '',
      notes: '',
      assignedMaterials: [],
    },
  });

  const { control, setValue, reset } = form;
  
  const {
    fields: materialFields,
    append: appendMaterial,
    remove: removeMaterial,
  } = useFieldArray({
    control,
    name: "assignedMaterials",
  });

  React.useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const [accounts, materials, reps, clavas] = await Promise.all([
          getAccountsFS(),
          getInventoryItemsFS(),
          getTeamMembersFS(['Admin', 'SalesRep']),
          getTeamMembersFS(['Clavadista']),
        ]);
        setAllAccounts(accounts);
        setAvailableMaterials(materials.filter(m => m.latestPurchase && m.latestPurchase.calculatedUnitCost > 0));
        setSalesRepsList(reps);
        setClavadistas(clavas);
        
        const taskId = searchParams.get('originatingTaskId');
        const accountId = searchParams.get('accountId');

        if (taskId) {
            const task = await getOrderByIdFS(taskId);
            if (task) {
                setOriginatingTask(task);
                let taskAccount = null;
                if(task.accountId) {
                    taskAccount = accounts.find(acc => acc.id === task.accountId);
                } else if(task.clientName) {
                    taskAccount = accounts.find(acc => acc.nombre.toLowerCase().trim() === task.clientName.toLowerCase().trim());
                }

                if (taskAccount) {
                    handleClientSelect(taskAccount);
                } else {
                    handleClientSelect({ id: 'new', nombre: task.clientName });
                }
            }
        } else if (accountId) {
            const account = accounts.find(acc => acc.id === accountId);
            if(account) {
                setClient(account);
                setValue('isNewClient', false);
                setStep("details"); // Go directly to details
            }
        }

      } catch (error) {
        toast({ title: "Error", description: "No se pudieron cargar los datos necesarios.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [searchParams]);

  const handleClientSelect = (selectedClient: Account | { id: 'new'; nombre: string }) => {
    setClient(selectedClient);
    const isNew = selectedClient.id === 'new';
    setValue('isNewClient', isNew);
    if (!isNew) {
      setValue('distributorId', (selectedClient as Account).distributorId || '##DIRECT##');
    }
    setStep("outcome");
  };

  const handleBack = () => {
    if (step === "outcome") setStep("client");
    else if (step === "details") setStep("outcome");
    else if (step === "verify") setStep("details");
  };

  const handleNextStep = async () => {
    let isValid = false;
    switch (step) {
      case "details":
        isValid = await form.trigger(["numberOfUnits", "unitPrice", "paymentMethod", "iban", "nextActionType", "nextActionCustom", "failureReasonType", "failureReasonCustom", "nombreFiscal", "cif", "direccionFiscal_street", "direccionFiscal_city", "direccionFiscal_province", "direccionFiscal_postalCode", "direccionEntrega_street", "direccionEntrega_city", "direccionEntrega_province", "direccionEntrega_postalCode", "assignedMaterials"]);
        break;
      default:
        isValid = true;
    }
    if (isValid) {
      setStep("verify");
    }
  };

  const onSubmit = async (values: OrderFormValues) => {
    if (!teamMember) {
        toast({ title: "Error", description: "No se pudo identificar al usuario.", variant: "destructive" });
        return;
    }
    
    const subtotal = (values.numberOfUnits || 0) * (values.unitPrice || 0);
    const totalValue = subtotal * 1.21;
    let salesRepName = teamMember.name;
    
    if (userRole === 'Admin' && values.selectedSalesRepId === '##ADMIN_SELF##') {
        salesRepName = teamMember.name;
    } else if (userRole === 'Admin' && values.selectedSalesRepId) {
        const rep = salesRepsList.find(r => r.id === values.selectedSalesRepId);
        if (rep) salesRepName = rep.name;
    } else if (userRole === 'Clavadista' && values.clavadistaSelectedSalesRepId) {
        const rep = salesRepsList.find(r => r.id === values.clavadistaSelectedSalesRepId);
        if (rep) salesRepName = rep.name;
    }

    try {
        let accountIdToSave: string | undefined = undefined;
        let distributorIdToSave: string | undefined;

        if (values.isNewClient && client) {
          distributorIdToSave = values.distributorId === '##DIRECT##' ? undefined : values.distributorId;
          const newAccountData: Partial<AccountFormValuesType> = {
            name: client.nombre,
            legalName: values.nombreFiscal,
            cif: values.cif,
            type: 'HORECA',
            salesRepId: salesRepsList.find(r => r.name === salesRepName)?.id,
            distributorId: distributorIdToSave,
            addressBilling: {
              street: values.direccionFiscal_street || null,
              number: values.direccionFiscal_number || null,
              city: values.direccionFiscal_city || null,
              province: values.direccionFiscal_province || null,
              postalCode: values.direccionFiscal_postalCode || null,
              country: values.direccionFiscal_country || 'España',
            },
            addressShipping: values.sameAsBilling
              ? {
                  street: values.direccionFiscal_street || null,
                  number: values.direccionFiscal_number || null,
                  city: values.direccionFiscal_city || null,
                  province: values.direccionFiscal_province || null,
                  postalCode: values.direccionFiscal_postalCode || null,
                  country: values.direccionFiscal_country || 'España',
                }
              : {
                  street: values.direccionEntrega_street || null,
                  number: values.direccionEntrega_number || null,
                  city: values.direccionEntrega_city || null,
                  province: values.direccionEntrega_province || null,
                  postalCode: values.direccionEntrega_postalCode || null,
                  country: values.direccionEntrega_country || 'España',
                },
            mainContactName: values.contactoNombre,
            mainContactEmail: values.contactoCorreo,
            mainContactPhone: values.contactoTelefono,
            notes: values.observacionesAlta
          };
          accountIdToSave = await addAccountFS(newAccountData as AccountFormValuesType);
        } else if (client && client.id !== 'new') {
            accountIdToSave = client.id;
            distributorIdToSave = (client as Account).distributorId;
        }

        const baseData: Partial<Order> = {
            clientName: client?.nombre || 'Desconocido',
            accountId: accountIdToSave,
            visitDate: new Date().toISOString(),
            salesRep: salesRepName,
            clavadistaId: userRole === 'Clavadista' ? teamMember.id : values.clavadistaId,
            assignedMaterials: values.assignedMaterials || [],
            canalOrigenColocacion: values.canalOrigenColocacion,
            notes: values.notes,
            clientStatus: values.isNewClient ? 'new' : 'existing',
            originatingTaskId: originatingTask?.id,
            distributorId: distributorIdToSave,
        };

        if (values.outcome === 'successful') {
             const orderData: Partial<Order> = {
                ...baseData,
                status: 'Confirmado',
                products: ["Santa Brisa 750ml"],
                numberOfUnits: values.numberOfUnits,
                unitPrice: values.unitPrice,
                value: totalValue,
                paymentMethod: values.paymentMethod,
            };
            await addOrderWithTaskUpdate(orderData);
            
        } else if (values.outcome === 'follow-up') {
            const orderData: Partial<Order> = {
                ...baseData,
                status: 'Seguimiento',
                nextActionType: values.nextActionType,
                nextActionCustom: values.nextActionType === 'Opción personalizada' ? values.nextActionCustom : '',
                nextActionDate: values.nextActionDate ? format(values.nextActionDate, 'yyyy-MM-dd') : undefined,
            };
            await addOrderWithTaskUpdate(orderData);

        } else if (values.outcome === 'failed') {
             const orderData: Partial<Order> = {
                ...baseData,
                status: 'Fallido',
                failureReasonType: values.failureReasonType,
                failureReasonCustom: values.failureReasonType === 'Otro (especificar)' ? values.failureReasonCustom : '',
            };
            await addOrderWithTaskUpdate(orderData);
        }
        
        refreshDataSignature();
        router.push('/accounts');

    } catch (err: any) {
        toast({ title: "Error al Guardar", description: `No se pudo guardar la interacción: ${err.message}`, variant: "destructive" });
    }
  };
  
  const addOrderWithTaskUpdate = async (data: Partial<Order>) => {
       if (originatingTask) {
           await addOrderFS(data, originatingTask.id);
        } else {
            await addOrderFS(data);
        }
        toast({ title: "Interacción Registrada", description: "Se ha guardado el resultado de tu visita." });
  }

  const onFormError = (errors: any) => {
    console.error("Form errors:", errors);
    toast({
        title: "Error de Validación",
        description: "Por favor, revisa los campos marcados en rojo. Hay errores o faltan datos obligatorios.",
        variant: "destructive",
    });
  };

  return {
    form,
    step,
    setStep,
    client,
    handleClientSelect,
    handleBack,
    handleNextStep,
    onSubmit,
    onFormError,
    isLoading,
    isSubmitting: form.formState.isSubmitting,
    originatingTask,
    availableMaterials,
    salesRepsList,
    clavadistas,
    materialFields,
    appendMaterial,
    removeMaterial,
    userRole,
    teamMember,
    debouncedSearchTerm,
    searchTerm,
    setSearchTerm,
    filteredAccounts,
    distributorAccounts,
  };
}
