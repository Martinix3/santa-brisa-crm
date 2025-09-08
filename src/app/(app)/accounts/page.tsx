
"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import type { EnrichedAccount, TeamMember, Order, AccountStatus } from "@/types";
import { startOfDay, endOfDay, isBefore, isEqual, parseISO, isValid } from 'date-fns';
import { Loader2, Search, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCarteraBundle } from "@/app/(app)/accounts/actions";
import { AccountRow } from "@/features/accounts/components/account-row";
import { AccountHubDialog } from "@/features/accounts/components/account-hub-dialog";
import { TIPOS_CUENTA, type TipoCuenta } from "@ssot";

const AccountGroup = ({ title, accounts, expandedRowId, onToggleExpand, onOpenHub }: { title: string; accounts: EnrichedAccount[]; expandedRowId: string | null; onToggleExpand: (id: string) => void; onOpenHub: (accountId: string, mode: 'registrar' | 'editar' | 'pedido') => void; }) => {
    if (accounts.length === 0) return null;
    return (
        <>
            <TableRow className="bg-muted/30 hover:bg-muted/30 sticky top-0 z-10">
                <TableCell colSpan={8} className="font-semibold text-gray-800 p-2">
                   {title} ({accounts.length})
                </TableCell>
            </TableRow>
            {accounts.map(account => (
                <AccountRow
                    key={account.id}
                    account={account}
                    isExpanded={expandedRowId === account.id}
                    onToggleExpand={() => onToggleExpand(account.id)}
                    onOpenHub={onOpenHub}
                />
            ))}
        </>
    )
};


export default function AccountsPage() {
  const { userRole, teamMember } = useAuth();
  
  const [enrichedAccounts, setEnrichedAccounts] = React.useState<EnrichedAccount[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Dialog state
  const [hubOpen, setHubOpen] = React.useState(false);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | null>(null);
  const [hubMode, setHubMode] = React.useState<'registrar' | 'editar' | 'pedido'>('registrar');


  // Filters
  const [searchTerm, setSearchTerm] = React.useState("");
  const [responsibleFilter, setResponsibleFilter] = React.useState("Todos");
  const [bucketFilter, setBucketFilter] = React.useState<BucketFilter>("Todos");
  const [sortOption, setSortOption] = React.useState<SortOption>("leadScore_desc");
  const [typeFilter, setTypeFilter] = React.useState<TipoCuenta | "Todos">('Todos');
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);
  
  const isAdmin = userRole === 'Admin';
  const salesAndAdminMembers = teamMembers.filter(m => m.role === 'Admin' || m.role === 'Ventas');

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const { enrichedAccounts, teamMembers: members } = await getCarteraBundle();
        setEnrichedAccounts(enrichedAccounts);
        setTeamMembers(members);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);
  
  const { activeAccounts, potentialAccounts, pendingAccounts, failedAccounts, inactiveAccounts } = React.useMemo(() => {
    const todayStart = startOfDay(new Date());

    const sortFunction = (a: EnrichedAccount, b: EnrichedAccount) => {
        switch (sortOption) {
            case 'nextAction_asc':
                const dateA = a.nextInteraction?.status === 'Programada' ? (a.nextInteraction.visitDate ? parseISO(a.nextInteraction.visitDate) : null) : (a.nextInteraction?.nextActionDate ? parseISO(a.nextInteraction.nextActionDate) : null);
                const dateB = b.nextInteraction?.status === 'Programada' ? (b.nextInteraction.visitDate ? parseISO(b.nextInteraction.visitDate) : null) : (b.nextInteraction?.nextActionDate ? parseISO(b.nextInteraction.nextActionDate) : null);
                if (!dateA) return 1; if (!dateB) return -1;
                return dateA.getTime() - dateB.getTime();
            case 'lastInteraction_desc':
                const aDate = a.lastInteractionDate ? new Date(a.lastInteractionDate) : null;
                const bDate = b.lastInteractionDate ? new Date(b.lastInteractionDate) : null;
                if (!aDate) return 1; if (!bDate) return -1;
                return bDate.getTime() - aDate.getTime();
            case 'leadScore_desc':
            default:
                return (b.leadScore ?? 0) - (a.leadScore ?? 0);
        }
    };
    
    const filtered = enrichedAccounts
      .filter(acc => !searchTerm || acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || (acc.city && acc.city.toLowerCase().includes(searchTerm.toLowerCase())))
      .filter(acc => typeFilter === 'Todos' || acc.type === typeFilter)
      .filter(acc => !isAdmin || responsibleFilter === "Todos" || acc.responsableId === responsibleFilter)
      .filter(acc => {
        if (bucketFilter === 'Todos') return true;
        const nextActionDate = acc.nextInteraction?.status === 'Programada' ? (acc.nextInteraction.visitDate ? parseISO(acc.nextInteraction.visitDate) : null) : (acc.nextInteraction?.nextActionDate ? parseISO(acc.nextInteraction.nextActionDate) : null);
        if (!nextActionDate || !isValid(nextActionDate)) return false;
        if (bucketFilter === 'Vencidas') return isBefore(nextActionDate, todayStart);
        if (bucketFilter === 'Para Hoy') return isEqual(startOfDay(nextActionDate), todayStart);
        return false;
      });

    const groups = { activeAccounts: [], potentialAccounts: [], pendingAccounts: [], inactiveAccounts: [], failedAccounts: [] } as Record<string, EnrichedAccount[]>;

    filtered.forEach(acc => {
      switch (acc.status) {
        case 'Activo': case 'Repetición': groups.activeAccounts.push(acc); break;
        case 'Seguimiento': groups.potentialAccounts.push(acc); break;
        case 'Programada': case 'Pendiente': groups.pendingAccounts.push(acc); break;
        case 'Inactivo': groups.inactiveAccounts.push(acc); break;
        case 'Fallido': groups.failedAccounts.push(acc); break;
        default: groups.pendingAccounts.push(acc); break;
      }
    });

    Object.values(groups).forEach(group => group.sort(sortFunction));
    return groups;

  }, [searchTerm, typeFilter, enrichedAccounts, responsibleFilter, bucketFilter, isAdmin, sortOption]);

  const handleOpenHub = (accountId: string, mode: 'registrar' | 'editar' | 'pedido') => {
      setSelectedAccountId(accountId);
      setHubMode(mode);
      setHubOpen(true);
  };
  
  return (
    <div className="space-y-6">
      <header><h1 className="text-3xl font-headline font-semibold">Cuentas y Seguimiento</h1><p className="text-muted-foreground">Gestiona tus cuentas, programa visitas y haz seguimiento de tus tareas comerciales.</p></header>
      <Card className="shadow-subtle">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-4 flex-wrap">
              <div className="relative flex-grow w-full sm:w-auto"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar cuenta, ciudad..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-full sm:max-w-xs"/></div>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TipoCuenta | 'Todos')}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Tipo de Cuenta..." /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos los Tipos</SelectItem>{TIPOS_CUENTA.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select>
              <Select value={bucketFilter} onValueChange={(v) => setBucketFilter(v as BucketFilter)}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filtrar por fecha..." /></SelectTrigger><SelectContent><SelectItem value="Todos">Todas las Tareas</SelectItem><SelectItem value="Vencidas">Vencidas</SelectItem><SelectItem value="Para Hoy">Para Hoy</SelectItem></SelectContent></Select>
               {isAdmin && (<Select value={responsibleFilter} onValueChange={setResponsibleFilter}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filtrar responsable..." /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem>{salesAndAdminMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>)}
               <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}><SelectTrigger className="w-full sm:w-[240px]"><SelectValue placeholder="Ordenar por..." /></SelectTrigger><SelectContent><SelectItem value="leadScore_desc">Prioridad</SelectItem><SelectItem value="nextAction_asc">Fecha Próxima Tarea</SelectItem><SelectItem value="lastInteraction_desc">Fecha Última Interacción</SelectItem></SelectContent></Select>
          </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (<div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
            ) : (
                <Table>
                    <TableHeader><TableRow><TableHead className="w-8"></TableHead><TableHead className="w-[20%]">Cuenta</TableHead><TableHead className="w-[15%]">Responsable</TableHead><TableHead className="w-[20%]">Última Interacción</TableHead><TableHead className="w-[15%]">Próxima Tarea</TableHead><TableHead className="w-[10%] text-right">Valor Total</TableHead><TableHead className="w-[10%] text-center">Estado</TableHead><TableHead className="w-[10%] text-right pr-4">Acciones</TableHead></TableRow></TableHeader>
                    <TableBody>
                        <AccountGroup title="Cuentas Activas y en Repetición" accounts={activeAccounts} expandedRowId={expandedRowId} onToggleExpand={setExpandedRowId} onOpenHub={handleOpenHub}/>
                        <AccountGroup title="Potenciales (en seguimiento)" accounts={potentialAccounts} expandedRowId={expandedRowId} onToggleExpand={setExpandedRowId} onOpenHub={handleOpenHub}/>
                        <AccountGroup title="Pendientes (Nuevas y Programadas)" accounts={pendingAccounts} expandedRowId={expandedRowId} onToggleExpand={setExpandedRowId} onOpenHub={handleOpenHub}/>
                        <AccountGroup title="Cuentas Inactivas" accounts={inactiveAccounts} expandedRowId={expandedRowId} onToggleExpand={setExpandedRowId} onOpenHub={handleOpenHub}/>
                        <AccountGroup title="Fallidos / Descartados" accounts={failedAccounts} expandedRowId={expandedRowId} onToggleExpand={setExpandedRowId} onOpenHub={handleOpenHub}/>
                        {(activeAccounts.length + potentialAccounts.length + pendingAccounts.length + inactiveAccounts.length + failedAccounts.length) === 0 && (<TableRow><TableCell colSpan={8} className="text-center h-24 text-muted-foreground">No se encontraron cuentas.</TableCell></TableRow>)}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
      <AccountHubDialog
        open={hubOpen}
        onOpenChange={setHubOpen}
        accountId={selectedAccountId}
        defaultMode={hubMode}
      />
    </div>
  );
}

type BucketFilter = "Todos" | "Vencidas" | "Para Hoy";
type SortOption = "leadScore_desc" | "nextAction_asc" | "lastInteraction_desc";
