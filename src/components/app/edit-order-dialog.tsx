
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Order, OrderStatus, UserRole, TeamMember, NextActionType, FailureReasonType, ClientType, PromotionalMaterial, Account, CanalOrigenColocacion } from "@/types"; // Added CanalOrigenColocacion
import { orderStatusesList, nextActionTypeList, failureReasonList, clientTypeList, canalOrigenColocacionList } from "@/lib/data"; // Added canalOrigenColocacionList
import { Loader2, CalendarIcon, Printer, Award, Package, PlusCircle, Trash2, Zap } from "lucide-react"; // Added Zap
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { getTeamMembersFS } from "@/services/team-member-service";
import { getPromotionalMaterialsFS } from "@/services/promotional-material-service";
import { getAccountByIdFS } from "@/services/account-service"; 
import { useToast } from "@/hooks/use-toast";


const NO_CLAVADISTA_VALUE = "##NONE##";

const assignedMaterialSchemaForDialog = z.object({
  materialId: z.string().min(1, "Debe seleccionar un material."),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
});


const editOrderFormSchema = z.object({
  clientName: z.string().min(2, "El nombre del cliente debe tener al menos 2 caracteres."),
  products: z.string().optional(),
  value: z.coerce.number().positive("El valor del pedido debe ser positivo.").optional(),
  status: z.enum(orderStatusesList as [OrderStatus, ...OrderStatus[]]),
  salesRep: z.string().min(1, "El representante de ventas es obligatorio."),
  clavadistaId: z.string().optional(),
  canalOrigenColocacion: z.enum(canalOrigenColocacionList as [CanalOrigenColocacion, ...CanalOrigenColocacion[]]).optional(), // Added
  assignedMaterials: z.array(assignedMaterialSchemaForDialog).optional().default([]),

  clientType: z.enum(clientTypeList as [ClientType, ...ClientType[]]).optional(),
  numberOfUnits: z.coerce.number().positive("El número de unidades debe ser positivo.").optional(),
  unitPrice: z.coerce.number().positive("El precio unitario debe ser positivo.").optional(),

  nombreFiscal: z.string().optional(),
  cif: z.string().optional(),
  direccionFiscal: z.string().optional(),
  direccionEntrega: z.string().optional(),
  contactoNombre: z.string().optional(),
  contactoCorreo: z.string().email("El formato del correo no es válido.").optional().or(z.literal('')),
  contactoTelefono: z.string().optional(),
  observacionesAlta: z.string().optional(), 
  notes: z.string().optional(),

  nextActionType: z.enum(nextActionTypeList as [NextActionType, ...NextActionType[]]).optional(),
  nextActionCustom: z.string().optional(),
  nextActionDate: z.date().optional(),
  failureReasonType: z.enum(failureReasonList as [FailureReasonType, ...FailureReasonType[]]).optional(),
  failureReasonCustom: z.string().optional(),
}).superRefine((data, ctx) => {
    if (['Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Pendiente'].includes(data.status)) {
        if (!data.products || data.products.trim() === "") {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Los productos son obligatorios para este estado.", path: ["products"] });
        }
        if (data.value === undefined || data.value <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El valor del pedido es obligatorio y positivo para este estado.", path: ["value"] });
        }
         if (!data.clientType) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El tipo de cliente es obligatorio.", path: ["clientType"] });
        }
        if (['Confirmado', 'Procesando', 'Enviado', 'Entregado'].includes(data.status)) {
            if (!data.nombreFiscal || data.nombreFiscal.trim() === "") ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nombre fiscal es obligatorio.", path: ["nombreFiscal"] });
            if (!data.cif || data.cif.trim() === "") ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CIF es obligatorio.", path: ["cif"] });
             if (!data.direccionFiscal || data.direccionFiscal.trim() === "") ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Dirección fiscal es obligatoria.", path: ["direccionFiscal"] });
        }
    }
});


export type EditOrderFormValues = z.infer<typeof editOrderFormSchema>;

interface EditOrderDialogProps {
  order: Order | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: EditOrderFormValues, orderId: string) => void;
  currentUserRole: UserRole;
}

export default function EditOrderDialog({ order, isOpen, onOpenChange, onSave, currentUserRole }: EditOrderDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [clavadistas, setClavadistas] = React.useState<TeamMember[]>([]);
  const [salesReps, setSalesReps] = React.useState<TeamMember[]>([]);
  const [availableMaterials, setAvailableMaterials] = React.useState<PromotionalMaterial[]>([]);
  const [isLoadingDropdownData, setIsLoadingDropdownData] = React.useState(true);
  const [isLoadingAccountDetails, setIsLoadingAccountDetails] = React.useState(false); 
  const { toast } = useToast();


  React.useEffect(() => {
    async function loadDataForDialog() {
      if (isOpen) {
        setIsLoadingDropdownData(true);
        try {
          const [fetchedClavadistas, fetchedSalesReps, fetchedMaterials] = await Promise.all([
            getTeamMembersFS(['Clavadista']),
            getTeamMembersFS(['SalesRep', 'Admin']),
            getPromotionalMaterialsFS()
          ]);
          setClavadistas(fetchedClavadistas);
          setSalesReps(fetchedSalesReps);
          setAvailableMaterials(fetchedMaterials.filter(m => m.latestPurchase && m.latestPurchase.calculatedUnitCost > 0));
        } catch (error) {
          console.error("Error loading data for edit order dialog:", error);
          toast({ title: "Error Datos Diálogo", description: "No se pudieron cargar datos para el diálogo.", variant: "destructive"});
        } finally {
          setIsLoadingDropdownData(false);
        }
      }
    }
    loadDataForDialog();
  }, [isOpen, toast]);


  const form = useForm<EditOrderFormValues>({
    resolver: zodResolver(editOrderFormSchema),
    defaultValues: {
      clientName: "", products: "", value: undefined, status: "Pendiente", salesRep: "",
      clavadistaId: NO_CLAVADISTA_VALUE, canalOrigenColocacion: undefined, // Added
      assignedMaterials: [], clientType: undefined,
      numberOfUnits: undefined, unitPrice: undefined, nombreFiscal: "", cif: "",
      direccionFiscal: "", direccionEntrega: "", contactoNombre: "", contactoCorreo: "",
      contactoTelefono: "", observacionesAlta: "", notes: "", nextActionType: undefined,
      nextActionCustom: "", nextActionDate: undefined, failureReasonType: undefined,
      failureReasonCustom: "",
    },
  });

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control: form.control, name: "assignedMaterials",
  });

  const watchedMaterials = form.watch("assignedMaterials");

  const totalEstimatedMaterialCostForDialog = React.useMemo(() => {
    return watchedMaterials.reduce((total, current) => {
      const materialDetails = availableMaterials.find(m => m.id === current.materialId);
      const unitCost = materialDetails?.latestPurchase?.calculatedUnitCost || 0;
      return total + (unitCost * current.quantity);
    }, 0);
  }, [watchedMaterials, availableMaterials]);


  const currentStatus = form.watch("status");
  const isAdmin = currentUserRole === 'Admin';
  const isDistributor = currentUserRole === 'Distributor';

  React.useEffect(() => {
    async function initializeFormWithOrderAndAccountData() {
      if (order && isOpen && !isLoadingDropdownData) {
        let accountData: Account | null = null;
        if (order.accountId) {
          setIsLoadingAccountDetails(true);
          try {
            accountData = await getAccountByIdFS(order.accountId);
          } catch (err) {
            console.error("Error fetching account details for order dialog:", err);
            toast({ title: "Error Cuenta", description: "No se pudieron cargar los detalles de la cuenta asociada.", variant: "destructive"});
          } finally {
            setIsLoadingAccountDetails(false);
          }
        }

        form.reset({
          clientName: order.clientName,
          products: order.products?.join(",\n") || "",
          value: order.value,
          status: order.status,
          salesRep: order.salesRep || (salesReps.length > 0 ? salesReps[0].name : ""),
          clavadistaId: order.clavadistaId || NO_CLAVADISTA_VALUE,
          canalOrigenColocacion: order.canalOrigenColocacion || undefined, // Added
          assignedMaterials: order.assignedMaterials || [],
          clientType: order.clientType,
          numberOfUnits: order.numberOfUnits,
          unitPrice: order.unitPrice,
          nombreFiscal: accountData?.legalName || order.nombreFiscal || "",
          cif: accountData?.cif || order.cif || "",
          direccionFiscal: accountData?.addressBilling || order.direccionFiscal || "",
          direccionEntrega: accountData?.addressShipping || order.direccionEntrega || "",
          contactoNombre: accountData?.mainContactName || order.contactoNombre || "",
          contactoCorreo: accountData?.mainContactEmail || order.contactoCorreo || "",
          contactoTelefono: accountData?.mainContactPhone || order.contactoTelefono || "",
          observacionesAlta: order.observacionesAlta || "", 
          notes: order.notes || "",
          nextActionType: order.nextActionType,
          nextActionCustom: order.nextActionCustom || "",
          nextActionDate: order.nextActionDate && isValid(parseISO(order.nextActionDate)) ? parseISO(order.nextActionDate) : undefined,
          failureReasonType: order.failureReasonType,
          failureReasonCustom: order.failureReasonCustom || "",
        });
      }
    }
    if (isOpen && !isLoadingDropdownData) { 
        initializeFormWithOrderAndAccountData();
    }
  }, [order, isOpen, form, isLoadingDropdownData, salesReps, toast]);


  const onSubmit = async (data: EditOrderFormValues) => {
    if (!order) return;
    setIsSaving(true);
    
    const canEditFullOrderDetails = isAdmin;
    const canEditStatusAndNotes = isAdmin || isDistributor;

    const dataToSave: EditOrderFormValues = {
      clientName: canEditFullOrderDetails ? data.clientName : order.clientName,
      products: canEditFullOrderDetails ? data.products : order.products?.join(",\n"),
      value: canEditFullOrderDetails ? data.value : order.value,
      status: canEditStatusAndNotes ? data.status : order.status, 
      salesRep: isAdmin ? data.salesRep : order.salesRep,
      clavadistaId: isAdmin ? (data.clavadistaId === NO_CLAVADISTA_VALUE ? undefined : data.clavadistaId) : order.clavadistaId,
      canalOrigenColocacion: isAdmin ? data.canalOrigenColocacion : order.canalOrigenColocacion, // Added
      assignedMaterials: isAdmin ? (data.assignedMaterials || []) : (order.assignedMaterials || []),
      clientType: canEditFullOrderDetails ? data.clientType : order.clientType,
      numberOfUnits: canEditFullOrderDetails ? data.numberOfUnits : order.numberOfUnits,
      unitPrice: canEditFullOrderDetails ? data.unitPrice : order.unitPrice,
      nombreFiscal: canEditFullOrderDetails ? data.nombreFiscal : order.nombreFiscal,
      cif: canEditFullOrderDetails ? data.cif : order.cif,
      direccionFiscal: canEditFullOrderDetails ? data.direccionFiscal : order.direccionFiscal,
      direccionEntrega: canEditFullOrderDetails ? data.direccionEntrega : order.direccionEntrega,
      contactoNombre: canEditFullOrderDetails ? data.contactoNombre : order.contactoNombre,
      contactoCorreo: canEditFullOrderDetails ? data.contactoCorreo : order.contactoCorreo,
      contactoTelefono: canEditFullOrderDetails ? data.contactoTelefono : order.contactoTelefono,
      observacionesAlta: order.observacionesAlta, 
      notes: canEditStatusAndNotes ? data.notes : order.notes, 
      nextActionType: order.nextActionType, 
      nextActionCustom: order.nextActionCustom,
      nextActionDate: order.nextActionDate ? parseISO(order.nextActionDate) : undefined,
      failureReasonType: order.failureReasonType,
      failureReasonCustom: order.failureReasonCustom,
    };

    await new Promise(resolve => setTimeout(resolve, 700));
    onSave(dataToSave, order.id);
    setIsSaving(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!order) return null;

  const isSalesRep = currentUserRole === 'SalesRep';
  
  const canEditOrderDetailsOverall = isAdmin;
  const canEditStatusAndNotesOnly = isDistributor && !isAdmin; // For distributor, only status and notes
  const isReadOnlyForMostFields = isSalesRep || (!isAdmin && !isDistributor);

  const formFieldsGenericDisabled = isReadOnlyForMostFields || isLoadingDropdownData || isLoadingAccountDetails;
  const productRelatedFieldsDisabled = !canEditOrderDetailsOverall || currentStatus === 'Seguimiento' || currentStatus === 'Fallido' || currentStatus === 'Programada' || isLoadingDropdownData || isLoadingAccountDetails;
  const billingFieldsDisabled = !isAdmin || currentStatus === 'Seguimiento' || currentStatus === 'Fallido' || currentStatus === 'Programada' || isLoadingDropdownData || isLoadingAccountDetails;
  const statusFieldDisabled = !(canEditOrderDetailsOverall || canEditStatusAndNotesOnly) || isLoadingDropdownData || isLoadingAccountDetails;
  const notesFieldDisabled = !(canEditOrderDetailsOverall || canEditStatusAndNotesOnly) || isLoadingDropdownData || isLoadingAccountDetails;
  const salesRepFieldDisabled = !isAdmin || isLoadingDropdownData || isLoadingAccountDetails;
  const clavadistaFieldDisabled = !canEditOrderDetailsOverall || isLoadingDropdownData || isLoadingAccountDetails;
  const canalOrigenFieldDisabled = !canEditOrderDetailsOverall || isLoadingDropdownData || isLoadingAccountDetails;
  const materialsSectionDisabled = !canEditOrderDetailsOverall || currentStatus === 'Programada' || isLoadingDropdownData || isLoadingAccountDetails;


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl max-h-[90vh] overflow-y-auto print-dialog-content">
        <DialogHeader className="print-hide">
          <DialogTitle>
            {(isReadOnlyForMostFields && !canEditStatusAndNotesOnly) ? "Detalles Pedido:" : "Editar Pedido:"} {order.id} ({order.status})
          </DialogTitle>
          <DialogDescription>
            {(isReadOnlyForMostFields && !canEditStatusAndNotesOnly)
              ? "Viendo los detalles del pedido."
              : "Modifique los detalles del pedido y/o el estado. Haga clic en guardar cuando haya terminado."}
          </DialogDescription>
        </DialogHeader>
        {isLoadingDropdownData || isLoadingAccountDetails ? (
            <div className="flex justify-center items-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Cargando detalles...</p>
            </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="clientName" render={({ field }) => (<FormItem><FormLabel>Nombre del Cliente</FormLabel><FormControl><Input placeholder="Nombre del cliente" {...field} disabled={!canEditOrderDetailsOverall || formFieldsGenericDisabled} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="salesRep" render={({ field }) => (<FormItem><FormLabel>Representante de Ventas</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={salesRepFieldDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un representante" /></SelectTrigger></FormControl><SelectContent>{salesReps.map((member: TeamMember) => (<SelectItem key={member.id} value={member.name}>{member.name} ({member.role === 'SalesRep' ? 'Rep. Ventas' : member.role})</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Estado</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={statusFieldDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un estado" /></SelectTrigger></FormControl><SelectContent>{orderStatusesList.filter(s => s !== 'Programada' && s !== 'Fallido' && s !== 'Seguimiento').map((statusVal) => (<SelectItem key={statusVal} value={statusVal}>{statusVal}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField
                    control={form.control}
                    name="clavadistaId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center"><Award className="mr-2 h-4 w-4 text-primary" />Clavadista (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || NO_CLAVADISTA_VALUE} disabled={clavadistaFieldDisabled}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Seleccionar clavadista" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value={NO_CLAVADISTA_VALUE}>Ninguno</SelectItem>
                            {clavadistas.map((clava: TeamMember) => (
                            <SelectItem key={clava.id} value={clava.id}>{clava.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="canalOrigenColocacion"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center"><Zap className="mr-2 h-4 w-4 text-primary" />Canal Origen (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={canalOrigenFieldDisabled}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Seleccionar canal" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {canalOrigenColocacionList.map((canal) => (
                            <SelectItem key={canal} value={canal}>{canal}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>

            <Separator className="my-6" />
            <h3 className="text-md font-semibold text-muted-foreground pt-2">Información del Pedido y Productos</h3>

            {(currentStatus === 'Confirmado' || currentStatus === 'Procesando' || currentStatus === 'Enviado' || currentStatus === 'Entregado' || currentStatus === 'Pendiente') ? (
              <>
                <FormField control={form.control} name="clientType" render={({ field }) => (<FormItem><FormLabel>Tipo de Cliente</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={productRelatedFieldsDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione tipo cliente" /></SelectTrigger></FormControl><SelectContent>{clientTypeList.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="products" render={({ field }) => (<FormItem><FormLabel>Productos Pedidos</FormLabel><FormControl><Textarea placeholder="Listar productos y cantidades..." className="min-h-[80px]" {...field} disabled={productRelatedFieldsDisabled} /></FormControl><FormDescription>Separe múltiples productos con comas, punto y coma o saltos de línea.</FormDescription><FormMessage /></FormItem>)}/>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="numberOfUnits" render={({ field }) => (<FormItem><FormLabel>Nº Unidades Totales</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value,10))} value={field.value ?? ""} disabled={productRelatedFieldsDisabled} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="unitPrice" render={({ field }) => (<FormItem><FormLabel>Precio Unitario Medio (€ sin IVA)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} value={field.value ?? ""} disabled={productRelatedFieldsDisabled} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="value" render={({ field }) => (<FormItem><FormLabel>Valor Total Pedido (€ IVA incl.)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="p. ej., 250.75" {...field} onChange={event => field.onChange(event.target.value === '' ? undefined : parseFloat(event.target.value))} value={field.value ?? ""} disabled={productRelatedFieldsDisabled}/></FormControl><FormMessage /></FormItem>)}/>
                </div>
              </>
            ) : (
                 <p className="text-sm text-muted-foreground">Los detalles de productos y valor no aplican para el estado actual del pedido ({currentStatus}).</p>
            )}

            <Separator className="my-6" />
            <h3 className="text-md font-semibold text-muted-foreground">Información de Cliente y Facturación</h3>
             {(currentStatus === 'Confirmado' || currentStatus === 'Procesando' || currentStatus === 'Enviado' || currentStatus === 'Entregado' || currentStatus === 'Pendiente' || isAdmin) ? (
             <>
                <FormField control={form.control} name="nombreFiscal" render={({ field }) => (<FormItem><FormLabel>Nombre Fiscal</FormLabel><FormControl><Input placeholder="Nombre legal para facturación" {...field} disabled={billingFieldsDisabled}/></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="cif" render={({ field }) => (<FormItem><FormLabel>CIF/NIF</FormLabel><FormControl><Input placeholder="Identificador fiscal" {...field} disabled={billingFieldsDisabled}/></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="direccionFiscal" render={({ field }) => (<FormItem><FormLabel>Dirección Fiscal</FormLabel><FormControl><Textarea placeholder="Dirección fiscal completa" {...field} className="min-h-[60px]" disabled={billingFieldsDisabled}/></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="direccionEntrega" render={({ field }) => (<FormItem><FormLabel>Dirección de Entrega</FormLabel><FormControl><Textarea placeholder="Dirección de entrega completa" {...field} className="min-h-[60px]" disabled={billingFieldsDisabled}/></FormControl><FormMessage /></FormItem>)}/>

                <h4 className="text-sm font-medium text-muted-foreground pt-2">Datos de Contacto para este Pedido</h4>
                <FormField control={form.control} name="contactoNombre" render={({ field }) => (<FormItem><FormLabel>Nombre de Contacto</FormLabel><FormControl><Input placeholder="Persona de contacto para el pedido" {...field} disabled={billingFieldsDisabled}/></FormControl><FormMessage /></FormItem>)}/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="contactoCorreo" render={({ field }) => (<FormItem><FormLabel>Correo de Contacto</FormLabel><FormControl><Input type="email" placeholder="email@ejemplo.com" {...field} disabled={billingFieldsDisabled}/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="contactoTelefono" render={({ field }) => (<FormItem><FormLabel>Teléfono de Contacto</FormLabel><FormControl><Input type="tel" placeholder="Número de teléfono" {...field} disabled={billingFieldsDisabled}/></FormControl><FormMessage /></FormItem>)}/>
                </div>
                <FormField control={form.control} name="observacionesAlta" render={({ field }) => (<FormItem><FormLabel>Observaciones (Originales del Alta Cliente)</FormLabel><FormControl><Textarea placeholder="Notas originales del alta" {...field} className="min-h-[60px]" disabled={true}/></FormControl><FormDescription>Este campo es informativo del alta original y no se edita aquí.</FormDescription><FormMessage /></FormItem>)}/>
             </>
             ) : (
                <p className="text-sm text-muted-foreground">La información de facturación completa se muestra para pedidos confirmados o en proceso, o para administradores.</p>
             )}


            {(order.status === 'Seguimiento' || order.status === 'Fallido' || order.status === 'Programada') && (
                <>
                  <Separator className="my-6" />
                  <h3 className="text-md font-semibold text-muted-foreground">Información de Seguimiento/Programación Original</h3>
                  <FormField control={form.control} name="nextActionType" render={({ field }) => (<FormItem><FormLabel>Próxima Acción (Original)</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={true}><FormControl><SelectTrigger><SelectValue placeholder="N/A" /></SelectTrigger></FormControl><SelectContent>{nextActionTypeList.map(action => (<SelectItem key={action} value={action}>{action}</SelectItem>))}</SelectContent></Select></FormItem>)}/>
                  {order.nextActionType === "Opción personalizada" && (<FormField control={form.control} name="nextActionCustom" render={({ field }) => (<FormItem><FormLabel>Detalle Próx. Acción Personalizada (Original)</FormLabel><FormControl><Input {...field} disabled={true} /></FormControl></FormItem>)} />)}
                  <FormField
                    control={form.control}
                    name="nextActionDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha Próx. Acción (Original)</FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl>
                              <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")} disabled={true}>
                                {field.value ? format(field.value, "PPP", { locale: es }) : <span>N/A</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button></FormControl></PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} /></PopoverContent>
                        </Popover>
                      </FormItem>
                    )}
                  />
                   {order.status === 'Fallido' && (
                     <>
                      <FormField control={form.control} name="failureReasonType" render={({ field }) => (<FormItem><FormLabel>Motivo Fallo (Original)</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={true}><FormControl><SelectTrigger><SelectValue placeholder="N/A" /></SelectTrigger></FormControl><SelectContent>{failureReasonList.map(reason => (<SelectItem key={reason} value={reason}>{reason}</SelectItem>))}</SelectContent></Select></FormItem>)}/>
                      {order.failureReasonType === "Otro (especificar)" && (<FormField control={form.control} name="failureReasonCustom" render={({ field }) => (<FormItem><FormLabel>Detalle Motivo Fallo Personalizado (Original)</FormLabel><FormControl><Textarea {...field} disabled={true} /></FormControl></FormItem>)} />)}
                     </>
                   )}
                </>
            )}

            {currentStatus !== 'Programada' && (
                <>
                  <Separator className="my-6" />
                  <h3 className="text-md font-semibold text-muted-foreground">Materiales Promocionales Asignados</h3>
                  <div className="space-y-3">
                    {isLoadingDropdownData && <Loader2 className="h-4 w-4 animate-spin" />}
                    {!isLoadingDropdownData && materialFields.map((item, index) => {
                      const selectedMaterialInfo = availableMaterials.find(m => m.id === watchedMaterials[index]?.materialId);
                      const unitCost = selectedMaterialInfo?.latestPurchase?.calculatedUnitCost || 0;
                      return (
                        <div key={item.id} className="flex items-end gap-2 p-3 border rounded-md bg-secondary/30">
                          <FormField
                            control={form.control}
                            name={`assignedMaterials.${index}.materialId`}
                            render={({ field }) => (
                              <FormItem className="flex-grow">
                                <FormLabel className="text-xs">Material</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={materialsSectionDisabled}>
                                  <FormControl><SelectTrigger><SelectValue placeholder={isLoadingDropdownData ? "Cargando..." : "Seleccionar material"} /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {availableMaterials.map(mat => (
                                      <SelectItem key={mat.id} value={mat.id}>{mat.name} ({mat.type}) - <FormattedNumericValue value={mat.latestPurchase?.calculatedUnitCost || 0} options={{style:'currency', currency:'EUR', minimumFractionDigits: 2, maximumFractionDigits: 4 }}/></SelectItem>
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
                                <FormControl><Input type="number" {...field} disabled={materialsSectionDisabled}
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
                          {!materialsSectionDisabled && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(index)} className="text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    {!materialsSectionDisabled && (
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
                    )}
                    {watchedMaterials.length > 0 && (
                      <div className="text-right font-medium text-primary pt-2">
                          Coste Total Estimado Materiales: <FormattedNumericValue value={totalEstimatedMaterialCostForDialog} options={{style:'currency', currency:'EUR'}} />
                      </div>
                    )}
                  </div>
                </>
            )}

            <Separator className="my-6" />
            <h3 className="text-md font-semibold text-muted-foreground">Notas Adicionales</h3>
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas Generales del Pedido/Visita</FormLabel><FormControl><Textarea placeholder="Notas sobre el pedido o visita..." {...field} className="min-h-[60px]" disabled={notesFieldDisabled}/></FormControl><FormMessage /></FormItem>)}/>

            <DialogFooter className="pt-6 print-hide">
              <Button type="button" variant="outline" onClick={handlePrint} className="mr-auto">
                  <Printer className="mr-2 h-4 w-4" /> Imprimir Ficha
              </Button>
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button></DialogClose>
              {!(isReadOnlyForMostFields && !canEditStatusAndNotesOnly) && (
                <Button type="submit" disabled={isSaving || isLoadingDropdownData || isLoadingAccountDetails || (!form.formState.isDirty && !(isAdmin || isDistributor)) }>
                  {isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : ("Guardar Cambios")}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
