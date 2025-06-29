
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { EnrichedAccount, AccountStatus } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Loader2, Eye, Search } from "lucide-react";
import AccountDialog, { type AccountFormValues } from "@/components/app/account-dialog";
import StatusBadge from "@/components/app/status-badge";
import Link from "next/link";
import { getAccountsFS, addAccountFS } from "@/services/account-service";
import { getOrdersFS } from "@/services/order-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { processCarteraData } from "@/services/cartera-service";
import { cn } from "@/lib/utils";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";

// Define group types
type AccountGroup = 'Activos' | 'Potenciales' | 'Fallidos' | 'Otros';

const groupConfig: Record<AccountGroup, { statuses: AccountStatus[], colorClass: string }> = {
  Activos: { statuses: ['Primer Pedido', 'Repetición'], colorClass: 'border-green-500' },
  Potenciales: { statuses: ['Programada', 'Seguimiento'], colorClass: 'border-sky-500' },
  Fallidos: { statuses: ['Fallido'], colorClass: 'border-red-500' },
  Otros: { statuses: ['Inactivo'], colorClass: 'border-slate-400' },
};

const AccountRow = ({ account, colorClass }: { account: EnrichedAccount, colorClass: string }) => {
  return (
    <TableRow className="border-b hover:bg-muted/30">
      <TableCell className="font-medium p-2">
        <div className="flex items-center gap-3">
          <div className={cn("w-1 self-stretch rounded-full", colorClass)} />
          <Link href={`/accounts/${account.id}`} className="hover:underline text-primary truncate">{account.nombre}</Link>
        </div>
      </TableCell>
      <TableCell className="p-2">
        <div className="flex items-center gap-2">
           <Avatar className="h-6 w-6">
              <AvatarImage src={account.responsableAvatar} data-ai-hint="person face" />
              <AvatarFallback className="text-xs">{account.responsableName?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <span className="text-sm truncate">{account.responsableName || 'N/D'}</span>
        </div>
      </TableCell>
      <TableCell className="p-2"><StatusBadge type="account" status={account.status} /></TableCell>
      <TableCell className="p-2 text-right">
        {account.totalValue > 0 ? <FormattedNumericValue value={account.totalValue} options={{ style: 'currency', currency: 'EUR' }} /> : '—'}
      </TableCell>
      <TableCell className="p-2 text-right">
         <Button variant="ghost" size="icon" asChild>
            <Link href={`/accounts/${account.id}`}><Eye className="h-4 w-4 text-muted-foreground" /></Link>
         </Button>
      </TableCell>
    </TableRow>
  );
};

const AccountGroupSection = ({ title, accounts, colorClass, initialLimit = 5 }: { title: string, accounts: EnrichedAccount[], colorClass: string, initialLimit?: number }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  if (accounts.length === 0) return null;

  const displayedAccounts = isExpanded ? accounts : accounts.slice(0, initialLimit);
  const hasMore = accounts.length > initialLimit;

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-muted-foreground tracking-wide uppercase">{title} ({accounts.length})</h2>
      <Table>
        <TableBody>
          {displayedAccounts.map(account => (
            <AccountRow key={account.id} account={account} colorClass={colorClass} />
          ))}
        </TableBody>
      </Table>
      {hasMore && (
        <Button variant="link" onClick={() => setIsExpanded(!isExpanded)} className="text-primary p-0 h-auto">
          {isExpanded ? 'Mostrar menos' : `Ver los ${accounts.length - initialLimit} más...`}
        </Button>
      )}
    </div>
  );
};

export default function AccountsPage() {
  const { toast } = useToast();
  const { userRole, refreshDataSignature } = useAuth();
  
  const [enrichedAccounts, setEnrichedAccounts] = React.useState<EnrichedAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = React.useState<EnrichedAccount[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const isAdmin = userRole === 'Admin';

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [accounts, orders, teamMembers] = await Promise.all([
          getAccountsFS(),
          getOrdersFS(),
          getTeamMembersFS()
        ]);
        const processedData = await processCarteraData(accounts, orders, teamMembers);
        setEnrichedAccounts(processedData);
        setFilteredAccounts(processedData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los datos de la cartera.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [toast, refreshDataSignature]);
  
  React.useEffect(() => {
    let accountsToFilter = enrichedAccounts;
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      accountsToFilter = accountsToFilter.filter(acc => 
          acc.nombre.toLowerCase().includes(lowercasedFilter) ||
          (acc.cif && acc.cif.toLowerCase().includes(lowercasedFilter)) ||
          (acc.responsableName && acc.responsableName.toLowerCase().includes(lowercasedFilter))
      );
    }
    setFilteredAccounts(accountsToFilter);
  }, [searchTerm, enrichedAccounts]);

  const accountGroups = React.useMemo(() => {
      const groups: Record<AccountGroup, EnrichedAccount[]> = { Activos: [], Potenciales: [], Fallidos: [], Otros: [] };
      for (const account of filteredAccounts) {
        if (groupConfig.Activos.statuses.includes(account.status)) {
          groups.Activos.push(account);
        } else if (groupConfig.Potenciales.statuses.includes(account.status)) {
          groups.Potenciales.push(account);
        } else if (groupConfig.Fallidos.statuses.includes(account.status)) {
          groups.Fallidos.push(account);
        } else {
          groups.Otros.push(account);
        }
      }
      return groups;
  }, [filteredAccounts]);

  const handleAddNewAccount = () => {
    if (!isAdmin) return;
    setIsAccountDialogOpen(true);
  };

  const handleSaveNewAccount = async (data: AccountFormValues) => {
    if (!isAdmin) return;
    setIsLoading(true); 
    try {
      await addAccountFS(data);
      refreshDataSignature();
      toast({ title: "¡Cuenta Añadida!", description: `La cuenta "${data.name}" ha sido añadida.` });
      setIsAccountDialogOpen(false);
    } catch (error) {
      console.error("Error saving new account:", error);
      toast({ title: "Error al Guardar", description: "No se pudo añadir la nueva cuenta.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-headline font-semibold">Cartera de Cuentas</h1>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative flex-grow w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cuenta, responsable o CIF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
               {isAdmin && (
                <Button onClick={handleAddNewAccount} disabled={isLoading} className="w-full sm:w-auto">
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cuenta
                </Button>
              )}
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[35%] p-2 font-normal text-xs text-muted-foreground">CUENTA</TableHead>
                    <TableHead className="w-[25%] p-2 font-normal text-xs text-muted-foreground">RESPONSABLE</TableHead>
                    <TableHead className="w-[20%] p-2 font-normal text-xs text-muted-foreground">ESTADO</TableHead>
                    <TableHead className="w-[15%] p-2 font-normal text-xs text-muted-foreground text-right">VALOR</TableHead>
                    <TableHead className="w-[5%] p-2 font-normal text-xs text-muted-foreground text-right">ACC.</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
              
              <AccountGroupSection title="Activos" accounts={accountGroups.Activos} colorClass={groupConfig.Activos.colorClass} />
              <AccountGroupSection title="Potenciales" accounts={accountGroups.Potenciales} colorClass={groupConfig.Potenciales.colorClass} />
              <AccountGroupSection title="Fallidos" accounts={accountGroups.Fallidos} colorClass={groupConfig.Fallidos.colorClass} />
              <AccountGroupSection title="Otros" accounts={accountGroups.Otros} colorClass={groupConfig.Otros.colorClass} />

              {!isLoading && filteredAccounts.length === 0 && (
                 <div className="text-center py-12 text-muted-foreground">
                    <p>No se encontraron cuentas que coincidan con la búsqueda.</p>
                 </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <AccountDialog
          account={null} 
          isOpen={isAccountDialogOpen}
          onOpenChange={setIsAccountDialogOpen}
          onSave={handleSaveNewAccount}
          allAccounts={enrichedAccounts} 
        />
      )}
    </div>
  );
}
