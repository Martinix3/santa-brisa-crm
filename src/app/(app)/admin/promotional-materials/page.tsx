
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { promotionalMaterialTypeList } from "@/lib/data"; 
import type { PromotionalMaterial, PromotionalMaterialType, UserRole, LatestPurchaseInfo } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Edit, Trash2, MoreHorizontal, PackagePlus, Filter, ChevronDown, AlertTriangle, CalendarDays, Loader2, Archive } from "lucide-react";
import PromotionalMaterialDialog, { type PromotionalMaterialFormValues } from "@/components/app/promotional-material-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getPromotionalMaterialsFS, addPromotionalMaterialFS, updatePromotionalMaterialFS, deletePromotionalMaterialFS, initializeMockPromotionalMaterialsInFirestore } from "@/services/promotional-material-service";
import { mockPromotionalMaterials as initialMockMaterialsForSeeding } from "@/lib/data"; 


export default function PromotionalMaterialsPage() {
  const { toast } = useToast();
  const { userRole, refreshDataSignature } = useAuth();
  const [materials, setMaterials] = React.useState<PromotionalMaterial[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingMaterial, setEditingMaterial] = React.useState<PromotionalMaterial | null>(null);
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = React.useState(false);
  const [materialToDelete, setMaterialToDelete] = React.useState<PromotionalMaterial | null>(null);
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<PromotionalMaterialType | "Todos">("Todos");

  const isAdmin = userRole === 'Admin';

  React.useEffect(() => {
    async function loadMaterials() {
      setIsLoading(true);
      try {
        await initializeMockPromotionalMaterialsInFirestore(initialMockMaterialsForSeeding); 
        const firestoreMaterials = await getPromotionalMaterialsFS();
        setMaterials(firestoreMaterials);
      } catch (error) {
        console.error("Error fetching promotional materials:", error);
        toast({ title: "Error al Cargar Materiales", description: "No se pudieron cargar los materiales desde Firestore.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadMaterials();
  }, [toast, refreshDataSignature]);


  const handleAddNewMaterial = () => {
    if (!isAdmin) return;
    setEditingMaterial(null);
    setIsMaterialDialogOpen(true);
  };

  const handleEditMaterial = (material: PromotionalMaterial) => {
    if (!isAdmin) return;
    setEditingMaterial(material);
    setIsMaterialDialogOpen(true);
  };
  
  const handleSaveMaterial = async (data: PromotionalMaterialFormValues, materialId?: string) => {
    if (!isAdmin) return;
    setIsLoading(true);
    
    try {
      let successMessage = "";
      if (materialId) { 
        await updatePromotionalMaterialFS(materialId, data);
        successMessage = `El material "${data.name}" ha sido actualizado.`;
      } else { 
        await addPromotionalMaterialFS(data);
        successMessage = `El material "${data.name}" ha sido añadido.`;
      }
      const updatedMaterials = await getPromotionalMaterialsFS();
      setMaterials(updatedMaterials);
      toast({ title: "¡Operación Exitosa!", description: successMessage });
    } catch (error) {
        console.error("Error saving promotional material:", error);
        toast({ title: "Error al Guardar", description: "No se pudo guardar el material en Firestore.", variant: "destructive"});
    } finally {
        setIsLoading(false);
        setIsMaterialDialogOpen(false);
        setEditingMaterial(null);
    }
  };

  const handleDeleteMaterial = (material: PromotionalMaterial) => {
    if (!isAdmin) return;
    setMaterialToDelete(material);
  };

  const confirmDeleteMaterial = async () => {
    if (!isAdmin || !materialToDelete) return;
    setIsLoading(true);
    try {
      await deletePromotionalMaterialFS(materialToDelete.id);
      setMaterials(prev => prev.filter(mat => mat.id !== materialToDelete.id));
      toast({ title: "¡Material Eliminado!", description: `El material "${materialToDelete.name}" ha sido eliminado.`, variant: "destructive" });
    } catch (error) {
        console.error("Error deleting promotional material:", error);
        toast({ title: "Error al Eliminar", description: "No se pudo eliminar el material de Firestore.", variant: "destructive"});
    } finally {
        setIsLoading(false);
        setMaterialToDelete(null);
    }
  };

  const uniqueMaterialTypesForFilter = ["Todos", ...promotionalMaterialTypeList] as (PromotionalMaterialType | "Todos")[];

  const filteredMaterials = materials
    .filter(material =>
      (material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (material.description && material.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (material.sku && material.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    )
    .filter(material => typeFilter === "Todos" || material.type === typeFilter);

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
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
            <Archive className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Inventario de Materiales Promocionales</h1>
        </div>
        <Button onClick={handleAddNewMaterial} disabled={isLoading}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Material
        </Button>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Catálogo de Inventario</CardTitle>
          <CardDescription>Administra los materiales promocionales, su stock disponible y los costes asociados a través de las compras.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Input
              placeholder="Buscar (Nombre, SKU, Desc)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  Tipo: {typeFilter} <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {uniqueMaterialTypesForFilter.map(type => (
                   <DropdownMenuItem key={type} onSelect={() => setTypeFilter(type)}>
                    {type}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando inventario...</p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">Nombre del Material</TableHead>
                  <TableHead className="w-[15%]">SKU/Lote</TableHead>
                  <TableHead className="w-[15%]">Tipo</TableHead>
                  <TableHead className="text-right w-[10%]">Stock Disp.</TableHead>
                  <TableHead className="text-right w-[10%]">Coste Unit. (€)</TableHead>
                  <TableHead className="text-center w-[10%]">Última Compra</TableHead>
                  <TableHead className="text-right w-[15%]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.length > 0 ? filteredMaterials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{material.sku || 'N/A'}</TableCell>
                    <TableCell>{material.type}</TableCell>
                    <TableCell className="text-right font-bold">
                       <FormattedNumericValue value={material.stock} />
                    </TableCell>
                    <TableCell className="text-right">
                       {material.latestPurchase && material.latestPurchase.calculatedUnitCost !== undefined ? (
                           <FormattedNumericValue value={material.latestPurchase.calculatedUnitCost} locale="es-ES" options={{ style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 4 }} />
                       ) : (
                           <span className="text-muted-foreground">N/D</span>
                       )}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                        {material.latestPurchase?.purchaseDate ? (
                            <div className="flex items-center justify-center">
                                <CalendarDays size={14} className="mr-1 text-muted-foreground" />
                                {format(parseISO(material.latestPurchase.purchaseDate), "dd/MM/yy", { locale: es })}
                            </div>
                        ) : (
                           <span className="text-muted-foreground">Sin registrar</span>
                        )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleEditMaterial(material)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar Material
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                           <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onSelect={(e) => { e.preventDefault(); handleDeleteMaterial(material); }}
                                >
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar Material
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            {materialToDelete && materialToDelete.id === material.id && (
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Esto eliminará permanentemente el material:
                                        <br />
                                        <strong className="mt-2 block">"{materialToDelete.name}"</strong>
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setMaterialToDelete(null)}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={confirmDeleteMaterial} variant="destructive">Sí, eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            )}
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No se encontraron materiales que coincidan con tu búsqueda o filtros. Puedes añadir nuevos materiales.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
        {!isLoading && filteredMaterials.length > 0 && (
            <CardFooter>
                <p className="text-xs text-muted-foreground">Total de materiales mostrados: {filteredMaterials.length} de {materials.length}</p>
            </CardFooter>
        )}
      </Card>

      <PromotionalMaterialDialog
        material={editingMaterial}
        isOpen={isMaterialDialogOpen}
        onOpenChange={setIsMaterialDialogOpen}
        onSave={handleSaveMaterial}
      />
    </div>
  );
}
