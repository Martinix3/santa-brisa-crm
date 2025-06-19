
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
import { Loader2, Check, Users, Edit, Trash2 } from "lucide-react";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { useAuth } from "@/contexts/auth-context";
import EditUserDialog, { type EditUserFormValues } from "@/components/app/edit-user-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const userFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("El formato del correo electrónico no es válido."),
  role: z.enum(userRolesList as [UserRole, ...UserRole[]], { required_error: "El rol es obligatorio." }),
  monthlyTargetAccounts: z.coerce.number().positive("El objetivo de cuentas debe ser un número positivo.").optional(),
  monthlyTargetVisits: z.coerce.number().positive("El objetivo de visitas debe ser un número positivo.").optional(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional(),
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
  // Clavadista and Distributor roles do not require these target fields
  if (data.role === "Clavadista" || data.role === "Distributor") {
    // Ensure these fields are not set or clear them if they are
    data.monthlyTargetAccounts = undefined;
    data.monthlyTargetVisits = undefined;
  }
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function UserManagementPage() {
  const { toast } = useToast();
  const { user: currentUser, createUserInAuth } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [users, setUsers] = React.useState<TeamMember[]>(() => {
    return [...mockTeamMembers]; 
  });
  const [editingUser, setEditingUser] = React.useState<TeamMember | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<TeamMember | null>(null);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      role: undefined,
      monthlyTargetAccounts: undefined,
      monthlyTargetVisits: undefined,
      password: "secret123", 
    },
  });

  const selectedRole = form.watch("role");

  async function onSubmitNewUser(values: UserFormValues) {
    setIsSubmitting(true);

    if (mockTeamMembers.find(u => u.email.toLowerCase() === values.email.toLowerCase())) {
        toast({
            title: "Correo Ya Registrado en la Aplicación",
            description: `El correo electrónico ${values.email} ya existe en la lista de usuarios del CRM.`,
            variant: "destructive",
        });
        setIsSubmitting(false);
        // No reset password field, allow user to correct other fields if needed
        form.reset({ 
            name: values.name,
            email: values.email,
            role: values.role,
            monthlyTargetAccounts: values.monthlyTargetAccounts,
            monthlyTargetVisits: values.monthlyTargetVisits,
            password: values.password || "secret123", 
        });
        return;
    }

    const defaultPassword = values.password || "secret123"; 
    const firebaseUser = await createUserInAuth(values.email, defaultPassword);

    if (!firebaseUser) {
      // Error (e.g., email already in use in Firebase Auth) handled by toast in createUserInAuth
      setIsSubmitting(false);
      return;
    }
    
    const newMockUser: TeamMember = {
        id: firebaseUser.uid, 
        name: values.name,
        email: values.email,
        role: values.role,
        monthlyTargetAccounts: values.role === "SalesRep" ? values.monthlyTargetAccounts : undefined,
        monthlyTargetVisits: values.role === "SalesRep" ? values.monthlyTargetVisits : undefined,
        bottlesSold: 0,
        orders: 0,
        visits: 0,
        performanceData: [], 
        avatarUrl: `https://placehold.co/100x100.png?text=${values.name.substring(0,2)}`
    };
    mockTeamMembers.push(newMockUser); 
    setUsers([...mockTeamMembers]); 

    toast({
      title: "¡Usuario Creado!",
      description: (
        <div className="flex items-start">
          <Check className="h-5 w-5 text-green-500 mr-2 mt-1" />
          <p>
            Usuario {values.name} ({values.role}) 
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
      monthlyTargetAccounts: undefined,
      monthlyTargetVisits: undefined,
      password: "secret123",
    });
    setIsSubmitting(false);
  }

  const handleEditUser = (userToEdit: TeamMember) => {
    setEditingUser(userToEdit);
    setIsEditUserDialogOpen(true);
  };

  const handleUpdateUser = (updatedData: EditUserFormValues, userId: string) => {
    const userIndexInMock = mockTeamMembers.findIndex(u => u.id === userId);
    if (userIndexInMock !== -1) {
      mockTeamMembers[userIndexInMock] = {
        ...mockTeamMembers[userIndexInMock],
        name: updatedData.name,
        role: updatedData.role,
        monthlyTargetAccounts: updatedData.role === "SalesRep" ? updatedData.monthlyTargetAccounts : undefined,
        monthlyTargetVisits: updatedData.role === "SalesRep" ? updatedData.monthlyTargetVisits : undefined,
      };
    }

    setUsers(prevUsers => 
      prevUsers.map(u => 
        u.id === userId 
        ? { 
            ...u, 
            name: updatedData.name, 
            role: updatedData.role,
            monthlyTargetAccounts: updatedData.role === "SalesRep" ? updatedData.monthlyTargetAccounts : undefined,
            monthlyTargetVisits: updatedData.role === "SalesRep" ? updatedData.monthlyTargetVisits : undefined,
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

  const handleDeleteUserClick = (user: TeamMember) => {
    setUserToDelete(user);
  };

  const confirmDeleteUser = () => {
    if (!userToDelete) return;

    if (currentUser && userToDelete.id === currentUser.uid) {
        toast({
            title: "Acción no permitida",
            description: "No puedes eliminar tu propia cuenta de administrador desde esta interfaz.",
            variant: "destructive",
        });
        setUserToDelete(null);
        return;
    }

    setUsers(prevUsers => prevUsers.filter(u => u.id !== userToDelete.id));

    const indexInMock = mockTeamMembers.findIndex(u => u.id === userToDelete.id);
    if (indexInMock !== -1) {
      mockTeamMembers.splice(indexInMock, 1);
    }

    toast({
      title: "Usuario Eliminado de la Aplicación",
      description: (
        <div>
          <p>El usuario "{userToDelete.name}" ha sido eliminado de la lista de esta aplicación CRM.</p>
          <p className="mt-2 font-semibold text-destructive">Importante: Para revocar completamente el acceso del usuario, debes eliminarlo manualmente desde la consola de Firebase Authentication.</p>
        </div>
      ),
      variant: "destructive",
      duration: 9000, 
    });
    setUserToDelete(null);
  };

  const getRoleDisplayName = (role: UserRole): string => {
    switch (role) {
        case 'SalesRep': return 'Rep. Ventas';
        case 'Clavadista': return 'Clavadista';
        default: return role;
    }
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
          <CardDescription>Crea nuevas cuentas de usuario para el CRM. Se registrarán en el sistema de autenticación y se añadirán a la lista de miembros del equipo.</CardDescription>
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
          <CardDescription>Visualiza y gestiona los usuarios registrados. Puedes editar sus datos o eliminarlos de la lista de la aplicación CRM. Recuerda que la eliminación completa del acceso requiere la gestión en Firebase Authentication.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Obj. Cuentas (Mes)</TableHead>
                  <TableHead className="text-right">Obj. Visitas (Mes)</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleDisplayName(user.role)}</TableCell>
                    <TableCell className="text-right">
                      {user.role === "SalesRep" && user.monthlyTargetAccounts !== undefined ? (
                         <FormattedNumericValue value={user.monthlyTargetAccounts} locale="es-ES" />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.role === "SalesRep" && user.monthlyTargetVisits !== undefined ? (
                         <FormattedNumericValue value={user.monthlyTargetVisits} locale="es-ES" />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                        <Edit className="mr-1 h-3 w-3" />
                        Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleDeleteUserClick(user)}
                              disabled={currentUser?.uid === user.id}
                            >
                            <Trash2 className="mr-1 h-3 w-3" /> Eliminar
                          </Button>
                        </AlertDialogTrigger>
                         {userToDelete && userToDelete.id === user.id && (
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar eliminación de "{userToDelete.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción eliminará al usuario de la lista de esta aplicación CRM.
                                    <br/>
                                    <strong className="mt-2 block text-destructive">Importante: Deberás eliminar manualmente al usuario ({userToDelete.email}) de Firebase Authentication para revocar su acceso completamente.</strong>
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={confirmDeleteUser} variant="destructive">Sí, eliminar de la app</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                         )}
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No hay usuarios registrados en el sistema. Utiliza el formulario superior para añadir nuevos usuarios.
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
