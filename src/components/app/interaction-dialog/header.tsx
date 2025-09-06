
"use client";

import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { InteractionMode } from '../interaction-dialog';

interface InteractionHeaderProps {
  mode: InteractionMode;
}

export function InteractionHeader({ mode }: InteractionHeaderProps) {
  return (
    <div className="border-b px-6 py-4">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">
          {mode === 'compact' ? 'Registrar Interacción' : 'Registrar Pedido'}
        </DialogTitle>
        <DialogDescription>
          {mode === 'compact'
            ? 'Añade una llamada, email o visita. Si es venta, pasa a Pedido.'
            : 'Revisa datos de cliente, dirección, productos y confirma.'}
        </DialogDescription>
      </DialogHeader>
    </div>
  );
}
