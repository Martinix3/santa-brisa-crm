
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
import type { Order, OrderStatus, UserRole, TeamMember, NextActionType, FailureReasonType, ClientType, AssignedPromotionalMaterial } from "@/types";
import { orderStatusesList, mockTeamMembers, nextActionTypeList, failureReasonList, clientTypeList, mockPromotionalMaterials } from "@/lib/data";
import { Loader2, CalendarIcon, Printer, Award, Package, PlusCircle, Trash2, Euro } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";


const NO_CLAVADISTA_VALUE = "##NONE##";

const assignedMaterialSchemaForDialog = z.object({
  materialId: z.string().min(1, "Debe seleccionar un material."),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
});


const editOrderFormSchema = z.object({
  clientName: z.string().min(2, "El nombre del cliente debe tener al menos 2 caracteres."),
  products: z.string().optional(), // Optional for follow-up/failed
  value: z.coerce.number().positive("El valor del pedido debe ser positivo.").optional(), // Optional for follow-up/failed
  status: z.enum(orderStatusesList as [OrderStatus, ...OrderStatus[]]),
  salesRep: z.string().min(1, "El representante de ventas es obligatorio."),
  clavadistaId: z.string().optional(), // Can be "##NONE##" or an actual ID
  assignedMaterials: z.array(assignedMaterialSchemaForDialog).optional().default([]),
  
  clientType: z.enum(clientTypeList as [ClientType, ...ClientType[]]).optional(),
  numberOfUnits: z.coerce.number().positive().optional(),
  unitPrice: z.coerce.number().positive().optional(),

  nombreFiscal: z.string().optional(),
  cif: z.string().optional(),
  direccionFiscal: z.string().optional(),
  direccionEntrega: z.string().optional(),
  contactoNombre: z.string().optional(),
  contactoCorreo: z.string().email("El formato del correo no es válido.").optional().or(z.literal('')),
  contactoTelefono: z.string().optional(),
  observacionesAlta: z.string().optional(),
  notes: z.string().optional(),

  // New fields for follow-up / failure
  nextActionType: z.enum(nextActionTypeList as [NextActionType, ...NextActionType[]]).optional(),
  nextActionCustom: z.string().optional(),
  nextActionDate: z.date().optional(),
  failureReasonType: z.enum(failureReasonList as [FailureReasonType, ...FailureReasonType[]]).optional(),
  failureReasonCustom: z.string().optional(),
}).superRefine((data, ctx) => {
    // Validations for successful-like statuses
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
        // Further checks for billing info if it's a confirmed/processed order
        if (['Confirmado', 'Procesando', 'Enviado', 'Entregado'].includes(data.status)) {
            if (!data.nombreFiscal || data.nombreFiscal.trim() === "") ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nombre fiscal es obligatorio.", path: ["nombreFiscal"] });
            if (!data.cif || data.cif.trim() === "") ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CIF es obligatorio.", path: ["cif"] });
            // ... add other billing fields if they become mandatory for these statuses
        }
    }
    // Validations for 'Seguimiento' or 'Fallido'
    if (data.status === 'Seguimiento' || data.status === 'Fallido') {
        if (!data.nextActionType) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La próxima acción es obligatoria.", path: ["nextActionType"] });
        }
        if (data.nextActionType === "Opción personalizada" && (!data.nextActionCustom || data.nextActionCustom.trim() === "")) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe especificar la próxima acción personalizada.", path: ["nextActionCustom"] });
        }
    }
    if (data.status === 'Fallido') {
        if (!data.failureReasonType) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El motivo del fallo es obligatorio.", path: ["failureReasonType"] });
        }
        if (data.failureReasonType === "Otro (especificar)" && (!data.failureReasonCustom || data.failureReasonCustom.trim() === "")) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe especificar el motivo del fallo personalizado.", path: ["failureReasonCustom"] });
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
  const clavadistas = React.useMemo(() => mockTeamMembers.filter(m => m.role === 'Clavadista'), []);
  
  const form = useForm<EditOrderFormValues>({
    resolver: zodResolver(editOrderFormSchema),
    defaultValues: {
      clientName: "",
      products: "",
      value: undefined,
      status: "Pendiente",
      salesRep: "",
      clavadistaId: NO_CLAVADISTA_VALUE,
      assignedMaterials: [],
      clientType: undefined,
      numberOfUnits: undefined,
      unitPrice: undefined,
      nombreFiscal: "",
      cif: "",
      direccionFiscal: "",
      direccionEntrega: "",
      contactoNombre: "",
      contactoCorreo: "",
      contactoTelefono: "",
      observacionesAlta: "",
      notes: "",
      nextActionType: undefined,
      nextActionCustom: "",
      nextActionDate: undefined,
      failureReasonType: undefined,
      failureReasonCustom: "",
    },
  });
  
  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control: form.control,
    name: "assignedMaterials",
  });

  const watchedMaterials = form.watch("assignedMaterials");

  const totalEstimatedMaterialCostForDialog = React.useMemo(() => {
    return watchedMaterials.reduce((total, current) => {
      const materialDetails = mockPromotionalMaterials.find(m => m.id === current.materialId);
      const unitCost = materialDetails?.latestPurchase?.calculatedUnitCost || 0;
      return total + (unitCost * current.quantity);
    }, 0);
  }, [watchedMaterials]);


  const currentStatus = form.watch("status");
  const nextActionType = form.watch("nextActionType");
  const failureReasonType = form.watch("failureReasonType");


  React.useEffect(() => {
    if (order && isOpen) {
      form.reset({
        clientName: order.clientName,
        products: order.products?.join(",\n") || "",
        value: order.value,
        status: order.status,
        salesRep: order.salesRep,
        clavadistaId: order.clavadistaId || NO_CLAVADISTA_VALUE,
        assignedMaterials: order.assignedMaterials || [],
        clientType: order.clientType,
        numberOfUnits: order.numberOfUnits,
        unitPrice: order.unitPrice,
        nombreFiscal: order.nombreFiscal || "",
        cif: order.cif || "",
        direccionFiscal: order.direccionFiscal || "",
        direccionEntrega: order.direccionEntrega || "",
        contactoNombre: order.contactoNombre || "",
        contactoCorreo: order.contactoCorreo || "",
        contactoTelefono: order.contactoTelefono || "",
        observacionesAlta: order.observacionesAlta || "",
        notes: order.notes || "",
        nextActionType: order.nextActionType,
        nextActionCustom: order.nextActionCustom || "",
        nextActionDate: order.nextActionDate ? parseISO(order.nextActionDate) : undefined,
        failureReasonType: order.failureReasonType,
        failureReasonCustom: order.failureReasonCustom || "",
      });
    }
  }, [order, isOpen, form]);

  const onSubmit = async (data: EditOrderFormValues) => {
    if (!order) return;
    setIsSaving(true);

    const saveData: EditOrderFormValues = {
        ...data,
        clavadistaId: data.clavadistaId === NO_CLAVADISTA_VALUE ? undefined : data.clavadistaId,
        nextActionDate: data.nextActionDate ? data.nextActionDate : undefined,
        assignedMaterials: data.assignedMaterials || [],
    };

    await new Promise(resolve => setTimeout(resolve, 700));
    onSave(saveData, order.id);
    setIsSaving(false);
    onOpenChange(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!order) return null;

  const isDistributor = currentUserRole === 'Distributor';
  const isSalesRep = currentUserRole === 'SalesRep';
  const isAdmin = currentUserRole === 'Admin';
  
  const canEditFullOrderDetails = isAdmin;
  const canEditStatusAndFollowUp = isAdmin || isDistributor; 
  const isReadOnly = isSalesRep && !isAdmin; 

  const formFieldsGenericDisabled = isReadOnly || (!canEditFullOrderDetails && !canEditStatusAndFollowUp);
  const productRelatedFieldsDisabled = isReadOnly || !canEditFullOrderDetails || currentStatus === 'Seguimiento' || currentStatus === 'Fallido' || currentStatus === 'Programada';
  const billingFieldsDisabled = isReadOnly || !canEditFullOrderDetails || currentStatus === 'Seguimiento' || currentStatus === 'Fallido' || currentStatus === 'Programada';
  const followUpFieldsDisabled = isReadOnly || !canEditStatusAndFollowUp;
  const statusFieldDisabled = isReadOnly || (!isAdmin && !isDistributor);
  const salesRepFieldDisabled = isReadOnly || !isAdmin;
  const clavadistaFieldDisabled = isReadOnly || !canEditFullOrderDetails;
  const materialsSectionDisabled = isReadOnly || !canEditFullOrderDetails || currentStatus === 'Programada';


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[90vh] overflow-y-auto print-dialog-content">
        <DialogHeader className="print-hide">
          <DialogTitle>
            {isReadOnly ? "Detalles:" : "Editar:"} {order.id} ({order.status})
          </DialogTitle>
          <DialogDescription>
            {isReadOnly
              ? "Viendo los detalles."
              : "Modifique los detalles y el estado. Haga clic en guardar cuando haya terminado."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <h3 className="text-md font-medium text-muted-foreground pt-2">Detalles Generales</h3>
            <Separator />
            <FormField control={form.control} name="clientName" render={({ field }) => (<FormItem><FormLabel>Nombre del Cliente</FormLabel><FormControl><Input placeholder="Nombre del cliente" {...field} disabled={formFieldsGenericDisabled || !canEditFullOrderDetails} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="salesRep" render={({ field }) => (<FormItem><FormLabel>Representante de Ventas</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={salesRepFieldDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un representante" /></SelectTrigger></FormControl><SelectContent>{mockTeamMembers.filter(member => member.role === 'SalesRep' || member.role === 'Admin').map((member: TeamMember) => (<SelectItem key={member.id} value={member.name}>{member.name} ({member.role === 'SalesRep' ? 'Rep. Ventas' : member.role})</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Estado</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={statusFieldDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un estado" /></SelectTrigger></FormControl><SelectContent>{orderStatusesList.map((statusVal) => (<SelectItem key={statusVal} value={statusVal}>{statusVal}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
            
            <FormField
                control={form.control}
                name="clavadistaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Award className="mr-2 h-4 w-4 text-primary" />Clavadista (Brand Ambassador)</FormLabel>
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

            {(currentStatus === 'Confirmado' || currentStatus === 'Procesando' || currentStatus === 'Enviado' || currentStatus === 'Entregado' || currentStatus === 'Pendiente') && (
              <>
                <h3 className="text-md font-medium text-muted-foreground pt-4">Detalles del Pedido</h3>
                <Separator />
                 <FormField control={form.control} name="clientType" render={({ field }) => (<FormItem><FormLabel>Tipo de Cliente</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={productRelatedFieldsDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione tipo cliente" /></SelectTrigger></FormControl><SelectContent>{clientTypeList.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="products" render={({ field }) => (<FormItem><FormLabel>Productos Pedidos</FormLabel><FormControl><Textarea placeholder="Listar productos y cantidades..." className="min-h-[80px]" {...field} disabled={productRelatedFieldsDisabled} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="value" render={({ field }) => (<FormItem><FormLabel>Valor del Pedido (€)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="p. ej., 250.75" {...field} onChange={event => field.onChange(event.target.value === '' ? undefined : parseFloat(event.target.value))} value={field.value ?? ""} disabled={productRelatedFieldsDisabled}/></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="numberOfUnits" render={({ field }) => (<FormItem><FormLabel>Número de Unidades</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value,10))} value={field.value ?? ""} disabled={productRelatedFieldsDisabled} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="unitPrice" render={({ field }) => (<FormItem><FormLabel>Precio Unitario (€ sin IVA)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} value={field.value ?? ""} disabled={productRelatedFieldsDisabled} /></FormControl><FormMessage /></FormItem>)}/>

                <h3 className="text-md font-medium text-muted-foreground pt-4">Información de Cliente y Facturación</h3>
                <Separator />
                <FormField control={form.control} name="nombreFiscal" render={({ field }) => (<FormItem><FormLabel>Nombre Fiscal</FormLabel><FormControl><Input placeholder="Nombre legal" {...field} disabled={billingFieldsDisabled}/></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="cif" render={({ field }) => (<FormItem><FormLabel>CIF</FormLabel><FormControl><Input placeholder="CIF/NIF" {...field} disabled={billingFieldsDisabled}/></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="direccionFiscal" render={({ field }) => (<FormItem><FormLabel>Dirección Fiscal</FormLabel><FormControl><Textarea placeholder="Dirección fiscal completa" {...field} className="min-h-[60px]" disabled={billingFieldsDisabled}/></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="direccionEntrega" render={({ field }) => (<FormItem><FormLabel>Dirección de Entrega</FormLabel><FormControl><Textarea placeholder="Dirección de entrega completa" {...field} className="min-h-[60px]" disabled={billingFieldsDisabled}/></FormControl><FormMessage /></FormItem>)}/>
                <h4 className="text-sm font-medium text-muted-foreground pt-2">Datos de Contacto</h4><Separator />
                <FormField control={form.control} name="contactoNombre" render={({ field }) => (<FormItem><FormLabel>Nombre de Contacto</FormLabel><FormControl><Input placeholder="Persona de contacto" {...field} disabled={billingFieldsDisabled}/></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="contactoCorreo" render={({ field }) => (<FormItem><FormLabel>Correo de Contacto</FormLabel><FormControl><Input type="email" placeholder="email@ejemplo.com" {...field} disabled={billingFieldsDisabled}/></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="contactoTelefono" render={({ field }) => (<FormItem><FormLabel>Teléfono de Contacto</FormLabel><FormControl><Input type="tel" placeholder="Número de teléfono" {...field} disabled={billingFieldsDisabled}/></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="observacionesAlta" render={({ field }) => (<FormItem><FormLabel>Observaciones (Alta Cliente)</FormLabel><FormControl><Textarea placeholder="Observaciones específicas del alta" {...field} className="min-h-[60px]" disabled={billingFieldsDisabled}/></FormControl><FormMessage /></FormItem>)}/>
              </>
            )}

            {(currentStatus === 'Seguimiento' || currentStatus === 'Fallido') && (
                <>
                  <h3 className="text-md font-medium text-muted-foreground pt-4">Plan de Seguimiento</h3>
                  <Separator />
                  <FormField control={form.control} name="nextActionType" render={({ field }) => (<FormItem><FormLabel>Próxima Acción</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={followUpFieldsDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione una próxima acción" /></SelectTrigger></FormControl><SelectContent>{nextActionTypeList.map(action => (<SelectItem key={action} value={action}>{action}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                  {nextActionType === "Opción personalizada" && (<FormField control={form.control} name="nextActionCustom" render={({ field }) => (<FormItem><FormLabel>Detalle Próxima Acción Personalizada</FormLabel><FormControl><Input placeholder="Especifique la acción" {...field} disabled={followUpFieldsDisabled} /></FormControl><FormMessage /></FormItem>)} />)}
                  <FormField
                    control={form.control}
                    name="nextActionDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha Tentativa Próxima Acción</FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl>
                              <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")} disabled={followUpFieldsDisabled}>
                                {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button></FormControl></PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} /></PopoverContent>
                        </Popover><FormMessage />
                      </FormItem>
                    )}
                  />
                </>
            )}
            {currentStatus === 'Fallido' && (
                 <>
                  <h3 className="text-md font-medium text-muted-foreground pt-4">Detalles del Fallo</h3>
                  <Separator />
                  <FormField control={form.control} name="failureReasonType" render={({ field }) => (<FormItem><FormLabel>Motivo del Fallo</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={followUpFieldsDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un motivo" /></SelectTrigger></FormControl><SelectContent>{failureReasonList.map(reason => (<SelectItem key={reason} value={reason}>{reason}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                  {failureReasonType === "Otro (especificar)" && (<FormField control={form.control} name="failureReasonCustom" render={({ field }) => (<FormItem><FormLabel>Detalle Motivo del Fallo Personalizado</FormLabel><FormControl><Textarea placeholder="Especifique el motivo" {...field} disabled={followUpFieldsDisabled} /></FormControl><FormMessage /></FormItem>)} />)}
                 </>
            )}

            {/* Materials Section - Shown if status is not "Programada" */}
            {currentStatus !== 'Programada' && (
                <>
                  <h3 className="text-md font-medium text-muted-foreground pt-4">Materiales Promocionales Asignados</h3>
                  <Separator />
                  <div className="space-y-3">
                    {materialFields.map((item, index) => {
                      const selectedMaterial = mockPromotionalMaterials.find(m => m.id === watchedMaterials[index]?.materialId);
                      const unitCost = selectedMaterial?.latestPurchase?.calculatedUnitCost || 0;
                      return (
                        <div key={item.id} className="flex items-end gap-2 p-3 border rounded-md bg-secondary/30">
                          <FormField
                            control={form.control}
                            name={`assignedMaterials.${index}.materialId`}
                            render={({ field }) => (
                              <FormItem className="flex-grow">
                                <FormLabel className="text-xs">Material</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={materialsSectionDisabled}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar material" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {mockPromotionalMaterials.map(mat => (
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


            <h3 className="text-md font-medium text-muted-foreground pt-4">Notas Adicionales</h3>
            <Separator />
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas Generales</FormLabel><FormControl><Textarea placeholder="Notas generales sobre el pedido o visita" {...field} className="min-h-[60px]" disabled={isReadOnly || (!isAdmin && !isDistributor)}/></FormControl><FormMessage /></FormItem>)}/>

            <DialogFooter className="pt-6 print-hide">
              <Button type="button" variant="outline" onClick={handlePrint} className="mr-auto">
                  <Printer className="mr-2 h-4 w-4" /> Imprimir
              </Button>
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button></DialogClose>
              {!isReadOnly && (
                <Button type="submit" disabled={isSaving || (!form.formState.isDirty && (currentUserRole === 'Admin' || currentUserRole === 'Distributor'))}>
                  {isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : ("Guardar Cambios")}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
