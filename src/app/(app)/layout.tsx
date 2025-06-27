
"use client";

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import Logo from '@/components/icons/Logo';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, FileText, ShoppingCart, Library, LogOut, Settings, UserCircle, Loader2, Building2, ClipboardList, CalendarCheck, PartyPopper, ListChecks, Footprints, Briefcase, Target, Award, Sparkles, Receipt, PackageCheck, SendHorizonal, Truck, Archive } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { UserRole, TeamMember, CrmEvent, Order } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { format, endOfDay, addDays, startOfDay, isWithinInterval, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { getOrdersFS } from '@/services/order-service';
import { getEventsFS } from '@/services/event-service';
import { useToast } from '@/hooks/use-toast';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  exact?: boolean; 
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  groupRoles?: UserRole[]; 
}

const navigationStructure: NavGroup[] = [
  {
    id: 'principal',
    label: 'Principal',
    groupRoles: ['Admin', 'SalesRep', 'Distributor', 'Clavadista'],
    items: [
      { href: '/dashboard', label: 'Panel Principal', icon: LayoutDashboard, roles: ['Admin', 'SalesRep', 'Distributor', 'Clavadista'], exact: true },
      { href: '/my-agenda', label: 'Mi Agenda', icon: CalendarCheck, roles: ['Admin', 'SalesRep', 'Clavadista'] },
      { href: '/orders-dashboard', label: 'Panel de Pedidos', icon: ShoppingCart, roles: ['Admin', 'SalesRep', 'Distributor', 'Clavadista'] },
      { href: '/accounts', label: 'Cuentas', icon: Building2, roles: ['Admin', 'SalesRep'] }, 
    ],
  },
  {
    id: 'crm',
    label: 'CRM y Ventas',
    groupRoles: ['Admin', 'SalesRep', 'Clavadista'],
    items: [
      { href: '/crm-follow-up', label: 'Panel de Actividad Comercial', icon: ClipboardList, roles: ['Admin', 'SalesRep', 'Clavadista'] },
      { href: '/order-form', label: 'Registrar Interacción', icon: FileText, roles: ['Admin', 'SalesRep', 'Clavadista'] },
      { href: '/request-sample', label: 'Solicitar Muestras', icon: SendHorizonal, roles: ['Admin', 'SalesRep', 'Clavadista'] },
      { href: '/team-tracking', label: 'Equipo de Ventas', icon: Users, roles: ['Admin', 'SalesRep'] },
    ],
  },
   {
    id: 'administrativo', 
    label: 'Administrativo',
    groupRoles: ['Admin'],
    items: [
      { href: '/direct-sales-sb', label: 'Facturación y Ventas Propias', icon: Briefcase, roles: ['Admin'] },
      { href: '/purchases', label: 'Gestión de Gastos', icon: Receipt, roles: ['Admin'] },
      { href: '/suppliers', label: 'Proveedores', icon: Truck, roles: ['Admin'] },
      { href: '/admin/promotional-materials', label: 'Inventario y Materiales', icon: Archive, roles: ['Admin'] },
    ],
  },
  {
    id: 'operaciones',
    label: 'Operaciones y Logística',
    groupRoles: ['Admin'],
    items: [
       { href: '/admin/sample-management', label: 'Gestión de Muestras', icon: PackageCheck, roles: ['Admin'] },
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing y Soporte',
    groupRoles: ['Admin', 'SalesRep', 'Distributor', 'Clavadista'],
    items: [
      { href: '/events', label: 'Eventos', icon: PartyPopper, roles: ['Admin', 'SalesRep', 'Distributor', 'Clavadista'] },
      { href: '/clavadistas', label: 'Panel de Clavadistas', icon: Award, roles: ['Admin', 'SalesRep', 'Clavadista'] }, 
      { href: '/marketing-resources', label: 'Recursos de Marketing', icon: Library, roles: ['Admin', 'SalesRep', 'Distributor', 'Clavadista'] },
      { href: '/marketing/ai-assistant', label: 'Asistente IA', icon: Sparkles, roles: ['Admin', 'SalesRep', 'Clavadista'] },
    ],
  },
  {
    id: 'configuracion',
    label: 'Configuración General',
    groupRoles: ['Admin'], 
    items: [
      { href: '/admin/settings', label: 'Panel de Configuración', icon: Settings, roles: ['Admin'], exact: true }, 
    ],
  },
];


function DailyTasksMenu() {
  const { userRole, teamMember, loading: authContextLoading, dataSignature } = useAuth();
  const { toast } = useToast();
  const [taskCount, setTaskCount] = useState(0);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  useEffect(() => {
    const localToday = startOfDay(new Date());
    const localNextSevenDaysEnd = endOfDay(addDays(localToday, 6));

    async function fetchTasksInternal() {
      // setIsLoadingTasks(true); // Ya se gestiona antes de llamar
      let relevantOrders: Order[] = [];
      let relevantEvents: CrmEvent[] = [];

      try {
        const [allOrders, allEvents] = await Promise.all([
            getOrdersFS(),
            getEventsFS()
        ]);

        if (userRole === 'Admin') {
          relevantOrders = allOrders.filter(order =>
            (order.status === 'Seguimiento' || order.status === 'Fallido' || order.status === 'Programada') &&
            (order.status === 'Programada' ? order.visitDate : order.nextActionDate) &&
            isValid(parseISO(order.status === 'Programada' ? order.visitDate! : order.nextActionDate!))
          );
          relevantEvents = allEvents.filter(event => isValid(parseISO(event.startDate)));
        } else if (userRole === 'SalesRep' && teamMember) {
          relevantOrders = allOrders.filter(order =>
            order.salesRep === teamMember.name &&
            (order.status === 'Seguimiento' || order.status === 'Fallido' || order.status === 'Programada') &&
            (order.status === 'Programada' ? order.visitDate : order.nextActionDate) &&
            isValid(parseISO(order.status === 'Programada' ? order.visitDate! : order.nextActionDate!))
          );
          relevantEvents = allEvents.filter(event =>
            event.assignedTeamMemberIds.includes(teamMember.id) && isValid(parseISO(event.startDate))
          );
        } else if (userRole === 'Clavadista' && teamMember) {
          relevantOrders = allOrders.filter(order =>
            order.clavadistaId === teamMember.id && 
            (order.status === 'Seguimiento' || order.status === 'Fallido' || order.status === 'Programada') &&
            (order.status === 'Programada' ? order.visitDate : order.nextActionDate) &&
            isValid(parseISO(order.status === 'Programada' ? order.visitDate! : order.nextActionDate!))
          );
          relevantEvents = allEvents.filter(event =>
            event.assignedTeamMemberIds.includes(teamMember.id) && isValid(parseISO(event.startDate))
          );
        }

        const orderAgendaItems = relevantOrders
            .map(order => ({
              itemDate: parseISO(order.status === 'Programada' ? order.visitDate! : order.nextActionDate!),
              sourceType: 'order' as 'order',
              rawItem: order,
            }));

          const eventAgendaItems = relevantEvents
            .map(event => ({
              itemDate: parseISO(event.startDate),
              sourceType: 'event' as 'event',
              rawItem: event,
            }));

          const allItems = [...orderAgendaItems, ...eventAgendaItems];
          const count = allItems
            .filter(item => {
              const itemStartDate = startOfDay(item.itemDate);
              if (item.sourceType === 'event' && (item.rawItem as CrmEvent).endDate) {
                const itemEndDate = startOfDay(parseISO((item.rawItem as CrmEvent).endDate!));
                return (itemStartDate <= localNextSevenDaysEnd && itemEndDate >= localToday); 
              }
              return isWithinInterval(itemStartDate, { start: localToday, end: localNextSevenDaysEnd });
            }).length;
          setTaskCount(count);

      } catch (error) {
          console.error("Error fetching data for daily tasks menu:", error);
          toast({ title: "Error Tareas", description: "No se pudieron cargar las tareas del menú.", variant: "destructive"});
          setTaskCount(0);
      } finally {
          setIsLoadingTasks(false);
      }
    }
    
    if (authContextLoading) {
      setIsLoadingTasks(true);
      return;
    }

    if (!userRole) { 
        setIsLoadingTasks(false);
        setTaskCount(0);
        return;
    }
    
    if ((userRole === 'SalesRep' || userRole === 'Clavadista') && !teamMember) {
      setIsLoadingTasks(false);
      setTaskCount(0);
      return;
    }
    
    const shouldFetchTasks = userRole === 'Admin' || (teamMember && (userRole === 'SalesRep' || userRole === 'Clavadista'));

    if (shouldFetchTasks) {
        setIsLoadingTasks(true); 
        fetchTasksInternal();
    } else { 
        setTaskCount(0);
        setIsLoadingTasks(false);
    }
  }, [userRole, teamMember, authContextLoading, dataSignature, toast]);


  const canShowWidgetIcon = userRole === 'Admin' || userRole === 'SalesRep' || userRole === 'Clavadista';

  if (!canShowWidgetIcon) {
    return null; 
  }
  
  const showIconLoader = isLoadingTasks;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
          <ListChecks className="h-5 w-5" />
          {!showIconLoader && taskCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-[1rem] p-0.5 text-xs flex items-center justify-center rounded-full"
            >
              {taskCount > 9 ? '9+' : taskCount}
            </Badge>
          )}
          {showIconLoader && (
             <Loader2 className="absolute h-3 w-3 animate-spin text-muted-foreground opacity-70" style={{top: '2px', right: '2px'}}/>
          )}
          <span className="sr-only">Próximas Tareas</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto p-0 mr-2" align="end" forceMount>
        {showIconLoader ? ( 
          <div className="p-4 flex justify-center items-center h-[100px]">
             <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="p-2"> 
            <p className="text-sm font-medium text-center">No implementado</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}



function MainAppLayout({ children }: { children: React.ReactNode }) {
  const { user, userRole, teamMember, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && pathname !== '/login') {
    return null;
  }

  if (!user && pathname === '/login') {
    return <>{children}</>;
  }

  if (!user || !userRole) return null; 

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-lg">
        <SidebarHeader className="p-4 items-center justify-center">
          <Link href="/dashboard" className="block group-data-[collapsible=icon]:hidden">
            <Logo />
          </Link>
          <Link href="/dashboard" className="hidden group-data-[collapsible=icon]:block">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" aria-label="Logotipo de Santa Brisa CRM (colapsado)">
              <rect width="32" height="32" rx="4" fill="hsl(var(--primary))" />
              <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="bold" fill="hsl(var(--primary-foreground))">SB</text>
            </svg>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <AppNavigation navStructure={navigationStructure} userRole={userRole} teamMember={teamMember} />
        </SidebarContent>
        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={{children: "Cerrar Sesión", side: "right"}} className="hover:bg-destructive/20 hover:text-destructive" onClick={handleLogout}>
                <LogOut />
                <span>Cerrar Sesión</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <SidebarTrigger />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UserMenu userRole={userRole} userEmail={user?.email} />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

interface AppNavigationProps {
  navStructure: NavGroup[];
  userRole: UserRole | null;
  teamMember: TeamMember | null; 
}

function AppNavigation({ navStructure, userRole, teamMember }: AppNavigationProps) {
  const pathname = usePathname();

  if (!userRole) {
    return null; 
  }

  return (
    <>
      {navStructure.map((group) => {
        const userCanSeeGroupCategory = !group.groupRoles || group.groupRoles.includes(userRole);
        
        if (!userCanSeeGroupCategory) {
          return null; 
        }

        let visibleItemsInGroup = group.items.filter(item => item.roles.includes(userRole));
        
        if (userRole === 'Clavadista' && group.id === 'marketing') {
          const clavadistaProfileItem: NavItem = {
            href: teamMember ? `/clavadistas/${teamMember.id}` : '/clavadistas',
            label: 'Mi Perfil Clavadista',
            icon: Award, 
            roles: ['Clavadista']
          };
          
          const generalClavadistasLinkIndex = visibleItemsInGroup.findIndex(item => item.href === '/clavadistas');
          if (generalClavadistasLinkIndex !== -1) {
            if (teamMember && teamMember.id) {
              visibleItemsInGroup.splice(generalClavadistasLinkIndex, 1, clavadistaProfileItem);
            }
          } else if (teamMember && teamMember.id) {
             visibleItemsInGroup.unshift(clavadistaProfileItem);
          }
        }


        if (visibleItemsInGroup.length === 0) {
          return null; 
        }

        return (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleItemsInGroup.map((item) => {
                  let isActive = false;
                  if (item.exact) {
                    isActive = pathname === item.href;
                  } else {
                    isActive = pathname.startsWith(item.href) && item.href !== '/dashboard';
                  }

                  if (item.href === '/dashboard' && pathname === item.href) {
                     isActive = true;
                  }
                  
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={{ children: item.label, side: "right" }}>
                        <Link href={item.href}><item.icon /><span>{item.label}</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
    </>
  );
}

function getRoleDisplayName(role: UserRole | null): string {
  if (!role) return "Usuario";
  switch (role) {
    case 'Admin': return 'Administrador';
    case 'SalesRep': return 'Rep. Ventas';
    case 'Distributor': return 'Distribuidor';
    case 'Clavadista': return 'Clavadista';
    default: return 'Usuario';
  }
}

interface UserMenuProps {
  userRole: UserRole | null;
  userEmail?: string | null;
}

function UserMenu({ userRole, userEmail }: UserMenuProps) {
  const { teamMember, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <TooltipProvider>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={teamMember?.avatarUrl || "https://placehold.co/40x40.png"} alt="Avatar de usuario" data-ai-hint="user avatar" />
              <AvatarFallback>{teamMember?.name?.substring(0,2).toUpperCase() || userEmail?.substring(0,2).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{teamMember?.name || 'Usuario de Santa Brisa'}</p>
              <p className="text-xs leading-none text-muted-foreground">
                ({getRoleDisplayName(userRole)}) {userEmail || 'email@example.com'}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
           {userRole === 'Clavadista' && teamMember && (
            <DropdownMenuItem asChild>
              <Link href={`/clavadistas/${teamMember.id}`}>
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Mi Perfil Clavadista</span>
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled={userRole !== 'Clavadista' && teamMember?.role !== 'Clavadista'}>
            <UserCircle className="mr-2 h-4 w-4" />
            <span>Perfil (Próximamente)</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}

export default MainAppLayout;
