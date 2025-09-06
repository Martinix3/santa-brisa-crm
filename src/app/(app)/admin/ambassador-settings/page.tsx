
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { AmbassadorSettings, TeamMember } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Save, Target, Edit, Users, Award } from "lucide-react";
import { getAmbassadorSettingsFS, saveAmbassadorSettingsFS } from "@/services/settings-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const conditionSchema = z.object({
  pago_apertura: z.coerce.number().min(0),
  bonus_segundo_pedido: z.coerce.number().min(0),
  comision_inicial: z.coerce.number().min(0),
  comision_indefinida: z.coerce.number().min(0),
  min_pedido: z.coerce.number().min(0),
  segundo_pedido_plazo_dias: z.coerce.number().min(0),
});

const settingsSchema = z.object({
  horeca: conditionSchema,
  distribuidor_mediano: conditionSchema,
  distribuidor_grande: conditionSchema,
  distribuidor_top: conditionSchema,
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const customerTypeLabels: Record<keyof SettingsFormValues, string> = {
    horeca: "HORECA",
    distribuidor_mediano: "Distribuidor Mediano",
    distribuidor_grande: "Distribuidor Grande",
    distribuidor_top: "Distribuidor Top",
};

export default function AmbassadorSettingsPage() {
  const { toast } = useToast();
  const { userRole, dataSignature } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [clavadistas, setClavadistas] = React.useState<TeamMember[]>([]);
  
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
  });

  React.useEffect(() => {
    async function loadData() {
      if (userRole !== 'Admin') return;
      setIsLoading(true);
      try {
        const [settings, fetchedClavadistas] = await Promise.all([
            getAmbassadorSettingsFS(),
            getTeamMembersFS(['Clavadista', 'Líder Clavadista'])
        ]);
        form.reset(settings);
        setClavadistas(fetchedClavadistas);
      } catch (error) {
        toast({ title: "Error al Cargar", description: "No se pudieron cargar los datos necesarios.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [userRole, toast, form, dataSignature]);

  const onSubmit = async (data: SettingsFormValues) => {
    setIsSaving(true);
    try {
      await saveAmbassadorSettingsFS(data);
      toast({ title: "¡Guardado!", description: "Las condiciones globales para clavadistas han sido actualizadas." });
    } catch (error) {
      toast({ title: "Error al Guardar", description: "No se pudieron guardar las condiciones.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
        <header className="flex items-center space-x-2">
            <Award className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Condiciones Globales de Clavadistas</h1>
        </header>

        <Card>
            <CardHeader>
                <CardTitle>Gestión de Comisiones y Bonos</CardTitle>
                <CardDescription>
                    Define los valores por defecto para los pagos de apertura, bonos y comisiones.
                    Estos valores se usarán a menos que un clavadista tenga condiciones personalizadas.
                </CardDescription>
            </CardHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                    {(Object.keys(customerTypeLabels) as Array<keyof typeof customerTypeLabels>).map((key) => {
                        const fieldName = key;
                        return (
                        <div key={fieldName} className="space-y-4 p-4 border rounded-lg">
                            <h3 className="font-semibold text-lg">{customerTypeLabels[fieldName]}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name={`${fieldName}.pago_apertura`} render={({ field }) => (<FormItem><FormLabel>Fee Apertura (€)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`${fieldName}.bonus_segundo_pedido`} render={({ field }) => (<FormItem><FormLabel>Bonus 2º Pedido (€)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`${fieldName}.min_pedido`} render={({ field }) => (<FormItem><FormLabel>Cajas Mín. Pedido</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`${fieldName}.comision_inicial`} render={({ field }) => (<FormItem><FormLabel>Comisión Inicial (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`${fieldName}.comision_indefinida`} render={({ field }) => (<FormItem><FormLabel>Comisión Indef. (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`${fieldName}.segundo_pedido_plazo_dias`} render={({ field }) => (<FormItem><FormLabel>Plazo 2º Pedido (días)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </div>
                    )})}
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Guardando...</> : <><Save className="mr-2 h-4 w-4"/> Guardar Cambios</>}
                    </Button>
                </CardFooter>
            </form>
            </Form>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/>Condiciones por Clavadista</CardTitle>
                <CardDescription>
                   Visualiza qué clavadistas usan las condiciones globales y cuáles tienen personalizaciones. Edita cada clavadista desde su perfil en "Gestión de Usuarios".
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Clavadista</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Condiciones</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clavadistas.length > 0 ? clavadistas.map(clavadista => (
                            <TableRow key={clavadista.id}>
                                <TableCell className="font-medium">{clavadista.name}</TableCell>
                                <TableCell>{clavadista.role}</TableCell>
                                <TableCell>
                                    {clavadista.condiciones_personalizadas ? (
                                        <Badge variant="secondary">Personalizadas</Badge>
                                    ) : (
                                        <Badge variant="outline">Globales</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href="/admin/user-management">
                                            <Edit className="mr-2 h-4 w-4"/> Editar
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">No hay clavadistas registrados.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
