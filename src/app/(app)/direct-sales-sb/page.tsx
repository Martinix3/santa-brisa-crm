
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { DirectSale, Account, AccountType, Order } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Filter, ChevronDown, Briefcase, Loader2, DollarSign, Package } from "lucide-react";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { getDirectSalesFS, deleteDirectSaleFS, regularizeConsignmentDirectSaleFS, updateDirectSaleFS } from "@/services/venta-directa-sb-service"; 
import { getAccountsFS } from "@/services/account-service";
import Link from 'next/link';
import DirectSaleDialog from "@/components/app/direct-sale-dialog";
import RegularizationDialog from "@/components/app/regularization-dialog";
import { DirectSaleTableRow } from "@/components/app/direct-sale-table-row";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import DeliveryNoteDialog from "@/components/app/delivery-note-dialog";
import InvoiceDialog from "@/components/app/invoice-dialog";
import { EstadoVentaDirecta as DirectSaleStatus, RolUsuario as UserRole, EstadoPago as PaidStatus, TipoPedido as OrderType } from "@ssot";

const directSaleStatusList: DirectSaleStatus[] = ['borrador', 'confirmado', 'enviado', 'entregado', 'facturado', 'pagado', 'cancelado', 'en depósito'];
const paidStatusList: PaidStatus[] = ['Pendiente', 'Pagado', 'Parcial'];

interface EnrichedDirectSale extends DirectSale {
    regularizations: DirectSale[];
}

const RELEVANT_ACCOUNT_TYPES: AccountType[] = [
    'Distribuidor', 
    'Importador', 
    'Gran Superficie',
    'distribuidor_mediano',
    'distribuidor_grande',
    'distribuidor_top',
    'HORECA',
    'Retail Minorista',
    'Otro'
];


export default function DirectSalesSbPage() {
  const { toast } = useToast();
  const { userRole, dataSignature, refreshDataSignature } = useAuth();
  const [sales, setSales] = React.useState<EnrichedDirectSale[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingSale, setEditingSale] = React.useState<DirectSale | null>(null);
  const [isSaleDialogOpen, setIsSaleDialogOpen] = React.useState(false);
  const [regularizingSale, setRegularizingSale] = React.useState<DirectSale | null>(null);
  const [saleToDelete, setSaleToDelete] = React.useState<DirectSale | null>(null);

  const [saleForDeliveryNote, setSaleForDeliveryNote] = React.useState<DirectSale | null>(null);
  const [saleForInvoice, setSaleForInvoice] = React.useState<DirectSale | null>(null);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<DirectSaleStatus | "Todos">("Todos");
  const [paidStatusFilter, setPaidStatusFilter] = React.useState<PaidStatus | "Todos">("Todos");

  const isAdminOrSalesRep = userRole === 'Admin' || userRole === 'SalesRep';

  React.useEffect(() => {
    async function loadInitialData() {
        setIsLoading(true);
        try {
            const [fetchedSales, allAccounts] = await Promise.all([
                getDirectSalesFS(),
                getAccountsFS(),
            ]);
            
            const relevantAccounts = allAccounts.filter(acc => RELEVANT_ACCOUNT_TYPES.includes(acc.type));
            
            const regularizationsMap = new Map<string, DirectSale[]>();
            fetchedSales.forEach(sale => {
                if (sale.originalConsignmentId) {
                    if (!regularizationsMap.has(sale.originalConsignmentId)) {
                        regularizationsMap.set(sale.originalConsignmentId, []);
                    }
                    regularizationsMap.get(sale.originalConsignmentId)!.push(sale);
                }
            });

            const enrichedSales = fetchedSales
                .filter(sale => !sale.originalConsignmentId) // Filter out children, only show parents
                .map(sale => ({
                    ...sale,
                    regularizations: regularizationsMap.get(sale.id) || []
                }));

            setSales(enrichedSales);
            setAccounts(relevantAccounts);
        } catch (error) {
            console.error("Failed to load direct sales:", error);
            toast({ title: "Error", description: "No se pudieron cargar los pedidos.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
    if (isAdminOrSalesRep) {
        loadInitialData();
    } else {
        setIsLoading(false);
    }
  }, [toast, isAdminOrSalesRep, dataSignature]);
  
  const kpiData = React.useMemo(() => {
      const allSalesForKpi = sales.flatMap(s => [s, ...s.regularizations]);
      const pendingPayment = allSalesForKpi
        .filter(s => s.status === 'facturado' && s.paidStatus === 'Pendiente')
        .reduce((sum, s) => sum + s.totalAmount, 0);

      const inConsignment = sales
        .filter(s => s.status === 'en depósito')
        .reduce((sum, s) => {
            const item = s.items[0];
            if(!item) return sum;
            const remainingQty = s.qtyRemainingInConsignment?.[item.productId] ?? item.quantity;
            return sum + (remainingQty * item.netUnitPrice);
        }, 0);

      return { pendingPayment, inConsignment };
  }, [sales]);
  
  const accountsMap = React.useMemo(() => new Map(accounts.map(acc => [acc.id, acc])), [accounts]);

  const handleViewOrEditClick = (sale: DirectSale) => {
    if (!isAdminOrSalesRep) return;
    setEditingSale(sale);
    setIsSaleDialogOpen(true);
  };
  
  const handleRegularizeClick = (sale: DirectSale) => {
    if (!isAdminOrSalesRep) return;
    setRegularizingSale(sale);
  };

  const handleConfirmRegularization = async (originalSaleId: string, unitsToInvoice: number) => {
      if (!isAdminOrSalesRep) return;
      setIsLoading(true);
      try {
          await regularizeConsignmentDirectSaleFS(originalSaleId, unitsToInvoice);
          toast({ title: "¡Depósito Regularizado!", description: "Se ha creado una nueva factura y actualizado el stock en depósito."});
          refreshDataSignature();
      } catch (error: any) {
          toast({ title: "Error al Regularizar", description: `No se pudo completar la operación: ${error.message}`, variant: "destructive"});
      } finally {
          setIsLoading(false);
          setRegularizingSale(null);
      }
  };

  const handleChangeStatus = async (saleId: string, newStatus: DirectSaleStatus) => {
      try {
          await updateDirectSaleFS(saleId, { status: newStatus });
          toast({ title: "Estado Actualizado", description: `El estado del pedido ahora es ${newStatus}.` });
          refreshDataSignature();
      } catch (error: any) {
          toast({ title: "Error al Actualizar", description: error.message, variant: "destructive" });
      }
  };

  const handleChangePaidStatus = async (saleId: string, newStatus: PaidStatus) => {
      try {
          await updateDirectSaleFS(saleId, { paidStatus: newStatus });
          toast({ title: "Estado de Pago Actualizado", description: `El estado del pago ahora es ${newStatus}.` });
          refreshDataSignature();
      } catch (error: any) {
          toast({ title: "Error al Actualizar", description: error.message, variant: "destructive" });
      }
  };

  const handleDeleteSale = async (sale: DirectSale) => {
      if (!isAdminOrSalesRep) return;
      setSaleToDelete(sale);
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;
    try {
        await deleteDirectSaleFS(saleToDelete.id);
        toast({ title: "¡Pedido Eliminado!", description: `El pedido ${saleToDelete.id} ha sido eliminado.`, variant: "destructive" });
        refreshDataSignature();
    } catch (error: any) {
        toast({ title: "Error al Eliminar", description: error.message, variant: "destructive"});
    } finally {
        setSaleToDelete(null);
    }
  };


  const filteredSales = sales
    .filter(sale =>
      ((sale.customerName && sale.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
       (sale.id && sale.id.toLowerCase().includes(searchTerm.toLowerCase())))
    )
    .filter(sale => statusFilter === "Todos" || sale.status === statusFilter)
    .filter(sale => paidStatusFilter === "Todos" || sale.paidStatus === paidStatusFilter);

  if (!isAdminOrSalesRep) {
    return (
      <Card className="shadow-subtle">
        <CardHeader><CardTitle className="flex items-center">Acceso Denegado</CardTitle></CardHeader>
        <CardContent><p>No tienes permisos para acceder a esta sección.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
            <Briefcase className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Facturación y Ventas Propias</h1>
        </div>
        <Button asChild disabled={isLoading}>
          <Link href="/direct-sales-sb/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Registrar Nueva Venta
          </Link>
        </Button>
      </header>

       <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Facturado (Pendiente de Cobro)</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        <FormattedNumericValue value={kpiData.pendingPayment} options={{ style: 'currency', currency: 'EUR' }} />
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Valor en Depósito</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                         <FormattedNumericValue value={kpiData.inConsignment} options={{ style: 'currency', currency: 'EUR' }} />
                    </div>
                </CardContent>
            </Card>
       </div>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Listado de Ventas Propias</CardTitle>
          <CardDescription>Administra las ventas facturadas directamente por Santa Brisa y los envíos en depósito.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Input
              placeholder="Buscar por cliente o ID de pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex items-center gap-2 flex-wrap">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" className="h-9"><Filter className="mr-2 h-4 w-4" />Estado Log.: {statusFilter} <ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuCheckboxItem checked={statusFilter === 'Todos'} onCheckedChange={() => setStatusFilter('Todos')}>Todos</DropdownMenuCheckboxItem>
                        {directSaleStatusList.map(s => <DropdownMenuCheckboxItem key={s} checked={statusFilter === s} onCheckedChange={() => setStatusFilter(s)}>{s}</DropdownMenuCheckboxItem>)}
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" className="h-9"><Filter className="mr-2 h-4 w-4" />Estado Pago: {paidStatusFilter} <ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuCheckboxItem checked={paidStatusFilter === 'Todos'} onCheckedChange={() => setPaidStatusFilter('Todos')}>Todos</DropdownMenuCheckboxItem>
                        {paidStatusList.map(s => <DropdownMenuCheckboxItem key={s} checked={paidStatusFilter === s} onCheckedChange={() => setPaidStatusFilter(s)}>{s}</DropdownMenuCheckboxItem>)}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>
          {isLoading ? (
             <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando pedidos...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[1%]"></TableHead>
                    <TableHead className="table-header-std w-[10%]">ID Pedido</TableHead>
                    <TableHead className="table-header-std w-[15%]">Cliente</TableHead>
                    <TableHead className="table-header-std w-[10%]">Fecha</TableHead>
                    <TableHead className="table-header-std w-[15%]">Estado Logístico</TableHead>
                    <TableHead className="table-header-std w-[10%]">Estado Pago</TableHead>
                    <TableHead className="table-header-std text-right w-[15%]">Importe Total</TableHead>
                    <TableHead className="table-header-std text-right w-[20%]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.length > 0 ? filteredSales.map((sale) => (
                    <DirectSaleTableRow
                        key={sale.id}
                        sale={sale}
                        onViewOrEditClick={handleViewOrEditClick}
                        onRegularizeClick={handleRegularizeClick}
                        onDeleteSale={handleDeleteSale}
                        onChangeStatus={handleChangeStatus}
                        onChangePaidStatus={handleChangePaidStatus}
                        onPrintDeliveryNote={() => setSaleForDeliveryNote(sale)}
                        onPrintInvoice={() => setSaleForInvoice(sale)}
                    />
                  )) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-24">
                        No se encontraron pedidos que coincidan con los filtros.
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
                <p className="text-xs text-muted-foreground">Total de pedidos mostrados: {filteredSales.length}</p>
            </CardFooter>
        )}
      </Card>
      
      {isAdminOrSalesRep && (
        <DirectSaleDialog
            sale={editingSale}
            isOpen={isSaleDialogOpen}
            onOpenChange={setIsSaleDialogOpen}
            onSave={async (data, saleId) => {
                await updateDirectSaleFS(saleId, data);
                refreshDataSignature();
                setIsSaleDialogOpen(false);
            }} 
            isReadOnly={!isAdminOrSalesRep}
        />
      )}

      {regularizingSale && (
        <RegularizationDialog
            isOpen={!!regularizingSale}
            onOpenChange={() => setRegularizingSale(null)}
            onConfirm={handleConfirmRegularization}
            sale={regularizingSale}
        />
      )}
      <AlertDialog open={!!saleToDelete} onOpenChange={(open) => !open && setSaleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el pedido a: <br />
              <strong className="mt-2 block">{saleToDelete?.customerName}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSaleToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSale} variant="destructive">Sí, eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeliveryNoteDialog
        sale={saleForDeliveryNote}
        account={saleForDeliveryNote ? accountsMap.get(saleForDeliveryNote.customerId) ?? null : null}
        isOpen={!!saleForDeliveryNote}
        onOpenChange={(open) => !open && setSaleForDeliveryNote(null)}
      />
      
      <InvoiceDialog
        sale={saleForInvoice}
        account={saleForInvoice ? accountsMap.get(saleForInvoice.customerId) ?? null : null}
        isOpen={!!saleForInvoice}
        onOpenChange={(open) => !open && setSaleForInvoice(null)}
      />

    </div>
  );
}
