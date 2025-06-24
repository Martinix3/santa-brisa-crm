
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import type { Order, NextActionType, FailureReasonType, PaymentMethod } from "@/types";
import { nextActionTypeList, failureReasonList, paymentMethodList } from "@/lib/data";
import { Loader2, Calendar as CalendarIcon, Check } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from 'date-fns/locale';

const followUpResultFormSchemaBase = z.object({
  outcome: z.enum(["successful", "failed", "follow-up"], { required_error: "Por favor, seleccione un resultado." }),
  
  // Para Pedido Exitoso
  paymentMethod: z.enum(paymentMethodList as [PaymentMethod, ...PaymentMethod[]]).optional(),
  numberOfUnits: z.coerce.number().positive("El número de unidades debe ser un número positivo.").optional(),
  unitPrice: z.coerce.number().positive("El precio unitario debe ser un número positivo.").optional(),

  // Para Seguimiento o Fallido
  nextActionType: z.enum(nextActionTypeList as [NextActionType, ...NextActionType[]]).optional(),
  nextActionCustom: z.string().optional(),
  nextActionDate: z.date().optional(),
  
  // Para Fallido
  failureReasonType: z.enum(failureReasonList as [FailureReasonType, ...FailureReasonType[]]).optional(),
  failureReasonCustom: z.string().optional(),

  notes: z.string().optional(),
});

const followUpResultFormSchema = followUpResultFormSchemaBase.superRefine((data, ctx) => {
  if (data.outcome === "successful") {
    if (!data.paymentMethod) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La forma de pago es obligatoria.", path: ["paymentMethod"] });
    }
    if (data.numberOfUnits === undefined || data.numberOfUnits <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El número de unidades es obligatorio y positivo.", path: ["numberOfUnits"] });
    }
    if (data.unitPrice === undefined || data.unitPrice <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El precio unitario es obligatorio y positivo.", path: ["unitPrice"] });
    }
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


export type FollowUpResultFormValues = z.infer<typeof followUpResultFormSchema>;

interface FollowUpResultDialogProps {
  task: Order | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: FollowUpResultFormValues, originatingTask: Order) => void;
}

export default function FollowUpResultDialog({ task, isOpen, onOpenChange, onSave }: FollowUpResultDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<FollowUpResultFormValues>({
    resolver: zodResolver(followUpResultFormSchema),
    defaultValues: {
      outcome: undefined,
      paymentMethod: 'Adelantado',
      numberOfUnits: undefined,
      unitPrice: undefined,
      nextActionType: undefined,
      nextActionCustom: "",
      nextActionDate: undefined,
      failureReasonType: undefined,
      failureReasonCustom: "",
      notes: "",
    },
  });

  const outcomeWatched = form.watch("outcome");
  const nextActionTypeWatched = form.watch("nextActionType");
  const failureReasonTypeWatched = form.watch("failureReasonType");

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        outcome: undefined,
        paymentMethod: 'Adelantado',
        numberOfUnits: undefined,
        unitPrice: undefined,
        nextActionType: undefined,
        nextActionCustom: "",
        nextActionDate: undefined,
        failureReasonType: undefined,
        failureReasonCustom: "",
        notes: task?.notes || "",
      });
    }
  }, [task, isOpen, form]);

  const onSubmit = async (data: FollowUpResultFormValues) => {
    if (!task) return;
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500)); 
    onSave(data, task);
    setIsSaving(false);
  };
  
  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Resultado para: {task.clientName}</DialogTitle>
          <DialogDescription>
            Actualice el estado de esta tarea de seguimiento. La tarea actual se marcará como completada.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
            
            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resultado de la Interacción</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                      <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="successful" /></FormControl><FormLabel className="font-normal">Pedido Exitoso</FormLabel></FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="failed" /></FormControl><FormLabel className="font-normal">Fallido / Sin Pedido</FormLabel></FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="follow-up" /></FormControl><FormLabel className="font-normal">Requiere Nuevo Seguimiento</FormLabel></FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {outcomeWatched === "successful" && (
              <>
                <Separator className="my-4" />
                <h3 className="text-md font-medium">Detalles del Pedido</h3>
                <FormField control={form.control} name="paymentMethod" render={({ field }) => (<FormItem><FormLabel>Forma de Pago</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar forma de pago" /></SelectTrigger></FormControl><SelectContent>{paymentMethodList.map(method => (<SelectItem key={method} value={method}>{method}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="numberOfUnits" render={({ field }) => (<FormItem><FormLabel>Nº de Unidades</FormLabel><FormControl><Input type="number" placeholder="p. ej., 100" {...field} onChange={event => { const val = event.target.value; field.onChange(val === "" ? undefined : parseInt(val, 10));}} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="unitPrice" render={({ field }) => (<FormItem><FormLabel>Precio Unitario (€ sin IVA)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="p. ej., 15.50" {...field} onChange={event => { const val = event.target.value; field.onChange(val === "" ? undefined : parseFloat(val));}} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
              </>
            )}

            {(outcomeWatched === "follow-up" || outcomeWatched === "failed") && (
              <>
                <Separator className="my-4" />
                <h3 className="text-md font-medium">Próxima Acción</h3>
                <FormField
                  control={form.control}
                  name="nextActionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Acción</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione una próxima acción" /></SelectTrigger></FormControl>
                        <SelectContent>{nextActionTypeList.map(action => (<SelectItem key={action} value={action}>{action}</SelectItem>))}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {nextActionTypeWatched === "Opción personalizada" && (
                  <FormField control={form.control} name="nextActionCustom" render={({ field }) => (<FormItem><FormLabel>Detalle Acción</FormLabel><FormControl><Input placeholder="Especifique la acción" {...field} /></FormControl><FormMessage /></FormItem>)} />
                )}
                <FormField
                  control={form.control}
                  name="nextActionDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha Próxima Acción (Opcional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
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
                <Separator className="my-4" />
                <h3 className="text-md font-medium">Detalles del Fallo</h3>
                <FormField
                  control={form.control}
                  name="failureReasonType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un motivo" /></SelectTrigger></FormControl>
                        <SelectContent>{failureReasonList.map(reason => (<SelectItem key={reason} value={reason}>{reason}</SelectItem>))}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {failureReasonTypeWatched === "Otro (especificar)" && (
                  <FormField control={form.control} name="failureReasonCustom" render={({ field }) => (<FormItem><FormLabel>Detalle Motivo</FormLabel><FormControl><Textarea placeholder="Especifique el motivo" {...field} /></FormControl><FormMessage /></FormItem>)} />
                )}
              </>
            )}

            <Separator className="my-4" />
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas de la Interacción</FormLabel><FormControl><Textarea placeholder="Notas relevantes sobre esta interacción..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
            
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving || !outcomeWatched}>
                {isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : (<><Check className="mr-2 h-4 w-4" />Guardar Resultado</>)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
