
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
import { userRolesList } from "@/lib/data"; // mockTeamMembers is no longer used here
import type { TeamMember, UserRole, TeamMemberFormValues } from "@/types";
import { Loader2, Check, Users, Edit, Trash2 } from "lucide-react";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { useAuth } from "@/contexts/auth-context";
import EditUserDialog from "@/components/app/edit-user-dialog"; // Type EditUserFormValues comes from here
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getTeamMembersFS, deleteTeamMemberFS, updateTeamMemberFS, initializeMockTeamMembersInFirestore } from "@/services/team-member-service";
// import { mockTeamMembers as initialMockTeamMembersForSeeding } from "@/lib/data"; // If using seeding

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
  if (data.role === "Clavadista" || data.role === "Distributor" || data.role === "Admin") {
    data.monthlyTargetAccounts = undefined;
    data.monthlyTargetVisits = undefined;
  }
});

type UserFormValuesInternal = z.infer<typeof userFormSchema>; // Internal form state with password

export default function UserManagementPage() {
  const { toast } = useToast();
  const { user: currentUserAuth, createUserInAuthAndFirestore } = useAuth(); // Renamed user to currentUserAuth
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [users, setUsers] = React.useState<TeamMember[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
  const [editingUser, setEditingUser] = React.useState<TeamMember | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<TeamMember | null>(null);

  const form = useForm<UserFormValuesInternal>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "", email: "", role: undefined, monthlyTargetAccounts: undefined, monthlyTargetVisits: undefined, password: "secret123", 
    },
  });
  const selectedRole = form.watch("role");

  React.useEffect(() => {
    async function loadUsers() {
      setIsLoadingUsers(true);
      try {
        // Descomentar para inicializar mocks en Firestore (SOLO UNA VEZ)
        // await initializeMockTeamMembersInFirestore();
        const firestoreUsers = await getTeamMembersFS();
        setUsers(firestoreUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({ title: "Error al Cargar Usuarios", description: "No se pudieron cargar los usuarios de Firestore.", variant: "destructive" });
      } finally {
        setIsLoadingUsers(false);
      }
    }
    loadUsers();
  }, [toast]);

  async function onSubmitNewUser(values: UserFormValuesInternal) {
    setIsSubmitting(true);
    
    const existingUserByEmail = users.find(u => u.email.toLowerCase() === values.email.toLowerCase());
    if (existingUserByEmail) {
        toast({
            title: "Correo Ya Registrado",
            description: `El correo ${values.email} ya existe en la aplicación.`,
            variant: "destructive",
        });
        setIsSubmitting(false);
        form.reset({ ...values }); // Keep form values
        return;
    }

    const defaultPassword = values.password || "secret123";
    
    const teamMemberDataToSave: TeamMemberFormValues = {
        name: values.name,
        email: values.email.toLowerCase(),
        role: values.role,
        monthlyTargetAccounts: values.role === "SalesRep" ? values.monthlyTargetAccounts : undefined,
        monthlyTargetVisits: values.role === "SalesRep" ? values.monthlyTargetVisits : undefined,
        avatarUrl: `https://placehold.co/100x100.png?text=${values.name.substring(0,2).toUpperCase()}`
    };

    const { firebaseUser, teamMemberId } = await createUserInAuthAndFirestore(teamMemberDataToSave, defaultPassword);

    if (firebaseUser && teamMemberId) {
      const newUserFromFS = await getTeamMemberByIdFS(teamMemberId); // Fetch the newly created user
      if (newUserFromFS) {
        setUsers(prev => [newUserFromFS, ...prev].sort((a,b) => a.name.localeCompare(b.name)));
      }
      toast({
        title: "¡Usuario Creado!",
        description: <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-2 mt-1" /><p>Usuario {values.name} ({values.role}) creado. Contraseña por defecto: {defaultPassword}.</p></div>,
        variant: "default",
      });
      form.reset({ name: "", email: "", role: undefined, monthlyTargetAccounts: undefined, monthlyTargetVisits: undefined, password: "secret123" });
    } else {
      // Error toast is handled within createUserInAuthAndFirestore
    }
    setIsSubmitting(false);
  }

  const handleEditUser = (userToEdit: TeamMember) => {
    setEditingUser(userToEdit);
    setIsEditUserDialogOpen(true);
  };

  const handleUpdateUser = async (updatedData: TeamMemberFormValues, userId: string) => {
    setIsLoadingUsers(true); // Indicate loading state for the table
    try {
      await updateTeamMemberFS(userId, updatedData);
      const updatedUsers = await getTeamMembersFS(); // Reload all users to reflect changes
      setUsers(updatedUsers);
      toast({ title: "¡Usuario Actualizado!", description: `Los datos de ${updatedData.name} han sido actualizados.`, variant: "default" });
    } catch (error) {
      console.error("Error updating user:", error);
      toast({ title: "Error al Actualizar", description: "No se pudo actualizar el usuario.", variant: "destructive" });
    } finally {
      setIsLoadingUsers(false);
      setIsEditUserDialogOpen(false);
      setEditingUser(null);
    }
  };

  const handleDeleteUserClick = (user: TeamMember) => {
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (currentUserAuth && userToDelete.authUid === currentUserAuth.uid) {
        toast({ title: "Acción no permitida", description: "No puedes eliminar tu propia cuenta de administrador.", variant: "destructive" });
        setUserToDelete(null);
        return;
    }
    setIsLoadingUsers(true);
    try {
      await deleteTeamMemberFS(userToDelete.id); // Delete from Firestore
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userToDelete.id));
      toast({
        title: "Usuario Eliminado de Firestore",
        description: <div><p>El usuario "{userToDelete.name}" ha sido eliminado de Firestore.</p><p className="mt-2 font-semibold text-destructive">Importante: Para revocar completamente el acceso del usuario, debes eliminarlo manualmente desde la consola de Firebase Authentication.</p></div>,
        variant: "destructive", duration: 9000, 
      });
    } catch (error) {
      console.error("Error deleting user from Firestore:", error);
      toast({ title: "Error al Eliminar", description: "No se pudo eliminar el usuario de Firestore.", variant: "destructive" });
    } finally {
      setIsLoadingUsers(false);
      setUserToDelete(null);
    }
  };

  const getRoleDisplayName = (role: UserRole): string => {
    switch (role) {
        case 'SalesRep': return 'Rep. Ventas'; case 'Clavadista': return 'Clavadista'; default: return role;
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
          <CardDescription>Crea cuentas para el CRM. Se registrarán en Firebase Auth y en la base de datos de la aplicación.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitNewUser)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input placeholder="Nombre y apellidos" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Correo Electrónico (Login)</FormLabel><FormControl><Input type="email" placeholder="usuario@ejemplo.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Rol del Usuario</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un rol" /></SelectTrigger></FormControl><SelectContent>{userRolesList.map(roleValue => (<SelectItem key={roleValue} value={roleValue}>{getRoleDisplayName(roleValue)}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Contraseña Temporal</FormLabel><FormControl><Input type="text" {...field} /></FormControl><FormMessage /></FormItem>)} />
                {selectedRole === "SalesRep" && (
                  <>
                    <FormField control={form.control} name="monthlyTargetAccounts" render={({ field }) => (<FormItem><FormLabel>Objetivo Mensual de Cuentas</FormLabel><FormControl><Input type="number" placeholder="p. ej., 20" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="monthlyTargetVisits" render={({ field }) => (<FormItem><FormLabel>Objetivo Mensual de Visitas</FormLabel><FormControl><Input type="number" placeholder="p. ej., 80" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)} />
                  </>
                )}
              </div>
              <CardFooter className="p-0 pt-4"><Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>{isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Añadiendo...</>) : ("Añadir Usuario")}</Button></CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Usuarios Existentes</CardTitle>
          <CardDescription>Visualiza y gestiona usuarios. La eliminación completa requiere gestión en Firebase Auth.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-muted-foreground">Cargando usuarios...</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Rol</TableHead><TableHead className="text-right">Obj. Cuentas</TableHead><TableHead className="text-right">Obj. Visitas</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {users.length > 0 ? users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell><TableCell>{user.email}</TableCell><TableCell>{getRoleDisplayName(user.role)}</TableCell>
                      <TableCell className="text-right">{user.role === "SalesRep" && user.monthlyTargetAccounts !== undefined ? (<FormattedNumericValue value={user.monthlyTargetAccounts} locale="es-ES" />) : ("—")}</TableCell>
                      <TableCell className="text-right">{user.role === "SalesRep" && user.monthlyTargetVisits !== undefined ? (<FormattedNumericValue value={user.monthlyTargetVisits} locale="es-ES" />) : ("—")}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}><Edit className="mr-1 h-3 w-3" />Editar</Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="destructive" size="sm" onClick={() => handleDeleteUserClick(user)} disabled={currentUserAuth?.uid === user.authUid}><Trash2 className="mr-1 h-3 w-3" />Eliminar</Button></AlertDialogTrigger>
                          {userToDelete && userToDelete.id === user.id && (
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>¿Eliminar "{userToDelete.name}"?</AlertDialogTitle><AlertDialogDescription>Eliminará al usuario de la aplicación CRM (Firestore).<br/><strong className="mt-2 block text-destructive">Importante: Deberás eliminarlo de Firebase Authentication para revocar su acceso.</strong></AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteUser} variant="destructive">Sí, eliminar de la app</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          )}
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  )) : (<TableRow><TableCell colSpan={6} className="h-24 text-center">No hay usuarios. Utiliza el formulario para añadir.</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {editingUser && (<EditUserDialog user={editingUser} isOpen={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen} onSave={handleUpdateUser} />)}
    </div>
  );
}
