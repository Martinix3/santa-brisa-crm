
'use server';

import type { Account, Order, TeamMember, EnrichedAccount } from '@/types';
import { parseISO, isValid, startOfDay } from 'date-fns';
import { calculateAccountStatus, calculateLeadScore } from '@/lib/account-logic';
import { VALID_SALE_STATUSES } from '@/lib/constants';

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
        ordersByAccount.get(accountIdToUse)!.push(order);
    }
    
    // Sort interactions for each account by their effective date.
    for (const accountOrders of ordersByAccount.values()) {
        accountOrders.sort((a, b) => {
            const dateA = a.visitDate ? parseISO(a.visitDate) : (a.createdAt ? parseISO(a.createdAt) : new Date(0));
            const dateB = b.visitDate ? parseISO(b.visitDate) : (b.createdAt ? parseISO(b.createdAt) : new Date(0));
            if (!isValid(dateA) || !isValid(dateB)) return 0;
            return dateB.getTime() - dateA.getTime();
        });
    }

    const teamMembersMap = new Map(teamMembers.map(tm => [tm.id, tm.name]));

    const enrichedAccountsPromises = accounts.map(async (account) => {
        const accountOrders = ordersByAccount.get(account.id) || [];
        
        const openTasks = accountOrders.filter(o => 
            (o.status === 'Programada' || o.status === 'Seguimiento') &&
            (o.status === 'Programada' ? o.visitDate : o.nextActionDate) &&
            isValid(parseISO((o.status === 'Programada' ? o.visitDate : o.nextActionDate)!))
        ).sort((a,b) => parseISO((a.status === 'Programada' ? a.visitDate : a.nextActionDate)!).getTime() - parseISO((b.status === 'Programada' ? b.visitDate : b.nextActionDate)!).getTime());

        const nextInteraction = openTasks.find(o => parseISO((o.status === 'Programada' ? o.visitDate : o.nextActionDate)!) >= startOfDay(new Date())) || undefined;

        const lastInteractionOrder = accountOrders[0];
        const lastInteractionDate = lastInteractionOrder 
            ? (lastInteractionOrder.visitDate ? parseISO(lastInteractionOrder.visitDate) : (lastInteractionOrder.createdAt ? parseISO(lastInteractionOrder.createdAt) : undefined)) 
            : undefined;

        const status = calculateAccountStatus(accountOrders, account);
        const leadScore = calculateLeadScore(status, account.potencial, lastInteractionDate);
        const totalSuccessfulOrders = accountOrders.filter(o => VALID_SALE_STATUSES.includes(o.status)).length;
        const responsableName = account.salesRepId ? teamMembersMap.get(account.salesRepId) : undefined;

        return {
            ...account,
            status,
            leadScore,
            nextInteraction,
            totalSuccessfulOrders,
            lastInteractionDate,
            interactions: accountOrders,
            responsableName: responsableName,
        };
    });

    const enrichedAccounts = await Promise.all(enrichedAccountsPromises);

    return enrichedAccounts.sort((a, b) => b.leadScore - a.leadScore);
}
