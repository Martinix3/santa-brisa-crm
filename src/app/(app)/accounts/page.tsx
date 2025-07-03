
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { EnrichedAccount, TeamMember, Order, NextActionType, UserRole, OrderStatus, FollowUpResultFormValues } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Loader2, Search, AlertTriangle, ChevronDown, Trash2 } from "lucide-react";
import AccountDialog, { type AccountFormValues } from "@/components/app/account-dialog";
import { getAccountsFS, addAccountFS, updateAccountFS, deleteAccountFS } from "@/services/account-service";
import { getOrdersFS, updateOrderFS } from "@/services/order-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { processCarteraData } from "@/services/cartera-service";
import AccountTableRow from "@/components/app/account-table-row";
import { startOfDay, endOfDay, isBefore, isEqual, parseISO, isValid, format } from 'date-fns';
import { db } from "@/lib/firebase";
import { runTransaction, doc, collection } from "firebase/firestore";
import FollowUpResultDialog from "@/components/app/follow-up-result-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";


type BucketFilter = "Todos" | "Vencidas" | "Para Hoy" | "Pendientes";
type SortOption = "leadScore_desc" | "nextAction_asc" | "lastInteraction_desc";

export default function AccountsPage() {
  const { toast } = useToast();
  const { userRole, teamMember, dataSignature, refreshDataSignature } = useAuth();
  
  const [enrichedAccounts, setEnrichedAccounts] = React.useState<EnrichedAccount[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = React.useState(false);
  const [currentTask, setCurrentTask] = React.useState<Order | null>(null);
  const [accountToDelete, setAccountToDelete] = React.useState<EnrichedAccount | null>(null);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [responsibleFilter, setResponsibleFilter] = React.useState("Todos");
  const [bucketFilter, setBucketFilter] = React.useState<BucketFilter>("Todos");
  const [sortOption, setSortOption] = React.useState<SortOption>("leadScore_desc");
  
  const isAdmin = userRole === 'Admin';
  const salesAndAdminMembers = teamMembers.filter(m => m.role === 'Admin' || m.role === 'SalesRep');

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [accounts, orders, members] = await Promise.all([
          getAccountsFS(),
          getOrdersFS(),
          getTeamMembersFS(['SalesRep', 'Admin', 'Clavadista'])
        ]);
        const processedData = await processCarteraData(accounts, orders, members);
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
  }, [toast, dataSignature]);
  
  const { activeAccounts, potentialAccounts, failedAccounts } = React.useMemo(() => {
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
        if (acc.status !== 'Programada' && acc.status !== 'Seguimiento') return false;
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
                return dateB.getTime() - dateA.getTime();
            }
            case 'leadScore_desc':
            default:
                return b.leadScore - a.leadScore;
        }
    };
    
    const baseFiltered = enrichedAccounts.filter(applyFilters).filter(applyResponsibleFilter).filter(applyBucketFilter);
    const hasOrder = (acc: EnrichedAccount) => ['Activo', 'Repetición'].includes(acc.status);
    const isPotential = (acc: EnrichedAccount) => ['Programada', 'Seguimiento'].includes(acc.status);

    return {
      activeAccounts: baseFiltered.filter(acc => hasOrder(acc)).sort(sortFunction),
      potentialAccounts: baseFiltered.filter(acc => isPotential(acc)).sort(sortFunction),
      failedAccounts: baseFiltered.filter(acc => !hasOrder(acc) && !isPotential(acc)).sort(sortFunction),
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

  const handleOpenFollowUpDialog = (task: Order) => {
    setCurrentTask(task);
    setIsFollowUpDialogOpen(true);
  };
  
  const handleSaveFollowUp = async (data: FollowUpResultFormValues, originalTask: Order) => {
    try {
        await runTransaction(db, async (transaction) => {
            const originalTaskRef = doc(db, 'orders', originalTask.id);
            transaction.update(originalTaskRef, { status: "Completado" as OrderStatus, lastUpdated: new Date() });
            
            const newOrderRef = doc(collection(db, 'orders'));
            
            const subtotal = (data.numberOfUnits || 0) * (data.unitPrice || 0);
            const totalValue = subtotal * 1.21;
            
            let salesRepName = originalTask.salesRep;
            if (data.assignedSalesRepId && salesRepName !== teamMember?.name) {
                const assignedRep = teamMembers.find(m => m.id === data.assignedSalesRepId);
                if(assignedRep) salesRepName = assignedRep.name;
            }

            const newInteractionData: any = {
                clientName: originalTask.clientName,
                accountId: originalTask.accountId || null,
                createdAt: new Date(),
                lastUpdated: new Date(),
                salesRep: salesRepName,
                clavadistaId: originalTask.clavadistaId || null,
                clientStatus: "existing",
                originatingTaskId: originalTask.id,
                notes: data.notes || null,
            };

            if (data.outcome === "successful") {
                newInteractionData.status = 'Confirmado';
                newInteractionData.visitDate = new Date();
                newInteractionData.products = ["Santa Brisa 750ml"];
                newInteractionData.numberOfUnits = data.numberOfUnits;
                newInteractionData.unitPrice = data.unitPrice;
                newInteractionData.value = totalValue;
                newInteractionData.paymentMethod = data.paymentMethod;
            } else if (data.outcome === "follow-up") {
                newInteractionData.status = 'Seguimiento';
                newInteractionData.nextActionType = data.nextActionType;
                newInteractionData.nextActionCustom = data.nextActionType === 'Opción personalizada' ? data.nextActionCustom : null;
                newInteractionData.nextActionDate = data.nextActionDate ? format(data.nextActionDate, 'yyyy-MM-dd') : null;
                newInteractionData.visitDate = null;
            } else if (data.outcome === "failed") {
                newInteractionData.status = 'Fallido';
                newInteractionData.visitDate = new Date();
                newInteractionData.failureReasonType = data.failureReasonType;
                newInteractionData.failureReasonCustom = data.failureReasonType === 'Otro (especificar)' ? data.failureReasonCustom : null;
            }
            transaction.set(newOrderRef, newInteractionData);
        });
        toast({ title: "Interacción Registrada", description: "Se ha guardado el resultado y actualizado la cartera."});
        refreshDataSignature();
    } catch(err) {
        console.error("Transaction failed: ", err);
        toast({title: "Error en la transacción", description: "No se pudo guardar el resultado.", variant: "destructive"});
    } finally {
        setIsFollowUpDialogOpen(false);
        setCurrentTask(null);
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
      <header>
        <h1 className="text-3xl font-headline font-semibold">Cuentas y Seguimiento</h1>
        <CardDescription>Gestiona tus cuentas, programa visitas y haz seguimiento de tus tareas comerciales.</CardDescription>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
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
                <div className="flex-grow flex justify-end gap-2 w-full sm:w-auto">
                  {isAdmin && (
                    <Button onClick={handleAddNewAccount} disabled={isLoading}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cuenta Manual
                    </Button>
                  )}
               </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : (
                <table className="min-w-full">
                    <thead>
                        <tr className="border-b-0">
                        <th className="w-6 p-1 text-left"></th> 
                        <th className="w-[20%] text-left font-medium text-muted-foreground p-2">Cuenta</th>
                        <th className="w-[15%] text-left font-medium text-muted-foreground p-2">Responsable</th>
                        <th className="w-[12%] text-center font-medium text-muted-foreground p-2">Estado</th>
                        <th className="w-[20%] text-left font-medium text-muted-foreground p-2">Próxima Acción</th>
                        <th className="w-[10%] text-center font-medium text-muted-foreground p-2">Lead Score</th>
                        <th className="w-[10%] text-left font-medium text-muted-foreground p-2">Ciudad</th>
                        <th className="w-[13%] text-right pr-4 font-medium text-muted-foreground p-2">Acciones</th>
                        </tr>
                    </thead>
                    <AccountGroup title="Activos" accounts={activeAccounts} teamMembers={teamMembers} onResponsibleUpdate={handleResponsibleUpdate} onOpenFollowUpDialog={handleOpenFollowUpDialog} onDeleteAccount={handleDeleteAccountClick} />
                    <AccountGroup title="Potenciales" accounts={potentialAccounts} teamMembers={teamMembers} onResponsibleUpdate={handleResponsibleUpdate} onOpenFollowUpDialog={handleOpenFollowUpDialog} onDeleteAccount={handleDeleteAccountClick} />
                    <AccountGroup title="Fallidos" accounts={failedAccounts} teamMembers={teamMembers} onResponsibleUpdate={handleResponsibleUpdate} onOpenFollowUpDialog={handleOpenFollowUpDialog} onDeleteAccount={handleDeleteAccountClick}/>
                </table>
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
      
      {currentTask && (
          <FollowUpResultDialog
            order={currentTask}
            isOpen={isFollowUpDialogOpen}
            onOpenChange={setIsFollowUpDialogOpen}
            onSave={handleSaveFollowUp}
            allTeamMembers={teamMembers}
            currentUser={teamMember}
            currentUserRole={userRole}
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
                <AlertDialogAction onClick={confirmDeleteAccount} variant="destructive">Sí, eliminar todo</AlertDialogAction>
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
  onOpenFollowUpDialog: (task: Order) => void;
  onDeleteAccount: (account: EnrichedAccount) => void;
}

const AccountGroup: React.FC<AccountGroupProps> = ({ title, accounts, teamMembers, onResponsibleUpdate, onOpenFollowUpDialog, onDeleteAccount }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const visibleAccounts = isExpanded ? accounts : accounts.slice(0, 5);

    if (accounts.length === 0) return null;

    return (
        <tbody className="group/tbody">
            <tr className="bg-muted/30 hover:bg-muted/30">
                <td colSpan={8} className="p-0">
                   <div className="py-3 px-2">
                        <h3 className="text-lg font-semibold text-gray-700">{title} ({accounts.length})</h3>
                   </div>
                </td>
            </tr>
            {visibleAccounts.map(account => (
                <AccountTableRow 
                    key={account.id} 
                    account={account}
                    allTeamMembers={teamMembers}
                    onResponsibleUpdate={onResponsibleUpdate}
                    onOpenFollowUpDialog={onOpenFollowUpDialog}
                    onDeleteAccount={onDeleteAccount}
                />
            ))}
            {accounts.length > 5 && (
                 <tr className="bg-transparent hover:bg-transparent">
                    <td colSpan={8} className="text-center py-2">
                        <Button variant="link" onClick={() => setIsExpanded(!isExpanded)}>
                            {isExpanded ? 'Ver menos' : `Ver ${accounts.length - 5} más...`}
                        </Button>
                    </td>
                </tr>
            )}
        </tbody>
    )
}
