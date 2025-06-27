

"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { accountTypeList, canalOrigenColocacionList, clientTypeList, failureReasonList, nextActionTypeList, paymentMethodList, provincesSpainList } from "@/lib/data";
import type { Account, AccountFormValues, Order, PromotionalMaterial, TeamMember, UserRole } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { getAccountsFS, addAccountFS, getAccountByIdFS, updateAccountFS as updateAccountInFirestore } from "@/services/account-service";
import { addOrderFS, updateOrderFS } from "@/services/order-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { getPromotionalMaterialsFS } from "@/services/promotional-material-service";
import { ArrowLeft, Building, CreditCard, Edit, FileText, Loader2, Package, PlusCircle, Search, Send, Trash2, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { format, parseISO, isBefore, startOfDay, subDays, isEqual } from "date-fns";
import { es } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";


const NO_CLAVADISTA_VALUE = "##NONE##";
const ADMIN_SELF_REGISTER_VALUE = "##ADMIN_SELF##";

const assignedMaterialSchema = z.object({
  materialId: z.string().min(1, "Debe seleccionar un material."),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
});

const formSchema = (step: string) => z.object({
  outcome: z.enum(["successful", "failed", "follow-up"]).optional(),
  clavadistaId: z.string().optional(),
  selectedSalesRepId: z.string().optional(),
  clavadistaSelectedSalesRepId: z.string().optional(),
  canalOrigenColocacion: z.enum(canalOrigenColocacionList as [string, ...string[]]).optional(),
  paymentMethod: z.enum(paymentMethodList as [string, ...string[]]).optional(),
  iban: z.string().optional(),
  clientType: z.enum(clientTypeList as [string, ...string[]]).optional(),
  numberOfUnits: z.coerce.number().optional(),
  unitPrice: z.coerce.number().optional(),
  
  nombreFiscal: z.string().optional(),
  cif: z.string().optional(),
  direccionFiscal_street: z.string().optional(),
  direccionFiscal_number: z.string().optional(),
  direccionFiscal_city: z.string().optional(),
  direccionFiscal_province: z.string().optional(),
  direccionFiscal_postalCode: z.string().optional(),
  direccionFiscal_country: z.string().optional(),
  
  sameAsBilling: z.boolean().optional(),
  direccionEntrega_street: z.string().optional(),
  direccionEntrega_number: z.string().optional(),
  direccionEntrega_city: z.string().optional(),
  direccionEntrega_province: z.string().optional(),
  direccionEntrega_postalCode: z.string().optional(),
  direccionEntrega_country: z.string().optional(),
  
  contactoNombre: z.string().optional(),
  contactoCorreo: z.string().email("Formato de correo no válido.").optional().or(z.literal('')),
  contactoTelefono: z.string().optional(),
  observacionesAlta: z.string().optional(),

  nextActionType: z.enum(nextActionTypeList as [string, ...string[]]).optional(),
  nextActionCustom: z.string().optional(),
  nextActionDate: z.date().optional(),
  failureReasonType: z.enum(failureReasonList as [string, ...string[]]).optional(),
  failureReasonCustom: z.string().optional(),
  notes: z.string().optional(),
  assignedMaterials: z.array(assignedMaterialSchema).optional(),

}).superRefine((data, ctx) => {
    if (step !== 'verify') return; 

    if (data.outcome === 'successful') {
      if (!data.numberOfUnits || data.numberOfUnits <= 0) { ctx.addIssue({ path: ["numberOfUnits"], message: 'Campo obligatorio' }); }
      if (!data.unitPrice || data.unitPrice <= 0) { ctx.addIssue({ path: ["unitPrice"], message: 'Campo obligatorio' }); }
      if (!data.paymentMethod) { ctx.addIssue({ path: ["paymentMethod"], message: "Forma de pago es obligatoria." }); }
      if (data.paymentMethod === 'Giro Bancario' && (!data.iban || !/^[A-Z]{2}[0-9]{2}[0-9A-Z]{1,30}$/.test(data.iban.replace(/\s/g, '')))) {
        ctx.addIssue({ path: ["iban"], message: "IBAN válido es obligatorio para el Giro Bancario." });
      }
      if (data.clientType === 'new') {
        if (!data.nombreFiscal?.trim()) ctx.addIssue({ path: ["nombreFiscal"], message: "Nombre fiscal es obligatorio." });
        if (!data.cif?.trim()) ctx.addIssue({ path: ["cif"], message: "CIF es obligatorio." });
        if (!data.direccionFiscal_street?.trim()) ctx.addIssue({ path: ["direccionFiscal_street"], message: "Calle es obligatoria." });
        if (!data.direccionFiscal_city?.trim()) ctx.addIssue({ path: ["direccionFiscal_city"], message: "Ciudad es obligatoria." });
        if (!data.direccionFiscal_province?.trim()) ctx.addIssue({ path: ["direccionFiscal_province"], message: "Provincia es obligatoria." });
        if (!data.direccionFiscal_postalCode?.trim()) ctx.addIssue({ path: ["direccionFiscal_postalCode"], message: "Código postal es obligatorio." });
      }
    }
    
    if (data.outcome === 'follow-up') {
      if (!data.nextActionType) {
         ctx.addIssue({ path: ["nextActionType"], message: "La próxima acción es obligatoria." });
      } else if (data.nextActionType === 'Opción personalizada' && (!data.nextActionCustom || data.nextActionCustom.trim() === '')) {
         ctx.addIssue({ path: ["nextActionCustom"], message: "Debe especificar la próxima acción." });
      }
    }
    
    if (data.outcome === 'failed') {
       if (!data.failureReasonType) {
         ctx.addIssue({ path: ["failureReasonType"], message: "El motivo del fallo es obligatorio." });
      } else if (data.failureReasonType === 'Otro (especificar)' && (!data.failureReasonCustom || data.failureReasonCustom.trim() === '')) {
         ctx.addIssue({ path: ["failureReasonCustom"], message: "Debe especificar el motivo del fallo." });
      }
    }
});


type FormValues = z.infer<ReturnType<typeof formSchema>>;
type Step = "client" | "outcome" | "details" | "new_client_data" | "verify";

export default function OrderFormWizardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { teamMember, userRole, refreshDataSignature } = useAuth();
  
  const [step, setStep] = React.useState<Step>("client");
  const [client, setClient] = React.useState<Account | { id: 'new'; name: string } | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("");

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([]);
  const [clavadistas, setClavadistas] = React.useState<TeamMember[]>([]);
  const [salesRepsList, setSalesRepsList] = React.useState<TeamMember[]>([]);
  const [availableMaterials, setAvailableMaterials] = React.useState<PromotionalMaterial[]>([]);
  const [originatingTask, setOriginatingTask] = React.useState<Order | null>(null);

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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema(step)),
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
  const paymentMethodWatched = form.watch("paymentMethod");
  
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


  const outcomeWatched = form.watch("outcome");
  const formValuesWatched = form.watch();
  const subtotal = (formValuesWatched.numberOfUnits || 0) * (formValuesWatched.unitPrice || 0);
  const ivaAmount = subtotal * 0.21;

  const handleClientSelect = (selectedClient: Account | { id: 'new'; name: string }) => {
    setClient(selectedClient);
    if(selectedClient.id === 'new') {
        form.setValue("clientType", "HORECA"); // Default for new clients
    } else {
        form.setValue("clientType", (selectedClient as Account).type);
    }
    setStep("outcome");
  };

  const handleBack = () => {
    if (step === "outcome") setStep("client");
    if (step === "details") setStep("outcome");
    if (step === "new_client_data") setStep("details");
    if (step === "verify") {
      if (client?.id === 'new' && outcomeWatched === 'successful') {
        setStep("new_client_data");
      } else {
        setStep("details");
      }
    }
  };

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof FormValues)[] = [];
    if (step === 'details') {
      if (outcomeWatched === 'successful') fieldsToValidate = ['numberOfUnits', 'unitPrice', 'paymentMethod', 'iban'];
      else if (outcomeWatched === 'follow-up') fieldsToValidate = ['nextActionType', 'nextActionCustom', 'nextActionDate'];
      else if (outcomeWatched === 'failed') fieldsToValidate = ['failureReasonType', 'failureReasonCustom'];
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
      if (client?.id === 'new' && outcomeWatched === 'successful') {
        setStep('new_client_data');
      } else {
        setStep('verify');
      }
    } else if (step === 'new_client_data') {
      setStep('verify');
    }
  };
  
  const onSubmit = async (values: FormValues) => {
    const isFormValidOnSubmit = await form.trigger();
    if (!isFormValidOnSubmit) {
      toast({ title: "Faltan campos obligatorios", description: "Por favor, revisa el formulario en el paso final.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    if (!teamMember) {
        toast({ title: "Error", description: "No se pudo identificar al usuario.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    
    let salesRepNameForOrder = teamMember.name;
    let salesRepIdForAccount = teamMember.id;

    if (userRole === 'Admin' && values.selectedSalesRepId && values.selectedSalesRepId !== ADMIN_SELF_REGISTER_VALUE) {
        const selectedRep = salesRepsList.find(sr => sr.id === values.selectedSalesRepId);
        if (selectedRep) {
            salesRepNameForOrder = selectedRep.name;
            salesRepIdForAccount = selectedRep.id;
        }
    } else if (userRole === 'Clavadista') {
        if (!values.clavadistaSelectedSalesRepId) {
            toast({ title: "Campo Obligatorio", description: "Debes asignar un comercial a esta interacción.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
        const selectedRepByClavadista = salesRepsList.find(sr => sr.id === values.clavadistaSelectedSalesRepId);
        if (selectedRepByClavadista) {
            salesRepNameForOrder = selectedRepByClavadista.name;
            salesRepIdForAccount = selectedRepByClavadista.id;
        }
    }

    let currentAccountId = client?.id !== 'new' ? client?.id : undefined;
    let accountCreationMessage = "";

    try {
        if (client?.id === 'new' && values.outcome === 'successful') {
            const newAccountData: AccountFormValues = {
                name: client.name,
                legalName: values.nombreFiscal,
                cif: values.cif || "",
                type: values.clientType || 'Otro',
                status: 'Activo',
                addressBilling_street: values.direccionFiscal_street,
                addressBilling_number: values.direccionFiscal_number,
                addressBilling_city: values.direccionFiscal_city,
                addressBilling_province: values.direccionFiscal_province,
                addressBilling_postalCode: values.direccionFiscal_postalCode,
                addressBilling_country: values.direccionFiscal_country,
                addressShipping_street: values.direccionEntrega_street,
                addressShipping_number: values.direccionEntrega_number,
                addressShipping_city: values.direccionEntrega_city,
                addressShipping_province: values.direccionEntrega_province,
                addressShipping_postalCode: values.direccionEntrega_postalCode,
                addressShipping_country: values.direccionEntrega_country,
                mainContactName: values.contactoNombre,
                mainContactEmail: values.contactoCorreo,
                mainContactPhone: values.contactoTelefono,
                notes: values.observacionesAlta,
                salesRepId: salesRepIdForAccount,
                iban: values.iban,
            };
            currentAccountId = await addAccountFS(newAccountData);
            accountCreationMessage = ` Nueva cuenta "${client.name}" creada.`;
        } else if (client?.id !== 'new' && values.iban && client?.id) {
            const existingAccount = await getAccountByIdFS(client.id);
            if (existingAccount && !existingAccount.iban) {
                await updateAccountInFirestore(client.id, { iban: values.iban });
                toast({ title: "Cuenta Actualizada", description: "Se ha guardado el IBAN en la ficha del cliente." });
            }
        }

        const orderData: Partial<Order> = {
            clientName: client!.name,
            visitDate: format(new Date(), "yyyy-MM-dd"),
            clavadistaId: values.clavadistaId === NO_CLAVADISTA_VALUE ? undefined : values.clavadistaId,
            canalOrigenColocacion: values.canalOrigenColocacion,
            assignedMaterials: values.assignedMaterials || [],
            notes: values.notes,
            clientStatus: client!.id === 'new' ? 'new' : 'existing',
            salesRep: salesRepNameForOrder,
            accountId: currentAccountId,
            iban: values.iban,
            originatingTaskId: originatingTask?.id,
        };

        if (values.outcome === "successful") {
            orderData.status = 'Confirmado';
            orderData.products = ["Santa Brisa 750ml"];
            orderData.numberOfUnits = values.numberOfUnits;
            orderData.unitPrice = values.unitPrice;
            orderData.value = (subtotal + ivaAmount);
            orderData.clientType = values.clientType;
            orderData.paymentMethod = values.paymentMethod;
        } else if (values.outcome === 'follow-up') {
            orderData.status = 'Seguimiento';
            orderData.nextActionType = values.nextActionType;
            orderData.nextActionCustom = values.nextActionType === 'Opción personalizada' ? values.nextActionCustom : undefined;
            orderData.nextActionDate = values.nextActionDate ? format(values.nextActionDate, "yyyy-MM-dd") : undefined;
        } else if (values.outcome === 'failed') {
            orderData.status = 'Fallido';
            orderData.failureReasonType = values.failureReasonType;
            orderData.failureReasonCustom = values.failureReasonType === 'Otro (especificar)' ? values.failureReasonCustom : undefined;
        }

        await addOrderFS(orderData as Order);
        
        if (originatingTask) {
           await updateOrderFS(originatingTask.id, { status: "Completado" });
           toast({ title: "Tarea Completada", description: `La tarea original para ${originatingTask.clientName} ha sido marcada como completada.` });
        }
        
        toast({ title: "¡Interacción Registrada!", description: `Se ha guardado el resultado para ${client!.name}.${accountCreationMessage}` });
        refreshDataSignature();
        
        if (values.outcome === 'successful') {
            router.push('/orders-dashboard');
        } else {
            router.push('/crm-follow-up');
        }

    } catch (err: any) {
        toast({ title: "Error al Guardar", description: err.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [accounts, clavadistas, salesReps, materials] = await Promise.all([
          getAccountsFS(),
          getTeamMembersFS(['Clavadista']),
          getTeamMembersFS(['SalesRep', 'Admin']),
          getPromotionalMaterialsFS()
        ]);
        setAllAccounts(accounts);
        setClavadistas(clavadistas);
        setSalesRepsList(salesReps);
        setAvailableMaterials(materials);
      } catch (error) {
        toast({ title: "Error", description: "No se pudieron cargar los datos necesarios.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [toast]);

  const renderStepContent = () => {
    switch (step) {
      case "client":
        return (
          <motion.div key="client" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <CardHeader>
              <CardTitle>Paso 1: ¿A qué cliente has visitado?</CardTitle>
              <CardDescription>Busca un cliente existente o introduce el nombre de uno nuevo para continuar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="Buscar por nombre o CIF..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/>
              </div>
              {filteredAccounts.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                  {filteredAccounts.map(acc => ( <Button key={acc.id} type="button" variant="outline" className="w-full justify-start" onClick={() => handleClientSelect(acc)}> <Building className="mr-2 h-4 w-4 text-muted-foreground"/> {acc.name} </Button> ))}
                </div>
              )}
              {debouncedSearchTerm && filteredAccounts.length === 0 && (
                <div className="text-center p-4 border-dashed border-2 rounded-md">
                  <p className="text-sm text-muted-foreground">No se encontró al cliente "{debouncedSearchTerm}".</p>
                  <Button type="button" className="mt-2" onClick={() => handleClientSelect({ id: 'new', name: debouncedSearchTerm })}> <PlusCircle className="mr-2 h-4 w-4"/> Continuar como nuevo cliente </Button>
                </div>
              )}
            </CardContent>
          </motion.div>
        );

      case "outcome":
        return (
          <motion.div key="outcome" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <CardHeader>
              <CardTitle>Paso 2: ¿Cuál fue el resultado para "{client?.name}"?</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
                <Button type="button" variant="outline" className="w-full h-16 text-lg" onClick={() => { form.setValue("outcome", "successful"); setStep("details"); }}>Pedido Exitoso</Button>
                <Button type="button" variant="outline" className="w-full h-16 text-lg" onClick={() => { form.setValue("outcome", "follow-up"); setStep("details"); }}>Requiere Seguimiento</Button>
                <Button type="button" variant="outline" className="w-full h-16 text-lg" onClick={() => { form.setValue("outcome", "failed"); setStep("details"); }}>Visita Fallida / Sin Pedido</Button>
            </CardContent>
            <CardFooter> <Button type="button" variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button> </CardFooter>
          </motion.div>
        );
      
      case "details":
        return (
            <motion.div key="details" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
                <CardHeader>
                    <CardTitle>Paso 3: Completa los Detalles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {outcomeWatched === 'successful' && (
                        <div className="space-y-4">
                            <FormField control={form.control} name="numberOfUnits" render={({ field }) => (<FormItem><FormLabel>Número de Unidades</FormLabel><FormControl><Input type="number" placeholder="Ej: 12" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="unitPrice" render={({ field }) => (<FormItem><FormLabel>Precio Unitario (€ sin IVA)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ej: 15.50" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="paymentMethod" render={({ field }) => (<FormItem><FormLabel>Forma de Pago</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar forma de pago"/></SelectTrigger></FormControl><SelectContent>{paymentMethodList.map(m=>(<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent></Select><FormMessage/></FormItem>)}/>
                             {paymentMethodWatched === 'Giro Bancario' && (
                                <FormField control={form.control} name="iban" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>IBAN</FormLabel>
                                        <FormControl><Input placeholder="ES00 0000 0000 0000 0000 0000" {...field} value={field.value ?? ""} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            )}
                        </div>
                    )}
                    {outcomeWatched === 'follow-up' && (
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="nextActionType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Próxima Acción</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value ?? ""} >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar próxima acción..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {nextActionTypeList.map((type) => (
                                                    <SelectItem key={type} value={type}>
                                                        {type}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {form.watch('nextActionType') === 'Opción personalizada' && <FormField control={form.control} name="nextActionCustom" render={({ field }) => (<FormItem><FormLabel>Especificar Acción</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)}/>}
                            <FormField
                                control={form.control}
                                name="nextActionDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Fecha Próxima Acción (Opcional)</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        type="button"
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full justify-between pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <span>
                                                            {field.value ? (
                                                                format(field.value, "PPP", { locale: es })
                                                            ) : (
                                                                "Seleccione fecha"
                                                            )}
                                                        </span>
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                    disabled={(date) => date < subDays(new Date(),1) && !isEqual(date, subDays(new Date(),1))}
                                                    locale={es}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                             />
                             {(userRole === 'Admin') && (
                                <FormField control={form.control} name="selectedSalesRepId" render={({ field }) => ( <FormItem> <FormLabel>Asignar Seguimiento a:</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? ""}> <FormControl> <SelectTrigger> <SelectValue placeholder="Seleccionar comercial..." /> </SelectTrigger> </FormControl> <SelectContent> <SelectItem value={ADMIN_SELF_REGISTER_VALUE}> Yo mismo/a (Admin) </SelectItem> {salesRepsList.map((rep) => ( <SelectItem key={rep.id} value={rep.id}> {rep.name} </SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )} />
                            )}
                             {(userRole === 'Clavadista') && (
                                <FormField control={form.control} name="clavadistaSelectedSalesRepId" render={({ field }) => ( <FormItem> <FormLabel>Asignar Seguimiento a:</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? ""}> <FormControl> <SelectTrigger> <SelectValue placeholder="Seleccionar comercial..." /> </SelectTrigger> </FormControl> <SelectContent> {salesRepsList.map((rep) => ( <SelectItem key={rep.id} value={rep.id}> {rep.name} </SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )} />
                            )}
                        </div>
                    )}
                      {outcomeWatched === 'failed' && (
                        <div className="space-y-4">
                              <FormField control={form.control} name="failureReasonType" render={({ field }) => (<FormItem><FormLabel>Motivo del Fallo</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar motivo..."/></SelectTrigger></FormControl><SelectContent>{failureReasonList.map(r=>(<SelectItem key={r} value={r}>{r}</SelectItem>))}</SelectContent></Select><FormMessage/></FormItem>)}/>
                              {form.watch('failureReasonType') === 'Otro (especificar)' && <FormField control={form.control} name="failureReasonCustom" render={({ field }) => (<FormItem><FormLabel>Especificar Motivo</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)}/>}
                        </div>
                    )}
                    <Separator/>
                    <FormField
                        control={form.control}
                        name="assignedMaterials"
                        render={() => (
                            <FormItem>
                                <FormLabel>Añadir Material Promocional (Opcional)</FormLabel>
                                <div className="space-y-2">
                                    {materialFields.map((field, index) => (
                                        <div key={field.id} className="flex items-end gap-2">
                                            <FormField control={form.control} name={`assignedMaterials.${index}.materialId`} render={({ field }) => ( <FormItem className="flex-grow"> <Select onValueChange={field.onChange} value={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="Seleccionar material..."/> </SelectTrigger> </FormControl> <SelectContent> {availableMaterials.map(m => <SelectItem key={m.id} value={m.id}>{m.name} (Stock: {m.stock})</SelectItem>)} </SelectContent> </Select> <FormMessage/> </FormItem> )}/>
                                            <FormField control={form.control} name={`assignedMaterials.${index}.quantity`} render={({ field }) => ( <FormItem> <FormControl> <Input type="number" placeholder="Cant." className="w-20" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /> </FormControl> <FormMessage/> </FormItem> )}/>
                                            <Button type="button" variant="destructive" size="icon" onClick={() => removeMaterial(index)}><Trash2 className="h-4 w-4"/></Button>
                                        </div>
                                    ))}
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={() => appendMaterial({ materialId: '', quantity: 1 })}>Añadir Material</Button>
                            </FormItem>
                        )}
                    />
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button type="button" variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
                    <Button type="button" onClick={handleNextStep}>Continuar <ArrowLeft className="mr-2 h-4 w-4 transform rotate-180" /></Button>
                </CardFooter>
            </motion.div>
        );

        case "new_client_data":
            return (
                <motion.div key="new_client_data" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
                    <CardHeader>
                        <CardTitle>Paso 4: Datos de Facturación y Entrega de "{client?.name}"</CardTitle>
                        <CardDescription>Completa la información para el nuevo cliente. Los campos con * son obligatorios.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Separator/><h3 className="font-semibold text-base mt-2">Datos de Facturación</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="nombreFiscal" render={({ field }) => (<FormItem><FormLabel>Nombre Fiscal *</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="cif" render={({ field }) => (<FormItem><FormLabel>CIF *</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                        <FormField control={form.control} name="direccionFiscal_street" render={({ field }) => (<FormItem><FormLabel>Calle Fiscal *</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <FormField control={form.control} name="direccionFiscal_number" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="direccionFiscal_postalCode" render={({ field }) => (<FormItem><FormLabel>C.P. *</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="direccionFiscal_city" render={({ field }) => (<FormItem><FormLabel>Ciudad *</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="direccionFiscal_province" render={({ field }) => (<FormItem><FormLabel>Provincia *</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger></FormControl><SelectContent>{provincesSpainList.map(p=>(<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                        
                        <Separator/><h3 className="font-semibold text-base mt-2">Datos de Entrega</h3>
                        <FormField control={form.control} name="sameAsBilling" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">La dirección de entrega es la misma que la de facturación</FormLabel></FormItem>
                        )} />

                        {!watchSameAsBilling && (
                            <div className="space-y-4 pt-2 border-l-2 pl-4 border-primary">
                                <FormField control={form.control} name="direccionEntrega_street" render={({ field }) => (<FormItem><FormLabel>Calle Entrega</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <FormField control={form.control} name="direccionEntrega_number" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="direccionEntrega_postalCode" render={({ field }) => (<FormItem><FormLabel>C.P.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="direccionEntrega_city" render={({ field }) => (<FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="direccionEntrega_province" render={({ field }) => (<FormItem><FormLabel>Provincia</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger></FormControl><SelectContent>{provincesSpainList.map(p=>(<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                </div>
                            </div>
                        )}
                         <Separator/><h3 className="font-semibold text-base mt-2">Datos de Contacto (Opcional)</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="contactoNombre" render={({ field }) => (<FormItem><FormLabel>Nombre Contacto</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="contactoTelefono" render={({ field }) => (<FormItem><FormLabel>Teléfono Contacto</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
                         </div>
                         <FormField control={form.control} name="contactoCorreo" render={({ field }) => (<FormItem><FormLabel>Email Contacto</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>

                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button type="button" variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
                      <Button type="button" onClick={handleNextStep}>Continuar <ArrowLeft className="mr-2 h-4 w-4 transform rotate-180" /></Button>
                    </CardFooter>
                </motion.div>
            )

        case "verify":
            return(
                <motion.div key="verify" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
                    <CardHeader>
                        <CardTitle>Paso Final: Verifica y Confirma</CardTitle>
                        <CardDescription>Comprueba que todos los datos son correctos. Puedes volver atrás para editar si es necesario.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Resumen de la Interacción</CardTitle></CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <p><strong>Cliente:</strong> {client?.name} {client?.id === 'new' && <span className="text-primary font-bold">(Nuevo)</span>}</p>
                                <p><strong>Resultado:</strong> <span className="font-semibold">{outcomeWatched === 'successful' ? 'Pedido Exitoso' : outcomeWatched === 'follow-up' ? 'Requiere Seguimiento' : 'Visita Fallida'}</span></p>
                                {outcomeWatched === 'successful' && <>
                                    <p><strong>Unidades:</strong> {formValuesWatched.numberOfUnits}</p>
                                    <p><strong>Forma de Pago:</strong> {formValuesWatched.paymentMethod} {formValuesWatched.paymentMethod === 'Giro Bancario' && `- ${formValuesWatched.iban}`}</p>
                                    <p><strong>Valor Total (IVA incl.):</strong> <FormattedNumericValue value={subtotal + ivaAmount} options={{style: 'currency', currency: 'EUR'}}/></p>
                                    <p><strong>Materiales:</strong> {formValuesWatched.assignedMaterials?.length || 0} items</p>
                                </>}
                                  {outcomeWatched === 'follow-up' && <>
                                    <p><strong>Próxima Acción:</strong> {formValuesWatched.nextActionType || 'N/A'}</p>
                                  </>}
                                  {outcomeWatched === 'failed' && <>
                                    <p><strong>Motivo Fallo:</strong> {formValuesWatched.failureReasonType || 'N/A'}</p>
                                  </>}
                            </CardContent>
                        </Card>

                        {client?.id === 'new' && outcomeWatched === 'successful' && (
                              <Card>
                                <CardHeader><CardTitle className="text-lg">Datos de la Nueva Cuenta (Revisar)</CardTitle></CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <p><strong>Nombre Fiscal:</strong> {formValuesWatched.nombreFiscal}</p>
                                    <p><strong>CIF:</strong> {formValuesWatched.cif}</p>
                                    <p><strong>Dirección Fiscal:</strong> {`${formValuesWatched.direccionFiscal_street || ''}, ${formValuesWatched.direccionFiscal_city || ''}, ${formValuesWatched.direccionFiscal_province || ''}, ${formValuesWatched.direccionFiscal_postalCode || ''}`}</p>
                                    <p><strong>Dirección Entrega:</strong> {watchSameAsBilling ? '(Misma que facturación)' : `${formValuesWatched.direccionEntrega_street || ''}, ${formValuesWatched.direccionEntrega_city || ''}, ${formValuesWatched.direccionEntrega_province || ''}, ${formValuesWatched.direccionEntrega_postalCode || ''}`}</p>
                                </CardContent>
                            </Card>
                        )}
                    </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button type="button" variant="ghost" onClick={handleBack} disabled={isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Guardando...</> : <><Send className="mr-2 h-4 w-4"/> Confirmar y Guardar</>}
                        </Button>
                    </CardFooter>
                </motion.div>
            )
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <header className="flex items-center space-x-2">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Registrar Interacción</h1>
        </header>
        <Card className="max-w-4xl mx-auto shadow-lg mt-6">
            <AnimatePresence mode="wait">
            {renderStepContent()}
            </AnimatePresence>
        </Card>
      </form>
    </Form>
  );
}
