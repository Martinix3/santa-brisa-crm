
"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import type { EnrichedAccount, TeamMember } from "@/types";
import { startOfDay, endOfDay, isBefore, isEqual, parseISO, isValid } from 'date-fns';
import { Loader2, Search, PlusCircle, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AccountDialog from "@/features/accounts/components/account-dialog";
import { TIPOS_CUENTA_VALUES, type TipoCuenta } from "@ssot";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCarteraBundle } from "@/features/accounts/repo";
import { AccountRow } from "@/features/accounts/components/account-row";

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const AccountGroup = ({
  title, accounts, expandedRowId, onToggleExpand, onOpenHub, style,
}: {
  title: string;
  accounts: EnrichedAccount[];
  expandedRowId: string | null;
  onToggleExpand: (id: string) => void;
  onOpenHub: (accountId: string, mode: 'registrar'|'editar'|'pedido') => void;
  style: React.CSSProperties;
}) => {
  const [open, setOpen] = React.useState(true);
  if (accounts.length === 0) return null;

  return (
    <React.Fragment>
      <TableRow className="sb-group" style={style}>
        <TableCell colSpan={8} className="p-0">
          <button
            type="button"
            onClick={()=> setOpen(!open)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left"
          >
            {open ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4" />}
            <span>{title}</span>
            <span className="ml-2 sb-chip">{accounts.length}</span>
          </button>
        </TableCell>
      </TableRow>

      {open && accounts.map(account => (
        <AccountRow
          key={account.id}
          account={account}
          isExpanded={expandedRowId === account.id}
          onToggleExpand={()=> onToggleExpand(account.id)}
          onOpenHub={onOpenHub}
          className="sb-tr"
          tdClassName="sb-td"
          style={{ backgroundColor: hexToRgba(style.backgroundColor as string, 0.1) }}
        />
      ))}
    </React.Fragment>
  );
};


export default function AccountsPage() {
  const { userRole } = useAuth();
  const { toast } = useToast();
  
  const [enrichedAccounts, setEnrichedAccounts] = React.useState<EnrichedAccount[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedAccount, setSelectedAccount] = React.useState<Partial<AccountFormValues> | null>(null);


  // Filters
  const [searchTerm, setSearchTerm] = React.useState("");
  const [responsibleFilter, setResponsibleFilter] = React.useState("Todos");
  const [bucketFilter, setBucketFilter] = React.useState<BucketFilter>("Todos");
  const [sortOption, setSortOption] = React.useState<SortOption>("leadScore_desc");
  const [typeFilter, setTypeFilter] = React.useState<TipoCuenta | "Todos">('Todos');
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);
  
  const isAdmin = userRole === 'Admin';
  const salesAndAdminMembers = teamMembers.filter(m => m.role === 'Admin' || m.role === 'Ventas');

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { enrichedAccounts, teamMembers: members } = await getCarteraBundle();
      setEnrichedAccounts(enrichedAccounts);
      setTeamMembers(members);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError("No se pudieron cargar los datos de las cuentas. Por favor, inténtalo de nuevo más tarde.");
      toast({
          title: "Error de Red",
          description: err.message || "Error al conectar con el servidor.",
          variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  React.useEffect(() => {
    loadData();
  }, [loadData]);
  
  const { activeAccounts, potentialAccounts, followUpAccounts, failedAccounts } = React.useMemo(() => {
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

    const groups: Record<string, EnrichedAccount[]> = { 
        activeAccounts: [], 
        followUpAccounts: [], 
        potentialAccounts: [], 
        failedAccounts: [] 
    };

    filtered.forEach(acc => {
      const hasSuccessfulOrder = (acc.totalSuccessfulOrders || 0) > 0;
      const hasInteractions = acc.interactions && acc.interactions.length > 0;
      const lastInteractionStatus = hasInteractions ? acc.interactions![0].status : null;
      
      if (hasSuccessfulOrder) {
          groups.activeAccounts.push(acc);
      } else if (lastInteractionStatus === 'Fallido') {
          groups.failedAccounts.push(acc);
      } else if (hasInteractions) {
          groups.followUpAccounts.push(acc);
      } else {
          groups.potentialAccounts.push(acc);
      }
    });

    Object.values(groups).forEach(group => group.sort(sortFunction));
    return groups as { 
        activeAccounts: EnrichedAccount[], 
        potentialAccounts: EnrichedAccount[], 
        followUpAccounts: EnrichedAccount[], 
        failedAccounts: EnrichedAccount[] 
    };

  }, [searchTerm, typeFilter, enrichedAccounts, responsibleFilter, bucketFilter, isAdmin, sortOption]);

  const handleOpenHub = (accountId: string, mode: 'registrar' | 'editar' | 'pedido') => {
      // Future implementation for Hub
      console.log('Open hub for', accountId, 'in mode', mode);
  };
  
  const totalCount = activeAccounts.length + potentialAccounts.length + followUpAccounts.length + failedAccounts.length;

  return (
    <div className="space-y-6">
      <header><h1 className="text-3xl font-headline font-semibold">Cuentas y Seguimiento</h1><p className="text-muted-foreground">Gestiona tus cuentas, programa visitas y haz seguimiento de tus tareas comerciales.</p></header>
      <Card className="shadow-subtle">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
              <Input
                placeholder="Buscar cuenta, ciudad..."
                value={searchTerm}
                onChange={(e)=>setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={typeFilter} onValueChange={(v)=>setTypeFilter(v as any)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos los Tipos</SelectItem>
                {(TIPOS_CUENTA_VALUES as readonly string[]).map(t=> <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={bucketFilter} onValueChange={(v)=>setBucketFilter(v as BucketFilter)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tareas"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todas</SelectItem>
                <SelectItem value="Vencidas">Vencidas</SelectItem>
                <SelectItem value="Para Hoy">Para Hoy</SelectItem>
              </SelectContent>
            </Select>

            {isAdmin && (
              <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Responsable"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {salesAndAdminMembers.map(m=> <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            <Select value={sortOption} onValueChange={(v)=>setSortOption(v as any)}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Ordenar por"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="leadScore_desc">Prioridad</SelectItem>
                <SelectItem value="nextAction_asc">Próxima tarea</SelectItem>
                <SelectItem value="lastInteraction_desc">Última interacción</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-2">
              <span className="sb-chip">Activas {activeAccounts.length}</span>
              <span className="sb-chip">Seguimiento {followUpAccounts.length}</span>
              <Button onClick={()=>setDialogOpen(true)} className="rounded-full bg-amber-400 hover:bg-amber-500 text-amber-950">
                <PlusCircle className="mr-2 h-4 w-4"/> Nueva Cuenta
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
              <Table className="sb-table">
                <TableHeader>
                    <TableRow className="sb-tr">
                    <TableHead className="sb-th w-8"></TableHead>
                    <TableHead className="sb-th w-[22%]">Cuenta</TableHead>
                    <TableHead className="sb-th w-[16%]">Responsable</TableHead>
                    <TableHead className="sb-th w-[20%]">Última Interacción</TableHead>
                    <TableHead className="sb-th w-[16%]">Próxima Tarea</TableHead>
                    <TableHead className="sb-th w-[10%] text-right">Valor Total</TableHead>
                    <TableHead className="sb-th w-[8%] text-center">Estado</TableHead>
                    <TableHead className="sb-th w-[8%] text-right pr-4">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 6 }).map((_,i)=>(
                    <TableRow key={i} className="sb-tr">
                      {Array.from({ length: 8 }).map((__,j)=>(
                        <TableCell key={j} className="sb-td">
                          <div className="h-3 w-[80%] bg-muted rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : error ? (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error al cargar datos</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : (
                <Table className="sb-table">
                    <TableHeader>
                        <TableRow className="sb-tr">
                            <TableHead className="sb-th w-8"></TableHead>
                            <TableHead className="sb-th w-[22%]">Cuenta</TableHead>
                            <TableHead className="sb-th w-[16%]">Responsable</TableHead>
                            <TableHead className="sb-th w-[20%]">Última Interacción</TableHead>
                            <TableHead className="sb-th w-[16%]">Próxima Tarea</TableHead>
                            <TableHead className="sb-th w-[10%] text-right">Valor Total</TableHead>
                            <TableHead className="sb-th w-[8%] text-center">Estado</TableHead>
                            <TableHead className="sb-th w-[8%] text-right pr-4">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <AccountGroup title="Activas y en Repetición" accounts={activeAccounts} expandedRowId={expandedRowId} onToggleExpand={setExpandedRowId} onOpenHub={handleOpenHub} style={{ backgroundColor: hexToRgba('#9CD7D8', 0.15) }}/>
                        <AccountGroup title="En Seguimiento" accounts={followUpAccounts} expandedRowId={expandedRowId} onToggleExpand={setExpandedRowId} onOpenHub={handleOpenHub} style={{ backgroundColor: hexToRgba('#F6C851', 0.15) }}/>
                        <AccountGroup title="Potenciales (Nuevas)" accounts={potentialAccounts} expandedRowId={expandedRowId} onToggleExpand={setExpandedRowId} onOpenHub={handleOpenHub} style={{ backgroundColor: hexToRgba('#559091', 0.10) }}/>
                        <AccountGroup title="Cuentas con Interacción Fallida" accounts={failedAccounts} expandedRowId={expandedRowId} onToggleExpand={setExpandedRowId} onOpenHub={handleOpenHub} style={{ backgroundColor: hexToRgba('#E06B2F', 0.15) }}/>
                        
                        {totalCount === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="h-40">
                                <div className="h-full flex flex-col items-center justify-center text-center gap-2">
                                    <p className="text-sm text-muted-foreground">No hay cuentas que coincidan con los filtros.</p>
                                    <div className="flex gap-2">
                                    <Button variant="outline" onClick={()=> { setSearchTerm(""); setTypeFilter("Todos"); setBucketFilter("Todos"); }}>
                                        Limpiar filtros
                                    </Button>
                                    <Button onClick={()=> setDialogOpen(true)} className="rounded-full bg-amber-400 hover:bg-amber-500 text-amber-950">
                                        <PlusCircle className="mr-2 h-4 w-4"/> Crear nueva cuenta
                                    </Button>
                                    </div>
                                </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={selectedAccount}
        onSaved={() => loadData()}
      />
    </div>
  );
}

type BucketFilter = "Todos" | "Vencidas" | "Para Hoy";
type SortOption = "leadScore_desc" | "nextAction_asc" | "lastInteraction_desc";
type AccountFormValues = import('@/lib/schemas/account-schema').AccountFormValues;
