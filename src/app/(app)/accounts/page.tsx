
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { accountStatusList } from "@/lib/data"; // mockAccounts no se usa directamente más, pero sí accountStatusList
import type { Account, AccountStatus, UserRole } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Edit, Trash2, MoreHorizontal, Building2, Filter, ChevronDown, Eye, Loader2 } from "lucide-react";
import AccountDialog, { type AccountFormValues } from "@/components/app/account-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import StatusBadge from "@/components/app/status-badge";
import Link from "next/link";
import { getAccountsFS, addAccountFS, deleteAccountFS, initializeMockAccountsInFirestore } from "@/services/account-service";
import { mockAccounts as initialMockAccounts } from "@/lib/data"; // Para inicialización única

export default function AccountsPage() {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
  const [accountToDelete, setAccountToDelete] = React.useState<Account | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<AccountStatus | "Todos">("Todos");
  const [cityFilter, setCityFilter] = React.useState("");

  const isAdmin = userRole === 'Admin';

  React.useEffect(() => {
    async function loadAccounts() {
      setIsLoading(true);
      try {
        // Descomentar la siguiente línea para inicializar con mocks si la BBDD está vacía
        // await initializeMockAccountsInFirestore(initialMockAccounts); 
        const firestoreAccounts = await getAccountsFS();
        setAccounts(firestoreAccounts);
      } catch (error) {
        console.error("Error fetching accounts:", error);
        toast({ title: "Error al Cargar Cuentas", description: "No se pudieron cargar las cuentas desde la base de datos.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadAccounts();
  }, [toast]);

  const handleAddNewAccount = () => {
    if (!isAdmin) return;
    setIsAccountDialogOpen(true);
  };

  const handleSaveNewAccount = async (data: AccountFormValues) => {
    if (!isAdmin) return;
    setIsLoading(true); // Podríamos usar un estado de "isSaving" más específico aquí
    try {
      const newAccountId = await addAccountFS(data);
      const newAccount = await getAccountsFS(); // Recargar todas o solo la nueva
      setAccounts(newAccount); // Actualiza con la lista completa para reflejar el nuevo ID y Timestamps de Firestore
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
       account.cif.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (account.legalName && account.legalName.toLowerCase().includes(searchTerm.toLowerCase())) ||
       (account.mainContactName && account.mainContactName.toLowerCase().includes(searchTerm.toLowerCase())))
    )
    .filter(account => statusFilter === "Todos" || account.status === statusFilter)
    .filter(account => {
      if (!cityFilter) return true;
      const cityLower = cityFilter.toLowerCase();
      return (account.addressShipping && account.addressShipping.toLowerCase().includes(cityLower)) ||
             (account.addressBilling && account.addressBilling.toLowerCase().includes(cityLower));
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
              placeholder="Filtrar por ciudad..."
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
                    <TableHead className="w-[15%]">CIF</TableHead>
                    <TableHead className="w-[15%]">Tipo</TableHead>
                    <TableHead className="w-[15%]">Contacto Principal</TableHead>
                    <TableHead className="text-center w-[10%]">Estado</TableHead>
                    <TableHead className="text-right w-[20%]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.length > 0 ? filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell>{account.cif}</TableCell>
                      <TableCell>{account.type}</TableCell>
                      <TableCell>
                          {account.mainContactName && (
                              <div>
                                  {account.mainContactName}
                                  {account.mainContactEmail && <div className="text-xs text-muted-foreground">{account.mainContactEmail}</div>}
                                  {account.mainContactPhone && <div className="text-xs text-muted-foreground">{account.mainContactPhone}</div>}
                              </div>
                          )}
                           {!account.mainContactName && "N/D"}
                      </TableCell>
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
                            {isAdmin && (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link href={`/accounts/${account.id}?edit=true`}>
                                    <Edit className="mr-2 h-4 w-4" /> Editar
                                  </Link>
                                </DropdownMenuItem>
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
          allAccounts={accounts} // Pasar las cuentas cargadas de Firestore para la validación de CIF duplicado en el diálogo
        />
      )}
    </div>
  );
}
