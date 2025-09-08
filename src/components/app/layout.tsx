
"use client";

import * as React from 'react';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, AlertTriangle, GlassWater, Citrus, Palette, Plus, Zap } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { RolUsuario as UserRole } from "@ssot";
import QuickHubDialog from "@/features/hub/quick-hub-dialog";


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
  const [hubOpen, setHubOpen] = React.useState(false);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = navigator.platform.toLowerCase().includes("mac") ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setHubOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  
  return (
    <AuthGuard>
      <CategoriesProvider dataSignature={dataSignature}>
        <div className="flex min-h-screen w-full bg-muted/40">
          <AppNavigation />
          <div className="flex flex-col flex-1">
            <main className="flex-1 w-full">
              {children}
            </main>
          </div>
        </div>
        <QuickHubDialog open={hubOpen} onOpenChange={setHubOpen} />
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
    groupRoles: ['Admin', 'Ventas', 'Distributor', 'Clavadista', 'Líder Clavadista'],
    items: [
      { href: '/dashboard', label: 'Panel Principal', icon: LayoutDashboard, roles: ['Admin', 'Ventas', 'Distributor', 'Clavadista', 'Líder Clavadista'], exact: true },
      { href: '/my-agenda', label: 'Mi Agenda', icon: CalendarCheck, roles: ['Admin', 'Ventas', 'Clavadista', 'Líder Clavadista'] },
      { href: '/accounts', label: 'Cuentas y Seguimiento', icon: Building2, roles: ['Admin', 'Ventas', 'Clavadista', 'Líder Clavadista'] }, 
      { href: '/orders-dashboard', label: 'Pedidos de Colocación', icon: ShoppingCart, roles: ['Admin', 'Ventas', 'Distributor', 'Clavadista', 'Líder Clavadista'] },
    ],
  },
  {
    id: 'crm',
    label: 'CRM y Ventas',
    groupRoles: ['Admin', 'Ventas', 'Clavadista', 'Líder Clavadista'],
    items: [
      { href: '/request-sample', label: 'Solicitar Muestras', icon: SendHorizonal, roles: ['Admin', 'Ventas', 'Clavadista', 'Líder Clavadista'] },
      { href: '/team-tracking', label: 'Equipo de Ventas', icon: Users, roles: ['Admin', 'Ventas', 'Líder Clavadista'] },
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
    groupRoles: ['Admin', 'Ventas', 'Distributor', 'Clavadista', 'Líder Clavadista'],
    items: [
      { href: '/events', label: 'Eventos', icon: PartyPopper, roles: ['Admin', 'Ventas', 'Distributor', 'Clavadista', 'Líder Clavadista'] },
      { href: '/clavadistas', label: 'Panel de Clavadistas', icon: Award, roles: ['Admin', 'Ventas', 'Líder Clavadista'] }, 
      { href: '/marketing-resources', label: 'Recursos de Marketing', icon: Library, roles: ['Admin', 'Ventas', 'Distributor', 'Clavadista', 'Líder Clavadista'] },
      { href: '/marketing/ai-assistant', label: 'Asistente IA', icon: Sparkles, roles: ['Admin', 'Ventas', 'Clavadista', 'Líder Clavadista'] },
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
  const { userRole, teamMember } = useAuth();
  
  if (!userRole) return null;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };
  
  const getHref = (item: NavItem) => {
    if (item.label === 'Panel Principal' && userRole === 'Clavadista' && teamMember?.id) {
        return `/clavadistas/${teamMember.id}`;
    }
    return item.href;
  };

  const checkIsActive = (item: NavItem) => {
      let href = getHref(item);
      let active = isActive(href, item.exact);
      if (item.href === '/dashboard' && pathname !== '/dashboard') active = false;
      if (userRole === 'Clavadista' && pathname.startsWith('/clavadistas/') && item.href === '/dashboard') active = true;
      return active;
  };

  return (
    <aside className="w-64 shrink-0 border-r border-zinc-200 bg-white flex-col shadow-sm hidden md:flex">
      <div className="px-sb4 py-sb3 font-semibold">Santa Brisa CRM</div>
      <nav className="flex-1 px-2 text-sm space-y-1">
        {navigationStructure.map(group => {
            const visibleItems = group.items.filter(item => item.roles.includes(userRole));
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.id}>
                <h3 className="px-2 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</h3>
                {visibleItems.map(item => (
                  <Link 
                      key={item.href}
                      href={getHref(item)}
                      className={cn(
                          "flex items-center gap-2 px-2 py-2 rounded-md text-zinc-700 hover:bg-zinc-100",
                          checkIsActive(item) && "bg-zinc-100 font-medium"
                      )}
                  >
                    <item.icon className="h-4 w-4"/> {item.label}
                  </Link>
                ))}
              </div>
            );
        })}
      </nav>
      <div className="p-3 text-[11px] text-zinc-500">⌘K Comando global</div>
    </aside>
  );
}
