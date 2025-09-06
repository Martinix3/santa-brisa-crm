
"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, CalendarIcon, Loader2 } from "lucide-react";
import type { Account, InteractionOutcome, InlineEditorFormValues } from "@/types";

const editorSchema = z.object({
  outcome: z.custom<InteractionOutcome>(),
  date: z.date(),
  value: z.coerce.number().optional(),
  notes: z.string().optional(),
  unidades: z.coerce.number().optional(),
  precioUnitario: z.coerce.number().optional(),
});

interface InteractionEditorProps {
  account: Account;
  onSave: (accountId: string, data: InlineEditorFormValues) => Promise<void>;
}

export function InteractionEditor({ account, onSave }: InteractionEditorProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<InlineEditorFormValues>({
    resolver: zodResolver(editorSchema),
    defaultValues: {
      outcome: "Visita",
      date: new Date(),
      value: undefined,
      notes: "",
      unidades: undefined,
      precioUnitario: undefined,
    },
  });

  const outcome = form.watch("outcome");

  const handleSubmit = async (data: InlineEditorFormValues) => {
    setIsSaving(true);
    await onSave(account.id, data);
    setIsSaving(false);
    // The popover should be closed by the parent component after successful save
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="outcome"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  className="flex-wrap justify-start"
                  value={field.value}
                  onValueChange={(value) => field.onChange(value as InteractionOutcome)}
                >
                  {(['Pedido', 'Seguimiento', 'Visita', 'Llamada', 'Email', 'Incidencia', 'Otro'] as InteractionOutcome[]).map((type) => (
                    <ToggleGroupItem key={type} value={type} className="text-xs h-8">
                      {type}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel className="text-xs">Fecha</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl><Button type="button" variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Seleccionar</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/></PopoverContent></Popover>
                    <FormMessage />
                </FormItem>
                )}
            />
            {outcome === 'Pedido' ? (
                <FormField control={form.control} name="value" render={({ field }) => ( <FormItem><FormLabel className="text-xs">Valor Total (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage/></FormItem> )}/>
            ) : null}
        </div>
        
        {outcome === 'Pedido' && (
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="unidades" render={({ field }) => ( <FormItem><FormLabel className="text-xs">Unidades</FormLabel><FormControl><Input type="number" step="1" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage/></FormItem> )}/>
                <FormField control={form.control} name="precioUnitario" render={({ field }) => ( <FormItem><FormLabel className="text-xs">Precio Unit. (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage/></FormItem> )}/>
            </div>
        )}

        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel className="text-xs">Notas</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage/></FormItem> )}/>
        
        <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Guardando</> : <><Check className="mr-2 h-4 w-4"/> Guardar</>}
        </Button>
      </form>
    </Form>
  );
}
