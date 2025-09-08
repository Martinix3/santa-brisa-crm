
'use server';

import type { Account, Order, TeamMember, EnrichedAccount, AccountStatus, DirectSale } from '@/types';
import { parseISO, isValid, isAfter, subDays, differenceInDays } from 'date-fns';
import { calculateCommercialStatus, calculateLeadScore } from '@/lib/account-logic';
import { VALID_SALE_STATUSES } from '@/lib/constants';

/**
 * Processes raw accounts and interactions data to return enriched account objects for the Cartera view.
 * This version assumes all accounts are formal and exist in the accounts collection.
 */
export async function processCarteraData(
    accounts: Account[],
    orders: Order[],
    teamMembers: TeamMember[]
): Promise<EnrichedAccount[]> {
    const teamMembersMap = new Map(teamMembers.map(tm => [tm.id, tm]));
    const accountsMap = new Map(accounts.map(acc => [acc.id, acc]));
    const accountNameMap = new Map(accounts.map(acc => [acc.nombre.toLowerCase().trim(), acc]));
    
    // NOTE: `directSales` are now excluded as they don't define the commercial status of HORECA/Retail accounts.
    // The `cartera` (portfolio) is specifically about end-customer accounts managed by the sales team.
    
    const interactionsByAccountId = new Map<string, Order[]>();

    for (const interaction of orders) { // Only process orders, not directSales
        let accountId = interaction.accountId;
        
        if (!accountId && interaction.clientName) {
            const matchedAccount = accountNameMap.get(interaction.clientName.toLowerCase().trim());
            if (matchedAccount) {
                accountId = matchedAccount.id;
            }
        }
        
        if (accountId) {
            if (!interactionsByAccountId.has(accountId)) {
                interactionsByAccountId.set(accountId, []);
            }
            interactionsByAccountId.get(accountId)!.push(interaction);
        }
    }
    
    const enrichedAccountsPromises = accounts.map(async (account): Promise<EnrichedAccount> => {
        const accountInteractions = interactionsByAccountId.get(account.id) || [];
        
        accountInteractions.sort((a, b) => {
            const dateA = a.createdAt ? parseISO(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? parseISO(b.createdAt) : new Date(0);
            if (!isValid(dateA)) return 1;
            if (!isValid(dateB)) return -1;
            return dateB.getTime() - dateA.getTime();
        });

        const openTasks = accountInteractions.filter(o => o.status === 'Programada' || o.status === 'Seguimiento') as Order[];
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
        
        let status: AccountStatus;
        if (nextInteraction) {
            status = nextInteraction.status as 'Programada' | 'Seguimiento';
        } else {
            status = await calculateCommercialStatus(accountInteractions as Order[]);
        }

        const lastInteractionOrder = accountInteractions[0];
        const lastInteractionDate = lastInteractionOrder?.createdAt ? parseISO(lastInteractionOrder.createdAt) : undefined;
        
        const successfulOrders = accountInteractions.filter(o => VALID_SALE_STATUSES.includes(o.status as any));
        const totalSuccessfulOrders = successfulOrders.length;
        
        const recentOrderValue = successfulOrders
            .filter(o => o.createdAt && isValid(parseISO(o.createdAt)) && isAfter(parseISO(o.createdAt), subDays(new Date(), 30)))
            .reduce((sum, o) => sum + (o.value || 0), 0);
            
        const leadScore = await calculateLeadScore(status, account.potencial, lastInteractionDate, recentOrderValue);

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
            interactions: accountInteractions as Order[],
            responsableId: responsable?.id || '',
            responsableName: responsable?.name,
            responsableAvatar: responsable?.avatarUrl,
            total_orders_count: totalSuccessfulOrders,
        };
    });

    const enrichedAccounts = await Promise.all(enrichedAccountsPromises);
    
    return enrichedAccounts;
}
