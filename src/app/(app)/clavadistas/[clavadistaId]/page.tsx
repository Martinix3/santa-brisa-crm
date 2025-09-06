

"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { TeamMember, Order, Account } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { ArrowLeft, Mail, Award, AlertTriangle, Loader2, FileText, CalendarDays, DollarSign, Briefcase } from "lucide-react";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import StatusBadge from "@/components/app/status-badge";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from "next/link";
import { getOrdersFS } from "@/services/order-service";
import { getAccountsFS } from "@/services/account-service";
import { getTeamMemberByIdFS } from "@/services/team-member-service";
import { useToast } from "@/hooks/use-toast";
import { VALID_SALE_STATUSES } from '@/lib/constants';

export default function ClavadistaProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { teamMember } = useAuth();
  
  const [clavadista, setClavadista] = React.useState<TeamMember | null>(null);
  const [participatedOrders, setParticipatedOrders] = React.useState<Order[]>([]);
  const [assignedAccounts, setAssignedAccounts] = React.useState<Account[]>([]);
  const [totalValueParticipated, setTotalValueParticipated] = React.useState<number>(0);
  const [totalNewAccounts, setTotalNewAccounts] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const clavadistaId = params.clavadistaId as string;
  const isOwnProfile = teamMember?.id === clavadistaId;

  React.useEffect(() => {
    async function loadClavadistaData() {
      if (!clavadistaId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [foundClavadista, allOrders, allAccounts] = await Promise.all([
            getTeamMemberByIdFS(clavadistaId),
            getOrdersFS(),
            getAccountsFS(),
        ]);
        
        if (foundClavadista && (foundClavadista.role === 'Clavadista' || foundClavadista.role === 'Líder Clavadista')) {
          setClavadista(foundClavadista);

          const ordersWithClavadista = allOrders
            .filter(order => order.embajadorId === foundClavadista.id)
            .sort((a,b) => {
                const dateA = parseISO(a.visitDate || a.createdAt || '1970-01-01');
                const dateB = parseISO(b.visitDate || b.createdAt || '1970-01-01');
                if (!isValid(dateA)) return 1;
                if (!isValid(dateB)) return -1;
                return dateB.getTime() - dateA.getTime();
            });
          
          setParticipatedOrders(ordersWithClavadista);
          setTotalValueParticipated(ordersWithClavadista.filter(o => VALID_SALE_STATUSES.includes(o.status)).reduce((sum, order) => sum + (order.value || 0), 0));
          
          const accountsForClavadista = allAccounts.filter(acc => acc.embajadorId === foundClavadista.id);
          setAssignedAccounts(accountsForClavadista);
          setTotalNewAccounts(accountsForClavadista.length);

        } else {
          setClavadista(null);
          if (foundClavadista) {
             toast({ title: "Perfil Inválido", description: "Este perfil no corresponde a un Clavadista.", variant: "destructive" });
          }
        }
      } catch (error) {
          console.error("Error fetching data for clavadista profile:", error);
          toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los datos del clavadista.", variant: "destructive" });
          setClavadista(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadClavadistaData();
  }, [clavadistaId, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando perfil del clavadista...</p>
      </div>
    );
  }

  if (!clavadista) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Clavadista no Encontrado</h1>
        <p className="text-muted-foreground mb-6">El Clavadista que estás buscando no existe o no es un perfil válido.</p>
        <Button onClick={() => router.push('/clavadistas')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel de Clavadistas
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/clavadistas')} aria-label="Volver al panel de clavadistas">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-16 w-16">
            <AvatarImage src={clavadista.avatarUrl || `https://placehold.co/100x100.png?text=${clavadista.name.split(' ').map(n => n[0]).join('')}`} alt={clavadista.name} data-ai-hint="person portrait" />
            <AvatarFallback>{clavadista.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-headline font-semibold">Perfil de Clavadista: {clavadista.name}</h1>
            <p className="text-sm text-muted-foreground">{clavadista.role}</p>
            <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
                <Mail size={14} /> <span>{clavadista.email}</span>
            </div>
          </div>
        </div>
        {isOwnProfile && (
            <div className="flex gap-2">
                <Button asChild>
                    <Link href="/order-form">
                        <FileText className="mr-2 h-4 w-4" /> Registrar Interacción
                    </Link>
                </Button>
                <Button asChild variant="secondary">
                    <Link href="/events">
                        <CalendarDays className="mr-2 h-4 w-4" /> Ver Eventos
                    </Link>
                </Button>
            </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <Card className="shadow-subtle"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Facturación Total</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={totalValueParticipated} locale="es-ES" options={{ style: 'currency', currency: 'EUR' }} /></div><p className="text-xs text-muted-foreground">Suma del valor de todos los pedidos exitosos.</p></CardContent></Card>
        <Card className="shadow-subtle"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Cuentas Abiertas</CardTitle><Briefcase className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={totalNewAccounts}/></div><p className="text-xs text-muted-foreground">Cuentas nuevas con primer pedido exitoso.</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-subtle">
            <CardHeader>
            <CardTitle>Pedidos/Visitas Recientes</CardTitle>
            <CardDescription>Listado de las últimas interacciones donde has participado.</CardDescription>
            </CardHeader>
            <CardContent>
            {participatedOrders.length > 0 ? (
                <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {participatedOrders.slice(0, 10).map(order => { 
                        const displayDate = order.visitDate || order.createdAt;
                        return (
                        <TableRow key={order.id}>
                        <TableCell>
                            <Link href={`/orders-dashboard`} className="hover:underline text-primary">
                                {order.clientName}
                            </Link>
                        </TableCell>
                        <TableCell>{displayDate && isValid(parseISO(displayDate)) ? format(parseISO(displayDate), "dd/MM/yy", { locale: es }) : 'N/D'}</TableCell>
                        <TableCell className="text-right">
                           <FormattedNumericValue value={order.value} options={{style: 'currency', currency: 'EUR'}} placeholder="—"/>
                        </TableCell>
                        <TableCell className="text-center">
                            <StatusBadge type="order" status={order.status} />
                        </TableCell>
                        </TableRow>
                    )})}
                    </TableBody>
                </Table>
                {participatedOrders.length > 10 && <p className="text-xs text-muted-foreground mt-2 text-center">Mostrando las 10 interacciones más recientes.</p>}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No hay participaciones registradas para {clavadista.name}.</p>
            )}
            </CardContent>
        </Card>
        <Card className="shadow-subtle">
            <CardHeader>
            <CardTitle>Cuentas Asignadas</CardTitle>
            <CardDescription>Directorio de las cuentas de clientes asignadas a ti.</CardDescription>
            </CardHeader>
            <CardContent>
            {assignedAccounts.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre Cuenta</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedAccounts.slice(0, 10).map(account => ( 
                      <TableRow key={account.id}>
                        <TableCell>
                          <Link href={`/accounts/${account.id}`} className="font-medium hover:underline text-primary">
                            {account.nombre}
                          </Link>
                        </TableCell>
                        <TableCell>{account.type}</TableCell>
                        <TableCell className="text-center"><StatusBadge type="account" status={account.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {assignedAccounts.length > 10 && <p className="text-xs text-muted-foreground mt-2 text-center">Mostrando 10 de {assignedAccounts.length} cuentas.</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">{clavadista.name} no tiene cuentas asignadas actualmente.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
