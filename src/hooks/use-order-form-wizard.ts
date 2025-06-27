
import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getAccountsFS, addAccountFS, getAccountByIdFS, updateAccountInFirestore } from "@/services/account-service";
import { addOrderFS, updateOrderFS, getOrderByIdFS } from "@/services/order-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { getPromotionalMaterialsFS } from "@/services/promotional-material-service";
import { runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { collection, doc } from "firebase/firestore";
import type { Account, Order, PromotionalMaterial, TeamMember, UserRole } from "@/types";
import { orderFormSchema, type OrderFormValues, NO_CLAVADISTA_VALUE, ADMIN_SELF_REGISTER_VALUE, Step } from '@/lib/schemas/order-form-schema';

export function useOrderWizard() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { teamMember, userRole, refreshDataSignature } = useAuth();
  
  // Wizard State
  const [step, setStep] = React.useState<Step>("client");
  const [client, setClient] = React.useState<Account | { id: 'new'; name: string } | null>(null);
  
  // Data Fetching State
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // Fetched Data
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([]);
  const [clavadistas, setClavadistas] = React.useState<TeamMember[]>([]);
  const [salesRepsList, setSalesRepsList] = React.useState<TeamMember[]>([]);
  const [availableMaterials, setAvailableMaterials] = React.useState<PromotionalMaterial[]>([]);
  const [originatingTask, setOriginatingTask] = React.useState<Order | null>(null);
  
  // Search State
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("");

  React.useEffect(() => {
    const handler = setTimeout(() => { setDebouncedSearchTerm(searchTerm); }, 300);
    return () => { clearTimeout(handler); };
  }, [searchTerm]);

  const filteredAccounts = React.useMemo(() => {
    if (!debouncedSearchTerm) return [];
    return allAccounts.filter(acc =>
      acc.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (acc.cif && acc.cif.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
    );
  }, [debouncedSearchTerm, allAccounts]);
  
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      outcome: undefined,
      clavadistaId: userRole === 'Clavadista' && teamMember ? teamMember.id : NO_CLAVADISTA_VALUE,
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
      form.setValue('direccionEntrega_street', '');
      form.setValue('direccionEntrega_number', '');
      form.setValue('direccionEntrega_city', '');
      form.setValue('direccionEntrega_province', '');
      form.setValue('direccionEntrega_postalCode', '');
      form.setValue('direccionEntrega_country', 'España');
    }
  }, [watchSameAsBilling, df_street, df_number, df_city, df_province, df_postalCode, df_country, form]);


  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const originatingTaskId = searchParams.get('originatingTaskId');
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
            const taskAccount = accounts.find(acc => acc.id === task.accountId || acc.name === task.clientName);
            if (taskAccount) {
                handleClientSelect(taskAccount);
            }
        }
      } catch (error) {
        toast({ title: "Error", description: "No se pudieron cargar los datos necesarios.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [searchParams, toast]);

  const handleClientSelect = (selectedClient: Account | { id: 'new'; name: string }) => {
    setClient(selectedClient);
    if(selectedClient.id === 'new') {
        form.setValue("clientType", "HORECA");
    } else {
        const acc = selectedClient as Account;
        form.setValue("clientType", acc.type);
        form.setValue("iban", acc.iban);
    }
    setStep("outcome");
  };

  const handleBack = () => {
    if (step === "outcome") setStep("client");
    if (step === "details") setStep("outcome");
    if (step === "new_client_data") setStep("details");
    if (step === "verify") {
      if (client?.id === 'new' && form.getValues('outcome') === 'successful') {
        setStep("new_client_data");
      } else {
        setStep("details");
      }
    }
  };

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof OrderFormValues)[] = [];
    if (step === 'details') {
      const outcome = form.getValues('outcome');
      if (outcome === 'successful') fieldsToValidate = ['numberOfUnits', 'unitPrice', 'paymentMethod', 'iban'];
      else if (outcome === 'follow-up') fieldsToValidate = ['nextActionType', 'nextActionCustom', 'nextActionDate'];
      else if (outcome === 'failed') fieldsToValidate = ['failureReasonType', 'failureReasonCustom'];
    }
    
    if (step === 'new_client_data') {
        fieldsToValidate = ['nombreFiscal', 'cif', 'direccionFiscal_street', 'direccionFiscal_city', 'direccionFiscal_province', 'direccionFiscal_postalCode'];
        if (!form.getValues('sameAsBilling')) {
          fieldsToValidate.push('direccionEntrega_street', 'direccionEntrega_city', 'direccionEntrega_province', 'direccionEntrega_postalCode');
        }
    }

    const isValid = fieldsToValidate.length > 0 ? await form.trigger(fieldsToValidate) : true;
    if (!isValid) return;

    if (step === 'details') {
      if (client?.id === 'new' && form.getValues('outcome') === 'successful') {
        setStep('new_client_data');
      } else {
        setStep('verify');
      }
    } else if (step === 'new_client_data' || step === "outcome") {
      setStep('details');
    }
  };
  
  const onSubmit = async (values: OrderFormValues) => {
    const isFormValidOnSubmit = await form.trigger();
    if (!isFormValidOnSubmit) {
      toast({ title: "Faltan campos obligatorios", description: "Por favor, revisa el formulario en el paso final.", variant: "destructive" });
      setStep('verify');
      return;
    }
    
    setIsSubmitting(true);
    if (!teamMember) {
        toast({ title: "Error", description: "No se pudo identificar al usuario.", variant: "destructive" });
        setIsSubmitting(false);
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
            } else if (userRole === 'Clavadista') {
                if (!values.clavadistaSelectedSalesRepId) throw new Error("Debes asignar un comercial a esta interacción.");
                const selectedRepByClavadista = salesRepsList.find(sr => sr.id === values.clavadistaSelectedSalesRepId);
                if (selectedRepByClavadista) {
                    salesRepNameForOrder = selectedRepByClavadista.name;
                    salesRepIdForAccount = selectedRepByClavadista.id;
                } else {
                    throw new Error("Comercial asignado no válido.");
                }
            }
            
            let currentAccountId = client?.id !== 'new' ? client?.id : undefined;
            if (client?.id === 'new' && values.outcome === 'successful') {
                const newAccountRef = doc(collection(db, "accounts"));
                currentAccountId = newAccountRef.id;
                const newAccountData = {
                  name: client.name, legalName: values.nombreFiscal, cif: values.cif || "", type: values.clientType || 'Otro', status: 'Activo',
                  addressBilling: { street: values.direccionFiscal_street, number: values.direccionFiscal_number, city: values.direccionFiscal_city, province: values.direccionFiscal_province, postalCode: values.direccionFiscal_postalCode, country: values.direccionFiscal_country },
                  addressShipping: { street: values.direccionEntrega_street, number: values.direccionEntrega_number, city: values.direccionEntrega_city, province: values.direccionEntrega_province, postalCode: values.direccionEntrega_postalCode, country: values.direccionEntrega_country },
                  mainContactName: values.contactoNombre, mainContactEmail: values.contactoCorreo, mainContactPhone: values.contactoTelefono, notes: values.observacionesAlta, salesRepId: salesRepIdForAccount, iban: values.iban,
                };
                transaction.set(newAccountRef, newAccountData);
            } else if (client?.id !== 'new' && values.iban && client?.id) {
                const existingAccount = allAccounts.find(a => a.id === client.id);
                if (existingAccount && !existingAccount.iban) {
                    transaction.update(doc(db, "accounts", client.id), { iban: values.iban });
                }
            }

            const subtotal = (values.numberOfUnits || 0) * (values.unitPrice || 0);
            const ivaAmount = subtotal * 0.21;
            const newOrderRef = doc(collection(db, "orders"));
            const orderData: any = {
                clientName: client!.name, visitDate: new Date(), clavadistaId: values.clavadistaId, canalOrigenColocacion: values.canalOrigenColocacion,
                assignedMaterials: values.assignedMaterials || [], notes: values.notes, clientStatus: client!.id === 'new' ? 'new' : 'existing',
                salesRep: salesRepNameForOrder, accountId: currentAccountId, iban: values.iban, originatingTaskId: originatingTask?.id,
            };

            if (values.outcome === "successful") {
                orderData.status = 'Confirmado'; orderData.products = ["Santa Brisa 750ml"]; orderData.numberOfUnits = values.numberOfUnits; orderData.unitPrice = values.unitPrice;
                orderData.value = subtotal + ivaAmount; orderData.clientType = values.clientType; orderData.paymentMethod = values.paymentMethod;
            } else if (values.outcome === 'follow-up') {
                orderData.status = 'Seguimiento'; orderData.nextActionType = values.nextActionType; orderData.nextActionCustom = values.nextActionType === 'Opción personalizada' ? values.nextActionCustom : undefined;
                orderData.nextActionDate = values.nextActionDate;
            } else if (values.outcome === 'failed') {
                orderData.status = 'Fallido'; orderData.failureReasonType = values.failureReasonType; orderData.failureReasonCustom = values.failureReasonType === 'Otro (especificar)' ? values.failureReasonCustom : undefined;
            }
            transaction.set(newOrderRef, orderData);
            
            if (originatingTask) {
               transaction.update(doc(db, "orders", originatingTask.id), { status: "Completado" });
            }
        });

        toast({ title: "¡Interacción Registrada!", description: `Se ha guardado el resultado para ${client!.name}.` });
        refreshDataSignature();
        
        if (values.outcome === 'successful') router.push('/orders-dashboard');
        else router.push('/crm-follow-up');

    } catch (err: any) {
        toast({ title: "Error en Transacción", description: `No se pudo guardar la interacción: ${err.message}`, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return {
    form, step, setStep, client, handleClientSelect, searchTerm, setSearchTerm, filteredAccounts, handleBack,
    handleNextStep, onSubmit, isLoading, isSubmitting, clavadistas, salesRepsList, availableMaterials,
    materialFields, appendMaterial, removeMaterial, userRole, teamMember
  };
}
