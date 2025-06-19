
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
import { Calendar as CalendarIcon, Check, Loader2, Info, Edit3, Send, FileText, Award, Package, PlusCircle, Trash2, Euro } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { mockOrders, mockTeamMembers, clientTypeList, nextActionTypeList, failureReasonList, mockAccounts, orderStatusesList, accountTypeList, mockPromotionalMaterials } from "@/lib/data";
import { kpiDataLaunch } from "@/lib/launch-dashboard-data";
import type { Order, ClientType, NextActionType, FailureReasonType, Account, AccountType, AccountStatus, TeamMember, AssignedPromotionalMaterial } from "@/types";
import { useAuth } from "@/contexts/auth-context"; 
import { useSearchParams, useRouter } from "next/navigation";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";

const SINGLE_PRODUCT_NAME = "Santa Brisa 750ml";
const IVA_RATE = 21; // 21%
const NO_CLAVADISTA_VALUE = "##NONE##";

const assignedMaterialSchema = z.object({
  materialId: z.string().min(1, "Debe seleccionar un material."),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
});

const orderFormSchemaBase = z.object({
  clientName: z.string().min(2, "El nombre del cliente debe tener al menos 2 caracteres."),
  visitDate: z.date({ required_error: "La fecha de visita es obligatoria." }),
  clientStatus: z.enum(["new", "existing"], { required_error: "Debe indicar si es un cliente nuevo o existente." }).optional(),
  outcome: z.enum(["Programar Visita", "successful", "failed", "follow-up"], { required_error: "Por favor, seleccione un resultado." }),
  clavadistaId: z.string().optional(), // Can be "##NONE##" or an actual ID
  
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

  if ((data.outcome === "failed" || data.outcome === "follow-up" || data.outcome === "Programar Visita") && !data.clientStatus) {
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
  const { teamMember, userRole } = useAuth(); 
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editingVisitId, setEditingVisitId] = React.useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [subtotal, setSubtotal] = React.useState<number | undefined>(undefined);
  const [ivaAmount, setIvaAmount] = React.useState<number | undefined>(undefined);
  const [pageTitle, setPageTitle] = React.useState("Registrar Visita / Pedido de Cliente");
  const [cardDescription, setCardDescription] = React.useState("Complete los detalles para registrar o programar una interacción.");

  const clavadistas = React.useMemo(() => mockTeamMembers.filter(m => m.role === 'Clavadista'), []);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      clientName: "",
      visitDate: new Date(), 
      clientStatus: undefined,
      outcome: undefined,
      clavadistaId: NO_CLAVADISTA_VALUE,
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
    },
  });

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control: form.control,
    name: "assignedMaterials",
  });

  const watchedMaterials = form.watch("assignedMaterials");

  const totalEstimatedMaterialCostForOrder = React.useMemo(() => {
    return watchedMaterials.reduce((total, current) => {
      const materialDetails = mockPromotionalMaterials.find(m => m.id === current.materialId);
      return total + (materialDetails ? materialDetails.unitCost * current.quantity : 0);
    }, 0);
  }, [watchedMaterials]);


  React.useEffect(() => {
    const visitIdToUpdate = searchParams.get('updateVisitId');
    if (visitIdToUpdate) {
      const existingVisit = mockOrders.find(o => o.id === visitIdToUpdate && (o.status === 'Programada' || o.status === 'Seguimiento' || o.status === 'Fallido'));
      if (existingVisit && teamMember && (existingVisit.salesRep === teamMember.name || userRole === 'Admin')) {
        setEditingVisitId(visitIdToUpdate);
        
        let visitDateParsed = new Date(existingVisit.visitDate);
        if (!isValid(visitDateParsed)) visitDateParsed = new Date(); 
        
        const title = `Registrar Resultado: ${existingVisit.clientName} (${format(visitDateParsed, "dd/MM/yy", {locale: es})})`;
        setPageTitle(title);
        setCardDescription("Actualice el resultado de la visita o tarea de seguimiento programada.");

        form.reset({
          clientName: existingVisit.clientName,
          visitDate: visitDateParsed,
          clientStatus: existingVisit.clientStatus || undefined, 
          outcome: undefined, 
          clavadistaId: existingVisit.clavadistaId || NO_CLAVADISTA_VALUE,
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
          nextActionDate: existingVisit.nextActionDate ? parseISO(existingVisit.nextActionDate) : undefined,
          failureReasonType: existingVisit.failureReasonType,
          failureReasonCustom: existingVisit.failureReasonCustom || "",
          assignedMaterials: existingVisit.assignedMaterials || [],
        });
      } else if (existingVisit) {
         toast({ title: "Acceso Denegado", description: "No tienes permiso para actualizar esta visita o ya ha sido procesada de otra forma.", variant: "destructive"});
         router.push("/dashboard"); 
      } else {
        toast({ title: "Error", description: "Tarea no encontrada o ya procesada.", variant: "destructive"});
        router.push("/my-agenda");
      }
    } else {
        setEditingVisitId(null);
        const title = "Registrar Visita / Pedido de Cliente";
        setPageTitle(title);
        setCardDescription("Complete los detalles para registrar o programar una nueva interacción con un cliente.");
        form.reset({ 
            clientName: "",
            visitDate: new Date(),
            clientStatus: undefined,
            outcome: undefined,
            clavadistaId: NO_CLAVADISTA_VALUE,
            notes: "", 
            nombreFiscal: "",
            cif: "",
            direccionFiscal: "",
            direccionEntrega: "",
            contactoNombre: "",
            contactoCorreo: "",
            contactoTelefono: "",
            observacionesAlta: "",
            clientType: undefined,
            numberOfUnits: undefined,
            unitPrice: undefined,
            orderValue: undefined,
            nextActionType: undefined,
            nextActionCustom: "",
            nextActionDate: undefined,
            failureReasonType: undefined,
            failureReasonCustom: "",
            assignedMaterials: [],
        });
    }
  }, [searchParams, form, teamMember, userRole, router, toast]);


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
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (!teamMember) {
        toast({ title: "Error", description: "No se pudo identificar al usuario. Por favor, recargue la página.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    const salesRepName = teamMember.name;
    const currentDate = format(new Date(), "yyyy-MM-dd");
    let accountCreationMessage = "";
    let orderDetailsForMock: Partial<Order> = {};
    let associatedAccountId: string | undefined = undefined;
    
    const finalClavadistaId = values.clavadistaId === NO_CLAVADISTA_VALUE ? undefined : values.clavadistaId;

    if (values.clientStatus === "new") {
        let accountExists = false;
        if (values.cif) {
            const existingAccountByCif = mockAccounts.find(acc => acc.cif && acc.cif.toLowerCase() === values.cif!.toLowerCase());
            if (existingAccountByCif) {
                associatedAccountId = existingAccountByCif.id;
                accountCreationMessage = ` (Cliente con CIF ${values.cif} ya existía. Visita/Pedido asociado a cuenta existente: ${existingAccountByCif.name}).`;
                accountExists = true;
                orderDetailsForMock = { // Populate details from existing account
                    nombreFiscal: existingAccountByCif.legalName, cif: existingAccountByCif.cif, direccionFiscal: existingAccountByCif.addressBilling,
                    direccionEntrega: existingAccountByCif.addressShipping, contactoNombre: existingAccountByCif.mainContactName,
                    contactoCorreo: existingAccountByCif.mainContactEmail, contactoTelefono: existingAccountByCif.mainContactPhone,
                };
            }
        }

        if (!accountExists) {
            let newAccountStatus: AccountStatus = 'Potencial';
            if (values.outcome === "successful") newAccountStatus = 'Activo';
            else if (values.outcome === "failed") newAccountStatus = 'Inactivo';
            else if (values.outcome === "follow-up") newAccountStatus = 'Potencial';
            else if (values.outcome === "Programar Visita") newAccountStatus = 'Potencial';

            const newAccountType: AccountType = (values.outcome === "successful" && values.clientType) ? values.clientType : (accountTypeList.includes(values.clientType as AccountType) ? values.clientType as AccountType : 'Otro');
            
            const newAccount: Account = {
                id: `acc_${Date.now()}`,
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
                salesRepId: teamMember.id,
                createdAt: currentDate,
                updatedAt: currentDate,
            };
            mockAccounts.unshift(newAccount);
            associatedAccountId = newAccount.id;
            accountCreationMessage = ` Nueva cuenta "${newAccount.name}" creada con estado: ${newAccountStatus}.`;
             orderDetailsForMock = { // Populate details from new account
                nombreFiscal: newAccount.legalName, cif: newAccount.cif, direccionFiscal: newAccount.addressBilling,
                direccionEntrega: newAccount.addressShipping, contactoNombre: newAccount.mainContactName,
                contactoCorreo: newAccount.mainContactEmail, contactoTelefono: newAccount.mainContactPhone, observacionesAlta: values.observacionesAlta,
            };
        }
    } else if (values.clientStatus === "existing") {
        const existingAccount = mockAccounts.find(acc => acc.name.toLowerCase() === values.clientName.toLowerCase());
        if (existingAccount) {
            associatedAccountId = existingAccount.id;
             orderDetailsForMock = {
                nombreFiscal: existingAccount.legalName, cif: existingAccount.cif, direccionFiscal: existingAccount.addressBilling,
                direccionEntrega: existingAccount.addressShipping, contactoNombre: existingAccount.mainContactName,
                contactoCorreo: existingAccount.mainContactEmail, contactoTelefono: existingAccount.mainContactPhone,
            };
        }
        accountCreationMessage = " (Cliente existente).";
    }


    if (editingVisitId) {
        const visitIndex = mockOrders.findIndex(o => o.id === editingVisitId);
        if (visitIndex === -1) {
            toast({ title: "Error", description: "No se pudo encontrar la tarea para actualizar.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
        const originalVisit = mockOrders[visitIndex];
        
        let updatedVisitData: Partial<Order> = {
            lastUpdated: currentDate,
            notes: values.notes, 
            clientStatus: values.clientStatus,
            clavadistaId: finalClavadistaId,
            assignedMaterials: values.assignedMaterials,
            ...orderDetailsForMock, // Add account details from new/existing account
        };

        if (values.outcome === "successful" && values.clientStatus && values.visitDate && values.orderValue && values.clientType && values.numberOfUnits && values.unitPrice) {
            updatedVisitData = {
                ...updatedVisitData,
                status: 'Confirmado', 
                clientType: values.clientType,
                products: [SINGLE_PRODUCT_NAME],
                numberOfUnits: values.numberOfUnits,
                unitPrice: values.unitPrice,
                value: values.orderValue,
            };
            
            if (userRole === 'SalesRep' || userRole === 'Admin') { 
                const memberToUpdate = mockTeamMembers.find(m => m.name === salesRepName && (m.role === 'SalesRep' || m.role === 'Admin'));
                if (memberToUpdate) {
                  memberToUpdate.bottlesSold = (memberToUpdate.bottlesSold || 0) + values.numberOfUnits;
                  memberToUpdate.orders = (memberToUpdate.orders || 0) + 1;
                }
            }
            const kpiVentasTotales = kpiDataLaunch.find(k => k.id === 'kpi1'); if (kpiVentasTotales) kpiVentasTotales.currentValue += values.numberOfUnits;
            const kpiVentasEquipo = kpiDataLaunch.find(k => k.id === 'kpi2'); if (kpiVentasEquipo) kpiVentasEquipo.currentValue += values.numberOfUnits;

            toast({ title: "¡Enhorabuena!", description: <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-2 mt-1" /><p>Pedido para {values.clientName} registrado y tarea completada.{accountCreationMessage}</p></div> });

        } else if (values.outcome === "follow-up" && values.visitDate && values.nextActionType) {
            updatedVisitData = { ...updatedVisitData, status: 'Seguimiento', nextActionType: values.nextActionType, nextActionCustom: values.nextActionType === 'Opción personalizada' ? values.nextActionCustom : undefined, nextActionDate: values.nextActionDate ? format(values.nextActionDate, "yyyy-MM-dd") : undefined };
            toast({ title: "¡Seguimiento Actualizado!", description: <div className="flex items-start"><Info className="h-5 w-5 text-blue-500 mr-2 mt-1" /><p>Seguimiento para {values.clientName} actualizado.{accountCreationMessage}</p></div> });
        } else if (values.outcome === "failed" && values.visitDate && values.nextActionType && values.failureReasonType) {
            updatedVisitData = { ...updatedVisitData, status: 'Fallido', nextActionType: values.nextActionType, nextActionCustom: values.nextActionType === 'Opción personalizada' ? values.nextActionCustom : undefined, nextActionDate: values.nextActionDate ? format(values.nextActionDate, "yyyy-MM-dd") : undefined, failureReasonType: values.failureReasonType, failureReasonCustom: values.failureReasonType === 'Otro (especificar)' ? values.failureReasonCustom : undefined };
            toast({ title: "¡Visita Fallida Registrada!", description: <div className="flex items-start"><Info className="h-5 w-5 text-orange-500 mr-2 mt-1" /><p>Interacción fallida con {values.clientName} actualizada.{accountCreationMessage}</p></div> });
        } else {
            toast({ title: "Error de Envío", description: "Por favor, complete todos los campos obligatorios para el resultado seleccionado.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
        mockOrders[visitIndex] = { ...originalVisit, ...updatedVisitData, clientName: values.clientName, visitDate: format(values.visitDate, "yyyy-MM-dd") };

    } else { // Not editing an existing visit, creating a new record
        if (userRole === 'SalesRep' || userRole === 'Admin') { 
            const memberToUpdate = mockTeamMembers.find(m => m.name === salesRepName && (m.role === 'SalesRep' || m.role === 'Admin'));
            if (memberToUpdate) memberToUpdate.visits = (memberToUpdate.visits || 0) + 1;
        }

        if (values.outcome === "Programar Visita" && values.visitDate) {
            const newProgrammedVisit: Order = {
                id: `VISPROG_${Date.now()}`, clientName: values.clientName, visitDate: format(values.visitDate, "yyyy-MM-dd"),
                status: 'Programada', salesRep: salesRepName, lastUpdated: currentDate, notes: values.notes, clientStatus: values.clientStatus,
                clavadistaId: finalClavadistaId, assignedMaterials: [], // Materials not assigned for programmed visits
                ...orderDetailsForMock
            };
            mockOrders.unshift(newProgrammedVisit);
            toast({ title: "¡Visita Programada!", description: <div className="flex items-start"><CalendarIcon className="h-5 w-5 text-purple-500 mr-2 mt-1" /><p>Visita para {values.clientName} programada para el {format(values.visitDate, "dd/MM/yyyy", { locale: es })}.{accountCreationMessage}</p></div> });

        } else if (values.outcome === "successful" && values.clientStatus && values.visitDate && values.orderValue && values.clientType && values.numberOfUnits && values.unitPrice) {
          const newOrder: Order = {
            id: `ORD_${Date.now()}`, clientName: values.clientName, visitDate: format(values.visitDate, "yyyy-MM-dd"), clientType: values.clientType, products: [SINGLE_PRODUCT_NAME], 
            numberOfUnits: values.numberOfUnits, unitPrice: values.unitPrice, value: values.orderValue, status: 'Confirmado', salesRep: salesRepName, lastUpdated: currentDate, 
            notes: values.notes, clientStatus: values.clientStatus, clavadistaId: finalClavadistaId, assignedMaterials: values.assignedMaterials,
            ...orderDetailsForMock 
          };
          mockOrders.unshift(newOrder);

          if (userRole === 'SalesRep' || userRole === 'Admin') {
            const memberToUpdate = mockTeamMembers.find(m => m.name === salesRepName && (m.role === 'SalesRep' || m.role === 'Admin'));
            if (memberToUpdate) {
              memberToUpdate.bottlesSold = (memberToUpdate.bottlesSold || 0) + values.numberOfUnits;
              memberToUpdate.orders = (memberToUpdate.orders || 0) + 1;
            }
          }
          const kpiVentasTotales = kpiDataLaunch.find(k => k.id === 'kpi1'); if (kpiVentasTotales) kpiVentasTotales.currentValue += values.numberOfUnits;
          const kpiVentasEquipo = kpiDataLaunch.find(k => k.id === 'kpi2'); if (kpiVentasEquipo) kpiVentasEquipo.currentValue += values.numberOfUnits;
          toast({ title: "¡Enhorabuena!", description: <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-2 mt-1" /><p>Pedido {newOrder.id} para {newOrder.clientName} registrado.{accountCreationMessage}</p></div> });
        
        } else if (values.outcome === "follow-up" && values.visitDate && values.nextActionType) {
            const newFollowUpEntry: Order = {
                id: `VISFLW_${Date.now()}`, clientName: values.clientName, visitDate: format(values.visitDate, "yyyy-MM-dd"), status: 'Seguimiento', salesRep: salesRepName, lastUpdated: currentDate,
                nextActionType: values.nextActionType, nextActionCustom: values.nextActionType === 'Opción personalizada' ? values.nextActionCustom : undefined, nextActionDate: values.nextActionDate ? format(values.nextActionDate, "yyyy-MM-dd") : undefined,
                notes: values.notes, clientStatus: values.clientStatus, clavadistaId: finalClavadistaId, assignedMaterials: values.assignedMaterials,
                ...orderDetailsForMock
            };
            mockOrders.unshift(newFollowUpEntry);
            toast({ title: "¡Seguimiento Registrado!", description: <div className="flex items-start"><Info className="h-5 w-5 text-blue-500 mr-2 mt-1" /><p>Seguimiento para {values.clientName} registrado.{accountCreationMessage}</p></div> });

        } else if (values.outcome === "failed" && values.visitDate && values.nextActionType && values.failureReasonType) {
            const newFailedEntry: Order = {
                id: `VISFLD_${Date.now()}`, clientName: values.clientName, visitDate: format(values.visitDate, "yyyy-MM-dd"), status: 'Fallido', salesRep: salesRepName, lastUpdated: currentDate,
                nextActionType: values.nextActionType, nextActionCustom: values.nextActionType === 'Opción personalizada' ? values.nextActionCustom : undefined, nextActionDate: values.nextActionDate ? format(values.nextActionDate, "yyyy-MM-dd") : undefined,
                failureReasonType: values.failureReasonType, failureReasonCustom: values.failureReasonType === 'Otro (especificar)' ? values.failureReasonCustom : undefined,
                notes: values.notes, clientStatus: values.clientStatus, clavadistaId: finalClavadistaId, assignedMaterials: values.assignedMaterials,
                ...orderDetailsForMock
            };
            mockOrders.unshift(newFailedEntry);
            toast({ title: "¡Visita Fallida Registrada!", description: <div className="flex items-start"><Info className="h-5 w-5 text-orange-500 mr-2 mt-1" /><p>Visita fallida a {values.clientName} registrada.{accountCreationMessage}</p></div> });
        } else {
            toast({ title: "Error de Envío", description: "Por favor, complete todos los campos obligatorios según el resultado seleccionado.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
    }

    form.reset({ 
        clientName: "", visitDate: new Date(), clientStatus: undefined, outcome: undefined, clavadistaId: NO_CLAVADISTA_VALUE, notes: "",
        nombreFiscal: "", cif: "", direccionFiscal: "", direccionEntrega: "", contactoNombre: "", contactoCorreo: "", contactoTelefono: "", observacionesAlta: "",
        clientType: undefined, numberOfUnits: undefined, unitPrice: undefined, orderValue: undefined,
        nextActionType: undefined, nextActionCustom: "", nextActionDate: undefined,
        failureReasonType: undefined, failureReasonCustom: "", assignedMaterials: [],
    });
    setSubtotal(undefined);
    setIvaAmount(undefined);
    setIsSubmitting(false);
    if (editingVisitId) {
        router.push('/my-agenda'); 
    }
    setEditingVisitId(null); 
    setPageTitle("Registrar Visita / Pedido de Cliente");
    setCardDescription("Complete los detalles para registrar o programar una nueva interacción con un cliente.");
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
              <FormField control={form.control} name="clientName" render={({ field }) => (<FormItem><FormLabel>Nombre del Cliente</FormLabel><FormControl><Input placeholder="p. ej., Café Central" {...field} disabled={!!editingVisitId} /></FormControl><FormMessage /></FormItem>)} />
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
                    <Select onValueChange={field.onChange} value={field.value || NO_CLAVADISTA_VALUE}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar clavadista (opcional)" />
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
              
              {showAccountCreationFields && (
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
              
              {/* Materials Section - Shown if outcome is not "Programar Visita" */}
              {outcomeWatched && outcomeWatched !== "Programar Visita" && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-3">
                    <FormLabel className="flex items-center text-lg font-medium"><Package className="mr-2 h-5 w-5 text-primary"/> Materiales Promocionales Asignados</FormLabel>
                    <FormDescription>Añada los materiales promocionales utilizados o entregados en esta interacción.</FormDescription>
                    {materialFields.map((item, index) => {
                      const selectedMaterial = mockPromotionalMaterials.find(m => m.id === watchedMaterials[index]?.materialId);
                      return (
                        <div key={item.id} className="flex items-end gap-2 p-3 border rounded-md bg-secondary/30">
                          <FormField
                            control={form.control}
                            name={`assignedMaterials.${index}.materialId`}
                            render={({ field }) => (
                              <FormItem className="flex-grow">
                                <FormLabel className="text-xs">Material</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar material" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {mockPromotionalMaterials.map(mat => (
                                      <SelectItem key={mat.id} value={mat.id}>{mat.name} ({mat.type}) - <FormattedNumericValue value={mat.unitCost} options={{style:'currency', currency:'EUR'}}/></SelectItem>
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
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="text-sm text-muted-foreground w-28 text-right whitespace-nowrap">
                            {selectedMaterial && watchedMaterials[index]?.quantity > 0 ? (
                                <FormattedNumericValue value={selectedMaterial.unitCost * watchedMaterials[index].quantity} options={{style:'currency', currency:'EUR'}} />
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
                <Button type="submit" className="w-full" disabled={isSubmitting || !teamMember}>
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

