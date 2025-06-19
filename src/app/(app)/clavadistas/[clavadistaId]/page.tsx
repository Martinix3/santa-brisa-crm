
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockTeamMembers, mockOrders } from "@/lib/data";
import type { TeamMember, Order } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { ArrowLeft, Mail, Award, Users, TrendingUp, AlertTriangle, Euro, Eye } from "lucide-react";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import StatusBadge from "@/components/app/status-badge";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from "next/link";

export default function ClavadistaProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { userRole } = useAuth();

  const [clavadista, setClavadista] = React.useState<TeamMember | null>(null);
  const [participatedOrders, setParticipatedOrders] = React.useState<Order[]>([]);
  const [totalParticipations, setTotalParticipations] = React.useState<number>(0);
  const [totalValueParticipated, setTotalValueParticipated] = React.useState<number>(0);
  
  const clavadistaId = params.clavadistaId as string;

  React.useEffect(() => {
    const foundClavadista = mockTeamMembers.find(m => m.id === clavadistaId && m.role === 'Clavadista');
    if (foundClavadista) {
      setClavadista(foundClavadista);
      const ordersWithClavadista = mockOrders
        .filter(order => order.clavadistaId === foundClavadista.id)
        .sort((a,b) => parseISO(b.visitDate).getTime() - parseISO(a.visitDate).getTime());
      setParticipatedOrders(ordersWithClavadista);
      setTotalParticipations(ordersWithClavadista.length);
      setTotalValueParticipated(ordersWithClavadista.reduce((sum, order) => sum + (order.value || 0), 0));
    } else {
      setClavadista(null);
    }
  }, [clavadistaId]);

  if (!clavadista) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Clavadista no Encontrado</h1>
        <p className="text-muted-foreground mb-6">El Clavadista que estás buscando no existe o ha sido eliminado.</p>
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
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-subtle">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Participaciones Totales</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={totalParticipations} /></div>
             <p className="text-xs text-muted-foreground">Número total de pedidos/visitas con participación.</p>
            </CardContent>
        </Card>
        <Card className="shadow-subtle">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Total en Pedidos Participados</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={totalValueParticipated} locale="es-ES" options={{ style: 'currency', currency: 'EUR' }} /></div>
            <p className="text-xs text-muted-foreground">Suma del valor de los pedidos donde participó.</p>
            </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>Pedidos/Visitas con Participación de {clavadista.name}</CardTitle>
          <CardDescription>Listado de las interacciones donde {clavadista.name} ha participado como Brand Ambassador.</CardDescription>
        </CardHeader>
        <CardContent>
          {participatedOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%]">ID Pedido/Visita</TableHead>
                    <TableHead className="w-[25%]">Cliente</TableHead>
                    <TableHead className="w-[15%]">Fecha</TableHead>
                    <TableHead className="w-[20%]">Comercial Asignado</TableHead>
                    <TableHead className="text-right w-[15%]">Valor Pedido</TableHead>
                    <TableHead className="text-center w-[10%]">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participatedOrders.slice(0, 15).map(order => ( 
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <Link href={`/orders-dashboard`} className="hover:underline text-primary"> {/* Assuming a general link to orders dashboard */}
                            {order.id}
                        </Link>
                      </TableCell>
                      <TableCell>{order.clientName}</TableCell>
                      <TableCell>{format(parseISO(order.visitDate), "dd/MM/yy", { locale: es })}</TableCell>
                      <TableCell>{order.salesRep}</TableCell>
                      <TableCell className="text-right">
                         {order.value !== undefined && ['Confirmado', 'Procesando', 'Enviado', 'Entregado'].includes(order.status) ? (
                           <FormattedNumericValue value={order.value} locale="es-ES" options={{ style: 'currency', currency: 'EUR' }} />
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-center"><StatusBadge type="order" status={order.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {participatedOrders.length > 15 && <p className="text-xs text-muted-foreground mt-2 text-center">Mostrando 15 de {participatedOrders.length} participaciones.</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No hay participaciones registradas para {clavadista.name}.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    