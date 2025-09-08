
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ItemBatch } from "@/types";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { EstadoQC as QcStatus } from "@ssot";

const qcStatusList: QcStatus[] = ['Pending', 'Released', 'Rejected'];

const batchFormSchema = z.object({
  qcStatus: z.enum(qcStatusList as [QcStatus, ...QcStatus[]], { required_error: "El estado de QC es obligatorio." }),
  expiryDate: z.date().optional().nullable(),
  locationId: z.string().optional(),
});

export type BatchFormValues = z.infer<typeof batchFormSchema>;

interface BatchDialogProps {
  batch: ItemBatch | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: BatchFormValues, batchId: string) => void;
}

export default function BatchDialog({ batch, isOpen, onOpenChange, onSave }: BatchDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<BatchFormValues>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: {
      qcStatus: 'Pending',
      expiryDate: null,
      locationId: "",
    },
  });

  React.useEffect(() => {
    if (batch && isOpen) {
      form.reset({
        qcStatus: batch.qcStatus,
        expiryDate: batch.expiryDate && isValid(parseISO(batch.expiryDate)) ? parseISO(batch.expiryDate) : null,
        locationId: batch.locationId || "",
      });
    }
  }, [batch, isOpen, form]);

  const onSubmit = async (data: BatchFormValues) => {
    if (!batch) return;
    setIsSaving(true);
    await onSave(data, batch.id);
    setIsSaving(false);
  };

  if (!batch) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Lote: {batch.internalBatchCode}</DialogTitle>
          <DialogDescription>
            Actualiza el estado de calidad, fecha de caducidad y ubicación del lote.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
            <FormField
              control={form.control}
              name="qcStatus"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Estado de Calidad (QC)</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                      {qcStatusList.map(s => (
                        <FormItem key={s} className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value={s} id={`qc-${s}`} /></FormControl>
                          <FormLabel htmlFor={`qc-${s}`} className="font-normal">{s}</FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Caducidad (Opcional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicación (Opcional)</FormLabel>
                  <FormControl><Input placeholder="Ej: Estantería A3, Pallet P-102" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
