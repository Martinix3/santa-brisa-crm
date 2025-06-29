
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { EnrichedAccount, TeamMember, Order, NextActionType, UserRole, OrderStatus, FollowUpResultFormValues } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Loader2, Search, AlertTriangle, ChevronDown } from "lucide-react";
import AccountDialog, { type AccountFormValues } from "@/components/app/account-dialog";
import { getAccountsFS, addAccountFS, updateAccountFS } from "@/services/account-service";
import { getOrdersFS, updateOrderFS, addOrderFS } from "@/services/order-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { processCarteraData } from "@/services/cartera-service";
import AccountTableRow from "@/components/app/account-table-row";
import { startOfDay, endOfDay, isBefore, isEqual, parseISO, isValid, format } from 'date-fns';
import { db } from "@/lib/firebase";
import { runTransaction, doc, collection } from "firebase/firestore";
import { ADMIN_SELF_REGISTER_VALUE, NO_CLAVADISTA_VALUE } from '@/lib/schemas/order-form-schema';
import FollowUpResultDialog from "@/components/app/follow-up-result-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


type BucketFilter = "Todos" | "Vencidas" | "Para Hoy" | "Pendientes";

export default function AccountsPage() {
  const { toast } = useToast();
  const { userRole, teamMember, refreshDataSignature } = useAuth();
  
  const [enrichedAccounts, setEnrichedAccounts] = React.useState<EnrichedAccount[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = React.useState(false);
  const [currentTask, setCurrentTask] = React.useState<Order | null>(null);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [responsibleFilter, setResponsibleFilter] = React.useState("Todos");
  const [bucketFilter, setBucketFilter] = React.useState<BucketFilter>("Todos");
  
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
  }, [toast, refreshDataSignature]);
  
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
    
    const baseFiltered = enrichedAccounts.filter(applyFilters).filter(applyResponsibleFilter).filter(applyBucketFilter);
    const hasOrder = (acc: EnrichedAccount) => ['Pedido', 'Repetición'].includes(acc.status);
    const isPotential = (acc: EnrichedAccount) => ['Programada', 'Seguimiento'].includes(acc.status);

    return {
      activeAccounts: baseFiltered.filter(acc => hasOrder(acc)),
      potentialAccounts: baseFiltered.filter(acc => isPotential(acc)),
      failedAccounts: baseFiltered.filter(acc => !hasOrder(acc) && !isPotential(acc)),
    };

  }, [searchTerm, enrichedAccounts, responsibleFilter, bucketFilter, isAdmin]);


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
                visitDate: new Date(),
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
            } else if (data.outcome === "failed") {
                newInteractionData.status = 'Fallido';
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
  
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-headline font-semibold">Cartera de Cuentas</h1>
        <CardDescription>Gestiona, prioriza y actúa sobre tu cartera de clientes y leads.</CardDescription>
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
                  className="pl-9"
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
               {isAdmin && (
                <Button onClick={handleAddNewAccount} disabled={isLoading} className="w-full sm:w-auto ml-auto">
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cuenta
                </Button>
              )}
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
                    <AccountGroup title="Activos" accounts={activeAccounts} teamMembers={teamMembers} onResponsibleUpdate={handleResponsibleUpdate} onOpenFollowUpDialog={handleOpenFollowUpDialog}/>
                    <AccountGroup title="Potenciales" accounts={potentialAccounts} teamMembers={teamMembers} onResponsibleUpdate={handleResponsibleUpdate} onOpenFollowUpDialog={handleOpenFollowUpDialog} />
                    <AccountGroup title="Fallidos" accounts={failedAccounts} teamMembers={teamMembers} onResponsibleUpdate={handleResponsibleUpdate} onOpenFollowUpDialog={handleOpenFollowUpDialog}/>
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

    </div>
  );
}

interface AccountGroupProps {
  title: string;
  accounts: EnrichedAccount[];
  teamMembers: TeamMember[];
  onResponsibleUpdate: (accountId: string, newResponsibleId: string | null) => Promise<void>;
  onOpenFollowUpDialog: (task: Order) => void;
}

const AccountGroup: React.FC<AccountGroupProps> = ({ title, accounts, teamMembers, onResponsibleUpdate, onOpenFollowUpDialog }) => {
    const [isExpanded, setIsExpanded] = React.useState(true);
    const visibleAccounts = isExpanded ? accounts : accounts.slice(0, 5);

    if (accounts.length === 0) return null;

    return (
        <tbody className="group/tbody">
            <tr className="hover:bg-transparent">
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
