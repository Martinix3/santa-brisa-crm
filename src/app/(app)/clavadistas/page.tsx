
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TeamMember, Order } from "@/types";
import { mockTeamMembers, mockOrders } from "@/lib/data";
import { Award, Eye, TrendingUp, Users } from 'lucide-react';
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ClavadistasPage() {
  const clavadistas = useMemo(() => mockTeamMembers.filter(m => m.role === 'Clavadista'), []);

  const clavadistaStats = useMemo(() => {
    return clavadistas.map(clavadista => {
      const participations = mockOrders.filter(order => order.clavadistaId === clavadista.id);
      const totalParticipations = participations.length;
      const totalValueParticipated = participations.reduce((sum, order) => sum + (order.value || 0), 0);
      return {
        ...clavadista,
        totalParticipations,
        totalValueParticipated,
      };
    });
  }, [clavadistas]);

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
        <Award className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Panel de Clavadistas (Brand Ambassadors)</h1>
      </header>
      
      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Rendimiento y Participaciones de Clavadistas</CardTitle>
          <CardDescription>Visualiza las participaciones y el valor generado en pedidos por los Clavadistas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Clavadista</TableHead>
                <TableHead className="text-right w-[25%]">Participaciones en Pedidos/Visitas (Total)</TableHead>
                <TableHead className="text-right w-[25%]">Valor Generado en Pedidos (Total)</TableHead>
                <TableHead className="text-right w-[20%]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clavadistaStats.map((clavadista) => (
                <TableRow key={clavadista.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={clavadista.avatarUrl || `https://placehold.co/40x40.png?text=${clavadista.name.split(' ').map(n => n[0]).join('')}`} alt={clavadista.name} data-ai-hint="person portrait" />
                        <AvatarFallback>{clavadista.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                         <Link href={`/clavadistas/${clavadista.id}`} className="font-medium hover:underline text-primary">
                          {clavadista.name}
                        </Link>
                         <p className="text-xs text-muted-foreground">{clavadista.role}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <FormattedNumericValue value={clavadista.totalParticipations} locale="es-ES" />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <FormattedNumericValue value={clavadista.totalValueParticipated} locale="es-ES" options={{ style: 'currency', currency: 'EUR' }} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/clavadistas/${clavadista.id}`}>
                        <Eye className="mr-1 h-3 w-3" /> Ver Perfil
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
               {clavadistaStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No hay Clavadistas configurados en el sistema.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participaciones del Equipo Clavadista</CardTitle> 
            <Users className="h-5 w-5 text-muted-foreground" /> 
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <FormattedNumericValue value={clavadistaStats.reduce((sum, m) => sum + m.totalParticipations, 0)} locale="es-ES" />
            </div>
            <p className="text-xs text-muted-foreground">Suma de todas las participaciones de los clavadistas.</p>
          </CardContent>
        </Card>
        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Generado con Clavadistas</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <FormattedNumericValue value={clavadistaStats.reduce((sum, m) => sum + m.totalValueParticipated, 0)} locale="es-ES" options={{ style: 'currency', currency: 'EUR' }} />
            </div>
            <p className="text-xs text-muted-foreground">Suma del valor de pedidos donde participaron clavadistas.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    