
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamMember, UserRole, TeamMemberFormValues as TeamMemberFormValuesType } from "@/types"; // Use TeamMemberFormValuesType
import { userRolesList } from "@/lib/data";
import { Loader2 } from "lucide-react";

// Schema for the edit dialog - email is not part of the values here as it's not editable
const editUserFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  role: z.enum(userRolesList as [UserRole, ...UserRole[]], { required_error: "El rol es obligatorio." }),
  monthlyTargetAccounts: z.coerce.number().positive("El objetivo de cuentas debe ser un número positivo.").optional(),
  monthlyTargetVisits: z.coerce.number().positive("El objetivo de visitas debe ser un número positivo.").optional(),
  avatarUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal("")),
  authUid: z.string().optional(), // Keep authUid, though not directly editable
  email: z.string().email().optional(), // Include email but it will be disabled
}).superRefine((data, ctx) => {
  if (data.role === "SalesRep") {
    if (data.monthlyTargetAccounts === undefined || data.monthlyTargetAccounts <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El objetivo mensual de cuentas es obligatorio y debe ser positivo para un Representante de Ventas.",
        path: ["monthlyTargetAccounts"],
      });
    }
    if (data.monthlyTargetVisits === undefined || data.monthlyTargetVisits <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El objetivo mensual de visitas es obligatorio y debe ser positivo para un Representante de Ventas.",
        path: ["monthlyTargetVisits"],
      });
    }
  }
  if (data.role === "Clavadista" || data.role === "Distributor" || data.role === "Admin") {
    data.monthlyTargetAccounts = undefined;
    data.monthlyTargetVisits = undefined;
  }
});

// This type is specifically for the Edit dialog's form values.
// It matches TeamMemberFormValues but doesn't require email to be actively submitted (it's informational)
export type EditUserFormValues = z.infer<typeof editUserFormSchema>;


interface EditUserDialogProps {
  user: TeamMember | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: TeamMemberFormValuesType, userId: string) => void; // Expects the broader TeamMemberFormValuesType for saving
}

export default function EditUserDialog({ user, isOpen, onOpenChange, onSave }: EditUserDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<EditUserFormValues>({ // Use the dialog-specific schema for form
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      name: "",
      email: "", // email included for display
      role: undefined,
      monthlyTargetAccounts: undefined,
      monthlyTargetVisits: undefined,
      avatarUrl: "",
      authUid: "",
    },
  });

  const selectedRole = form.watch("role");

  React.useEffect(() => {
    if (user && isOpen) {
      form.reset({
        name: user.name,
        email: user.email, // Set email for display
        role: user.role,
        monthlyTargetAccounts: user.role === 'SalesRep' ? user.monthlyTargetAccounts : undefined,
        monthlyTargetVisits: user.role === 'SalesRep' ? user.monthlyTargetVisits : undefined,
        avatarUrl: user.avatarUrl || "",
        authUid: user.authUid || user.id,
      });
    }
  }, [user, isOpen, form]);

  const onSubmit = async (data: EditUserFormValues) => {
    if (!user) return;
    setIsSaving(true);
    
    // Prepare data for the onSave callback, which expects TeamMemberFormValuesType
    const dataToSave: TeamMemberFormValuesType = {
        name: data.name,
        email: user.email, // Use original email, not from form as it's disabled
        role: data.role,
        monthlyTargetAccounts: data.monthlyTargetAccounts,
        monthlyTargetVisits: data.monthlyTargetVisits,
        avatarUrl: data.avatarUrl,
        authUid: user.authUid || user.id, // Ensure authUid is passed
    };
    await new Promise(resolve => setTimeout(resolve, 700));
    onSave(dataToSave, user.id);
    setIsSaving(false);
    onOpenChange(false); 
  };

  if (!user) return null;

  const getRoleDisplayName = (role: UserRole): string => {
    switch (role) {
        case 'SalesRep': return 'Rep. Ventas';
        case 'Clavadista': return 'Clavadista';
        default: return role;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuario: {user.name}</DialogTitle>
          <DialogDescription>
            Modifique los detalles del usuario. El correo electrónico no se puede cambiar.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre y apellidos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico (Login)</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} disabled /> 
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol del Usuario</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userRolesList.map(roleValue => (
                        <SelectItem key={roleValue} value={roleValue}>
                         {getRoleDisplayName(roleValue)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del Avatar (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/avatar.png" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectedRole === "SalesRep" && (
              <>
                <FormField
                  control={form.control}
                  name="monthlyTargetAccounts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objetivo Mensual de Cuentas</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="p. ej., 20"
                          {...field}
                          value={field.value ?? ""}
                          onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="monthlyTargetVisits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objetivo Mensual de Visitas</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="p. ej., 80"
                          {...field}
                          value={field.value ?? ""}
                          onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
