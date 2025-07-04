
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function DeprecatedPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/inventory');
  }, [router]);

  return (
    <Card className="shadow-subtle">
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="mr-2 h-6 w-6 text-amber-500" />
          Página Movida
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4 text-center">
        <p>Esta página ha sido movida a la nueva sección de Inventario.</p>
        <p>Serás redirigido automáticamente.</p>
        <Button asChild>
          <Link href="/admin/inventory">Ir a la nueva página de Inventario</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
