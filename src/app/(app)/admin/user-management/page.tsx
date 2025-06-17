
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
import { Loader2, Check, Users, Edit } from "lucide-react";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { useAuth } from "@/contexts/auth-context";
import EditUserDialog, { type EditUserFormValues } from "@/components/app/edit-user-dialog";

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

export default function UserManagementPage() {
  const { toast } = useToast();
  const { createUserInAuth } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [users, setUsers] = React.useState<TeamMember[]>(() => {
    return [...mockTeamMembers]; // Use a mutable copy
  });
  const [editingUser, setEditingUser] = React.useState<TeamMember | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = React.useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      role: undefined,
      monthlyTarget: undefined,
      password: "secret123", 
    },
  });

  const selectedRole = form.watch("role");

  async function onSubmitNewUser(values: UserFormValues) {
    setIsSubmitting(true);

    const defaultPassword = values.password || "secret123"; 
    const firebaseUser = await createUserInAuth(values.email, defaultPassword);

    if (!firebaseUser) {
      setIsSubmitting(false);
      return;
    }
    
    // Create user for local mock data IF NOT ALREADY EXISTS BY EMAIL (to avoid duplicates if page is reloaded)
    // This new user in mockTeamMembers won't have performanceData unless explicitly added.
    // And it won't have an avatarUrl unless set.
    if (!mockTeamMembers.find(u => u.email === values.email)) {
        const newMockUser: TeamMember = {
            id: firebaseUser.uid, // Use Firebase UID as ID
            name: values.name,
            email: values.email,
            role: values.role,
            monthlyTarget: values.role === "SalesRep" ? values.monthlyTarget : undefined,
            bottlesSold: 0,
            orders: 0,
            visits: 0,
            performanceData: [], // Start with empty performance
            avatarUrl: `https://placehold.co/100x100.png?text=${values.name.substring(0,2)}`
        };
        mockTeamMembers.push(newMockUser); // Add to the global mock data source
        setUsers([...mockTeamMembers]); // Update local state to re-render table
    }


    toast({
      title: "¡Usuario Creado!",
      description: (
        <div className="flex items-start">
          <Check className="h-5 w-5 text-green-500 mr-2 mt-1" />
          <p>
            Usuario {values.name} ({values.role === 'SalesRep' ? 'Rep. Ventas' : values.role}) 
            creado en Firebase Auth y añadido a la lista local. Contraseña por defecto: {defaultPassword}.
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

  const handleEditUser = (userToEdit: TeamMember) => {
    setEditingUser(userToEdit);
    setIsEditUserDialogOpen(true);
  };

  const handleUpdateUser = (updatedData: EditUserFormValues, userId: string) => {
    // Update in the global mockTeamMembers array
    const userIndexInMock = mockTeamMembers.findIndex(u => u.id === userId);
    if (userIndexInMock !== -1) {
      mockTeamMembers[userIndexInMock] = {
        ...mockTeamMembers[userIndexInMock],
        name: updatedData.name,
        role: updatedData.role,
        monthlyTarget: updatedData.role === "SalesRep" ? updatedData.monthlyTarget : undefined,
        // Email is not editable here
      };
    }

    // Update in the local 'users' state for UI re-render
    setUsers(prevUsers => 
      prevUsers.map(u => 
        u.id === userId 
        ? { 
            ...u, 
            name: updatedData.name, 
            role: updatedData.role,
            monthlyTarget: updatedData.role === "SalesRep" ? updatedData.monthlyTarget : undefined,
          } 
        : u
      )
    );

    toast({
      title: "¡Usuario Actualizado!",
      description: `Los datos de ${updatedData.name} han sido actualizados.`,
      variant: "default",
    });
    setIsEditUserDialogOpen(false);
    setEditingUser(null);
  };


  return (
    <div className="space-y-8">
      <header className="flex items-center space-x-2">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Gestión de Usuarios</h1>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Añadir Nuevo Usuario</CardTitle>
          <CardDescription>Complete el formulario para añadir un nuevo usuario al sistema de autenticación de Firebase y a la lista local.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitNewUser)} className="space-y-6">
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
                             onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
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
                      Añadiendo Usuario...
                    </>
                  ) : (
                    "Añadir Usuario"
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
          <CardDescription>Lista de usuarios registrados en el sistema. Puede editar sus detalles.</CardDescription>
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
                  <TableHead className="text-right">Acciones</TableHead>
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
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No hay usuarios registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          isOpen={isEditUserDialogOpen}
          onOpenChange={setIsEditUserDialogOpen}
          onSave={handleUpdateUser}
        />
      )}
    </div>
  );
}
