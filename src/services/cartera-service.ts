

import type { Account, Order, TeamMember, EnrichedAccount, AccountStatus, DirectSale } from '@/types';
import { parseISO, isValid, isAfter, subDays, differenceInDays } from 'date-fns';
import { calculateCommercialStatus, calculateLeadScore } from '@/lib/account-logic';
import { VALID_SALE_STATUSES } from '@/lib/constants';
import { getDirectSalesFS } from './venta-directa-sb-service';

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
    
    // Fetch direct sales once
    const directSales = await getDirectSalesFS();

    // Unify all interactions into a single structure
    const allInteractions: (Order | DirectSale & { interactionType: 'directSale' })[] = [
        ...orders,
        ...directSales.map(ds => ({
            ...ds,
            interactionType: 'directSale' as const,
            createdAt: ds.issueDate, 
            clientName: ds.customerName,
            accountId: ds.customerId,
            value: ds.totalAmount
        }))
    ];

    const interactionsByAccountId = new Map<string, (Order | DirectSale)[]>();
    for (const interaction of allInteractions) {
        const interactionDate = interaction.createdAt ? parseISO(interaction.createdAt) : null;
        if (interaction.accountId && interactionDate && isValid(interactionDate)) {
            if (!interactionsByAccountId.has(interaction.accountId)) {
                interactionsByAccountId.set(interaction.accountId, []);
            }
            interactionsByAccountId.get(interaction.accountId)!.push(interaction as Order); // Cast as Order for simplicity in the array
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

        const openTasks = accountInteractions.filter(o => o.status === 'Programada' || o.status === 'Seguimiento');
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
        
        const historicalStatus = await calculateCommercialStatus(accountInteractions);
        const taskStatus = nextInteraction ? nextInteraction.status as 'Programada' | 'Seguimiento' : null;
        
        let status: AccountStatus;
        if (historicalStatus === 'Activo' || historicalStatus === 'Repetición' || historicalStatus === 'Inactivo') {
            status = historicalStatus;
        } else if (taskStatus) {
            status = taskStatus;
        } else {
            status = historicalStatus;
        }


        const lastInteractionOrder = accountInteractions[0];
        const lastInteractionDate = lastInteractionOrder?.createdAt ? parseISO(lastInteractionOrder.createdAt) : undefined;
        
        const recentOrderValue = accountInteractions
            .filter(o => VALID_SALE_STATUSES.includes(o.status as any) && o.createdAt && isValid(parseISO(o.createdAt)) && isAfter(parseISO(o.createdAt), subDays(new Date(), 30)))
            .reduce((sum, o) => sum + (o.value || 0), 0);
        const leadScore = await calculateLeadScore(status, account.potencial, lastInteractionDate, recentOrderValue);

        const successfulOrders = accountInteractions.filter(o => VALID_SALE_STATUSES.includes(o.status as any));
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
            interactions: accountInteractions,
            responsableId: responsable?.id || '',
            responsableName: responsable?.name,
            responsableAvatar: responsable?.avatarUrl,
        };
    });

    const enrichedAccounts = await Promise.all(enrichedAccountsPromises);
    
    return enrichedAccounts;
}
