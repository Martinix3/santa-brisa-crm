
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import * as z from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { accountTypeList, canalOrigenColocacionList, clientTypeList, failureReasonList, nextActionTypeList, paymentMethodList, provincesSpainList } from "@/lib/data";
import type { Account, AccountStatus, AccountType, AddressDetails, AssignedPromotionalMaterial, CanalOrigenColocacion, ClientType, FailureReasonType, NextActionType, Order, PaymentMethod, PromotionalMaterial, TeamMember, UserRole } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { getAccountByIdFS, addAccountFS, getAccountsFS } from "@/services/account-service";
import { getOrderByIdFS, addOrderFS, updateOrderFS } from "@/services/order-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { getPromotionalMaterialsFS } from "@/services/promotional-material-service";
import { extractClientData } from "@/ai/flows/client-data-extraction-flow";
import { ArrowLeft, Check, ClipboardPaste, Edit, FileText, Loader2, Package, PlusCircle, Search, Send, Sparkles, Trash2, UploadCloud, Users, Zap, Award, CreditCard, User, Building, Info, AlertTriangle } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";

const SINGLE_PRODUCT_NAME = "Santa Brisa 750ml";
const IVA_RATE = 21;
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
  canalOrigenColocacion: z.enum(canalOrigenColocacionList as [CanalOrigenColocacion, ...CanalOrigenColocacion[]]).optional(),
  paymentMethod: z.enum(paymentMethodList as [PaymentMethod, ...PaymentMethod[]]).optional(),

  clientType: z.enum(clientTypeList as [ClientType, ...ClientType[]]).optional(),
  numberOfUnits: z.coerce.number().positive("El número de unidades debe ser un número positivo.").optional(),
  unitPrice: z.coerce.number().positive("El precio unitario debe ser un número positivo.").optional(),
  orderValue: z.coerce.number().positive("El valor del pedido debe ser positivo.").optional(),

  // Campos de cuenta nueva (para verificación)
  nombreFiscal: z.string().optional(),
  cif: z.string().optional(),
  direccionFiscal_street: z.string().optional(),
  direccionFiscal_number: z.string().optional(),
  direccionFiscal_city: z.string().optional(),
  direccionFiscal_province: z.string().optional(),
  direccionFiscal_postalCode: z.string().optional(),
  direccionFiscal_country: z.string().optional().default("España"),
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

  nextActionType: z.enum(nextActionTypeList as [NextActionType, ...NextActionType[]]).optional(),
  nextActionCustom: z.string().optional(),
  nextActionDate: z.date().optional(),
  failureReasonType: z.enum(failureReasonList as [FailureReasonType, ...FailureReasonType[]]).optional(),
  failureReasonCustom: z.string().optional(),
  notes: z.string().optional(),
  assignedMaterials: z.array(assignedMaterialSchema).optional().default([]),

}).superRefine((data, ctx) => {
  // Las validaciones se aplicarán en el paso de verificación
});

type FormValues = z.infer<typeof formSchema>;
type Step = "client" | "outcome" | "details" | "verify";

export default function OrderFormWizardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [isAiProcessing, setIsAiProcessing] = React.useState(false);
  
  const [aiTextBlock, setAiTextBlock] = React.useState("");

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
      acc.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (acc.cif && acc.cif.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
    );
  }, [debouncedSearchTerm, allAccounts]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        paymentMethod: 'Adelantado',
        clavadistaId: userRole === 'Clavadista' && teamMember ? teamMember.id : NO_CLAVADISTA_VALUE,
    },
  });

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control: form.control, name: "assignedMaterials",
  });

  const outcomeWatched = form.watch("outcome");
  const subtotal = (form.watch("numberOfUnits") || 0) * (form.watch("unitPrice") || 0);
  const ivaAmount = subtotal * (IVA_RATE / 100);

  const handleClientSelect = (selectedClient: Account | { id: 'new', name: string }) => {
    setClient(selectedClient);
    setStep("outcome");
  };

  const handleBack = () => {
    if (step === "outcome") setStep("client");
    if (step === "details") setStep("outcome");
    if (step === "verify") setStep("details");
  };

  const handleAiTextProcess = async () => {
      if (!aiTextBlock.trim()) {
          toast({ title: "Texto vacío", description: "Por favor, pega o escribe los datos del cliente.", variant: "destructive" });
          return;
      }
      setIsAiProcessing(true);
      try {
          const result = await extractClientData({ textBlock: aiTextBlock });
          setFormValuesFromAi(result);
          setStep("verify");
      } catch (error: any) {
          toast({ title: "Error de IA", description: `No se pudieron procesar los datos: ${'message' in error ? error.message : 'Error desconocido'}`, variant: "destructive" });
      } finally {
          setIsAiProcessing(false);
      }
  };

  const handleAiPhotoProcess = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      const MimeTypeMap: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
      if (file.size > 4 * 1024 * 1024 || !MimeTypeMap[file.type]) {
          toast({ title: "Archivo no válido", description: "Sube una imagen (JPG, PNG) de menos de 4MB.", variant: "destructive" });
          return;
      }

      setIsAiProcessing(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
          try {
              const result = await extractClientData({ imageDataUri: reader.result as string });
              setFormValuesFromAi(result);
              setStep("verify");
          } catch (error: any) {
              toast({ title: "Error de IA", description: `No se pudieron procesar los datos de la imagen: ${'message' in error ? error.message : 'Error desconocido'}`, variant: "destructive" });
          } finally {
              setIsAiProcessing(false);
          }
      };
  };

  const setFormValuesFromAi = (data: { legalName?: string; cif?: string; addressBilling?: { street?: string; city?: string; postalCode?: string; province?: string; }; addressShipping?: { street?: string; city?: string; postalCode?: string; province?: string; }; mainContactName?: string; mainContactEmail?: string; mainContactPhone?: string; }) => {
    form.setValue("nombreFiscal", data.legalName || (client as any)?.name);
    form.setValue("cif", data.cif);
    
    form.setValue("direccionFiscal_street", data.addressBilling?.street);
    form.setValue("direccionFiscal_city", data.addressBilling?.city);
    form.setValue("direccionFiscal_postalCode", data.addressBilling?.postalCode);
    form.setValue("direccionFiscal_province", data.addressBilling?.province);

    form.setValue("direccionEntrega_street", data.addressShipping?.street || data.addressBilling?.street);
    form.setValue("direccionEntrega_city", data.addressShipping?.city || data.addressBilling?.city);
    form.setValue("direccionEntrega_postalCode", data.addressShipping?.postalCode || data.addressBilling?.postalCode);
    form.setValue("direccionEntrega_province", data.addressShipping?.province || data.addressBilling?.province);
    
    form.setValue("contactoNombre", data.mainContactName);
    form.setValue("contactoCorreo", data.mainContactEmail);
    form.setValue("contactoTelefono", data.mainContactPhone);
  };

  // ... onSubmit logic similar to before, adapted for wizard state ...
  const onSubmit = async (values: FormValues) => {
    // This function will be called from the final "verify" step
    setIsSubmitting(true);
    // Logic to create account and order based on `client` state and `form.getValues()`
    // This is a complex combination of the old logic
    console.log("Final submission values:", { client, formValues: values });
    
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
        if (client?.id === 'new') {
            const newAccountData: AccountFormValues & { [key: string]: any } = {
                name: client.name,
                legalName: values.nombreFiscal,
                cif: values.cif,
                type: values.outcome === 'successful' ? (values.clientType || 'Otro') : 'Otro',
                status: values.outcome === 'successful' ? 'Activo' : 'Potencial',
                addressBilling_street: values.direccionFiscal_street, addressBilling_number: values.direccionFiscal_number, addressBilling_city: values.direccionFiscal_city, addressBilling_province: values.direccionFiscal_province, addressBilling_postalCode: values.direccionFiscal_postalCode, addressBilling_country: values.direccionFiscal_country,
                addressShipping_street: values.direccionEntrega_street, addressShipping_number: values.direccionEntrega_number, addressShipping_city: values.direccionEntrega_city, addressShipping_province: values.direccionEntrega_province, addressShipping_postalCode: values.direccionEntrega_postalCode, addressShipping_country: values.direccionEntrega_country,
                mainContactName: values.contactoNombre,
                mainContactEmail: values.contactoCorreo,
                mainContactPhone: values.contactoTelefono,
                notes: values.observacionesAlta,
                salesRepId: salesRepIdForAccount,
            };
            currentAccountId = await addAccountFS(newAccountData);
            accountCreationMessage = ` Nueva cuenta "${client.name}" creada.`;
        }

        const orderData: Partial<Order> = {
            clientName: client!.name,
            visitDate: format(new Date(), "yyyy-MM-dd"),
            clavadistaId: values.clavadistaId === NO_CLAVADISTA_VALUE ? undefined : values.clavadistaId,
            canalOrigenColocacion: values.canalOrigenColocacion,
            paymentMethod: values.paymentMethod,
            assignedMaterials: values.assignedMaterials || [],
            notes: values.notes,
            clientStatus: client!.id === 'new' ? 'new' : 'existing',
            salesRep: salesRepNameForOrder,
            accountId: currentAccountId,
        };

        if (values.outcome === "successful") {
            // Full validation should be done here before submitting
            orderData.status = 'Confirmado';
            orderData.products = [SINGLE_PRODUCT_NAME];
            orderData.numberOfUnits = values.numberOfUnits;
            orderData.unitPrice = values.unitPrice;
            orderData.value = (subtotal + ivaAmount);
            orderData.clientType = values.clientType;
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
              <CardTitle>Paso 1: ¿Con qué cliente fue la interacción?</CardTitle>
              <CardDescription>Busca un cliente existente o introduce el nombre de uno nuevo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o CIF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {filteredAccounts.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredAccounts.map(acc => (
                    <Button key={acc.id} variant="outline" className="w-full justify-start" onClick={() => handleClientSelect(acc)}>
                      <Building className="mr-2 h-4 w-4 text-muted-foreground"/> {acc.name}
                    </Button>
                  ))}
                </div>
              )}
              {debouncedSearchTerm && filteredAccounts.length === 0 && (
                <div className="text-center p-4 border-dashed border-2 rounded-md">
                  <p className="text-sm text-muted-foreground">No se encontró ningún cliente. ¿Quieres crear uno nuevo?</p>
                  <Button className="mt-2" onClick={() => handleClientSelect({ id: 'new', name: debouncedSearchTerm })}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Continuar con "{debouncedSearchTerm}"
                  </Button>
                </div>
              )}
            </CardContent>
          </motion.div>
        );

      case "outcome":
        return (
          <motion.div key="outcome" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <CardHeader>
              <CardTitle>Paso 2: ¿Cuál fue el resultado de la visita a "{client?.name}"?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button variant="outline" className="w-full h-16 text-lg" onClick={() => { form.setValue("outcome", "successful"); setStep("details"); }}>Pedido Exitoso</Button>
                <Button variant="outline" className="w-full h-16 text-lg" onClick={() => { form.setValue("outcome", "follow-up"); setStep("details"); }}>Requiere Seguimiento</Button>
                <Button variant="outline" className="w-full h-16 text-lg" onClick={() => { form.setValue("outcome", "failed"); setStep("details"); }}>Visita Fallida / Sin Pedido</Button>
            </CardContent>
            <CardFooter>
                <Button variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
            </CardFooter>
          </motion.div>
        );
      
      case "details":
        if (client?.id === 'new' && outcomeWatched === 'successful') {
            return (
                <motion.div key="details-new-success" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
                    <CardHeader>
                        <CardTitle>Paso 3: Datos de Facturación de "{client.name}"</CardTitle>
                        <CardDescription>Añade los datos del nuevo cliente. Puedes subir una foto o pegar el texto.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                           <Label htmlFor="photo-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadCloud className="w-8 h-8 mb-2 text-primary"/>
                                    <p className="mb-1 text-sm font-semibold">Subir Foto o Captura de Pantalla</p>
                                    <p className="text-xs text-muted-foreground">de una tarjeta, Google Maps, etc.</p>
                                </div>
                                <Input id="photo-upload" type="file" className="hidden" accept="image/*" onChange={handleAiPhotoProcess} disabled={isAiProcessing}/>
                           </Label>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">O</span></div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="text-block">Pegar o escribir datos en bloque</Label>
                            <Textarea id="text-block" placeholder="Ej: BODEGAS MANOLO, S.L. - B12345678 - Calle del Vino, 42, 28004, Madrid..." className="min-h-[100px]" value={aiTextBlock} onChange={(e) => setAiTextBlock(e.target.value)} disabled={isAiProcessing}/>
                            <Button className="w-full" onClick={handleAiTextProcess} disabled={isAiProcessing}>
                                {isAiProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Procesando...</> : <><Sparkles className="mr-2 h-4 w-4"/> Procesar con IA</>}
                            </Button>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
                    </CardFooter>
                </motion.div>
            )
        }
        // Fallback for other cases (existing client, follow-up, fail)
        // This is where we'd put the simplified forms
        return (
            <motion.div key="details-simple" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
                 <CardHeader>
                    <CardTitle>Paso 3: Completar Detalles</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Render simplified forms here based on outcome */}
                    <p>Formulario simplificado para "{outcomeWatched}"</p>
                    <Button onClick={() => setStep('verify')}>Continuar a Verificación</Button>
                </CardContent>
                 <CardFooter>
                    <Button variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
                </CardFooter>
            </motion.div>
        );

        case "verify":
            return(
                <motion.div key="verify" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
                     <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                             <CardHeader>
                                <CardTitle>Paso 4: Revisión Final</CardTitle>
                                <CardDescription>Verifica que todos los datos son correctos antes de guardar.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* All form fields go here, pre-filled */}
                                <Separator />
                                <h3 className="text-lg font-semibold">Resumen de la Interacción</h3>
                                <p><strong>Cliente:</strong> {client?.name}</p>
                                <p><strong>Resultado:</strong> {outcomeWatched}</p>

                                {client?.id === 'new' && outcomeWatched === 'successful' && (
                                     <>
                                        <Separator />
                                        <h3 className="font-semibold">Datos del Nuevo Cliente</h3>
                                        <FormField control={form.control} name="nombreFiscal" render={({ field }) => (<FormItem><FormLabel>Nombre Fiscal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={form.control} name="cif" render={({ field }) => (<FormItem><FormLabel>CIF</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                        <h4 className="font-medium text-muted-foreground">Dirección Fiscal</h4>
                                        <FormField control={form.control} name="direccionFiscal_street" render={({ field }) => (<FormItem><FormLabel>Calle</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        {/* ... other address fields ... */}
                                    </>
                                )}
                                {/* ... other sections for successful, followup, fail ... */}

                            </CardContent>
                             <CardFooter className="flex justify-between">
                                <Button variant="ghost" onClick={handleBack} disabled={isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Guardando...</> : <><Send className="mr-2 h-4 w-4"/> Guardar Interacción</>}
                                </Button>
                            </CardFooter>
                        </form>
                     </Form>
                </motion.div>
            )
    }
  };
  
  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
        <FileText className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Registrar Interacción</h1>
      </header>
      <Card className="max-w-2xl mx-auto shadow-lg">
        <AnimatePresence mode="wait">
            {renderStepContent()}
        </AnimatePresence>
      </Card>
    </div>
  );
}
