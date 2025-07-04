
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { BomLine, InventoryItem } from "@/types";
import { PlusCircle, Edit, Trash2, MoreHorizontal, Wrench, Loader2 } from "lucide-react";
import BomDialog from "@/components/app/bom-dialog";
import type { BomLineFormValues } from "@/components/app/bom-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { getBomLinesFS, addBomLineFS, updateBomLineFS, deleteBomLineFS } from "@/services/bom-service";
import { getInventoryItemsFS } from "@/services/inventory-item-service";
import { useCategories } from "@/contexts/categories-context";

export default function BomManagementPage() {
  const { toast } = useToast();
  const { categoriesMap } = useCategories();

  const [bomLines, setBomLines] = React.useState<BomLine[]>([]);
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [editingLine, setEditingLine] = React.useState<BomLine | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [lineToDelete, setLineToDelete] = React.useState<BomLine | null>(null);

  React.useEffect(() => {
    async function loadData() {
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
    }
    loadData();
  }, [toast]);

  const handleAddNewLine = () => {
    setEditingLine(null);
    setIsDialogOpen(true);
  };

  const handleEditLine = (line: BomLine) => {
    setEditingLine(line);
    setIsDialogOpen(true);
  };
  
  const handleSaveLine = async (data: BomLineFormValues, lineId?: string) => {
    setIsLoading(true);
    try {
      if (lineId) {
        await updateBomLineFS(lineId, data);
        toast({ title: "Línea Actualizada" });
      } else {
        await addBomLineFS(data);
        toast({ title: "Línea Añadida" });
      }
      const updatedLines = await getBomLinesFS();
      setBomLines(updatedLines);
    } catch (error) {
      console.error("Error saving BOM line:", error);
      toast({ title: "Error al Guardar", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
    }
  };

  const handleDeleteLine = (line: BomLine) => {
    setLineToDelete(line);
  };

  const confirmDeleteLine = async () => {
    if (!lineToDelete) return;
    setIsLoading(true);
    try {
      await deleteBomLineFS(lineToDelete.id);
      setBomLines(prev => prev.filter(l => l.id !== lineToDelete.id));
      toast({ title: "Línea Eliminada", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting BOM line:", error);
      toast({ title: "Error al Eliminar", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setLineToDelete(null);
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
        <Button onClick={handleAddNewLine} disabled={isLoading}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Línea a Receta
        </Button>
      </header>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : groupedBoms.length > 0 ? (
        groupedBoms.map(([productSku, lines]) => (
          <Card key={productSku} className="shadow-subtle">
            <CardHeader>
              <CardTitle>Receta para: {getItemName(productSku)}</CardTitle>
              <CardDescription>SKU: {productSku}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Componente</TableHead>
                    <TableHead>SKU Componente</TableHead>
                    <TableHead>Cantidad Requerida</TableHead>
                    <TableHead>UoM</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map(line => (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">{getItemName(line.componentSku)}</TableCell>
                      <TableCell>{line.componentSku}</TableCell>
                      <TableCell><FormattedNumericValue value={line.quantity} /></TableCell>
                      <TableCell>{line.uom}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => handleEditLine(line)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => handleDeleteLine(line)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="text-center p-8"><p>No hay recetas definidas.</p></Card>
      )}

      <BomDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveLine}
        bomLine={editingLine}
        inventoryItems={inventoryItems}
      />

      {lineToDelete && (
        <AlertDialog open={!!lineToDelete} onOpenChange={() => setLineToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción es irreversible y eliminará la línea de componente de la receta.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteLine} variant="destructive">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
