
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Account, Order, UserRole, EnrichedAccount, OrderStatus } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Loader2, MapPin, Eye, MoreHorizontal, ChevronRight, Send, CheckCircle } from "lucide-react";
import AccountDialog, { type AccountFormValues } from "@/components/app/account-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import StatusBadge from "@/components/app/status-badge";
import Link from "next/link";
import { getAccountsFS, addAccountFS, deleteAccountFS } from "@/services/account-service";
import { getOrdersFS } from "@/services/order-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { processCarteraData } from "@/services/cartera-service";
import { format, isValid, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { cn } from "@/lib/utils";


const LeadScoreBadge: React.FC<{ score: number }> = ({ score }) => {
    const scoreColor = score > 70 ? 'bg-green-500' : score > 40 ? 'bg-yellow-500 text-black' : 'bg-red-500';
    return (
        <div className="flex items-center gap-2">
            <span className={cn("inline-block w-3 h-3 rounded-full", scoreColor)}></span>
            <span className="font-semibold">{score.toFixed(0)}</span>
        </div>
    );
};

const getInteractionType = (interaction: Order): string => {
    const { status, nextActionType, failureReasonType } = interaction;
    if (status === 'Programada') return "Visita Programada";
    if (status === 'Seguimiento') return `Seguimiento (${nextActionType || 'N/D'})`;
    if (status === 'Fallido') return `Visita Fallida (${failureReasonType || 'N/D'})`;
    
    if (status === 'Completado') {
        if (nextActionType || failureReasonType) {
            return `Tarea Completada`;
        }
        return `Interacción Completada`;
    }
    
    return `Pedido (${status})`;
}

export default function AccountsPage() {
  const { toast } = useToast();
  const { userRole, refreshDataSignature } = useAuth();
  
  const [enrichedAccounts, setEnrichedAccounts] = React.useState<EnrichedAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = React.useState<EnrichedAccount[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
  const [accountToDelete, setAccountToDelete] = React.useState<Account | null>(null);
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [cityFilter, setCityFilter] = React.useState("");
  const [expandedAccountId, setExpandedAccountId] = React.useState<string | null>(null);

  const isAdmin = userRole === 'Admin';
  const canEditAccounts = userRole === 'Admin' || userRole === 'SalesRep';


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
          (acc.cif && acc.cif.toLowerCase().includes(lowercasedFilter))
      );
    }
    
    if (cityFilter) {
      const lowercasedCityFilter = cityFilter.toLowerCase();
      accountsToFilter = accountsToFilter.filter(acc =>
        (acc.ciudad && acc.ciudad.toLowerCase().includes(lowercasedCityFilter))
      );
    }

    setFilteredAccounts(accountsToFilter);
  }, [searchTerm, cityFilter, enrichedAccounts]);


  const handleAddNewAccount = () => {
    if (!isAdmin) return;
    setIsAccountDialogOpen(true);
  };

  const handleSaveNewAccount = async (data: AccountFormValues) => {
    if (!isAdmin) return;
    setIsLoading(true); 
    try {
      await addAccountFS(data);
      refreshDataSignature(); // This will re-trigger the main data load
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
      refreshDataSignature(); // Re-trigger data load
      toast({ title: "¡Cuenta Eliminada!", description: `La cuenta "${accountToDelete.nombre}" ha sido eliminada.`, variant: "destructive" });
      setAccountToDelete(null);
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({ title: "Error al Eliminar", description: "No se pudo eliminar la cuenta.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const isOpenTask = (status: OrderStatus) => ['Programada', 'Seguimiento', 'Fallido'].includes(status);

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
            <Eye className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Cartera de Cuentas</h1>
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
          <CardDescription>Visualiza el estado de tus cuentas, próximas acciones y prioridades. Haz clic en una cuenta para ver más detalles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Input
              placeholder="Buscar (Nombre, CIF)..."
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
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando cartera...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[25%]">Cuenta</TableHead>
                    <TableHead className="w-[10%]">Estatus</TableHead>
                    <TableHead className="w-[10%]">Ubicación</TableHead>
                    <TableHead className="w-[10%]">Últ. Inter.</TableHead>
                    <TableHead className="w-[15%]">Próx. Acción</TableHead>
                    <TableHead className="w-[15%]">Responsable</TableHead>
                    <TableHead className="w-[10%]">Lead Score</TableHead>
                    <TableHead className="text-right w-[5%]">Acc.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.length > 0 ? filteredAccounts.map((account) => (
                    <React.Fragment key={account.id}>
                        <TableRow>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setExpandedAccountId(expandedAccountId === account.id ? null : account.id)}>
                                    <ChevronRight className={cn("h-4 w-4 transition-transform", expandedAccountId === account.id && "rotate-90")}/>
                                </Button>
                                <Link href={`/accounts/${account.id}`} className="hover:underline text-primary">
                                  {account.nombre}
                                </Link>
                            </div>
                          </TableCell>
                          <TableCell><StatusBadge type="account" status={account.status} /></TableCell>
                          <TableCell>{account.ciudad || 'N/D'}</TableCell>
                          <TableCell>{account.lastInteractionDate ? format(account.lastInteractionDate, 'dd/MM/yy') : '—'}</TableCell>
                          <TableCell>{account.nextInteraction?.nextActionType || '—'}</TableCell>
                          <TableCell>{account.responsableName || 'N/D'}</TableCell>
                          <TableCell><LeadScoreBadge score={account.leadScore} /></TableCell>
                          <TableCell className="text-right">
                             <Button variant="ghost" size="icon" asChild>
                                <Link href={`/accounts/${account.id}`}><Eye className="h-4 w-4" /></Link>
                             </Button>
                          </TableCell>
                        </TableRow>
                        {expandedAccountId === account.id && (
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableCell colSpan={8} className="p-0">
                                    <div className="p-4">
                                        <h4 className="text-sm font-semibold mb-2">Historial de Interacciones para {account.nombre}</h4>
                                        {account.interactions.length > 0 ? (
                                            <Table>
                                                <TableHeader>
                                                  <TableRow>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Tipo / Próx. Acción</TableHead>
                                                    <TableHead className="text-right">Valor</TableHead>
                                                    <TableHead className="text-center">Estado</TableHead>
                                                    <TableHead>Comercial</TableHead>
                                                    <TableHead>Acciones</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {account.interactions.slice(0, 5).map(interaction => (
                                                        <TableRow key={interaction.id}>
                                                            <TableCell>{interaction.createdAt && isValid(parseISO(interaction.createdAt)) ? format(parseISO(interaction.createdAt), "dd/MM/yy HH:mm") : 'N/D'}</TableCell>
                                                            <TableCell>{getInteractionType(interaction)}</TableCell>
                                                            <TableCell className="text-right"><FormattedNumericValue value={interaction.value} options={{ style: 'currency', currency: 'EUR' }} placeholder="—" /></TableCell>
                                                            <TableCell className="text-center"><StatusBadge type="order" status={interaction.status} /></TableCell>
                                                            <TableCell>{interaction.salesRep}</TableCell>
                                                            <TableCell>
                                                               {isOpenTask(interaction.status) ? (
                                                                    <Button asChild variant="outline" size="sm">
                                                                    <Link href={`/order-form?originatingTaskId=${interaction.id}`}><Send className="mr-1 h-3 w-3" /> Registrar</Link>
                                                                    </Button>
                                                               ) : (
                                                                    <Button variant="ghost" size="sm" disabled><CheckCircle className="mr-1 h-3 w-3 text-green-500" /> Gestionado</Button>
                                                               )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        ) : <p className="text-sm text-muted-foreground text-center p-4">No hay interacciones registradas.</p>}
                                         {account.interactions.length > 5 && <p className="text-xs text-center text-muted-foreground mt-2">Mostrando 5 de {account.interactions.length} interacciones. Ver todas en la ficha de la cuenta.</p>}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </React.Fragment>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
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
                <p className="text-xs text-muted-foreground">Total de cuentas mostradas: {filteredAccounts.length} de {enrichedAccounts.length}</p>
            </CardFooter>
        )}
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
