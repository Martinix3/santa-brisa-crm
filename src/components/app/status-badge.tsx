
"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus, AccountStatus, CrmEventStatus } from "@/types";

type StatusBadgeProps = 
  | { type: 'order'; status: OrderStatus; className?: string; }
  | { type: 'account'; status: AccountStatus; className?: string; }
  | { type: 'event'; status: CrmEventStatus; className?: string; };

const getOrderBadgeColorClass = (status: OrderStatus): string => {
  switch (status) {
    case 'Entregado': return 'bg-green-500 hover:bg-green-600 text-white';
    case 'Confirmado': return 'bg-[hsl(var(--brand-turquoise-hsl))] hover:brightness-90 text-white';
    case 'Enviado': return 'bg-purple-500 hover:bg-purple-600 text-white';
    case 'Pendiente': return 'bg-yellow-400 hover:bg-yellow-500 text-black';
    case 'Procesando': return 'bg-orange-400 hover:bg-orange-500 text-black';
    case 'Cancelado':
    case 'Fallido': return 'bg-red-500 hover:bg-red-600 text-white';
    case 'Seguimiento': return 'bg-blue-500 hover:bg-blue-600 text-white';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
};

const getAccountBadgeColorClass = (status: AccountStatus): string => {
  switch (status) {
    case 'Activo': return 'bg-green-500 hover:bg-green-600 text-white';
    case 'Potencial': return 'bg-yellow-400 hover:bg-yellow-500 text-black';
    case 'Inactivo': return 'bg-gray-400 hover:bg-gray-500 text-white';
    case 'Bloqueado': return 'bg-red-500 hover:bg-red-600 text-white';
    default: return 'bg-gray-400 hover:bg-gray-500';
  }
};

const getEventBadgeColorClass = (status: CrmEventStatus): string => {
  switch (status) {
    case 'Completado': return 'bg-green-500 hover:bg-green-600 text-white';
    case 'Confirmado': return 'bg-blue-500 hover:bg-blue-600 text-white'; // Note: Event 'Confirmado' is blue
    case 'En Curso': return 'bg-purple-500 hover:bg-purple-600 text-white';
    case 'Planificado': return 'bg-yellow-400 hover:bg-yellow-500 text-black';
    case 'Pospuesto': return 'bg-orange-400 hover:bg-orange-500 text-black';
    case 'Cancelado': return 'bg-red-500 hover:bg-red-600 text-white';
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
  }

  return (
    <Badge className={cn(badgeColorClass, "text-xs", props.className)}>
      {statusText}
    </Badge>
  );
}
