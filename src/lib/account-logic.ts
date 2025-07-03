
import type { Account, Order, AccountStatus, PotencialType } from '@/types';
import { parseISO, differenceInDays, isValid, startOfDay, isBefore, isAfter, subDays } from 'date-fns';
import { VALID_SALE_STATUSES } from '@/lib/constants';

/**
 * Determines the most relevant open task from a list of interactions.
 * 'Programada' has priority over 'Seguimiento'.
 * The oldest open task is considered the most urgent.
 */
function getPriorityOpenTask(ordersForAccount: Order[]): Order | undefined {
    const openTasks = ordersForAccount.filter(o =>
        o.status === 'Programada' || o.status === 'Seguimiento'
    );

    if (openTasks.length === 0) return undefined;

    openTasks.sort((a, b) => {
        const dateA = parseISO((a.status === 'Programada' ? a.visitDate : a.nextActionDate)!);
        const dateB = parseISO((b.status === 'Programada' ? b.visitDate : b.nextActionDate)!);
        
        if (!isValid(dateA)) return 1;
        if (!isValid(dateB)) return -1;
        
        // If dates are different, oldest comes first
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
        }
        
        // If dates are the same, 'Programada' has priority over 'Seguimiento'
        if (a.status === 'Programada' && b.status !== 'Programada') return -1;
        if (b.status === 'Programada' && a.status !== 'Programada') return 1;
        
        return 0;
    });

    return openTasks[0];
}


/**
 * Calculates the current status of an account based on its interactions.
 * The rules are applied in a specific priority order.
 */
export async function calculateAccountStatus(
    ordersForAccount: Order[],
    account: Pick<Account, 'createdAt'>
): Promise<AccountStatus> {
    
    // Rule 1: Check for successful sales. This has the highest priority.
    const successfulOrders = ordersForAccount.filter(o => VALID_SALE_STATUSES.includes(o.status));
    if (successfulOrders.length >= 2) {
        return 'Repetición';
    }
    if (successfulOrders.length === 1) {
        return 'Pedido';
    }

    // Rule 2: If no sales, check for open tasks ('Programada' or 'Seguimiento').
    const priorityOpenTask = getPriorityOpenTask(ordersForAccount);
    if (priorityOpenTask) {
        // The status of the highest-priority open task determines the account status.
        return priorityOpenTask.status as AccountStatus; // Will be 'Programada' or 'Seguimiento'
    }

    // Rule 3: If no sales and no open tasks, analyze the most recent closed interaction.
    const closedInteractions = ordersForAccount
        .filter(o => o.status !== 'Programada' && o.status !== 'Seguimiento')
        .sort((a, b) => {
            const dateA = a.visitDate ? parseISO(a.visitDate) : (a.createdAt ? parseISO(a.createdAt) : new Date(0));
            const dateB = b.visitDate ? parseISO(b.visitDate) : (b.createdAt ? parseISO(b.createdAt) : new Date(0));
            if (!isValid(dateA)) return 1;
            if (!isValid(dateB)) return -1;
            return dateB.getTime() - dateA.getTime();
        });

    const lastClosedInteraction = closedInteractions[0];
    if (lastClosedInteraction && lastClosedInteraction.status === 'Fallido') {
        return 'Fallido';
    }
    
    // Rule 4 (Default): New accounts, or those with only 'Completado' tasks that didn't lead to a sale.
    // These should be prompted for action.
    return 'Seguimiento';
}


/**
 * Calculates the lead score for an account based on its calculated status and potential.
 */
export function calculateLeadScore(
    accountStatus: AccountStatus, 
    potencial: PotencialType, 
    lastInteractionDate?: Date,
    recentOrderValue: number = 0
): number {
    let score = 0;
    const now = new Date();

    // Base score from status
    switch (accountStatus) {
        case 'Repetición': score = 90; break;
        case 'Pedido': score = 80; break;
        case 'Programada': score = 70; break;
        case 'Seguimiento': score = 50; break;
        case 'Fallido': score = 20; break;
        default: score = 0;
    }

    // Bonus from 'potencial'
    switch (potencial) {
        case 'alto': score += 15; break;
        case 'medio': score += 10; break;
        case 'bajo': score += 5; break;
    }
    
    // Penalty/Bonus for recency
    if (lastInteractionDate && isValid(lastInteractionDate)) {
        const daysSinceLastInteraction = differenceInDays(now, lastInteractionDate);
        if (daysSinceLastInteraction <= 7) score += 5;
        else if (daysSinceLastInteraction > 60) score -= 10;
    } else {
        score -= 5; // Penalty if no interactions
    }

    // Bonus for recent sales value (1 point per 100€, capped at 10 points)
    score += Math.min(Math.round(recentOrderValue / 100), 10);

    return Math.max(0, Math.min(score, 100)); // Clamp score between 0 and 100
}
