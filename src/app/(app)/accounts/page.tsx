
"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { EnrichedAccount, TeamMember, Order, AccountStatus } from "@/types";
import { processCarteraData } from "@/services/cartera-service";
import { startOfDay, endOfDay, isBefore, isEqual, parseISO, isValid } from 'date-fns';
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Loader2, Search, PlusCircle, ChevronDown, Eye } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import AccountHistoryTable from "@/components/app/account-history-table";
import { InteractionDialog } from "@/components/app/interaction-dialog";
import { getAccountsAction } from "@/services/server/account-actions";
import { TIPOS_CUENTA, type TipoCuenta } from "@ssot";

function AccountTableRow({ account, isExpanded, onToggleExpand }: { account: EnrichedAccount; isExpanded: boolean; onToggleExpand: () => void; }) {
    const [isInteractionDialogOpen, setIsInteractionDialogOpen] = React.useState(false);

    const nextActionDate = account.nextInteraction?.status === 'Programada'
        ? (account.nextInteraction.visitDate ? parseISO(account.nextInteraction.visitDate) : null)
        : (account.nextInteraction?.nextActionDate ? parseISO(account.nextInteraction.nextActionDate) : null);
    
    const lastInteractionDate = account.lastInteractionDate ? new Date(account.lastInteractionDate) : null;
    
    return (
      <>
        <TableRow
          data-state={isExpanded ? 'selected' : ''}
          className="cursor-pointer"
          onClick={onToggleExpand}
        >
          <TableCell className="font-medium">
            <div className="flex items-center gap-2">
               <ChevronDown
                className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
              />
              <div className="flex flex-col">
                <Link
                  href={`/accounts/${account.id}`}
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => e.stopPropagation()}
                  className="hover:underline text-primary font-semibold"
                >
                  {account.nombre}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {account.city || account.ciudad || 'Ubicación no especificada'}
                </p>
              </div>
            </div>
          </TableCell>
          <TableCell>{account.responsableName || <span className="text-muted-foreground">Sin Asignar</span>}</TableCell>
          <TableCell className="text-xs">
            {(() => {
              const last = account.interactions?.[0]; 
              const lastNote = last?.notes || null;
              return (
                <>
                  <p className="truncate max-w-[150px]" title={lastNote || undefined}>
                    {lastNote || "Sin interacciones"}
                  </p>
                  {lastInteractionDate && isValid(lastInteractionDate) && (
                    <p className="text-muted-foreground/80">
                      {format(lastInteractionDate, "dd MMM yyyy", { locale: es })}
                    </p>
                  )}
                </>
              );
            })()}
          </TableCell>
          <TableCell className="text-xs">
              <p>{account.nextInteraction?.nextActionType || <span className="text-muted-foreground">Ninguna</span>}</p>
              {nextActionDate && isValid(nextActionDate) && <p className="text-muted-foreground/80">{format(nextActionDate, "dd MMM yyyy", { locale: es })}</p>}
          </TableCell>
          <TableCell className="text-right">
              <FormattedNumericValue value={account.totalValue} options={{ style: 'currency', currency: 'EUR' }} placeholder="—" />
          </TableCell>
          <TableCell className="text-center">
              <StatusBadge type="account" status={account.status} isOverdue={account.nextInteraction?.status === 'Seguimiento' && nextActionDate ? nextActionDate < new Date() : false}/>
          </TableCell>
          <TableCell className="text-right">
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setIsInteractionDialogOpen(true); }}>
                  <PlusCircle className="mr-2 h-3 w-3" />
                  Registrar
              </Button>
          </TableCell>
        </TableRow>
        {isExpanded && (
           <TableRow className="bg-background hover:bg-background">
                <TableCell colSpan={7} className="p-0">
                    <AccountHistoryTable interactions={account.interactions} />
                </TableCell>
            </TableRow>
        )}
        <InteractionDialog
            open={isInteractionDialogOpen}
            onOpenChange={setIsInteractionDialogOpen}
            client={account}
            originatingTask={account.nextInteraction || null}
        />
      </>
    );
}

const AccountGroup = ({ title, accounts, expandedRowId, onToggleExpand, groupColor }: { title: string; accounts: EnrichedAccount[]; expandedRowId: string | null; onToggleExpand: (id: string) => void; groupColor: string; }) => {
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
                <AccountTableRow
                    key={account.id}
                    account={account}
                    isExpanded={expandedRowId === account.id}
                    onToggleExpand={() => onToggleExpand(account.id)}
                />
            ))}
        </>
    )
};


export default function AccountsPage() {
  const { toast } = useToast();
  const { userRole, teamMember, dataSignature, refreshDataSignature } = useAuth();
  
  const [enrichedAccounts, setEnrichedAccounts] = React.useState<EnrichedAccount[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

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
        // Use the Server Action to get all necessary data
        const { accounts, orders, teamMembers: members } = await getAccountsAction();
        
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
  }, [toast, dataSignature, userRole, teamMember?.id]);
  
  const { activeAccounts, potentialAccounts, pendingAccounts, failedAccounts, inactiveAccounts } = React.useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

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
                const aDate = a.lastInteractionDate ? new Date(a.lastInteractionDate) : null;
                const bDate = b.lastInteractionDate ? new Date(b.lastInteractionDate) : null;
                if (!aDate && !bDate) return 0;
                if (!aDate) return 1;
                if (!bDate) return -1;
                return bDate.getTime() - aDate.getTime();
            }
            case 'leadScore_desc':
            default:
                return b.leadScore - a.leadScore;
        }
    };
    
    const filtered = enrichedAccounts
      .filter(acc => {
        if (!searchTerm) return true;
        const lowercasedFilter = searchTerm.toLowerCase();
        return acc.nombre.toLowerCase().includes(lowercasedFilter) ||
               (acc.cif && acc.cif.toLowerCase().includes(lowercasedFilter)) ||
               (acc.responsableName && acc.responsableName.toLowerCase().includes(lowercasedFilter)) ||
               ((acc as any).city && (acc as any).city.toLowerCase().includes(lowercasedFilter));
      })
      .filter(acc => {
        if (typeFilter === 'Todos') return true;
        return acc.type === typeFilter;
      })
      .filter(acc => {
        if (!isAdmin || responsibleFilter === "Todos") return true;
        if (responsibleFilter === "SinAsignar") return !acc.responsableId;
        return acc.responsableId === responsibleFilter;
      })
      .filter(acc => {
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
      });

    const groups = {
        activeAccounts: [] as EnrichedAccount[],
        potentialAccounts: [] as EnrichedAccount[],
        pendingAccounts: [] as EnrichedAccount[],
        inactiveAccounts: [] as EnrichedAccount[],
        failedAccounts: [] as EnrichedAccount[],
    };

    filtered.forEach(acc => {
      switch (acc.status) {
        case 'Activo':
        case 'Repetición':
          groups.activeAccounts.push(acc);
          break;
        case 'Seguimiento':
          groups.potentialAccounts.push(acc);
          break;
        case 'Programada':
        case 'Pendiente':
          groups.pendingAccounts.push(acc);
          break;
        case 'Inactivo':
          groups.inactiveAccounts.push(acc);
          break;
        case 'Fallido':
          groups.failedAccounts.push(acc);
          break;
        default:
          groups.pendingAccounts.push(acc);
          break;
      }
    });

    // Sort each group individually
    for (const key in groups) {
      (groups as any)[key].sort(sortFunction);
    }
    
    return groups;

  }, [searchTerm, typeFilter, enrichedAccounts, responsibleFilter, bucketFilter, isAdmin, sortOption]);

  
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold">Cuentas y Seguimiento</h1>
          <p className="text-muted-foreground">Gestiona tus cuentas, programa visitas y haz seguimiento de tus tareas comerciales.</p>
        </div>
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
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TipoCuenta | 'Todos')}>
                  <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Tipo de Cuenta..." /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Todos">Todos los Tipos</SelectItem>
                      {TIPOS_CUENTA.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
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
                            <TableHead className="w-[10%] text-right">Valor Total</TableHead>
                            <TableHead className="w-[10%] text-center">Estado</TableHead>
                            <TableHead className="w-[10%] text-right pr-4">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <AccountGroup title="Cuentas Activas y en Repetición" accounts={activeAccounts} groupColor="bg-emerald-500" expandedRowId={expandedRowId} onToggleExpand={setExpandedRowId} />
                        <AccountGroup title="Potenciales (en seguimiento)" accounts={potentialAccounts} groupColor="bg-amber-500" expandedRowId={expandedRowId} onToggleExpand={setExpandedRowId} />
                        <AccountGroup title="Pendientes (Nuevas y Programadas)" accounts={pendingAccounts} groupColor="bg-sky-500" expandedRowId={expandedRowId} onToggleExpand={setExpandedRowId} />
                        <AccountGroup title="Cuentas Inactivas" accounts={inactiveAccounts} groupColor="bg-orange-500" expandedRowId={expandedRowId} onToggleExpand={setExpandedRowId}/>
                        <AccountGroup title="Fallidos / Descartados" accounts={failedAccounts} groupColor="bg-rose-500" expandedRowId={expandedRowId} onToggleExpand={setExpandedRowId}/>
                        
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
        </CardContent>
      </Card>
    </div>
  );
}

type BucketFilter = "Todos" | "Vencidas" | "Para Hoy" | "Pendientes";
type SortOption = "leadScore_desc" | "nextAction_asc" | "lastInteraction_desc";

    