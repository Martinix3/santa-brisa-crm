
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
  useFormField,
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
import type { CrmEvent, CrmEventType, CrmEventStatus } from "@/types";
import { crmEventTypeList, crmEventStatusList, mockTeamMembers } from "@/lib/data";
import { Loader2, CalendarIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import { Label } from "@/components/ui/label";

const eventFormSchema = z.object({
  name: z.string().min(3, "El nombre del evento debe tener al menos 3 caracteres."),
  type: z.enum(crmEventTypeList as [CrmEventType, ...CrmEventType[]], { required_error: "El tipo de evento es obligatorio." }),
  status: z.enum(crmEventStatusList as [CrmEventStatus, ...CrmEventStatus[]], { required_error: "El estado del evento es obligatorio." }),
  startDate: z.date({ required_error: "La fecha de inicio es obligatoria." }),
  endDate: z.date().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  assignedTeamMemberIds: z.array(z.string()).min(1, "Debe seleccionar al menos un responsable."),
  requiredMaterials: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.endDate && data.endDate < data.startDate) {
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
  onSave: (data: EventFormValues) => void;
  isReadOnly?: boolean;
}

export default function EventDialog({ event, isOpen, onOpenChange, onSave, isReadOnly = false }: EventDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      type: undefined,
      status: "Planificado",
      startDate: undefined,
      endDate: undefined,
      description: "",
      location: "",
      assignedTeamMemberIds: [],
      requiredMaterials: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (event && isOpen) {
      form.reset({
        name: event.name,
        type: event.type,
        status: event.status,
        startDate: parseISO(event.startDate),
        endDate: event.endDate ? parseISO(event.endDate) : undefined,
        description: event.description || "",
        location: event.location || "",
        assignedTeamMemberIds: event.assignedTeamMemberIds || [],
        requiredMaterials: event.requiredMaterials || "",
        notes: event.notes || "",
      });
    } else if (!event && isOpen) {
      form.reset({
        name: "",
        type: undefined,
        status: "Planificado",
        startDate: new Date(),
        endDate: undefined,
        description: "",
        location: "",
        assignedTeamMemberIds: [],
        requiredMaterials: "",
        notes: "",
      });
    }
  }, [event, isOpen, form]);

  const onSubmit = async (data: EventFormValues) => {
    if (isReadOnly) return;
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500)); 
    onSave(data);
    setIsSaving(false);
    // onOpenChange(false); // Dialog close is handled by parent
  };
  
  const assignableTeamMembers = mockTeamMembers.filter(member => member.role === 'Admin' || member.role === 'SalesRep');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? "Detalles del Evento" : (event ? "Editar Evento" : "Añadir Nuevo Evento")}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? `Viendo detalles de "${event?.name}".` : (event ? "Modifica los detalles del evento." : "Introduce la información del nuevo evento.")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Nombre del Evento</FormLabel> <FormControl> <Input placeholder="Ej: Feria Anual de Vinos" {...field} disabled={isReadOnly} /> </FormControl> <FormMessage /> </FormItem> )}/>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => ( <FormItem> <FormLabel>Tipo de Evento</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}> <FormControl> <SelectTrigger> <SelectValue placeholder="Seleccione un tipo" /> </SelectTrigger> </FormControl> <SelectContent> {crmEventTypeList.map(type => ( <SelectItem key={type} value={type}>{type}</SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="status" render={({ field }) => ( <FormItem> <FormLabel>Estado del Evento</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}> <FormControl> <SelectTrigger> <SelectValue placeholder="Seleccione un estado" /> </SelectTrigger> </FormControl> <SelectContent> {crmEventStatusList.map(status => ( <SelectItem key={status} value={status}>{status}</SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="startDate" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>Fecha de Inicio</FormLabel> <Popover> <PopoverTrigger asChild> <FormControl> <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}> {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" /> </Button> </FormControl> </PopoverTrigger> <PopoverContent className="w-auto p-0" align="start"> <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/> </PopoverContent> </Popover> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="endDate" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>Fecha de Fin (Opcional)</FormLabel> <Popover> <PopoverTrigger asChild> <FormControl> <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}> {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" /> </Button> </FormControl> </PopoverTrigger> <PopoverContent className="w-auto p-0" align="start"> <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={es}/> </PopoverContent> </Popover> <FormMessage /> </FormItem> )}/>
            </div>

            <FormField control={form.control} name="location" render={({ field }) => ( <FormItem> <FormLabel>Ubicación (Opcional)</FormLabel> <FormControl> <Input placeholder="Ej: IFEMA Madrid, Pabellón 5" {...field} disabled={isReadOnly} /> </FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Descripción (Opcional)</FormLabel> <FormControl> <Textarea placeholder="Breve descripción del evento, objetivos..." {...field} disabled={isReadOnly} className="min-h-[80px]" /> </FormControl> <FormMessage /> </FormItem> )}/>
            
            <Separator className="my-4"/>
            <FormField
              control={form.control}
              name="assignedTeamMemberIds"
              render={({ field }) => {
                // We need to get the id for ARIA attributes from useFormField context implicitly used by FormField
                // This id is usually on FormItemContext.
                // Let's explicitly get it via useFormField to be safe for ARIA linking.
                const { id: generatedFieldId, error } = useFormField();
                return (
                  <FormItem>
                    <FormLabel htmlFor={generatedFieldId}>Responsables Asignados</FormLabel>
                    {/*
                      No FormControl here.
                      ScrollArea acts as the container for our custom group of inputs.
                      FormLabel's htmlFor points to the ScrollArea's id.
                    */}
                    <ScrollArea
                      id={generatedFieldId} // ID for the FormLabel to target
                      className={cn(
                        "h-32 w-full rounded-md border p-2",
                        error ? "border-destructive" : "border-input" // Style based on error state
                      )}
                      aria-invalid={!!error}
                      aria-describedby={error ? `${generatedFieldId}-form-item-message` : undefined} // Link to FormMessage on error
                      role="group" // Indicate it's a group of related controls
                      aria-labelledby={form.getFieldState('assignedTeamMemberIds').error ? undefined : `${generatedFieldId}-label`} // Ensure label is correctly associated
                    >
                      {assignableTeamMembers.map((member) => (
                        <div key={member.id} className="flex flex-row items-center space-x-3 space-y-0 py-1">
                          <Checkbox
                            id={`member-checkbox-${member.id}-${generatedFieldId}`}
                            checked={Array.isArray(field.value) && field.value.includes(member.id)}
                            onCheckedChange={(checked) => {
                              const currentValues = Array.isArray(field.value) ? field.value : [];
                              if (checked) {
                                field.onChange([...currentValues, member.id]);
                              } else {
                                field.onChange(
                                  currentValues.filter((value) => value !== member.id)
                                );
                              }
                            }}
                            disabled={isReadOnly}
                            aria-labelledby={`member-label-${member.id}-${generatedFieldId}`}
                          />
                          <Label
                            htmlFor={`member-checkbox-${member.id}-${generatedFieldId}`}
                            id={`member-label-${member.id}-${generatedFieldId}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {member.name} ({member.role === 'SalesRep' ? 'Rep. Ventas' : member.role})
                          </Label>
                        </div>
                      ))}
                    </ScrollArea>
                    {/* FormMessage will correctly pick up the error associated with "assignedTeamMemberIds" */}
                    <FormMessage id={`${generatedFieldId}-form-item-message`} />
                  </FormItem>
                );
              }}
            />


            <FormField control={form.control} name="requiredMaterials" render={({ field }) => ( <FormItem> <FormLabel>Materiales Necesarios (Opcional)</FormLabel> <FormControl> <Textarea placeholder="Listar materiales: stands, folletos, muestras..." {...field} disabled={isReadOnly} className="min-h-[80px]" /> </FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem> <FormLabel>Notas Adicionales (Opcional)</FormLabel> <FormControl> <Textarea placeholder="Cualquier otra información relevante..." {...field} disabled={isReadOnly} className="min-h-[80px]" /> </FormControl> <FormMessage /> </FormItem> )}/>
            
            <DialogFooter className="pt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving && !isReadOnly}>
                  {isReadOnly ? "Cerrar" : "Cancelar"}
                </Button>
              </DialogClose>
              {!isReadOnly && (
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? ( <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando... </> ) : ( event ? "Guardar Cambios" : "Añadir Evento" )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
    

    