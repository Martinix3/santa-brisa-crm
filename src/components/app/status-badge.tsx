
"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AccountStatus, PaymentStatus, ProductionRunStatus } from "@/types";
import { EstadoPedido as OrderStatus, EstadoEventoCrm as CrmEventStatus, EstadoDocumento as DocumentStatus, EstadoQC as QcStatus, EstadoTanque as TankStatus, EstadoVentaDirecta as DirectSaleStatus, EstadoSolicitudMuestra as SampleRequestStatus } from "@ssot";

type BadgeType = 'order' | 'account' | 'event' | 'document' | 'payment' | 'production' | 'qc' | 'tank' | 'directSale' | 'sampleRequest';

type StatusKey = OrderStatus | AccountStatus | CrmEventStatus | DocumentStatus | PaymentStatus | ProductionRunStatus | QcStatus | TankStatus | DirectSaleStatus | SampleRequestStatus;

// Enhanced Color Logic:
// - Green tones for terminal success states (Delivered, Paid, Completed).
// - Blue/Purple tones for active, in-progress states (Confirmed, Processing, Shipped).
// - Yellow/Orange tones for states requiring attention (Pending, Follow-up, Paused).
// - Red tones for negative outcomes (Cancelled, Failed, Rejected).
// - Neutral gray for initial/draft states.

const statusColorMatrix: Record<StatusKey, string> = {
  // === Positive / Success (Green) ===
  'Entregado': 'bg-brand-success/20 text-brand-success border border-brand-success/30',
  'Completado': 'bg-brand-success/20 text-brand-success border border-brand-success/30',
  'Facturado': 'bg-brand-success text-white',
  'Pagado': 'bg-brand-success text-white',
  'pagado': 'bg-brand-success text-white',
  'Released': 'bg-brand-success/20 text-brand-success border border-brand-success/30',
  'Libre': 'bg-brand-success/20 text-brand-success border border-brand-success/30',
  'Activo': 'bg-brand-success/20 text-brand-success border border-brand-success/30',
  'Repetición': 'bg-brand-success text-white font-semibold',
  'Finalizada': 'bg-brand-success text-white',
  'factura_validada': 'bg-brand-success/20 text-brand-success border border-brand-success/30',
  'Aprobada': 'bg-brand-success/20 text-brand-success border border-brand-success/30',
  'Enviada': 'bg-brand-success/20 text-brand-success border border-brand-success/30',

  // === In Progress / Active (Blue/Purple/Sky) ===
  'Confirmado': 'bg-brand-process text-white',
  'confirmado': 'bg-brand-process text-white',
  'Enviado': 'bg-sky-500 text-white',
  'enviado': 'bg-sky-500 text-white',
  'Procesando': 'bg-purple-500 text-white',
  'En curso': 'bg-brand-process text-white',
  'En Curso': 'bg-brand-process text-white',
  'Programada': 'bg-brand-info/20 text-brand-info border border-brand-info/30',
  'factura_recibida': 'bg-brand-info/20 text-brand-info border border-brand-info/30',
  'en depósito': 'bg-cyan-500 text-white',
  'En Depósito': 'bg-cyan-500 text-white',
  'Ocupado': 'bg-brand-process/20 text-brand-process border-brand-process/30',

  // === Attention / Warning (Yellow/Orange) ===
  'Pendiente': 'bg-brand-warning/20 text-brand-warning border border-brand-warning/30',
  'pendiente': 'bg-brand-warning/20 text-brand-warning border border-brand-warning/30',
  'Seguimiento': 'bg-brand-warning text-white',
  'Pausada': 'bg-orange-400 text-white',
  'Pending': 'bg-brand-warning/20 text-brand-warning border border-brand-warning/30',
  'Parcial': 'bg-orange-400 text-white',
  'parcial': 'bg-orange-400 text-white',
  'Limpieza': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'factura_pendiente': 'bg-brand-warning/20 text-brand-warning border border-brand-warning/30',
  'Inactivo': 'bg-orange-100 text-orange-800 border-orange-200',

  // === Neutral / Info (Gray/Slate) ===
  'Borrador': 'bg-brand-neutral/20 text-brand-neutral border border-brand-neutral/30',
  'borrador': 'bg-brand-neutral/20 text-brand-neutral border border-brand-neutral/30',
  'proforma': 'bg-slate-100 text-slate-800 border-slate-200',
  
  // === Negative / Danger (Red) ===
  'Cancelado': 'bg-brand-danger/80 text-white',
  'cancelado': 'bg-brand-danger/80 text-white',
  'Fallido': 'bg-brand-danger/20 text-brand-danger border border-brand-danger/30',
  'Rejected': 'bg-brand-danger/20 text-brand-danger border border-brand-danger/30',
  'Rechazada': 'bg-brand-danger/20 text-brand-danger border border-brand-danger/30',

  // Default fallback
  'Pospuesto': 'bg-gray-400 text-white',
};


type StatusBadgeProps = 
  | { type: 'order' | 'directSale'; status: OrderStatus | DirectSaleStatus; className?: string; children?: React.ReactNode; }
  | { type: 'account'; status: AccountStatus; isOverdue?: boolean; className?: string; children?: React.ReactNode; }
  | { type: 'event'; status: CrmEventStatus; className?: string; children?: React.ReactNode; }
  | { type: 'document'; status: DocumentStatus; className?: string; children?: React.ReactNode; }
  | { type: 'payment'; status: PaymentStatus; className?: string; children?: React.ReactNode; }
  | { type: 'production'; status: ProductionRunStatus; className?: string; children?: React.ReactNode; }
  | { type: 'qc'; status: QcStatus; className?: string; children?: React.ReactNode; }
  | { type: 'tank'; status: TankStatus; className?: string; children?: React.ReactNode; }
  | { type: 'sampleRequest'; status: SampleRequestStatus; className?: string; children?: React.ReactNode; };

export default function StatusBadge(props: StatusBadgeProps) {
  const { type, status, className, children } = props;
  
  let badgeColorClass = statusColorMatrix[status] || 'bg-slate-400 text-white';

  if (type === 'account' && (props as any).isOverdue) {
    badgeColorClass = 'bg-brand-danger text-white';
  }
  
  const statusText = children || (typeof status === 'string' ? status.replace(/_/g, ' ') : 'N/D');

  return (
    <Badge className={cn("text-xs capitalize", badgeColorClass, className)}>
      {statusText}
    </Badge>
  );
}
