
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
    // 1. Create maps for efficient lookup
    const accountsMap = new Map(accounts.map(acc => [acc.id, acc]));
    const teamMembersMap = new Map(teamMembers.map(tm => [tm.id, tm]));
    const ordersByAccount = new Map<string, Order[]>();

    // 2. Group all orders by their accountId
    for (const order of orders) {
        const accountId = order.accountId;
        if (!accountId) continue;

        if (!ordersByAccount.has(accountId)) {
            ordersByAccount.set(accountId, []);
        }
        // Add a temporary sort date to handle invalid or missing dates gracefully
        (order as any).tempSortDate = parseISO(order.visitDate || order.createdAt || new Date().toISOString());
        ordersByAccount.get(accountId)!.push(order);
    }

    // Sort interactions for each account
    for (const accountOrders of ordersByAccount.values()) {
        accountOrders.sort((a, b) => {
            const dateA = (a as any).tempSortDate;
            const dateB = (b as any).tempSortDate;
            if (!isValid(dateA)) return 1;
            if (!isValid(dateB)) return -1;
            return dateB.getTime() - dateA.getTime();
        });
    }

    // 3. Create a set of all account IDs that have data (from accounts OR orders)
    const allAccountIdsWithData = new Set([...accountsMap.keys(), ...ordersByAccount.keys()]);

    // 4. Create enriched account promises for ALL accounts with data
    const enrichedAccountsPromises = Array.from(allAccountIdsWithData).map(async (accountId) => {
        const account = accountsMap.get(accountId);
        const accountOrders = ordersByAccount.get(accountId) || [];

        // If account doesn't exist in DB but has orders, create a placeholder in-memory
        if (!account && accountOrders.length > 0) {
            const firstOrder = accountOrders[0];
            const placeholderAccount: Account = {
                id: accountId,
                nombre: firstOrder.clientName,
                ciudad: undefined,
                potencial: 'medio',
                responsableId: teamMembers.find(tm => tm.name === firstOrder.salesRep)?.id || '',
                status: 'Seguimiento', // Placeholder status
                leadScore: 0, // Placeholder score
                cif: '',
                type: 'Otro',
                createdAt: firstOrder.createdAt,
                updatedAt: firstOrder.createdAt,
            };
            // Add to map for processing
            accountsMap.set(accountId, placeholderAccount);
        }

        const finalAccount = accountsMap.get(accountId)!;
        if (!finalAccount) return null; // Should not happen with the logic above

        // Get priority task
        const openTasks = accountOrders.filter(o => o.status === 'Programada' || o.status === 'Seguimiento');
        openTasks.sort((a, b) => {
            const dateA = parseISO((a.status === 'Programada' ? a.visitDate : a.nextActionDate)!);
            const dateB = parseISO((b.status === 'Programada' ? b.visitDate : b.nextActionDate)!);
            if (!isValid(dateA)) return 1; if (!isValid(dateB)) return -1;
            if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
            if (a.status === 'Programada' && b.status !== 'Programada') return -1;
            if (b.status === 'Programada' && a.status !== 'Programada') return 1;
            return 0;
        });
        const nextInteraction = openTasks[0] || undefined;
        
        // Get last interaction date
        const lastInteractionOrder = accountOrders[0];
        const lastInteractionDate = lastInteractionOrder ? ((lastInteractionOrder as any).tempSortDate) : undefined;
        
        // Calculate status and score
        const status = await calculateAccountStatus(accountOrders, finalAccount);
        const recentOrderValue = accountOrders.filter(o => VALID_SALE_STATUSES.includes(o.status) && o.createdAt && isValid(parseISO(o.createdAt)) && isAfter(parseISO(o.createdAt), subDays(new Date(), 30))).reduce((sum, o) => sum + (o.value || 0), 0);
        const leadScore = calculateLeadScore(status, finalAccount.potencial, lastInteractionDate, recentOrderValue);

        // Calculate totals
        const successfulOrders = accountOrders.filter(o => VALID_SALE_STATUSES.includes(o.status));
        const totalSuccessfulOrders = successfulOrders.length;
        const totalValue = successfulOrders.reduce((sum, o) => sum + (o.value || 0), 0);

        // Get responsable info
        const responsable = finalAccount.salesRepId ? teamMembersMap.get(finalAccount.salesRepId) : undefined;
        
        return {
            ...finalAccount,
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

    const enrichedAccounts = (await Promise.all(enrichedAccountsPromises)).filter(Boolean) as EnrichedAccount[];
    
    return enrichedAccounts.sort((a, b) => b.leadScore - a.leadScore);
}
