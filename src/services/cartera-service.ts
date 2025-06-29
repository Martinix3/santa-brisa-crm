
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

    // Priority 1: Has a future task scheduled.
    const futureTasks = ordersForAccount.filter(o =>
        (o.status === 'Programada' || o.status === 'Seguimiento') &&
        (o.status === 'Programada' ? o.visitDate : o.nextActionDate) &&
        isValid(parseISO(o.status === 'Programada' ? o.visitDate! : o.nextActionDate!)) &&
        parseISO(o.status === 'Programada' ? o.visitDate! : o.nextActionDate!) >= startOfDay(now)
    );
    if (futureTasks.length > 0) {
        return 'Programado';
    }

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

    // Priority 4: Default for active accounts needing attention.
    return 'Seguimiento';
}

/**
 * Calculates the lead score for an account based on its interactions and potential.
 */
function calculateLeadScore(account: Account, ordersForAccount: Order[], nextInteraction?: Order): number {
    let score = 0;
    const now = new Date();

    const lastOrder = ordersForAccount[0]; // Assumes orders are sorted descending by date

    if (lastOrder && ['Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Facturado', 'Completado'].includes(lastOrder.status)) {
        score += 30;
    }

    switch (account.potencial) {
        case 'alto': score += 20; break;
        case 'medio': score += 10; break;
        case 'bajo': score += 5; break;
    }

    if (lastOrder && (lastOrder.visitDate || lastOrder.createdAt)) {
        const lastDate = parseISO(lastOrder.visitDate || lastOrder.createdAt);
        if (isValid(lastDate)) {
            const daysSinceLastInteraction = differenceInDays(now, lastDate);
            if (daysSinceLastInteraction < 7) score += 20;
            else if (daysSinceLastInteraction < 14) score += 10;
        }
    }

    if (nextInteraction) {
        const nextDate = parseISO((nextInteraction.status === 'Programada' ? nextInteraction.visitDate : nextInteraction.nextActionDate)!);
        if (isValid(nextDate)) {
            const daysToNextInteraction = differenceInDays(nextDate, now);
            if (daysToNextInteraction <= 3 && daysToNextInteraction >= 0) {
                score += 20;
            }
        }
    }

    if (account.brandAmbassadorId && lastOrder) {
        score += 10;
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
    for (const order of orders) {
        if (!order.accountId) continue;
        if (!ordersByAccount.has(order.accountId)) {
            ordersByAccount.set(order.accountId, []);
        }
        ordersByAccount.get(order.accountId)!.push(order);
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
        const leadScore = calculateLeadScore(account, accountOrders, nextInteraction);
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
