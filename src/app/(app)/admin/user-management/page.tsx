
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { mockTeamMembers, userRolesList } from "@/lib/data";
import type { TeamMember, UserRole } from "@/types";
import { Loader2, Check, Users } from "lucide-react";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { useAuth } from "@/contexts/auth-context";

const userFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("El formato del correo electrónico no es válido."),
  role: z.enum(userRolesList as [UserRole, ...UserRole[]], { required_error: "El rol es obligatorio." }),
  monthlyTarget: z.coerce.number().positive("El objetivo mensual debe ser un número positivo.").optional(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional(),
}).superRefine((data, ctx) => {
  if (data.role === "SalesRep" && (data.monthlyTarget === undefined || data.monthlyTarget <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El objetivo mensual es obligatorio y debe ser positivo para un Representante de Ventas.",
      path: ["monthlyTarget"],
    });
  }
});

type UserFormValues = z.infer<typeof userFormSchema>;

// Note: generateDefaultPerformanceData is not used if users are not added to mockTeamMembers locally.
// const generateDefaultPerformanceData = (): { month: string; bottles: number }[] => {
//   const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio"];
//   return months.map(month => ({ month, bottles: 0 }));
// };

export default function UserManagementPage() {
  const { toast } = useToast();
  const { createUserInAuth } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  // Initialize users state with mockTeamMembers. This list will not be updated by the form on this page.
  const [users, setUsers] = React.useState<TeamMember[]>(() => {
    // Potentially deep copy if mockTeamMembers could be mutated elsewhere and you want a true snapshot
    // For now, direct assignment is fine as mockTeamMembers is re-imported on navigation.
    return mockTeamMembers;
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      role: undefined,
      monthlyTarget: undefined,
      password: "secret123", // Default password for new users
    },
  });

  const selectedRole = form.watch("role");

  async function onSubmit(values: UserFormValues) {
    setIsSubmitting(true);

    // 1. Create user in Firebase Authentication
    const defaultPassword = values.password || "secret123"; 
    const firebaseUser = await createUserInAuth(values.email, defaultPassword);

    if (!firebaseUser) {
      // Error toast is handled by createUserInAuth
      setIsSubmitting(false);
      return;
    }
    
    // 2. User is created in Firebase Auth. We will NOT update the local mockTeamMembers or the displayed table.
    // The user will exist in Firebase, but this page's view of "Usuarios Existentes" will remain static.

    // Construct a temporary object for the toast message
    const createdUserName = values.name;
    const createdUserRole = values.role;

    toast({
      title: "¡Usuario Creado en Firebase!",
      description: (
        <div className="flex items-start">
          <Check className="h-5 w-5 text-green-500 mr-2 mt-1" />
          <p>
            Usuario {createdUserName} ({createdUserRole === 'SalesRep' ? 'Rep. Ventas' : createdUserRole}) 
            creado en el sistema de autenticación. Contraseña por defecto: {defaultPassword}. 
            La lista de usuarios en esta vista no se actualizará.
          </p>
        </div>
      ),
      variant: "default",
    });

    form.reset({
      name: "",
      email: "",
      role: undefined,
      monthlyTarget: undefined,
      password: "secret123",
    });
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center space-x-2">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Gestión de Usuarios</h1>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Añadir Nuevo Usuario</CardTitle>
          <CardDescription>Complete el formulario para añadir un nuevo usuario al sistema de autenticación de Firebase. La lista de abajo no se actualizará dinámicamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <Input type="email" placeholder="usuario@ejemplo.com" {...field} />
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
                 <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña Temporal</FormLabel>
                      <FormControl>
                        <Input type="text" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {selectedRole === "SalesRep" && (
                  <FormField
                    control={form.control}
                    name="monthlyTarget"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Objetivo Mensual de Ventas (Botellas)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="p. ej., 3000"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              <CardFooter className="p-0 pt-4">
                <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Añadiendo Usuario a Firebase...
                    </>
                  ) : (
                    "Añadir Usuario a Firebase"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Usuarios Existentes</CardTitle>
          <CardDescription>Lista de usuarios registrados en el sistema (datos simulados, no se actualiza con nuevas altas de esta página).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Objetivo Mensual (Botellas)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role === 'SalesRep' ? 'Rep. Ventas' : user.role}</TableCell>
                    <TableCell className="text-right">
                      {user.role === "SalesRep" && user.monthlyTarget !== undefined ? (
                         <FormattedNumericValue value={user.monthlyTarget} locale="es-ES" />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No hay usuarios registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
