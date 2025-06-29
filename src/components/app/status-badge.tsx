
"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus, AccountStatus, CrmEventStatus, PurchaseStatus, SampleRequestStatus, DirectSaleStatus } from "@/types";

type StatusBadgeProps = 
  | { type: 'order'; status: OrderStatus; className?: string; }
  | { type: 'account'; status: AccountStatus | ('Activo' | 'Inactivo' | 'Potencial' | 'Bloqueado'); className?: string; } // Allow both new and old status for transition
  | { type: 'event'; status: CrmEventStatus; className?: string; }
  | { type: 'purchase'; status: PurchaseStatus; className?: string; }
  | { type: 'sampleRequest'; status: SampleRequestStatus; className?: string; }
  | { type: 'directSale'; status: DirectSaleStatus; className?: string; };

const getOrderBadgeColorClass = (status: OrderStatus): string => {
  switch (status) {
    case 'Entregado': return 'bg-green-500 hover:bg-green-600 text-white';
    case 'Completado': return 'bg-green-100 text-green-800 border border-green-300';
    case 'Facturado': return 'bg-teal-500 hover:bg-teal-600 text-white';
    case 'Confirmado': return 'bg-[hsl(var(--brand-turquoise-hsl))] hover:brightness-90 text-white';
    case 'Enviado': return 'bg-purple-500 hover:bg-purple-600 text-white';
    case 'Pendiente': return 'bg-yellow-400 hover:bg-yellow-500 text-black';
    case 'Procesando': return 'bg-orange-400 hover:bg-orange-500 text-black';
    case 'Programada': return 'bg-sky-500 hover:bg-sky-600 text-white';
    case 'Cancelado':
    case 'Fallido': return 'bg-red-500 hover:bg-red-600 text-white';
    case 'Seguimiento': return 'bg-yellow-400 hover:bg-yellow-500 text-black';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
};

const getAccountBadgeColorClass = (status: AccountStatus | string): string => {
  switch (status) {
    // New statuses from spec
    case 'Primer Pedido': return 'bg-green-500 hover:bg-green-600 text-white';
    case 'Repetición': return 'bg-teal-500 hover:bg-teal-600 text-white';
    case 'Programado': return 'bg-sky-500 hover:bg-sky-600 text-white';
    case 'Seguimiento': return 'bg-yellow-400 hover:bg-yellow-500 text-black';
    case 'Inactivo': return 'bg-gray-400 hover:bg-gray-500 text-white';

    // Legacy statuses for compatibility
    case 'Activo': return 'bg-green-500 hover:bg-green-600 text-white';
    case 'Potencial': return 'bg-yellow-400 hover:bg-yellow-500 text-black';
    case 'Bloqueado': return 'bg-red-500 hover:bg-red-600 text-white';
    default: return 'bg-gray-400 hover:bg-gray-500';
  }
};

const getEventBadgeColorClass = (status: CrmEventStatus): string => {
  switch (status) {
    case 'Completado': return 'bg-green-500 hover:bg-green-600 text-white';
    case 'Confirmado': return 'bg-blue-500 hover:bg-blue-600 text-white';
    case 'En Curso': return 'bg-purple-500 hover:bg-purple-600 text-white';
    case 'Planificado': return 'bg-yellow-400 hover:bg-yellow-500 text-black';
    case 'Pospuesto': return 'bg-orange-400 hover:bg-orange-500 text-black';
    case 'Cancelado': return 'bg-red-500 hover:bg-red-600 text-white';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
};

const getPurchaseBadgeColorClass = (status: PurchaseStatus): string => {
  switch (status) {
    case 'Completado':
    case 'Factura Recibida':
    case 'Pagado':
      return 'bg-green-500 hover:bg-green-600 text-white';
    case 'Pago a 30 días':
      return 'bg-blue-500 hover:bg-blue-600 text-white';
    case 'Proforma Recibida':
      return 'bg-yellow-400 hover:bg-yellow-500 text-black';
    case 'Borrador':
      return 'bg-gray-400 hover:bg-gray-500 text-white';
    case 'Cancelado':
      return 'bg-red-500 hover:bg-red-600 text-white';
    default:
      return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
};

const getSampleRequestBadgeColorClass = (status: SampleRequestStatus): string => {
  switch (status) {
    case 'Aprobada': return 'bg-sky-500 hover:bg-sky-600 text-white';
    case 'Enviada': return 'bg-green-500 hover:bg-green-600 text-white';
    case 'Pendiente': return 'bg-yellow-400 hover:bg-yellow-500 text-black';
    case 'Rechazada': return 'bg-red-500 hover:bg-red-600 text-white';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
};

const getDirectSaleBadgeColorClass = (status: DirectSaleStatus): string => {
  switch (status) {
    case 'Pagada': return 'bg-green-500 hover:bg-green-600 text-white';
    case 'Facturada': return 'bg-teal-500 hover:bg-teal-600 text-white';
    case 'Confirmada': return 'bg-blue-500 hover:bg-blue-600 text-white';
    case 'Borrador': return 'bg-gray-400 hover:bg-gray-500 text-white';
    case 'Cancelada': return 'bg-red-500 hover:bg-red-600 text-white';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
};

export default function StatusBadge(props: StatusBadgeProps) {
  let badgeColorClass = "";
  let statusText: string = "";

  if (props.type === 'order') {
    badgeColorClass = getOrderBadgeColorClass(props.status);
    statusText = props.status;
  } else if (props.type === 'account') {
    badgeColorClass = getAccountBadgeColorClass(props.status);
    statusText = props.status;
  } else if (props.type === 'event') {
    badgeColorClass = getEventBadgeColorClass(props.status);
    statusText = props.status;
  } else if (props.type === 'purchase') {
    badgeColorClass = getPurchaseBadgeColorClass(props.status);
    statusText = props.status;
  } else if (props.type === 'sampleRequest') {
    badgeColorClass = getSampleRequestBadgeColorClass(props.status);
    statusText = props.status;
  } else if (props.type === 'directSale') {
    badgeColorClass = getDirectSaleBadgeColorClass(props.status);
    statusText = props.status;
  }


  return (
    <Badge className={cn(badgeColorClass, "text-xs", props.className)}>
      {statusText}
    </Badge>
  );
}
