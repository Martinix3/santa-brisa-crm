
import type { Order } from "@/types";

export const getInteractionType = (interaction: Order): string => {
    const { status, nextActionType, failureReasonType } = interaction;
    if (status === 'Programada' && interaction.taskCategory === 'Commercial') return "Visita Programada";
    if (status === 'Programada' && interaction.taskCategory === 'General') return "Tarea Administrativa";
    if (status === 'Seguimiento') return `Seguimiento (${nextActionType || 'N/D'})`;
    if (status === 'Fallido') return `Visita Fallida (${failureReasonType || 'N/D'})`;
    
    if (status === 'Completado') {
        if (nextActionType || failureReasonType) {
            return `Tarea Completada`;
        }
        return `Interacción Completada`;
    }
    
    if (status === 'Confirmado' || status === 'Entregado' || status === 'Facturado') {
        return 'Pedido';
    }
    
    return `Pedido (${status})`;
}
