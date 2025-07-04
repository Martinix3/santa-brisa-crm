
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { BomLine, InventoryItem } from "@/types";
import { PlusCircle, Edit, Wrench, Loader2, PackageOpen } from "lucide-react";
import BomDialog from "@/components/app/bom-dialog";
import type { BomRecipeFormValues } from "@/components/app/bom-dialog";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { getBomLinesFS, saveRecipeFS, deleteRecipeFS } from "@/services/bom-service";
import { getInventoryItemsFS, addInventoryItemFS } from "@/services/inventory-item-service";
import { useCategories } from "@/contexts/categories-context";
import { useAuth } from "@/contexts/auth-context";

export default function BomManagementPage() {
  const { toast } = useToast();
  const { categoriesMap } = useCategories();
  const { dataSignature } = useAuth();

  const [bomLines, setBomLines] = React.useState<BomLine[]>([]);
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [editingRecipe, setEditingRecipe] = React.useState<{ productSku: string; lines: BomLine[] } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const fetchBomData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [lines, items] = await Promise.all([getBomLinesFS(), getInventoryItemsFS()]);
      setBomLines(lines);
      setInventoryItems(items);
    } catch (error) {
      console.error("Error fetching BOM data:", error);
      toast({ title: "Error al Cargar Datos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchBomData();
  }, [fetchBomData, dataSignature]);

  const handleAddNewRecipe = () => {
    setEditingRecipe(null);
    setIsDialogOpen(true);
  };

  const handleEditRecipe = (productSku: string, lines: BomLine[]) => {
    setEditingRecipe({ productSku, lines });
    setIsDialogOpen(true);
  };
  
  const handleSaveRecipe = async (data: BomRecipeFormValues) => {
    setIsLoading(true);
    try {
      let finalProductSku = data.productSku;

      if (data.isNewProduct && data.newProductName && data.newProductSku) {
        let finishedGoodsCategoryId = '';
        for (const [id, name] of categoriesMap.entries()) {
          if (name === 'Producto Terminado') {
            finishedGoodsCategoryId = id;
            break;
          }
        }
        if (!finishedGoodsCategoryId) {
          throw new Error("No se encontró la categoría 'Producto Terminado'. Por favor, créala en la configuración de categorías.");
        }
        
        await addInventoryItemFS({
          name: data.newProductName,
          sku: data.newProductSku,
          categoryId: finishedGoodsCategoryId,
          stock: 0,
        });
        finalProductSku = data.newProductSku;
        toast({ title: "Producto Creado", description: `Se ha creado "${data.newProductName}" en el inventario.`});
      }

      if (!finalProductSku) {
        throw new Error("SKU del producto no definido. No se puede guardar la receta.");
      }
      
      const componentsToSave = data.components.map(c => {
        const material = inventoryItems.find(item => item.id === c.materialId);
        if (!material || !material.sku) {
            throw new Error(`Componente "${c.description}" no está asociado correctamente. Vuelve a buscarlo.`);
        }
        return {
            componentSku: material.sku,
            quantity: c.quantity,
            uom: c.uom,
        };
      });

      await saveRecipeFS(finalProductSku, componentsToSave);

      toast({ title: "Receta Guardada", description: "La receta ha sido guardada correctamente." });
      await fetchBomData(); // Refresh data from server
    } catch (error: any) {
      console.error("Error saving BOM recipe:", error);
      toast({ title: "Error al Guardar", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
    }
  };

  const groupedBoms = React.useMemo(() => {
    const groups = new Map<string, BomLine[]>();
    bomLines.forEach(line => {
      if (!groups.has(line.productSku)) {
        groups.set(line.productSku, []);
      }
      groups.get(line.productSku)!.push(line);
    });
    return Array.from(groups.entries());
  }, [bomLines]);

  const getItemName = (sku: string) => inventoryItems.find(item => item.sku === sku)?.name || sku;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
            <Wrench className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Gestión de Recetas (BOM)</h1>
        </div>
        <Button onClick={handleAddNewRecipe} disabled={isLoading}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nueva Receta
        </Button>
      </header>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : groupedBoms.length > 0 ? (
        groupedBoms.map(([productSku, lines]) => (
          <Card key={productSku} className="shadow-subtle">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{getItemName(productSku)}</CardTitle>
                <CardDescription>SKU: {productSku}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleEditRecipe(productSku, lines)}>
                  <Edit className="mr-2 h-4 w-4" /> Editar Receta
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Componente</TableHead>
                    <TableHead>SKU Componente</TableHead>
                    <TableHead>Cantidad Requerida</TableHead>
                    <TableHead>UoM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map(line => (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">{getItemName(line.componentSku)}</TableCell>
                      <TableCell>{line.componentSku}</TableCell>
                      <TableCell><FormattedNumericValue value={line.quantity} /></TableCell>
                      <TableCell>{line.uom}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="text-center p-8 flex flex-col items-center gap-4">
            <PackageOpen className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hay recetas definidas. Haz clic en "Añadir Nueva Receta" para empezar.</p>
        </Card>
      )}

      <BomDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveRecipe}
        onDelete={async (sku) => {
          await deleteRecipeFS(sku);
          await fetchBomData();
          setIsDialogOpen(false);
          toast({ title: "Receta Eliminada", variant: "destructive"});
        }}
        recipe={editingRecipe}
        inventoryItems={inventoryItems}
      />
    </div>
  );
}
