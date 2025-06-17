
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { mockAccounts, accountTypeList, accountStatusList } from "@/lib/data";
import type { Account, AccountStatus, UserRole } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Edit, Trash2, MoreHorizontal, Building2, Filter, ChevronDown } from "lucide-react";
import AccountDialog, { type AccountFormValues } from "@/components/app/account-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import StatusBadge from "@/components/app/status-badge";

export default function AccountsPage() {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [accounts, setAccounts] = React.useState<Account[]>(() => [...mockAccounts]);
  const [editingAccount, setEditingAccount] = React.useState<Account | null>(null);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
  const [accountToDelete, setAccountToDelete] = React.useState<Account | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<AccountStatus | "Todos">("Todos");

  const isAdmin = userRole === 'Admin';

  const handleAddNewAccount = () => {
    if (!isAdmin) return;
    setEditingAccount(null);
    setIsAccountDialogOpen(true);
  };

  const handleEditAccount = (account: Account) => {
    if (!isAdmin) return;
    setEditingAccount(account);
    setIsAccountDialogOpen(true);
  };

  const handleSaveAccount = (data: AccountFormValues) => {
    if (!isAdmin) return;
    const currentDate = format(new Date(), "yyyy-MM-dd");

    if (editingAccount) {
      // Edit existing account
      const updatedAccounts = accounts.map(acc =>
        acc.id === editingAccount.id ? { ...editingAccount, ...data, updatedAt: currentDate } : acc
      );
      setAccounts(updatedAccounts);
      // Update mock data source
      const mockIndex = mockAccounts.findIndex(acc => acc.id === editingAccount.id);
      if (mockIndex !== -1) {
        mockAccounts[mockIndex] = { ...mockAccounts[mockIndex], ...data, updatedAt: currentDate };
      }
      toast({ title: "¡Cuenta Actualizada!", description: `La cuenta "${data.name}" ha sido actualizada.` });
    } else {
      // Add new account
      const newAccount: Account = {
        id: `acc_${Date.now()}`,
        ...data,
        createdAt: currentDate,
        updatedAt: currentDate,
      };
      setAccounts(prev => [newAccount, ...prev]);
      mockAccounts.unshift(newAccount); // Add to mock data source
      toast({ title: "¡Cuenta Añadida!", description: `La cuenta "${data.name}" ha sido añadida.` });
    }
    setIsAccountDialogOpen(false);
    setEditingAccount(null);
  };

  const handleDeleteAccount = (account: Account) => {
    if (!isAdmin) return;
    setAccountToDelete(account);
  };

  const confirmDeleteAccount = () => {
    if (!isAdmin || !accountToDelete) return;
    
    const updatedAccounts = accounts.filter(acc => acc.id !== accountToDelete.id);
    setAccounts(updatedAccounts);

    const mockIndex = mockAccounts.findIndex(acc => acc.id === accountToDelete.id);
    if (mockIndex !== -1) {
      mockAccounts.splice(mockIndex, 1);
    }
    toast({ title: "¡Cuenta Eliminada!", description: `La cuenta "${accountToDelete.name}" ha sido eliminada.`, variant: "destructive" });
    setAccountToDelete(null);
  };

  const filteredAccounts = accounts
    .filter(account =>
      (account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       account.cif.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (account.legalName && account.legalName.toLowerCase().includes(searchTerm.toLowerCase())) ||
       (account.mainContactName && account.mainContactName.toLowerCase().includes(searchTerm.toLowerCase())))
    )
    .filter(account => statusFilter === "Todos" || account.status === statusFilter);
  
  const uniqueAccountStatuses = ["Todos", ...accountStatusList] as (AccountStatus | "Todos")[];


  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Gestión de Cuentas</h1>
        </div>
        {isAdmin && (
          <Button onClick={handleAddNewAccount}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nueva Cuenta
          </Button>
        )}
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Lista de Cuentas</CardTitle>
          <CardDescription>Administra todas las cuentas de clientes de la empresa.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Input
              placeholder="Buscar cuentas (Nombre, CIF, Contacto)..."
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
                {uniqueAccountStatuses.map(status => (
                   <DropdownMenuItem key={status} onSelect={() => setStatusFilter(status)}>
                    {status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
                          <DropdownMenuItem onSelect={() => { setEditingAccount(account); setIsAccountDialogOpen(true); }}>
                            {isAdmin ? <><Edit className="mr-2 h-4 w-4" /> Editar</> : "Ver Detalles"}
                          </DropdownMenuItem>
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
                      No hay cuentas para mostrar. Intenta ajustar los filtros o añade una nueva cuenta.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {filteredAccounts.length > 0 && (
            <CardFooter>
                <p className="text-xs text-muted-foreground">Total de cuentas mostradas: {filteredAccounts.length} de {accounts.length}</p>
            </CardFooter>
        )}
      </Card>

      {isAdmin && (
        <AccountDialog
          account={editingAccount}
          isOpen={isAccountDialogOpen}
          onOpenChange={setIsAccountDialogOpen}
          onSave={handleSaveAccount}
          allAccounts={accounts}
        />
      )}
       {!isAdmin && editingAccount && ( // Read-only view for non-admins
        <AccountDialog
          account={editingAccount}
          isOpen={isAccountDialogOpen}
          onOpenChange={setIsAccountDialogOpen}
          onSave={()=>{}} // No-op save for read-only
          allAccounts={accounts}
          isReadOnly={true}
        />
      )}
    </div>
  );
}
