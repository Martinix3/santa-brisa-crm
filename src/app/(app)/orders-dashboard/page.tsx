
"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Order, OrderStatus, UserRole } from "@/types";
import { mockOrders, orderStatusesList } from "@/lib/data";
import { MoreHorizontal, Eye, Edit, Trash2, Filter, CalendarDays, ChevronDown, Check } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import EditOrderDialog from "@/components/app/edit-order-dialog";
import type { EditOrderFormValues } from "@/components/app/edit-order-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


const getStatusBadgeColor = (status: OrderStatus): string => {
  switch (status) {
    case 'Entregado': return 'bg-green-500 hover:bg-green-600 text-white';
    case 'Confirmado': return 'bg-[hsl(var(--brand-turquoise-hsl))] hover:brightness-90 text-white';
    case 'Enviado': return 'bg-purple-500 hover:bg-purple-600 text-white';
    case 'Pendiente': return 'bg-yellow-400 hover:bg-yellow-500 text-black';
    case 'Procesando': return 'bg-orange-400 hover:bg-orange-500 text-black';
    case 'Cancelado':
    case 'Fallido': return 'bg-red-500 hover:bg-red-600 text-white';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
}


export default function OrdersDashboardPage() {
  const { toast } = useToast();
  const { userRole: currentUserRole } = useAuth();
  const [orders, setOrders] = React.useState<Order[]>(mockOrders);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "Todos">("Todos");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [orderToDelete, setOrderToDelete] = React.useState<Order | null>(null);

  const uniqueStatuses = ["Todos", ...Array.from(new Set(mockOrders.map(order => order.status)))] as (OrderStatus | "Todos")[];

  const filteredOrders = orders
    .filter(order =>
      (order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
       order.salesRep.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .filter(order => statusFilter === "Todos" || order.status === statusFilter)
    .filter(order => {
      if (!dateRange?.from) return true;
      const orderDate = parseISO(order.visitDate);
      const fromDate = dateRange.from;
      const toDate = dateRange.to ? addDays(dateRange.to,1) : addDays(new Date(), 1) ; 
      return orderDate >= fromDate && orderDate < toDate;
    });

  const handleViewOrEditClick = (order: Order) => {
    setEditingOrder(order);
    setIsEditDialogOpen(true);
  };

  const handleUpdateOrder = (updatedData: EditOrderFormValues, orderId: string) => {
    const orderIndex = mockOrders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      toast({ title: "Error", description: "No se pudo encontrar el pedido para actualizar.", variant: "destructive" });
      return;
    }

    const updatedOrderData: Order = {
      ...mockOrders[orderIndex], 
      clientName: updatedData.clientName,
      products: updatedData.products.split(/[,;\n]+/).map(p => p.trim()).filter(p => p.length > 0),
      value: updatedData.value,
      status: updatedData.status,
      salesRep: updatedData.salesRep,
      lastUpdated: format(new Date(), "yyyy-MM-dd"),
      nombreFiscal: updatedData.nombreFiscal,
      cif: updatedData.cif,
      direccionFiscal: updatedData.direccionFiscal,
      direccionEntrega: updatedData.direccionEntrega,
      contactoNombre: updatedData.contactoNombre,
      contactoCorreo: updatedData.contactoCorreo,
      contactoTelefono: updatedData.contactoTelefono,
      observacionesAlta: updatedData.observacionesAlta,
      notes: updatedData.notes,
    };

    mockOrders[orderIndex] = updatedOrderData;
    setOrders([...mockOrders]);
    setIsEditDialogOpen(false);
    setEditingOrder(null);

    toast({
      title: "¡Pedido Actualizado!",
      description: (
        <div className="flex items-start">
          <Check className="h-5 w-5 text-green-500 mr-2 mt-1" />
          <p>Pedido {updatedOrderData.id} actualizado exitosamente.</p>
        </div>
      ),
      variant: "default",
    });
  };
  
  const handleDeleteOrder = (order: Order) => {
    if (!canDeleteOrder) return;
    setOrderToDelete(order);
  };

  const confirmDeleteOrder = () => {
    if (!canDeleteOrder || !orderToDelete) return;
    
    const updatedOrdersState = orders.filter(o => o.id !== orderToDelete.id);
    setOrders(updatedOrdersState);

    const mockIndex = mockOrders.findIndex(o => o.id === orderToDelete.id);
    if (mockIndex !== -1) {
      mockOrders.splice(mockIndex, 1);
    }
    toast({ 
      title: "¡Pedido Eliminado!", 
      description: `El pedido "${orderToDelete.id}" ha sido eliminado.`, 
      variant: "destructive" 
    });
    setOrderToDelete(null);
  };


  const canEditOrderDetails = currentUserRole === 'Admin';
  const canEditOrderStatus = currentUserRole === 'Admin' || currentUserRole === 'Distributor';
  const canDeleteOrder = currentUserRole === 'Admin';


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold">Panel de Pedidos</h1>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Gestionar Pedidos</CardTitle>
          <CardDescription>Ver, filtrar y gestionar todos los pedidos de clientes registrados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Input
              placeholder="Buscar pedidos (ID, Cliente, Rep)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
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
                {uniqueStatuses.map(status => (
                   <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilter === status}
                    onCheckedChange={() => setStatusFilter(status)}
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
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Rep. Ventas</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order: Order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{order.clientName}</TableCell>
                    <TableCell>{format(parseISO(order.visitDate), "MMM dd, yyyy", { locale: es })}</TableCell>
                    <TableCell>{order.salesRep}</TableCell>
                    <TableCell className="text-right">€{order.value.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("text-xs", getStatusBadgeColor(order.status))}>
                        {order.status}
                      </Badge>
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
                                    onSelect={(e) => { e.preventDefault(); handleDeleteOrder(order); }}
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
                ))}
                 {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No se encontraron pedidos. Intente ajustar sus filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
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

