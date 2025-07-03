
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Supplier, UserRole } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Edit, Trash2, MoreHorizontal, Eye, Loader2, MapPin, Truck } from "lucide-react";
import SupplierDialog, { type SupplierFormValues } from "@/components/app/supplier-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Link from "next/link";
import { getSuppliersFS, addSupplierFS, deleteSupplierFS } from "@/services/supplier-service";

export default function SuppliersPage() {
  const { toast } = useToast();
  const { userRole, dataSignature, refreshDataSignature } = useAuth();
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = React.useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");

  const isAdmin = userRole === 'Admin';

  React.useEffect(() => {
    async function loadSuppliers() {
      setIsLoading(true);
      try {
        const firestoreSuppliers = await getSuppliersFS();
        setSuppliers(firestoreSuppliers);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        toast({ title: "Error al Cargar Proveedores", description: "No se pudieron cargar los proveedores.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    if (isAdmin) {
      loadSuppliers();
    } else {
      setIsLoading(false);
    }
  }, [toast, isAdmin, dataSignature]);

  const handleAddNewSupplier = () => {
    if (!isAdmin) return;
    setEditingSupplier(null);
    setIsSupplierDialogOpen(true);
  };
  
  const handleEditSupplier = (supplier: Supplier) => {
    if (!isAdmin) return;
    setEditingSupplier(supplier);
    setIsSupplierDialogOpen(true);
  };

  const handleSaveSupplier = async (data: SupplierFormValues) => {
    if (!isAdmin) return;
    setIsLoading(true); 
    try {
      if (editingSupplier) {
        // Update logic is handled in the detail page, but we can keep it here for quick edits
      } else {
        await addSupplierFS(data);
        toast({ title: "¡Proveedor Añadido!", description: `El proveedor "${data.name}" ha sido añadido.` });
      }
      refreshDataSignature();
      setIsSupplierDialogOpen(false);
      setEditingSupplier(null);
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast({ title: "Error al Guardar", description: "No se pudo añadir el nuevo proveedor.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    if (!isAdmin) return;
    setSupplierToDelete(supplier);
  };

  const confirmDeleteSupplier = async () => {
    if (!isAdmin || !supplierToDelete) return;
    setIsLoading(true);
    try {
      await deleteSupplierFS(supplierToDelete.id);
      setSuppliers(prev => prev.filter(s => s.id !== supplierToDelete.id));
      toast({ title: "¡Proveedor Eliminado!", description: `El proveedor "${supplierToDelete.name}" ha sido eliminado.`, variant: "destructive" });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast({ title: "Error al Eliminar", description: "No se pudo eliminar el proveedor.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setSupplierToDelete(null);
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.cif && s.cif.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader><CardTitle>Acceso Denegado</CardTitle></CardHeader>
        <CardContent><p>No tienes permiso para ver esta sección.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
            <Truck className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Gestión de Proveedores</h1>
        </div>
        <Button onClick={handleAddNewSupplier} disabled={isLoading}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Proveedor
        </Button>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Directorio de Proveedores</CardTitle>
          <CardDescription>Visualiza y gestiona todos los proveedores. Un proveedor se crea automáticamente al registrar una compra con un nombre nuevo.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Input
              placeholder="Buscar por nombre o CIF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando proveedores...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre Proveedor</TableHead>
                    <TableHead>CIF/NIF</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.length > 0 ? filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">
                        <Link href={`/suppliers/${supplier.id}`} className="hover:underline text-primary">
                          {supplier.name}
                        </Link>
                      </TableCell>
                      <TableCell>{supplier.cif || 'No especificado'}</TableCell>
                      <TableCell>
                          {supplier.address?.city ? (
                            <div className="flex items-center text-xs">
                                <MapPin size={14} className="mr-1 text-muted-foreground" />
                                {supplier.address.city}
                            </div>
                          ) : "N/D"}
                      </TableCell>
                      <TableCell>{supplier.contactName || 'N/D'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/suppliers/${supplier.id}`}>
                                <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleEditSupplier(supplier)}>
                               <Edit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                  onSelect={(e) => { e.preventDefault(); handleDeleteSupplier(supplier); }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar Proveedor
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              {supplierToDelete && supplierToDelete.id === supplier.id && (
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          Esta acción no se puede deshacer. Esto eliminará permanentemente al proveedor:
                                          <br />
                                          <strong className="mt-2 block">"{supplierToDelete.name}"</strong>
                                      </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                      <AlertDialogCancel onClick={() => setSupplierToDelete(null)}>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={confirmDeleteSupplier} variant="destructive">Sí, eliminar</AlertDialogAction>
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
                      <TableCell colSpan={5} className="h-24 text-center">
                         No se encontraron proveedores.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {!isLoading && (
            <CardFooter>
                <p className="text-xs text-muted-foreground">Total de proveedores: {filteredSuppliers.length}</p>
            </CardFooter>
        )}
      </Card>
      
      {isAdmin && (
        <SupplierDialog
          supplier={editingSupplier}
          isOpen={isSupplierDialogOpen}
          onOpenChange={setIsSupplierDialogOpen}
          onSave={handleSaveSupplier}
        />
      )}
    </div>
  );
}
