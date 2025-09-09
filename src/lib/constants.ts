
import { EstadoPedido } from "@ssot";

export const VALID_SALE_STATUSES: readonly EstadoPedido[] = ['Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Facturado', 'Pagado'];
export const ALL_VISIT_STATUSES: readonly EstadoPedido[] = ['Programada', 'Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Facturado', 'Fallido', 'Seguimiento', 'Cancelado', 'Completado'];
