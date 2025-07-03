

import type { Account, Order, AccountStatus, PotencialType } from '@/types';
import { parseISO, differenceInDays, isValid } from 'date-fns';
import { VALID_SALE_STATUSES } from '@/lib/constants';

/**
 * Calculates the current commercial status of an account based on its entire interaction history.
 * The rules are applied in a specific priority order.
 * @param ordersForAccount All interactions related to the account.
 * @param account The account document itself.
 * @returns The calculated commercial status of the account.
 */
export async function calculateAccountStatus(
    ordersForAccount: Order[],
    account: Pick<Account, 'createdAt'>
): Promise<AccountStatus> {
    
    // Rule 1 (Highest Priority): Check for successful sales.
    const successfulOrders = ordersForAccount.filter(o => VALID_SALE_STATUSES.includes(o.status));
    if (successfulOrders.length >= 2) {
        return 'Repetición';
    }
    if (successfulOrders.length === 1) {
        return 'Activo';
    }

    // Rule 2: If no sales, check for any open tasks ('Programada' or 'Seguimiento').
    const hasOpenTasks = ordersForAccount.some(o =>
        o.status === 'Programada' || o.status === 'Seguimiento'
    );
    if (hasOpenTasks) {
        return 'Potencial';
    }

    // Rule 3 (Default): If no sales and no open tasks, the account is considered inactive.
    return 'Inactivo';
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
        case 'Activo': score = 75; break;
        case 'Potencial': score = 50; break;
        case 'Inactivo': score = 10; break;
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
