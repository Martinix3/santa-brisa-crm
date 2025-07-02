
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getAccountsFS } from "@/services/account-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { addSampleRequestFS } from "@/services/sample-request-service";
import type { Account, TeamMember, SampleRequestFormValues as SampleRequestFormValuesType, AddressDetails } from "@/types";
import { sampleRequestWizardSchema, type SampleRequestWizardFormValues, type Step } from '@/lib/schemas/sample-request-schema';

export function useSampleRequestWizard() {
  const { toast } = useToast();
  const router = useRouter();
  const { teamMember, userRole, refreshDataSignature } = useAuth();
  
  const [step, setStep] = React.useState<Step>("client");
  const [client, setClient] = React.useState<Account | { id: 'new'; nombre: string } | null>(null);
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([]);
  const [requestersList, setRequestersList] = React.useState<TeamMember[]>([]);
  
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
  
  const form = useForm<SampleRequestWizardFormValues>({
    resolver: zodResolver(sampleRequestWizardSchema),
    mode: "onBlur",
    defaultValues: {
      isNewClient: false,
      clientName: "",
      accountId: undefined,
      requesterId: undefined,
      purpose: undefined,
      numberOfSamples: 1,
      justificationNotes: "",
      shippingAddress_street: "",
      shippingAddress_number: "",
      shippingAddress_city: "",
      shippingAddress_province: "",
      shippingAddress_postalCode: "",
      shippingAddress_country: "España",
    },
  });

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const promises = [getAccountsFS()];
        if (userRole === 'Admin') {
          promises.push(getTeamMembersFS(['SalesRep', 'Clavadista', 'Admin']));
        }
        const [fetchedAccounts, fetchedRequesters] = await Promise.all(promises);
        setAllAccounts(fetchedAccounts as Account[]);
        if (fetchedRequesters) {
          setRequestersList(fetchedRequesters as TeamMember[]);
        }
      } catch (error) {
        toast({ title: "Error", description: "No se pudieron cargar los datos necesarios.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [toast, userRole]);

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
    setStep("details");
  };

  const handleBack = () => {
    if (step === "details") setStep("client");
    if (step === "verify") setStep("details");
  };

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof SampleRequestWizardFormValues)[] = [];
    if (step === 'details') {
      fieldsToValidate = ['purpose', 'numberOfSamples', 'justificationNotes'];
      if(form.getValues('isNewClient')) {
        fieldsToValidate.push(
            'shippingAddress_street', 'shippingAddress_city', 
            'shippingAddress_province', 'shippingAddress_postalCode'
        );
      }
    }
    
    const isValid = fieldsToValidate.length > 0 ? await form.trigger(fieldsToValidate) : true;
    if (!isValid) return;

    if (step === 'details') {
      setStep('verify');
    }
  };
  
  const onSubmit = async (values: SampleRequestWizardFormValues) => {
    if (!teamMember) {
        toast({ title: "Error", description: "No se pudo identificar al usuario.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    
    let finalRequesterId = teamMember.id;
    let finalRequesterName = teamMember.name;

    if (userRole === 'Admin' && values.requesterId && values.requesterId !== "") {
        const selectedRequester = requestersList.find(r => r.id === values.requesterId);
        if (selectedRequester) {
            finalRequesterId = selectedRequester.id;
            finalRequesterName = selectedRequester.name;
        }
    }
    
    const dataForService: SampleRequestFormValuesType = {
        requesterId: finalRequesterId,
        requesterName: finalRequesterName,
        clientStatus: values.isNewClient ? 'new' : 'existing',
        accountId: values.accountId,
        clientName: values.clientName,
        purpose: values.purpose!,
        numberOfSamples: values.numberOfSamples!,
        justificationNotes: values.justificationNotes!,
        shippingAddress_street: values.shippingAddress_street,
        shippingAddress_number: values.shippingAddress_number,
        shippingAddress_city: values.shippingAddress_city,
        shippingAddress_province: values.shippingAddress_province,
        shippingAddress_postalCode: values.shippingAddress_postalCode,
        shippingAddress_country: values.shippingAddress_country,
    };

    try {
      await addSampleRequestFS(dataForService);
      toast({ title: "¡Solicitud Enviada!", description: "Tu solicitud de muestras ha sido enviada para su revisión." });
      refreshDataSignature();
      router.push("/dashboard");
    } catch (err: any) {
        toast({ title: "Error al Enviar", description: `No se pudo guardar la solicitud: ${err.message}`, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return {
    form, step, setStep, client, handleClientSelect, searchTerm, setSearchTerm, filteredAccounts, debouncedSearchTerm, handleBack,
    handleNextStep, onSubmit, isLoading, isSubmitting, requestersList, userRole
  };
}
