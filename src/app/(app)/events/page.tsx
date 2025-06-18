
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { mockCrmEvents, crmEventTypeList, crmEventStatusList, mockTeamMembers } from "@/lib/data";
import type { CrmEvent, CrmEventType, CrmEventStatus } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Edit, Trash2, MoreHorizontal, PartyPopper, Filter, ChevronDown, Eye } from "lucide-react";
import EventDialog, { type EventFormValues } from "@/components/app/event-dialog"; // Re-added import
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import StatusBadge from "@/components/app/status-badge";

export default function EventsPage() {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [events, setEvents] = React.useState<CrmEvent[]>(() => [...mockCrmEvents]);
  const [editingEvent, setEditingEvent] = React.useState<CrmEvent | null>(null); // Re-added
  const [isEventDialogOpen, setIsEventDialogOpen] = React.useState(false); // Re-added
  const [isReadOnlyDialog, setIsReadOnlyDialog] = React.useState(false); // For "Ver Detalles"
  const [eventToDelete, setEventToDelete] = React.useState<CrmEvent | null>(null);
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<CrmEventType | "Todos">("Todos");
  const [statusFilter, setStatusFilter] = React.useState<CrmEventStatus | "Todos">("Todos");

  const isAdmin = userRole === 'Admin';

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
  
  const handleSaveEvent = (data: EventFormValues, eventId?: string) => {
    if (!isAdmin && !eventId) return; // Ensure admin for new, or allow edit if eventId (though edit button is admin only)

    const currentDate = format(new Date(), "yyyy-MM-dd");
    let successMessage = "";

    if (eventId) { // Editing existing event
      const updatedEvents = events.map(evt =>
        evt.id === eventId ? { 
            ...evt, 
            ...data, 
            startDate: format(data.startDate, "yyyy-MM-dd"), // Ensure date is string
            endDate: data.endDate ? format(data.endDate, "yyyy-MM-dd") : undefined,
            updatedAt: currentDate 
        } : evt
      );
      setEvents(updatedEvents);
      // Update mock data source
      const mockIndex = mockCrmEvents.findIndex(evt => evt.id === eventId);
      if (mockIndex !== -1) {
        mockCrmEvents[mockIndex] = { 
            ...mockCrmEvents[mockIndex], 
            ...data, 
            startDate: format(data.startDate, "yyyy-MM-dd"),
            endDate: data.endDate ? format(data.endDate, "yyyy-MM-dd") : undefined,
            updatedAt: currentDate 
        };
      }
      successMessage = `El evento "${data.name}" ha sido actualizado.`;
    } else { // Adding new event
      if (!isAdmin) return; // Double check admin for new
      const newEvent: CrmEvent = {
        id: `evt_${Date.now()}`,
        ...data,
        startDate: format(data.startDate, "yyyy-MM-dd"), // Ensure date is string
        endDate: data.endDate ? format(data.endDate, "yyyy-MM-dd") : undefined,
        createdAt: currentDate,
        updatedAt: currentDate,
      };
      setEvents(prev => [newEvent, ...prev]);
      mockCrmEvents.unshift(newEvent); 
      successMessage = `El evento "${data.name}" ha sido añadido.`;
    }
    toast({ title: "¡Operación Exitosa!", description: successMessage });
    setIsEventDialogOpen(false);
    setEditingEvent(null);
  };


  const handleDeleteEvent = (event: CrmEvent) => {
    if (!isAdmin) return;
    setEventToDelete(event);
  };

  const confirmDeleteEvent = () => {
    if (!isAdmin || !eventToDelete) return;
    
    const updatedEvents = events.filter(evt => evt.id !== eventToDelete.id);
    setEvents(updatedEvents);

    const mockIndex = mockCrmEvents.findIndex(evt => evt.id === eventToDelete.id);
    if (mockIndex !== -1) {
      mockCrmEvents.splice(mockIndex, 1);
    }
    toast({ title: "¡Evento Eliminado!", description: `El evento "${eventToDelete.name}" ha sido eliminado.`, variant: "destructive" });
    setEventToDelete(null);
  };

  const getAssignedTeamMemberNames = (teamMemberIds: string[]): string => {
    if (!teamMemberIds || teamMemberIds.length === 0) return 'N/A';
    return teamMemberIds
      .map(id => mockTeamMembers.find(member => member.id === id)?.name)
      .filter(name => !!name)
      .join(', ') || 'N/A';
  };

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
            <h1 className="text-3xl font-headline font-semibold">Gestión de Eventos</h1>
        </div>
        {isAdmin && ( // Re-added button
          <Button onClick={handleAddNewEvent}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Evento
          </Button>
        )}
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Lista de Eventos</CardTitle>
          <CardDescription>Administra todos los eventos de marketing y comerciales de la empresa.</CardDescription>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">Nombre del Evento</TableHead>
                  <TableHead className="w-[15%]">Tipo</TableHead>
                  <TableHead className="w-[15%]">Fechas</TableHead>
                  <TableHead className="w-[20%]">Responsables</TableHead>
                  <TableHead className="text-center w-[10%]">Estado</TableHead>
                  <TableHead className="text-right w-[15%]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length > 0 ? filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell>{event.type}</TableCell>
                    <TableCell>
                      {format(parseISO(event.startDate), "dd/MM/yy", { locale: es })}
                      {event.endDate && event.endDate !== event.startDate ? ` - ${format(parseISO(event.endDate), "dd/MM/yy", { locale: es })}` : ''}
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
                           {!isAdmin && !['Ver Detalles'].length && <DropdownMenuItem disabled>No hay acciones disponibles</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No hay eventos para mostrar. Intenta ajustar los filtros o añade un nuevo evento.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {filteredEvents.length > 0 && (
            <CardFooter>
                <p className="text-xs text-muted-foreground">Total de eventos mostrados: {filteredEvents.length} de {events.length}</p>
            </CardFooter>
        )}
      </Card>

      {(isAdmin || isEventDialogOpen) && ( // Ensure dialog can open for read-only for non-admins if triggered
        <EventDialog
          event={editingEvent}
          isOpen={isEventDialogOpen}
          onOpenChange={(open) => {
            setIsEventDialogOpen(open);
            if (!open) {
              setEditingEvent(null); // Clear editing state when dialog closes
              setIsReadOnlyDialog(false); // Reset read-only state
            }
          }}
          onSave={handleSaveEvent}
          isReadOnly={isReadOnlyDialog || (!isAdmin && !!editingEvent)} // Read-only if viewing details or if not admin and editing (though edit button is admin only)
        />
      )}
    </div>
  );
}

