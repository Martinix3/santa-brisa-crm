
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
import type { Account, TeamMember, UserRole, NewScheduledTaskData, Order } from "@/types";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';

const getNewTaskFormSchema = (taskCategory: 'Commercial' | 'General') => {
  return z.object({
    clientSelectionMode: z.enum(['existing', 'new']).default('existing'),
    accountId: z.string().optional(),
    newClientName: z.string().optional(),
    notes: z.string().min(3, "Las notas deben tener al menos 3 caracteres."),
    assignedToId: z.string().optional(),
    visitDate: z.date(),
  }).superRefine((data, ctx) => {
    if (taskCategory === 'Commercial') {
      if (data.clientSelectionMode === 'existing' && !data.accountId) {
        ctx.addIssue({ path: ['accountId'], message: 'Debes seleccionar una cuenta existente.' });
      }
      if (data.clientSelectionMode === 'new' && (!data.newClientName || data.newClientName.trim().length < 2)) {
        ctx.addIssue({ path: ['newClientName'], message: 'El nombre del nuevo cliente es obligatorio.' });
      }
    }
  });
};


type NewTaskFormValues = z.infer<ReturnType<typeof getNewTaskFormSchema>>;

interface NewTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: NewScheduledTaskData, originalTaskId?: string) => Promise<void>;
  selectedDate: Date | undefined;
  taskCategory: 'Commercial' | 'General';
  taskToEdit?: Order | null;
  allAccounts: Account[];
  teamMembers: TeamMember[];
}

export default function NewTaskDialog({ isOpen, onOpenChange, onSave, selectedDate, taskCategory, taskToEdit, allAccounts, teamMembers }: NewTaskDialogProps) {
  const { userRole, teamMember } = useAuth();
  const [isSaving, setIsSaving] = React.useState(false);
  
  const isEditMode = !!taskToEdit;
  const title = isEditMode
    ? `Editar Tarea: ${taskToEdit.clientName}`
    : (taskCategory === 'Commercial' ? 'Añadir Nueva Tarea Comercial' : 'Añadir Tarea Administrativa');
  
  const description = isEditMode 
      ? "Modifica los detalles de la tarea programada."
      : (taskCategory === 'Commercial' 
          ? `Programando una nueva visita o tarea de seguimiento para el ${selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : ''}.`
          : `Programando una nueva tarea interna/administrativa para el ${selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : ''}.`);


  const form = useForm<NewTaskFormValues>({
    resolver: zodResolver(getNewTaskFormSchema(taskCategory)),
    defaultValues: {
      clientSelectionMode: 'existing',
      accountId: undefined,
      newClientName: '',
      notes: '',
      assignedToId: undefined,
      visitDate: selectedDate ?? new Date(),
    }
  });

  React.useEffect(() => {
    if (isOpen) {
        if (isEditMode && taskToEdit) {
            const assignedMember = teamMembers.find(m => m.name === taskToEdit.salesRep);
            form.reset({
                visitDate: taskToEdit.visitDate ? parseISO(taskToEdit.visitDate) : new Date(),
                notes: taskToEdit.notes || '',
                accountId: taskToEdit.accountId || undefined,
                clientSelectionMode: 'existing',
                newClientName: taskToEdit.clientName || '',
                assignedToId: assignedMember?.id || undefined,
            });
        } else {
            form.reset({
                visitDate: selectedDate ?? new Date(),
                clientSelectionMode: 'existing',
                accountId: undefined,
                newClientName: '',
                notes: '',
                assignedToId: userRole === 'Admin' ? teamMember?.id : undefined,
            });
        }
    }
  }, [isOpen, isEditMode, taskToEdit, selectedDate, form, userRole, teamMember, teamMembers]);

  const onSubmit = async (data: NewTaskFormValues) => {
    setIsSaving(true);
    await onSave({ ...data, taskCategory }, taskToEdit?.id);
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
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {taskCategory === 'Commercial' && (
              <>
                <FormField control={form.control} name="clientSelectionMode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isEditMode}>
                      <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="existing">Cliente Existente</SelectItem>
                        <SelectItem value="new">Cliente Nuevo</SelectItem>
                      </SelectContent>
                    </FormItem>
                )} />
                {clientMode === 'existing' ? (
                   <FormField control={form.control} name="accountId" render={({ field }) => (
                     <FormItem>
                       <FormLabel>Seleccionar Cuenta</FormLabel>
                       <Select onValueChange={field.onChange} value={field.value ?? ''}>
                         <FormControl><SelectTrigger><SelectValue placeholder="Busca y selecciona una cuenta..." /></SelectTrigger></FormControl>
                         <SelectContent>
                           {allAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.nombre}</SelectItem>)}
                         </SelectContent>
                       </Select>
                       <FormMessage />
                     </FormItem>
                   )} />
                ) : (
                  <FormField control={form.control} name="newClientName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Nuevo Cliente</FormLabel>
                      <FormControl><Input placeholder="Ej: Café del Puerto" {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </>
            )}
             <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Objetivo / Notas de la Tarea</FormLabel>
                <FormControl><Textarea placeholder={taskCategory === 'Commercial' ? "Ej: Presentar nuevo producto..." : "Ej: Preparar informe trimestral..."} {...field} value={field.value ?? ''}/></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {userRole === 'Admin' && (
              <FormField control={form.control} name="assignedToId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Asignar A</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
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
      </DialogContent>
    </Dialog>
  );
}
