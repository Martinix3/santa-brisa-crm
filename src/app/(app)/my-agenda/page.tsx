
"use client";

import * as React from "react";
import { addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, isSameDay, isWithinInterval, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, PartyPopper, ClipboardList, Loader2, Info, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getOrdersFS } from "@/services/order-service";
import { getEventsFS } from "@/services/event-service";
import type { Order, CrmEvent, TeamMember, UserRole, OrderStatus, CrmEventStatus } from "@/types";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/app/status-badge";
import Link from "next/link";
import FollowUpResultDialog from "@/components/app/follow-up-result-dialog";


// --- TYPE DEFINITIONS ---
interface AgendaItemBase {
  id: string;
  date: Date;
  type: 'order' | 'event';
  title: string;
  rawItem: Order | CrmEvent;
}
interface AgendaOrderItem extends AgendaItemBase { type: 'order'; rawItem: Order; }
interface AgendaEventItem extends AgendaItemBase { type: 'event'; rawItem: CrmEvent; }
type AgendaItem = AgendaOrderItem | AgendaEventItem;

type ViewMode = 'week' | 'month';


// --- HELPER FUNCTIONS ---
const getAgendaItemIcon = (item: AgendaItem) => {
  if (item.type === 'event') return <PartyPopper className="h-5 w-5 text-blue-500 flex-shrink-0" />;
  if (item.type === 'order') return <ClipboardList className="h-5 w-5 text-green-500 flex-shrink-0" />;
  return <CalendarIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />;
};


// --- MAIN COMPONENT ---
export default function MyAgendaPage() {
  const { userRole, teamMember, dataSignature } = useAuth();
  const { toast } = useToast();

  const [viewMode, setViewMode] = React.useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = React.useState(new Date());
  
  const [allAgendaItems, setAllAgendaItems] = React.useState<AgendaItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [selectedItem, setSelectedItem] = React.useState<AgendaItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = React.useState(false);
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = React.useState(false);

  React.useEffect(() => {
    async function loadAgendaData() {
      setIsLoading(true);
      try {
        const [orders, events] = await Promise.all([getOrdersFS(), getEventsFS()]);
        
        let userOrders: Order[] = [];
        let userEvents: CrmEvent[] = [];

        if (userRole === 'Admin') {
            userOrders = orders;
            userEvents = events;
        } else if (userRole === 'SalesRep' && teamMember) {
            userOrders = orders.filter(o => o.salesRep === teamMember.name);
            userEvents = events.filter(e => e.assignedTeamMemberIds.includes(teamMember.id));
        } else if (userRole === 'Clavadista' && teamMember) {
            userOrders = orders.filter(o => o.clavadistaId === teamMember.id);
            userEvents = events.filter(e => e.assignedTeamMemberIds.includes(teamMember.id));
        }

        const orderItems: AgendaItem[] = userOrders
            .filter(o => {
                if (o.status === 'Programada') {
                    return o.visitDate && isValid(parseISO(o.visitDate));
                }
                if (o.status === 'Seguimiento') {
                    return o.nextActionDate && isValid(parseISO(o.nextActionDate));
                }
                return false;
            })
            .map(o => ({
                id: o.id,
                date: parseISO((o.status === 'Programada' ? o.visitDate : o.nextActionDate)!),
                type: 'order' as const,
                title: o.clientName,
                rawItem: o,
            }));

        const eventItems: AgendaItem[] = userEvents
            .filter(e => e.startDate && isValid(parseISO(e.startDate)))
            .map(e => ({
                id: e.id,
                date: parseISO(e.startDate),
                type: 'event' as const,
                title: e.name,
                rawItem: e,
            }));
            
        setAllAgendaItems([...orderItems, ...eventItems]);

      } catch (error) {
        console.error("Error loading agenda data:", error);
        toast({ title: "Error al Cargar Agenda", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadAgendaData();
  }, [dataSignature, teamMember, userRole, toast]);

  const { visibleItems, intervalLabel } = React.useMemo(() => {
    let start: Date, end: Date, label: string;

    if (viewMode === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
      label = `Semana del ${format(start, 'd MMM')} al ${format(end, 'd MMM, yyyy', { locale: es })}`;
    } else { // month
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
      label = format(currentDate, 'MMMM yyyy', { locale: es });
    }

    const items = allAgendaItems.filter(item => isWithinInterval(item.date, { start, end }));
    return { visibleItems: items, intervalLabel: label };
  }, [allAgendaItems, currentDate, viewMode]);

  const groupedItems = React.useMemo(() => {
    const groups: { [key: string]: AgendaItem[] } = {};
    visibleItems.forEach(item => {
      const dayKey = format(item.date, 'yyyy-MM-dd');
      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(item);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [visibleItems]);


  const handleDateChange = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }
    const amount = direction === 'prev' ? -1 : 1;
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, amount * 7));
    } else {
      setCurrentDate(prev => new Date(prev.setMonth(prev.getMonth() + amount)));
    }
  };

  const handleItemClick = (item: AgendaItem) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  };
  
  const handleOpenFollowUp = () => {
    setIsSheetOpen(false);
    setTimeout(() => {
        setIsFollowUpDialogOpen(true);
    }, 150); // Delay to allow sheet to close
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-headline font-semibold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-primary"/>
            Mi Agenda
        </h1>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center p-1 border rounded-md">
            <Button variant="ghost" size="icon" onClick={() => handleDateChange('prev')}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => handleDateChange('today')}>Hoy</Button>
            <Button variant="ghost" size="icon" onClick={() => handleDateChange('next')}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="flex-grow text-center">
            <span className="text-lg font-medium capitalize">{intervalLabel}</span>
          </div>
           <div className="flex items-center p-1 border rounded-md bg-muted">
            <Button variant={viewMode === 'week' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('week')}>Semana</Button>
            <Button variant={viewMode === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('month')}>Mes</Button>
          </div>
        </div>
      </header>
      
      {/* Agenda Grid */}
      <div className="flex-grow overflow-y-auto pr-2">
        {isLoading ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : groupedItems.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No hay actividades para este período.</div>
        ) : (
            <div className="grid grid-cols-1 gap-6">
                {groupedItems.map(([dayKey, items]) => (
                    <div key={dayKey}>
                        <h2 className="font-semibold text-lg mb-2 sticky top-0 bg-background/80 backdrop-blur-sm py-2">
                           {format(parseISO(dayKey), "EEEE, d 'de' MMMM", { locale: es })}
                        </h2>
                        <div className="space-y-3">
                            {items.map(item => (
                                <button key={item.id} className="w-full text-left" onClick={() => handleItemClick(item)}>
                                    <Card className="hover:bg-secondary/50 transition-colors shadow-sm">
                                        <CardContent className="p-3 flex items-start gap-3">
                                            {getAgendaItemIcon(item)}
                                            <div className="flex-grow">
                                                <p className="font-medium">{item.title}</p>
                                                <p className="text-sm text-muted-foreground">
                                                  {item.type === 'order' ? (item.rawItem as Order).nextActionType : (item.rawItem as CrmEvent).type}
                                                </p>
                                            </div>
                                            {item.type === 'order' && <StatusBadge type="order" status={(item.rawItem as Order).status}/>}
                                            {item.type === 'event' && <StatusBadge type="event" status={(item.rawItem as CrmEvent).status}/>}
                                        </CardContent>
                                    </Card>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

       {/* Floating Action Button */}
      <Button 
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50" 
        onClick={() => toast({ title: "Próximamente", description: "El widget de adición rápida estará disponible pronto." })}
        aria-label="Añadir nueva tarea"
      >
        <Plus className="h-8 w-8" />
      </Button>

      {/* Detail Sheet */}
       <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent className="w-full sm:w-3/4 md:max-w-md lg:max-w-lg overflow-y-auto">
                {selectedItem && (
                    <>
                        <SheetHeader>
                            <SheetTitle className="flex items-center gap-3 text-xl">
                                {getAgendaItemIcon(selectedItem)}
                                {selectedItem.title}
                            </SheetTitle>
                            <SheetDescription>
                                {format(selectedItem.date, "EEEE, d 'de' MMMM, yyyy", { locale: es })}
                            </SheetDescription>
                        </SheetHeader>
                        <Separator className="my-4"/>
                        <div className="space-y-4 text-sm">
                            {selectedItem.type === 'order' && (
                                <>
                                    <p><strong>Tipo:</strong> Tarea Comercial</p>
                                    <p><strong>Estado:</strong> <StatusBadge type="order" status={(selectedItem.rawItem as Order).status} /></p>
                                    <p><strong>Acción:</strong> {(selectedItem.rawItem as Order).nextActionType || 'N/A'}</p>
                                    <p><strong>Asignado a:</strong> {(selectedItem.rawItem as Order).salesRep}</p>
                                    { (selectedItem.rawItem as Order).notes && <p><strong>Notas:</strong> {(selectedItem.rawItem as Order).notes}</p>}
                                </>
                            )}
                             {selectedItem.type === 'event' && (
                                <>
                                    <p><strong>Tipo:</strong> Evento</p>
                                    <p><strong>Estado:</strong> <StatusBadge type="event" status={(selectedItem.rawItem as CrmEvent).status} /></p>
                                    <p><strong>Ubicación:</strong> {(selectedItem.rawItem as CrmEvent).location || 'N/D'}</p>
                                    { (selectedItem.rawItem as CrmEvent).description && <p><strong>Descripción:</strong> {(selectedItem.rawItem as CrmEvent).description}</p>}
                                </>
                            )}
                        </div>
                        <SheetFooter className="mt-6">
                            <SheetClose asChild><Button variant="outline">Cerrar</Button></SheetClose>
                             {selectedItem.type === 'order' && (
                                <Button onClick={handleOpenFollowUp}><Send className="mr-2 h-4 w-4"/>Registrar Resultado</Button>
                            )}
                             {selectedItem.type === 'event' && (
                                <Button asChild><Link href="/events"><Info className="mr-2 h-4 w-4"/>Ver en Eventos</Link></Button>
                            )}
                        </SheetFooter>
                    </>
                )}
            </SheetContent>
       </Sheet>
       
       {/* Follow-up Dialog */}
        {selectedItem?.type === 'order' && (
             <FollowUpResultDialog
                order={selectedItem.rawItem as Order}
                isOpen={isFollowUpDialogOpen}
                onOpenChange={setIsFollowUpDialogOpen}
                onSave={async () => {
                    toast({ title: "Guardado", description: "La acción se guardaría aquí." });
                    setIsFollowUpDialogOpen(false);
                }}
                allTeamMembers={[]}
                currentUser={teamMember}
                currentUserRole={userRole}
            />
        )}
    </div>
  );
}
