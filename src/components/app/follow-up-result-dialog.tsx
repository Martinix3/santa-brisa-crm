
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Check, Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { nextActionTypeList, failureReasonList, paymentMethodList } from "@/lib/data";
import type { Order, TeamMember, UserRole, FollowUpResultFormValues, PaymentMethod, NextActionType, FailureReasonType } from "@/types";

const followUpResultFormSchema = z.object({
  outcome: z.enum(["successful", "failed", "follow-up"], { required_error: "Por favor, seleccione un resultado." }),
  notes: z.string().optional(),
  
  // Pedido Exitoso
  paymentMethod: z.custom<PaymentMethod>().optional(),
  numberOfUnits: z.coerce.number().positive("El número de unidades debe ser un número positivo.").optional(),
  unitPrice: z.coerce.number().positive("El precio unitario debe ser un número positivo.").optional(),

  // Requiere Seguimiento
  nextActionType: z.custom<NextActionType>().optional(),
  nextActionCustom: z.string().optional(),
  nextActionDate: z.date().optional(),
  assignedSalesRepId: z.string().optional(),

  // Fallido
  failureReasonType: z.custom<FailureReasonType>().optional(),
  failureReasonCustom: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.outcome === "successful") {
    if (!data.paymentMethod) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La forma de pago es obligatoria.", path: ["paymentMethod"] });
    }
    if (data.numberOfUnits === undefined || data.numberOfUnits <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El número de unidades es obligatorio.", path: ["numberOfUnits"] });
    }
     if (data.unitPrice === undefined || data.unitPrice <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El precio unitario es obligatorio.", path: ["unitPrice"] });
    }
  }

  if (data.outcome === "follow-up") {
    if (!data.nextActionType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La próxima acción es obligatoria.", path: ["nextActionType"] });
    }
    if (data.nextActionType === "Opción personalizada" && (!data.nextActionCustom || data.nextActionCustom.trim() === "")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe especificar la próxima acción.", path: ["nextActionCustom"] });
    }
  }

  if (data.outcome === "failed") {
    if (!data.failureReasonType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El motivo del fallo es obligatorio.", path: ["failureReasonType"] });
    }
    if (data.failureReasonType === "Otro (especificar)" && (!data.failureReasonCustom || data.failureReasonCustom.trim() === "")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe especificar el motivo del fallo.", path: ["failureReasonCustom"] });
    }
  }
});


interface FollowUpResultDialogProps {
  order: Order | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: FollowUpResultFormValues, originalOrder: Order) => Promise<void>;
  allTeamMembers: TeamMember[];
  currentUser: TeamMember | null;
  currentUserRole: UserRole | null;
}

export default function FollowUpResultDialog({
  order,
  isOpen,
  onOpenChange,
  onSave,
  allTeamMembers,
  currentUser,
  currentUserRole
}: FollowUpResultDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<FollowUpResultFormValues>({
    resolver: zodResolver(followUpResultFormSchema),
    defaultValues: {
      outcome: undefined,
      notes: "",
      paymentMethod: 'Adelantado',
      numberOfUnits: undefined,
      unitPrice: undefined,
      nextActionType: undefined,
      nextActionCustom: "",
      nextActionDate: undefined,
      assignedSalesRepId: currentUser?.id,
      failureReasonType: undefined,
      failureReasonCustom: "",
    },
  });
  
  React.useEffect(() => {
    if (order && isOpen) {
      form.reset({
        outcome: undefined,
        notes: "",
        paymentMethod: 'Adelantado',
        numberOfUnits: undefined,
        unitPrice: undefined,
        nextActionType: undefined,
        nextActionCustom: "",
        nextActionDate: undefined,
        assignedSalesRepId: currentUser?.id,
        failureReasonType: undefined,
        failureReasonCustom: "",
      });
    }
  }, [order, isOpen, form, currentUser?.id]);

  const onSubmit = async (data: FollowUpResultFormValues) => {
    if (!order) return;
    setIsSaving(true);
    await onSave(data, order);
    setIsSaving(false);
  };
  
  const outcomeWatched = form.watch("outcome");
  const nextActionTypeWatched = form.watch("nextActionType");
  const failureReasonTypeWatched = form.watch("failureReasonType");

  const assignableSalesReps = React.useMemo(() => {
    return allTeamMembers.filter(m => m.role === 'SalesRep' || m.role === 'Admin');
  }, [allTeamMembers]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>¡Tarea Completada! Registra el resultado para: {order?.clientName}</DialogTitle>
          <DialogDescription>
            Indica el resultado de la interacción y los próximos pasos. Se creará un nuevo registro y la tarea actual se marcará como completada.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Resultado de la Interacción</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md has-[:checked]:border-primary"><FormControl><RadioGroupItem value="successful" /></FormControl><FormLabel className="font-normal">Pedido Exitoso</FormLabel></FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md has-[:checked]:border-primary"><FormControl><RadioGroupItem value="follow-up" /></FormControl><FormLabel className="font-normal">Requiere Seguimiento</FormLabel></FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md has-[:checked]:border-primary col-span-full sm:col-span-1"><FormControl><RadioGroupItem value="failed" /></FormControl><FormLabel className="font-normal">Fallido / Sin Pedido</FormLabel></FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {outcomeWatched === 'successful' && (
               <>
                <Separator />
                <h4 className="text-md font-medium">Detalles del Pedido Exitoso</h4>
                <FormField control={form.control} name="paymentMethod" render={({ field }) => (<FormItem><FormLabel>Forma de Pago</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{paymentMethodList.map(method => (<SelectItem key={method} value={method}>{method}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="numberOfUnits" render={({ field }) => (<FormItem><FormLabel>Nº Unidades</FormLabel><FormControl><Input type="number" placeholder="Ej: 12" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="unitPrice" render={({ field }) => (<FormItem><FormLabel>Precio (€ sin IVA)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ej: 15.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                </div>
               </>
            )}

             {outcomeWatched === 'follow-up' && (
               <>
                <Separator />
                <h4 className="text-md font-medium">Próxima Tarea de Seguimiento</h4>
                <FormField control={form.control} name="nextActionType" render={({ field }) => (<FormItem><FormLabel>Próxima Acción</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{nextActionTypeList.map(action => (<SelectItem key={action} value={action}>{action}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                {nextActionTypeWatched === 'Opción personalizada' && <FormField control={form.control} name="nextActionCustom" render={({ field }) => (<FormItem><FormLabel>Especificar Próxima Acción</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)} />}
                <FormField control={form.control} name="nextActionDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Próxima Acción (Opcional)</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
                {currentUserRole === 'Admin' ? (
                  <FormField control={form.control} name="assignedSalesRepId" render={({ field }) => (<FormItem><FormLabel>Asignar Seguimiento a:</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar responsable" /></SelectTrigger></FormControl><SelectContent>{assignableSalesReps.map(rep => (<SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                ) : (
                  <div><FormLabel>Asignado a:</FormLabel><p className="text-sm font-medium mt-2">{currentUser?.name}</p></div>
                )}
               </>
            )}

            {outcomeWatched === 'failed' && (
              <>
                <Separator />
                <h4 className="text-md font-medium">Detalles del Fallo</h4>
                <FormField control={form.control} name="failureReasonType" render={({ field }) => (<FormItem><FormLabel>Motivo del Fallo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{failureReasonList.map(reason => (<SelectItem key={reason} value={reason}>{reason}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                {failureReasonTypeWatched === 'Otro (especificar)' && <FormField control={form.control} name="failureReasonCustom" render={({ field }) => (<FormItem><FormLabel>Especificar Motivo del Fallo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />}
              </>
            )}
            
            <Separator />
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas Adicionales (Opcional)</FormLabel><FormControl><Textarea placeholder="Añada cualquier comentario sobre esta interacción..." {...field} /></FormControl><FormMessage /></FormItem>)} />

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving || !outcomeWatched}>
                {isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : "Guardar Resultado"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
