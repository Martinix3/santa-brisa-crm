
import type { Account, Order, AccountStatus, PotencialType } from '@/types';
import { parseISO, differenceInDays, isValid, startOfDay } from 'date-fns';
import { VALID_SALE_STATUSES } from '@/lib/constants';


/**
 * Calculates the current status of an account based on its interactions.
 * The rules are applied in a specific priority order.
 */
export function calculateAccountStatus(
    ordersForAccount: Order[],
    account: Pick<Account, 'createdAt'>
): AccountStatus {
    const now = startOfDay(new Date());

    // Priority 1: Check for a future SCHEDULED VISIT.
    const hasFutureVisit = ordersForAccount.some(o => {
        return o.status === 'Programada' && o.visitDate && isValid(parseISO(o.visitDate)) && parseISO(o.visitDate) >= now;
    });
    if (hasFutureVisit) {
        return 'Programada';
    }

    // Priority 2: If no future visit, check for a future FOLLOW-UP TASK.
    const hasFutureFollowUp = ordersForAccount.some(o => {
        return o.status === 'Seguimiento' && o.nextActionDate && isValid(parseISO(o.nextActionDate)) && parseISO(o.nextActionDate) >= now;
    });
    if (hasFutureFollowUp) {
        return 'Seguimiento';
    }
    
    // --- If no future tasks, analyze past interactions ---
    const allInteractionsSorted = [...ordersForAccount].sort((a, b) => {
        const dateA = a.visitDate ? parseISO(a.visitDate) : (a.createdAt ? parseISO(a.createdAt) : new Date(0));
        const dateB = b.visitDate ? parseISO(b.visitDate) : (b.createdAt ? parseISO(b.createdAt) : new Date(0));
        if (!isValid(dateA)) return 1;
        if (!isValid(dateB)) return -1;
        return dateB.getTime() - dateA.getTime();
    });

    const lastInteraction = allInteractionsSorted[0];
    const successfulOrders = ordersForAccount.filter(o => VALID_SALE_STATUSES.includes(o.status));

    // Priority 3: Last interaction was a failure.
    if (lastInteraction && lastInteraction.status === 'Fallido') {
        return 'Fallido';
    }

    // Priority 4: Has successful orders.
    if (successfulOrders.length >= 2) {
        return 'Repetición';
    }
    if (successfulOrders.length === 1) {
        return 'Primer Pedido';
    }

    // Priority 5: Default cases based on age and past activity.
    if (lastInteraction) { // Has past interactions but no sales or failures
        return 'Seguimiento';
    }

    // No interactions at all. Check age.
    if (account.createdAt && isValid(parseISO(account.createdAt)) && differenceInDays(now, parseISO(account.createdAt)) > 90) {
        return 'Inactivo';
    }

    // Default for new-ish accounts with no history
    return 'Seguimiento';
}


/**
 * Calculates the lead score for an account based on its calculated status and potential.
 */
export function calculateLeadScore(accountStatus: AccountStatus, potencial: PotencialType, lastInteractionDate?: Date): number {
    let score = 0;
    const now = new Date();

    // Base score from status
    switch (accountStatus) {
        case 'Repetición': score = 80; break;
        case 'Primer Pedido': score = 70; break;
        case 'Programada': score = 60; break;
        case 'Seguimiento': score = 40; break;
        case 'Fallido': score = 20; break;
        case 'Inactivo': score = 10; break;
        default: score = 0;
    }

    // Bonus from 'potencial'
    switch (potencial) {
        case 'alto': score += 15; break;
        case 'medio': score += 10; break;
        case 'bajo': score += 5; break;
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
