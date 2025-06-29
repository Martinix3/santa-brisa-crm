
'use server';

import type { Account, Order, TeamMember, AccountStatus, EnrichedAccount, PotencialType } from '@/types';
import { parseISO, differenceInDays, isValid, startOfDay } from 'date-fns';

/**
 * Calculates the current status of an account based on its interactions.
 * The rules are applied in a specific priority order.
 */
function calculateAccountStatus(
    ordersForAccount: Order[],
    lastInteractionDate?: Date
): AccountStatus {
    const now = new Date();

    // Priority 1: Check for future tasks.
    const futureTasks = ordersForAccount.filter(o =>
        (o.status === 'Programada' || o.status === 'Seguimiento') &&
        (o.status === 'Programada' ? o.visitDate : o.nextActionDate) &&
        isValid(parseISO(o.status === 'Programada' ? o.visitDate! : o.nextActionDate!)) &&
        parseISO(o.status === 'Programada' ? o.visitDate! : o.nextActionDate!) >= startOfDay(now)
    );
    
    if (futureTasks.length > 0) {
        // A scheduled visit takes precedence over a follow-up task.
        const hasProgramadaVisit = futureTasks.some(o => o.status === 'Programada');
        if (hasProgramadaVisit) {
            return 'Programado';
        }

        const hasSeguimiento = futureTasks.some(o => o.status === 'Seguimiento');
        if (hasSeguimiento) {
            return 'Seguimiento';
        }
    }

    // If no future tasks, continue with existing logic.
    // Priority 2: Has a sales history.
    const successfulOrders = ordersForAccount.filter(o => ['Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Facturado', 'Completado'].includes(o.status));
    if (successfulOrders.length >= 2) {
        return 'Repetición';
    }
    if (successfulOrders.length === 1) {
        return 'Primer Pedido';
    }

    // Priority 3: Has gone cold.
    if (lastInteractionDate && differenceInDays(now, lastInteractionDate) > 90) {
        return 'Inactivo';
    }

    // Priority 4: Default for active accounts needing attention (e.g., has past-due tasks).
    return 'Seguimiento';
}


/**
 * Calculates the lead score for an account based on its calculated status and potential.
 */
function calculateLeadScore(accountStatus: AccountStatus, potencial: PotencialType, lastInteractionDate?: Date): number {
    let score = 0;
    const now = new Date();

    // Base score from status
    switch (accountStatus) {
        case 'Repetición':
            score = 80;
            break;
        case 'Primer Pedido':
            score = 70;
            break;
        case 'Programado':
            score = 50;
            break;
        case 'Seguimiento':
            score = 30;
            break;
        case 'Inactivo':
            score = 10;
            break;
        default:
            score = 0;
    }

    // Bonus from 'potencial'
    switch (potencial) {
        case 'alto':
            score += 15;
            break;
        case 'medio':
            score += 10;
            break;
        case 'bajo':
            score += 5;
            break;
    }
    
    // Bonus for recent activity
    if (lastInteractionDate && isValid(lastInteractionDate)) {
        const daysSinceLastInteraction = differenceInDays(now, lastInteractionDate);
        if (daysSinceLastInteraction <= 15) {
            score += 5;
        }
    }

    return Math.min(score, 100);
}

export type TaskBucket = 'vencida' | 'hoy' | 'pendiente';

/**
 * Processes raw accounts and interactions data to return enriched account objects for the Cartera view.
 */
export async function processCarteraData(
    accounts: Account[],
    orders: Order[],
    teamMembers: TeamMember[]
): Promise<EnrichedAccount[]> {
    const ordersByAccount = new Map<string, Order[]>();
    const accountNameMap = new Map<string, string>(); // Map lowercase name to accountId
    for (const acc of accounts) {
        if (acc.nombre) {
            accountNameMap.set(acc.nombre.toLowerCase().trim(), acc.id);
        }
    }

    for (const order of orders) {
        let accountIdToUse = order.accountId;
        if (!accountIdToUse && order.clientName) {
            accountIdToUse = accountNameMap.get(order.clientName.toLowerCase().trim());
        }
        
        if (!accountIdToUse) continue;

        if (!ordersByAccount.has(accountIdToUse)) {
            ordersByAccount.set(accountIdToUse, []);
        }
        ordersByAccount.get(accountIdToUse)!.push(order);
    }
    
    // Sort interactions for each account by their effective date.
    for (const accountOrders of ordersByAccount.values()) {
        accountOrders.sort((a, b) => {
            const dateA = a.visitDate ? parseISO(a.visitDate) : (a.createdAt ? parseISO(a.createdAt) : new Date(0));
            const dateB = b.visitDate ? parseISO(b.visitDate) : (b.createdAt ? parseISO(b.createdAt) : new Date(0));
            if (!isValid(dateA) || !isValid(dateB)) return 0;
            return dateB.getTime() - dateA.getTime();
        });
    }

    const teamMembersMap = new Map(teamMembers.map(tm => [tm.id, tm.name]));

    const enrichedAccounts: EnrichedAccount[] = accounts.map(account => {
        const accountOrders = ordersByAccount.get(account.id) || [];
        
        const openTasks = accountOrders.filter(o => 
            (o.status === 'Programada' || o.status === 'Seguimiento') &&
            (o.status === 'Programada' ? o.visitDate : o.nextActionDate) &&
            isValid(parseISO((o.status === 'Programada' ? o.visitDate : o.nextActionDate)!))
        ).sort((a,b) => parseISO((a.status === 'Programada' ? a.visitDate : a.nextActionDate)!).getTime() - parseISO((b.status === 'Programada' ? b.visitDate : b.nextActionDate)!).getTime());

        const nextInteraction = openTasks.find(o => parseISO((o.status === 'Programada' ? o.visitDate : o.nextActionDate)!) >= startOfDay(new Date())) || undefined;

        const lastInteractionOrder = accountOrders[0];
        const lastInteractionDate = lastInteractionOrder 
            ? (lastInteractionOrder.visitDate ? parseISO(lastInteractionOrder.visitDate) : (lastInteractionOrder.createdAt ? parseISO(lastInteractionOrder.createdAt) : undefined)) 
            : undefined;

        const status = calculateAccountStatus(accountOrders, lastInteractionDate);
        const leadScore = calculateLeadScore(status, account.potencial, lastInteractionDate);
        const totalSuccessfulOrders = accountOrders.filter(o => ['Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Facturado', 'Completado'].includes(o.status)).length;
        const responsableName = account.salesRepId ? teamMembersMap.get(account.salesRepId) : undefined;

        return {
            ...account,
            status,
            leadScore,
            nextInteraction,
            totalSuccessfulOrders,
            lastInteractionDate,
            interactions: accountOrders,
            responsableName: responsableName,
        };
    });

    return enrichedAccounts.sort((a, b) => b.leadScore - a.leadScore);
}
