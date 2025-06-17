
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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

const userFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("El formato del correo electrónico no es válido."),
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

type UserFormValues = z.infer<typeof userFormSchema>;

// Helper function to generate default performance data for new SalesRep
const generateDefaultPerformanceData = (): { month: string; bottles: number }[] => {
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio"]; // Example past 6 months
  return months.map(month => ({ month, bottles: 0 }));
};


export default function UserManagementPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  // Local state to trigger re-render of the table
  const [users, setUsers] = React.useState<TeamMember[]>(mockTeamMembers);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      role: undefined,
      monthlyTarget: undefined,
    },
  });

  const selectedRole = form.watch("role");

  async function onSubmit(values: UserFormValues) {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 700)); // Simulate API call

    const newUser: TeamMember = {
      id: `usr${Date.now()}`,
      name: values.name,
      email: values.email,
      role: values.role,
      avatarUrl: 'https://placehold.co/100x100.png', // Default placeholder avatar
    };

    if (values.role === "SalesRep") {
      newUser.monthlyTarget = values.monthlyTarget;
      newUser.bottlesSold = 0;
      newUser.orders = 0;
      newUser.visits = 0;
      newUser.performanceData = generateDefaultPerformanceData();
    }

    // Add to the global mockTeamMembers array (simulating a backend update)
    mockTeamMembers.push(newUser);
    setUsers([...mockTeamMembers]); // Update local state to re-render table

    toast({
      title: "¡Usuario Creado!",
      description: (
        <div className="flex items-start">
          <Check className="h-5 w-5 text-green-500 mr-2 mt-1" />
          <p>Usuario {newUser.name} ({newUser.role}) creado exitosamente.</p>
        </div>
      ),
      variant: "default",
    });

    form.reset();
    form.setValue("monthlyTarget", undefined); // Ensure this is also reset
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
          <CardDescription>Complete el formulario para añadir un nuevo usuario al sistema.</CardDescription>
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
                      <FormLabel>Correo Electrónico</FormLabel>
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
          <CardDescription>Lista de todos los usuarios registrados en el sistema.</CardDescription>
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
