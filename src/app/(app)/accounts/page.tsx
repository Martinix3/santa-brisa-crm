
"use client";

import * as React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { EnrichedAccount, TeamMember, Order, NextActionType, UserRole, OrderStatus, FollowUpResultFormValues, AccountStatus, Interaction } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Loader2, Search, AlertTriangle, ChevronDown, Trash2 } from "lucide-react";
import AccountDialog, { type AccountFormValues } from "@/components/app/account-dialog";
import { getAccountsFS, addAccountFS, updateAccountFS, deleteAccountFS } from "@/services/account-service";
import { getOrdersFS } from "@/services/order-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { processCarteraData } from "@/services/cartera-service";
import AccountTableRow from "@/components/app/account-table-row";
import { startOfDay, endOfDay, isBefore, isEqual, parseISO, isValid, format } from 'date-fns';
import { db } from "@/lib/firebase";
import { runTransaction, doc, collection } from "firebase/firestore";
import FollowUpResultDialog from "@/components/app/follow-up-result-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AccountHistoryTable from "@/components/app/account-history-table";
import { cn } from "@/lib/utils";
import { saveInteractionFS } from '@/services/interaction-service';


type BucketFilter = "Todos" | "Vencidas" | "Para Hoy" | "Pendientes";
type SortOption = "leadScore_desc" | "nextAction_asc" | "lastInteraction_desc";

export default function AccountsPage() {
  const { toast } = useToast();
  const { userRole, teamMember, dataSignature, refreshDataSignature } = useAuth();
  
  const [enrichedAccounts, setEnrichedAccounts] = React.useState<EnrichedAccount[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
  const [accountToDelete, setAccountToDelete] = React.useState<EnrichedAccount | null>(null);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [responsibleFilter, setResponsibleFilter] = React.useState("Todos");
  const [bucketFilter, setBucketFilter] = React.useState<BucketFilter>("Todos");
  const [sortOption, setSortOption] = React.useState<SortOption>("leadScore_desc");
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);
  
  const isAdmin = userRole === 'Admin';
  const salesAndAdminMembers = teamMembers.filter(m => m.role === 'Admin' || m.role === 'SalesRep');

  const toggleRowExpansion = React.useCallback((accountId: string) => {
    setExpandedRowId(prevId => (prevId === accountId ? null : accountId));
  }, []);

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [accounts, orders, members] = await Promise.all([
          getAccountsFS(),
          getOrdersFS(),
          getTeamMembersFS(['SalesRep', 'Admin', 'Clavadista'])
        ]);
        let processedData = await processCarteraData(accounts, orders, members);

        if (userRole === 'Clavadista' && teamMember?.id) {
            const relevantAccountIds = new Set<string>();
            orders.forEach(order => {
                if (order.clavadistaId === teamMember.id && order.accountId) {
                    relevantAccountIds.add(order.accountId);
                }
            });
            processedData = processedData.filter(acc => relevantAccountIds.has(acc.id));
        }

        setEnrichedAccounts(processedData);
        setTeamMembers(members);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los datos de la cartera.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [toast, dataSignature, userRole, teamMember]);
  
  const { activeAccounts, potentialAccounts, pendingAccounts, failedAccounts, inactiveAccounts } = React.useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const applyFilters = (acc: EnrichedAccount) => {
      if (!searchTerm) return true;
      const lowercasedFilter = searchTerm.toLowerCase();
      return acc.nombre.toLowerCase().includes(lowercasedFilter) ||
             (acc.cif && acc.cif.toLowerCase().includes(lowercasedFilter)) ||
             (acc.responsableName && acc.responsableName.toLowerCase().includes(lowercasedFilter)) ||
             (acc.ciudad && acc.ciudad.toLowerCase().includes(lowercasedFilter));
    };

    const applyResponsibleFilter = (acc: EnrichedAccount) => {
        if (!isAdmin || responsibleFilter === "Todos") return true;
        if (responsibleFilter === "SinAsignar") return !acc.responsableId;
        return acc.responsableId === responsibleFilter;
    };

    const applyBucketFilter = (acc: EnrichedAccount) => {
        if (bucketFilter === 'Todos') return true;
        const validStatusesForBucketFilter: AccountStatus[] = ['Programada', 'Seguimiento'];
        if (!validStatusesForBucketFilter.includes(acc.status)) return false;

        const nextActionDate = acc.nextInteraction?.status === 'Programada'
            ? (acc.nextInteraction.visitDate ? parseISO(acc.nextInteraction.visitDate) : null)
            : (acc.nextInteraction?.nextActionDate ? parseISO(acc.nextInteraction.nextActionDate) : null);
        if (!nextActionDate || !isValid(nextActionDate)) return false;

        if (bucketFilter === 'Vencidas') return isBefore(nextActionDate, todayStart);
        if (bucketFilter === 'Para Hoy') return isEqual(startOfDay(nextActionDate), todayStart);
        if (bucketFilter === 'Pendientes') return nextActionDate > todayEnd;
        return false;
    };

    const sortFunction = (a: EnrichedAccount, b: EnrichedAccount) => {
        switch (sortOption) {
            case 'nextAction_asc': {
                const dateA = a.nextInteraction?.status === 'Programada' ? (a.nextInteraction.visitDate ? parseISO(a.nextInteraction.visitDate) : null) : (a.nextInteraction?.nextActionDate ? parseISO(a.nextInteraction.nextActionDate) : null);
                const dateB = b.nextInteraction?.status === 'Programada' ? (b.nextInteraction.visitDate ? parseISO(b.nextInteraction.visitDate) : null) : (b.nextInteraction?.nextActionDate ? parseISO(b.nextInteraction.nextActionDate) : null);
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                if (!isValid(dateA)) return 1;
                if (!isValid(dateB)) return -1;
                return dateA.getTime() - dateB.getTime();
            }
            case 'lastInteraction_desc': {
                const dateA = a.lastInteractionDate;
                const dateB = b.lastInteractionDate;
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                if (!isValid(dateA)) return 1;
                if (!isValid(dateB)) return -1;
                return dateB.getTime() - a.getTime();
            }
            case 'leadScore_desc':
            default:
                return b.leadScore - a.leadScore;
        }
    };
    
    const baseFiltered = enrichedAccounts.filter(applyFilters).filter(applyResponsibleFilter).filter(applyBucketFilter);
    const hasActiveOrder = (acc: EnrichedAccount) => ['Activo', 'Repetición'].includes(acc.status);
    const isInactive = (acc: EnrichedAccount) => acc.status === 'Inactivo';
    const isPotential = (acc: EnrichedAccount) => acc.status === 'Seguimiento';
    const isPending = (acc: EnrichedAccount) => acc.status === 'Programada' || acc.status === 'Pendiente';
    const isFailed = (acc: EnrichedAccount) => acc.status === 'Fallido';


    return {
      activeAccounts: baseFiltered.filter(acc => hasActiveOrder(acc)).sort(sortFunction),
      potentialAccounts: baseFiltered.filter(acc => isPotential(acc)).sort(sortFunction),
      pendingAccounts: baseFiltered.filter(acc => isPending(acc)).sort(sortFunction),
      failedAccounts: baseFiltered.filter(acc => isFailed(acc)).sort(sortFunction),
      inactiveAccounts: baseFiltered.filter(acc => isInactive(acc)).sort(sortFunction),
    };

  }, [searchTerm, enrichedAccounts, responsibleFilter, bucketFilter, isAdmin, sortOption]);


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
  
  const handleResponsibleUpdate = async (accountId: string, newResponsibleId: string | null) => {
      try {
          await updateAccountFS(accountId, { salesRepId: newResponsibleId === null ? undefined : newResponsibleId });
          refreshDataSignature();
          toast({ title: "Responsable Actualizado", description: "Se ha reasignado la cuenta correctamente." });
      } catch (error) {
          console.error("Error updating responsible:", error);
          toast({ title: "Error al Reasignar", description: "No se pudo actualizar el responsable.", variant: "destructive" });
      }
  };

  const handleDeleteAccountClick = (account: EnrichedAccount) => {
    if (!isAdmin) return;
    setAccountToDelete(account);
  };
  
  const confirmDeleteAccount = async () => {
    if (!isAdmin || !accountToDelete) return;
    setIsLoading(true);
    try {
      await deleteAccountFS(accountToDelete.id);
      toast({
        title: "¡Cuenta Eliminada!",
        description: `La cuenta "${accountToDelete.nombre}" y sus interacciones asociadas han sido eliminadas.`,
        variant: "destructive"
      });
      refreshDataSignature();
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({ title: "Error al Eliminar", description: "No se pudo eliminar la cuenta y sus interacciones.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setAccountToDelete(null);
    }
  };
  
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold">Cuentas y Seguimiento</h1>
          <p className="text-muted-foreground">Gestiona tus cuentas, programa visitas y haz seguimiento de tus tareas comerciales.</p>
        </div>
        {isAdmin && (
          <Button onClick={handleAddNewAccount} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cuenta Manual
          </Button>
        )}
      </header>

      <Card className="shadow-subtle">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-4 flex-wrap">
              <div className="relative flex-grow w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cuenta, CIF, ciudad..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:max-w-xs"
                />
              </div>
              <Select value={bucketFilter} onValueChange={(v) => setBucketFilter(v as BucketFilter)}>
                  <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filtrar por fecha..." /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Todos">Todas las Tareas</SelectItem>
                      <SelectItem value="Vencidas">Vencidas</SelectItem>
                      <SelectItem value="Para Hoy">Para Hoy</SelectItem>
                      <SelectItem value="Pendientes">Pendientes</SelectItem>
                  </SelectContent>
              </Select>
               {isAdmin && (
                  <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filtrar responsable..." /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Todos">Todos los Responsables</SelectItem>
                          <SelectItem value="SinAsignar">Sin Asignar</SelectItem>
                          {salesAndAdminMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
               )}
                <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                    <SelectTrigger className="w-full sm:w-[240px]">
                        <SelectValue placeholder="Ordenar por..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="leadScore_desc">Prioridad (Lead Score)</SelectItem>
                        <SelectItem value="nextAction_asc">Fecha Próxima Tarea</SelectItem>
                        <SelectItem value="lastInteraction_desc">Fecha Última Interacción</SelectItem>
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
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="w-[20%]">Cuenta</TableHead>
                            <TableHead className="w-[15%]">Responsable</TableHead>
                            <TableHead className="w-[20%]">Última Interacción</TableHead>
                            <TableHead className="w-[15%]">Próxima Tarea</TableHead>
                            <TableHead className="w-[10%] text-right">Valor</TableHead>
                            <TableHead className="w-[10%] text-center">Prioridad</TableHead>
                            <TableHead className="w-[10%] text-right pr-4">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <AccountGroup title="Cuentas Activas y en Repetición" accounts={activeAccounts} teamMembers={teamMembers} onResponsibleUpdate={handleResponsibleUpdate} onDeleteAccount={handleDeleteAccountClick} groupColor="bg-emerald-500" expandedRowId={expandedRowId} onToggleExpand={toggleRowExpansion} />
                        <AccountGroup title="Potenciales (en seguimiento)" accounts={potentialAccounts} teamMembers={teamMembers} onResponsibleUpdate={handleResponsibleUpdate} onDeleteAccount={handleDeleteAccountClick} groupColor="bg-amber-500" expandedRowId={expandedRowId} onToggleExpand={toggleRowExpansion} />
                        <AccountGroup title="Pendientes (Nuevas y Programadas)" accounts={pendingAccounts} teamMembers={teamMembers} onResponsibleUpdate={handleResponsibleUpdate} onDeleteAccount={handleDeleteAccountClick} groupColor="bg-sky-500" expandedRowId={expandedRowId} onToggleExpand={toggleRowExpansion} />
                        <AccountGroup title="Cuentas Inactivas" accounts={inactiveAccounts} teamMembers={teamMembers} onResponsibleUpdate={handleResponsibleUpdate} onDeleteAccount={handleDeleteAccountClick} groupColor="bg-orange-500" expandedRowId={expandedRowId} onToggleExpand={toggleRowExpansion}/>
                        <AccountGroup title="Fallidos / Descartados" accounts={failedAccounts} teamMembers={teamMembers} onResponsibleUpdate={handleResponsibleUpdate} onDeleteAccount={handleDeleteAccountClick} groupColor="bg-rose-500" expandedRowId={expandedRowId} onToggleExpand={toggleRowExpansion}/>
                        
                        {(activeAccounts.length + potentialAccounts.length + pendingAccounts.length + inactiveAccounts.length + failedAccounts.length) === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                    No se encontraron cuentas con los filtros actuales.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            )}
          </div>
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
      
      {accountToDelete && (
        <AlertDialog open={!!accountToDelete} onOpenChange={(open) => !open && setAccountToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente la cuenta <strong className="text-foreground">"{accountToDelete.nombre}"</strong> y todas sus interacciones asociadas.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setAccountToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button onClick={confirmDeleteAccount} className={cn(buttonVariants({ variant: "destructive" }))}>Sí, eliminar todo</Button>
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}

interface AccountGroupProps {
  title: string;
  accounts: EnrichedAccount[];
  teamMembers: TeamMember[];
  onResponsibleUpdate: (accountId: string, newResponsibleId: string | null) => Promise<void>;
  onDeleteAccount: (account: EnrichedAccount) => void;
  groupColor: string;
  expandedRowId: string | null;
  onToggleExpand: (accountId: string) => void;
}

const AccountGroup: React.FC<AccountGroupProps> = ({ title, accounts, teamMembers, onResponsibleUpdate, onDeleteAccount, groupColor, expandedRowId, onToggleExpand }) => {
    
    if (accounts.length === 0) return null;

    return (
        <>
            <TableRow className="bg-muted/30 hover:bg-muted/30 sticky top-0 z-10">
                <TableCell colSpan={7} className="p-0">
                   <div className="py-2 px-2 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <div className={cn("w-2 h-6 rounded-r-full", groupColor)}></div>
                           <h3 className="text-base font-semibold text-gray-800">{title} ({accounts.length})</h3>
                        </div>
                   </div>
                </TableCell>
            </TableRow>
            {accounts.map(account => (
                <React.Fragment key={account.id}>
                    <AccountTableRow 
                        account={account}
                        allTeamMembers={teamMembers}
                        onResponsibleUpdate={onResponsibleUpdate}
                        onDeleteAccount={onDeleteAccount}
                        isExpanded={expandedRowId === account.id}
                        onToggleExpand={() => onToggleExpand(account.id)}
                    />
                     {expandedRowId === account.id && (
                        <TableRow className="bg-background hover:bg-background">
                            <TableCell colSpan={7} className="p-0">
                                <AccountHistoryTable interactions={account.interactions} />
                            </TableCell>
                        </TableRow>
                    )}
                </React.Fragment>
            ))}
        </>
    )
}
