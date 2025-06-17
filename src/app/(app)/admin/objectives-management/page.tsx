
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { mockStrategicObjectives } from "@/lib/launch-dashboard-data"; // Updated import
import type { StrategicObjective } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Edit, Trash2, Goal, AlertTriangle } from "lucide-react";
import ObjectiveDialog, { type ObjectiveFormValues } from "@/components/app/objective-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function ObjectivesManagementPage() {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [objectives, setObjectives] = React.useState<StrategicObjective[]>(() => [...mockStrategicObjectives]);
  const [editingObjective, setEditingObjective] = React.useState<StrategicObjective | null>(null);
  const [isObjectiveDialogOpen, setIsObjectiveDialogOpen] = React.useState(false);
  const [objectiveToDelete, setObjectiveToDelete] = React.useState<StrategicObjective | null>(null);

  const isAdmin = userRole === 'Admin';

  const handleAddNewObjective = () => {
    if (!isAdmin) return;
    setEditingObjective(null);
    setIsObjectiveDialogOpen(true);
  };

  const handleEditObjective = (objective: StrategicObjective) => {
    if (!isAdmin) return;
    setEditingObjective(objective);
    setIsObjectiveDialogOpen(true);
  };

  const handleSaveObjective = (data: ObjectiveFormValues) => {
    if (!isAdmin) return;
    if (editingObjective) {
      // Edit existing objective
      const updatedObjectives = objectives.map(obj =>
        obj.id === editingObjective.id ? { ...obj, text: data.text, completed: data.completed } : obj
      );
      setObjectives(updatedObjectives);
      // Update mock data source
      const mockIndex = mockStrategicObjectives.findIndex(obj => obj.id === editingObjective.id);
      if (mockIndex !== -1) {
        mockStrategicObjectives[mockIndex] = { ...mockStrategicObjectives[mockIndex], text: data.text, completed: data.completed };
      }
      toast({ title: "¡Objetivo Actualizado!", description: `El objetivo "${data.text.substring(0,30)}..." ha sido actualizado.` });
    } else {
      // Add new objective
      const newObjective: StrategicObjective = {
        id: `obj${Date.now()}`,
        text: data.text,
        completed: data.completed,
      };
      setObjectives(prev => [newObjective, ...prev]);
      mockStrategicObjectives.unshift(newObjective); // Add to mock data source
      toast({ title: "¡Objetivo Añadido!", description: `El objetivo "${data.text.substring(0,30)}..." ha sido añadido.` });
    }
    setIsObjectiveDialogOpen(false);
    setEditingObjective(null);
  };

  const handleDeleteObjective = (objective: StrategicObjective) => {
    if (!isAdmin) return;
    setObjectiveToDelete(objective);
  };

  const confirmDeleteObjective = () => {
    if (!isAdmin || !objectiveToDelete) return;
    
    const updatedObjectives = objectives.filter(obj => obj.id !== objectiveToDelete.id);
    setObjectives(updatedObjectives);

    const mockIndex = mockStrategicObjectives.findIndex(obj => obj.id === objectiveToDelete.id);
    if (mockIndex !== -1) {
      mockStrategicObjectives.splice(mockIndex, 1);
    }
    toast({ title: "¡Objetivo Eliminado!", description: `El objetivo "${objectiveToDelete.text.substring(0,30)}..." ha sido eliminado.`, variant: "destructive" });
    setObjectiveToDelete(null);
  };

  const toggleObjectiveCompletion = (objectiveId: string, completed: boolean) => {
    if (!isAdmin) return;
    const updatedObjectives = objectives.map(obj =>
      obj.id === objectiveId ? { ...obj, completed } : obj
    );
    setObjectives(updatedObjectives);
    const mockIndex = mockStrategicObjectives.findIndex(obj => obj.id === objectiveId);
    if (mockIndex !== -1) {
      mockStrategicObjectives[mockIndex].completed = completed;
    }
     toast({ title: "Estado Actualizado", description: `El objetivo ahora está ${completed ? 'completado' : 'pendiente'}.` });
  };

  if (!isAdmin) {
    return (
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle className="flex items-center"><AlertTriangle className="mr-2 h-6 w-6 text-destructive" />Acceso Denegado</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No tienes permisos para acceder a esta sección.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between space-x-2">
        <div className="flex items-center space-x-2">
            <Goal className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Gestión de Objetivos Estratégicos</h1>
        </div>
        <Button onClick={handleAddNewObjective} disabled={!isAdmin}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Objetivo
        </Button>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Lista de Objetivos</CardTitle>
          <CardDescription>Administra los objetivos estratégicos de la empresa. Marca su estado, edita o elimina según sea necesario.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70%]">Descripción del Objetivo</TableHead>
                  <TableHead className="text-center w-[15%]">Estado (Completado)</TableHead>
                  <TableHead className="text-right w-[15%]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {objectives.length > 0 ? objectives.map((objective) => (
                  <TableRow key={objective.id}>
                    <TableCell className="font-medium">{objective.text}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={objective.completed}
                        onCheckedChange={(checked) => toggleObjectiveCompletion(objective.id, !!checked)}
                        aria-label={objective.completed ? "Marcar como no completado" : "Marcar como completado"}
                        disabled={!isAdmin}
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditObjective(objective)} disabled={!isAdmin}>
                        <Edit className="mr-1 h-3 w-3" /> Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm" onClick={() => handleDeleteObjective(objective)} disabled={!isAdmin}>
                            <Trash2 className="mr-1 h-3 w-3" /> Eliminar
                          </Button>
                        </AlertDialogTrigger>
                         {objectiveToDelete && objectiveToDelete.id === objective.id && (
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente el objetivo:
                                    <br />
                                    <strong className="mt-2 block">"{objectiveToDelete.text}"</strong>
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setObjectiveToDelete(null)}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={confirmDeleteObjective}>Sí, eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                         )}
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No hay objetivos estratégicos definidos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {objectives.length > 0 && (
            <CardFooter>
                <p className="text-xs text-muted-foreground">Total de objetivos: {objectives.length}</p>
            </CardFooter>
        )}
      </Card>

      {isAdmin && (
        <ObjectiveDialog
          objective={editingObjective}
          isOpen={isObjectiveDialogOpen}
          onOpenChange={setIsObjectiveDialogOpen}
          onSave={handleSaveObjective}
        />
      )}
    </div>
  );
}
