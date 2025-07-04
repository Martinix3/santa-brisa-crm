
"use client";

import * as React from "react";
import { format, isSameDay, parseISO, startOfDay, endOfDay, isValid, startOfWeek, endOfWeek, isWithinInterval, addDays, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, ClipboardList, PartyPopper, Loader2, Filter, ChevronLeft, ChevronRight, Info, User, Send, Briefcase, Footprints, AlertTriangle, PlusCircle, Trash2, Edit } from "lucide-react";

// DND Kit Imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getOrdersFS, addScheduledTaskFS, deleteOrderFS, updateScheduledTaskFS, reorderTasksBatchFS } from "@/services/order-service";
import { getEventsFS, addEventFS, deleteEventFS, updateEventFS, reorderEventsBatchFS } from "@/services/event-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import type { Order, CrmEvent, TeamMember, UserRole, OrderStatus, FollowUpResultFormValues, NewScheduledTaskData, EventFormValues } from "@/types";
import StatusBadge from "@/components/app/status-badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { db } from "@/lib/firebase";
import { runTransaction, doc, collection, Timestamp } from "firebase/firestore";
import FollowUpResultDialog from "@/components/app/follow-up-result-dialog";
import NewTaskDialog from "@/components/app/new-task-dialog";
import NewEntryTypeDialog, { type EntryType } from "@/components/app/new-entry-type-dialog";
import EventDialog from "@/components/app/event-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import type { DayContentProps } from "react-day-picker";
import { DayDots } from "@/components/app/DayDots";


// --- TYPE DEFINITIONS ---
type AgendaItemType = 'tarea_comercial' | 'evento' | 'tarea_administrativa';

interface AgendaItemBase {
  id: string;
  date: Date;
  type: AgendaItemType;
  title: string;
  description?: string;
  rawItem: Order | CrmEvent;
  orderIndex: number;
}
interface AgendaTareaComercialItem extends AgendaItemBase { type: 'tarea_comercial'; rawItem: Order; }
interface AgendaTareaAdministrativaItem extends AgendaItemBase { type: 'tarea_administrativa'; rawItem: Order; }
interface AgendaEventItem extends AgendaItemBase { type: 'evento'; rawItem: CrmEvent; }
type AgendaItem = AgendaTareaComercialItem | AgendaEventItem | AgendaTareaAdministrativaItem;

type TypeFilter = 'all' | 'tareas_comerciales' | 'eventos' | 'tareas_administrativas';
type ViewMode = 'day' | 'week' | 'month';

// --- HELPER FUNCTIONS ---
const getAgendaItemIcon = (item: AgendaItem) => {
  if (item.type === 'evento') {
    return <PartyPopper className="h-4 w-4 text-brand-purple flex-shrink-0" />;
  }
  if (item.type === 'tarea_comercial') {
    return <ClipboardList className="h-4 w-4 text-brand-yellow flex-shrink-0" />;
  }
  if (item.type === 'tarea_administrativa') {
    return <Briefcase className="h-4 w-4 text-brand-blue flex-shrink-0" />;
  }
  return <ClipboardList className="h-4 w-4 text-brand-yellow flex-shrink-0" />;
};

const getInteractionType = (interaction: Order): string => {
    if (interaction.status === 'Programada' && interaction.taskCategory === 'Commercial') return "Visita Programada";
    if (interaction.status === 'Programada' && interaction.taskCategory === 'General') return "Tarea Administrativa";
    if (interaction.status === 'Seguimiento') return `Seguimiento: ${interaction.nextActionType || 'N/D'}`;
    return "Tarea Comercial";
}


// --- DND COMPONENTS ---
function AgendaItemCard({ item }: { item: AgendaItem }) {
  return (
    <Card className="shadow-sm w-full">
      <CardContent className="p-3 flex items-start gap-3">
        {getAgendaItemIcon(item)}
        <div className="flex-grow">
          <h4 className="font-semibold text-base">{item.title}</h4>
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </div>
        {(item.type === 'tarea_comercial' || item.type === 'tarea_administrativa') && <StatusBadge type="order" status={(item.rawItem as Order).status}/>}
        {item.type === 'evento' && <StatusBadge type="event" status={(item.rawItem as CrmEvent).status}/>}
      </CardContent>
    </Card>
  );
}

function SortableAgendaItem({ item, handleItemClick }: { item: AgendaItem; handleItemClick: (item: AgendaItem) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({id: item.id});
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };
  
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <SheetTrigger asChild>
        <button className="w-full text-left" onClick={() => handleItemClick(item)}>
          <AgendaItemCard item={item} />
        </button>
      </SheetTrigger>
    </div>
  );
}


// --- MAIN COMPONENT ---
export default function MyAgendaPage() {
  const { userRole, teamMember, dataSignature, refreshDataSignature } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = React.useState(true);
  const [allAgendaItems, setAllAgendaItems] = React.useState<AgendaItem[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<AgendaItem | null>(null);

  // State for filters and selection
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [userFilter, setUserFilter] = React.useState<string>('all');
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>('all');
  const [viewMode, setViewMode] = React.useState<ViewMode>('week');
  
  // Dialog states
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = React.useState(false);
  const [currentTask, setCurrentTask] = React.useState<Order | null>(null);
  
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = React.useState(false);
  const [taskToEdit, setTaskToEdit] = React.useState<Order | null>(null);
  const [newTaskDate, setNewTaskDate] = React.useState<Date | undefined>();
  const [newTaskCategory, setNewTaskCategory] = React.useState<'Commercial' | 'General'>('Commercial');
  
  const [isEntryTypeDialogOpen, setIsEntryTypeDialogOpen] = React.useState(false);
  
  const [isEventDialogOpen, setIsEventDialogOpen] = React.useState(false);
  const [eventToEdit, setEventToEdit] = React.useState<CrmEvent | null>(null);

  const [itemToDelete, setItemToDelete] = React.useState<AgendaItem | null>(null);

  // DND State
  const [activeAgendaItem, setActiveAgendaItem] = React.useState<AgendaItem | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );


  const isAdmin = userRole === 'Admin';
  
  React.useEffect(() => {
    async function loadAgendaData() {
      setIsLoading(true);
      try {
        const [orders, events, members] = await Promise.all([
          getOrdersFS(),
          getEventsFS(),
          getTeamMembersFS(['SalesRep', 'Clavadista', 'Admin'])
        ]);

        const tareaItems: AgendaItem[] = orders
            .filter(o => (o.status === 'Programada' || o.status === 'Seguimiento') && (o.status === 'Programada' ? o.visitDate : o.nextActionDate) && isValid(parseISO((o.status === 'Programada' ? o.visitDate : o.nextActionDate)!)))
            .map(o => ({
                id: o.id,
                date: parseISO((o.status === 'Programada' ? o.visitDate : o.nextActionDate)!),
                type: o.taskCategory === 'General' ? 'tarea_administrativa' : 'tarea_comercial',
                title: o.clientName,
                description: getInteractionType(o),
                rawItem: o,
                orderIndex: o.orderIndex ?? 0,
            }));
        
        const eventItems: AgendaItem[] = events
            .filter(e => e.startDate && isValid(parseISO(e.startDate)))
            .map(e => ({
                id: e.id,
                date: parseISO(e.startDate),
                type: 'evento' as const,
                title: e.name,
                description: e.type,
                rawItem: e,
                orderIndex: e.orderIndex ?? 0,
            }));
        
        setAllAgendaItems([...tareaItems, ...eventItems]);
        setTeamMembers(members);

      } catch (error) {
        console.error("Error loading agenda data:", error);
        toast({ title: "Error al Cargar Agenda", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadAgendaData();
  }, [dataSignature, toast]);
  
  const teamMembersMap = React.useMemo(() => new Map(teamMembers.map(m => [m.id, m])), [teamMembers]);
  
  const filteredItemsForHighlight = React.useMemo(() => {
    let items = allAgendaItems;

    if (typeFilter !== 'all') {
      items = items.filter(item => {
        if(typeFilter === 'tareas_comerciales') return item.type === 'tarea_comercial';
        if(typeFilter === 'tareas_administrativas') return item.type === 'tarea_administrativa';
        if(typeFilter === 'eventos') return item.type === 'evento';
        return false;
      });
    }
    
    let userFilteredItems;
    if (isAdmin) {
        if (userFilter !== 'all') {
            userFilteredItems = items.filter(item => {
                if (item.type === 'tarea_comercial' || item.type === 'tarea_administrativa') {
                    const order = item.rawItem as Order;
                    const assignedMember = teamMembers.find(m => m.name === order.salesRep);
                    return assignedMember?.id === userFilter || order.clavadistaId === userFilter;
                }
                if (item.type === 'evento') {
                    const event = item.rawItem as CrmEvent;
                    return event.assignedTeamMemberIds.includes(userFilter);
                }
                return false;
            });
        } else {
            userFilteredItems = items;
        }
    } else if (teamMember) {
        userFilteredItems = items.filter(item => {
            if (item.type === 'tarea_comercial' || item.type === 'tarea_administrativa') {
                const order = item.rawItem as Order;
                return order.salesRep === teamMember.name || order.clavadistaId === teamMember.id;
            }
            if (item.type === 'evento') {
                const event = item.rawItem as CrmEvent;
                return event.assignedTeamMemberIds.includes(teamMember.id);
            }
            return false;
        });
    } else {
        userFilteredItems = [];
    }
    return userFilteredItems;
  }, [allAgendaItems, typeFilter, userFilter, isAdmin, teamMember, teamMembers]);

 const { commercialTaskDays, eventDays, adminTaskDays } = React.useMemo(() => {
    const commercial = new Set<number>();
    const event = new Set<number>();
    const admin = new Set<number>();

    filteredItemsForHighlight.forEach(item => {
        const date = startOfDay(item.date);
        if (item.type === 'tarea_comercial') {
            commercial.add(date.getTime());
        } else if (item.type === 'evento') {
            event.add(date.getTime());
        } else if (item.type === 'tarea_administrativa') {
            admin.add(date.getTime());
        }
    });

    return {
        commercialTaskDays: Array.from(commercial).map(time => new Date(time)),
        eventDays: Array.from(event).map(time => new Date(time)),
        adminTaskDays: Array.from(admin).map(time => new Date(time)),
    };
  }, [filteredItemsForHighlight]);

  const { interval, itemsForView } = React.useMemo(() => {
      let intervalStart, intervalEnd;
      if (viewMode === 'day') {
          intervalStart = startOfDay(selectedDate);
          intervalEnd = endOfDay(selectedDate);
      } else if (viewMode === 'week') {
          intervalStart = startOfWeek(selectedDate, { locale: es });
          intervalEnd = endOfWeek(selectedDate, { locale: es });
      } else { // month
          intervalStart = startOfMonth(selectedDate);
          intervalEnd = endOfMonth(selectedDate);
      }
      
      const items = filteredItemsForHighlight
          .filter(item => {
            return isWithinInterval(item.date, { start: intervalStart, end: intervalEnd });
          })
          .sort((a,b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

      return { interval: { start: intervalStart, end: intervalEnd }, itemsForView: items };
  }, [selectedDate, viewMode, filteredItemsForHighlight]);
  
   const itemsForDayView = React.useMemo(() => {
        return filteredItemsForHighlight
          .filter(item => isSameDay(item.date, selectedDate))
          .sort((a,b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    }, [selectedDate, filteredItemsForHighlight]);

  const itemsGroupedByDay = React.useMemo(() => {
      const grouped = new Map<string, AgendaItem[]>();
      itemsForView.forEach(item => {
          const dayKey = format(item.date, 'yyyy-MM-dd');
          if (!grouped.has(dayKey)) {
              grouped.set(dayKey, []);
          }
          grouped.get(dayKey)!.push(item);
      });
      return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [itemsForView]);

  const handleDateChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -1));
    } else if (viewMode === 'month') {
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };
  
   const handleItemClick = (item: AgendaItem) => {
    setSelectedItem(item);
  };
  
  const handleOpenFollowUpDialog = (task: Order) => {
    setCurrentTask(task);
    setIsFollowUpDialogOpen(true);
  };
  
  const handleSaveFollowUp = async (data: FollowUpResultFormValues, originalTask: Order) => {
    try {
        await runTransaction(db, async (transaction) => {
            const originalTaskRef = doc(db, 'orders', originalTask.id);
            transaction.update(originalTaskRef, { status: "Completado" as OrderStatus, lastUpdated: new Date() });
            
            const newOrderRef = doc(collection(db, 'orders'));
            
            const subtotal = (data.numberOfUnits || 0) * (data.unitPrice || 0);
            const totalValue = subtotal * 1.21;
            
            let salesRepName = originalTask.salesRep;
            if (data.assignedSalesRepId && salesRepName !== teamMember?.name) {
                const assignedRep = teamMembers.find(m => m.id === data.assignedSalesRepId);
                if(assignedRep) salesRepName = assignedRep.name;
            }

            const newInteractionData: any = {
                clientName: originalTask.clientName,
                accountId: originalTask.accountId || null,
                createdAt: new Date(),
                lastUpdated: new Date(),
                salesRep: salesRepName,
                clavadistaId: originalTask.clavadistaId || null,
                clientStatus: "existing",
                originatingTaskId: originalTask.id,
                notes: data.notes || null,
                taskCategory: 'Commercial',
                orderIndex: 0
            };

            if (data.outcome === "successful") {
                newInteractionData.status = 'Confirmado';
                newInteractionData.visitDate = Timestamp.fromDate(new Date());
                newInteractionData.products = ["Santa Brisa 750ml"];
                newInteractionData.numberOfUnits = data.numberOfUnits;
                newInteractionData.unitPrice = data.unitPrice;
                newInteractionData.value = totalValue;
                newInteractionData.paymentMethod = data.paymentMethod;
            } else if (data.outcome === "follow-up") {
                newInteractionData.status = 'Seguimiento';
                newInteractionData.nextActionType = data.nextActionType;
                newInteractionData.nextActionCustom = data.nextActionType === 'Opción personalizada' ? data.nextActionCustom : null;
                newInteractionData.nextActionDate = data.nextActionDate ? Timestamp.fromDate(data.nextActionDate) : null;
                newInteractionData.visitDate = null;
            } else if (data.outcome === "failed") {
                newInteractionData.status = 'Fallido';
                newInteractionData.visitDate = Timestamp.fromDate(new Date());
                newInteractionData.failureReasonType = data.failureReasonType;
                newInteractionData.failureReasonCustom = data.failureReasonType === 'Otro (especificar)' ? data.failureReasonCustom : null;
            }
            transaction.set(newOrderRef, newInteractionData);
        });
        toast({ title: "Interacción Registrada", description: "Se ha guardado el resultado y actualizado la cartera."});
        refreshDataSignature();
    } catch(err: any) {
        console.error("Transaction failed: ", err);
        toast({title: "Error en la transacción", description: "No se pudo guardar el resultado.", variant: "destructive"});
    } finally {
        setIsFollowUpDialogOpen(false);
        setCurrentTask(null);
    }
  };

  const handleOpenNewEntryDialog = () => {
    setNewTaskDate(selectedDate);
    setIsEntryTypeDialogOpen(true);
  };

  const handleEntryTypeSelect = (type: EntryType) => {
    setIsEntryTypeDialogOpen(false);
    if (type === 'commercial_task') {
        setNewTaskCategory('Commercial');
        setTaskToEdit(null);
        setIsNewTaskDialogOpen(true);
    } else if (type === 'admin_task') {
        setNewTaskCategory('General');
        setTaskToEdit(null);
        setIsNewTaskDialogOpen(true);
    } else if (type === 'event') {
        setEventToEdit(null);
        setIsEventDialogOpen(true);
    }
  };
  
  const handleSaveTask = async (data: NewScheduledTaskData, originalTaskId?: string) => {
    if (!teamMember) {
      toast({ title: "Error", description: "No se pudo identificar al usuario.", variant: "destructive" });
      return;
    }
    try {
      const adjustedDate = new Date(data.visitDate);
      adjustedDate.setHours(12, 0, 0, 0);
      const saveData = { ...data, visitDate: adjustedDate };

      if(originalTaskId) {
        await updateScheduledTaskFS(originalTaskId, saveData);
        toast({ title: "¡Tarea Actualizada!", description: "La tarea ha sido modificada en la agenda." });
      } else {
        await addScheduledTaskFS(saveData, teamMember);
        toast({ title: "¡Tarea Creada!", description: "La nueva tarea ha sido añadida a la agenda." });
      }
      
      refreshDataSignature();
      setIsNewTaskDialogOpen(false);
      setTaskToEdit(null);
    } catch (error: any) {
      toast({ title: "Error al Guardar Tarea", description: error.message, variant: "destructive" });
    }
  };

  const handleSaveEvent = async (data: EventFormValues, eventId?: string) => {
    if (!isAdmin) return;
    try {
      if (eventId) {
        await updateEventFS(eventId, data);
        toast({ title: "¡Evento Actualizado!", description: `El evento "${data.name}" ha sido actualizado.` });
      } else {
        await addEventFS(data);
        toast({ title: "¡Evento Añadido!", description: `El evento "${data.name}" ha sido añadido.` });
      }
      refreshDataSignature();
      setIsEventDialogOpen(false);
      setEventToEdit(null);
    } catch (error) {
        console.error("Error saving event:", error);
        toast({ title: "Error al Guardar Evento", description: "No se pudo guardar el evento.", variant: "destructive"});
    }
  };
  
  const handleEditSelectedItem = () => {
      if (!selectedItem) return;
      if (selectedItem.type === 'evento') {
          setEventToEdit(selectedItem.rawItem as CrmEvent);
          setIsEventDialogOpen(true);
      } else {
          setTaskToEdit(selectedItem.rawItem as Order);
          setNewTaskCategory((selectedItem.rawItem as Order).taskCategory);
          setIsNewTaskDialogOpen(true);
      }
      setSelectedItem(null); // Close the sheet
  }

  const handleDeleteSelectedItem = () => {
      if (!selectedItem) return;
      setItemToDelete(selectedItem);
  }

  const confirmDeleteItem = async () => {
      if(!itemToDelete) return;
      try {
        if(itemToDelete.type === 'evento') {
            await deleteEventFS(itemToDelete.id);
            toast({ title: "Evento Eliminado", description: "El evento ha sido eliminado de la agenda."});
        } else {
            await deleteOrderFS(itemToDelete.id);
            toast({ title: "Tarea Eliminada", description: "La tarea ha sido eliminada de la agenda."});
        }
        refreshDataSignature();
      } catch (error) {
        toast({ title: "Error al Eliminar", description: "No se pudo eliminar el elemento.", variant: "destructive"});
      } finally {
        setItemToDelete(null);
        setSelectedItem(null);
      }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = allAgendaItems.find(i => i.id === active.id);
    if(item) {
        setActiveAgendaItem(item);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveAgendaItem(null);
    const { active, over } = event;

    if (!over || !active.id || active.id === over.id) {
        return;
    }
    
    const activeItem = allAgendaItems.find(i => i.id === active.id);
    if (!activeItem) {
        return;
    }

    // Case 1: Drop on a calendar day
    if (typeof over.id === 'string' && over.id.startsWith('drop-')) {
        const newDateStr = over.id.replace('drop-', '');
        const newDate = parseISO(newDateStr);
        
        if (!isValid(newDate) || isSameDay(activeItem.date, newDate)) return;

        const originalItems = [...allAgendaItems];
        setAllAgendaItems(prev => prev.map(item => item.id === active.id ? { ...item, date: newDate, orderIndex: 0 } : item));

        try {
            const updates = [{ id: active.id, orderIndex: 0, date: newDate }];
            if (activeItem.type === 'evento') {
                await reorderEventsBatchFS(updates);
            } else {
                await reorderTasksBatchFS(updates);
            }
            toast({ title: "Tarea Movida", description: `"${activeItem.title}" movida al ${format(newDate, 'dd/MM/yyyy')}.` });
            refreshDataSignature();
        } catch (error) {
            console.error("Error moving task to new date:", error);
            toast({ title: "Error al Mover", description: "No se pudo actualizar la fecha.", variant: "destructive" });
            setAllAgendaItems(originalItems); // Rollback on error
        }
    } 
    // Case 2: Drop on another item to reorder
    else {
        const overItem = allAgendaItems.find(i => i.id === over.id);

        if (overItem && isSameDay(activeItem.date, overItem.date)) {
            const oldIndex = allAgendaItems.findIndex(i => i.id === active.id);
            const newIndex = allAgendaItems.findIndex(i => i.id === over.id);

            if (oldIndex !== newIndex) {
                const newSortedItems = arrayMove(allAgendaItems, oldIndex, newIndex);
                const dailyItemsToUpdate = newSortedItems.filter(item => isSameDay(item.date, activeItem.date));

                setAllAgendaItems(newSortedItems);

                try {
                    const updates = dailyItemsToUpdate.map((item, index) => ({ id: item.id, orderIndex: index }));
                    if (activeItem.type === 'evento') {
                        await reorderEventsBatchFS(updates);
                    } else {
                        await reorderTasksBatchFS(updates);
                    }
                    toast({ title: "Agenda Reordenada", description: "El orden de las tareas del día se ha guardado." });
                } catch (error) {
                    console.error("Error reordering tasks:", error);
                    toast({ title: "Error al Reordenar", description: "No se pudo guardar el nuevo orden.", variant: "destructive" });
                    setAllAgendaItems(allAgendaItems); // Rollback on original array
                }
            }
        }
    }
  };

  const DroppableDay = (props: DayContentProps) => {
    const { date } = props;
    const { setNodeRef, isOver } = useDroppable({
        id: `drop-${format(date, 'yyyy-MM-dd')}`,
    });

    return (
        <div ref={setNodeRef} className={cn(
            "h-full w-full transition-transform duration-150", 
            isOver && "scale-125 bg-primary/20 rounded-md z-10"
        )}>
            <DayDots {...props} />
        </div>
    );
  };

  const modifiers = {
    commercial: commercialTaskDays,
    event: eventDays,
    admin: adminTaskDays,
  };
  
  const dragOverlayModifiers = [
    (args: {transform: {x: number, y: number, scaleX: number, scaleY: number}}) => {
      const { transform } = args;
      // Lift the item slightly above the cursor to see the drop target underneath
      return {
        ...transform,
        y: transform.y - 15,
      };
    }
  ];

  return (
    <>
    <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col h-full space-y-6">
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <CalendarIcon className="h-8 w-8 text-primary"/>
                <h1 className="text-3xl font-headline font-semibold">
                    Agenda del Equipo
                </h1>
            </div>
          </header>
          
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5 text-muted-foreground"/>Filtros de Agenda</CardTitle>
                <CardDescription>Utiliza los filtros para personalizar la vista de tu agenda.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
                {isAdmin && (
                    <div className="flex-1 min-w-[180px]">
                        <p className="text-sm font-medium mb-1">Comercial / Clavadista</p>
                        <Select value={userFilter} onValueChange={setUserFilter}>
                            <SelectTrigger><SelectValue placeholder="Filtrar por usuario..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {teamMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <div className="flex-1 min-w-[180px]">
                    <p className="text-sm font-medium mb-1">Tipo de Entrada</p>
                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                        <SelectTrigger><SelectValue placeholder="Filtrar por tipo..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todo</SelectItem>
                            <SelectItem value="tareas_comerciales">Tareas Comerciales</SelectItem>
                            <SelectItem value="tareas_administrativas">Tareas Administrativas</SelectItem>
                            <SelectItem value="eventos">Eventos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
              <div className="lg:col-span-1">
                  <Card>
                       <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
                            <CardTitle>Calendario</CardTitle>
                             <Button onClick={handleOpenNewEntryDialog} size="icon" className="rounded-full h-8 w-8">
                                <PlusCircle className="h-4 w-4" />
                                <span className="sr-only">Añadir Entrada</span>
                            </Button>
                        </CardHeader>
                      <CardContent className="p-2 flex justify-center">
                          <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(day) => { if(day) { setSelectedDate(day); setViewMode('day'); } }}
                              locale={es}
                              modifiers={modifiers}
                              components={{ DayContent: DroppableDay }}
                              classNames={{
                                today: "bg-muted/50",
                                selected:
                                    "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary focus:text-primary-foreground",
                              }}
                              className="p-0"
                          />
                      </CardContent>
                      <CardFooter className="flex-col items-start p-4 pt-0">
                            <Separator className="mb-2"/>
                            <div className="space-y-2 text-xs text-muted-foreground w-full">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-brand-yellow"/> Tarea Comercial</span>
                                    <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-brand-purple"/> Evento</span>
                                    <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-brand-blue"/> Tarea Admin.</span>
                                </div>
                            </div>
                      </CardFooter>
                  </Card>
              </div>
              
              <div className="lg:col-span-2">
                  <Card className="h-full flex flex-col">
                      <CardHeader>
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <CardTitle className="text-lg font-semibold">
                                Actividades para {viewMode === 'day' ? format(selectedDate, 'dd MMMM, yyyy', {locale: es}) : `${format(interval.start, 'dd MMM', {locale: es})} - ${format(interval.end, 'dd MMM, yyyy', {locale: es})}`}
                            </CardTitle>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                                    <Button variant={viewMode === 'day' ? 'primary' : 'ghost'} className="h-8 px-3" onClick={() => setViewMode('day')}>Día</Button>
                                    <Button variant={viewMode === 'week' ? 'primary' : 'ghost'} className="h-8 px-3" onClick={() => setViewMode('week')}>Semana</Button>
                                    <Button variant={viewMode === 'month' ? 'primary' : 'ghost'} className="h-8 px-3" onClick={() => setViewMode('month')}>Mes</Button>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleDateChange('prev')}><ChevronLeft className="h-4 w-4"/></Button>
                                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleDateChange('next')}><ChevronRight className="h-4 w-4"/></Button>
                                </div>
                            </div>
                          </div>
                      </CardHeader>
                      <CardContent className="flex-grow overflow-y-auto pr-3">
                          {isLoading ? (
                              <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                          ) : (
                                viewMode === 'day' ? (
                                    <SortableContext items={itemsForDayView.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-4">
                                            {itemsForDayView.length > 0 ? itemsForDayView.map(item => (
                                                <SortableAgendaItem key={item.id} item={item} handleItemClick={handleItemClick} />
                                            )) : (
                                                <div className="flex items-center justify-center h-full text-muted-foreground text-center">
                                                    <p>No hay actividades programadas con los filtros seleccionados.</p>
                                                </div>
                                            )}
                                        </div>
                                    </SortableContext>
                                ) : (
                                     itemsGroupedByDay.length > 0 ? (
                                        <div className="space-y-6">
                                            {itemsGroupedByDay.map(([day, items]) => (
                                                <div key={day}>
                                                    <h3 className="font-semibold mb-2">{format(parseISO(day), "EEEE dd 'de' MMMM", { locale: es })}</h3>
                                                    <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                                        <div className="space-y-3">
                                                            {items.map(item => (
                                                                <SortableAgendaItem key={item.id} item={item} handleItemClick={handleItemClick} />
                                                            ))}
                                                        </div>
                                                    </SortableContext>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground text-center">
                                            <p>No hay actividades programadas con los filtros seleccionados para este periodo.</p>
                                        </div>
                                    )
                                )
                          )}
                      </CardContent>
                  </Card>
              </div>
          </div>
        </div>

        <DragOverlay modifiers={dragOverlayModifiers}>
            {activeAgendaItem ? <AgendaItemCard item={activeAgendaItem} /> : null}
        </DragOverlay>
      </DndContext>

      {selectedItem && (
        <SheetContent>
            <SheetHeader>
                <SheetTitle className="flex items-center gap-2">{getAgendaItemIcon(selectedItem)} {selectedItem.title}</SheetTitle>
                <SheetDescription>{selectedItem.description}</SheetDescription>
                <div className="font-medium text-foreground mt-2">{format(selectedItem.date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}</div>
            </SheetHeader>
            <div className="py-4 space-y-4">
                {(selectedItem.type === 'tarea_comercial' || selectedItem.type === 'tarea_administrativa') && (
                  <Button className="w-full" onClick={() => handleOpenFollowUpDialog(selectedItem.rawItem as Order)}>
                      <Send className="mr-2 h-4 w-4"/>Registrar Resultado
                  </Button>
                )}
                {selectedItem.type === 'evento' && (
                  <Button asChild className="w-full">
                    <Link href={`/events?viewEventId=${selectedItem.id}`}><Info className="mr-2 h-4 w-4"/>Ver Detalles del Evento</Link>
                  </Button>
                )}
                {(selectedItem.type === 'tarea_comercial' || selectedItem.type === 'tarea_administrativa') && (
                    <div className="text-sm space-y-2">
                        <p><strong>Responsable:</strong> {(selectedItem.rawItem as Order).salesRep}</p>
                        {(selectedItem.rawItem as Order).clavadistaId && <p><strong>Clavadista:</strong> {teamMembersMap.get((selectedItem.rawItem as Order).clavadistaId!)?.name || 'N/D'}</p>}
                    </div>
                )}
                {selectedItem.type === 'evento' && (
                    <div className="text-sm space-y-2">
                        <p><strong>Responsables:</strong> {(selectedItem.rawItem as CrmEvent).assignedTeamMemberIds.map(id => teamMembersMap.get(id)?.name).filter(Boolean).join(', ')}</p>
                    </div>
                )}
            </div>
            {(isAdmin || (userRole === 'SalesRep' && (selectedItem.rawItem as Order).salesRep === teamMember?.name)) && (
                <>
                <Separator />
                <div className="pt-4 flex justify-end gap-2">
                    <Button variant="outline" onClick={handleEditSelectedItem}><Edit className="mr-2 h-4 w-4" /> Editar</Button>
                    <Button variant="destructive" onClick={handleDeleteSelectedItem}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</Button>
                </div>
                </>
            )}
        </SheetContent>
      )}
    </Sheet>
    
    <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente la entrada: <strong className="text-foreground">"{itemToDelete?.title}"</strong>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteItem} variant="destructive">Sí, eliminar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <FollowUpResultDialog
        order={currentTask}
        isOpen={isFollowUpDialogOpen}
        onOpenChange={setIsFollowUpDialogOpen}
        onSave={handleSaveFollowUp}
        allTeamMembers={teamMembers}
        currentUser={teamMember}
        currentUserRole={userRole}
    />
     <NewTaskDialog
        isOpen={isNewTaskDialogOpen}
        onOpenChange={(open) => {
            setIsNewTaskDialogOpen(open);
            if(!open) setTaskToEdit(null);
        }}
        selectedDate={newTaskDate}
        onSave={handleSaveTask}
        taskCategory={newTaskCategory}
        taskToEdit={taskToEdit}
      />
      <NewEntryTypeDialog
        isOpen={isEntryTypeDialogOpen}
        onOpenChange={setIsEntryTypeDialogOpen}
        onSelectType={handleEntryTypeSelect}
        selectedDate={newTaskDate}
      />
       {isAdmin && (
        <EventDialog
            event={eventToEdit}
            isOpen={isEventDialogOpen}
            onOpenChange={(open) => {
            setIsEventDialogOpen(open);
            if (!open) setEventToEdit(null);
            }}
            onSave={handleSaveEvent}
            isReadOnly={false}
            allTeamMembers={teamMembers}
        />
        )}
    </>
  );
}
