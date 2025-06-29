
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { EnrichedAccount, TeamMember, Order, NextActionType } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Loader2, Search, AlertTriangle, ChevronDown } from "lucide-react";
import AccountDialog, { type AccountFormValues } from "@/components/app/account-dialog";
import { getAccountsFS, addAccountFS, updateAccountFS } from "@/services/account-service";
import { getOrdersFS, updateOrderFS } from "@/services/order-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { processCarteraData } from "@/services/cartera-service";
import AccountTableRow from "@/components/app/account-table-row";
import { startOfDay, endOfDay, isBefore, isEqual, parseISO, isValid, format } from 'date-fns';

type BucketFilter = "Todos" | "Vencidas" | "Para Hoy" | "Pendientes";

export default function AccountsPage() {
  const { toast } = useToast();
  const { userRole, teamMember, refreshDataSignature } = useAuth();
  
  const [enrichedAccounts, setEnrichedAccounts] = React.useState<EnrichedAccount[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
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
          getTeamMembersFS(['SalesRep', 'Admin'])
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

    return {
      activeAccounts: baseFiltered.filter(acc => ['Pedido', 'Repetición'].includes(acc.status)),
      potentialAccounts: baseFiltered.filter(acc => ['Programada', 'Seguimiento'].includes(acc.status)),
      failedAccounts: baseFiltered.filter(acc => acc.status === 'Fallido'),
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

  const handleTaskUpdate = async (interactionId: string, newAction: NextActionType, newDate?: Date) => {
      try {
          await updateOrderFS(interactionId, { 
              nextActionType: newAction,
              nextActionDate: newDate ? format(newDate, 'yyyy-MM-dd') : undefined
          });
          refreshDataSignature();
          toast({ title: "Tarea Actualizada", description: "La próxima acción ha sido actualizada." });
      } catch (error) {
          console.error("Error updating task:", error);
          toast({ title: "Error al Actualizar Tarea", description: "No se pudo modificar la tarea.", variant: "destructive" });
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
                <Table className="min-w-full">
                    <TableHeader>
                        <TableRow className="border-b-0">
                        <TableHead className="w-6 p-1"></TableHead> 
                        <TableHead className="w-[20%]">Cuenta</TableHead>
                        <TableHead className="w-[15%]">Responsable</TableHead>
                        <TableHead className="w-[12%] text-center">Estado</TableHead>
                        <TableHead className="w-[20%]">Próxima Acción</TableHead>
                        <TableHead className="w-[10%] text-center">Lead Score</TableHead>
                        <TableHead className="w-[10%]">Ciudad</TableHead>
                        <TableHead className="w-[13%] text-right pr-4">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <AccountGroup title="Potenciales" accounts={potentialAccounts} teamMembers={teamMembers} onResponsibleUpdate={handleResponsibleUpdate} onTaskUpdate={handleTaskUpdate} />
                    <AccountGroup title="Activos" accounts={activeAccounts} teamMembers={teamMembers} onResponsibleUpdate={handleResponsibleUpdate} onTaskUpdate={handleTaskUpdate} />
                    <AccountGroup title="Fallidos" accounts={failedAccounts} teamMembers={teamMembers} onResponsibleUpdate={handleResponsibleUpdate} onTaskUpdate={handleTaskUpdate} />
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
    </div>
  );
}

interface AccountGroupProps {
  title: string;
  accounts: EnrichedAccount[];
  teamMembers: TeamMember[];
  onResponsibleUpdate: (accountId: string, newResponsibleId: string | null) => Promise<void>;
  onTaskUpdate: (interactionId: string, newAction: NextActionType, newDate?: Date) => Promise<void>;
}

const AccountGroup: React.FC<AccountGroupProps> = ({ title, accounts, teamMembers, onResponsibleUpdate, onTaskUpdate }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const visibleAccounts = isExpanded ? accounts : accounts.slice(0, 5);

    if (accounts.length === 0) return null;

    return (
        <tbody className="group/tbody">
            <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="p-0">
                   <div className="py-3 px-2">
                        <h3 className="text-lg font-semibold text-gray-700">{title} ({accounts.length})</h3>
                   </div>
                </TableCell>
            </TableRow>
            {visibleAccounts.map(account => (
                <AccountTableRow 
                    key={account.id} 
                    account={account}
                    allTeamMembers={teamMembers}
                    onResponsibleUpdate={onResponsibleUpdate}
                    onTaskUpdate={onTaskUpdate}
                />
            ))}
            {accounts.length > 5 && (
                 <TableRow className="bg-transparent hover:bg-transparent">
                    <TableCell colSpan={8} className="text-center py-2">
                        <Button variant="link" onClick={() => setIsExpanded(!isExpanded)}>
                            {isExpanded ? 'Ver menos' : `Ver ${accounts.length - 5} más...`}
                        </Button>
                    </TableCell>
                </TableRow>
            )}
        </tbody>
    )
}
