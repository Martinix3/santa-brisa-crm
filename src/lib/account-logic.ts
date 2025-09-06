
'use server';

import type { Account, Order, AccountStatus, PotencialType } from '@/types';
import { parseISO, differenceInDays, isValid } from 'date-fns';
import { VALID_SALE_STATUSES } from '@/lib/constants';

/**
 * Calculates the commercial status of an account based on its sales history,
 * assuming there are NO open tasks. This is a fallback status.
 * @param ordersForAccount All interactions related to the account.
 * @param account The account document itself.
 * @returns The calculated commercial status of the account.
 */
export async function calculateCommercialStatus(
    ordersForAccount: Order[]
): Promise<Exclude<AccountStatus, 'Programada' | 'Seguimiento'>> {
    
    // Check for successful sales.
    const successfulOrders = ordersForAccount
        .filter(o => VALID_SALE_STATUSES.includes(o.status) && o.createdAt && isValid(parseISO(o.createdAt)))
        .sort((a,b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
    
    const count = successfulOrders.length;

    if (count === 0) {
        // If there are no successful orders, check for failed attempts.
        const hasInteractions = ordersForAccount.some(o => o.status === 'Fallido' || o.status === 'Cancelado');
        return hasInteractions ? 'Fallido' : 'Pendiente';
    }

    const lastOrderDate = parseISO(successfulOrders[0].createdAt);
    const daysSinceLastOrder = differenceInDays(new Date(), lastOrderDate);

    if (daysSinceLastOrder > 90) {
        return 'Inactivo';
    }
    
    if (count >= 2) {
        return 'Repetición';
    }
    
    // If there's at least one successful order and it's recent, it's active.
    return 'Activo';
}


/**
 * Calculates the lead score for an account based on its calculated status and potential.
 */
export async function calculateLeadScore(
    accountStatus: AccountStatus, 
    potencial: PotencialType, 
    lastInteractionDate?: Date,
    recentOrderValue: number = 0
): Promise<number> {
    let score = 0;
    const now = new Date();

    // Base score from status
    switch (accountStatus) {
        case 'Repetición': score = 90; break;
        case 'Activo': score = 75; break;
        case 'Seguimiento': score = 60; break;
        case 'Programada': score = 50; break;
        case 'Inactivo': score = 40; break; 
        case 'Fallido': score = 10; break;
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
