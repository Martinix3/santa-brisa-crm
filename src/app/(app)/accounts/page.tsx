
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { accountStatusList } from "@/lib/data"; 
import type { Account, AccountStatus, UserRole, Order } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Edit, Trash2, MoreHorizontal, Building2, Filter, ChevronDown, Eye, Loader2, MapPin, ShoppingCart } from "lucide-react";
import AccountDialog, { type AccountFormValues } from "@/components/app/account-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import StatusBadge from "@/components/app/status-badge";
import Link from "next/link";
import { getAccountsFS, addAccountFS, deleteAccountFS, initializeMockAccountsInFirestore } from "@/services/account-service";
import { getOrdersFS } from "@/services/order-service";
import { mockAccounts as initialMockAccounts } from "@/lib/data"; 

export default function AccountsPage() {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
  const [accountToDelete, setAccountToDelete] = React.useState<Account | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<AccountStatus | "Todos">("Todos");
  const [cityFilter, setCityFilter] = React.useState("");

  const isAdmin = userRole === 'Admin';
  const canEditAccounts = userRole === 'Admin' || userRole === 'SalesRep';


  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        await initializeMockAccountsInFirestore(initialMockAccounts); 
        const [firestoreAccounts, firestoreOrders] = await Promise.all([
            getAccountsFS(),
            getOrdersFS(),
        ]);
        setAccounts(firestoreAccounts);
        setOrders(firestoreOrders);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los datos desde la base de datos.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [toast]);
  
  const ordersByAccountId = React.useMemo(() => {
    // Create a map from lowercase client name to account ID for quick lookups.
    const accountNameMap = new Map<string, string>();
    accounts.forEach(account => {
        // Handle cases where multiple accounts might have the same name, first one wins.
        if (!accountNameMap.has(account.name.toLowerCase().trim())) {
            accountNameMap.set(account.name.toLowerCase().trim(), account.id);
        }
    });

    const counts: Record<string, number> = {};

    // Filter for actual orders (not tasks) and iterate
    orders
      .filter(order => order.status !== 'Programada' && order.status !== 'Seguimiento' && order.status !== 'Fallido')
      .forEach(order => {
        let accountId = order.accountId;
        
        // If accountId is missing, try to find it by clientName as a fallback
        if (!accountId) {
          accountId = accountNameMap.get(order.clientName.toLowerCase().trim());
        }

        // If we found an associated account ID, increment its order count
        if (accountId) {
            counts[accountId] = (counts[accountId] || 0) + 1;
        }
      });
      
    return counts;
  }, [orders, accounts]);


  const handleAddNewAccount = () => {
    if (!isAdmin) return;
    setIsAccountDialogOpen(true);
  };

  const handleSaveNewAccount = async (data: AccountFormValues) => {
    if (!isAdmin) return;
    setIsLoading(true); 
    try {
      const newAccountId = await addAccountFS(data);
      const newAccount = await getAccountsFS(); 
      setAccounts(newAccount); 
      toast({ title: "¡Cuenta Añadida!", description: `La cuenta "${data.name}" ha sido añadida.` });
      setIsAccountDialogOpen(false);
    } catch (error) {
      console.error("Error saving new account:", error);
      toast({ title: "Error al Guardar", description: "No se pudo añadir la nueva cuenta.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = (account: Account) => {
    if (!isAdmin) return;
    setAccountToDelete(account);
  };

  const confirmDeleteAccount = async () => {
    if (!isAdmin || !accountToDelete) return;
    setIsLoading(true);
    try {
      await deleteAccountFS(accountToDelete.id);
      setAccounts(prev => prev.filter(acc => acc.id !== accountToDelete.id));
      toast({ title: "¡Cuenta Eliminada!", description: `La cuenta "${accountToDelete.name}" ha sido eliminada.`, variant: "destructive" });
      setAccountToDelete(null);
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({ title: "Error al Eliminar", description: "No se pudo eliminar la cuenta.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAccounts = accounts
    .filter(account =>
      (account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (account.cif && account.cif.toLowerCase().includes(searchTerm.toLowerCase())) ||
       (account.legalName && account.legalName.toLowerCase().includes(searchTerm.toLowerCase())) ||
       (account.mainContactName && account.mainContactName.toLowerCase().includes(searchTerm.toLowerCase())))
    )
    .filter(account => statusFilter === "Todos" || account.status === statusFilter)
    .filter(account => {
      if (!cityFilter) return true;
      const cityLower = cityFilter.toLowerCase();
      const shippingCity = account.addressShipping?.city?.toLowerCase() || '';
      const shippingProvince = account.addressShipping?.province?.toLowerCase() || '';
      const billingCity = account.addressBilling?.city?.toLowerCase() || '';
      const billingProvince = account.addressBilling?.province?.toLowerCase() || '';

      return shippingCity.includes(cityLower) || 
             shippingProvince.includes(cityLower) ||
             billingCity.includes(cityLower) || 
             billingProvince.includes(cityLower);
    });
  
  const uniqueAccountStatuses = ["Todos", ...accountStatusList] as (AccountStatus | "Todos")[];


  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Gestión de Cuentas</h1>
        </div>
        {isAdmin && (
          <Button onClick={handleAddNewAccount} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nueva Cuenta
          </Button>
        )}
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Directorio de Cuentas</CardTitle>
          <CardDescription>Visualiza, filtra y gestiona todas las cuentas de clientes. Los administradores pueden añadir, editar y eliminar cuentas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Input
              placeholder="Buscar (Nombre, CIF, Contacto)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
             <Input
              placeholder="Filtrar por ciudad/provincia..."
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="max-w-xs"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  Estado: {statusFilter} <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {uniqueAccountStatuses.map(status => (
                   <DropdownMenuItem key={status} onSelect={() => setStatusFilter(status)}>
                    {status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando cuentas...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[25%]">Nombre Comercial</TableHead>
                    <TableHead className="w-[15%] text-center">Nº Pedidos</TableHead>
                    <TableHead className="w-[15%]">Ubicación</TableHead>
                    <TableHead className="w-[15%]">Tipo</TableHead>
                    <TableHead className="text-center w-[10%]">Estado</TableHead>
                    <TableHead className="text-right w-[20%]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.length > 0 ? filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        <Link href={`/accounts/${account.id}`} className="hover:underline text-primary">
                          {account.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center font-medium">
                            <ShoppingCart size={14} className="mr-1.5 text-muted-foreground" />
                            {ordersByAccountId[account.id] || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                          {account.addressShipping?.city || account.addressBilling?.city ? (
                            <div className="flex items-center text-xs">
                                <MapPin size={14} className="mr-1 text-muted-foreground" />
                                {account.addressShipping?.city || account.addressBilling?.city}
                            </div>
                          ) : "N/D"}
                      </TableCell>
                      <TableCell>{account.type}</TableCell>
                      <TableCell className="text-center">
                        <StatusBadge type="account" status={account.status} />
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
                            <DropdownMenuItem asChild>
                              <Link href={`/accounts/${account.id}`}>
                                <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                              </Link>
                            </DropdownMenuItem>
                            {canEditAccounts && (
                              <DropdownMenuItem asChild>
                                <Link href={`/accounts/${account.id}?edit=true`}>
                                  <Edit className="mr-2 h-4 w-4" /> Editar
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                 <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                      onSelect={(e) => { e.preventDefault(); handleDeleteAccount(account); }}
                                      >
                                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar Cuenta
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  {accountToDelete && accountToDelete.id === account.id && (
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              Esta acción no se puede deshacer. Esto eliminará permanentemente la cuenta:
                                              <br />
                                              <strong className="mt-2 block">"{accountToDelete.name}"</strong>
                                          </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                          <AlertDialogCancel onClick={() => setAccountToDelete(null)}>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={confirmDeleteAccount} variant="destructive">Sí, eliminar</AlertDialogAction>
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
                      <TableCell colSpan={6} className="h-24 text-center">
                         No se encontraron cuentas que coincidan con tu búsqueda o filtros. {isAdmin ? "Puedes añadir una nueva cuenta." : ""}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {!isLoading && filteredAccounts.length > 0 && (
            <CardFooter>
                <p className="text-xs text-muted-foreground">Total de cuentas mostradas: {filteredAccounts.length} de {accounts.length}</p>
            </CardFooter>
        )}
      </Card>

      {isAdmin && (
        <AccountDialog
          account={null} 
          isOpen={isAccountDialogOpen}
          onOpenChange={setIsAccountDialogOpen}
          onSave={handleSaveNewAccount}
          allAccounts={accounts} 
        />
      )}
    </div>
  );
}
