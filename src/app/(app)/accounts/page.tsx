
"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PlusCircle, Search, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import type { EnrichedAccount, TeamMember } from "@/types";
import { getCarteraBundle } from "@/features/accounts/repo";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import AccountDialog from "@/features/accounts/components/account-dialog";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CANALES_ORIGEN_COLOCACION, OPCIONES_TIPO_CUENTA } from "@ssot";
import { startOfDay, isBefore, isEqual, parseISO, isValid } from 'date-fns';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountRow } from "@/features/accounts/components/account-row";
import { AccountHubDialog } from "@/features/accounts/components/account-hub-dialog";

const hexToRgba = (hex: string, a: number) => { const h = hex.replace('#',''); const f = h.length === 3 ? h.split('').map(c=>c+c).join('') : h; const n = parseInt(f,16); const r=(n>>16)&255, g=(n>>8)&255, b=n&255; return `rgba(${r},${g},${b},${a})`; };

type BucketFilter = "Todos" | "Vencidas" | "Para Hoy";
type SortOption = "leadScore_desc" | "nextAction_asc" | "lastInteraction_desc";

const AccountGroup = ({
  title, accounts, expandedRowId, onToggleExpand, onOpenHub, color,
}: {
  title: string;
  accounts: EnrichedAccount[];
  expandedRowId: string | null;
  onToggleExpand: (id: string) => void;
  onOpenHub: (accountId: string, mode: 'registrar'|'editar'|'pedido') => void;
  color: string;
}) => {
  const [open, setOpen] = React.useState(true);
  if (accounts.length === 0) return null;

  return (
    <React.Fragment>
      <TableRow className="sb-group hover:bg-transparent" style={{ backgroundColor: hexToRgba(color, 0.15) }}>
        <TableCell colSpan={8} className="p-0">
          <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-3 py-2 text-left">
            {open ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4" />}
            <span>{title}</span>
            <span className="sb-chip" style={{ backgroundColor: hexToRgba(color, 0.2), color: hexToRgba(color, 1), borderColor: hexToRgba(color, 0.4) }}>{accounts.length}</span>
          </button>
        </TableCell>
      </TableRow>

      {open && accounts.map(account => (
        <AccountRow
          key={account.id}
          account={account}
          isExpanded={expandedRowId === account.id}
          onToggleExpand={() => onToggleExpand(account.id)}
          onOpenHub={onOpenHub}
          className="sb-tr"
          tdClassName="sb-td"
          style={{ backgroundColor: hexToRgba(color, 0.05) }}
        />
      ))}
    </React.Fragment>
  );
};


export default function AccountsPage(){
  const { userRole, dataSignature } = useAuth();
  const { toast } = useToast();
  
  const [enrichedAccounts, setEnrichedAccounts] = React.useState<EnrichedAccount[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog states
  const [isAccountDialogOpen, setAccountDialogOpen] = React.useState(false);
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);
  const [hubAccountId, setHubAccountId] = React.useState<string | null>(null);
  const [hubMode, setHubMode] = React.useState<'registrar'|'editar'|'pedido'>('registrar');
  const [isHubOpen, setIsHubOpen] = React.useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = React.useState("");
  const [responsibleFilter, setResponsibleFilter] = React.useState("Todos");
  const [bucketFilter, setBucketFilter] = React.useState<BucketFilter>("Todos");
  const [channelFilter, setChannelFilter] = React.useState<string[]>([]);
  const [sortOption, setSortOption] = React.useState<SortOption>("leadScore_desc");
  const [typeFilter, setTypeFilter] = useState<string>("Todos");
  
  const isAdmin = userRole === 'Admin';
  const salesAndAdminMembers = useMemo(() => teamMembers.filter(m => m.role === 'Admin' || m.role === 'Ventas'), [teamMembers]);
  
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
      toast({ title: "Error de Red", description: err.message || "Error al conectar con el servidor.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData, dataSignature]);
  
  const handleToggleExpand = (rowId: string) => {
    setExpandedRowId(prev => (prev === rowId ? null : rowId));
  };

  const handleOpenHub = (accountId: string, mode: 'registrar'|'editar'|'pedido') => {
      setHubAccountId(accountId);
      setHubMode(mode);
      setIsHubOpen(true);
  };
  
  const filteredAndSortedAccounts = useMemo(() => {
    const todayStart = startOfDay(new Date());

    return enrichedAccounts
      .filter(acc => !searchTerm || acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || (acc.city && acc.city.toLowerCase().includes(searchTerm.toLowerCase())))
      .filter(acc => channelFilter.length === 0 || (acc.channel && channelFilter.includes(acc.channel)))
      .filter(acc => typeFilter === "Todos" || (acc.accountType === typeFilter))
      .filter(acc => !isAdmin || responsibleFilter === "Todos" || acc.responsableId === responsibleFilter)
      .filter(acc => {
        if (bucketFilter === 'Todos') return true;
        const nextActionDate = acc.nextInteraction?.status === 'Programada' ? (acc.nextInteraction.visitDate ? parseISO(acc.nextInteraction.visitDate) : null) : (acc.nextInteraction?.nextActionDate ? parseISO(acc.nextInteraction.nextActionDate) : null);
        if (!nextActionDate || !isValid(nextActionDate)) return false;
        if (bucketFilter === 'Vencidas') return isBefore(nextActionDate, todayStart);
        if (bucketFilter === 'Para Hoy') return isEqual(startOfDay(nextActionDate), todayStart);
        return false;
      })
      .sort((a, b) => {
        switch(sortOption) {
            case 'leadScore_desc': return (b.leadScore ?? 0) - (a.leadScore ?? 0);
            case 'nextAction_asc': {
                const dateA = a.nextInteraction?.nextActionDate ? parseISO(a.nextInteraction.nextActionDate) : null;
                const dateB = b.nextInteraction?.nextActionDate ? parseISO(b.nextInteraction.nextActionDate) : null;
                if (!dateA) return 1; if (!dateB) return -1;
                return dateA.getTime() - dateB.getTime();
            }
            case 'lastInteraction_desc': {
                const dateA = a.lastInteractionDate ? parseISO(a.lastInteractionDate) : null;
                const dateB = b.lastInteractionDate ? parseISO(b.lastInteractionDate) : null;
                if (!dateA) return 1; if (!dateB) return -1;
                return dateB.getTime() - dateA.getTime();
            }
            default: return 0;
        }
      });
  }, [searchTerm, channelFilter, typeFilter, enrichedAccounts, responsibleFilter, bucketFilter, isAdmin, sortOption]);

  const activeAccounts = useMemo(() => filteredAndSortedAccounts.filter(c => c.status === 'Activo' || c.status === 'Repetición'), [filteredAndSortedAccounts]);
  const potentialAccounts = useMemo(() => filteredAndSortedAccounts.filter(c => c.status === 'Pendiente'), [filteredAndSortedAccounts]);
  const followUpAccounts = useMemo(() => filteredAndSortedAccounts.filter(c => c.status === 'Seguimiento' || c.status === 'Programada'), [filteredAndSortedAccounts]);
  const failedAccounts = useMemo(() => filteredAndSortedAccounts.filter(c => c.status === 'Fallido'), [filteredAndSortedAccounts]);
  
  const totalCount = filteredAndSortedAccounts.length;

  return (
    <div className="space-y-6">
      <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                <Input
                  placeholder="Buscar cuenta, ciudad..."
                  value={searchTerm}
                  onChange={(e)=>setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filtros */}
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
                  <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Tipo de Cuenta..." /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Todos">Todos los Tipos</SelectItem>
                      {OPCIONES_TIPO_CUENTA.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
              </Select>
              <MultiSelect
                options={CANALES_ORIGEN_COLOCACION.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
                selected={channelFilter}
                onChange={setChannelFilter}
                className="w-full sm:w-[200px]"
                placeholder="Canal..."
              />
               <Select value={bucketFilter} onValueChange={(v)=>setBucketFilter(v as BucketFilter)}>
                <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Tareas"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todas</SelectItem>
                  <SelectItem value="Vencidas">Vencidas</SelectItem>
                  <SelectItem value="Para Hoy">Para Hoy</SelectItem>
                </SelectContent>
              </Select>

              {isAdmin && (
                <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Responsable"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {salesAndAdminMembers.map(m=> <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              <Select value={sortOption} onValueChange={(v)=>setSortOption(v as any)}>
                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Ordenar por"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leadScore_desc">Prioridad</SelectItem>
                  <SelectItem value="nextAction_asc">Próxima tarea</SelectItem>
                  <SelectItem value="lastInteraction_desc">Última interacción</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto flex items-center gap-2">
                <Button onClick={()=>setAccountDialogOpen(true)} className="rounded-full bg-amber-400 hover:bg-amber-500 text-amber-950">
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
                <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
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
                        <AccountGroup title="Activas y en Repetición" accounts={activeAccounts} expandedRowId={expandedRowId} onToggleExpand={handleToggleExpand} onOpenHub={handleOpenHub} color="#9CD7D8" />
                        <AccountGroup title="En Seguimiento" accounts={followUpAccounts} expandedRowId={expandedRowId} onToggleExpand={handleToggleExpand} onOpenHub={handleOpenHub} color="#F6C851"/>
                        <AccountGroup title="Potenciales (Nuevas)" accounts={potentialAccounts} expandedRowId={expandedRowId} onToggleExpand={handleToggleExpand} onOpenHub={handleOpenHub} color="#559091"/>
                        <AccountGroup title="Cuentas con Interacción Fallida" accounts={failedAccounts} expandedRowId={expandedRowId} onToggleExpand={handleToggleExpand} onOpenHub={handleOpenHub} color="#E06B2F"/>
                        
                        {totalCount === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="h-40">
                                <div className="h-full flex flex-col items-center justify-center text-center gap-2">
                                    <p className="text-sm text-muted-foreground">No hay cuentas que coincidan con los filtros.</p>
                                    <div className="flex gap-2">
                                    <Button variant="outline" onClick={()=> { setSearchTerm(""); setTypeFilter("Todos"); setBucketFilter("Todos"); setChannelFilter([]); setResponsibleFilter("Todos"); }}>
                                        Limpiar filtros
                                    </Button>
                                    <Button onClick={()=> setAccountDialogOpen(true)} className="rounded-full bg-amber-400 hover:bg-amber-500 text-amber-950">
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
        open={isAccountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        initial={null}
        onSaved={() => loadData()}
      />
      <AccountHubDialog
        open={isHubOpen}
        onOpenChange={setIsHubOpen}
        accountId={hubAccountId}
        defaultMode={hubMode}
       />
    </div>
  );
}
