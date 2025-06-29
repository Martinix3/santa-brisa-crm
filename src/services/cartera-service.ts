
'use server';

import type { Account, Order, TeamMember, EnrichedAccount, AccountStatus } from '@/types';
import { parseISO, isValid, addDays, subDays, isAfter, isWithinInterval } from 'date-fns';
import { calculateAccountStatus, calculateLeadScore } from '@/lib/account-logic';
import { VALID_SALE_STATUSES } from '@/lib/constants';

// Set a default date for interactions without one, to ensure they can be created.
const defaultInteractionDate = () => addDays(new Date(), 7);

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
        
        // Ensure every order has a valid date for sorting
        if (!order.visitDate && !order.createdAt) {
            (order as any).tempSortDate = defaultInteractionDate();
        } else {
             (order as any).tempSortDate = parseISO(order.visitDate || order.createdAt!);
        }

        ordersByAccount.get(accountIdToUse)!.push(order);
    }
    
    // Sort interactions for each account by their effective date.
    for (const accountOrders of ordersByAccount.values()) {
        accountOrders.sort((a, b) => {
            const dateA = (a as any).tempSortDate;
            const dateB = (b as any).tempSortDate;
            if (!isValid(dateA)) return 1;
            if (!isValid(dateB)) return -1;
            return dateB.getTime() - a.getTime();
        });
    }

    const teamMembersMap = new Map(teamMembers.map(tm => [tm.id, tm]));

    const enrichedAccountsPromises = accounts.map(async (account) => {
        const accountOrders = ordersByAccount.get(account.id) || [];
        
        const openTasks = accountOrders.filter(o => o.status === 'Programada' || o.status === 'Seguimiento');

        openTasks.sort((a, b) => {
            const dateA = parseISO((a.status === 'Programada' ? a.visitDate : a.nextActionDate) || (a as any).tempSortDate);
            const dateB = parseISO((b.status === 'Programada' ? b.visitDate : b.nextActionDate) || (b as any).tempSortDate);
            if (!isValid(dateA)) return 1; if (!isValid(dateB)) return -1;
            if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
            if (a.status === 'Programada' && b.status !== 'Programada') return -1;
            if (b.status === 'Programada' && a.status !== 'Programada') return 1;
            return 0;
        });

        const nextInteraction = openTasks[0] || undefined;
        const lastInteractionOrder = accountOrders[0];
        const lastInteractionDate = lastInteractionOrder 
            ? ((lastInteractionOrder as any).tempSortDate) 
            : undefined;

        // --- New calculations for lead score ---
        const today = new Date();
        const thirtyDaysAgo = subDays(today, 30);
        const threeDaysFromNow = addDays(today, 3);
        
        const recentOrderValue = accountOrders
            .filter(o => VALID_SALE_STATUSES.includes(o.status) && o.createdAt && isValid(parseISO(o.createdAt)) && isAfter(parseISO(o.createdAt), thirtyDaysAgo))
            .reduce((sum, o) => sum + (o.value || 0), 0);
            
        const hasUpcomingVisit = accountOrders
            .some(o => o.status === 'Programada' && o.visitDate && isValid(parseISO(o.visitDate)) && isWithinInterval(parseISO(o.visitDate), { start: today, end: threeDaysFromNow }));
        // --- End of new calculations ---

        const status = await calculateAccountStatus(accountOrders, account);
        const leadScore = calculateLeadScore(status, account.potencial, lastInteractionDate, recentOrderValue, hasUpcomingVisit);
        
        const successfulOrders = accountOrders.filter(o => VALID_SALE_STATUSES.includes(o.status));
        const totalSuccessfulOrders = successfulOrders.length;
        const totalValue = successfulOrders.reduce((sum, o) => sum + (o.value || 0), 0);
        
        const responsable = account.salesRepId ? teamMembersMap.get(account.salesRepId) : undefined;

        return {
            ...account,
            status,
            leadScore,
            nextInteraction,
            totalSuccessfulOrders,
            totalValue,
            lastInteractionDate,
            interactions: accountOrders,
            responsableName: responsable?.name,
            responsableAvatar: responsable?.avatarUrl,
        };
    });

    const enrichedAccounts = await Promise.all(enrichedAccountsPromises);
    return enrichedAccounts.sort((a, b) => b.leadScore - a.leadScore);
}
