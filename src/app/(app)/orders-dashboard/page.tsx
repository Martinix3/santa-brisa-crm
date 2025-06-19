
"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox"; 
import type { Order, OrderStatus, UserRole } from "@/types";
import { orderStatusesList } from "@/lib/data"; 
import { MoreHorizontal, Eye, Edit, Trash2, Filter, CalendarDays, ChevronDown, Check, Download, ShoppingCart, Loader2 } from "lucide-react"; 
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import EditOrderDialog from "@/components/app/edit-order-dialog";
import type { EditOrderFormValues } from "@/components/app/edit-order-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import StatusBadge from "@/components/app/status-badge";
import { getOrdersFS, updateOrderFS, deleteOrderFS, initializeMockOrdersInFirestore } from "@/services/order-service";
import { mockOrders as initialMockOrdersForSeeding } from "@/lib/data";


const relevantOrderStatusesForDashboard: OrderStatus[] = ['Pendiente', 'Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Cancelado'];


export default function OrdersDashboardPage() {
  const { toast } = useToast();
  const { userRole: currentUserRole } = useAuth();
  
  const [allOrders, setAllOrders] = React.useState<Order[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "Todos">("Todos");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [cityFilter, setCityFilter] = React.useState("");
  const [selectedOrderIds, setSelectedOrderIds] = React.useState<string[]>([]);

  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [orderToDelete, setOrderToDelete] = React.useState<Order | null>(null);

  React.useEffect(() => {
    async function loadOrders() {
      setIsLoading(true);
      try {
        await initializeMockOrdersInFirestore(initialMockOrdersForSeeding);
        const firestoreOrders = await getOrdersFS();
        setAllOrders(firestoreOrders.filter(order => relevantOrderStatusesForDashboard.includes(order.status)));
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast({ title: "Error al Cargar Pedidos", description: "No se pudieron cargar los pedidos desde Firestore.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadOrders();
  }, [toast]);


  const uniqueStatusesForFilter = ["Todos", ...relevantOrderStatusesForDashboard] as (OrderStatus | "Todos")[];


  const filteredOrders = React.useMemo(() => {
    return allOrders
    .filter(order =>
      (order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
       order.salesRep.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .filter(order => statusFilter === "Todos" || order.status === statusFilter)
    .filter(order => {
      if (!dateRange?.from) return true; 
      const orderDate = parseISO(order.visitDate); 
      if(!isValid(orderDate)) return false;
      const fromDate = dateRange.from;
      const toDate = dateRange.to ? addDays(dateRange.to, 1) : new Date(8640000000000000) ; 
      return orderDate >= fromDate && orderDate < toDate;
    })
    .filter(order => {
      if (!cityFilter) return true;
      const cityLower = cityFilter.toLowerCase();
      return (order.direccionEntrega && order.direccionEntrega.toLowerCase().includes(cityLower)) ||
             (order.direccionFiscal && order.direccionFiscal.toLowerCase().includes(cityLower));
    });
  }, [allOrders, searchTerm, statusFilter, dateRange, cityFilter]);

  const handleViewOrEditClick = (order: Order) => {
    setEditingOrder(order);
    setIsEditDialogOpen(true);
  };

  const handleUpdateOrder = async (updatedData: EditOrderFormValues, orderId: string) => {
    setIsLoading(true);
    try {
      const orderToUpdate = allOrders.find(o => o.id === orderId);
      if (!orderToUpdate) {
        toast({ title: "Error", description: "Pedido no encontrado.", variant: "destructive" });
        return;
      }

      const fullUpdatedOrderData: Partial<Order> = {
        ...orderToUpdate, 
        clientName: updatedData.clientName,
        products: updatedData.products ? updatedData.products.split(/[,;\n]+/).map(p => p.trim()).filter(p => p.length > 0) : orderToUpdate.products,
        value: updatedData.value !== undefined ? updatedData.value : orderToUpdate.value,
        status: updatedData.status,
        salesRep: updatedData.salesRep,
        lastUpdated: format(new Date(), "yyyy-MM-dd"), 
        clientType: updatedData.clientType || orderToUpdate.clientType,
        numberOfUnits: updatedData.numberOfUnits !== undefined ? updatedData.numberOfUnits : orderToUpdate.numberOfUnits,
        unitPrice: updatedData.unitPrice !== undefined ? updatedData.unitPrice : orderToUpdate.unitPrice,
        nombreFiscal: updatedData.nombreFiscal || orderToUpdate.nombreFiscal,
        cif: updatedData.cif || orderToUpdate.cif,
        direccionFiscal: updatedData.direccionFiscal || orderToUpdate.direccionFiscal,
        direccionEntrega: updatedData.direccionEntrega || orderToUpdate.direccionEntrega,
        contactoNombre: updatedData.contactoNombre || orderToUpdate.contactoNombre,
        contactoCorreo: updatedData.contactoCorreo || orderToUpdate.contactoCorreo,
        contactoTelefono: updatedData.contactoTelefono || orderToUpdate.contactoTelefono,
        observacionesAlta: updatedData.observacionesAlta || orderToUpdate.observacionesAlta,
        notes: updatedData.notes || orderToUpdate.notes,
        nextActionType: updatedData.nextActionType || orderToUpdate.nextActionType,
        nextActionCustom: updatedData.nextActionCustom || orderToUpdate.nextActionCustom,
        nextActionDate: updatedData.nextActionDate ? format(updatedData.nextActionDate, "yyyy-MM-dd") : orderToUpdate.nextActionDate,
        failureReasonType: updatedData.failureReasonType || orderToUpdate.failureReasonType,
        failureReasonCustom: updatedData.failureReasonCustom || orderToUpdate.failureReasonCustom,
        clavadistaId: updatedData.clavadistaId,
        assignedMaterials: updatedData.assignedMaterials,
      };
      
      await updateOrderFS(orderId, fullUpdatedOrderData as Order); 
      
      setAllOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, ...fullUpdatedOrderData } : o));
      
      toast({ title: "¡Pedido Actualizado!", description: `Pedido ${orderId} actualizado exitosamente.`, variant: "default"});
    } catch (error) {
      console.error("Error updating order:", error);
      toast({ title: "Error al Actualizar", description: "No se pudo actualizar el pedido en Firestore.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      if (isEditDialogOpen) setIsEditDialogOpen(false);
      setEditingOrder(null);
    }
  };
  
  const handleDeleteOrderClick = (order: Order) => {
    if (!canDeleteOrder) return;
    setOrderToDelete(order);
  };

  const confirmDeleteOrder = async () => {
    if (!canDeleteOrder || !orderToDelete) return;
    setIsLoading(true);
    try {
      await deleteOrderFS(orderToDelete.id);
      setAllOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
      setSelectedOrderIds(prev => prev.filter(id => id !== orderToDelete.id));
      toast({ title: "¡Pedido Eliminado!", description: `El pedido "${orderToDelete.id}" ha sido eliminado.`, variant: "destructive" });
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({ title: "Error al Eliminar", description: "No se pudo eliminar el pedido de Firestore.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setOrderToDelete(null);
    }
  };

  const handleChangeOrderStatus = async (order: Order, newStatus: OrderStatus) => {
     if (!canEditOrderStatus) {
        toast({ title: "Permiso Denegado", description: "No tienes permiso para cambiar el estado del pedido.", variant: "destructive" });
        return;
    }
    const updatedFormValues: EditOrderFormValues = {
        clientName: order.clientName,
        products: order.products?.join(", "),
        value: order.value,
        status: newStatus, 
        salesRep: order.salesRep,
        clavadistaId: order.clavadistaId,
        assignedMaterials: order.assignedMaterials,
        clientType: order.clientType,
        numberOfUnits: order.numberOfUnits,
        unitPrice: order.unitPrice,
        nombreFiscal: order.nombreFiscal,
        cif: order.cif,
        direccionFiscal: order.direccionFiscal,
        direccionEntrega: order.direccionEntrega,
        contactoNombre: order.contactoNombre,
        contactoCorreo: order.contactoCorreo,
        contactoTelefono: order.contactoTelefono,
        observacionesAlta: order.observacionesAlta,
        notes: order.notes,
        nextActionType: order.nextActionType,
        nextActionCustom: order.nextActionCustom,
        nextActionDate: order.nextActionDate ? parseISO(order.nextActionDate) : undefined,
        failureReasonType: order.failureReasonType,
        failureReasonCustom: order.failureReasonCustom,
    };
    await handleUpdateOrder(updatedFormValues, order.id);
  }

  const handleSelectAllChange = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(filteredOrders.map(order => order.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleRowSelectChange = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(prev => [...prev, orderId]);
    } else {
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
    }
  };

  const isAllFilteredSelected = filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length && filteredOrders.every(fo => selectedOrderIds.includes(fo.id));
  const isSomeFilteredSelected = selectedOrderIds.length > 0 && selectedOrderIds.length < filteredOrders.length;


  const escapeCsvCell = (cellData: any): string => {
    if (cellData === null || cellData === undefined) {
      return "";
    }
    const stringData = String(cellData);
    if (stringData.includes(',') || stringData.includes('\n') || stringData.includes('"')) {
      return `"${stringData.replace(/"/g, '""')}"`;
    }
    return stringData;
  };
  
  const handleDownloadCsv = () => {
    if (selectedOrderIds.length === 0) {
      toast({ title: "No hay pedidos seleccionados", description: "Por favor, seleccione al menos un pedido para descargar.", variant: "destructive" });
      return;
    }
  
    const ordersToExport = allOrders.filter(order => selectedOrderIds.includes(order.id));
  
    const headers = [
      "ID Pedido", "Fecha Pedido", "Cliente", "Nombre Fiscal", "CIF",
      "Dirección Entrega", "Dirección Fiscal", "Contacto Nombre", "Contacto Email", "Contacto Teléfono",
      "Tipo Cliente", "Productos (Lista)", "Nº Unidades", "Precio Unitario (€ sin IVA)",
      "Valor Total Pedido (€ IVA incl.)", "Estado Pedido", "Comercial Asignado", "Notas Pedido", "Observaciones Alta"
    ];
  
    const csvRows = [
      headers.join(','),
      ...ordersToExport.map(order => [
        escapeCsvCell(order.id),
        escapeCsvCell(order.visitDate ? format(parseISO(order.visitDate), "dd/MM/yyyy") : ''),
        escapeCsvCell(order.clientName),
        escapeCsvCell(order.nombreFiscal),
        escapeCsvCell(order.cif),
        escapeCsvCell(order.direccionEntrega),
        escapeCsvCell(order.direccionFiscal),
        escapeCsvCell(order.contactoNombre),
        escapeCsvCell(order.contactoCorreo),
        escapeCsvCell(order.contactoTelefono),
        escapeCsvCell(order.clientType),
        escapeCsvCell(order.products?.join('; ')), 
        escapeCsvCell(order.numberOfUnits),
        escapeCsvCell(order.unitPrice), 
        escapeCsvCell(order.value), 
        escapeCsvCell(order.status),
        escapeCsvCell(order.salesRep),
        escapeCsvCell(order.notes),
        escapeCsvCell(order.observacionesAlta)
      ].join(','))
    ];
  
    const csvString = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `pedidos_santabrisa_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    toast({ title: "Descarga Iniciada", description: `${ordersToExport.length} pedidos se están descargando como CSV.` });
    setSelectedOrderIds([]); 
  };


  const canEditOrderDetails = currentUserRole === 'Admin';
  const canEditOrderStatus = currentUserRole === 'Admin' || currentUserRole === 'Distributor';
  const canDeleteOrder = currentUserRole === 'Admin';
  const canDownloadCsv = currentUserRole === 'Admin' || currentUserRole === 'Distributor';


  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
        <ShoppingCart className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Gestión Integral de Pedidos</h1>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Gestionar Pedidos</CardTitle>
          <CardDescription>Visualiza, filtra y administra todos los pedidos de clientes. Los administradores y distribuidores pueden cambiar estados y descargar información relevante.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Input
              placeholder="Buscar pedidos (ID, Cliente, Rep)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Input
              placeholder="Filtrar por ciudad..."
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  Estado: {statusFilter} <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuCheckboxItem
                    key="Todos"
                    checked={statusFilter === "Todos"}
                    onCheckedChange={() => setStatusFilter("Todos")}
                  >
                    Todos
                  </DropdownMenuCheckboxItem>
                {uniqueStatusesForFilter.filter(s => s !== "Todos").map(status => (
                   <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilter === status}
                    onCheckedChange={() => setStatusFilter(status as OrderStatus)}
                  >
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-auto justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                        {format(dateRange.to, "LLL dd, y", { locale: es })}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y", { locale: es })
                    )
                  ) : (
                    <span>Seleccione un rango de fechas</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
            {canDownloadCsv && (
              <Button 
                onClick={handleDownloadCsv} 
                disabled={selectedOrderIds.length === 0}
                className="w-full sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar CSV ({selectedOrderIds.length})
              </Button>
            )}
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
                    {canDownloadCsv && (
                      <TableHead className="w-[5%] px-2">
                        <Checkbox
                          checked={isAllFilteredSelected}
                          indeterminate={(isSomeFilteredSelected && !isAllFilteredSelected) || undefined}
                          onCheckedChange={(checked) => handleSelectAllChange(Boolean(checked))}
                          aria-label="Seleccionar todos los pedidos filtrados"
                        />
                      </TableHead>
                    )}
                    <TableHead className={cn(canDownloadCsv ? "w-[15%]" : "w-[20%]")}>ID Pedido</TableHead>
                    <TableHead className="w-[20%]">Cliente</TableHead>
                    <TableHead className="w-[15%]">Fecha</TableHead>
                    <TableHead className="text-right w-[10%]">Nº Botellas</TableHead>
                    <TableHead className="text-right w-[15%]">Valor</TableHead>
                    <TableHead className="text-center w-[10%]">Estado</TableHead>
                    <TableHead className="text-right w-[10%]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? filteredOrders.map((order: Order) => (
                    <TableRow 
                      key={order.id}
                      data-state={selectedOrderIds.includes(order.id) ? "selected" : ""}
                    >
                      {canDownloadCsv && (
                          <TableCell className="px-2">
                            <Checkbox
                              checked={selectedOrderIds.includes(order.id)}
                              onCheckedChange={(checked) => handleRowSelectChange(order.id, Boolean(checked))}
                              aria-label={`Seleccionar pedido ${order.id}`}
                            />
                          </TableCell>
                        )}
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.clientName}</TableCell>
                      <TableCell>{order.visitDate ? format(parseISO(order.visitDate), "MMM dd, yyyy", { locale: es }) : "N/D"}</TableCell>
                      <TableCell className="text-right">
                        <FormattedNumericValue value={order.numberOfUnits} locale="es-ES" placeholder="N/D" />
                      </TableCell>
                      <TableCell className="text-right">
                        <FormattedNumericValue value={order.value} locale="es-ES" options={{ style: 'currency', currency: 'EUR' }} placeholder="—" />
                      </TableCell>
                      <TableCell className="text-center">
                        {canEditOrderStatus ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="p-0 h-auto">
                                <StatusBadge type="order" status={order.status} className="cursor-pointer" />
                                <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuRadioGroup 
                                  value={order.status} 
                                  onValueChange={(newStatus) => handleChangeOrderStatus(order, newStatus as OrderStatus)}
                              >
                                {relevantOrderStatusesForDashboard.map((statusVal) => (
                                  <DropdownMenuRadioItem key={statusVal} value={statusVal} disabled={!relevantOrderStatusesForDashboard.includes(statusVal as OrderStatus)}>
                                    {statusVal}
                                  </DropdownMenuRadioItem>
                                ))}
                              </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <StatusBadge type="order" status={order.status} />
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
                            <DropdownMenuItem onSelect={() => handleViewOrEditClick(order)}>
                              <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                            </DropdownMenuItem>
                            {(canEditOrderDetails || canEditOrderStatus) && ( 
                              <DropdownMenuItem onSelect={() => handleViewOrEditClick(order)}>
                                <Edit className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                            )}
                            {canDeleteOrder && (
                              <>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                      onSelect={(e) => { e.preventDefault(); handleDeleteOrderClick(order); }}
                                      >
                                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar Pedido
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  {orderToDelete && orderToDelete.id === order.id && (
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              Esta acción no se puede deshacer. Esto eliminará permanentemente el pedido:
                                              <br />
                                              <strong className="mt-2 block">{orderToDelete.id} - {orderToDelete.clientName}</strong>
                                          </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                          <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={confirmDeleteOrder} variant="destructive">Sí, eliminar</AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  )}
                                </AlertDialog>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={canDownloadCsv ? 8 : 7} className="h-24 text-center">
                        No se encontraron pedidos que coincidan con los filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
         {!isLoading && filteredOrders.length > 0 && (
            <CardFooter>
                <p className="text-xs text-muted-foreground">Mostrando {filteredOrders.length} pedidos de {allOrders.length} que cumplen los criterios.</p>
            </CardFooter>
        )}
      </Card>
      {editingOrder && currentUserRole && (
        <EditOrderDialog
          order={editingOrder}
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={handleUpdateOrder}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  );
}
