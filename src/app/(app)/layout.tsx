
"use client";

import type React from 'react';
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
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, ShoppingCart, Library, LogOut, Settings, UserCircle, Briefcase } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { UserRole } from '@/types';

// Simulate the current user's role. 
// Change this to 'SalesRep' or 'Distributor' to test different views.
const currentUserRole: UserRole = 'Admin'; 

const allNavItems = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard, roles: ['Admin', 'SalesRep'] as UserRole[] },
  { href: '/team-tracking', label: 'Seguimiento de Equipo', icon: Users, roles: ['Admin', 'SalesRep'] as UserRole[] },
  { href: '/order-form', label: 'Formulario de Pedido', icon: FileText, roles: ['Admin', 'SalesRep'] as UserRole[] },
  { href: '/orders-dashboard', label: 'Panel de Pedidos', icon: ShoppingCart, roles: ['Admin', 'SalesRep', 'Distributor'] as UserRole[] },
  { href: '/marketing-resources', label: 'Recursos de Marketing', icon: Library, roles: ['Admin', 'SalesRep', 'Distributor'] as UserRole[] },
];

function MainAppLayout({ children }: { children: React.ReactNode }) {
  const navItemsForRole = allNavItems.filter(item => item.roles.includes(currentUserRole));

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-lg">
        <SidebarHeader className="p-4 items-center justify-center">
          <Link href="/dashboard" className="block group-data-[collapsible=icon]:hidden">
            <Logo />
          </Link>
          <Link href="/dashboard" className="hidden group-data-[collapsible=icon]:block">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-label="Logotipo de Santa Brisa CRM (colapsado)">
              <text
                x="50%"
                y="50%"
                dominantBaseline="central"
                textAnchor="middle"
                fontFamily="Inter, sans-serif"
                fontSize="10"
                fontWeight="bold"
                fill="currentColor"
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
            {(currentUserRole === 'Admin') && (
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={{children: "Configuración", side: "right"}} asChild>
                  <Link href="#">
                    <Settings />
                    <span>Configuración</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={{children: "Cerrar Sesión", side: "right"}} className="hover:bg-destructive/20 hover:text-destructive">
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
          <UserMenu userRole={currentUserRole} />
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
      {navItems.map((item) => (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
            tooltip={{children: item.label, side: "right"}}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'Admin': return 'Administrador';
    case 'SalesRep': return 'Rep. Ventas';
    case 'Distributor': return 'Distribuidor';
    default: return 'Usuario';
  }
}

function UserMenu({ userRole }: { userRole: UserRole }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://placehold.co/40x40.png" alt="Avatar de usuario" data-ai-hint="user avatar" />
            <AvatarFallback>SB</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Usuario de Santa Brisa</p>
            <p className="text-xs leading-none text-muted-foreground">
              ({getRoleDisplayName(userRole)}) user@santabrisa.com
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <UserCircle className="mr-2 h-4 w-4" />
          <span>Perfil</span>
        </DropdownMenuItem>
        {userRole === 'Admin' && (
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Configuración</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default MainAppLayout;
