
"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getAccountsFS, addAccountFS, getAccountByIdFS } from "@/services/account-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { getPromotionalMaterialsFS } from "@/services/promotional-material-service";
import { getOrderByIdFS } from "@/services/order-service";
import { runTransaction, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { collection, doc } from "firebase/firestore";
import type { Account, Order, PromotionalMaterial, TeamMember, UserRole, OrderStatus, AccountType } from "@/types";
import { orderFormSchema, type OrderFormValues, NO_CLAVADISTA_VALUE, ADMIN_SELF_REGISTER_VALUE, type Step } from '@/lib/schemas/order-form-schema';
import { format } from "date-fns";

export function useOrderWizard() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { teamMember, userRole, refreshDataSignature } = useAuth();
  
  const [step, setStep] = React.useState<Step>("client");
  const [client, setClient] = React.useState<Account | { id: 'new'; nombre: string } | null>(null);
  
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([]);
  const [clavadistas, setClavadistas] = React.useState<TeamMember[]>([]);
  const [salesRepsList, setSalesRepsList] = React.useState<TeamMember[]>([]);
  const [availableMaterials, setAvailableMaterials] = React.useState<PromotionalMaterial[]>([]);
  const [originatingTask, setOriginatingTask] = React.useState<Order | null>(null);
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("");

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
  
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    mode: "onBlur",
    defaultValues: {
      userRole: null, // Initialized as null, will be updated by useEffect
      isNewClient: false,
      outcome: undefined,
      clavadistaId: NO_CLAVADISTA_VALUE,
      selectedSalesRepId: "",
      clavadistaSelectedSalesRepId: "",
      canalOrigenColocacion: undefined,
      paymentMethod: 'Adelantado',
      iban: "",
      clientType: undefined,
      numberOfUnits: undefined,
      unitPrice: undefined,
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
      nextActionType: undefined,
      nextActionCustom: "",
      nextActionDate: undefined,
      failureReasonType: undefined,
      failureReasonCustom: "",
      notes: "",
      assignedMaterials: [],
    },
  });

  React.useEffect(() => {
    if (userRole) {
        form.reset({
            ...form.getValues(),
            userRole: userRole,
            clavadistaId: userRole === 'Clavadista' && teamMember ? teamMember.id : form.getValues('clavadistaId')
        });
    }
  }, [userRole, teamMember, form]);

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control: form.control, name: "assignedMaterials",
  });
  
  const watchSameAsBilling = form.watch('sameAsBilling');
  const df_street = form.watch('direccionFiscal_street');
  const df_number = form.watch('direccionFiscal_number');
  const df_city = form.watch('direccionFiscal_city');
  const df_province = form.watch('direccionFiscal_province');
  const df_postalCode = form.watch('direccionFiscal_postalCode');
  const df_country = form.watch('direccionFiscal_country');

  React.useEffect(() => {
    if (watchSameAsBilling) {
      form.setValue('direccionEntrega_street', df_street);
      form.setValue('direccionEntrega_number', df_number);
      form.setValue('direccionEntrega_city', df_city);
      form.setValue('direccionEntrega_province', df_province);
      form.setValue('direccionEntrega_postalCode', df_postalCode);
      form.setValue('direccionEntrega_country', df_country);
    } else {
      if (form.getValues('sameAsBilling') === false) { 
        form.setValue('direccionEntrega_street', '');
        form.setValue('direccionEntrega_number', '');
        form.setValue('direccionEntrega_city', '');
        form.setValue('direccionEntrega_province', '');
        form.setValue('direccionEntrega_postalCode', '');
        form.setValue('direccionEntrega_country', 'España');
      }
    }
  }, [watchSameAsBilling, df_street, df_number, df_city, df_province, df_postalCode, df_country, form]);


  const handleClientSelect = React.useCallback((selectedClient: Account | { id: 'new'; nombre: string }) => {
    setClient(selectedClient);
    form.setValue('isNewClient', selectedClient.id === 'new');
    if(selectedClient.id === 'new') {
        form.setValue("clientType", "HORECA");
    } else {
        const acc = selectedClient as Account;
        form.setValue("clientType", acc.type);
        form.setValue("iban", acc.iban);
    }
    setStep("outcome");
  }, [form]);


  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const originatingTaskId = searchParams.get('originatingTaskId');
      const accountIdFromUrl = searchParams.get('accountId');

      try {
        const [accounts, clavadistas, salesReps, materials, task] = await Promise.all([
          getAccountsFS(),
          getTeamMembersFS(['Clavadista']),
          getTeamMembersFS(['SalesRep', 'Admin']),
          getPromotionalMaterialsFS(),
          originatingTaskId ? getOrderByIdFS(originatingTaskId) : Promise.resolve(null),
        ]);
        setAllAccounts(accounts);
        setClavadistas(clavadistas);
        setSalesRepsList(salesReps);
        setAvailableMaterials(materials);
        
        if (task) {
            setOriginatingTask(task);
            const taskAccount = accounts.find(acc => acc.id === task.accountId || acc.nombre === task.clientName);
            if (taskAccount) {
                handleClientSelect(taskAccount);
            }
        } else if (accountIdFromUrl) {
           const urlAccount = accounts.find(acc => acc.id === accountIdFromUrl);
           if (urlAccount) {
              handleClientSelect(urlAccount);
           }
        }

      } catch (error) {
        toast({ title: "Error", description: "No se pudieron cargar los datos necesarios.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [searchParams, toast, handleClientSelect]);

  const handleBack = () => {
    if (step === "outcome") setStep("client");
    if (step === "details") setStep("outcome");
    if (step === "verify") setStep("details");
  };

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof OrderFormValues)[] = [];
    if (step === 'details') {
      const outcome = form.getValues('outcome');
      if (outcome === 'successful') fieldsToValidate = ['numberOfUnits', 'unitPrice', 'paymentMethod', 'iban'];
      else if (outcome === 'follow-up') fieldsToValidate = ['nextActionType', 'nextActionCustom', 'nextActionDate', 'selectedSalesRepId', 'clavadistaSelectedSalesRepId'];
      else if (outcome === 'failed') fieldsToValidate = ['failureReasonType', 'failureReasonCustom'];
      fieldsToValidate.push('assignedMaterials');
      
      if(form.getValues('isNewClient') && outcome === 'successful') {
        fieldsToValidate.push('nombreFiscal', 'cif', 'direccionFiscal_street', 'direccionFiscal_city', 'direccionFiscal_province', 'direccionFiscal_postalCode');
        if (!form.getValues('sameAsBilling')) {
          fieldsToValidate.push('direccionEntrega_street', 'direccionEntrega_city', 'direccionEntrega_province', 'direccionEntrega_postalCode');
        }
      }
    }

    const isValid = fieldsToValidate.length > 0 ? await form.trigger(fieldsToValidate) : true;
    if (!isValid) return;

    if (step === 'details') {
      setStep('verify');
    }
  };

  const onFormError = (errors: any) => {
    console.error("Validation Errors:", errors);
    let errorMessages: string[] = [];

    // If RHF doesn't populate the errors object, we'll build a helpful message manually.
    if (Object.keys(errors).length === 0) {
        const values = form.getValues();
        const commonErrors = [];
        if (values.outcome === 'successful') {
            if (!values.numberOfUnits || values.numberOfUnits <= 0) commonErrors.push('Unidades');
            if (!values.unitPrice || values.unitPrice <= 0) commonErrors.push('Precio Unitario');
            if (!values.paymentMethod) commonErrors.push('Forma de Pago');
             if (values.isNewClient && (!values.nombreFiscal || !values.cif || !values.direccionFiscal_street)) {
                commonErrors.push('Datos Fiscales/Dirección');
            }
        }
        if (values.outcome === 'follow-up' && !values.nextActionType) {
            commonErrors.push('Próxima Acción');
        }
        if (values.outcome === 'failed' && !values.failureReasonType) {
            commonErrors.push('Motivo del Fallo');
        }
        if (values.userRole === 'Clavadista' && values.outcome === 'follow-up' && !values.clavadistaSelectedSalesRepId) {
            commonErrors.push('Asignación de Comercial (obligatorio para Clavadista)');
        }

        if (commonErrors.length > 0) {
            errorMessages.push(`Faltan campos obligatorios: ${commonErrors.join(', ')}.`);
        } else {
            errorMessages.push('Hay campos requeridos sin completar. Por favor, revisa el formulario.');
        }
    } else {
        // Default behavior if errors object is populated
        errorMessages = Object.values(errors).map((error: any) => error.message);
    }
    
    toast({
      title: "Errores en el formulario",
      description: errorMessages.join(' '),
      variant: "destructive",
      duration: 9000,
    });
  };
  
  const onSubmit = async (values: OrderFormValues) => {
    if (!teamMember || !userRole) {
        toast({ title: "Error de autenticación", description: "No se pudo identificar al usuario. Por favor, recargue la página.", variant: "destructive" });
        return;
    }

    try {
        await runTransaction(db, async (transaction) => {
            let salesRepNameForOrder = teamMember.name;
            let salesRepIdForAccount = teamMember.id;

            if (userRole === 'Admin' && values.selectedSalesRepId && values.selectedSalesRepId !== ADMIN_SELF_REGISTER_VALUE) {
                const selectedRep = salesRepsList.find(sr => sr.id === values.selectedSalesRepId);
                if (selectedRep) {
                    salesRepNameForOrder = selectedRep.name;
                    salesRepIdForAccount = selectedRep.id;
                }
            } else if (userRole === 'Clavadista' && values.outcome === 'follow-up') {
                const selectedRepByClavadista = salesRepsList.find(sr => sr.id === values.clavadistaSelectedSalesRepId);
                if (selectedRepByClavadista) {
                    salesRepNameForOrder = selectedRepByClavadista.name;
                    salesRepIdForAccount = selectedRepByClavadista.id;
                } else {
                    throw new Error("Un Clavadista debe asignar un comercial para un seguimiento.");
                }
            }
            
            let currentAccountId: string | null = client?.id !== 'new' ? (client?.id || null) : null;

            if (client?.id === 'new') {
                const newAccountRef = doc(collection(db, "accounts"));
                currentAccountId = newAccountRef.id;
                const isSuccessfulOutcome = values.outcome === 'successful';
                
                const newAccountData: Omit<Account, 'status' | 'leadScore'> = {
                    id: currentAccountId,
                    nombre: client.nombre,
                    legalName: isSuccessfulOutcome ? (values.nombreFiscal || undefined) : undefined,
                    cif: isSuccessfulOutcome ? (values.cif || '') : '',
                    type: isSuccessfulOutcome ? (values.clientType || 'Otro') : 'Otro',
                    potencial: 'medio',
                    addressBilling: isSuccessfulOutcome && values.direccionFiscal_street ? {
                        street: values.direccionFiscal_street || null, number: values.direccionFiscal_number || null, city: values.direccionFiscal_city || null,
                        province: values.direccionFiscal_province || null, postalCode: values.direccionFiscal_postalCode || null, country: values.direccionFiscal_country || "España",
                    } : undefined,
                    addressShipping: isSuccessfulOutcome ? (values.sameAsBilling && values.direccionFiscal_street ? {
                        street: values.direccionFiscal_street || null, number: values.direccionFiscal_number || null, city: values.direccionFiscal_city || null,
                        province: values.direccionFiscal_province || null, postalCode: values.direccionFiscal_postalCode || null, country: values.direccionFiscal_country || "España",
                    } : (values.direccionEntrega_street ? {
                        street: values.direccionEntrega_street || null, number: values.direccionEntrega_number || null, city: values.direccionEntrega_city || null,
                        province: values.direccionEntrega_province || null, postalCode: values.direccionEntrega_postalCode || null, country: values.direccionEntrega_country || "España",
                    } : undefined)) : undefined,
                    mainContactName: isSuccessfulOutcome ? (values.contactoNombre || undefined) : undefined,
                    mainContactEmail: isSuccessfulOutcome ? (values.contactoCorreo || undefined) : undefined,
                    mainContactPhone: isSuccessfulOutcome ? (values.contactoTelefono || undefined) : undefined,
                    notes: isSuccessfulOutcome ? (values.observacionesAlta || undefined) : "Cuenta creada automáticamente desde una interacción inicial.",
                    salesRepId: salesRepIdForAccount,
                    responsableId: salesRepIdForAccount,
                    iban: isSuccessfulOutcome ? (values.iban || undefined) : undefined,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    ciudad: values.direccionFiscal_city || values.direccionEntrega_city || undefined,
                };
                
                transaction.set(newAccountRef, JSON.parse(JSON.stringify(newAccountData, (k, v) => v === undefined ? null : v)));
            
            } else if (client?.id && values.outcome === 'successful' && values.iban) {
                const existingAccount = allAccounts.find(a => a.id === client.id);
                if (existingAccount && !existingAccount.iban) {
                    transaction.update(doc(db, "accounts", client.id), { iban: values.iban, updatedAt: Timestamp.fromDate(new Date()) });
                }
            }

            const subtotal = (values.numberOfUnits || 0) * (values.unitPrice || 0);
            const ivaAmount = subtotal * 0.21;
            const newOrderRef = doc(collection(db, "orders"));
            const isVisitLikeInteraction = values.outcome === 'successful' || values.outcome === 'failed';
            
            let status: OrderStatus = 'Pendiente';
            if (values.outcome === "successful") status = 'Confirmado';
            else if (values.outcome === 'follow-up') status = 'Seguimiento';
            else if (values.outcome === 'failed') status = 'Fallido';

            const orderData: Record<string, any> = {
                clientName: client!.nombre, accountId: currentAccountId,
                visitDate: isVisitLikeInteraction ? Timestamp.fromDate(new Date()) : null,
                createdAt: Timestamp.fromDate(new Date()), lastUpdated: Timestamp.fromDate(new Date()),
                salesRep: salesRepNameForOrder, status: status,
                clavadistaId: values.clavadistaId === NO_CLAVADISTA_VALUE ? null : values.clavadistaId || null,
                clientStatus: (client!.id === 'new' ? 'new' : 'existing'),
                originatingTaskId: originatingTask?.id || null,
                canalOrigenColocacion: values.canalOrigenColocacion || null,
                assignedMaterials: values.assignedMaterials || [],
                notes: values.notes || null,
                products: values.outcome === "successful" ? ["Santa Brisa 750ml"] : [],
                numberOfUnits: values.outcome === "successful" ? (values.numberOfUnits || null) : null,
                unitPrice: values.outcome === "successful" ? (values.unitPrice || null) : null,
                value: values.outcome === "successful" ? (subtotal + ivaAmount) : null,
                clientType: values.outcome === "successful" ? (values.clientType || null) : null,
                paymentMethod: values.outcome === "successful" ? (values.paymentMethod || null) : null,
                iban: values.outcome === "successful" ? (values.iban || null) : null,
                nextActionType: values.outcome === 'follow-up' ? (values.nextActionType || null) : null,
                nextActionCustom: values.outcome === 'follow-up' && values.nextActionType === 'Opción personalizada' ? (values.nextActionCustom || null) : null,
                nextActionDate: values.outcome === 'follow-up' && values.nextActionDate ? Timestamp.fromDate(values.nextActionDate) : null,
                failureReasonType: values.outcome === 'failed' ? (values.failureReasonType || null) : null,
                failureReasonCustom: values.outcome === 'failed' && values.failureReasonType === 'Otro (especificar)' ? (values.failureReasonCustom || null) : null,
            };
            
            for (const key in orderData) {
                if (orderData[key] === undefined) {
                    orderData[key] = null;
                }
            }

            transaction.set(newOrderRef, orderData);
            
            if (originatingTask) {
               transaction.update(doc(db, "orders", originatingTask.id), { status: "Completado", lastUpdated: Timestamp.fromDate(new Date()) });
            }

             if (values.assignedMaterials && values.assignedMaterials.length > 0) {
                for (const item of values.assignedMaterials) {
                    if (item.materialId && item.quantity) {
                        const materialRef = doc(db, 'promotionalMaterials', item.materialId);
                        const materialDoc = await transaction.get(materialRef);
                        if(materialDoc.exists()) {
                            const currentStock = (materialDoc.data().stock ?? 0) as number;
                            transaction.update(materialRef, { stock: currentStock - item.quantity });
                        }
                    }
                }
            }
        });

        toast({ title: "¡Interacción Registrada!", description: `Se ha guardado el resultado para ${client!.nombre}.` });
        refreshDataSignature();
        
        if (values.outcome === 'successful') router.push('/orders-dashboard');
        else router.push('/accounts');

    } catch (err: any) {
        console.error("Error en la transacción del formulario:", err, "Datos del formulario:", JSON.stringify(values, null, 2));
        toast({ title: "Error Crítico al Guardar", description: `No se pudo registrar la interacción. Por favor, contacta con soporte. Error: ${err.message}`, variant: "destructive", duration: 10000 });
    }
  };

  return {
    form, step, setStep, client, handleClientSelect, searchTerm, setSearchTerm, filteredAccounts, debouncedSearchTerm, handleBack,
    handleNextStep, onSubmit, onFormError, isLoading, clavadistas, salesRepsList, availableMaterials,
    materialFields, appendMaterial, removeMaterial, userRole, teamMember
  };
}

    