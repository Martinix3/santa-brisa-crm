
"use client";

import type React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userRole, loading } = useAuth();
  
  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Verificando permisos...</p>
        </div>
    );
  }
  
  if (userRole !== 'Admin') {
    return (
      <Card className="shadow-subtle mt-6">
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
