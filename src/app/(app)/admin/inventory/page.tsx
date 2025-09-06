

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { InventoryItem, ItemBatch, QcStatus } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Loader2, Archive, AlertCircle } from "lucide-react";
import InventoryItemDialog from "@/components/app/inventory-item-dialog";
import type { InventoryItemFormValues } from "@/components/app/inventory-item-dialog";
import CategoryDialog from "@/components/app/category-dialog";
import type { CategoryFormValues } from "@/components/app/category-dialog";
import { getInventoryItemsFS, addInventoryItemFS, updateInventoryItemFS, deleteInventoryItemFS } from "@/services/inventory-item-service";
import { addCategoryFS } from "@/services/category-service";
import { getAllBatchesFS, updateBatchFS } from "@/services/batch-service";
import { InventoryFilters, type StockFilter, type ExpiryFilter } from "@/components/app/inventory/inventory-filters";
import { InventoryTable } from "@/components/app/inventory/inventory-table";
import BatchDialog from "@/components/app/inventory/batch-dialog";
import type { BatchFormValues } from "@/components/app/inventory/batch-dialog";

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}


export default function InventoryPage() {
  const { toast } = useToast();
  const { userRole, dataSignature, refreshDataSignature } = useAuth();
  
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [batches, setBatches] = React.useState<ItemBatch[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  
  const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(null);
  const [editingBatch, setEditingBatch] = React.useState<ItemBatch | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = React.useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = React.useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);

  const [searchTerm, setSearchTerm] = React.useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [categoryFilter, setCategoryFilter] = React.useState<string | "Todos">("Todos");
  const [stockFilter, setStockFilter] = React.useState<StockFilter>('all');
  const [expiryFilter, setExpiryFilter] = React.useState<ExpiryFilter>('all');

  const isAdmin = userRole === 'Admin';

  const loadData = React.useCallback(async () => {
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
  }, [toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData, dataSignature]);

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

  const handleEditBatch = (batch: ItemBatch) => {
    if (!isAdmin) return;
    setEditingBatch(batch);
    setIsBatchDialogOpen(true);
  };

  const handleQuickUpdateBatchStatus = async (batchId: string, newStatus: QcStatus) => {
    if (!isAdmin) return;
    setIsLoadingData(true);
    try {
        await updateBatchFS(batchId, { qcStatus: newStatus });
        toast({ title: "Estado del Lote Actualizado" });
        await loadData(); // Full refresh to ensure consistency
    } catch(error: any) {
        toast({ title: "Error al Actualizar Lote", description: error.message, variant: "destructive" });
    } finally {
        setIsLoadingData(false);
    }
  };

  const handleSaveItem = async (data: InventoryItemFormValues, itemId?: string) => {
    if (!isAdmin) return;
    setIsLoadingData(true);
    try {
      if (itemId) {
        await updateInventoryItemFS(itemId, data);
        toast({ title: "¡Artículo Actualizado!" });
      } else {
        await addInventoryItemFS(data);
        toast({ title: "¡Artículo Añadido!" });
      }
      refreshDataSignature();
    } catch (error: any) {
      toast({ title: "Error al Guardar", description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingData(false);
      setIsItemDialogOpen(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!isAdmin) return;
    setIsLoadingData(true);
    try {
      await deleteInventoryItemFS(itemId);
      toast({ title: "¡Artículo Eliminado!", variant: "destructive" });
      refreshDataSignature();
    } catch (error: any) {
      toast({ title: "Error al Eliminar", description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSaveBatch = async (data: BatchFormValues, batchId: string) => {
    if (!isAdmin) return;
    setIsLoadingData(true);
    try {
      await updateBatchFS(batchId, data);
      toast({ title: "Lote Actualizado" });
      refreshDataSignature();
    } catch (error: any) {
      toast({ title: "Error al Guardar Lote", description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingData(false);
      setIsBatchDialogOpen(false);
    }
  };

  const handleSaveCategory = async (data: CategoryFormValues) => {
    if (!isAdmin) return;
    try {
      await addCategoryFS(data);
      refreshDataSignature();
      toast({ title: "Categoría Creada" });
      setIsCategoryDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error al Crear Categoría", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Archive className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-semibold">Gestión de Inventario por Lotes</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleAddNewItem} disabled={isLoadingData}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Artículo
          </Button>
        </div>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Catálogo de Inventario</CardTitle>
          <CardDescription>Administra todos los artículos inventariables y visualiza el desglose de su stock por lotes.</CardDescription>
        </CardHeader>
        <CardContent>
          <InventoryFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            stockFilter={stockFilter}
            setStockFilter={setStockFilter}
            expiryFilter={expiryFilter}
            setExpiryFilter={setExpiryFilter}
            onOpenCategoryDialog={() => setIsCategoryDialogOpen(true)}
          />
          {isLoadingData ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando inventario...</p>
            </div>
          ) : (
            <InventoryTable
              items={items}
              batches={batches}
              filters={{ debouncedSearchTerm, categoryFilter, stockFilter, expiryFilter }}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
              onEditBatch={handleEditBatch}
              onQuickUpdateBatchStatus={handleQuickUpdateBatchStatus}
            />
          )}
        </CardContent>
        {!isLoadingData && items.length > 0 && (
          <CardFooter>
            <p className="text-xs text-muted-foreground">Total de artículos en el sistema: {items.length}</p>
          </CardFooter>
        )}
      </Card>

      {isAdmin && (
        <>
          <InventoryItemDialog 
            item={editingItem} 
            itemBatches={editingItem ? batches.filter(b => b.inventoryItemId === editingItem.id) : []}
            isOpen={isItemDialogOpen} 
            onOpenChange={setIsItemDialogOpen} 
            onSave={handleSaveItem} 
           />
          <BatchDialog batch={editingBatch} isOpen={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen} onSave={handleSaveBatch} />
          <CategoryDialog isOpen={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen} onSave={handleSaveCategory} />
        </>
      )}
      
    </div>
  );
}
