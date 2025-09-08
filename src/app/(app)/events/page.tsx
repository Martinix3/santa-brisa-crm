
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { crmEventTypeList, crmEventStatusList } from "@/lib/data";
import type { CrmEvent, CrmEventType, CrmEventStatus, TeamMember, UserRole, Account } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Edit, Trash2, MoreHorizontal, PartyPopper, Filter, ChevronDown, Eye, Loader2, Building2 } from "lucide-react";
import EventDialog, { type EventFormValues } from "@/components/app/event-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import StatusBadge from "@/components/app/status-badge";
import { getTeamMembersFS } from "@/services/team-member-service";
import { getAccountsFS } from "@/services/account-service";
import { getEventsFS, addEventFS, updateEventFS, deleteEventFS, initializeMockEventsInFirestore } from "@/services/event-service";
import { mockCrmEvents as initialMockEventsForSeeding } from "@/lib/seeds"; 
import Link from 'next/link';

export default function EventsPage() {
  const { toast } = useToast();
  const { userRole, teamMember } = useAuth(); // Added teamMember
  const [events, setEvents] = React.useState<CrmEvent[]>([]);
  const [allTeamMembers, setAllTeamMembers] = React.useState<TeamMember[]>([]);
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingEvent, setEditingEvent] = React.useState<CrmEvent | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = React.useState(false);
  const [isReadOnlyDialog, setIsReadOnlyDialog] = React.useState(false);
  const [eventToDelete, setEventToDelete] = React.useState<CrmEvent | null>(null);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<CrmEventType | "Todos">("Todos");
  const [statusFilter, setStatusFilter] = React.useState<CrmEventStatus | "Todos">("Todos");

  const isAdmin = userRole === 'Admin';

  React.useEffect(() => {
    async function loadInitialData() {
        setIsLoading(true);
        try {
            await initializeMockEventsInFirestore(initialMockEventsForSeeding); 
            const [fetchedEvents, fetchedTeamMembers, fetchedAccounts] = await Promise.all([
                getEventsFS(),
                getTeamMembersFS(),
                getAccountsFS(),
            ]);
            
            if (userRole === 'Clavadista' && teamMember) {
                setEvents(fetchedEvents.filter(event => event.assignedTeamMemberIds.includes(teamMember.id)));
            } else {
                setEvents(fetchedEvents);
            }
            setAllTeamMembers(fetchedTeamMembers);
            setAllAccounts(fetchedAccounts);

        } catch (error) {
            console.error("Failed to load events or team members:", error);
            toast({ title: "Error", description: "No se pudieron cargar los eventos o miembros del equipo.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
    loadInitialData();
  }, [toast, userRole, teamMember]);


  const handleAddNewEvent = () => {
    if (!isAdmin) return;
    setEditingEvent(null);
    setIsReadOnlyDialog(false);
    setIsEventDialogOpen(true);
  };

  const handleViewDetailsEvent = (event: CrmEvent) => {
    setEditingEvent(event);
    setIsReadOnlyDialog(true);
    setIsEventDialogOpen(true);
  }

  const handleEditEvent = (event: CrmEvent) => {
    if (!isAdmin) return;
    setEditingEvent(event);
    setIsReadOnlyDialog(false);
    setIsEventDialogOpen(true);
  };

  const handleSaveEvent = async (data: EventFormValues, eventId?: string) => {
    if (!isAdmin && !eventId) return; // Only admin can add
    if (!isAdmin && eventId) { // Non-admin cannot edit
        setIsLoading(false);
        toast({title: "Acción no permitida", description: "No tienes permiso para editar eventos.", variant: "destructive"});
        return;
    }
    setIsLoading(true); 

    try {
      let successMessage = "";
      if (eventId) {
        await updateEventFS(eventId, data);
        successMessage = `El evento "${data.name}" ha sido actualizado.`;
      } else {
        await addEventFS(data);
        successMessage = `El evento "${data.name}" ha sido añadido.`;
      }
      
      const updatedEvents = await getEventsFS();
      if (userRole === 'Clavadista' && teamMember) {
          setEvents(updatedEvents.filter(event => event.assignedTeamMemberIds.includes(teamMember.id)));
      } else {
          setEvents(updatedEvents);
      }
      toast({ title: "¡Operación Exitosa!", description: successMessage });
      setIsEventDialogOpen(false);
      setEditingEvent(null);
    } catch (error) {
        console.error("Error saving event:", error);
        toast({ title: "Error al Guardar", description: "No se pudo guardar el evento en Firestore.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  };


  const handleDeleteEvent = (event: CrmEvent) => {
    if (!isAdmin) return;
    setEventToDelete(event);
  };

  const confirmDeleteEvent = async () => {
    if (!isAdmin || !eventToDelete) return;
    setIsLoading(true);
    try {
      await deleteEventFS(eventToDelete.id);
      setEvents(prev => prev.filter(evt => evt.id !== eventToDelete.id)); // This works for Admin, Clavadista view is re-filtered
      toast({ title: "¡Evento Eliminado!", description: `El evento "${eventToDelete.name}" ha sido eliminado.`, variant: "destructive" });
    } catch (error) {
        console.error("Error deleting event:", error);
        toast({ title: "Error al Eliminar", description: "No se pudo eliminar el evento de Firestore.", variant: "destructive"});
    } finally {
        setIsLoading(false);
        setEventToDelete(null);
    }
  };

  const getAssignedTeamMemberNames = React.useCallback((teamMemberIds: string[]): string => {
    if (!teamMemberIds || teamMemberIds.length === 0 || allTeamMembers.length === 0) return 'N/A';
    return teamMemberIds
      .map(id => allTeamMembers.find(member => member.id === id)?.name)
      .filter(name => !!name)
      .join(', ') || 'N/A';
  }, [allTeamMembers]);

  const uniqueEventTypesForFilter = ["Todos", ...crmEventTypeList] as (CrmEventType | "Todos")[];
  const uniqueEventStatusesForFilter = ["Todos", ...crmEventStatusList] as (CrmEventStatus | "Todos")[];

  const filteredEvents = events
    .filter(event =>
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.location && event.location.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .filter(event => typeFilter === "Todos" || event.type === typeFilter)
    .filter(event => statusFilter === "Todos" || event.status === statusFilter);

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
            <PartyPopper className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Calendario y Gestión de Eventos</h1>
        </div>
        {isAdmin && (
          <Button onClick={handleAddNewEvent} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Evento
          </Button>
        )}
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Lista de Eventos</CardTitle>
          <CardDescription>
            {userRole === 'Clavadista' 
                ? "Visualiza los eventos de marketing y comerciales en los que estás asignado."
                : "Organiza, visualiza y gestiona todos los eventos de marketing y comerciales. Los administradores pueden añadir, editar y eliminar eventos."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Input
              placeholder="Buscar eventos (Nombre, Ubicación)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  Tipo: {typeFilter} <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {uniqueEventTypesForFilter.map(type => (
                   <DropdownMenuCheckboxItem key={type} checked={typeFilter === type} onCheckedChange={() => setTypeFilter(type)}>
                    {type}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  Estado: {statusFilter} <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {uniqueEventStatusesForFilter.map(status => (
                   <DropdownMenuCheckboxItem key={status} checked={statusFilter === status} onCheckedChange={() => setStatusFilter(status)}>
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {isLoading ? (
             <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando eventos...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[25%]">Nombre del Evento</TableHead>
                    <TableHead className="w-[15%]">Fechas</TableHead>
                    <TableHead className="w-[20%]">Cuenta Vinculada</TableHead>
                    <TableHead className="w-[15%]">Responsables</TableHead>
                    <TableHead className="text-center w-[10%]">Estado</TableHead>
                    <TableHead className="text-right w-[15%]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length > 0 ? filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>
                        {format(parseISO(event.startDate), "dd/MM/yy", { locale: es })}
                        {event.endDate && event.endDate !== event.startDate ? ` - ${format(parseISO(event.endDate), "dd/MM/yy", { locale: es })}` : ''}
                      </TableCell>
                      <TableCell>
                        {event.accountId && event.accountName ? (
                          <Link href={`/accounts/${event.accountId}`} className="hover:underline text-primary flex items-center gap-1.5 text-xs">
                             <Building2 className="h-3 w-3"/>{event.accountName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[200px]" title={getAssignedTeamMemberNames(event.assignedTeamMemberIds)}>
                          {getAssignedTeamMemberNames(event.assignedTeamMemberIds)}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge type="event" status={event.status} />
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
                            <DropdownMenuItem onSelect={() => handleViewDetailsEvent(event)}>
                              <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuItem onSelect={() => handleEditEvent(event)}>
                                  <Edit className="mr-2 h-4 w-4" /> Editar Evento
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                      onSelect={(e) => { e.preventDefault(); handleDeleteEvent(event); }}
                                      >
                                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar Evento
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  {eventToDelete && eventToDelete.id === event.id && (
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              Esta acción no se puede deshacer. Esto eliminará permanentemente el evento:
                                              <br />
                                              <strong className="mt-2 block">"{eventToDelete.name}"</strong>
                                          </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                          <AlertDialogCancel onClick={() => setEventToDelete(null)}>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={confirmDeleteEvent} variant="destructive">Sí, eliminar</AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  )}
                                </AlertDialog>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No se encontraron eventos que coincidan con tu búsqueda o filtros. {isAdmin ? "Puedes añadir un nuevo evento." : (userRole === 'Clavadista' ? "No tienes eventos asignados que coincidan." : "")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {!isLoading && filteredEvents.length > 0 && (
            <CardFooter>
                <p className="text-xs text-muted-foreground">Total de eventos mostrados: {filteredEvents.length} de {events.length}</p>
            </CardFooter>
        )}
      </Card>

      <EventDialog
        event={editingEvent}
        isOpen={isEventDialogOpen}
        onOpenChange={(open) => {
          setIsEventDialogOpen(open);
          if (!open) {
            setEditingEvent(null);
            setIsReadOnlyDialog(false);
          }
        }}
        onSave={handleSaveEvent}
        isReadOnly={isReadOnlyDialog || (!isAdmin && !!editingEvent)} // Clavadistas y SalesRep no pueden editar
        allTeamMembers={allTeamMembers}
        allAccounts={allAccounts}
      />
    </div>
  );
}
