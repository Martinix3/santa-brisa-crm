
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Wrench, HardHat } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import type { HoldedProject } from '@/types';

const getStatusText = (status: number) => {
    switch (status) {
        case 0: return "Pendiente";
        case 1: return "Activo";
        case 2: return "Finalizado";
        default: return "Desconocido";
    }
};

const newProjectSchema = z.object({
    name: z.string().min(3, "El nombre del proyecto es obligatorio."),
    description: z.string().optional()
});
type NewProjectFormValues = z.infer<typeof newProjectSchema>;

export default function ProjectsPage() {
    const { toast } = useToast();
    const [projects, setProjects] = React.useState<HoldedProject[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);

    const form = useForm<NewProjectFormValues>({
        resolver: zodResolver(newProjectSchema),
        defaultValues: { name: "", description: "" },
    });

    const fetchProjects = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/holded/projects');
            const result = await response.json();
            if (!result.ok) throw new Error(result.error);
            setProjects(result.data);
        } catch (error: any) {
            toast({ title: "Error al cargar proyectos", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const handleCreateProject = async (values: NewProjectFormValues) => {
        try {
            const response = await fetch('/api/holded/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            const result = await response.json();
            if (!result.ok) throw new Error(result.error);
            
            toast({ title: "¡Proyecto Creado!", description: `El proyecto "${values.name}" ha sido creado en Holded.` });
            setIsDialogOpen(false);
            form.reset();
            fetchProjects(); // Refresh the list
        } catch (error: any) {
            toast({ title: "Error al crear proyecto", description: error.message, variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <HardHat className="h-8 w-8 text-primary" />
                    <div>
                        <h1 className="text-3xl font-headline font-semibold">Proyectos desde Holded</h1>
                        <p className="text-muted-foreground">Vista de los proyectos gestionados en Holded.</p>
                    </div>
                </div>
                <Button onClick={() => setIsDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Nuevo Proyecto
                </Button>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Listado de Proyectos</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre del Proyecto</TableHead>
                                    <TableHead>Contacto</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Fecha Inicio</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {projects.length > 0 ? projects.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>{p.contactName || 'N/A'}</TableCell>
                                        <TableCell>{getStatusText(p.status)}</TableCell>
                                        <TableCell>{p.startedAt && isValid(parseISO(p.startedAt)) ? format(parseISO(p.startedAt), 'dd/MM/yyyy', {locale: es}) : 'N/A'}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={4} className="text-center h-24">No se encontraron proyectos.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Proyecto en Holded</DialogTitle>
                        <DialogDescription>
                            Introduce los datos básicos para crear el proyecto.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleCreateProject)} className="space-y-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nombre del Proyecto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Crear Proyecto
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
