"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getAccountsFS, addAccountFS } from "@/services/account-service";
import { addDirectSaleFS } from "@/services/venta-directa-sb-service";
import type { Account, AccountStatus, AccountType } from "@/types";
import { directSaleWizardSchema, type DirectSaleWizardFormValues, type Step } from '@/lib/schemas/direct-sale-schema';

const relevantAccountTypesForDirectSale: AccountType[] = ['Importador', 'Distribuidor', 'Cliente Final Directo', 'Evento Especial', 'Otro'];

export function useDirectSaleWizard() {
  const { toast } = useToast();
  const router = useRouter();
  const { teamMember, refreshDataSignature } = useAuth();
  
  const [step, setStep] = React.useState<Step>("client");
  const [client, setClient] = React.useState<Account | { id: 'new'; name: string } | null>(null);
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([]);
  
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
  
  const form = useForm<DirectSaleWizardFormValues>({
    resolver: zodResolver(directSaleWizardSchema),
    mode: "onBlur",
    defaultValues: {
      isNewClient: false,
      customerId: "",
      customerName: "",
      channel: undefined,
      items: [{ productName: "Santa Brisa 750ml", quantity: 1, netUnitPrice: undefined }],
      issueDate: new Date(),
      status: "Borrador",
      relatedPlacementOrders: "",
      notes: "",
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
    },
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
    }
  }, [watchSameAsBilling, df_street, df_number, df_city, df_province, df_postalCode, df_country, form]);


  const watchedItems = form.watch("items");

  const { subtotal, tax, totalAmount } = React.useMemo(() => {
    const currentSubtotal = watchedItems.reduce((sum, item) => {
      const quantity = item.quantity || 0;
      const unitPrice = item.netUnitPrice || 0;
      return sum + quantity * unitPrice;
    }, 0);
    const currentTax = currentSubtotal * 0.21;
    const currentTotalAmount = currentSubtotal + currentTax;
    return { subtotal: currentSubtotal, tax: currentTax, totalAmount: currentTotalAmount };
  }, [watchedItems]);

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const fetchedAccounts = await getAccountsFS();
        setAllAccounts(fetchedAccounts.filter(acc => relevantAccountTypesForDirectSale.includes(acc.type)));
      } catch (error) {
        toast({ title: "Error", description: "No se pudieron cargar las cuentas de clientes.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [toast]);

  const handleClientSelect = (selectedClient: Account | { id: 'new'; name: string }) => {
    setClient(selectedClient);
    form.setValue('isNewClient', selectedClient.id === 'new');
    form.setValue('customerName', selectedClient.name);
    if (selectedClient.id !== 'new') {
      form.setValue('customerId', selectedClient.id);
    } else {
      form.setValue('customerId', undefined);
    }
    setStep("details");
  };

  const handleBack = () => {
    switch(step) {
        case "details": setStep("client"); break;
        case "items": setStep("details"); break;
        case "address": setStep("items"); break;
        case "verify": 
            if(form.getValues('isNewClient')) {
                setStep("address");
            } else {
                setStep("items");
            }
            break;
        default: setStep("client");
    }
  };

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof DirectSaleWizardFormValues)[] = [];
    
    switch(step) {
        case "details":
            fieldsToValidate = ['channel', 'status'];
            break;
        case "items":
            fieldsToValidate = ['items'];
            break;
        case "address":
            fieldsToValidate = ['nombreFiscal', 'cif', 'direccionFiscal_street', 'direccionFiscal_city', 'direccionFiscal_province', 'direccionFiscal_postalCode'];
            if (!form.getValues('sameAsBilling')) {
              fieldsToValidate.push('direccionEntrega_street', 'direccionEntrega_city', 'direccionEntrega_province', 'direccionEntrega_postalCode');
            }
            break;
    }

    const isValid = fieldsToValidate.length > 0 ? await form.trigger(fieldsToValidate) : true;
    if (!isValid) return;

    // Navigate to the next step
    switch(step) {
        case "details": setStep("items"); break;
        case "items": 
          if(form.getValues('isNewClient')) {
            setStep("address");
          } else {
            setStep("verify");
          }
          break;
        case "address": setStep("verify"); break;
    }
  };
  
  const onSubmit = async (values: DirectSaleWizardFormValues) => {
    setIsSubmitting(true);
    
    try {
      let finalCustomerId = values.customerId;

      if(values.isNewClient) {
        const newAccountData = {
            name: values.customerName,
            legalName: values.nombreFiscal,
            cif: values.cif!,
            type: "Cliente Final Directo" as AccountType, // Default type for auto-created
            status: 'Activo' as AccountStatus,
            addressBilling: {
                street: values.direccionFiscal_street!,
                number: values.direccionFiscal_number,
                city: values.direccionFiscal_city!,
                province: values.direccionFiscal_province!,
                postalCode: values.direccionFiscal_postalCode!,
                country: values.direccionFiscal_country!,
            },
            addressShipping: values.sameAsBilling ? {
                street: values.direccionFiscal_street!, number: values.direccionFiscal_number, city: values.direccionFiscal_city!,
                province: values.direccionFiscal_province!, postalCode: values.direccionFiscal_postalCode!, country: values.direccionFiscal_country!,
            } : {
                street: values.direccionEntrega_street!, number: values.direccionEntrega_number, city: values.direccionEntrega_city!,
                province: values.direccionEntrega_province!, postalCode: values.direccionEntrega_postalCode!, country: values.direccionEntrega_country!,
            },
            salesRepId: teamMember?.id
        };
        finalCustomerId = await addAccountFS(newAccountData as any);
      }

      const dataToSave = { ...values, customerId: finalCustomerId, issueDate: new Date() };

      await addDirectSaleFS(dataToSave);
      toast({ title: "¡Venta Registrada!", description: `Se ha guardado la venta para ${values.customerName}.` });
      refreshDataSignature();
      router.push("/direct-sales-sb");
    } catch (err: any) {
        toast({ title: "Error al Guardar", description: `No se pudo guardar la venta: ${err.message}`, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return {
    form, step, setStep, client, handleClientSelect, searchTerm, setSearchTerm, filteredAccounts, debouncedSearchTerm, handleBack,
    handleNextStep, onSubmit, isLoading, isSubmitting, subtotal, tax, totalAmount
  };
}
