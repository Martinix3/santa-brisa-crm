
"use client";

import React, { useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TeamMember, Order } from "@/types";
// mockTeamMembers removed, will fetch from Firestore
import { Award, Eye, TrendingUp, Users, Loader2 } from 'lucide-react';
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getOrdersFS } from '@/services/order-service';
import { getTeamMembersFS } from '@/services/team-member-service'; // For fetching clavadistas
import { useToast } from '@/hooks/use-toast';

interface ClavadistaStat extends TeamMember {
  totalParticipations: number;
  totalValueParticipated: number;
}

export default function ClavadistasPage() {
  const { toast } = useToast();
  const [clavadistaStats, setClavadistaStats] = useState<ClavadistaStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadClavadistaData() {
      setIsLoading(true);
      try {
        const [allOrders, allTeamMembers] = await Promise.all([
          getOrdersFS(),
          getTeamMembersFS(['Clavadista']) // Fetch only clavadistas
        ]);
        
        const clavadistasBase = allTeamMembers.filter(m => m.role === 'Clavadista');

        const stats = clavadistasBase.map(clavadista => {
          const participations = allOrders.filter(order => order.clavadistaId === clavadista.id);
          const totalParticipations = participations.length;
          const totalValueParticipated = participations.reduce((sum, order) => sum + (order.value || 0), 0);
          return {
            ...clavadista,
            totalParticipations,
            totalValueParticipated,
          };
        });
        setClavadistaStats(stats);
      } catch (error) {
        console.error("Error loading clavadista stats:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar las estadísticas de los clavadistas.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadClavadistaData();
  }, [toast]);

  const overallTotalParticipations = useMemo(() => clavadistaStats.reduce((sum, m) => sum + m.totalParticipations, 0), [clavadistaStats]);
  const overallTotalValueParticipated = useMemo(() => clavadistaStats.reduce((sum, m) => sum + m.totalValueParticipated, 0), [clavadistaStats]);


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando datos de clavadistas...</p>
      </div>
    );
  }

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
              {clavadistaStats.length > 0 ? clavadistaStats.map((clavadista) => (
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
              )) : (
                 <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No hay Clavadistas configurados o no se encontraron datos de participación.
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
              <FormattedNumericValue value={overallTotalParticipations} locale="es-ES" />
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
              <FormattedNumericValue value={overallTotalValueParticipated} locale="es-ES" options={{ style: 'currency', currency: 'EUR' }} />
            </div>
            <p className="text-xs text-muted-foreground">Suma del valor de pedidos donde participaron clavadistas.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
