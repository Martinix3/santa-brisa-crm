
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { VentaDirectaSB, EstadoVentaDirectaSB, UserRole, Account } from "@/types";
import { estadoVentaDirectaList } from "@/lib/data";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, MoreHorizontal, Filter, ChevronDown, Eye, Edit, Trash2, Receipt, Loader2 } from "lucide-react";
// import VentaDirectaDialog, { type VentaDirectaFormValues } from "@/components/app/venta-directa-dialog"; // Futuro
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import StatusBadge from "@/components/app/status-badge"; // Asumimos que se adaptará o creará uno para VentaDirectaSB
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import Link from "next/link";
import { getVentasDirectasSB_FS, deleteVentaDirectaSB_FS } from "@/services/venta-directa-sb-service";
import { getAccountsFS } from "@/services/account-service"; // Para obtener nombres de clientes

export default function DirectSalesSBPage() {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [ventas, setVentas] = React.useState<VentaDirectaSB[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  // const [editingVenta, setEditingVenta] = React.useState<VentaDirectaSB | null>(null); // Futuro
  // const [isVentaDialogOpen, setIsVentaDialogOpen] = React.useState(false); // Futuro
  const [ventaToDelete, setVentaToDelete] = React.useState<VentaDirectaSB | null>(null);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<EstadoVentaDirectaSB | "Todos">("Todos");

  const isAdmin = userRole === 'Admin';

  React.useEffect(() => {
    async function loadInitialData() {
        setIsLoading(true);
        try {
            const [fetchedVentas, fetchedAccounts] = await Promise.all([
                getVentasDirectasSB_FS(),
                getAccountsFS() // Para mapear clienteId a nombre si es necesario
            ]);
            setVentas(fetchedVentas);
            setAccounts(fetchedAccounts);
        } catch (error) {
            console.error("Failed to load direct sales or accounts:", error);
            toast({ title: "Error", description: "No se pudieron cargar las ventas directas o cuentas.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
    if (isAdmin) {
        loadInitialData();
    } else {
        setIsLoading(false); // No cargar si no es admin
    }
  }, [toast, isAdmin]);

  const getClientNameById = (clientId: string): string => {
    const account = accounts.find(acc => acc.id === clientId);
    return account?.name || clientId; // Devuelve ID si no se encuentra nombre
  };

  const handleAddNewVenta = () => {
    if (!isAdmin) return;
    // setEditingVenta(null); // Futuro
    // setIsVentaDialogOpen(true); // Futuro
    toast({ title: "Próximamente", description: "El formulario para añadir ventas directas estará disponible pronto."});
  };

  const handleEditVenta = (venta: VentaDirectaSB) => {
    if (!isAdmin) return;
    // setEditingVenta(venta); // Futuro
    // setIsVentaDialogOpen(true); // Futuro
    toast({ title: "Próximamente", description: `La edición de la venta ${venta.id} estará disponible pronto.`});
  };
  
  // const handleSaveVenta = async (data: VentaDirectaFormValues, ventaId?: string) => { // Futuro
  //   // Lógica de guardado
  // };

  const handleDeleteVenta = (venta: VentaDirectaSB) => {
    if (!isAdmin) return;
    setVentaToDelete(venta);
  };

  const confirmDeleteVenta = async () => {
    if (!isAdmin || !ventaToDelete) return;
    setIsLoading(true);
    try {
      await deleteVentaDirectaSB_FS(ventaToDelete.id);
      setVentas(prev => prev.filter(v => v.id !== ventaToDelete.id));
      toast({ title: "¡Venta Eliminada!", description: `La venta directa "${ventaToDelete.id}" ha sido eliminada.`, variant: "destructive" });
    } catch (error) {
        console.error("Error deleting direct sale:", error);
        toast({ title: "Error al Eliminar", description: "No se pudo eliminar la venta directa de Firestore.", variant: "destructive"});
    } finally {
        setIsLoading(false);
        setVentaToDelete(null);
    }
  };

  const uniqueStatusesForFilter = ["Todos", ...estadoVentaDirectaList] as (EstadoVentaDirectaSB | "Todos")[];

  const filteredVentas = ventas
    .filter(venta =>
      (venta.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (venta.numeroFacturaSB && venta.numeroFacturaSB.toLowerCase().includes(searchTerm.toLowerCase())) ||
       getClientNameById(venta.clienteId).toLowerCase().includes(searchTerm.toLowerCase()) ||
       venta.canalVentaDirectaSB.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
    .filter(venta => statusFilter === "Todos" || venta.estadoVentaDirectaSB === statusFilter);

  if (!isAdmin) {
    return (
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle className="flex items-center">Acceso Denegado</CardTitle>
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
            <Receipt className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Gestión de Ventas Directas Santa Brisa</h1>
        </div>
        <Button onClick={handleAddNewVenta} disabled={isLoading}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nueva Venta Directa
        </Button>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Listado de Ventas Directas</CardTitle>
          <CardDescription>Administra las ventas directas facturadas por Santa Brisa a importadores, clientes online o estratégicos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Input
              placeholder="Buscar (ID, Factura, Cliente, Canal)..."
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
                {uniqueStatusesForFilter.map(status => (
                   <DropdownMenuItem key={status} onSelect={() => setStatusFilter(status as EstadoVentaDirectaSB | "Todos")}>
                    {status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {isLoading ? (
             <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando ventas directas...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%]">ID Venta / Factura SB</TableHead>
                    <TableHead className="w-[15%]">Fecha Emisión</TableHead>
                    <TableHead className="w-[20%]">Cliente</TableHead>
                    <TableHead className="w-[15%]">Canal Venta</TableHead>
                    <TableHead className="text-right w-[10%]">Total</TableHead>
                    <TableHead className="text-center w-[10%]">Estado</TableHead>
                    <TableHead className="text-right w-[15%]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVentas.length > 0 ? filteredVentas.map((venta) => (
                    <TableRow key={venta.id}>
                      <TableCell className="font-medium">
                        {venta.id}
                        {venta.numeroFacturaSB && <span className="block text-xs text-muted-foreground">Factura: {venta.numeroFacturaSB}</span>}
                      </TableCell>
                      <TableCell>{format(parseISO(venta.fechaEmision), "dd/MM/yy", { locale: es })}</TableCell>
                      <TableCell>{getClientNameById(venta.clienteId)}</TableCell>
                      <TableCell>{venta.canalVentaDirectaSB}</TableCell>
                      <TableCell className="text-right">
                        <FormattedNumericValue value={venta.totalFacturaSB} options={{ style: 'currency', currency: 'EUR' }} />
                      </TableCell>
                      <TableCell className="text-center">
                        {/* Adaptar StatusBadge o crear uno nuevo para VentaDirectaSBStatus */}
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">{venta.estadoVentaDirectaSB}</span>
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
                            <DropdownMenuItem onSelect={() => handleEditVenta(venta)}>
                              <Eye className="mr-2 h-4 w-4" /> Ver Detalles / Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                  onSelect={(e) => { e.preventDefault(); handleDeleteVenta(venta); }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar Venta
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              {ventaToDelete && ventaToDelete.id === venta.id && (
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          Esta acción no se puede deshacer. Esto eliminará permanentemente la venta directa:
                                          <br />
                                          <strong className="mt-2 block">{ventaToDelete.id} - {getClientNameById(ventaToDelete.clienteId)}</strong>
                                      </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                      <AlertDialogCancel onClick={() => setVentaToDelete(null)}>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={confirmDeleteVenta} variant="destructive">Sí, eliminar</AlertDialogAction>
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
                        No se encontraron ventas directas que coincidan con tu búsqueda o filtros.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {!isLoading && filteredVentas.length > 0 && (
            <CardFooter>
                <p className="text-xs text-muted-foreground">Total de ventas directas mostradas: {filteredVentas.length} de {ventas.length}</p>
            </CardFooter>
        )}
      </Card>

      {/* Futuro: Diálogo para añadir/editar ventas directas */}
      {/* <VentaDirectaDialog
        venta={editingVenta}
        isOpen={isVentaDialogOpen}
        onOpenChange={setIsVentaDialogOpen}
        onSave={handleSaveVenta}
        allAccounts={accounts} // Pasar accounts para el selector de cliente
      /> */}
    </div>
  );
}
