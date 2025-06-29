
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

    // Priority 1: Check for open tasks ('Programada' or 'Seguimiento').
    const openTasks = ordersForAccount.filter(o =>
        o.status === 'Programada' || o.status === 'Seguimiento'
    );

    if (openTasks.length > 0) {
        // Sort open tasks to find the most relevant one (oldest date first, with 'Programada' having priority).
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
        
        const priorityTask = openTasks[0];
        // The account status directly reflects the status of the highest priority open task.
        return priorityTask.status as AccountStatus; // We know it's either 'Programada' or 'Seguimiento'
    }

    // --- If no open tasks, analyze the most recent closed interaction ---
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

    // Priority 2: Last closed interaction was a failure.
    if (lastClosedInteraction && lastClosedInteraction.status === 'Fallido') {
        return 'Fallido';
    }

    // Priority 3: Has successful orders.
    const successfulOrders = ordersForAccount.filter(o => VALID_SALE_STATUSES.includes(o.status));
    if (successfulOrders.length >= 2) {
        return 'Repetición';
    }
    if (successfulOrders.length === 1) {
        return 'Primer Pedido';
    }

    // Priority 4: Default cases. If there are any past interactions, it needs follow up.
    if (ordersForAccount.length > 0) {
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
