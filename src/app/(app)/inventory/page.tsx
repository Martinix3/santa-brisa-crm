
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { InventoryItem, UserRole, LatestPurchaseInfo, Category, ItemBatch } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Edit, Trash2, MoreHorizontal, Filter, ChevronDown, AlertTriangle, CalendarDays, Loader2, Archive } from "lucide-react";
import InventoryItemDialog from "@/components/app/inventory-item-dialog";
import type { InventoryItemFormValues } from "@/components/app/inventory-item-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getInventoryItemsFS, addInventoryItemFS, updateInventoryItemFS, deleteInventoryItemFS } from "@/services/inventory-item-service";
import { useCategories } from "@/contexts/categories-context";
import CategoryDialog from "@/components/app/category-dialog";
import type { CategoryFormValues } from "@/components/app/category-dialog";
import { addCategoryFS } from "@/services/category-service";
import { getAllBatchesFS } from "@/services/batch-service";
import { cn } from "@/lib/utils";


export default function InventoryPage() {
  const { toast } = useToast();
  const { userRole, dataSignature, refreshDataSignature } = useAuth();
  const { inventoryCategories, categoriesMap, isLoading: isLoadingCategories } = useCategories();

  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [batches, setBatches] = React.useState<ItemBatch[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<InventoryItem | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string | "Todos">("Todos");

  const isAdmin = userRole === 'Admin';
  const isLoading = isLoadingData || isLoadingCategories;

  React.useEffect(() => {
    async function loadData() {
      setIsLoadingData(true);
      try {
        const [firestoreItems, firestoreBatches] = await Promise.all([
            getInventoryItemsFS(),
            getAllBatchesFS()
        ]);
        setItems(firestoreItems);
        setBatches(firestoreBatches);
      } catch (error) {
        console.error("Error fetching inventory data:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los artículos de inventario o los lotes.", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    }
    loadData();
  }, [toast, dataSignature]);

  const batchesByItemId = React.useMemo(() => {
    return batches.reduce((acc, batch) => {
        if (!acc[batch.inventoryItemId]) {
            acc[batch.inventoryItemId] = [];
        }
        acc[batch.inventoryItemId].push(batch);
        return acc;
    }, {} as Record<string, ItemBatch[]>);
  }, [batches]);

  const toggleRowExpansion = (itemId: string) => {
    setExpandedRows(prev => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
            newSet.delete(itemId);
        } else {
            newSet.add(itemId);
        }
        return newSet;
    });
  };

  const handleAddNewItem = () => {
    if (!isAdmin) return;
    setEditingItem(null);
    setIsItemDialogOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    if (!isAdmin) return;
    setEditingItem(item);
    setIsItemDialogOpen(true);
  };
  
  const handleSaveItem = async (data: InventoryItemFormValues, itemId?: string) => {
    if (!isAdmin) return;
    setIsLoadingData(true);
    
    try {
      let successMessage = "";
      if (itemId) { 
        await updateInventoryItemFS(itemId, data);
        successMessage = `El artículo "${data.name}" ha sido actualizado.`;
      } else { 
        await addInventoryItemFS(data);
        successMessage = `El artículo "${data.name}" ha sido añadido.`;
      }
      refreshDataSignature();
      toast({ title: "¡Operación Exitosa!", description: successMessage });
    } catch (error) {
        console.error("Error saving inventory item:", error);
        toast({ title: "Error al Guardar", description: "No se pudo guardar el artículo en Firestore.", variant: "destructive"});
    } finally {
        setIsLoadingData(false);
        setIsItemDialogOpen(false);
        setEditingItem(null);
    }
  };

  const handleDeleteItem = (item: InventoryItem) => {
    if (!isAdmin) return;
    setItemToDelete(item);
  };

  const confirmDeleteItem = async () => {
    if (!isAdmin || !itemToDelete) return;
    setIsLoadingData(true);
    try {
      await deleteInventoryItemFS(itemToDelete.id);
      refreshDataSignature();
      toast({ title: "¡Artículo Eliminado!", description: `El artículo "${itemToDelete.name}" ha sido eliminado.`, variant: "destructive" });
    } catch (error) {
        console.error("Error deleting inventory item:", error);
        toast({ title: "Error al Eliminar", description: "No se pudo eliminar el artículo de Firestore.", variant: "destructive"});
    } finally {
        setIsLoadingData(false);
        setItemToDelete(null);
    }
  };
  
  const handleSaveCategory = async (data: CategoryFormValues) => {
    if (!isAdmin) return;
    try {
        await addCategoryFS(data);
        refreshDataSignature(); // This will now trigger the categories context to reload
        toast({ title: "Categoría Creada", description: `La categoría "${data.name}" ha sido creada.` });
        setIsCategoryDialogOpen(false);
    } catch (error: any) {
        toast({ title: "Error al Crear Categoría", description: error.message, variant: "destructive" });
    }
  };

  const filteredItems = items
    .filter(item =>
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    )
    .filter(item => categoryFilter === "Todos" || item.categoryId === categoryFilter);

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
            <h1 className="text-3xl font-headline font-semibold">Gestión de Inventario</h1>
        </div>
        <Button onClick={handleAddNewItem} disabled={isLoading}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Artículo
        </Button>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Catálogo de Inventario</CardTitle>
          <CardDescription>Administra todos los artículos inventariables, su stock disponible y los costes asociados a través de las compras.</CardDescription>
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
                <Button variant="outline" className="w-full sm:w-auto" disabled={isLoadingCategories}>
                  <Filter className="mr-2 h-4 w-4" />
                  Categoría: {categoryFilter === "Todos" ? "Todas" : (categoriesMap.get(categoryFilter) || '...') } <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuCheckboxItem key="Todos" onSelect={() => setCategoryFilter("Todos")} checked={categoryFilter === "Todos"}>Todas</DropdownMenuCheckboxItem>
                {inventoryCategories.map(cat => (
                   <DropdownMenuCheckboxItem key={cat.id} onSelect={() => setCategoryFilter(cat.id)} checked={categoryFilter === cat.id}>
                    {cat.name}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setIsCategoryDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Crear Nueva Categoría
                </DropdownMenuItem>
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
                  <TableHead className="w-[5%]"></TableHead>
                  <TableHead className="w-[25%]">Nombre del Artículo</TableHead>
                  <TableHead className="w-[15%]">SKU</TableHead>
                  <TableHead className="w-[15%]">Categoría</TableHead>
                  <TableHead className="text-right w-[10%]">Stock Disp.</TableHead>
                  <TableHead className="text-right w-[10%]">Coste Unit. (€)</TableHead>
                  <TableHead className="text-center w-[10%]">Última Compra</TableHead>
                  <TableHead className="text-right w-[10%]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length > 0 ? filteredItems.map((item) => {
                  const itemBatches = batchesByItemId[item.id] || [];
                  const isExpanded = expandedRows.has(item.id);

                  return (
                    <React.Fragment key={item.id}>
                    <TableRow onClick={() => itemBatches.length > 0 && toggleRowExpansion(item.id)} className={cn(itemBatches.length > 0 && "cursor-pointer")}>
                        <TableCell>
                          {itemBatches.length > 0 && (
                            <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.sku || 'N/A'}</TableCell>
                        <TableCell>{categoriesMap.get(item.categoryId) || 'N/D'}</TableCell>
                        <TableCell className="text-right font-bold"><FormattedNumericValue value={item.stock} /></TableCell>
                        <TableCell className="text-right">
                          {item.latestPurchase && item.latestPurchase.calculatedUnitCost !== undefined ? (
                            <FormattedNumericValue value={item.latestPurchase.calculatedUnitCost} locale="es-ES" options={{ style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 4 }} />
                          ) : <span className="text-muted-foreground">N/D</span> }
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {item.latestPurchase?.purchaseDate ? (<div className="flex items-center justify-center"><CalendarDays size={14} className="mr-1 text-muted-foreground" />{format(parseISO(item.latestPurchase.purchaseDate), "dd/MM/yy", { locale: es })}</div>) : <span className="text-muted-foreground">Sin registrar</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Abrir menú</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleEditItem(item)}><Edit className="mr-2 h-4 w-4" /> Editar Artículo</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => { e.preventDefault(); handleDeleteItem(item); }}><Trash2 className="mr-2 h-4 w-4" /> Eliminar Artículo</DropdownMenuItem></AlertDialogTrigger>
                                {itemToDelete && itemToDelete.id === item.id && (
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Esto eliminará permanentemente el artículo: <br /><strong className="mt-2 block">"{itemToDelete.name}"</strong></AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteItem} variant="destructive">Sí, eliminar</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                )}
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                    </TableRow>
                     {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={8} className="p-0 bg-muted/30">
                          <div className="p-4">
                            <h4 className="font-semibold text-sm mb-2">Desglose de Lotes para: {item.name}</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Lote Interno</TableHead><TableHead>Lote Proveedor</TableHead><TableHead className="text-right">Cant. Restante</TableHead><TableHead className="text-right">Coste Unitario</TableHead><TableHead>Fecha Caducidad</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {itemBatches.map(batch => (
                                  <TableRow key={batch.id}>
                                    <TableCell className="font-mono text-xs">{batch.internalBatchCode}</TableCell>
                                    <TableCell className="font-mono text-xs">{batch.supplierBatchCode || 'N/A'}</TableCell>
                                    <TableCell className="text-right"><FormattedNumericValue value={batch.qtyRemaining} /></TableCell>
                                    <TableCell className="text-right"><FormattedNumericValue value={batch.unitCost} options={{style: 'currency', currency: 'EUR'}} /></TableCell>
                                    <TableCell>{batch.expiryDate ? format(parseISO(batch.expiryDate), 'dd/MM/yyyy', { locale: es }) : 'N/D'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    </React.Fragment>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">No se encontraron artículos que coincidan con tu búsqueda o filtros. Puedes añadir nuevos artículos.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
        {!isLoading && filteredItems.length > 0 && (
            <CardFooter><p className="text-xs text-muted-foreground">Total de artículos mostrados: {filteredItems.length} de {items.length}</p></CardFooter>
        )}
      </Card>

      {isAdmin && (
        <InventoryItemDialog item={editingItem} isOpen={isItemDialogOpen} onOpenChange={setIsItemDialogOpen} onSave={handleSaveItem} />
      )}
      
      <CategoryDialog isOpen={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen} onSave={handleSaveCategory} categoryKind="inventory" />
    </div>
  );
}
