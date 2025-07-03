
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getAccountsFS } from "@/services/account-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import type { Account, TeamMember, UserRole, NewScheduledTaskData } from "@/types";
import { format } from "date-fns";
import { es } from 'date-fns/locale';

const newTaskFormSchema = z.object({
  clientSelectionMode: z.enum(['existing', 'new']).default('existing'),
  accountId: z.string().optional(),
  newClientName: z.string().optional(),
  notes: z.string().min(3, "Las notas deben tener al menos 3 caracteres."),
  assignedToId: z.string().optional(),
  visitDate: z.date(),
}).superRefine((data, ctx) => {
  if (data.clientSelectionMode === 'existing' && !data.accountId) {
    ctx.addIssue({ path: ['accountId'], message: 'Debes seleccionar una cuenta existente.' });
  }
  if (data.clientSelectionMode === 'new' && (!data.newClientName || data.newClientName.trim().length < 2)) {
    ctx.addIssue({ path: ['newClientName'], message: 'El nombre del nuevo cliente es obligatorio.' });
  }
});

type NewTaskFormValues = z.infer<typeof newTaskFormSchema>;

interface NewTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: NewScheduledTaskData) => Promise<void>;
  selectedDate: Date | undefined;
  taskCategory: 'Commercial' | 'General';
}

export default function NewTaskDialog({ isOpen, onOpenChange, onSave, selectedDate, taskCategory }: NewTaskDialogProps) {
  const { userRole, teamMember } = useAuth();
  const [isSaving, setIsSaving] = React.useState(false);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const title = taskCategory === 'Commercial' ? 'Añadir Nueva Tarea Comercial' : 'Añadir Tarea Administrativa';
  const description = taskCategory === 'Commercial' 
      ? `Programando una nueva visita o tarea de seguimiento para el ${selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : ''}.`
      : `Programando una nueva tarea interna/administrativa para el ${selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : ''}.`;


  const form = useForm<NewTaskFormValues>({
    resolver: zodResolver(newTaskFormSchema),
    defaultValues: {
      clientSelectionMode: 'existing',
      accountId: undefined,
      newClientName: '',
      notes: '',
      assignedToId: undefined,
      visitDate: new Date(),
    }
  });

  React.useEffect(() => {
    async function loadData() {
      if (!isOpen) return;
      setIsLoading(true);
      try {
        const [fetchedAccounts, fetchedMembers] = await Promise.all([
          taskCategory === 'Commercial' ? getAccountsFS() : Promise.resolve([]),
          userRole === 'Admin' ? getTeamMembersFS(['SalesRep', 'Clavadista', 'Admin']) : Promise.resolve([]),
        ]);
        setAccounts(fetchedAccounts);
        setTeamMembers(fetchedMembers);
      } catch (error) {
        console.error("Failed to load data for new task dialog", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [isOpen, userRole, taskCategory]);

  React.useEffect(() => {
    if (isOpen && selectedDate) {
      form.reset({
        visitDate: selectedDate,
        clientSelectionMode: 'existing',
        accountId: undefined,
        newClientName: '',
        notes: '',
        assignedToId: userRole === 'Admin' ? teamMember?.id : undefined,
      });
    }
  }, [isOpen, selectedDate, form, userRole, teamMember]);

  const onSubmit = async (data: NewTaskFormValues) => {
    setIsSaving(true);
    await onSave({ ...data, taskCategory });
    setIsSaving(false);
  };
  
  const clientMode = form.watch('clientSelectionMode');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {taskCategory === 'Commercial' && (
                <>
                  <FormField control={form.control} name="clientSelectionMode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="existing">Cliente Existente</SelectItem>
                          <SelectItem value="new">Cliente Nuevo</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  {clientMode === 'existing' ? (
                     <FormField control={form.control} name="accountId" render={({ field }) => (
                       <FormItem>
                         <FormLabel>Seleccionar Cuenta</FormLabel>
                         <Select onValueChange={field.onChange} value={field.value}>
                           <FormControl><SelectTrigger><SelectValue placeholder="Busca y selecciona una cuenta..." /></SelectTrigger></FormControl>
                           <SelectContent>
                             {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.nombre}</SelectItem>)}
                           </SelectContent>
                         </Select>
                         <FormMessage />
                       </FormItem>
                     )} />
                  ) : (
                    <FormField control={form.control} name="newClientName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Nuevo Cliente</FormLabel>
                        <FormControl><Input placeholder="Ej: Café del Puerto" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </>
              )}
               <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivo / Notas de la Tarea</FormLabel>
                  <FormControl><Textarea placeholder={taskCategory === 'Commercial' ? "Ej: Presentar nuevo producto..." : "Ej: Preparar informe trimestral..."} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {userRole === 'Admin' && (
                <FormField control={form.control} name="assignedToId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asignar A</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar responsable..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {teamMembers.map(tm => <SelectItem key={tm.id} value={tm.id}>{tm.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Guardando...</> : "Guardar Tarea"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
