
"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getAccountsFS } from "@/services/account-service";
import { addDirectSaleFS } from "@/services/venta-directa-sb-service";
import type { Account, AccountType, DirectSaleFormValues as DirectSaleFormValuesType, TeamMember } from "@/types";
import { directSaleWizardSchema, type DirectSaleWizardFormValues, type Step } from '@/lib/schemas/direct-sale-schema';

const relevantAccountTypesForDirectSale: AccountType[] = ['Importador', 'Distribuidor', 'Cliente Final Directo', 'Evento Especial', 'Otro'];

export function useDirectSaleWizard() {
  const { toast } = useToast();
  const router = useRouter();
  const { teamMember, userRole, refreshDataSignature } = useAuth();
  
  const [step, setStep] = React.useState<Step>("client");
  const [client, setClient] = React.useState<Account | null>(null);
  
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
      customerId: "",
      customerName: "",
      channel: undefined,
      items: [{ productName: "Santa Brisa 750ml", quantity: 1, netUnitPrice: undefined }],
      issueDate: new Date(),
      dueDate: undefined,
      invoiceNumber: "",
      status: "Borrador",
      relatedPlacementOrders: "",
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

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

  const handleClientSelect = (selectedClient: Account) => {
    setClient(selectedClient);
    form.setValue('customerId', selectedClient.id);
    form.setValue('customerName', selectedClient.name);
    setStep("details");
  };

  const handleBack = () => {
    if (step === "details") setStep("client");
    if (step === "verify") setStep("details");
  };

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof DirectSaleWizardFormValues)[] = [];
    if (step === 'details') {
      fieldsToValidate = ['channel', 'status', 'issueDate', 'items'];
    }
    
    const isValid = fieldsToValidate.length > 0 ? await form.trigger(fieldsToValidate) : true;
    if (!isValid) return;

    if (step === 'details') {
      setStep('verify');
    }
  };
  
  const onSubmit = async (values: DirectSaleWizardFormValues) => {
    if (!teamMember) {
        toast({ title: "Error", description: "No se pudo identificar al usuario.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    
    try {
      await addDirectSaleFS(values);
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
