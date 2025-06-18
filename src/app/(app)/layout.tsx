
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
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import Logo from '@/components/icons/Logo';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, FileText, ShoppingCart, Library, LogOut, Settings, UserCircle, Loader2, Building2, ClipboardList, CalendarCheck, PartyPopper, ListChecks, Footprints, Briefcase, Target } from 'lucide-react';
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
import type { UserRole, Order, CrmEvent, TeamMember } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import DailyTasksWidget from '@/components/app/daily-tasks-widget';
import { Badge } from '@/components/ui/badge';
import { mockOrders, mockCrmEvents, mockAccounts } from '@/lib/data';
import { parseISO, startOfDay, isEqual, isWithinInterval, format, getMonth, getYear, isSameMonth, isSameYear } from 'date-fns';
import { es } from 'date-fns/locale';

const allNavItems = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard, roles: ['Admin', 'SalesRep', 'Distributor'] as UserRole[] },
  { href: '/my-agenda', label: 'Agenda', icon: CalendarCheck, roles: ['Admin', 'SalesRep'] as UserRole[] },
  { href: '/crm-follow-up', label: 'Tareas de Seguimiento', icon: ClipboardList, roles: ['Admin', 'SalesRep'] as UserRole[] },
  { href: '/events', label: 'Eventos', icon: PartyPopper, roles: ['Admin', 'SalesRep'] as UserRole[] },
  { href: '/order-form', label: 'Registrar Visita', icon: FileText, roles: ['Admin', 'SalesRep'] as UserRole[] },
  { href: '/accounts', label: 'Cuentas', icon: Building2, roles: ['Admin', 'SalesRep', 'Distributor'] as UserRole[] },
  { href: '/orders-dashboard', label: 'Panel de Pedidos', icon: ShoppingCart, roles: ['Admin', 'SalesRep', 'Distributor'] as UserRole[] },
  { href: '/team-tracking', label: 'Seguimiento de Equipo', icon: Users, roles: ['Admin', 'SalesRep'] as UserRole[] },
  { href: '/marketing-resources', label: 'Recursos de Marketing', icon: Library, roles: ['Admin', 'SalesRep', 'Distributor'] as UserRole[] },
  { href: '/admin/settings', label: 'Configuración', icon: Settings, roles: ['Admin'] as UserRole[] },
];


function DailyTasksMenu() {
  const { userRole, teamMember } = useAuth();
  const today = startOfDay(new Date());
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    if ((!teamMember && userRole === 'SalesRep') || userRole === 'Distributor') {
      setTaskCount(0);
      return;
    }

    let relevantOrders: Order[] = [];
    let relevantEvents: CrmEvent[] = [];

    if (userRole === 'Admin') {
      relevantOrders = mockOrders.filter(order =>
        (order.status === 'Seguimiento' || order.status === 'Fallido' || order.status === 'Programada') &&
        (order.status === 'Programada' ? order.visitDate : order.nextActionDate)
      );
      relevantEvents = mockCrmEvents;
    } else if (userRole === 'SalesRep' && teamMember) {
      relevantOrders = mockOrders.filter(order =>
        order.salesRep === teamMember.name &&
        (order.status === 'Seguimiento' || order.status === 'Fallido' || order.status === 'Programada') &&
        (order.status === 'Programada' ? order.visitDate : order.nextActionDate)
      );
      relevantEvents = mockCrmEvents.filter(event =>
        event.assignedTeamMemberIds.includes(teamMember.id)
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
          return isWithinInterval(today, { start: itemStartDate, end: itemEndDate });
        }
        return isEqual(itemStartDate, today);
      }).length;
    setTaskCount(count);

  }, [userRole, teamMember, today]);


  if (userRole === 'Distributor') return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
          <ListChecks className="h-5 w-5" />
          {taskCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-[1rem] p-0.5 text-xs flex items-center justify-center rounded-full"
            >
              {taskCount > 9 ? '9+' : taskCount}
            </Badge>
          )}
          <span className="sr-only">Tareas del Día</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto p-0 mr-2" align="end" forceMount>
          <DropdownMenuLabel className="font-normal text-center py-2">
            <p className="text-sm font-medium leading-none">Tareas para Hoy</p>
            <p className="text-xs leading-none text-muted-foreground">
              {format(today, "eeee, dd 'de' MMMM", { locale: es })}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DailyTasksWidget />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface MonthlyProgressIndicatorProps {
  type: 'visits' | 'accounts';
  teamMember: TeamMember;
}

function MonthlyProgressIndicator({ type, teamMember }: MonthlyProgressIndicatorProps) {
  const [achieved, setAchieved] = useState(0);
  const currentDate = useMemo(() => new Date(), []);
  const currentMonth = useMemo(() => getMonth(currentDate), [currentDate]);
  const currentYearValue = useMemo(() => getYear(currentDate), [currentDate]);

  const target = type === 'visits' ? teamMember.monthlyTargetVisits : teamMember.monthlyTargetAccounts;
  const Icon = type === 'visits' ? Footprints : Briefcase;
  const unitLabel = type === 'visits' ? 'visitas' : 'cuentas';
  const title = type === 'visits' ? 'Visitas Pendientes (Mes)' : 'Cuentas Pendientes (Mes)';

  useEffect(() => {
    if (!teamMember) return;

    if (type === 'visits') {
      const visitsThisMonth = mockOrders.filter(order =>
        order.salesRep === teamMember.name &&
        isSameMonth(parseISO(order.visitDate), currentDate) &&
        isSameYear(parseISO(order.visitDate), currentDate)
      ).length;
      setAchieved(visitsThisMonth);
    } else if (type === 'accounts') {
      const accountsThisMonth = mockAccounts.filter(acc =>
        acc.salesRepId === teamMember.id &&
        isSameMonth(parseISO(acc.createdAt), currentDate) &&
        isSameYear(parseISO(acc.createdAt), currentDate)
      ).length;
      setAchieved(accountsThisMonth);
    }
  }, [teamMember, type, currentDate, currentMonth, currentYearValue]);

  if (!target || target <= 0) return null;

  const remaining = Math.max(0, target - achieved);

  if (remaining <= 0) { // Target achieved or exceeded
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-auto px-2 text-green-600">
                    <Icon className="h-5 w-5" />
                    <Target className="ml-1 h-4 w-4" /> 
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>¡Objetivo de {unitLabel} mensual cumplido! ({achieved}/{target})</p>
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
            {remaining}
          </Badge>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Faltan {remaining} {unitLabel} para el objetivo de {target} este mes. ({achieved}/{target})</p>
      </TooltipContent>
    </Tooltip>
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
  
  if (!user) return null; 

  const navItemsForRole = userRole ? allNavItems.filter(item => item.roles.includes(userRole)) : [];

  const handleLogout = async () => {
    await logout();
    router.push('/login'); 
  };

  const showMonthlyProgress = (userRole === 'SalesRep' || userRole === 'Admin') && teamMember;


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
              <text
                x="50%"
                y="50%"
                dominantBaseline="central"
                textAnchor="middle"
                fontFamily="Inter, sans-serif"
                fontSize="12"
                fontWeight="bold"
                fill="hsl(var(--primary-foreground))"
              >
                SB
              </text>
            </svg>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <AppNavigation navItems={navItemsForRole} />
        </SidebarContent>
        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                tooltip={{children: "Cerrar Sesión", side: "right"}} 
                className="hover:bg-destructive/20 hover:text-destructive"
                onClick={handleLogout}
              >
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
            {/* Breadcrumbs or page title can go here */}
          </div>
          <div className="flex items-center gap-2">
            {showMonthlyProgress && teamMember && (
              <>
                <MonthlyProgressIndicator type="accounts" teamMember={teamMember} />
                <MonthlyProgressIndicator type="visits" teamMember={teamMember} />
              </>
            )}
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
  navItems: { href: string; label: string; icon: React.ElementType; roles: UserRole[] }[];
}

function AppNavigation({ navItems }: AppNavigationProps) {
  const pathname = usePathname();
  return (
    <SidebarMenu>
      {navItems.map((item) => {
        let isActive = false;
        if (item.href === '/admin/settings') {
          isActive = pathname.startsWith('/admin');
        } else if (item.href === '/dashboard') {
          isActive = pathname === item.href;
        } else {
          isActive = pathname.startsWith(item.href); 
        }
        
        return (
          <SidebarMenuItem key={item.label}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={{children: item.label, side: "right"}}
            >
              <Link href={item.href}>
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

function getRoleDisplayName(role: UserRole | null): string {
  if (!role) return "Usuario";
  switch (role) {
    case 'Admin': return 'Administrador';
    case 'SalesRep': return 'Rep. Ventas';
    case 'Distributor': return 'Distribuidor';
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
          <DropdownMenuItem disabled>
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

