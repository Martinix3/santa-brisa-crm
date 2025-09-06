
"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus, AccountStatus, CrmEventStatus, DocumentStatus, PaymentStatus, ProductionRunStatus, QcStatus, TankStatus, DirectSaleStatus } from "@/types";

type BadgeType = 'order' | 'account' | 'event' | 'document' | 'payment' | 'production' | 'qc' | 'tank' | 'directSale';

type StatusKey = OrderStatus | AccountStatus | CrmEventStatus | DocumentStatus | PaymentStatus | ProductionRunStatus | QcStatus | TankStatus | DirectSaleStatus;

// Enhanced Color Logic:
// - Green tones for terminal success states (Delivered, Paid, Completed).
// - Blue/Purple tones for active, in-progress states (Confirmed, Processing, Shipped).
// - Yellow/Orange tones for states requiring attention (Pending, Follow-up, Paused).
// - Red tones for negative outcomes (Cancelled, Failed, Rejected).
// - Neutral gray for initial/draft states.

const statusColorMatrix: Record<StatusKey, string> = {
  // === Positive / Success (Green) ===
  'Entregado': 'bg-green-100 text-green-800 border-green-200',
  'Completado': 'bg-green-100 text-green-800 border-green-200',
  'Facturado': 'bg-green-600 text-white',
  'Pagado': 'bg-green-600 text-white',
  'pagado': 'bg-green-600 text-white',
  'Released': 'bg-green-100 text-green-800 border-green-200',
  'Libre': 'bg-green-100 text-green-800 border-green-200',
  'Activo': 'bg-green-100 text-green-800 border-green-200',
  'Repetición': 'bg-green-600 text-white font-semibold',
  'Finalizada': 'bg-green-600 text-white',
  'factura_validada': 'bg-green-100 text-green-800 border-green-200',

  // === In Progress / Active (Blue/Purple/Sky) ===
  'Confirmado': 'bg-blue-600 text-white',
  'confirmado': 'bg-blue-600 text-white',
  'Enviado': 'bg-sky-500 text-white',
  'enviado': 'bg-sky-500 text-white',
  'Procesando': 'bg-purple-500 text-white',
  'En curso': 'bg-purple-500 text-white',
  'En Curso': 'bg-purple-500 text-white',
  'Programada': 'bg-sky-500 text-white', // Changed from Slate to Sky Blue
  'factura_recibida': 'bg-purple-100 text-purple-800 border-purple-200',
  'en depósito': 'bg-cyan-500 text-white',
  'En Depósito': 'bg-cyan-500 text-white',
  'Ocupado': 'bg-blue-200 text-blue-800 border-blue-300',


  // === Attention / Warning (Yellow/Orange) ===
  'Pendiente': 'bg-amber-100 text-amber-800 border-amber-200',
  'pendiente': 'bg-amber-100 text-amber-800 border-amber-200',
  'Seguimiento': 'bg-amber-400 text-white',
  'Pausada': 'bg-orange-400 text-white',
  'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Parcial': 'bg-orange-400 text-white',
  'parcial': 'bg-orange-400 text-white',
  'Limpieza': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'factura_pendiente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Inactivo': 'bg-orange-100 text-orange-800 border-orange-200',


  // === Neutral / Info (Gray/Slate) ===
  'Borrador': 'bg-slate-500 text-white',
  'borrador': 'bg-slate-500 text-white',
  'proforma': 'bg-slate-100 text-slate-800 border-slate-200',
  
  
  // === Negative / Danger (Red) ===
  'Cancelado': 'bg-red-500 text-white',
  'cancelado': 'bg-red-500 text-white',
  'Fallido': 'bg-red-100 text-red-800 border-red-200',
  'Rejected': 'bg-red-100 text-red-800 border-red-200',


  // Default fallback
  'Pospuesto': 'bg-gray-400 text-white',
};


type StatusBadgeProps = 
  | { type: 'order'; status: OrderStatus; className?: string; children?: React.ReactNode; }
  | { type: 'account'; status: AccountStatus; isOverdue?: boolean; className?: string; children?: React.ReactNode; }
  | { type: 'event'; status: CrmEventStatus; className?: string; children?: React.ReactNode; }
  | { type: 'document'; status: DocumentStatus; className?: string; children?: React.ReactNode; }
  | { type: 'payment'; status: PaymentStatus; className?: string; children?: React.ReactNode; }
  | { type: 'production'; status: ProductionRunStatus; className?: string; children?: React.ReactNode; }
  | { type: 'qc'; status: QcStatus; className?: string; children?: React.ReactNode; }
  | { type: 'tank'; status: TankStatus; className?: string; children?: React.ReactNode; }
  | { type: 'directSale'; status: DirectSaleStatus; className?: string; children?: React.ReactNode; };

export default function StatusBadge(props: StatusBadgeProps) {
  const { type, status, className, children } = props;
  
  let badgeColorClass = statusColorMatrix[status] || 'bg-slate-400 text-white';

  if (type === 'account' && (props as any).isOverdue) {
    badgeColorClass = 'bg-red-500 text-white';
  }
  
  // Aliases for DirectSale
  if (type === 'directSale' && status === 'Confirmada') {
     badgeColorClass = statusColorMatrix['confirmado'];
  }
  if (type === 'directSale' && status === 'En Depósito') {
      badgeColorClass = statusColorMatrix['en depósito'];
  }
  
  const statusText = children || status.replace(/_/g, ' ');

  return (
    <Badge className={cn(badgeColorClass, "text-xs capitalize", className)}>
      {statusText}
    </Badge>
  );
}
