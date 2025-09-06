
"use client";

import * as React from 'react';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, AlertTriangle, GlassWater, Citrus, Palette } from 'lucide-react';
import Logo from '@/components/icons/Logo';
import { Button } from '@/components/ui/button';

// --- Components from the original layout ---
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
import Link from 'next/link';
import { LayoutDashboard, Users, FileText, ShoppingCart, Library, LogOut, Settings, UserCircle, Building2, ClipboardList, CalendarCheck, PartyPopper, ListChecks, Footprints, Briefcase, Target, Award, Sparkles, Receipt, PackageCheck, SendHorizonal, Truck, Archive, Wrench, Cog, Waypoints, Server, HardHat } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import DailyTasksWidget from '@/components/app/daily-tasks-widget';
import { CategoriesProvider } from '@/contexts/categories-context';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';


// --- Auth Guard Component ---
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, teamMember, loading, logout } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Verificando sesión...</p>
      </div>
    );
  }
  
  if (!user || !teamMember) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <Logo size={90} className="mb-4" />
        <h1 className="text-xl font-semibold text-destructive flex items-center gap-2">
          <AlertTriangle />
          Error de Perfil
        </h1>
        <p className="text-muted-foreground mt-2 max-w-md">Tu cuenta no tiene un perfil válido en el CRM o no se pudo cargar. Por favor, contacta con el administrador.</p>
        <Button onClick={logout} className="mt-6">Cerrar Sesión</Button>
      </div>
    );
  }

  return <>{children}</>;
}


export default function MainAppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, dataSignature } = useAuth();
  
  return (
    <AuthGuard>
      <CategoriesProvider dataSignature={dataSignature}>
        <SidebarProvider defaultOpen>
            <header className="header-full-width z-40 flex h-24 items-center justify-between bg-primary px-4 sm:px-6 text-primary-foreground">
                <div className="flex items-center gap-4">
                <div className="md:hidden">
                    <SidebarTrigger />
                </div>
                <Logo className="invert brightness-0" />
                </div>
                <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-3">
                    <GlassWater size={28} />
                    <Citrus size={28} />
                </div>
                <div className="h-8 w-px bg-primary-foreground/30 mx-2 hidden md:block" />
                <DailyTasksWidget />
                <UserMenu userEmail={user?.email} logout={logout}/>
                </div>
            </header>

            <div className="flex">
                <Sidebar collapsible="icon" className="sidebar-under-header border-r border-sidebar-border shadow-lg">
                    <SidebarContent>
                    <SidebarHeader />
                    <AppNavigation />
                    </SidebarContent>
                    <SidebarFooter className="p-2">
                    <SidebarMenu>
                        <SidebarMenuItem>
                        <SidebarMenuButton tooltip={{children: "Cerrar Sesión", side: "right"}} className="hover:bg-destructive/20 hover:text-destructive" onClick={logout}>
                            <LogOut />
                            <span>Cerrar Sesión</span>
                        </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                    </SidebarFooter>
                </Sidebar>
                <SidebarInset className="main-under-header">
                    <main className="flex-1 p-4 sm:p-6 overflow-auto">
                    {children}
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
      </CategoriesProvider>
    </AuthGuard>
  );
}

// ----- Navigation Components -----

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
    groupRoles: ['Admin', 'SalesRep', 'Distributor', 'Clavadista', 'Líder Clavadista'],
    items: [
      { href: '/dashboard', label: 'Panel Principal', icon: LayoutDashboard, roles: ['Admin', 'SalesRep', 'Distributor', 'Clavadista', 'Líder Clavadista'], exact: true },
      { href: '/my-agenda', label: 'Mi Agenda', icon: CalendarCheck, roles: ['Admin', 'SalesRep', 'Clavadista', 'Líder Clavadista'] },
      { href: '/accounts', label: 'Cuentas y Seguimiento', icon: Building2, roles: ['Admin', 'SalesRep', 'Clavadista', 'Líder Clavadista'] }, 
      { href: '/orders-dashboard', label: 'Pedidos de Colocación', icon: ShoppingCart, roles: ['Admin', 'SalesRep', 'Distributor', 'Clavadista', 'Líder Clavadista'] },
    ],
  },
  {
    id: 'crm',
    label: 'CRM y Ventas',
    groupRoles: ['Admin', 'SalesRep', 'Clavadista', 'Líder Clavadista'],
    items: [
      { href: '/request-sample', label: 'Solicitar Muestras', icon: SendHorizonal, roles: ['Admin', 'SalesRep', 'Clavadista', 'Líder Clavadista'] },
      { href: '/team-tracking', label: 'Equipo de Ventas', icon: Users, roles: ['Admin', 'SalesRep', 'Líder Clavadista'] },
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
      { href: '/admin/sample-management', label: 'Gestión de Muestras', icon: PackageCheck, roles: ['Admin'] },
    ],
  },
  {
    id: 'produccion',
    label: 'Producción',
    groupRoles: ['Admin'],
    items: [
      { href: '/production', label: 'Órdenes de Producción', icon: Cog, roles: ['Admin'] },
      { href: '/admin/inventory', label: 'Inventario', icon: Archive, roles: ['Admin'] },
      { href: '/tanks', label: 'Gestión de Tanques', icon: Server, roles: ['Admin'] },
      { href: '/traceability', label: 'Trazabilidad', icon: Waypoints, roles: ['Admin'] },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing y Soporte',
    groupRoles: ['Admin', 'SalesRep', 'Distributor', 'Clavadista', 'Líder Clavadista'],
    items: [
      { href: '/events', label: 'Eventos', icon: PartyPopper, roles: ['Admin', 'SalesRep', 'Distributor', 'Clavadista', 'Líder Clavadista'] },
      { href: '/clavadistas', label: 'Panel de Clavadistas', icon: Award, roles: ['Admin', 'SalesRep', 'Líder Clavadista'] }, 
      { href: '/marketing-resources', label: 'Recursos de Marketing', icon: Library, roles: ['Admin', 'SalesRep', 'Distributor', 'Clavadista', 'Líder Clavadista'] },
      { href: '/marketing/ai-assistant', label: 'Asistente IA', icon: Sparkles, roles: ['Admin', 'SalesRep', 'Clavadista', 'Líder Clavadista'] },
    ],
  },
   {
    id: 'integrations',
    label: 'Integraciones',
    groupRoles: ['Admin'], 
    items: [
      { href: '/projects', label: 'Proyectos (Holded)', icon: HardHat, roles: ['Admin'] }, 
    ],
  },
   {
    id: 'configuracion',
    label: 'Configuración',
    groupRoles: ['Admin'], 
    items: [
      { href: '/admin/settings', label: 'Panel de Configuración', icon: Settings, roles: ['Admin'], exact: true }, 
      { href: '/ui', label: 'UI-Kit Preview', icon: Palette, roles: ['Admin'] }, 
    ],
  },
];

function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { userRole, teamMember } = useAuth();

  const defaultOpenAccordion = React.useMemo(() => {
    if (!userRole) return [];
    const activeGroup = navigationStructure.find(group => 
      group.items.some(item => pathname.startsWith(item.href))
    );
    return activeGroup?.id ? [activeGroup.id] : [];
  }, [pathname, userRole]);

  if (!userRole) return null;

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    router.push(href);
  };

  return (
    <Accordion type="multiple" defaultValue={defaultOpenAccordion} className="w-full">
      {navigationStructure.map((group) => {
        const userCanSeeGroupCategory = !group.groupRoles || group.groupRoles.includes(userRole);
        
        if (!userCanSeeGroupCategory) {
          return null; 
        }

        let visibleItemsInGroup = group.items.filter(item => item.roles.includes(userRole));
        
        if (visibleItemsInGroup.length === 0) {
          return null; 
        }
        
        return (
          <AccordionItem value={group.id} key={group.id} className="border-none">
            <AccordionTrigger className="p-2 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:no-underline hover:bg-sidebar-accent rounded-md group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0">
               <span className="group-data-[collapsible=icon]:hidden">{group.label}</span>
            </AccordionTrigger>
            <AccordionContent className="pb-0 pl-3">
              <SidebarMenu>
                {visibleItemsInGroup.map((item) => {
                  let href = item.href;
                  
                  if (item.label === 'Panel Principal' && userRole === 'Clavadista' && teamMember?.id) {
                      href = `/clavadistas/${teamMember.id}`;
                  }

                  let isActive = item.exact ? pathname === href : pathname.startsWith(href);
                  if (item.href === '/dashboard' && pathname !== '/dashboard') isActive = false;
                  if (userRole === 'Clavadista' && pathname.startsWith('/clavadistas/') && item.href === '/dashboard') isActive = true;
                  
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={{ children: item.label, side: "right" }}>
                        <Link href={href} onClick={(e) => handleNavigation(e, href)}><item.icon /><span>{item.label}</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

function getRoleDisplayName(role: UserRole | null): string {
  if (!role) return "Usuario";
  switch (role) {
    case 'Admin': return 'Administrador';
    case 'SalesRep': return 'Rep. Ventas';
    case 'Distributor': return 'Distribuidor';
    case 'Clavadista': return 'Clavadista';
    case 'Líder Clavadista': return 'Líder Clavadista';
    default: return 'Usuario';
  }
}

interface UserMenuProps {
  userEmail?: string | null;
  logout: () => Promise<void>;
}

function UserMenu({ userEmail, logout }: UserMenuProps) {
  const router = useRouter();
  const { userRole, teamMember } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const profileLink = userRole === 'Clavadista' && teamMember ? `/clavadistas/${teamMember.id}` : '#';

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
          <Separator />
           <DropdownMenuItem asChild disabled={userRole !== 'Clavadista' || !teamMember}>
              <Link href={profileLink}>
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Mi Perfil</span>
              </Link>
            </DropdownMenuItem>
          <Separator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
