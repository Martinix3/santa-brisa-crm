
      
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
import type { Order, TeamMember, InventoryItem, Account, CanalOrigenColocacion, PaymentMethod, AddressDetails } from "@/types"; 
import { canalOrigenColocacionList } from "@/lib/data"; 
import { Loader2, Calendar as CalendarIcon, Printer, Award, Package, PlusCircle, Trash2, Zap, CreditCard, UploadCloud, Link2, AlertTriangle } from "lucide-react"; 
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { getInventoryItemsAction } from "@/services/server/inventory-actions";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { EstadoPedido as OrderStatus, RolUsuario as UserRole, SiguienteAccion as NextActionType, MotivoFallo as FailureReasonType, TipoCliente as ClientType, ESTADOS_PEDIDO as orderStatusesList, SIGUIENTES_ACCIONES as nextActionTypeList, MOTIVOS_FALLO as failureReasonList, TIPOS_CLIENTE as clientTypeList, METODOS_PAGO as paymentMethodList } from "@ssot";

const NO_CLAVADISTA_VALUE = "##NONE##";

const editOrderFormSchema = z.object({
  clientName: z.string().optional(),
  products: z.array(z.string()).optional(),
  value: z.coerce.number({ invalid_type_error: "Debe ser un número" }).positive("El valor debe ser positivo.").optional().nullable(),
  status: z.enum(orderStatusesList as [OrderStatus, ...OrderStatus[]]),
  salesRep: z.string().optional(),
  clavadistaId: z.string().optional().nullable(),
  canalOrigenColocacion: z.enum(canalOrigenColocacionList as [CanalOrigenColocacion, ...CanalOrigenColocacion[]]).optional(),
  paymentMethod: z.enum(paymentMethodList as [PaymentMethod, ...PaymentMethod[]]).optional(),
  invoiceUrl: z.string().trim().url("Debe ser una URL válida.").or(z.literal("")).optional().nullable(),
  invoiceFileName: z.string().optional(),
  assignedMaterials: z.array(z.object({
    materialId: z.string().min(1, "Debe seleccionar un material."),
    quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  })).optional().default([]),
  clientType: z.enum(clientTypeList as [ClientType, ...ClientType[]]).optional(),
  numberOfUnits: z.coerce.number({ invalid_type_error: "Debe ser un número." }).positive("El número de unidades debe ser positivo.").optional().nullable(),
  unitPrice: z.coerce.number({ invalid_type_error: "Debe ser un número." }).positive("El precio unitario debe ser positivo.").optional().nullable(),
  notes: z.string().optional(),
  nextActionType: z.enum(nextActionTypeList as [NextActionType, ...NextActionType[]]).optional(),
  nextActionCustom: z.string().optional(),
  nextActionDate: z.date().optional(),
  failureReasonType: z.enum(failureReasonList as [FailureReasonType, ...FailureReasonType[]]).optional(),
  failureReasonCustom: z.string().optional(),
});


export type EditOrderFormValues = z.infer<typeof editOrderFormSchema>;

interface EditOrderDialogProps {
  order: Order | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: EditOrderFormValues, orderId: string) => void;
  currentUserRole: UserRole;
  allAccounts?: Account[];
  allTeamMembers?: TeamMember[];
}

function isValidUrl(urlString: string | undefined | null): boolean {
  if (!urlString) return false;
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
}

export default function EditOrderDialog({ order, isOpen, onOpenChange, onSave, currentUserRole, allAccounts = [], allTeamMembers = [] }: EditOrderDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [availableMaterials, setAvailableMaterials] = React.useState<InventoryItem[]>([]);
  const [isLoadingDropdownData, setIsLoadingDropdownData] = React.useState(true);
  const { toast } = useToast();

  const clavadistas = React.useMemo(() => allTeamMembers.filter(m => m.role === 'Clavadista' || m.role === 'Líder Clavadista'), [allTeamMembers]);
  const salesReps = React.useMemo(() => allTeamMembers.filter(m => m.role === 'SalesRep' || m.role === 'Admin'), [allTeamMembers]);


  const associatedAccount = React.useMemo(() => {
    if (!order) return null;
    if (order.accountId) {
      return allAccounts.find(acc => acc.id === order.accountId) || null;
    }
    return allAccounts.find(acc => acc.nombre.toLowerCase().trim() === order.clientName.toLowerCase().trim()) || null;
  }, [order, allAccounts]);

  const formatAddressForDisplay = (address?: AddressDetails): string => {
      if (!address) return 'No especificada';
      const parts = [
        (address.street ? `${address.street}${address.number ? `, ${address.number}` : ''}` : null),
        address.city,
        address.province,
        address.postalCode,
      ].filter(Boolean);
      if (parts.length === 0) return 'No especificada';
      return parts.join(',\n');
  };

  const form = useForm<EditOrderFormValues>({
    resolver: zodResolver(editOrderFormSchema),
    mode: "onChange",
    defaultValues: {
      clientName: "", products: [], value: undefined, status: "Pendiente", salesRep: "",
      clavadistaId: NO_CLAVADISTA_VALUE, canalOrigenColocacion: undefined, paymentMethod: undefined,
      invoiceUrl: "", invoiceFileName: "",
      assignedMaterials: [], clientType: undefined,
      numberOfUnits: undefined, unitPrice: undefined,
      notes: "", nextActionType: undefined,
      nextActionCustom: "", nextActionDate: undefined,
      failureReasonType: undefined, failureReasonCustom: "",
    },
  });

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control: form.control, name: "assignedMaterials",
  });

  const watchedInvoiceUrl = form.watch("invoiceUrl");
  const watchedMaterials = form.watch("assignedMaterials");

  const totalEstimatedMaterialCostForDialog = React.useMemo(() => {
    return watchedMaterials.reduce((total, current) => {
      const materialDetails = availableMaterials.find(m => m.id === current.materialId);
      const unitCost = materialDetails?.latestPurchase?.calculatedUnitCost || 0;
      return total + (current.quantity * unitCost);
    }, 0);
  }, [watchedMaterials, availableMaterials]);


  const currentStatus = form.watch("status");
  const isAdmin = currentUserRole === 'Admin';
  const isDistributor = currentUserRole === 'Distributor';

  React.useEffect(() => {
    if (isOpen) {
        setIsLoadingDropdownData(true);
        getInventoryItemsAction()
          .then(fetchedMaterials => {
              setAvailableMaterials(fetchedMaterials.filter(m => m.latestPurchase && m.latestPurchase.calculatedUnitCost > 0));
          })
          .catch(error => {
              console.error("Error loading data for edit order dialog:", error);
              toast({ title: "Error de carga de datos", description: "No se pudieron cargar los materiales.", variant: "destructive"});
          })
          .finally(() => {
              setIsLoadingDropdownData(false);
          });
    }
  }, [isOpen, toast]);

  React.useEffect(() => {
    if (isOpen && order) {
        form.reset({
            clientName: order.clientName || "",
            products: Array.isArray(order.products) ? order.products : [],
            value: order.value ?? undefined,
            status: order.status,
            salesRep: order.salesRep || "",
            clavadistaId: order.clavadistaId || NO_CLAVADISTA_VALUE,
            canalOrigenColocacion: order.canalOrigenColocacion || undefined,
            paymentMethod: order.paymentMethod || undefined,
            invoiceUrl: order.invoiceUrl || "",
            invoiceFileName: order.invoiceFileName || "",
            assignedMaterials: order.assignedMaterials || [],
            clientType: order.clientType ?? undefined,
            numberOfUnits: order.numberOfUnits ?? undefined,
            unitPrice: order.unitPrice ?? undefined,
            notes: order.notes || "",
            nextActionType: order.nextActionType ?? undefined,
            nextActionCustom: order.nextActionCustom || "",
            nextActionDate: order.nextActionDate && isValid(parseISO(order.nextActionDate)) ? parseISO(order.nextActionDate) : undefined,
            failureReasonType: order.failureReasonType ?? undefined,
            failureReasonCustom: order.failureReasonCustom || "",
        });
        form.trigger();
    }
  }, [order, isOpen, form]);
  
  React.useEffect(() => {
    const shouldClearProductFields = ['Seguimiento', 'Fallido', 'Programada'].includes(currentStatus);
    const shouldClearInvoice = currentStatus !== 'Facturado';
    
    if (shouldClearProductFields) {
      if (form.getValues('clientType') !== undefined) { form.setValue('clientType', undefined, { shouldDirty: true }); }
      if (form.getValues('products') !== undefined && form.getValues('products')?.length > 0) { form.setValue('products', [], { shouldDirty: true }); }
      if (form.getValues('numberOfUnits') !== undefined) { form.setValue('numberOfUnits', undefined, { shouldDirty: true }); }
      if (form.getValues('unitPrice') !== undefined) { form.setValue('unitPrice', undefined, { shouldDirty: true }); }
      if (form.getValues('paymentMethod') !== undefined) { form.setValue('paymentMethod', undefined, { shouldDirty: true }); }
    }

    if (shouldClearInvoice) {
      if (form.getValues('invoiceUrl') !== null && form.getValues('invoiceUrl') !== undefined && form.getValues('invoiceUrl') !== "") { form.setValue('invoiceUrl', null, { shouldDirty: true }); }
    }
    
    form.trigger();
    
  }, [currentStatus, form]);

  const onSubmit = async (data: EditOrderFormValues) => {
    if (!order) return;
    
    let dataToSave: any = { ...data };
    
    if (dataToSave.clavadistaId === NO_CLAVADISTA_VALUE) {
      delete dataToSave.clavadistaId;
    }
    
    setIsSaving(true);
    try {
      await onSave(dataToSave, order.id);
    } catch(e: any) {
        console.error("Fallo al guardar desde el diálogo:", e);
        toast({ title: "Error al Guardar", description: `No se pudo guardar: ${e.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };
  
  const isSalesRep = currentUserRole === 'SalesRep';
  
  const canEditOrderDetailsOverall = isAdmin;
  const canEditStatusAndNotesOnly = isDistributor && !isAdmin; 
  const isReadOnlyForMostFields = isSalesRep || (!isAdmin && !isDistributor);
  const canManageInvoice = isAdmin || isDistributor;

  const formFieldsGenericDisabled = isReadOnlyForMostFields || isLoadingDropdownData;
  const productRelatedFieldsDisabled = !canEditOrderDetailsOverall || ['Seguimiento', 'Fallido', 'Programada'].includes(currentStatus) || isLoadingDropdownData;
  const statusFieldDisabled = !(canEditOrderDetailsOverall || canEditStatusAndNotesOnly) || isLoadingDropdownData;
  const notesFieldDisabled = !(canEditOrderDetailsOverall || canEditStatusAndNotesOnly) || isLoadingDropdownData;
  const salesRepFieldDisabled = !isAdmin || isLoadingDropdownData;
  const clavadistaFieldDisabled = !canEditOrderDetailsOverall || isLoadingDropdownData;
  const canalOrigenFieldDisabled = !canEditOrderDetailsOverall || isLoadingDropdownData;
  const paymentMethodFieldDisabled = !canEditOrderDetailsOverall || productRelatedFieldsDisabled;
  const materialsSectionDisabled = !canEditOrderDetailsOverall || currentStatus === 'Programada' || isLoadingDropdownData;
  const invoiceSectionDisabled = !canManageInvoice || isLoadingDropdownData;
  
  if (!order && isOpen) { 
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Error</DialogTitle></DialogHeader>
                <p>No se ha proporcionado información del pedido.</p>
                <DialogFooter><DialogClose asChild><Button>Cerrar</Button></DialogClose></DialogFooter>
            </DialogContent>
        </Dialog>
    );
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-3xl xl:max-w-4xl max-h-[90vh] overflow-y-auto print-dialog-content">
        <DialogHeader className="print-hide">
          <DialogTitle>
            {(isReadOnlyForMostFields && !canEditStatusAndNotesOnly) ? "Detalles Pedido:" : "Editar Pedido:"} {order?.id} ({order?.status})
          </DialogTitle>
          <DialogDescription>
            {(isReadOnlyForMostFields && !canEditStatusAndNotesOnly)
              ? "Viendo los detalles del pedido."
              : "Modifique los detalles del pedido y/o el estado. Haga clic en guardar cuando haya terminado."}
          </DialogDescription>
        </DialogHeader>
        {isLoadingDropdownData ? (
            <div className="flex justify-center items-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Cargando detalles...</p>
            </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="clientName" render={({ field }) => (<FormItem><FormLabel>Nombre del Cliente</FormLabel><FormControl><Input placeholder="Nombre del cliente" {...field} value={field.value ?? ""} disabled={!canEditOrderDetailsOverall || formFieldsGenericDisabled} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="salesRep" render={({ field }) => (<FormItem><FormLabel>Representante de Ventas</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={salesRepFieldDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un representante" /></SelectTrigger></FormControl><SelectContent>{salesReps.map((member: TeamMember) => (<SelectItem key={member.id} value={member.name}>{member.name} ({member.role === 'SalesRep' ? 'Rep. Ventas' : member.role})</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Estado</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={statusFieldDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un estado" /></SelectTrigger></FormControl><SelectContent>{orderStatusesList.filter(s => s !== 'Programada' && s !== 'Fallido' && s !== 'Seguimiento').map((statusVal) => (<SelectItem key={statusVal} value={statusVal}>{statusVal}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="paymentMethod" render={({ field }) => (<FormItem><FormLabel className="flex items-center"><CreditCard className="mr-1 h-4 w-4"/>Forma Pago</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={paymentMethodFieldDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar forma de pago" /></SelectTrigger></FormControl><SelectContent>{paymentMethodList.map(method => (<SelectItem key={method} value={method}>{method}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField
                    control={form.control}
                    name="clavadistaId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center"><Award className="mr-2 h-4 w-4 text-primary" />Clavadista</FormLabel>
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
                        <FormLabel className="flex items-center"><Zap className="mr-2 h-4 w-4 text-primary" />Canal Origen</FormLabel>
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
            
            {associatedAccount && (
              <>
                <Separator className="my-6" />
                <h3 className="text-md font-semibold text-muted-foreground">Detalles de la Cuenta</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm p-3 border rounded-md bg-muted/50">
                  <div className="md:col-span-1 space-y-4">
                    <div>
                        <p className="font-semibold">Nombre Fiscal</p>
                        <p>{associatedAccount.legalName || 'No especificado'}</p>
                    </div>
                    <div>
                        <p className="font-semibold">CIF/NIF</p>
                        <p>{associatedAccount.cif || 'No especificado'}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Tipo de Cuenta</p>
                        <p>{associatedAccount.type}</p>
                    </div>
                  </div>
                  <div className="md:col-span-1 space-y-4">
                      <div>
                          <p className="font-semibold">Dirección Facturación</p>
                          <p className="whitespace-pre-line">{formatAddressForDisplay(associatedAccount.addressBilling)}</p>
                      </div>
                      <div>
                          <p className="font-semibold">Dirección Entrega</p>
                          <p className="whitespace-pre-line">{formatAddressForDisplay(associatedAccount.addressShipping)}</p>
                      </div>
                  </div>
                  <div className="md:col-span-1 space-y-4">
                    <div>
                      <p className="font-semibold">Contacto Principal</p>
                        <div className="space-y-1">
                          <p className="font-medium">{associatedAccount.mainContactName || 'No disponible'}</p>
                          {associatedAccount.mainContactEmail && <a href={`mailto:${associatedAccount.mainContactEmail}`} className="text-primary hover:underline block truncate">{associatedAccount.mainContactEmail}</a>}
                          {associatedAccount.mainContactPhone && <a href={`tel:${associatedAccount.mainContactPhone}`} className="text-primary hover:underline block">{associatedAccount.mainContactPhone}</a>}
                          {!(associatedAccount.mainContactEmail || associatedAccount.mainContactPhone) && !associatedAccount.mainContactName && <p className="text-muted-foreground italic">Sin datos</p>}
                        </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator className="my-6" />
            <h3 className="text-md font-semibold text-muted-foreground pt-2">Información del Pedido y Productos</h3>

            {(!['Seguimiento', 'Fallido', 'Programada'].includes(currentStatus)) ? (
              <>
                <FormField control={form.control} name="clientType" render={({ field }) => (<FormItem><FormLabel>Tipo de Cliente</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={productRelatedFieldsDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione tipo cliente" /></SelectTrigger></FormControl><SelectContent>{clientTypeList.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="products" render={({ field }) => (<FormItem><FormLabel>Productos Pedidos</FormLabel><FormControl><Textarea placeholder="Listar productos y cantidades..." className="min-h-[80px]" {...field} value={Array.isArray(field.value) ? field.value.join(', ') : ''} onChange={(e) => field.onChange(e.target.value.split(',').map(p => p.trim()))} disabled={productRelatedFieldsDisabled} /></FormControl><FormDescription>Separe múltiples productos con comas.</FormDescription><FormMessage /></FormItem>)}/>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="numberOfUnits" render={({ field }) => (<FormItem><FormLabel>Nº Unidades Totales</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} value={field.value ?? ""} disabled={productRelatedFieldsDisabled} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="unitPrice" render={({ field }) => (<FormItem><FormLabel>Precio Unitario Medio (€ sin IVA)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} value={field.value ?? ""} disabled={productRelatedFieldsDisabled} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="value" render={({ field }) => (<FormItem><FormLabel>Valor Total Pedido (€ IVA incl.)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} value={field.value ?? ""} disabled={productRelatedFieldsDisabled} /></FormControl><FormMessage /></FormItem>)}/>
                </div>
              </>
            ) : (
                 <p className="text-sm text-muted-foreground">Los detalles de productos y valor no aplican para el estado actual del pedido ({currentStatus}).</p>
            )}
            
            {currentStatus === "Facturado" && (
              <>
                <Separator className="my-6" />
                <h3 className="text-md font-semibold text-muted-foreground">Información de Factura</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <FormField control={form.control} name="invoiceUrl" render={({ field }) => (<FormItem><FormLabel>URL de la Factura</FormLabel><FormControl><Input placeholder="https://ejemplo.com/factura.pdf" {...field} value={field.value ?? ''} disabled={invoiceSectionDisabled} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                 {watchedInvoiceUrl && isValidUrl(watchedInvoiceUrl) && (
                    <Button variant="link" asChild className="p-0 h-auto mt-1">
                        <Link href={watchedInvoiceUrl} target="_blank" rel="noopener noreferrer" className="text-sm">
                            <Link2 className="mr-1 h-3 w-3" /> Ver Factura Cargada
                        </Link>
                    </Button>
                )}
              </>
            )}

            {(order?.status === 'Seguimiento' || order?.status === 'Fallido' || order?.status === 'Programada') && (
                <>
                  <Separator className="my-6" />
                  <h3 className="text-md font-semibold text-muted-foreground">Información de Seguimiento/Programación Original</h3>
                  <FormField control={form.control} name="nextActionType" render={({ field }) => (<FormItem><FormLabel>Próxima Acción (Original)</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={true}><FormControl><SelectTrigger><SelectValue placeholder="N/A" /></SelectTrigger></FormControl><SelectContent>{nextActionTypeList.map(action => (<SelectItem key={action} value={action}>{action}</SelectItem>))}</SelectContent></Select></FormItem>)}/>
                  {order?.nextActionType === "Opción personalizada" && (<FormField control={form.control} name="nextActionCustom" render={({ field }) => (<FormItem><FormLabel>Detalle Próx. Acción Personalizada (Original)</FormLabel><FormControl><Input {...field} disabled={true} /></FormControl></FormItem>)} />)}
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
                   {order?.status === 'Fallido' && (
                     <>
                      <FormField control={form.control} name="failureReasonType" render={({ field }) => (<FormItem><FormLabel>Motivo Fallo (Original)</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={true}><FormControl><SelectTrigger><SelectValue placeholder="N/A" /></SelectTrigger></FormControl><SelectContent>{failureReasonList.map(reason => (<SelectItem key={reason} value={reason}>{reason}</SelectItem>))}</SelectContent></Select></FormItem>)}/>
                      {order?.failureReasonType === "Otro (especificar)" && (<FormField control={form.control} name="failureReasonCustom" render={({ field }) => (<FormItem><FormLabel>Detalle Motivo Fallo Personalizado (Original)</FormLabel><FormControl><Textarea {...field} disabled={true} /></FormControl></FormItem>)} />)}
                     </>
                   )}
                </>
            )}

            {currentStatus !== 'Programada' && (
                <>
                  <Separator className="my-6" />
                  <h3 className="text-md font-semibold text-muted-foreground">Materiales Promocionales Asignados</h3>
                  <div className="space-y-3">
                    {materialFields.map((item, index) => {
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
                                      <SelectItem key={mat.id} value={mat.id}>{mat.name} - <FormattedNumericValue value={mat.latestPurchase?.calculatedUnitCost || 0} options={{style:'currency', currency:'EUR', minimumFractionDigits: 2, maximumFractionDigits: 4 }}/></SelectItem>
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
                                  onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value.replace(",",".")))}
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
                <Button type="submit" disabled={isSaving || isLoadingDropdownData || (!form.formState.isDirty && !!order)}>
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

    
