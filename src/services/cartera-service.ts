
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
    const teamMembersMap = new Map(teamMembers.map(tm => [tm.id, tm]));
    const accountsMap = new Map(accounts.map(acc => [acc.id, acc]));

    const ordersByAccountId = new Map<string, Order[]>();

    // 2. Associate all orders with accounts, using robust matching.
    for (const order of orders) {
        let associatedAccountId: string | undefined;

        // Priority 1: Direct ID link
        if (order.accountId && accountsMap.has(order.accountId)) {
            associatedAccountId = order.accountId;
        } 
        // Priority 2: Find account by name if no ID link
        else if (order.clientName) {
            const matchedAccount = accounts.find(acc => acc.nombre.trim().toLowerCase() === order.clientName.trim().toLowerCase());
            if (matchedAccount) {
                associatedAccountId = matchedAccount.id;
            }
        }
        
        if (associatedAccountId) {
            if (!ordersByAccountId.has(associatedAccountId)) {
                ordersByAccountId.set(associatedAccountId, []);
            }
            ordersByAccountId.get(associatedAccountId)!.push(order);
        }
    }

    // 3. Create enriched account promises for ALL accounts, ensuring each has its list of orders
    const enrichedAccountsPromises = accounts.map(async (account) => {
        const accountOrders = ordersByAccountId.get(account.id) || [];
        
        // Sort interactions for each account by date
        accountOrders.sort((a, b) => {
            const dateA = parseISO(a.visitDate || a.createdAt || new Date(0).toISOString());
            const dateB = parseISO(b.visitDate || b.createdAt || new Date(0).toISOString());
            if (!isValid(dateA)) return 1;
            if (!isValid(dateB)) return -1;
            return dateB.getTime() - a.getTime();
        });
        
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
        
        const lastInteractionOrder = accountOrders[0];
        const lastInteractionDate = lastInteractionOrder ? parseISO(lastInteractionOrder.visitDate || lastInteractionOrder.createdAt || new Date(0).toISOString()) : undefined;
        
        // Calculate status and score
        const status = await calculateAccountStatus(accountOrders, account);
        const recentOrderValue = accountOrders.filter(o => VALID_SALE_STATUSES.includes(o.status) && o.createdAt && isValid(parseISO(o.createdAt)) && isAfter(parseISO(o.createdAt), subDays(new Date(), 30))).reduce((sum, o) => sum + (o.value || 0), 0);
        const leadScore = calculateLeadScore(status, account.potencial, lastInteractionDate, recentOrderValue);

        // Calculate totals
        const successfulOrders = accountOrders.filter(o => VALID_SALE_STATUSES.includes(o.status));
        const totalSuccessfulOrders = successfulOrders.length;
        const totalValue = successfulOrders.reduce((sum, o) => sum + (o.value || 0), 0);

        // Get responsable info
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

    const enrichedAccounts = (await Promise.all(enrichedAccountsPromises)).filter(Boolean) as EnrichedAccount[];
    
    return enrichedAccounts.sort((a, b) => b.leadScore - a.leadScore);
}
