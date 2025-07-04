
"use client";

import type React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userRole, loading } = useAuth();
  
  if (loading) {
    return <div className="p-4">Cargando...</div>;
  }
  
  if (userRole !== 'Admin') {
    return (
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
            Acceso Denegado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>No tienes permisos para acceder a esta sección.</p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
