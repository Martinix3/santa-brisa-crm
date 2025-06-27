

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
import { accountTypeList, canalOrigenColocacionList, clientTypeList, failureReasonList, nextActionTypeList, paymentMethodList, provincesSpainList } from "@/lib/data";
import type { Account, AccountFormValues, Order, PromotionalMaterial, TeamMember, UserRole } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { getAccountsFS, addAccountFS, getAccountByIdFS, updateAccountFS as updateAccountInFirestore } from "@/services/account-service";
import { addOrderFS } from "@/services/order-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { getPromotionalMaterialsFS } from "@/services/promotional-material-service";
import { ArrowLeft, Building, CreditCard, Edit, FileText, Loader2, Package, PlusCircle, Search, Send, Trash2, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const NO_CLAVADISTA_VALUE = "##NONE##";
const ADMIN_SELF_REGISTER_VALUE = "##ADMIN_SELF##";

const assignedMaterialSchema = z.object({
  materialId: z.string().min(1, "Debe seleccionar un material."),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
});

const formSchema = z.object({
  outcome: z.enum(["successful", "failed", "follow-up"]),
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
  direccionFiscal_country: z.string().optional().default("España"),
  
  sameAsBilling: z.boolean().optional().default(true),
  direccionEntrega_street: z.string().optional(),
  direccionEntrega_number: z.string().optional(),
  direccionEntrega_city: z.string().optional(),
  direccionEntrega_province: z.string().optional(),
  direccionEntrega_postalCode: z.string().optional(),
  direccionEntrega_country: z.string().optional().default("España"),
  
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
  assignedMaterials: z.array(assignedMaterialSchema).optional().default([]),

}).superRefine((data, ctx) => {
    if (data.paymentMethod === 'Giro Bancario') {
        if (!data.iban || data.iban.trim() === '') {
             ctx.addIssue({ path: ["iban"], message: "El IBAN es obligatorio para el Giro Bancario." });
        } else if (!/^[A-Z]{2}[0-9]{2}[0-9A-Z]{1,30}$/.test(data.iban.replace(/\s/g, ''))) { // Simple IBAN format check
             ctx.addIssue({ path: ["iban"], message: "Formato de IBAN no válido." });
        }
    }
});

type FormValues = z.infer<typeof formSchema>;
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
    resolver: zodResolver(formSchema),
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

  // Use individual watches or destructure from a single watch() call to get stable primitive values
  const { 
      direccionFiscal_street,
      direccionFiscal_number,
      direccionFiscal_city,
      direccionFiscal_province,
      direccionFiscal_postalCode,
      direccionFiscal_country
  } = form.watch();


  React.useEffect(() => {
    if (watchSameAsBilling) {
        form.setValue('direccionEntrega_street', direccionFiscal_street || "");
        form.setValue('direccionEntrega_number', direccionFiscal_number || "");
        form.setValue('direccionEntrega_city', direccionFiscal_city || "");
        form.setValue('direccionEntrega_province', direccionFiscal_province || "");
        form.setValue('direccionEntrega_postalCode', direccionFiscal_postalCode || "");
        form.setValue('direccionEntrega_country', direccionFiscal_country || "España");
    }
  }, [watchSameAsBilling, direccionFiscal_street, direccionFiscal_number, direccionFiscal_city, direccionFiscal_province, direccionFiscal_postalCode, direccionFiscal_country, form]);


  const outcomeWatched = form.watch("outcome");
  const formValuesWatched = form.watch();
  const subtotal = (formValuesWatched.numberOfUnits || 0) * (formValuesWatched.unitPrice || 0);
  const ivaAmount = subtotal * 0.21;

  const handleClientSelect = (selectedClient: Account | { id: 'new', name: string }) => {
    setClient(selectedClient);
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
      else if (outcomeWatched === 'follow-up') fieldsToValidate = ['nextActionType', 'nextActionCustom'];
      else if (outcomeWatched === 'failed') fieldsToValidate = ['failureReasonType', 'failureReasonCustom'];
    }
    
    if (step === 'new_client_data') {
        fieldsToValidate = ['nombreFiscal', 'cif', 'direccionFiscal_street', 'direccionFiscal_city', 'direccionFiscal_province', 'direccionFiscal_postalCode', 'direccionEntrega_street', 'direccionEntrega_city', 'direccionEntrega_province', 'direccionEntrega_postalCode'];
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
  
  const validateFinalForm = (values: FormValues): boolean => {
    let isValid = true;
    if (values.outcome === 'successful') {
      if (!values.numberOfUnits) { form.setError('numberOfUnits', { message: 'Campo obligatorio' }); isValid = false; }
      if (!values.unitPrice) { form.setError('unitPrice', { message: 'Campo obligatorio' }); isValid = false; }
      if (client?.id === 'new') {
        if (!values.nombreFiscal) { form.setError('nombreFiscal', { message: 'Campo obligatorio' }); isValid = false; }
        if (!values.cif) { form.setError('cif', { message: 'Campo obligatorio' }); isValid = false; }
        if (!values.direccionFiscal_street) { form.setError('direccionFiscal_street', { message: 'Campo obligatorio' }); isValid = false; }
        if (!values.direccionFiscal_city) { form.setError('direccionFiscal_city', { message: 'Campo obligatorio' }); isValid = false; }
        if (!values.direccionFiscal_province) { form.setError('direccionFiscal_province', { message: 'Campo obligatorio' }); isValid = false; }
        if (!values.direccionFiscal_postalCode) { form.setError('direccionFiscal_postalCode', { message: 'Campo obligatorio' }); isValid = false; }
      }
    }
    if (!isValid) toast({ title: "Faltan campos obligatorios", description: "Por favor, revisa el formulario.", variant: "destructive" });
    return isValid;
  };
  
  const onSubmit = async (values: FormValues) => {
    if (!validateFinalForm(values)) return;
    
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
                cif: values.cif,
                type: values.clientType || 'Otro',
                status: 'Activo',
                addressBilling_street: values.direccionFiscal_street || "",
                addressBilling_number: values.direccionFiscal_number,
                addressBilling_city: values.direccionFiscal_city || "",
                addressBilling_province: values.direccionFiscal_province || "",
                addressBilling_postalCode: values.direccionFiscal_postalCode || "",
                addressBilling_country: values.direccionFiscal_country || "España",
                addressShipping_street: values.direccionEntrega_street || "",
                addressShipping_number: values.direccionEntrega_number,
                addressShipping_city: values.direccionEntrega_city || "",
                addressShipping_province: values.direccionEntrega_province || "",
                addressShipping_postalCode: values.direccionEntrega_postalCode || "",
                addressShipping_country: values.direccionEntrega_country || "España",
                mainContactName: values.contactoNombre,
                mainContactEmail: values.contactoCorreo,
                mainContactPhone: values.contactoTelefono,
                notes: values.observacionesAlta,
                salesRepId: salesRepIdForAccount,
                iban: values.iban,
            };
            currentAccountId = await addAccountFS(newAccountData);
            accountCreationMessage = ` Nueva cuenta "${client.name}" creada.`;
        } else if (client?.id !== 'new' && values.iban) {
            const existingAccount = await getAccountByIdFS(client!.id!);
            if (existingAccount && !existingAccount.iban) {
                await updateAccountInFirestore(client!.id!, { iban: values.iban });
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
            orderData.nextActionType = values.nextActionType;
            orderData.nextActionCustom = values.nextActionType === 'Opción personalizada' ? values.failureReasonCustom : undefined;
            orderData.nextActionDate = values.nextActionDate ? format(values.nextActionDate, "yyyy-MM-dd") : undefined;
            orderData.failureReasonType = values.failureReasonType;
            orderData.failureReasonCustom = values.failureReasonType === 'Otro (especificar)' ? values.failureReasonCustom : undefined;
        }

        await addOrderFS(orderData as Order);
        toast({ title: "¡Interacción Registrada!", description: `Se ha guardado el resultado para ${client!.name}.${accountCreationMessage}` });
        refreshDataSignature();
        router.push('/dashboard');

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
                  {filteredAccounts.map(acc => ( <Button key={acc.id} variant="outline" className="w-full justify-start" onClick={() => handleClientSelect(acc)}> <Building className="mr-2 h-4 w-4 text-muted-foreground"/> {acc.name} </Button> ))}
                </div>
              )}
              {debouncedSearchTerm && filteredAccounts.length === 0 && (
                <div className="text-center p-4 border-dashed border-2 rounded-md">
                  <p className="text-sm text-muted-foreground">No se encontró al cliente "{debouncedSearchTerm}".</p>
                  <Button className="mt-2" onClick={() => handleClientSelect({ id: 'new', name: debouncedSearchTerm })}> <PlusCircle className="mr-2 h-4 w-4"/> Continuar como nuevo cliente </Button>
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
                <Button variant="outline" className="w-full h-16 text-lg" onClick={() => { form.setValue("outcome", "successful"); setStep("details"); }}>Pedido Exitoso</Button>
                <Button variant="outline" className="w-full h-16 text-lg" onClick={() => { form.setValue("outcome", "follow-up"); setStep("details"); }}>Requiere Seguimiento</Button>
                <Button variant="outline" className="w-full h-16 text-lg" onClick={() => { form.setValue("outcome", "failed"); setStep("details"); }}>Visita Fallida / Sin Pedido</Button>
            </CardContent>
            <CardFooter> <Button variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button> </CardFooter>
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
                            <FormField control={form.control} name="paymentMethod" render={({ field }) => (<FormItem><FormLabel>Forma de Pago</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar forma de pago"/></SelectTrigger></FormControl><SelectContent>{paymentMethodList.map(m=>(<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent></Select><FormMessage/></FormItem>)}/>
                             {paymentMethodWatched === 'Giro Bancario' && (
                                <FormField control={form.control} name="iban" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>IBAN</FormLabel>
                                        <FormControl><Input placeholder="ES00 0000 0000 0000 0000 0000" {...field} value={field.value ?? ''} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            )}
                        </div>
                    )}
                    {outcomeWatched === 'follow-up' && (
                        <div className="space-y-4">
                            <FormField control={form.control} name="nextActionType" render={({ field }) => (<FormItem><FormLabel>Próxima Acción</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar próxima acción..."/></SelectTrigger></FormControl><SelectContent>{nextActionTypeList.map(t=>(<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent></Select><FormMessage/></FormItem>)}/>
                            {form.watch('nextActionType') === 'Opción personalizada' && <FormField control={form.control} name="nextActionCustom" render={({ field }) => (<FormItem><FormLabel>Especificar Acción</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)}/>}
                        </div>
                    )}
                      {outcomeWatched === 'failed' && (
                        <div className="space-y-4">
                              <FormField control={form.control} name="failureReasonType" render={({ field }) => (<FormItem><FormLabel>Motivo del Fallo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar motivo..."/></SelectTrigger></FormControl><SelectContent>{failureReasonList.map(r=>(<SelectItem key={r} value={r}>{r}</SelectItem>))}</SelectContent></Select><FormMessage/></FormItem>)}/>
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
                    <Button variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
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
                            <FormField control={form.control} name="nombreFiscal" render={({ field }) => (<FormItem><FormLabel>Nombre Fiscal *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="cif" render={({ field }) => (<FormItem><FormLabel>CIF *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                        <FormField control={form.control} name="direccionFiscal_street" render={({ field }) => (<FormItem><FormLabel>Calle Fiscal *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <FormField control={form.control} name="direccionFiscal_number" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="direccionFiscal_postalCode" render={({ field }) => (<FormItem><FormLabel>C.P. *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="direccionFiscal_city" render={({ field }) => (<FormItem><FormLabel>Ciudad *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="direccionFiscal_province" render={({ field }) => (<FormItem><FormLabel>Provincia *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger></FormControl><SelectContent>{provincesSpainList.map(p=>(<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                        
                        <Separator/><h3 className="font-semibold text-base mt-2">Datos de Entrega</h3>
                        <FormField control={form.control} name="sameAsBilling" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label className="font-normal">La dirección de entrega es la misma que la de facturación</Label></FormItem>
                        )} />

                        {!watchSameAsBilling && (
                            <div className="space-y-4 pt-2 border-l-2 pl-4 border-primary">
                                <FormField control={form.control} name="direccionEntrega_street" render={({ field }) => (<FormItem><FormLabel>Calle Entrega</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <FormField control={form.control} name="direccionEntrega_number" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="direccionEntrega_postalCode" render={({ field }) => (<FormItem><FormLabel>C.P.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="direccionEntrega_city" render={({ field }) => (<FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="direccionEntrega_province" render={({ field }) => (<FormItem><FormLabel>Provincia</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger></FormControl><SelectContent>{provincesSpainList.map(p=>(<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
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
                                  {outcomeWatched !== 'successful' && <>
                                    <p><strong>Próxima Acción:</strong> {formValuesWatched.nextActionType || 'N/A'}</p>
                                  </>}
                            </CardContent>
                        </Card>

                        {client?.id === 'new' && outcomeWatched === 'successful' && (
                              <Card>
                                <CardHeader><CardTitle className="text-lg">Datos de la Nueva Cuenta (Revisar)</CardTitle></CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <p><strong>Nombre Fiscal:</strong> {formValuesWatched.nombreFiscal}</p>
                                    <p><strong>CIF:</strong> {formValuesWatched.cif}</p>
                                    <p><strong>Dirección Fiscal:</strong> {`${formValuesWatched.direccionFiscal_street}, ${formValuesWatched.direccionFiscal_city}, ${formValuesWatched.direccionFiscal_province}, ${formValuesWatched.direccionFiscal_postalCode}`}</p>
                                    <p><strong>Dirección Entrega:</strong> {watchSameAsBilling ? '(Misma que facturación)' : `${formValuesWatched.direccionEntrega_street}, ${formValuesWatched.direccionEntrega_city}, ${formValuesWatched.direccionEntrega_province}, ${formValuesWatched.direccionEntrega_postalCode}`}</p>
                                </CardContent>
                            </Card>
                        )}
                    </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="ghost" onClick={handleBack} disabled={isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Guardando...</> : <><Send className="mr-2 h-4 w-4"/> Confirmar y Guardar</>}
                        </Button>
                    </CardFooter>
                </motion.div>
            )
    }
  };
  
  return (
    <div className="space-y-6">
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
    </div>
  );
}
