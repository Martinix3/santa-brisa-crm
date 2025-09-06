
"use client";

import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { InteractionMode } from '../interaction-dialog';

interface InteractionHeaderProps {
  mode: InteractionMode;
}

export function InteractionHeader({ mode }: InteractionHeaderProps) {
  return (
    <div className="border-b px-6 py-4 bg-white dark:bg-card">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">
          {mode === 'compact' ? 'Registrar Interacción' : 'Registrar Pedido'}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {mode === 'compact'
            ? 'Añade una llamada, email o visita. Si es venta, pasa a Pedido.'
            : 'Revisa los datos del cliente, añade los productos y confirma el pedido.'}
        </DialogDescription>
      </DialogHeader>
    </div>
  );
}
