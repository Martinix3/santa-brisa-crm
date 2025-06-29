
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import type { Account, TeamMember, NewInteractionPayload, PromotionalMaterial, AssignedPromotionalMaterial } from "@/types";
import { interactionTypeList, interactionResultList } from "@/lib/data";
import { Loader2, Calendar as CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { es } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { getPromotionalMaterialsFS } from "@/services/promotional-material-service";

const newInteractionSchema = z.object({
  accountId: z.string().optional(),
  newClientName: z.string().optional(),
  tipo: z.enum(['Visita', 'Pedido']),
  resultado: z.enum(['Programada', 'Requiere seguimiento', 'Pedido Exitoso', 'Fallida']),
  fecha_prevista: z.date({ required_error: "La fecha es obligatoria." }),
  importe: z.coerce.number().optional(),
  clavadistaId: z.string().optional(),
  responsableId: z.string({ required_error: "El responsable es obligatorio." }),
  promoItems: z.array(z.object({
      materialId: z.string().min(1, "Seleccione un material."),
      quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  })).optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
    if (!data.accountId && !data.newClientName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe seleccionar un cliente existente o escribir un nombre para uno nuevo.", path: ["accountId"] });
    }
    if (data.tipo === 'Pedido') {
        if (!data.importe || data.importe <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El importe es obligatorio y debe ser mayor que cero para un pedido.", path: ["importe"] });
        }
    }
});


interface NewInteractionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: NewInteractionPayload) => Promise<void>;
  allAccounts: Account[];
  allTeamMembers: TeamMember[];
  currentUser: TeamMember;
}

export default function NewInteractionDialog({
  isOpen,
  onOpenChange,
  onSave,
  allAccounts,
  allTeamMembers,
  currentUser
}: NewInteractionDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [availableMaterials, setAvailableMaterials] = React.useState<PromotionalMaterial[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = React.useState(false);
  
  const salesAndAdminMembers = allTeamMembers.filter(m => m.role === 'Admin' || m.role === 'SalesRep');
  const clavadistas = allTeamMembers.filter(m => m.role === 'Clavadista');

  const form = useForm<z.infer<typeof newInteractionSchema>>({
    resolver: zodResolver(newInteractionSchema),
    defaultValues: {
      accountId: undefined,
      newClientName: undefined,
      tipo: 'Visita',
      resultado: 'Programada',
      fecha_prevista: addDays(new Date(), 7),
      importe: undefined,
      clavadistaId: undefined,
      responsableId: currentUser.id,
      promoItems: [],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "promoItems"
  });

  const watchedTipo = form.watch('tipo');

  React.useEffect(() => {
      if (watchedTipo === 'Pedido') {
        form.setValue('resultado', 'Pedido Exitoso');
      }
  }, [watchedTipo, form]);

  React.useEffect(() => {
    async function loadMaterials() {
        setIsLoadingMaterials(true);
        try {
            setAvailableMaterials(await getPromotionalMaterialsFS());
        } catch (error) {
            toast({ title: "Error", description: "No se pudieron cargar los materiales promocionales.", variant: "destructive" });
        } finally {
            setIsLoadingMaterials(false);
        }
    }
    if (isOpen) {
        loadMaterials();
    }
  }, [isOpen, toast]);

  const onSubmit = async (data: z.infer<typeof newInteractionSchema>) => {
    setIsSaving(true);
    await onSave(data as NewInteractionPayload);
    setIsSaving(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar Nueva Interacción</DialogTitle>
          <DialogDescription>
            Añade rápidamente una visita, pedido o seguimiento para una cuenta existente o nueva.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Cliente</FormLabel>
                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                          >
                            {field.value
                              ? allAccounts.find((acc) => acc.id === field.value)?.nombre
                              : "Seleccionar cliente o escribir nuevo"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Buscar cliente o escribir nuevo..."
                            onValueChange={(search) => {
                                form.setValue('newClientName', search);
                                form.setValue('accountId', undefined);
                            }}
                          />
                          <CommandEmpty>No se encontró el cliente.</CommandEmpty>
                          <CommandGroup>
                            {allAccounts.map((acc) => (
                              <CommandItem
                                value={acc.nombre}
                                key={acc.id}
                                onSelect={() => {
                                  form.setValue("accountId", acc.id);
                                  form.setValue("newClientName", undefined);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", acc.id === field.value ? "opacity-100" : "opacity-0")} />
                                {acc.nombre}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="tipo" render={({ field }) => (<FormItem><FormLabel>Tipo de Acción</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Visita">Visita</SelectItem><SelectItem value="Pedido">Pedido</SelectItem></SelectContent></Select><FormMessage/></FormItem>)} />
              
              {watchedTipo === 'Visita' && (
                <FormField control={form.control} name="resultado" render={({ field }) => (<FormItem><FormLabel>Resultado</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{interactionResultList.filter(r => r !== 'Pedido Exitoso').map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)} />
              )}
              
              <FormField control={form.control} name="fecha_prevista" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Prevista</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>)} />

              {watchedTipo === 'Pedido' && (
                <FormField control={form.control} name="importe" render={({ field }) => (<FormItem><FormLabel>Importe Pedido (€ IVA incl.)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage/></FormItem>)}/>
              )}

              <FormField control={form.control} name="responsableId" render={({ field }) => (<FormItem><FormLabel>Responsable</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar responsable"/></SelectTrigger></FormControl><SelectContent>{salesAndAdminMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)} />

              <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage/></FormItem>)}/>
            
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : "Guardar Interacción"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

