
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
import { LayoutDashboard, Users, FileText, ShoppingCart, Library, LogOut, Settings, UserCircle, Loader2, Building2, ClipboardList, CalendarCheck, PartyPopper, ListChecks, Footprints, Briefcase, Target, Award, Sparkles, Receipt } from 'lucide-react';
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
import type { UserRole, Order, CrmEvent, TeamMember, Account } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import DailyTasksWidget from '@/components/app/daily-tasks-widget';
import { Badge } from '@/components/ui/badge';
import { parseISO, startOfDay, endOfDay, isWithinInterval, format, getMonth, getYear, isSameMonth, isSameYear, addDays, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { getOrdersFS } from '@/services/order-service';
import { getEventsFS } from '@/services/event-service'; 
import { getAccountsFS } from '@/services/account-service';
import { getTeamMembersFS } from '@/services/team-member-service';
import { useToast } from '@/hooks/use-toast';


interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  exact?: boolean; // Para coincidencias exactas de ruta
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
    ],
  },
  {
    id: 'crm',
    label: 'CRM y Ventas',
    groupRoles: ['Admin', 'SalesRep', 'Clavadista'],
    items: [
      { href: '/crm-follow-up', label: 'Tareas de Seguimiento', icon: ClipboardList, roles: ['Admin', 'SalesRep', 'Clavadista'] },
      { href: '/order-form', label: 'Registrar Interacción', icon: FileText, roles: ['Admin', 'SalesRep', 'Clavadista'] },
      { href: '/accounts', label: 'Cuentas', icon: Building2, roles: ['Admin', 'SalesRep'] }, 
      { href: '/orders-dashboard', label: 'Panel de Pedidos', icon: ShoppingCart, roles: ['Admin', 'SalesRep', 'Distributor'] },
      { href: '/team-tracking', label: 'Equipo de Ventas', icon: Users, roles: ['Admin', 'SalesRep'] },
    ],
  },
   {
    id: 'facturacion_sb', 
    label: 'Facturación Santa Brisa',
    groupRoles: ['Admin'],
    items: [
      { href: '/direct-sales-sb', label: 'Ventas Directas SB', icon: Receipt, roles: ['Admin'] },
    ],
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
  const { userRole, teamMember, loading: authContextLoading } = useAuth();
  const { toast } = useToast();
  const today = startOfDay(new Date());
  const nextSevenDaysEnd = endOfDay(addDays(today, 6));
  const [taskCount, setTaskCount] = useState(0);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      setIsLoadingTasks(true); // Set loading true at the start of actual data fetching
      if (!userRole) { // Should not happen if logic below is correct, but as a safeguard
          setIsLoadingTasks(false);
          setTaskCount(0);
          return;
      }
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
      } catch (error) {
          console.error("Error fetching data for daily tasks menu:", error);
          toast({ title: "Error Tareas", description: "No se pudieron cargar las tareas del menú.", variant: "destructive"});
      } finally {
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
                return (itemStartDate <= nextSevenDaysEnd && itemEndDate >= today);
              }
              return isWithinInterval(itemStartDate, { start: today, end: nextSevenDaysEnd });
            }).length;
          setTaskCount(count);
          setIsLoadingTasks(false);
      }
    }

    if (authContextLoading) {
      setIsLoadingTasks(true);
      return;
    }

    // If auth is NOT loading, but userRole isn't defined yet, keep loading.
    // This prevents the flicker by not setting isLoadingTasks to false prematurely.
    if (!userRole) {
        setIsLoadingTasks(true);
        setTaskCount(0); // Reset count
        return;
    }

    // UserRole is defined, authContextLoading is false.
    // Now check for teamMember dependency for SalesRep/Clavadista.
    if ((userRole === 'SalesRep' || userRole === 'Clavadista') && !teamMember) {
      setIsLoadingTasks(true); // Still loading if teamMember is needed but not yet available.
      setTaskCount(0);
      return;
    }

    // Proceed to fetch tasks if Admin, or SalesRep/Clavadista with teamMember.
    if (userRole === 'Admin' || (teamMember && (userRole === 'SalesRep' || userRole === 'Clavadista'))) {
        fetchTasks();
    } else if (userRole === 'Distributor') { // Distributor has no tasks shown here.
        setTaskCount(0);
        setIsLoadingTasks(false);
    } else {
        // Fallback for any other unhandled userRole state after loading.
        setTaskCount(0);
        setIsLoadingTasks(false);
    }
  }, [userRole, teamMember, authContextLoading, toast, today, nextSevenDaysEnd]);


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
        {showIconLoader ? ( // Use showIconLoader for the dropdown content as well
          <div className="p-4 flex justify-center items-center h-[100px]">
             <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <DropdownMenuLabel className="font-normal text-center py-2">
              <p className="text-sm font-medium leading-none">Próximas Tareas</p>
              <p className="text-xs leading-none text-muted-foreground">
                Hasta el {format(nextSevenDaysEnd, "dd 'de' MMMM", { locale: es })}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DailyTasksWidget /> 
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


interface MonthlyProgressIndicatorProps {
  type: 'visits' | 'accounts';
  teamMember: TeamMember | null;
  userRole: UserRole | null;
  allTeamMembers: TeamMember[];
  allOrders: Order[];
  allAccounts: Account[];
}

function MonthlyProgressIndicator({ type, teamMember, userRole, allTeamMembers, allOrders, allAccounts }: MonthlyProgressIndicatorProps) {
  const [achieved, setAchieved] = useState(0);
  const [target, setTarget] = useState(0);
  const [tooltipTitle, setTooltipTitle] = useState("");

  const currentDate = useMemo(() => new Date(), []);
  const Icon = type === 'visits' ? Footprints : Briefcase;
  const unitLabel = type === 'visits' ? 'visitas' : 'cuentas';

  useEffect(() => {
    // const currentMonthValue = getMonth(currentDate); // Not used
    // const currentYearValue = getYear(currentDate); // Not used

    if (userRole === 'Admin') {
      const salesReps = allTeamMembers.filter(m => m.role === 'SalesRep');
      let teamTarget = 0;
      let teamAchieved = 0;

      if (type === 'visits') {
        teamTarget = salesReps.reduce((sum, rep) => sum + (rep.monthlyTargetVisits || 0), 0);
        teamAchieved = allOrders.filter(order =>
          salesReps.some(rep => rep.name === order.salesRep) &&
          isValid(parseISO(order.visitDate)) &&
          isSameMonth(parseISO(order.visitDate), currentDate) &&
          isSameYear(parseISO(order.visitDate), currentDate) &&
          order.status !== 'Programada'
        ).length;
        setTooltipTitle(`Equipo: Visitas`);
      } else if (type === 'accounts') {
        teamTarget = salesReps.reduce((sum, rep) => sum + (rep.monthlyTargetAccounts || 0), 0);
        teamAchieved = allAccounts.filter(acc =>
          salesReps.some(rep => rep.id === acc.salesRepId) &&
          isValid(parseISO(acc.createdAt)) &&
          isSameMonth(parseISO(acc.createdAt), currentDate) &&
          isSameYear(parseISO(acc.createdAt), currentDate)
        ).length;
        setTooltipTitle(`Equipo: Cuentas`);
      }
      setTarget(teamTarget);
      setAchieved(teamAchieved);

    } else if (userRole === 'SalesRep' && teamMember) {
      let individualTarget = 0;
      let individualAchieved = 0;

      if (type === 'visits') {
        individualTarget = teamMember.monthlyTargetVisits || 0;
        individualAchieved = allOrders.filter(order =>
          order.salesRep === teamMember.name &&
          isValid(parseISO(order.visitDate)) &&
          isSameMonth(parseISO(order.visitDate), currentDate) &&
          isSameYear(parseISO(order.visitDate), currentDate) &&
          order.status !== 'Programada'
        ).length;
         setTooltipTitle(`Personal: Visitas`);
      } else if (type === 'accounts') {
        individualTarget = teamMember.monthlyTargetAccounts || 0;
        individualAchieved = allAccounts.filter(acc =>
          acc.salesRepId === teamMember.id &&
          isValid(parseISO(acc.createdAt)) &&
          isSameMonth(parseISO(acc.createdAt), currentDate) &&
          isSameYear(parseISO(acc.createdAt), currentDate)
        ).length;
        setTooltipTitle(`Personal: Cuentas`);
      }
      setTarget(individualTarget);
      setAchieved(individualAchieved);
    } else {
      setTarget(0);
      setAchieved(0);
      setTooltipTitle("");
    }
  }, [teamMember, userRole, type, currentDate, allTeamMembers, allOrders, allAccounts]);

  if (!target && achieved === 0 && userRole !== 'Admin' && userRole !== 'SalesRep') return null; // Hide if not SalesRep or Admin without target/achieved
  if (userRole === 'Admin' && target === 0 && achieved === 0) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-auto px-2 text-muted-foreground">
                    <Icon className="h-5 w-5" />
                    <span className="ml-1.5 text-xs">-/-</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>Equipo sin objetivos de ${unitLabel} definidos o sin actividad este mes.</p>
            </TooltipContent>
        </Tooltip>
    );
  }


  const remaining = Math.max(0, target - achieved);

  if (remaining <= 0 && target > 0) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-auto px-2 text-green-600">
                    <Icon className="h-5 w-5" />
                    <Target className="ml-1 h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>{tooltipTitle} - ¡Objetivo mensual cumplido! ({achieved.toLocaleString('es-ES')}/{target.toLocaleString('es-ES')})</p>
            </TooltipContent>
        </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-auto px-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <Badge variant="outline" className="ml-1.5 text-xs">
            {remaining.toLocaleString('es-ES')}
          </Badge>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltipTitle} - Faltan {remaining.toLocaleString('es-ES')} ${unitLabel} para objetivo de {target.toLocaleString('es-ES')}. ({achieved.toLocaleString('es-ES')}/{target.toLocaleString('es-ES')})</p>
      </TooltipContent>
    </Tooltip>
  );
}


function MainAppLayout({ children }: { children: React.ReactNode }) {
  const { user, userRole, teamMember, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [allTeamMembersData, setAllTeamMembersData] = useState<TeamMember[]>([]);
  const [allOrdersData, setAllOrdersData] = useState<Order[]>([]);
  const [allAccountsData, setAllAccountsData] = useState<Account[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);


  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, router, pathname]);

  useEffect(() => {
    async function loadProgressData() {
        if (userRole === 'Admin' || userRole === 'SalesRep') {
            setIsDataLoading(true);
            try {
                const [members, orders, accounts] = await Promise.all([
                    getTeamMembersFS(),
                    getOrdersFS(),
                    getAccountsFS()
                ]);
                setAllTeamMembersData(members);
                setAllOrdersData(orders);
                setAllAccountsData(accounts);
            } catch (error) {
                console.error("Error loading data for progress indicators:", error);
                toast({ title: "Error Datos Progreso", description: "No se pudieron cargar los datos para indicadores.", variant: "destructive" });
            } finally {
                setIsDataLoading(false);
            }
        } else {
             setIsDataLoading(false);
        }
    }
    if (!loading && user) {
        loadProgressData();
    }
  }, [userRole, user, loading, toast]);


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

  const showMonthlyProgress = (userRole === 'SalesRep' || userRole === 'Admin');


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
            {showMonthlyProgress && !isDataLoading && (
              <>
                <MonthlyProgressIndicator type="accounts" teamMember={teamMember} userRole={userRole} allTeamMembers={allTeamMembersData} allOrders={allOrdersData} allAccounts={allAccountsData} />
                <MonthlyProgressIndicator type="visits" teamMember={teamMember} userRole={userRole} allTeamMembers={allTeamMembersData} allOrders={allOrdersData} allAccounts={allAccountsData} />
              </>
            )}
            {showMonthlyProgress && isDataLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            <DailyTasksMenu />
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
          
          // Evitar duplicar el enlace si ya existe uno general a /clavadistas (panel general)
          // Si el clavadista tiene un enlace específico a su perfil, se prioriza.
          const generalClavadistasLinkIndex = visibleItemsInGroup.findIndex(item => item.href === '/clavadistas');
          if (generalClavadistasLinkIndex !== -1) {
            // Si el teamMember existe y tiene ID, se reemplaza el general por el específico.
            // Si no, se mantiene el general (aunque para Clavadista, teamMember debería existir).
            if (teamMember && teamMember.id) {
              visibleItemsInGroup.splice(generalClavadistasLinkIndex, 1, clavadistaProfileItem);
            }
          } else if (teamMember && teamMember.id) { // Si no había enlace general pero sí hay teamMember, se añade el específico.
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
                    if (item.href === '/dashboard') {
                        isActive = pathname === item.href;
                    } else if (item.href === '/admin/settings') {
                        isActive = pathname === item.href || (pathname.startsWith('/admin/') && !pathname.startsWith('/admin/user-management') && !pathname.startsWith('/admin/objectives-management') && !pathname.startsWith('/admin/kpi-launch-targets') && !pathname.startsWith('/admin/promotional-materials'));
                    } else if (item.href === '/direct-sales-sb') {
                        isActive = pathname === item.href;
                    } else {
                        isActive = pathname.startsWith(item.href) && item.href !== '/dashboard' && item.href !== '/direct-sales-sb';
                    }
                     if (pathname.startsWith('/admin/') && group.id === 'configuracion') {
                        if (item.href.startsWith('/admin/')) {
                            isActive = pathname.startsWith(item.href);
                        }
                        if (item.href === '/admin/settings' && pathname.startsWith('/admin/')) isActive = true;
                     }
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

