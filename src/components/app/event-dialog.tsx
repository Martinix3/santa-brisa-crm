
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CrmEvent, CrmEventType, CrmEventStatus, TeamMember, PromotionalMaterial } from "@/types"; // Added PromotionalMaterial
import { crmEventTypeList, crmEventStatusList } from "@/lib/data"; // mockPromotionalMaterials removed
import { Loader2, Calendar as CalendarIcon, PlusCircle, Trash2, Package } from "lucide-react"; // Removed Euro
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid, subDays, isEqual } from "date-fns";
import { es } from 'date-fns/locale';
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { getPromotionalMaterialsFS } from "@/services/promotional-material-service"; // Service to fetch materials
import { useToast } from "@/hooks/use-toast";

const assignedMaterialSchema = z.object({
  materialId: z.string().min(1, "Debe seleccionar un material."),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
});

const eventFormSchema = z.object({
  name: z.string().min(3, "El nombre del evento debe tener al menos 3 caracteres."),
  type: z.enum(crmEventTypeList as [CrmEventType, ...CrmEventType[]], { required_error: "El tipo de evento es obligatorio." }),
  status: z.enum(crmEventStatusList as [CrmEventStatus, ...CrmEventStatus[]], { required_error: "El estado del evento es obligatorio." }),
  startDate: z.date({ required_error: "La fecha de inicio es obligatoria." }),
  endDate: z.date().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  assignedTeamMemberIds: z.array(z.string()).default([]),
  assignedMaterials: z.array(assignedMaterialSchema).optional().default([]),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
      path: ["endDate"],
    });
  }
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventDialogProps {
  event: CrmEvent | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: EventFormValues, eventId?: string) => void;
  isReadOnly?: boolean;
  allTeamMembers: TeamMember[];
}


export default function EventDialog({ event, isOpen, onOpenChange, onSave, isReadOnly = false, allTeamMembers }: EventDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [availableMaterials, setAvailableMaterials] = React.useState<PromotionalMaterial[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = React.useState(false);
  const { toast } = useToast();
  
  const assignableTeamMembers = React.useMemo(() => {
    return allTeamMembers.filter(
      member => member.role === 'SalesRep' || member.role === 'Admin' || member.role === 'Clavadista'
    );
  }, [allTeamMembers]);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "", type: undefined, status: "Planificado", startDate: new Date(), endDate: undefined,
      description: "", location: "", assignedTeamMemberIds: [], assignedMaterials: [], notes: "",
    },
  });

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control: form.control, name: "assignedMaterials",
  });

  const watchedMaterials = form.watch("assignedMaterials");

  React.useEffect(() => {
    async function loadMaterialsForDialog() {
      if (isOpen) {
        setIsLoadingMaterials(true);
        try {
          const materialsFromFS = await getPromotionalMaterialsFS();
          setAvailableMaterials(materialsFromFS);
        } catch (error) {
          console.error("Error loading promotional materials for event dialog:", error);
          toast({ title: "Error Materiales", description: "No se pudieron cargar los materiales promocionales.", variant: "destructive"});
        } finally {
          setIsLoadingMaterials(false);
        }
      }
    }
    loadMaterialsForDialog();
  }, [isOpen, toast]);


  const totalEstimatedMaterialCost = React.useMemo(() => {
    return watchedMaterials.reduce((total, current) => {
      const materialDetails = availableMaterials.find(m => m.id === current.materialId);
      const unitCost = materialDetails?.latestPurchase?.calculatedUnitCost || 0;
      return total + (unitCost * current.quantity);
    }, 0);
  }, [watchedMaterials, availableMaterials]);


  React.useEffect(() => {
    if (isOpen) {
      if (event) {
        form.reset({
          name: event.name, type: event.type, status: event.status,
          startDate: event.startDate && isValid(parseISO(event.startDate)) ? parseISO(event.startDate) : new Date(),
          endDate: event.endDate && isValid(parseISO(event.endDate)) ? parseISO(event.endDate) : undefined,
          description: event.description || "", location: event.location || "",
          assignedTeamMemberIds: event.assignedTeamMemberIds || [],
          assignedMaterials: event.assignedMaterials || [], notes: event.notes || "",
        });
      } else {
        form.reset({
          name: "", type: undefined, status: "Planificado", startDate: new Date(), endDate: undefined,
          description: "", location: "", assignedTeamMemberIds: [], assignedMaterials: [], notes: "",
        });
      }
    }
  }, [event, isOpen, form]);

  const onSubmit = async (data: EventFormValues) => {
    if (isReadOnly) return;
    
    // Stock validation
    for (const item of data.assignedMaterials || []) {
      const material = availableMaterials.find(m => m.id === item.materialId);
      if (material && material.stock < item.quantity) {
        toast({
          title: "Stock Insuficiente",
          description: `No hay suficiente stock para "${material.name}". Disponible: ${material.stock}, Solicitado: ${item.quantity}.`,
          variant: "destructive",
        });
        return; 
      }
    }

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500)); 
    onSave(data, event?.id);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? "Detalles del Evento" : (event ? "Editar Evento" : "Añadir Nuevo Evento")}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? `Viendo detalles de "${event?.name}".` : (event ? "Modifica los detalles del evento." : "Introduce la información del nuevo evento.")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre del Evento</FormLabel><FormControl><Input placeholder="Ej: Lanzamiento Nueva Cosecha" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Tipo de Evento</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un tipo" /></SelectTrigger></FormControl><SelectContent>{crmEventTypeList.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Estado del Evento</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un estado" /></SelectTrigger></FormControl><SelectContent>{crmEventStatusList.map(status => (<SelectItem key={status} value={status}>{status}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="startDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha de Inicio</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={isReadOnly || ((date: Date) => date < subDays(new Date(),1) && !isEqual(date, subDays(new Date(),1)) ) } initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="endDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha de Fin (Opcional)</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={isReadOnly || ((date: Date) => date < (form.getValues("startDate") || subDays(new Date(),1)) || (date < subDays(new Date(),1) && !isEqual(date, subDays(new Date(),1))) ) } initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormLabel>Ubicación (Opcional)</FormLabel><FormControl><Input placeholder="Ej: Hotel Palace, Madrid" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descripción (Opcional)</FormLabel><FormControl><Textarea placeholder="Breve descripción del evento..." {...field} disabled={isReadOnly} className="min-h-[80px]" /></FormControl><FormMessage /></FormItem>)} />
            <Separator className="my-4"/><h3 className="text-md font-medium text-muted-foreground">Recursos y Personal</h3>
            <FormField control={form.control} name="assignedTeamMemberIds" render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsables Asignados</FormLabel>
                   <FormControl>
                      <ScrollArea className="h-32 w-full rounded-md border p-2">
                        <div className="space-y-1">
                          {assignableTeamMembers.map((member) => (
                            <FormItem key={member.id} className="flex flex-row items-center space-x-3 space-y-0">
                                <Checkbox
                                  checked={field.value?.includes(member.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    return checked
                                      ? field.onChange([...currentValue, member.id])
                                      : field.onChange(
                                          currentValue.filter(
                                            (value) => value !== member.id
                                          )
                                        );
                                  }}
                                  disabled={isReadOnly}
                                  id={`member-checkbox-${member.id}-${event?.id || 'new'}`}
                                />
                              <FormLabel htmlFor={`member-checkbox-${member.id}-${event?.id || 'new'}`} className="font-normal text-sm">
                                {member.name} ({member.role === 'SalesRep' ? 'Rep. Ventas' : member.role})
                              </FormLabel>
                            </FormItem>
                          ))}
                           {assignableTeamMembers.length === 0 && <p className="text-xs text-muted-foreground p-2">No hay miembros del equipo disponibles para asignar.</p>}
                        </div>
                      </ScrollArea>
                    </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-3">
              <FormLabel className="flex items-center"><Package className="mr-2 h-4 w-4 text-primary"/> Materiales Promocionales Asignados</FormLabel>
              {isLoadingMaterials && <Loader2 className="h-4 w-4 animate-spin" />}
              {!isLoadingMaterials && materialFields.map((item, index) => {
                const selectedMaterialInfo = availableMaterials.find(m => m.id === watchedMaterials[index]?.materialId);
                const unitCost = selectedMaterialInfo?.latestPurchase?.calculatedUnitCost || 0;
                return (
                  <div key={item.id} className="flex items-end gap-2 p-3 border rounded-md bg-secondary/30">
                    <FormField control={form.control} name={`assignedMaterials.${index}.materialId`} render={({ field }) => ( <FormItem className="flex-grow"><FormLabel className="text-xs">Material</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly || isLoadingMaterials}><FormControl><SelectTrigger><SelectValue placeholder={isLoadingMaterials ? "Cargando..." : "Seleccionar material"} /></SelectTrigger></FormControl><SelectContent>{availableMaterials.map(mat => (<SelectItem key={mat.id} value={mat.id}>{mat.name} (Stock: {mat.stock})</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`assignedMaterials.${index}.quantity`} render={({ field }) => (<FormItem className="w-24"><FormLabel className="text-xs">Cantidad</FormLabel><FormControl><Input type="number" {...field} disabled={isReadOnly} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} value={field.value ?? ""}/></FormControl><FormMessage /></FormItem>)} />
                    <div className="text-sm text-muted-foreground w-28 text-right whitespace-nowrap">{watchedMaterials[index]?.quantity > 0 ? (<FormattedNumericValue value={unitCost * watchedMaterials[index].quantity} options={{style:'currency', currency:'EUR'}} />) : <FormattedNumericValue value={0} options={{style:'currency', currency:'EUR'}} />}</div>
                    {!isReadOnly && (<Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>)}
                  </div>);
              })}
              {!isReadOnly && (<Button type="button" variant="outline" size="sm" onClick={() => appendMaterial({ materialId: "", quantity: 1 })} className="mt-2" disabled={isLoadingMaterials}><PlusCircle className="mr-2 h-4 w-4" /> Añadir Material al Evento</Button>)}
              {watchedMaterials.length > 0 && (<div className="text-right font-medium text-primary pt-2">Coste Total Estimado Materiales: <FormattedNumericValue value={totalEstimatedMaterialCost} options={{style:'currency', currency:'EUR'}} /></div>)}
            </div>
            <Separator className="my-4"/>
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas Internas (Opcional)</FormLabel><FormControl><Textarea placeholder="Cualquier información relevante para el equipo..." {...field} disabled={isReadOnly} className="min-h-[80px]" /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter className="pt-6">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving && !isReadOnly}>{isReadOnly ? "Cerrar" : "Cancelar"}</Button></DialogClose>
              {!isReadOnly && (<Button type="submit" disabled={isSaving || isLoadingMaterials || (!form.formState.isDirty && !!event)}>{isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : (event ? "Guardar Cambios" : "Añadir Evento")}</Button>)}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
