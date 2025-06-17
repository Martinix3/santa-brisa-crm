
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
import type { TeamMember, UserRole } from "@/types";
import { userRolesList } from "@/lib/data";
import { Loader2 } from "lucide-react";

const editUserFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("El formato del correo electrónico no es válido."), // Generalmente no se edita si es el login
  role: z.enum(userRolesList as [UserRole, ...UserRole[]], { required_error: "El rol es obligatorio." }),
  monthlyTarget: z.coerce.number().positive("El objetivo mensual debe ser un número positivo.").optional(),
}).superRefine((data, ctx) => {
  if (data.role === "SalesRep" && (data.monthlyTarget === undefined || data.monthlyTarget <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El objetivo mensual es obligatorio y debe ser positivo para un Representante de Ventas.",
      path: ["monthlyTarget"],
    });
  }
});

export type EditUserFormValues = z.infer<typeof editUserFormSchema>;

interface EditUserDialogProps {
  user: TeamMember | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: EditUserFormValues, userId: string) => void;
}

export default function EditUserDialog({ user, isOpen, onOpenChange, onSave }: EditUserDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      name: "",
      email: "",
      role: undefined,
      monthlyTarget: undefined,
    },
  });

  const selectedRole = form.watch("role");

  React.useEffect(() => {
    if (user && isOpen) {
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role,
        monthlyTarget: user.role === 'SalesRep' ? user.monthlyTarget : undefined,
      });
    }
  }, [user, isOpen, form]);

  const onSubmit = async (data: EditUserFormValues) => {
    if (!user) return;
    setIsSaving(true);
    // Simular guardado
    await new Promise(resolve => setTimeout(resolve, 700));
    onSave(data, user.id);
    setIsSaving(false);
    onOpenChange(false); // Cierra el diálogo después de guardar
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuario: {user.name}</DialogTitle>
          <DialogDescription>
            Modifique los detalles del usuario. El correo electrónico no se puede cambiar aquí.
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userRolesList.map(roleValue => (
                        <SelectItem key={roleValue} value={roleValue}>
                          {roleValue === 'SalesRep' ? 'Rep. Ventas' : roleValue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectedRole === "SalesRep" && (
              <FormField
                control={form.control}
                name="monthlyTarget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivo Mensual de Ventas (Botellas)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="p. ej., 3000"
                        {...field}
                        value={field.value ?? ""}
                        onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
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
