
"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { PlusCircle, Search, ChevronDown, ChevronRight, Briefcase, ShoppingCart, MessageSquare, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import type { Account, EnrichedAccount, TeamMember } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountRow } from "@/features/accounts/components/account-row";
import { AccountHubDialog } from "@/features/accounts/components/account-hub-dialog";
import { OPCIONES_TIPO_CUENTA } from "@ssot";
import { selectAccountsByActivity } from "@/services/reports/select-accounts";

const hexToRgba = (hex: string, a: number) => { const h = hex.replace('#',''); const f = h.length === 3 ? h.split('').map(c=>c+c).join('') : h; const n = parseInt(f,16); const r=(n>>16)&255, g=(n>>8)&255, b=n&255; return `rgba(${r},${g},${b},${a})`; };

type SortOption = "leadScore_desc" | "nextAction_asc" | "lastInteraction_desc";

type AccountGroupIds = "conPedido" | "sinPedidoConInteraccion" | "fallidas" | "sinPedidoNiInteraccion";

const accountGroupsConfig: Record<AccountGroupIds, { title: string, color: string, icon: React.ElementType }> = {
    conPedido: { title: "Con Pedido Reciente", color: "#22c55e", icon: ShoppingCart }, // green-500
    sinPedidoConInteraccion: { title: "En Seguimiento (Sin Pedido)", color: "#f97316", icon: MessageSquare }, // orange-500
    fallidas: { title: "Fallidas o Inactivas", color: "#ef4444", icon: AlertCircle }, // red-500
    sinPedidoNiInteraccion: { title: "Cuentas Sin Contactar", color: "#64748b", icon: Briefcase }, // slate-500
};


const AccountGroup = ({
  groupKey, accounts, expandedRowId, onToggleExpand, onOpenHub,
}: {
  groupKey: AccountGroupIds;
  accounts: EnrichedAccount[];
  expandedRowId: string | null;
  onToggleExpand: (id: string) => void;
  onOpenHub: (accountId: string, mode: 'registrar'|'editar'|'pedido') => void;
}) => {
  const [open, setOpen] = React.useState(true);
  const config = accountGroupsConfig[groupKey];
  
  if (accounts.length === 0) return null;
  
  const Icon = config.icon;

  return (
    <React.Fragment>
      <TableRow className="sb-group hover:bg-transparent" style={{ backgroundColor: hexToRgba(config.color, 0.1) }}>
        <TableCell colSpan={8} className="p-0">
          <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-3 py-2 text-left">
            {open ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4" />}
            <Icon className="h-4 w-4" style={{ color: config.color }}/>
            <span style={{ color: config.color }}>{config.title}</span>
            <span className="sb-chip" style={{ backgroundColor: hexToRgba(config.color, 0.2), color: config.color, borderColor: hexToRgba(config.color, 0.4) }}>{accounts.length}</span>
          </button>
        </TableCell>
      </TableRow>

      {open && accounts.map(account => (
        <AccountRow
          key={account.id}
          account={account as EnrichedAccount}
          isExpanded={expandedRowId === account.id}
          onToggleExpand={() => onToggleExpand(account.id)}
          onOpenHub={onOpenHub}
          className="sb-tr"
          tdClassName="sb-td"
          style={{ backgroundColor: hexToRgba(config.color, 0.05) }}
        />
      ))}
    </React.Fragment>
  );
};


export default function AccountsPage(){
  const { userRole, dataSignature } = useAuth();
  const { toast } = useToast();
  
  const [groupedAccounts, setGroupedAccounts] = React.useState<Record<AccountGroupIds, Account[]>>({
      conPedido: [], sinPedidoConInteraccion: [], fallidas: [], sinPedidoNiInteraccion: []
  });
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog states
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);
  const [hubAccountId, setHubAccountId] = React.useState<string | null>(null);
  const [hubMode, setHubMode] = React.useState<'registrar'|'editar'|'pedido'>('registrar');
  const [isHubOpen, setIsHubOpen] = React.useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = React.useState("");
  const [responsibleFilter, setResponsibleFilter] = React.useState("Todos");
  const [typeFilter, setTypeFilter] = React.useState<string>("Todos");
  
  const isAdmin = userRole === 'Admin';
  const salesAndAdminMembers = useMemo(() => teamMembers.filter(m => m.role === 'Admin' || m.role === 'Ventas'), [teamMembers]);
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await selectAccountsByActivity();
      setGroupedAccounts(result as any);
      setTeamMembers(result.allTeamMembers || []);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError("No se pudieron cargar los datos de las cuentas. Por favor, inténtalo de nuevo más tarde.");
      toast({ title: "Error de Red", description: err.message || "Error al conectar con el servidor.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
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
    const applyFilters = (accounts: Account[]) => accounts
        .filter(acc => !searchTerm || (acc.name && acc.name.toLowerCase().includes(searchTerm.toLowerCase())) || (acc.city && acc.city.toLowerCase().includes(searchTerm.toLowerCase())))
        .filter(acc => typeFilter === "Todos" || (acc.accountType === typeFilter))
        .filter(acc => !isAdmin || responsibleFilter === "Todos" || acc.owner_user_id === responsibleFilter);
    
    return {
        conPedido: applyFilters(groupedAccounts.conPedido),
        sinPedidoConInteraccion: applyFilters(groupedAccounts.sinPedidoConInteraccion),
        fallidas: applyFilters(groupedAccounts.fallidas),
        sinPedidoNiInteraccion: applyFilters(groupedAccounts.sinPedidoNiInteraccion)
    };

  }, [searchTerm, typeFilter, groupedAccounts, responsibleFilter, isAdmin]);

  const totalCount = Object.values(filteredAndSortedAccounts).reduce((sum, group) => sum + group.length, 0);

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
                      {(OPCIONES_TIPO_CUENTA ?? []).map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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
              
              <div className="ml-auto flex items-center gap-2">
                <Button onClick={()=> handleOpenHub('new', 'editar')} className="rounded-full bg-amber-400 hover:bg-amber-500 text-amber-950">
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
                        <AccountGroup groupKey="conPedido" accounts={filteredAndSortedAccounts.conPedido as EnrichedAccount[]} expandedRowId={expandedRowId} onToggleExpand={handleToggleExpand} onOpenHub={handleOpenHub} />
                        <AccountGroup groupKey="sinPedidoConInteraccion" accounts={filteredAndSortedAccounts.sinPedidoConInteraccion as EnrichedAccount[]} expandedRowId={expandedRowId} onToggleExpand={handleToggleExpand} onOpenHub={handleOpenHub} />
                        <AccountGroup groupKey="sinPedidoNiInteraccion" accounts={filteredAndSortedAccounts.sinPedidoNiInteraccion as EnrichedAccount[]} expandedRowId={expandedRowId} onToggleExpand={handleToggleExpand} onOpenHub={handleOpenHub} />
                        <AccountGroup groupKey="fallidas" accounts={filteredAndSortedAccounts.fallidas as EnrichedAccount[]} expandedRowId={expandedRowId} onToggleExpand={handleToggleExpand} onOpenHub={handleOpenHub} />
                        
                        {totalCount === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="h-40">
                                <div className="h-full flex flex-col items-center justify-center text-center gap-2">
                                    <p className="text-sm text-muted-foreground">No hay cuentas que coincidan con los filtros.</p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={()=> { setSearchTerm(""); setTypeFilter("Todos"); setResponsibleFilter("Todos"); }}>
                                            Limpiar filtros
                                        </Button>
                                        <Button onClick={()=> handleOpenHub('new', 'editar')} className="rounded-full bg-amber-400 hover:bg-amber-500 text-amber-950">
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
      
      <AccountHubDialog
        open={isHubOpen}
        onOpenChange={setIsHubOpen}
        accountId={hubAccountId}
        defaultMode={hubMode}
       />
    </div>
  );
}

