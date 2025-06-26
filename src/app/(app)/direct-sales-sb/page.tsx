
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { DirectSale, DirectSaleStatus, UserRole } from "@/types";
import { directSaleStatusList } from "@/lib/data";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, MoreHorizontal, Filter, ChevronDown, Edit, Trash2, Briefcase, Loader2 } from "lucide-react";
// import VentaDirectaDialog from "@/components/app/venta-directa-dialog"; // This component needs to be created
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { getDirectSalesFS, addDirectSaleFS, updateDirectSaleFS, deleteDirectSaleFS } from "@/services/venta-directa-sb-service"; 

// Placeholder for dialog component until it's created
const VentaDirectaDialog = ({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) => (
    <div style={{ display: isOpen ? 'block' : 'none', position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', padding: '2rem', background: 'white', border: '1px solid black', zIndex: 100 }}>
        <h2>Venta Directa Dialog (Placeholder)</h2>
        <button onClick={() => onOpenChange(false)}>Close</button>
    </div>
);


export default function DirectSalesSbPage() {
  const { toast } = useToast();
  const { userRole, refreshDataSignature } = useAuth();
  const [sales, setSales] = React.useState<DirectSale[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingSale, setEditingSale] = React.useState<DirectSale | null>(null);
  const [isSaleDialogOpen, setIsSaleDialogOpen] = React.useState(false);
  const [saleToDelete, setSaleToDelete] = React.useState<DirectSale | null>(null);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<DirectSaleStatus | "Todos">("Todos");

  const isAdmin = userRole === 'Admin';

  React.useEffect(() => {
    async function loadInitialData() {
        setIsLoading(true);
        try {
            const fetchedSales = await getDirectSalesFS();
            setSales(fetchedSales);
        } catch (error) {
            console.error("Failed to load direct sales:", error);
            toast({ title: "Error", description: "No se pudieron cargar las ventas directas.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
    if (isAdmin) {
        loadInitialData();
    } else {
        setIsLoading(false);
    }
  }, [toast, isAdmin, refreshDataSignature]);

  const handleAddNewSale = () => {
    if (!isAdmin) return;
    setEditingSale(null);
    toast({ title: "Función no implementada", description: "La creación de ventas directas aún no está disponible." });
    // setIsSaleDialogOpen(true);
  };
  
  const handleEditSale = (sale: DirectSale) => {
    if (!isAdmin) return;
    setEditingSale(sale);
    toast({ title: "Función no implementada", description: "La edición de ventas directas aún no está disponible." });
    // setIsSaleDialogOpen(true);
  };
  
  const handleDeleteSale = (sale: DirectSale) => {
    if (!isAdmin) return;
    setSaleToDelete(sale);
  };

  const confirmDeleteSale = async () => {
    if (!isAdmin || !saleToDelete) return;
    setIsLoading(true);
    try {
      await deleteDirectSaleFS(saleToDelete.id);
      setSales(prev => prev.filter(p => p.id !== saleToDelete.id));
      toast({ title: "¡Venta Eliminada!", description: `La venta directa a "${saleToDelete.customerName}" ha sido eliminada.`, variant: "destructive" });
    } catch (error) {
      console.error("Error deleting sale:", error);
      toast({ title: "Error al Eliminar", description: "No se pudo eliminar la venta directa.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setSaleToDelete(null);
    }
  };

  const filteredSales = sales
    .filter(sale =>
      (sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (sale.invoiceNumber && sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())))
    )
    .filter(sale => statusFilter === "Todos" || sale.status === statusFilter);

  if (!isAdmin) {
    return (
      <Card className="shadow-subtle">
        <CardHeader><CardTitle className="flex items-center">Acceso Denegado</CardTitle></CardHeader>
        <CardContent><p>No tienes permisos para acceder a esta sección.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
            <Briefcase className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Ventas Directas (Facturación SB)</h1>
        </div>
        <Button onClick={handleAddNewSale} disabled={isLoading}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nueva Venta Directa
        </Button>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Listado de Ventas Directas</CardTitle>
          <CardDescription>Administra las ventas facturadas directamente por Santa Brisa (a importadores, online, etc.).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Input
              placeholder="Buscar por cliente o N.º Factura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  Estado: {statusFilter} <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                 <DropdownMenuCheckboxItem onSelect={() => setStatusFilter("Todos")} checked={statusFilter === "Todos"}>Todos</DropdownMenuCheckboxItem>
                {directSaleStatusList.map(status => (
                   <DropdownMenuCheckboxItem key={status} onSelect={() => setStatusFilter(status)} checked={statusFilter === status}>
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {isLoading ? (
             <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando ventas...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[20%]">Cliente</TableHead>
                    <TableHead className="w-[15%]">Fecha Emisión</TableHead>
                    <TableHead className="w-[15%]">Nº Factura</TableHead>
                    <TableHead className="text-right w-[15%]">Importe Total</TableHead>
                    <TableHead className="text-center w-[15%]">Estado</TableHead>
                    <TableHead className="text-right w-[20%]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.length > 0 ? filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.customerName}</TableCell>
                      <TableCell>{format(parseISO(sale.issueDate), "dd/MM/yy", { locale: es })}</TableCell>
                      <TableCell>{sale.invoiceNumber || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <FormattedNumericValue value={sale.totalAmount} options={{ style: 'currency', currency: 'EUR' }} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge type="directSale" status={sale.status} />
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
                            <DropdownMenuItem onSelect={() => handleEditSale(sale)}>
                              <Edit className="mr-2 h-4 w-4" /> Editar / Ver Detalles
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                  onSelect={(e) => { e.preventDefault(); handleDeleteSale(sale); }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar Venta
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              {saleToDelete && saleToDelete.id === sale.id && (
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          Esta acción no se puede deshacer. Esto eliminará permanentemente la venta a:
                                          <br />
                                          <strong className="mt-2 block">{saleToDelete.customerName}</strong>
                                      </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                      <AlertDialogCancel onClick={() => setSaleToDelete(null)}>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={confirmDeleteSale} variant="destructive">Sí, eliminar</AlertDialogAction>
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
                      <TableCell colSpan={6} className="h-24 text-center">
                        No se encontraron ventas directas que coincidan con los filtros.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {!isLoading && filteredSales.length > 0 && (
            <CardFooter>
                <p className="text-xs text-muted-foreground">Total de ventas mostradas: {filteredSales.length} de {sales.length}</p>
            </CardFooter>
        )}
      </Card>

      <VentaDirectaDialog
          isOpen={isSaleDialogOpen}
          onOpenChange={(open) => {
              setIsSaleDialogOpen(open);
              if (!open) setEditingSale(null);
          }}
      />
    </div>
  );
}
