

'use server';

import type { Account, Order, TeamMember, EnrichedAccount } from '@/types';
import { parseISO, isValid, isAfter, subDays } from 'date-fns';
import { calculateAccountStatus, calculateLeadScore } from '@/lib/account-logic';
import { VALID_SALE_STATUSES } from '@/lib/constants';

/**
 * Processes raw accounts and interactions data to return enriched account objects for the Cartera view.
 * This version assumes all accounts are "formal" and exist in the accounts collection.
 */
export async function processCarteraData(
    accounts: Account[],
    orders: Order[],
    teamMembers: TeamMember[]
): Promise<EnrichedAccount[]> {
    const teamMembersMap = new Map(teamMembers.map(tm => [tm.id, tm]));
    const ordersByAccountId = new Map<string, Order[]>();

    // Group all orders by their accountId.
    for (const order of orders) {
        if (order.accountId) {
            if (!ordersByAccountId.has(order.accountId)) {
                ordersByAccountId.set(order.accountId, []);
            }
            ordersByAccountId.get(order.accountId)!.push(order);
        }
    }
    
    // Process each account from the formal accounts list.
    const enrichedAccountsPromises = accounts.map(async (account): Promise<EnrichedAccount> => {
        const accountOrders = ordersByAccountId.get(account.id) || [];
        
        // Sort interactions for this account by date, descending.
        accountOrders.sort((a, b) => {
            const dateA = parseISO(a.visitDate || a.createdAt || new Date(0).toISOString());
            const dateB = parseISO(b.visitDate || b.createdAt || new Date(0).toISOString());
            if (!isValid(dateA)) return 1;
            if (!isValid(dateB)) return -1;
            return dateB.getTime() - dateA.getTime();
        });

        // Find the highest-priority open task for this account
        const openTasks = accountOrders.filter(o => o.status === 'Programada' || o.status === 'Seguimiento');
        openTasks.sort((a, b) => {
            const dateAString = (a.status === 'Programada' ? a.visitDate : a.nextActionDate);
            const dateBString = (b.status === 'Programada' ? b.visitDate : b.nextActionDate);
            if(!dateAString) return 1; if(!dateBString) return -1;
            const dateA = parseISO(dateAString);
            const dateB = parseISO(dateBString);
            if (!isValid(dateA)) return 1; if (!isValid(dateB)) return -1;
            if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
            if (a.status === 'Programada' && b.status !== 'Programada') return -1;
            if (b.status === 'Programada' && a.status !== 'Programada') return 1;
            return 0;
        });
        const nextInteraction = openTasks[0] || undefined;
        
        const lastInteractionOrder = accountOrders[0];
        const lastInteractionDate = lastInteractionOrder ? parseISO(lastInteractionOrder.visitDate || lastInteractionOrder.createdAt || new Date(0).toISOString()) : undefined;
        
        // Calculate final status and lead score based on all its interactions
        const status = await calculateAccountStatus(accountOrders, account);
        const recentOrderValue = accountOrders
            .filter(o => VALID_SALE_STATUSES.includes(o.status) && o.createdAt && isValid(parseISO(o.createdAt)) && isAfter(parseISO(o.createdAt), subDays(new Date(), 30)))
            .reduce((sum, o) => sum + (o.value || 0), 0);
        const leadScore = calculateLeadScore(status, account.potencial, lastInteractionDate, recentOrderValue);

        const successfulOrders = accountOrders.filter(o => VALID_SALE_STATUSES.includes(o.status));
        const totalSuccessfulOrders = successfulOrders.length;
        const totalValue = successfulOrders.reduce((sum, o) => sum + (o.value || 0), 0);
        
        const responsableId = account.salesRepId || account.responsableId;
        const responsable = responsableId ? teamMembersMap.get(responsableId) : undefined;
        
        return {
            ...account,
            status,
            leadScore,
            nextInteraction,
            totalSuccessfulOrders,
            totalValue,
            lastInteractionDate,
            interactions: accountOrders,
            responsableId: responsable?.id || '',
            responsableName: responsable?.name,
            responsableAvatar: responsable?.avatarUrl,
        };
    });

    const enrichedAccounts = await Promise.all(enrichedAccountsPromises);
    
    // Final sort based on the calculated lead score
    return enrichedAccounts.sort((a, b) => b.leadScore - a.leadScore);
}
