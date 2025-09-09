

'use server';

import type { Account, Order, AccountStage } from '@/types';
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
): Promise<Exclude<AccountStage, 'Programada' | 'Seguimiento'>> {
    
    // If there are no interactions at all, it's a new potential client.
    if (!ordersForAccount || ordersForAccount.length === 0) {
        return 'POTENCIAL';
    }

    const successfulOrders = ordersForAccount
        .filter(o => VALID_SALE_STATUSES.includes(o.status) && o.createdAt && isValid(parseISO(o.createdAt)))
        .sort((a,b) => parseISO(b.createdAt!).getTime() - parseISO(a.createdAt!).getTime());
    
    const count = successfulOrders.length;

    if (count === 0) {
        // If there are no successful orders, check for failed attempts.
        const hasInteractions = ordersForAccount.some(o => o.status === 'Fallido');
        return hasInteractions ? 'FALLIDA' : 'POTENCIAL';
    }

    const lastOrderDate = parseISO(successfulOrders[0].createdAt!);
    const daysSinceLastOrder = differenceInDays(new Date(), lastOrderDate);

    if (daysSinceLastOrder > 90) {
        return 'INACTIVA';
    }
    
    if (count >= 2) {
        return 'ACTIVA'; // Could be 'Repetición', but ACTIVA is a safe bet
    }
    
    // If there's at least one successful order and it's recent, it's active.
    return 'ACTIVA';
}


/**
 * Calculates the lead score for an account based on its calculated status and potential.
 */
export async function calculateLeadScore(
    accountStage: AccountStage,
    recentOrderValue: number = 0
): Promise<number> {
    let score = 0;
    const now = new Date();

    // Base score from status
    switch (accountStage) {
        case 'ACTIVA': score = 90; break;
        case 'SEGUIMIENTO': score = 60; break;
        case 'POTENCIAL': score = 50; break;
        case 'INACTIVA': score = 30; break; 
        case 'FALLIDA': score = 10; break;
        default: score = 20;
    }

    // Bonus for recent sales value (1 point per 100€, capped at 10 points)
    score += Math.min(Math.round(recentOrderValue / 100), 10);

    return Math.max(0, Math.min(score, 100)); // Clamp score between 0 and 100
}
