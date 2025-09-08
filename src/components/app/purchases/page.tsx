
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Expense, Category } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Loader2, MoreHorizontal, FileText, Trash2 } from "lucide-react";
import { ExpenseDialog } from "@/components/app/expense-dialog";
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getPurchasesFS, deleteExpenseFS, deleteExpensesBatchFS } from "@/services/purchase-service";
import { useCategories } from "@/contexts/categories-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

export default function PurchasesPage() {
  const { toast } = useToast();
  const { userRole, dataSignature, refreshDataSignature } = useAuth();
  const { categoriesMap, isLoading: isLoadingCategories } = useCategories();
  
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = React.useState<Expense | null>(null);
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set());

  const isAdmin = userRole === 'Admin';
  
  const loadExpenses = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedExpenses = await getPurchasesFS();
      setExpenses(fetchedExpenses);
    } catch (error) {
      console.error("Failed to load expenses:", error);
      toast({ title: "Error", description: "No se pudieron cargar los gastos y compras.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  React.useEffect(() => {
    loadExpenses();
  }, [loadExpenses, dataSignature]);
  
  const filteredExpenses = React.useMemo(() => {
    return expenses.filter(expense => 
      (expense.concepto.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (expense.proveedorNombre && expense.proveedorNombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (expense.invoiceNumber && expense.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [expenses, searchTerm]);

  const handleOpenDialog = (expense?: Expense) => {
    setEditingExpense(expense || null);
    setIsDialogOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteExpenseFS(expenseToDelete.id);
      toast({ title: "Registro Eliminado", variant: "destructive"});
      refreshDataSignature();
    } catch (error: any) {
      toast({ title: "Error al Eliminar", description: error.message, variant: "destructive"});
    } finally {
      setExpenseToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    try {
        await deleteExpensesBatchFS(Array.from(selectedRows));
        toast({ title: `${selectedRows.size} registro(s) eliminado(s)`, variant: "destructive"});
        setSelectedRows(new Set());
        refreshDataSignature();
    } catch (error: any) {
        toast({ title: "Error en borrado masivo", description: error.message, variant: "destructive"});
    }
  };

  const handleSelectRow = (id: string) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedRows(newSelection);
  };
  
  const handleSelectAll = () => {
    if (selectedRows.size === filteredExpenses.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredExpenses.map(e => e.id)));
    }
  };


  if (!isAdmin) {
    return (
      <Card>
        <CardHeader><CardTitle>Acceso Denegado</CardTitle></CardHeader>
        <CardContent><p>No tienes permiso para ver esta sección.</p></CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-headline font-semibold">Gestión de Gastos y Compras</h1>
            </div>
            <Button onClick={() => handleOpenDialog()} disabled={isLoading || isLoadingCategories}>
                <PlusCircle className="mr-2 h-4 w-4" /> Registrar Gasto/Compra
            </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Gastos y Compras</CardTitle>
            <CardDescription>Visualiza y gestiona todos los registros de gastos generales y compras de inventario a proveedores.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                <Input
                    placeholder="Buscar por concepto, proveedor o nº factura..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
                {selectedRows.size > 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar ({selectedRows.size})
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar eliminación masiva?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción eliminará permanentemente {selectedRows.size} registros. No se puede deshacer.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleBulkDelete} variant="destructive">Sí, eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
             </div>
             {isLoading ? (
                <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
             ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10"><Checkbox onCheckedChange={handleSelectAll} checked={selectedRows.size === filteredExpenses.length && filteredExpenses.length > 0} /></TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Concepto</TableHead>
                            <TableHead>Proveedor</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead className="text-right">Importe</TableHead>
                            <TableHead>Estado Doc.</TableHead>
                            <TableHead>Estado Pago</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredExpenses.length > 0 ? filteredExpenses.map(expense => (
                            <TableRow key={expense.id} data-state={selectedRows.has(expense.id) ? 'selected' : ''}>
                                <TableCell><Checkbox onCheckedChange={() => handleSelectRow(expense.id)} checked={selectedRows.has(expense.id)} /></TableCell>
                                <TableCell>{format(parseISO(expense.fechaCreacion), 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="font-medium">{expense.concepto}</TableCell>
                                <TableCell>{expense.proveedorNombre || 'N/D'}</TableCell>
                                <TableCell>{categoriesMap.get(expense.categoriaId) || 'N/D'}</TableCell>
                                <TableCell className="text-right"><FormattedNumericValue value={expense.monto} options={{style:'currency', currency: 'EUR'}} /></TableCell>
                                <TableCell><StatusBadge type="document" status={expense.estadoDocumento} /></TableCell>
                                <TableCell><StatusBadge type="payment" status={expense.estadoPago} /></TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onSelect={() => handleOpenDialog(expense)}>Editar</DropdownMenuItem>
                                            <DropdownMenuSeparator/>
                                            <DropdownMenuItem className="text-destructive" onSelect={() => setExpenseToDelete(expense)}>Eliminar</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={9} className="text-center h-24">No hay registros.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
             )}
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">{filteredExpenses.length} registro(s) mostrado(s).</p>
          </CardFooter>
        </Card>
      </div>

      <ExpenseDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} expense={editingExpense}/>

      <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Se eliminará el registro: "{expenseToDelete?.concepto}".</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} variant="destructive">Sí, eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
