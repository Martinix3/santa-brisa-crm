
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Order, UserRole, Account, OrderStatus } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Search, PlusCircle, Eye } from "lucide-react";
import EditOrderDialog from "@/components/app/edit-order-dialog";
import { getAccountsFS } from "@/services/account-service";
import { getOrdersFS, updateFullOrderFS } from "@/services/order-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { orderStatusesList } from "@/lib/data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, isValid } from "date-fns";
import type { EditOrderFormValues } from "@/components/app/edit-order-dialog";

export default function OrdersDashboardPage() {
  const { toast } = useToast();
  const { userRole, teamMember, dataSignature, refreshDataSignature } = useAuth();
  
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<any[]>([]); // Use any temporarily if type is complex
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "Todos">("Todos");
  const [cityFilter, setCityFilter] = React.useState<string>("Todos");

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [fetchedOrders, fetchedAccounts, fetchedMembers] = await Promise.all([
          getOrdersFS(),
          getAccountsFS(),
          getTeamMembersFS(['SalesRep', 'Admin', 'Clavadista'])
        ]);
        
        let relevantOrders = fetchedOrders.filter(o => o.status !== 'Programada' && o.status !== 'Seguimiento' && o.status !== 'Fallido');

        if (userRole === 'Distributor' && teamMember?.accountId) {
          const managedAccountIds = new Set(fetchedAccounts.filter(acc => acc.distributorId === teamMember.accountId).map(acc => acc.id));
          relevantOrders = relevantOrders.filter(o => o.accountId && managedAccountIds.has(o.accountId));
        } else if (userRole === 'SalesRep' && teamMember) {
          relevantOrders = relevantOrders.filter(o => o.salesRep === teamMember.name);
        } else if (userRole === 'Clavadista' && teamMember) {
            relevantOrders = relevantOrders.filter(o => o.clavadistaId === teamMember.id);
        }
        
        setOrders(relevantOrders);
        setAccounts(fetchedAccounts);
        setTeamMembers(fetchedMembers);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los pedidos.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [toast, dataSignature, userRole, teamMember]);

  const cityOptions = React.useMemo(() => {
    const cities = new Set<string>();
    const accountIdsInOrders = new Set(orders.map(o => o.accountId));
    accounts.forEach(acc => {
      if (accountIdsInOrders.has(acc.id)) {
        if (acc.addressShipping?.city) cities.add(acc.addressShipping.city);
        else if (acc.addressBilling?.city) cities.add(acc.addressBilling.city);
      }
    });
    return ["Todos", ...Array.from(cities).sort()];
  }, [accounts, orders]);


  const filteredOrders = React.useMemo(() => {
    const accountsMap = new Map(accounts.map(acc => [acc.id, acc]));

    return orders
      .filter(order => {
        const matchesSearch = !searchTerm || order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || (order.id && order.id.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === "Todos" || order.status === statusFilter;
        
        const account = order.accountId ? accountsMap.get(order.accountId) : undefined;
        const accountCity = account?.addressShipping?.city || account?.addressBilling?.city;
        const matchesCity = cityFilter === "Todos" || (accountCity && accountCity === cityFilter);

        return matchesSearch && matchesStatus && matchesCity;
      });
  }, [orders, accounts, searchTerm, statusFilter, cityFilter]);

  const handleSaveOrder = async (data: EditOrderFormValues, orderId: string) => {
    if (!userRole) return;
    try {
      await updateFullOrderFS(orderId, data);
      refreshDataSignature();
      toast({ title: "¡Pedido Actualizado!", description: "Los detalles del pedido han sido guardados." });
    } catch (error) {
        console.error("Error updating order:", error);
        toast({ title: "Error", description: "No se pudo actualizar el pedido.", variant: "destructive" });
    } finally {
        setEditingOrder(null);
    }
  };
  
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold">Panel de Pedidos</h1>
          <p className="text-muted-foreground">Consulta el estado y los detalles de todos los pedidos de colocación.</p>
        </div>
        {(userRole === 'Admin' || userRole === 'SalesRep' || userRole === 'Clavadista') && (
            <Button asChild>
                <a href="/order-form"><PlusCircle className="mr-2 h-4 w-4"/> Registrar Interacción/Pedido</a>
            </Button>
        )}
      </header>

      <Card className="shadow-subtle">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-4 flex-wrap">
              <div className="relative flex-grow w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente o ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:max-w-xs"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | 'Todos')}>
                  <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Estado..." /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Todos">Todos los Estados</SelectItem>
                      {orderStatusesList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
              </Select>
              <Select value={cityFilter} onValueChange={(v) => setCityFilter(v)}>
                  <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Ciudad..." /></SelectTrigger>
                  <SelectContent>
                      {cityOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
              </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Responsable</TableHead>
                            <TableHead>Unidades</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.length > 0 ? filteredOrders.map(order => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.clientName}</TableCell>
                                <TableCell>{order.createdAt && isValid(parseISO(order.createdAt)) ? format(parseISO(order.createdAt), "dd/MM/yyyy") : 'N/D'}</TableCell>
                                <TableCell>{order.salesRep}</TableCell>
                                <TableCell><FormattedNumericValue value={order.numberOfUnits} placeholder="N/A" /></TableCell>
                                <TableCell className="text-right"><FormattedNumericValue value={order.value} options={{style: 'currency', currency: 'EUR'}} placeholder="N/A" /></TableCell>
                                <TableCell className="text-center"><StatusBadge type="order" status={order.status} /></TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="outline" onClick={() => setEditingOrder(order)}>
                                        <Eye className="mr-2 h-4 w-4"/> Ver
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                           <TableRow>
                                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                    No se encontraron pedidos con los filtros actuales.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            )}
          </div>
        </CardContent>
      </Card>
      
      {editingOrder && (
        <EditOrderDialog
            order={editingOrder}
            isOpen={!!editingOrder}
            onOpenChange={() => setEditingOrder(null)}
            onSave={handleSaveOrder}
            currentUserRole={userRole!}
            allAccounts={accounts}
        />
      )}
    </div>
  );
}

