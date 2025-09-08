
import { EstadoPedido as OrderStatus } from "@ssot";

export const VALID_SALE_STATUSES: readonly OrderStatus[] = ['Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Facturado', 'Pagado'];
export const ALL_VISIT_STATUSES: readonly OrderStatus[] = ['Programada', 'Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Facturado', 'Fallido', 'Seguimiento', 'Cancelado', 'Completado'];
