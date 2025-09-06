
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { SampleRequest, SampleRequestStatus, UserRole, TeamMember, Account } from "@/types";
import { sampleRequestStatusList } from "@/lib/data";
import { Filter, ChevronDown, Loader2, PackageCheck, ListOrdered, Users, Printer, MoreHorizontal, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import StatusBadge from "@/components/app/status-badge";
import { getSampleRequestsFS, updateSampleRequestStatusFS, deleteSampleRequestFS } from "@/services/sample-request-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { getAccountsFS } from "@/services/account-service";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import ShippingLabelDialog from "@/components/app/shipping-label-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


export default function SampleManagementPage() {
  const { toast } = useToast();
  const { userRole, dataSignature, refreshDataSignature } = useAuth();
  
  const [requests, setRequests] = React.useState<SampleRequest[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [printingRequest, setPrintingRequest] = React.useState<SampleRequest | null>(null);
  const [requestToDelete, setRequestToDelete] = React.useState<SampleRequest | null>(null);

  const [statusFilter, setStatusFilter] = React.useState<SampleRequestStatus | "Todos">("Todos");
  const [requesterFilter, setRequesterFilter] = React.useState<string>("Todos");

  const [requesterStats, setRequesterStats] = React.useState<{
    id: string;
    name: string;
    requestCount: number;
    totalSamples: number;
  }[]>([]);


  const isAdmin = userRole === 'Admin';

  React.useEffect(() => {
    async function loadData() {
      if (!isAdmin) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [fetchedRequests, fetchedMembers, fetchedAccounts] = await Promise.all([
          getSampleRequestsFS(),
          getTeamMembersFS(['SalesRep', 'Clavadista', 'Admin']),
          getAccountsFS(),
        ]);
        setRequests(fetchedRequests);
        setTeamMembers(fetchedMembers);
        setAccounts(fetchedAccounts);

        // Calculate stats
        const stats = fetchedMembers.map(member => {
            const memberRequests = fetchedRequests.filter(req => req.requesterId === member.id);
            const totalSamples = memberRequests.reduce((sum, req) => sum + req.numberOfSamples, 0);
            return {
                id: member.id,
                name: member.name,
                requestCount: memberRequests.length,
                totalSamples: totalSamples,
            };
        }).filter(stat => stat.requestCount > 0) 
          .sort((a,b) => b.totalSamples - a.totalSamples);
        
        setRequesterStats(stats);


      } catch (error) {
        console.error("Error fetching sample requests or team members:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar las solicitudes o el equipo.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [isAdmin, toast, dataSignature]);

  const teamMembersWithRequests = React.useMemo(() => {
    const requesterIds = new Set(requests.map(r => r.requesterId));
    return teamMembers.filter(tm => requesterIds.has(tm.id));
  }, [requests, teamMembers]);
  
  const accountsMap = React.useMemo(() => new Map(accounts.map(acc => [acc.id, acc])), [accounts]);

  const filteredRequests = React.useMemo(() => {
    return requests
      .filter(req => statusFilter === "Todos" || req.status === statusFilter)
      .filter(req => requesterFilter === "Todos" || req.requesterId === requesterFilter);
  }, [requests, statusFilter, requesterFilter]);

  const handleChangeStatus = async (requestId: string, newStatus: SampleRequestStatus) => {
    setIsLoading(true);
    try {
      await updateSampleRequestStatusFS(requestId, newStatus);
      toast({ title: "Estado Actualizado", description: `La solicitud ahora está en estado: ${newStatus}.` });
      refreshDataSignature(); // Refresca los datos
    } catch (error) {
      console.error("Error updating sample request status:", error);
      toast({ title: "Error al Actualizar", description: "No se pudo cambiar el estado de la solicitud.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const confirmDeleteRequest = async () => {
    if (!isAdmin || !requestToDelete) return;
    setIsLoading(true);
    try {
        await deleteSampleRequestFS(requestToDelete.id);
        setRequests(prev => prev.filter(req => req.id !== requestToDelete.id));
        toast({ title: "¡Solicitud Eliminada!", description: `La solicitud de "${requestToDelete.clientName}" ha sido eliminada.`, variant: "destructive" });
        refreshDataSignature(); // This should trigger recalculation of stats
    } catch (error) {
        console.error("Error deleting sample request:", error);
        toast({ title: "Error al Eliminar", description: "No se pudo eliminar la solicitud.", variant: "destructive" });
    } finally {
        setIsLoading(false);
        setRequestToDelete(null);
    }
  };

  if (!isAdmin) {
    return <Card><CardHeader><CardTitle>Acceso Denegado</CardTitle></CardHeader><CardContent><p>No tienes permiso para ver esta sección.</p></CardContent></Card>
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
        <PackageCheck className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Gestión de Solicitudes de Muestras</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <main className="lg:col-span-2 space-y-6">
            <Card className="shadow-subtle">
                <CardHeader>
                <CardTitle>Listado de Solicitudes</CardTitle>
                <CardDescription>Revisa y gestiona las solicitudes de muestras de producto realizadas por el equipo.</CardDescription>
                </CardHeader>
                <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto">
                        <Filter className="mr-2 h-4 w-4" />
                        Estado: {statusFilter} <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuCheckboxItem checked={statusFilter === "Todos"} onCheckedChange={() => setStatusFilter("Todos")}>Todos</DropdownMenuCheckboxItem>
                        {sampleRequestStatusList.map(status => (
                        <DropdownMenuCheckboxItem key={status} checked={statusFilter === status} onCheckedChange={() => setStatusFilter(status)}>{status}</DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto">
                        <Filter className="mr-2 h-4 w-4" />
                        Solicitante: {teamMembers.find(tm => tm.id === requesterFilter)?.name || "Todos"} <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuCheckboxItem checked={requesterFilter === "Todos"} onCheckedChange={() => setRequesterFilter("Todos")}>Todos</DropdownMenuCheckboxItem>
                        {teamMembersWithRequests.map(member => (
                        <DropdownMenuCheckboxItem key={member.id} checked={requesterFilter === member.id} onCheckedChange={() => setRequesterFilter(member.id)}>{member.name}</DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[15%]">Fecha Solicitud</TableHead>
                            <TableHead className="w-[15%]">Solicitante</TableHead>
                            <TableHead className="w-[20%]">Cuenta</TableHead>
                            <TableHead className="w-[20%]">Propósito</TableHead>
                            <TableHead className="text-right w-[10%]">Cantidad</TableHead>
                            <TableHead className="text-center w-[15%]">Estado</TableHead>
                            <TableHead className="text-right w-[5%]">Acciones</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredRequests.length > 0 ? filteredRequests.map(req => (
                            <TableRow key={req.id}>
                            <TableCell>{format(parseISO(req.requestDate), "dd/MM/yy HH:mm", { locale: es })}</TableCell>
                            <TableCell>{req.requesterName}</TableCell>
                            <TableCell>{req.clientName}</TableCell>
                            <TableCell>
                                {req.purpose}
                                {req.justificationNotes && <p className="text-xs text-muted-foreground truncate max-w-xs" title={req.justificationNotes}>Nota: {req.justificationNotes}</p>}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                <FormattedNumericValue value={req.numberOfSamples} />
                            </TableCell>
                            <TableCell className="text-center">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="p-0 h-auto">
                                    <StatusBadge type="sampleRequest" status={req.status} className="cursor-pointer" />
                                    <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuRadioGroup value={req.status} onValueChange={(newStatus) => handleChangeStatus(req.id, newStatus as SampleRequestStatus)}>
                                    {sampleRequestStatusList.map(s => (
                                        <DropdownMenuRadioItem key={s} value={s}>{s}</DropdownMenuRadioItem>
                                    ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Abrir menú</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => setPrintingRequest(req)}>
                                    <Printer className="mr-2 h-4 w-4" /> Imprimir Dirección
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                            onSelect={(e) => { e.preventDefault(); setRequestToDelete(req); }}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar Solicitud
                                        </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        {requestToDelete && requestToDelete.id === req.id && (
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta acción no se puede deshacer. Esto eliminará permanentemente la solicitud de muestras para:
                                                <br />
                                                <strong className="mt-2 block">"{requestToDelete.clientName}"</strong>
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel onClick={() => setRequestToDelete(null)}>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={confirmDeleteRequest} variant="destructive">Sí, eliminar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                        )}
                                    </AlertDialog>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">No se encontraron solicitudes con los filtros actuales.</TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                    </div>
                )}
                </CardContent>
                <CardFooter>
                <p className="text-xs text-muted-foreground">Mostrando {filteredRequests.length} de {requests.length} solicitudes.</p>
                </CardFooter>
            </Card>
        </main>
        <aside className="lg:col-span-1 space-y-6">
            <Card className="shadow-subtle">
                <CardHeader>
                    <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-muted-foreground"/> Resumen por Usuario</CardTitle>
                    <CardDescription>Total de muestras solicitadas por cada miembro del equipo.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : requesterStats.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Solicitante</TableHead>
                                        <TableHead className="text-right">Solicitudes</TableHead>
                                        <TableHead className="text-right">Muestras</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requesterStats.map(stat => (
                                        <TableRow key={stat.id}>
                                            <TableCell className="font-medium">{stat.name}</TableCell>
                                            <TableCell className="text-right">
                                                <FormattedNumericValue value={stat.requestCount} />
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                <FormattedNumericValue value={stat.totalSamples} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center">No hay datos de solicitudes para mostrar un resumen.</p>
                    )}
                </CardContent>
            </Card>
        </aside>
      </div>

      <ShippingLabelDialog
        isOpen={!!printingRequest}
        onOpenChange={(open) => !open && setPrintingRequest(null)}
        request={printingRequest}
        account={printingRequest?.accountId ? accountsMap.get(printingRequest.accountId) ?? null : null}
      />
    </div>
  );
}
