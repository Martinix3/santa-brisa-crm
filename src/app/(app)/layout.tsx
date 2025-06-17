
"use client";

import type React from 'react';
import { useEffect } from 'react';
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
import { LayoutDashboard, Users, FileText, ShoppingCart, Library, LogOut, Settings, UserCircle, Loader2, Building2, ClipboardList, CalendarCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { UserRole } from '@/types';
import { useAuth } from '@/contexts/auth-context';

const allNavItems = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard, roles: ['Admin', 'SalesRep', 'Distributor'] as UserRole[] },
  { href: '/accounts', label: 'Cuentas', icon: Building2, roles: ['Admin', 'SalesRep', 'Distributor'] as UserRole[] },
  { href: '/my-agenda', label: 'Mi Agenda', icon: CalendarCheck, roles: ['Admin', 'SalesRep'] as UserRole[] },
  { href: '/crm-follow-up', label: 'Seguimiento', icon: ClipboardList, roles: ['Admin', 'SalesRep'] as UserRole[] },
  { href: '/team-tracking', label: 'Seguimiento de Equipo', icon: Users, roles: ['Admin', 'SalesRep'] as UserRole[] },
  { href: '/order-form', label: 'Registrar Visita', icon: FileText, roles: ['Admin', 'SalesRep'] as UserRole[] },
  { href: '/orders-dashboard', label: 'Panel de Pedidos', icon: ShoppingCart, roles: ['Admin', 'SalesRep', 'Distributor'] as UserRole[] },
  { href: '/marketing-resources', label: 'Recursos de Marketing', icon: Library, roles: ['Admin', 'SalesRep', 'Distributor'] as UserRole[] },
  { href: '/admin/settings', label: 'Configuración', icon: Settings, roles: ['Admin'] as UserRole[] },
];

function MainAppLayout({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading, logout } = useAuth();
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
  
  if (!user && pathname !== '/login') { // Added check for /login to prevent redirect loop
    return null; 
  }
  
  // If user is not logged in and not on login page, MainAppLayout shouldn't render its content.
  // This check ensures that if somehow this component is rendered on /login, it doesn't try to show sidebar etc.
  if (!user && pathname === '/login') {
    return <>{children}</>; // Render children directly for login page
  }
  
  if (!user) return null; // Fallback for any other unauthenticated state

  const navItemsForRole = userRole ? allNavItems.filter(item => item.roles.includes(userRole)) : [];

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
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <div className="flex-1">
            {/* Breadcrumbs or page title can go here */}
          </div>
          <UserMenu userRole={userRole} userEmail={user?.email} />
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
          // For other main routes, check if pathname starts with item.href
          // This makes parent routes active when on child routes, e.g. /accounts active when on /accounts/new
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
        <DropdownMenuItem>
          <UserCircle className="mr-2 h-4 w-4" />
          <span>Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default MainAppLayout;
