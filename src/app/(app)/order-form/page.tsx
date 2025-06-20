
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Check, Loader2, Info, Edit3, Send, FileText, Award, Package, PlusCircle, Trash2, Users, Zap } from "lucide-react"; // Added Zap for CanalOrigenColocacion
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { clientTypeList, nextActionTypeList, failureReasonList, accountTypeList, canalOrigenColocacionList } from "@/lib/data"; // Added canalOrigenColocacionList
import type { Order, ClientType, NextActionType, FailureReasonType, Account, AccountType, AccountStatus, TeamMember, PromotionalMaterial, UserRole, CanalOrigenColocacion } from "@/types"; // Added CanalOrigenColocacion
import { useAuth } from "@/contexts/auth-context";
import { useSearchParams, useRouter } from "next/navigation";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { getAccountByIdFS, addAccountFS, getAccountsFS } from "@/services/account-service";
import { getOrderByIdFS, addOrderFS, updateOrderFS } from "@/services/order-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { getPromotionalMaterialsFS } from "@/services/promotional-material-service";


const SINGLE_PRODUCT_NAME = "Santa Brisa 750ml";
const IVA_RATE = 21; // 21%
const NO_CLAVADISTA_VALUE = "##NONE##";
const ADMIN_SELF_REGISTER_VALUE = "##ADMIN_SELF##";


const assignedMaterialSchema = z.object({
  materialId: z.string().min(1, "Debe seleccionar un material."),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
});

const orderFormSchemaBase = z.object({
  clientName: z.string().min(2, "El nombre del cliente debe tener al menos 2 caracteres."),
  visitDate: z.date({ required_error: "La fecha de visita es obligatoria." }),
  clientStatus: z.enum(["new", "existing"], { required_error: "Debe indicar si es un cliente nuevo o existente." }).optional(),
  outcome: z.enum(["Programar Visita", "successful", "failed", "follow-up"], { required_error: "Por favor, seleccione un resultado." }),
  clavadistaId: z.string().optional(),
  selectedSalesRepId: z.string().optional(), 
  canalOrigenColocacion: z.enum(canalOrigenColocacionList as [CanalOrigenColocacion, ...CanalOrigenColocacion[]]).optional(), // Added

  clientType: z.enum(clientTypeList as [ClientType, ...ClientType[]]).optional(),
  numberOfUnits: z.coerce.number().positive("El número de unidades debe ser un número positivo.").optional(),
  unitPrice: z.coerce.number().positive("El precio unitario debe ser un número positivo.").optional(),
  orderValue: z.coerce.number().positive("El valor del pedido debe ser positivo.").optional(),

  nombreFiscal: z.string().optional(),
  cif: z.string().optional(),
  direccionFiscal: z.string().optional(),
  direccionEntrega: z.string().optional(),
  contactoNombre: z.string().optional(),
  contactoCorreo: z.string().email("El formato del correo electrónico no es válido.").optional().or(z.literal('')),
  contactoTelefono: z.string().optional(),
  observacionesAlta: z.string().optional(),

  nextActionType: z.enum(nextActionTypeList as [NextActionType, ...NextActionType[]]).optional(),
  nextActionCustom: z.string().optional(),
  nextActionDate: z.date().optional(),
  failureReasonType: z.enum(failureReasonList as [FailureReasonType, ...FailureReasonType[]]).optional(),
  failureReasonCustom: z.string().optional(),

  notes: z.string().optional(),
  assignedMaterials: z.array(assignedMaterialSchema).optional().default([]),
  accountId: z.string().optional(), 
});

const orderFormSchema = orderFormSchemaBase.superRefine((data, ctx) => {
  if (data.outcome === "successful") {
    if (!data.clientStatus) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe indicar si es cliente nuevo o existente.", path: ["clientStatus"] });
    }
    if (!data.clientType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El tipo de cliente es obligatorio para un pedido exitoso.", path: ["clientType"] });
    }
    if (data.numberOfUnits === undefined || data.numberOfUnits <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El número de unidades es obligatorio y positivo.", path: ["numberOfUnits"] });
    }
    if (data.unitPrice === undefined || data.unitPrice <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El precio unitario es obligatorio y positivo.", path: ["unitPrice"] });
    }
    if ((data.numberOfUnits && data.unitPrice) && (data.orderValue === undefined || data.orderValue <= 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El valor del pedido calculado debe ser positivo.", path: ["orderValue"] });
    }
  }

  if (data.outcome !== "Programar Visita" && !data.clientStatus) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe indicar si es cliente nuevo o existente.", path: ["clientStatus"] });
  }


  if (data.outcome === "failed" || data.outcome === "follow-up") {
    if (!data.nextActionType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La próxima acción es obligatoria.", path: ["nextActionType"] });
    }
    if (data.nextActionType === "Opción personalizada" && (!data.nextActionCustom || data.nextActionCustom.trim() === "")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe especificar la próxima acción personalizada.", path: ["nextActionCustom"] });
    }
  }

  if (data.outcome === "failed") {
    if (!data.failureReasonType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El motivo del fallo es obligatorio.", path: ["failureReasonType"] });
    }
    if (data.failureReasonType === "Otro (especificar)" && (!data.failureReasonCustom || data.failureReasonCustom.trim() === "")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe especificar el motivo del fallo personalizado.", path: ["failureReasonCustom"] });
    }
  }
});


type OrderFormValues = z.infer<typeof orderFormSchema>;

export default function OrderFormPage() {
  const { toast } = useToast();
  const { teamMember, userRole, refreshDataSignature } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editingVisitId, setEditingVisitId] = React.useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingForm, setIsLoadingForm] = React.useState(true);
  const [subtotal, setSubtotal] = React.useState<number | undefined>(undefined);
  const [ivaAmount, setIvaAmount] = React.useState<number | undefined>(undefined);
  const [pageTitle, setPageTitle] = React.useState("Registrar Visita / Pedido de Cliente");
  const [cardDescription, setCardDescription] = React.useState("Complete los detalles para registrar o programar una interacción.");

  const [clavadistas, setClavadistas] = React.useState<TeamMember[]>([]);
  const [salesRepsList, setSalesRepsList] = React.useState<TeamMember[]>([]);
  const [availableMaterials, setAvailableMaterials] = React.useState<PromotionalMaterial[]>([]);
  const [isLoadingDropdownData, setIsLoadingDropdownData] = React.useState(true);


  React.useEffect(() => {
    async function loadDropdownData() {
      setIsLoadingDropdownData(true);
      try {
        const fetchPromises: Promise<any>[] = [
          getTeamMembersFS(['Clavadista']),
          getPromotionalMaterialsFS()
        ];
        if (userRole === 'Admin') {
          fetchPromises.push(getTeamMembersFS(['SalesRep']));
        }

        const [fetchedClavadistas, fetchedMaterials, fetchedSalesReps] = await Promise.all(fetchPromises);

        setClavadistas(fetchedClavadistas);
        setAvailableMaterials(fetchedMaterials.filter((m: PromotionalMaterial) => m.latestPurchase && m.latestPurchase.calculatedUnitCost > 0));
        if (userRole === 'Admin' && fetchedSalesReps) {
          setSalesRepsList(fetchedSalesReps);
        }

      } catch (error) {
        console.error("Error loading dropdown data for order form:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar datos para los desplegables.", variant: "destructive"});
      } finally {
        setIsLoadingDropdownData(false);
      }
    }
    loadDropdownData();
  }, [toast, userRole]);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      clientName: "",
      visitDate: new Date(),
      clientStatus: undefined,
      outcome: undefined,
      clavadistaId: NO_CLAVADISTA_VALUE,
      selectedSalesRepId: userRole === 'Admin' ? ADMIN_SELF_REGISTER_VALUE : undefined,
      canalOrigenColocacion: undefined, // Added
      clientType: undefined,
      numberOfUnits: undefined,
      unitPrice: undefined,
      orderValue: undefined,
      nombreFiscal: "",
      cif: "",
      direccionFiscal: "",
      direccionEntrega: "",
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
      accountId: undefined,
    },
  });

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control: form.control,
    name: "assignedMaterials",
  });

  const watchedMaterials = form.watch("assignedMaterials");

  const totalEstimatedMaterialCostForOrder = React.useMemo(() => {
    return watchedMaterials.reduce((total, current) => {
      const materialDetails = availableMaterials.find(m => m.id === current.materialId);
      const unitCost = materialDetails?.latestPurchase?.calculatedUnitCost || 0;
      return total + (unitCost * current.quantity);
    }, 0);
  }, [watchedMaterials, availableMaterials]);


  React.useEffect(() => {
    const visitIdToUpdate = searchParams.get('updateVisitId');
    async function initializeForm() {
        setIsLoadingForm(true);
        if (visitIdToUpdate) {
          try {
            const existingVisit = await getOrderByIdFS(visitIdToUpdate);
            if (existingVisit && teamMember && (existingVisit.salesRep === teamMember.name || userRole === 'Admin') &&
                (existingVisit.status === 'Programada' || existingVisit.status === 'Seguimiento' || existingVisit.status === 'Fallido')) {
              setEditingVisitId(visitIdToUpdate);

              let visitDateParsed = parseISO(existingVisit.visitDate);
              if (!isValid(visitDateParsed)) visitDateParsed = new Date();

              const title = `Registrar Resultado: ${existingVisit.clientName} (${format(visitDateParsed, "dd/MM/yy", {locale: es})})`;
              setPageTitle(title);
              setCardDescription("Actualice el resultado de la visita o tarea de seguimiento programada.");

              let preselectedSalesRepId = ADMIN_SELF_REGISTER_VALUE;
              if (userRole === 'Admin' && existingVisit.salesRep) {
                  const assignedRep = salesRepsList.find(sr => sr.name === existingVisit.salesRep);
                  if (assignedRep) {
                      preselectedSalesRepId = assignedRep.id;
                  } else if (teamMember && existingVisit.salesRep === teamMember.name) { 
                      preselectedSalesRepId = ADMIN_SELF_REGISTER_VALUE;
                  }
              }


              form.reset({
                clientName: existingVisit.clientName,
                visitDate: visitDateParsed,
                clientStatus: existingVisit.clientStatus || undefined,
                outcome: undefined, 
                clavadistaId: existingVisit.clavadistaId || NO_CLAVADISTA_VALUE,
                selectedSalesRepId: userRole === 'Admin' ? preselectedSalesRepId : undefined,
                canalOrigenColocacion: existingVisit.canalOrigenColocacion || undefined, // Added
                notes: existingVisit.notes || "",
                clientType: existingVisit.clientType,
                numberOfUnits: existingVisit.numberOfUnits,
                unitPrice: existingVisit.unitPrice,
                orderValue: existingVisit.value,
                nombreFiscal: existingVisit.nombreFiscal || "",
                cif: existingVisit.cif || "",
                direccionFiscal: existingVisit.direccionFiscal || "",
                direccionEntrega: existingVisit.direccionEntrega || "",
                contactoNombre: existingVisit.contactoNombre || "",
                contactoCorreo: existingVisit.contactoCorreo || "",
                contactoTelefono: existingVisit.contactoTelefono || "",
                observacionesAlta: existingVisit.observacionesAlta || "",
                nextActionType: existingVisit.nextActionType,
                nextActionCustom: existingVisit.nextActionCustom || "",
                nextActionDate: existingVisit.nextActionDate && isValid(parseISO(existingVisit.nextActionDate)) ? parseISO(existingVisit.nextActionDate) : undefined,
                failureReasonType: existingVisit.failureReasonType,
                failureReasonCustom: existingVisit.failureReasonCustom || "",
                assignedMaterials: existingVisit.assignedMaterials || [],
                accountId: existingVisit.accountId, 
              });
            } else if (existingVisit) {
               toast({ title: "Acceso Denegado", description: "No tienes permiso para actualizar esta visita o ya ha sido procesada de otra forma.", variant: "destructive"});
               router.push("/dashboard");
            } else {
              toast({ title: "Error", description: "Tarea no encontrada o ya procesada.", variant: "destructive"});
              router.push("/my-agenda");
            }
          } catch (error) {
            console.error("Error fetching visit to update:", error);
            toast({ title: "Error al Cargar Tarea", description: "No se pudo cargar la tarea para actualizar.", variant: "destructive"});
            router.push("/my-agenda");
          }
        } else {
            setEditingVisitId(null);
            setPageTitle("Registrar Visita / Pedido de Cliente");
            setCardDescription("Complete los detalles para registrar o programar una nueva interacción con un cliente.");
            form.reset({
                clientName: "", visitDate: new Date(), clientStatus: undefined, outcome: undefined, clavadistaId: NO_CLAVADISTA_VALUE,
                selectedSalesRepId: userRole === 'Admin' ? ADMIN_SELF_REGISTER_VALUE : undefined,
                canalOrigenColocacion: undefined, // Added
                notes: "",
                nombreFiscal: "", cif: "", direccionFiscal: "", direccionEntrega: "", contactoNombre: "", contactoCorreo: "", contactoTelefono: "", observacionesAlta: "",
                clientType: undefined, numberOfUnits: undefined, unitPrice: undefined, orderValue: undefined,
                nextActionType: undefined, nextActionCustom: "", nextActionDate: undefined,
                failureReasonType: undefined, failureReasonCustom: "", assignedMaterials: [], accountId: undefined,
            });
        }
        setIsLoadingForm(false);
    }
    if (!isLoadingDropdownData) {
      initializeForm();
    }
  }, [searchParams, form, teamMember, userRole, router, toast, isLoadingDropdownData, salesRepsList]);


  const outcomeWatched = form.watch("outcome");
  const clientStatusWatched = form.watch("clientStatus");
  const numberOfUnitsWatched = form.watch("numberOfUnits");
  const unitPriceWatched = form.watch("unitPrice");
  const nextActionTypeWatched = form.watch("nextActionType");
  const failureReasonTypeWatched = form.watch("failureReasonType");
  const clientNameWatched = form.watch("clientName");

  React.useEffect(() => {
    if (outcomeWatched === "successful" && typeof numberOfUnitsWatched === 'number' && typeof unitPriceWatched === 'number' && numberOfUnitsWatched > 0 && unitPriceWatched > 0) {
      const calculatedSubtotal = numberOfUnitsWatched * unitPriceWatched;
      const calculatedIvaAmount = calculatedSubtotal * (IVA_RATE / 100);
      const calculatedTotalValue = calculatedSubtotal + calculatedIvaAmount;

      form.setValue("orderValue", parseFloat(calculatedTotalValue.toFixed(2)), { shouldValidate: true });
      setSubtotal(parseFloat(calculatedSubtotal.toFixed(2)));
      setIvaAmount(parseFloat(calculatedIvaAmount.toFixed(2)));

    } else if (outcomeWatched === "successful") {
       form.setValue("orderValue", undefined);
       setSubtotal(undefined);
       setIvaAmount(undefined);
    }
  }, [numberOfUnitsWatched, unitPriceWatched, outcomeWatched, form, setSubtotal, setIvaAmount]);

  async function onSubmit(values: OrderFormValues) {
    setIsSubmitting(true);

    if (!teamMember) {
        toast({ title: "Error", description: "No se pudo identificar al usuario. Por favor, recargue la página.", variant: "destructive" });
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
    }


    let currentAccountId = values.accountId; 
    let accountCreationMessage = "";

    const finalClavadistaId = values.clavadistaId === NO_CLAVADISTA_VALUE ? undefined : values.clavadistaId;

    try {
      if (values.clientStatus === "new" && !currentAccountId) { 
          let accountExists = false;
          const allCurrentAccounts = await getAccountsFS();

          if (values.cif) {
              const existingAccountByCif = allCurrentAccounts.find(acc => acc.cif && acc.cif.toLowerCase() === values.cif!.toLowerCase());
              if (existingAccountByCif) {
                  currentAccountId = existingAccountByCif.id;
                  accountCreationMessage = ` (Cliente con CIF ${values.cif} ya existía. Visita/Pedido asociado a cuenta existente: ${existingAccountByCif.name}).`;
                  accountExists = true;
              }
          }

          if (!accountExists) {
              let newAccountStatus: AccountStatus = 'Potencial';
              if (values.outcome === "successful") newAccountStatus = 'Activo';
              else if (values.outcome === "failed") newAccountStatus = 'Inactivo';
              else if (values.outcome === "follow-up" || values.outcome === "Programar Visita") newAccountStatus = 'Potencial';

              const newAccountType: AccountType = (values.outcome === "successful" && values.clientType) ? values.clientType : (accountTypeList.includes(values.clientType as AccountType) ? values.clientType as AccountType : 'Otro');

              const newAccountData: AccountFormValues = {
                  name: values.clientName,
                  legalName: values.nombreFiscal || values.clientName,
                  cif: values.cif || `AUTOGEN_${Date.now()}`,
                  type: newAccountType,
                  status: newAccountStatus,
                  addressBilling: values.direccionFiscal,
                  addressShipping: values.direccionEntrega,
                  mainContactName: values.contactoNombre,
                  mainContactEmail: values.contactoCorreo,
                  mainContactPhone: values.contactoTelefono,
                  notes: values.observacionesAlta,
                  salesRepId: salesRepIdForAccount,
              };
              currentAccountId = await addAccountFS(newAccountData);
              accountCreationMessage = ` Nueva cuenta "${newAccountData.name}" creada con estado: ${newAccountStatus}.`;
          }
      } else if (values.clientStatus === "existing" && !currentAccountId) {
          const allCurrentAccounts = await getAccountsFS();
          const existingAccountByName = allCurrentAccounts.find(acc => acc.name.toLowerCase() === values.clientName.toLowerCase());
          if (existingAccountByName) {
              currentAccountId = existingAccountByName.id;
          }
          accountCreationMessage = currentAccountId ? " (Pedido asociado a cliente existente)." : " (Cliente existente, pero no se pudo encontrar un ID de cuenta para asociar).";
      }


      const orderData: Partial<Order> = {
        clientName: values.clientName,
        visitDate: format(values.visitDate, "yyyy-MM-dd"),
        clavadistaId: finalClavadistaId,
        canalOrigenColocacion: values.canalOrigenColocacion, // Added
        assignedMaterials: values.assignedMaterials || [],
        notes: values.notes,
        clientStatus: values.clientStatus, // This will be undefined if outcome is "Programar Visita"
        salesRep: salesRepNameForOrder,
        accountId: currentAccountId, 
        nombreFiscal: values.nombreFiscal,
        cif: values.cif,
        direccionFiscal: values.direccionFiscal,
        direccionEntrega: values.direccionEntrega,
        contactoNombre: values.contactoNombre,
        contactoCorreo: values.contactoCorreo,
        contactoTelefono: values.contactoTelefono,
        observacionesAlta: values.observacionesAlta,
      };
      
      if (values.clientStatus) {
          orderData.clientStatus = values.clientStatus;
      }


      if (values.outcome === "successful" && values.clientStatus && values.orderValue && values.clientType && values.numberOfUnits && values.unitPrice) {
          orderData.status = 'Confirmado';
          orderData.clientType = values.clientType;
          orderData.products = [SINGLE_PRODUCT_NAME];
          orderData.numberOfUnits = values.numberOfUnits;
          orderData.unitPrice = values.unitPrice;
          orderData.value = values.orderValue;
          toast({ title: "¡Enhorabuena!", description: <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-2 mt-1" /><p>Pedido para {values.clientName} registrado.{accountCreationMessage}</p></div> });
      } else if (values.outcome === "follow-up" && values.nextActionType) {
          orderData.status = 'Seguimiento';
          orderData.nextActionType = values.nextActionType;
          orderData.nextActionCustom = values.nextActionType === 'Opción personalizada' ? values.nextActionCustom : undefined;
          orderData.nextActionDate = values.nextActionDate ? format(values.nextActionDate, "yyyy-MM-dd") : undefined;
          toast({ title: "¡Seguimiento Registrado!", description: <div className="flex items-start"><Info className="h-5 w-5 text-blue-500 mr-2 mt-1" /><p>Seguimiento para {values.clientName} registrado.{accountCreationMessage}</p></div> });
      } else if (values.outcome === "failed" && values.nextActionType && values.failureReasonType) {
          orderData.status = 'Fallido';
          orderData.nextActionType = values.nextActionType;
          orderData.nextActionCustom = values.nextActionType === 'Opción personalizada' ? values.nextActionCustom : undefined;
          orderData.nextActionDate = values.nextActionDate ? format(values.nextActionDate, "yyyy-MM-dd") : undefined;
          orderData.failureReasonType = values.failureReasonType;
          orderData.failureReasonCustom = values.failureReasonType === 'Otro (especificar)' ? values.failureReasonCustom : undefined;
          toast({ title: "¡Visita Fallida Registrada!", description: <div className="flex items-start"><Info className="h-5 w-5 text-orange-500 mr-2 mt-1" /><p>Interacción fallida con {values.clientName} registrada.{accountCreationMessage}</p></div> });
      } else if (values.outcome === "Programar Visita") {
          orderData.status = 'Programada';
          orderData.assignedMaterials = []; 
          toast({ title: "¡Visita Programada!", description: <div className="flex items-start"><CalendarIcon className="h-5 w-5 text-purple-500 mr-2 mt-1" /><p>Visita para {values.clientName} programada para el {format(values.visitDate, "dd/MM/yyyy", { locale: es })}.{accountCreationMessage}</p></div> });
      } else {
          toast({ title: "Error de Envío", description: "Por favor, complete todos los campos obligatorios para el resultado seleccionado.", variant: "destructive" });
          setIsSubmitting(false);
          return;
      }

      if (editingVisitId) {
        await updateOrderFS(editingVisitId, orderData as Order);
      } else {
        await addOrderFS(orderData as Order);
      }
      
      refreshDataSignature(); 

      form.reset({
          clientName: "", visitDate: new Date(), clientStatus: undefined, outcome: undefined, clavadistaId: NO_CLAVADISTA_VALUE,
          selectedSalesRepId: userRole === 'Admin' ? ADMIN_SELF_REGISTER_VALUE : undefined,
          canalOrigenColocacion: undefined, // Added
          notes: "",
          nombreFiscal: "", cif: "", direccionFiscal: "", direccionEntrega: "", contactoNombre: "", contactoCorreo: "", contactoTelefono: "", observacionesAlta: "",
          clientType: undefined, numberOfUnits: undefined, unitPrice: undefined, orderValue: undefined,
          nextActionType: undefined, nextActionCustom: "", nextActionDate: undefined,
          failureReasonType: undefined, failureReasonCustom: "", assignedMaterials: [], accountId: undefined,
      });
      setSubtotal(undefined);
      setIvaAmount(undefined);
      if (editingVisitId) {
          router.push('/my-agenda'); 
      }
      setEditingVisitId(null);
      setPageTitle("Registrar Visita / Pedido de Cliente");
      setCardDescription("Complete los detalles para registrar o programar una nueva interacción con un cliente.");

    } catch (error) {
        console.error("Error submitting order/visit:", error);
        toast({ title: "Error Inesperado", description: "Ocurrió un error al guardar los datos. Inténtelo de nuevo.", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  }

  const showAccountCreationFields = clientStatusWatched === "new";
  const showClientStatusRadio = outcomeWatched !== "Programar Visita" && (!editingVisitId || (editingVisitId && outcomeWatched && outcomeWatched !== "Programar Visita"));

  const outcomeOptionsBase = [
    { value: "Programar Visita", label: "Programar Nueva Visita" },
    { value: "successful", label: "Pedido Exitoso" },
    { value: "failed", label: "Fallido / Sin Pedido" },
    { value: "follow-up", label: "Requiere Seguimiento" },
  ];

  const currentOutcomeOptions = editingVisitId
    ? outcomeOptionsBase.filter(opt => opt.value !== "Programar Visita")
    : outcomeOptionsBase;

  if (isLoadingForm || isLoadingDropdownData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando datos del formulario...</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
        <FileText className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">{pageTitle}</h1>
      </header>
      <Card className="max-w-2xl mx-auto shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>{cardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {userRole === 'Admin' && (
                <FormField
                  control={form.control}
                  name="selectedSalesRepId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><Users className="mr-2 h-4 w-4 text-primary" />Atribuir a Representante de Ventas</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ADMIN_SELF_REGISTER_VALUE} disabled={isLoadingDropdownData}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingDropdownData ? "Cargando..." : "Seleccionar representante"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={ADMIN_SELF_REGISTER_VALUE}>Registrar a mi nombre (Admin)</SelectItem>
                          {salesRepsList.map((rep: TeamMember) => (
                            <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Seleccione el comercial que realizó esta visita/venta.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField control={form.control} name="clientName" render={({ field }) => (<FormItem><FormLabel>Nombre del Cliente</FormLabel><FormControl><Input placeholder="p. ej., Café Central" {...field} disabled={!!editingVisitId && clientStatusWatched === 'existing'} /></FormControl><FormMessage /></FormItem>)} />
              <FormField
                control={form.control}
                name="visitDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Visita / Programación</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={!!editingVisitId}>
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={!!editingVisitId || ((date: Date) => date < new Date("2000-01-01"))} initialFocus locale={es}/>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="canalOrigenColocacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Zap className="mr-2 h-4 w-4 text-primary" />Canal de Origen de esta Colocación</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingDropdownData}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingDropdownData ? "Cargando..." : "Seleccionar canal de origen"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {canalOrigenColocacionList.map((canal: CanalOrigenColocacion) => (
                          <SelectItem key={canal} value={canal}>{canal}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>¿Cómo se originó esta oportunidad de colocación/pedido?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{editingVisitId ? "Resultado de la Interacción" : "Acción / Resultado de la Visita"}</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                        {currentOutcomeOptions.map(opt => (
                            <FormItem key={opt.value} className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value={opt.value} /></FormControl>
                                <FormLabel className="font-normal">{opt.label}</FormLabel>
                            </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showClientStatusRadio && (
                 <FormField
                    control={form.control}
                    name="clientStatus"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>¿Es un cliente nuevo o existente?</FormLabel>
                        <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1 sm:flex-row sm:space-x-4 sm:space-y-0">
                            <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="new" /></FormControl><FormLabel className="font-normal">Cliente Nuevo</FormLabel></FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="existing" /></FormControl><FormLabel className="font-normal">Cliente Existente</FormLabel></FormItem>
                        </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              )}

              <FormField
                control={form.control}
                name="clavadistaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Award className="mr-2 h-4 w-4 text-primary" />Clavadista (Brand Ambassador)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || NO_CLAVADISTA_VALUE} disabled={isLoadingDropdownData}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingDropdownData ? "Cargando..." : "Seleccionar clavadista (opcional)"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_CLAVADISTA_VALUE}>Ninguno</SelectItem>
                        {clavadistas.map((clava: TeamMember) => (
                          <SelectItem key={clava.id} value={clava.id}>{clava.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Seleccione si un clavadista participó en esta visita/venta.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />


              {outcomeWatched === "successful" && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-1"><h3 className="text-lg font-medium">Detalles del Pedido</h3><p className="text-sm text-muted-foreground">Información sobre los productos y valor del pedido.</p></div>
                  <FormField control={form.control} name="clientType" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Tipo de Cliente (para el Pedido)</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">{clientTypeList.map((type) => (<FormItem key={type} className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value={type} /></FormControl><FormLabel className="font-normal">{type}</FormLabel></FormItem>))}</RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                  <FormItem><FormLabel>Producto</FormLabel><Input value={SINGLE_PRODUCT_NAME} readOnly disabled className="bg-muted/50" /><FormDescription>Actualmente solo se gestiona el producto "{SINGLE_PRODUCT_NAME}".</FormDescription></FormItem>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="numberOfUnits" render={({ field }) => (<FormItem><FormLabel>Número de Unidades ({SINGLE_PRODUCT_NAME})</FormLabel><FormControl><Input type="number" placeholder="p. ej., 100" {...field} onChange={event => { const val = event.target.value; field.onChange(val === "" ? undefined : parseInt(val, 10));}} value={field.value === undefined ? '' : field.value} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="unitPrice" render={({ field }) => (<FormItem><FormLabel>Precio Unitario (€ sin IVA)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="p. ej., 15.50" {...field} onChange={event => { const val = event.target.value; field.onChange(val === "" ? undefined : parseFloat(val));}} value={field.value === undefined ? '' : field.value} /></FormControl><FormMessage /></FormItem>)}/>
                  </div>
                  <FormItem><FormLabel>Subtotal (€)</FormLabel><FormControl><Input type="number" readOnly disabled className="bg-muted/50" value={subtotal === undefined ? '' : subtotal.toFixed(2)} placeholder="Cálculo automático"/></FormControl></FormItem>
                  <FormItem><FormLabel>IVA ({IVA_RATE}%) (€)</FormLabel><FormControl><Input type="number" readOnly disabled className="bg-muted/50" value={ivaAmount === undefined ? '' : ivaAmount.toFixed(2)} placeholder="Cálculo automático"/></FormControl></FormItem>
                  <FormField control={form.control} name="orderValue" render={({ field }) => (<FormItem><FormLabel>Valor Total del Pedido (€ con IVA)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Cálculo automático" {...field} readOnly disabled className="bg-muted/50" value={field.value === undefined ? '' : field.value.toFixed(2)}/></FormControl><FormMessage /></FormItem>)}/>
                </>
              )}

              {showAccountCreationFields && !editingVisitId && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-1">
                    <h3 className="text-lg font-medium">Información de la Nueva Cuenta (Opcional)</h3>
                    <p className="text-sm text-muted-foreground">
                      Se creará una cuenta para "{clientNameWatched || 'este cliente'}". Puede añadir detalles adicionales aquí.
                      Estado de la cuenta: {outcomeWatched === "successful" ? "Activo" : (outcomeWatched === "follow-up" || outcomeWatched === "Programar Visita" ? "Potencial" : (outcomeWatched === "failed" ? "Inactivo" : "Pendiente de definir"))}.
                    </p>
                  </div>
                  <FormField control={form.control} name="nombreFiscal" render={({ field }) => (<FormItem><FormLabel>Nombre Fiscal</FormLabel><FormControl><Input placeholder="Nombre legal completo de la empresa" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={form.control} name="cif" render={({ field }) => (<FormItem><FormLabel>CIF</FormLabel><FormControl><Input placeholder="Número de Identificación Fiscal" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={form.control} name="direccionFiscal" render={({ field }) => (<FormItem><FormLabel>Dirección Fiscal</FormLabel><FormControl><Textarea placeholder="Calle, número, piso, ciudad, código postal, provincia" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={form.control} name="direccionEntrega" render={({ field }) => (<FormItem><FormLabel>Dirección de Entrega</FormLabel><FormControl><Textarea placeholder="Si es diferente a la fiscal: calle, número, piso, ciudad, código postal, provincia" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                  <Separator className="my-4" /><h4 className="text-md font-medium mb-2">Datos de Contacto (Cliente Nuevo - Opcional)</h4>
                  <FormField control={form.control} name="contactoNombre" render={({ field }) => (<FormItem><FormLabel>Nombre de Contacto</FormLabel><FormControl><Input placeholder="Persona de contacto principal" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={form.control} name="contactoCorreo" render={({ field }) => (<FormItem><FormLabel>Correo Electrónico de Contacto</FormLabel><FormControl><Input type="email" placeholder="ejemplo@empresa.com" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={form.control} name="contactoTelefono" render={({ field }) => (<FormItem><FormLabel>Teléfono de Contacto</FormLabel><FormControl><Input type="tel" placeholder="Número de teléfono" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                  <Separator className="my-4" />
                  <FormField control={form.control} name="observacionesAlta" render={({ field }) => (<FormItem><FormLabel>Observaciones (Alta Cliente)</FormLabel><FormControl><Textarea placeholder="Cualquier detalle adicional para el alta del cliente..." {...field} /></FormControl><FormDescription>Este campo es opcional.</FormDescription><FormMessage /></FormItem>)}/>
                </>
              )}
               {clientStatusWatched === "existing" && outcomeWatched === "successful" && (
                 <div className="my-4 p-3 bg-secondary/30 rounded-md">
                   <p className="text-sm text-muted-foreground">
                     Se registrará el pedido para el cliente existente <strong className="text-foreground">{clientNameWatched}</strong>. Los datos de facturación se tomarán de la cuenta existente.
                   </p>
                 </div>
               )}

              {(outcomeWatched === "follow-up" || outcomeWatched === "failed") && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-1"><h3 className="text-lg font-medium">Plan de Seguimiento / Fallo</h3></div>
                  <FormField
                    control={form.control}
                    name="nextActionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Próxima Acción</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Seleccione una próxima acción" /></SelectTrigger></FormControl>
                          <SelectContent>{nextActionTypeList.map(action => (<SelectItem key={action} value={action}>{action}</SelectItem>))}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {nextActionTypeWatched === "Opción personalizada" && (
                    <FormField control={form.control} name="nextActionCustom" render={({ field }) => (<FormItem><FormLabel>Detalle Próxima Acción Personalizada</FormLabel><FormControl><Input placeholder="Especifique la acción" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  )}
                  <FormField
                    control={form.control}
                    name="nextActionDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha Tentativa Próxima Acción (Opcional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {outcomeWatched === "failed" && (
                <>
                  {outcomeWatched !== "follow-up" && <Separator className="my-4" />}
                  <div className="space-y-1"><h3 className="text-lg font-medium">Detalles del Fallo</h3></div>
                  <FormField
                    control={form.control}
                    name="failureReasonType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo del Fallo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un motivo" /></SelectTrigger></FormControl>
                          <SelectContent>{failureReasonList.map(reason => (<SelectItem key={reason} value={reason}>{reason}</SelectItem>))}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {failureReasonTypeWatched === "Otro (especificar)" && (
                    <FormField control={form.control} name="failureReasonCustom" render={({ field }) => (<FormItem><FormLabel>Detalle Motivo del Fallo Personalizado</FormLabel><FormControl><Textarea placeholder="Especifique el motivo" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  )}
                </>
              )}

              {outcomeWatched && outcomeWatched !== "Programar Visita" && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-3">
                    <FormLabel className="flex items-center text-lg font-medium"><Package className="mr-2 h-5 w-5 text-primary"/> Materiales Promocionales Asignados</FormLabel>
                    <FormDescription>Añada los materiales promocionales utilizados o entregados en esta interacción.</FormDescription>
                    {isLoadingDropdownData && <Loader2 className="h-4 w-4 animate-spin" />}
                    {!isLoadingDropdownData && materialFields.map((item, index) => {
                      const selectedMaterial = availableMaterials.find(m => m.id === watchedMaterials[index]?.materialId);
                      const unitCost = selectedMaterial?.latestPurchase?.calculatedUnitCost || 0;
                      return (
                        <div key={item.id} className="flex items-end gap-2 p-3 border rounded-md bg-secondary/30">
                          <FormField
                            control={form.control}
                            name={`assignedMaterials.${index}.materialId`}
                            render={({ field }) => (
                              <FormItem className="flex-grow">
                                <FormLabel className="text-xs">Material</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingDropdownData}>
                                  <FormControl><SelectTrigger><SelectValue placeholder={isLoadingDropdownData ? "Cargando..." : "Seleccionar material"} /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {availableMaterials.map(mat => (
                                      <SelectItem key={mat.id} value={mat.id}>{mat.name} ({mat.type}) - <FormattedNumericValue value={mat.latestPurchase?.calculatedUnitCost || 0} options={{style:'currency', currency:'EUR', minimumFractionDigits: 2, maximumFractionDigits: 4}}/></SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`assignedMaterials.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem className="w-24">
                                <FormLabel className="text-xs">Cantidad</FormLabel>
                                <FormControl><Input type="number" {...field}
                                  onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                                  value={field.value ?? ""}
                                /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="text-sm text-muted-foreground w-28 text-right whitespace-nowrap">
                            {watchedMaterials[index]?.quantity > 0 ? (
                                <FormattedNumericValue value={unitCost * watchedMaterials[index].quantity} options={{style:'currency', currency:'EUR'}} />
                            ) : <FormattedNumericValue value={0} options={{style:'currency', currency:'EUR'}} />}
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(index)} className="text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendMaterial({ materialId: "", quantity: 1 })}
                      className="mt-2"
                      disabled={isLoadingDropdownData}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Añadir Material
                    </Button>
                    {watchedMaterials.length > 0 && (
                      <div className="text-right font-medium text-primary pt-2">
                          Coste Total Estimado Materiales: <FormattedNumericValue value={totalEstimatedMaterialCostForOrder} options={{style:'currency', currency:'EUR'}} />
                      </div>
                    )}
                  </div>
                  <Separator className="my-6" />
                </>
              )}

              <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>{outcomeWatched === "Programar Visita" ? "Objetivo de la Visita / Comentarios de Programación (Opcional)" : "Notas Adicionales Generales"}</FormLabel><FormControl><Textarea placeholder={outcomeWatched === "Programar Visita" ? "Detalles sobre el propósito de la visita programada..." : "Cualquier otra información relevante sobre la visita o pedido..."} {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <CardFooter className="p-0 pt-4">
                <Button type="submit" className="w-full" disabled={isSubmitting || !teamMember || isLoadingDropdownData}>
                  {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>) : (editingVisitId ? "Guardar Resultado de Interacción" : "Enviar Registro")}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
