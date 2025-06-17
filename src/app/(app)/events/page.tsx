
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { mockCrmEvents, crmEventTypeList, crmEventStatusList, mockTeamMembers } from "@/lib/data";
import type { CrmEvent, CrmEventType, CrmEventStatus } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Edit, Trash2, MoreHorizontal, PartyPopper, Filter, ChevronDown } from "lucide-react";
import EventDialog, { type EventFormValues } from "@/components/app/event-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';

const getEventStatusBadgeColor = (status: CrmEventStatus): string => {
  switch (status) {
    case 'Completado': return 'bg-green-500 hover:bg-green-600 text-white';
    case 'Confirmado': return 'bg-blue-500 hover:bg-blue-600 text-white';
    case 'En Curso': return 'bg-purple-500 hover:bg-purple-600 text-white';
    case 'Planificado': return 'bg-yellow-400 hover:bg-yellow-500 text-black';
    case 'Pospuesto': return 'bg-orange-400 hover:bg-orange-500 text-black';
    case 'Cancelado': return 'bg-red-500 hover:bg-red-600 text-white';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
};

export default function EventsPage() {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [events, setEvents] = React.useState<CrmEvent[]>(() => [...mockCrmEvents]);
  const [editingEvent, setEditingEvent] = React.useState<CrmEvent | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = React.useState(false);
  const [eventToDelete, setEventToDelete] = React.useState<CrmEvent | null>(null);
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<CrmEventType | "Todos">("Todos");
  const [statusFilter, setStatusFilter] = React.useState<CrmEventStatus | "Todos">("Todos");

  const isAdmin = userRole === 'Admin';

  const handleAddNewEvent = () => {
    if (!isAdmin) return;
    setEditingEvent(null);
    setIsEventDialogOpen(true);
  };

  const handleEditEvent = (event: CrmEvent) => {
    if (!isAdmin) return;
    setEditingEvent(event);
    setIsEventDialogOpen(true);
  };

  const handleSaveEvent = (data: EventFormValues) => {
    if (!isAdmin) return;
    const currentDate = format(new Date(), "yyyy-MM-dd");

    if (editingEvent) {
      const updatedEvents = events.map(evt =>
        evt.id === editingEvent.id ? { 
          ...editingEvent, 
          ...data, 
          startDate: format(data.startDate, "yyyy-MM-dd"),
          endDate: data.endDate ? format(data.endDate, "yyyy-MM-dd") : undefined,
          updatedAt: currentDate 
        } : evt
      );
      setEvents(updatedEvents);
      const mockIndex = mockCrmEvents.findIndex(evt => evt.id === editingEvent.id);
      if (mockIndex !== -1) {
        mockCrmEvents[mockIndex] = { 
            ...mockCrmEvents[mockIndex], 
            ...data, 
            startDate: format(data.startDate, "yyyy-MM-dd"),
            endDate: data.endDate ? format(data.endDate, "yyyy-MM-dd") : undefined,
            updatedAt: currentDate 
        };
      }
      toast({ title: "¡Evento Actualizado!", description: `El evento "${data.name}" ha sido actualizado.` });
    } else {
      const newEvent: CrmEvent = {
        id: `evt_${Date.now()}`,
        ...data,
        startDate: format(data.startDate, "yyyy-MM-dd"),
        endDate: data.endDate ? format(data.endDate, "yyyy-MM-dd") : undefined,
        createdAt: currentDate,
        updatedAt: currentDate,
      };
      setEvents(prev => [newEvent, ...prev]);
      mockCrmEvents.unshift(newEvent);
      toast({ title: "¡Evento Añadido!", description: `El evento "${data.name}" ha sido añadido.` });
    }
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
        {isAdmin && (
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
                      <Badge className={getEventStatusBadgeColor(event.status)}>{event.status}</Badge>
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
                          <DropdownMenuItem onSelect={() => { setEditingEvent(event); setIsEventDialogOpen(true); }}>
                            {isAdmin ? <><Edit className="mr-2 h-4 w-4" /> Editar</> : "Ver Detalles"}
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
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

      {isAdmin && (
        <EventDialog
          event={editingEvent}
          isOpen={isEventDialogOpen}
          onOpenChange={setIsEventDialogOpen}
          onSave={handleSaveEvent}
        />
      )}
       {!isAdmin && editingEvent && (
        <EventDialog
          event={editingEvent}
          isOpen={isEventDialogOpen}
          onOpenChange={setIsEventDialogOpen}
          onSave={()=>{}} 
          isReadOnly={true}
        />
      )}
    </div>
  );
}
