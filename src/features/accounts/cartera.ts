
// Lógica pura (sin I/O) para enriquecer datos de la cartera

import type { Account, Order, TeamMember, EnrichedAccount, AccountStatus } from '@/types';
import { parseISO, isValid, isAfter, subDays, differenceInDays } from 'date-fns';
import { calculateCommercialStatus, calculateLeadScore } from '@/lib/account-logic';
import { VALID_SALE_STATUSES } from '@/lib/constants';


/**
 * Processes raw accounts and interactions data to return enriched account objects for the Cartera view.
 * This is a pure function that takes data and returns enriched data, without performing I/O.
 */
export function enrichCartera(
    accounts: Account[],
    orders: Order[],
    teamMembers: TeamMember[]
): EnrichedAccount[] {
    const teamMembersMap = new Map(teamMembers.map(tm => [tm.id, tm]));
    const accountNameMap = new Map<string, Account>();
    accounts.forEach(acc => {
        if (acc.name && typeof acc.name === 'string') {
            accountNameMap.set(acc.name.toLowerCase().trim(), acc);
        }
    });

    const interactionsByAccountId = new Map<string, Order[]>();
    for (const interaction of orders) {
        let accountId = interaction.accountId;
        if (!accountId && interaction.clientName && typeof interaction.clientName === 'string') {
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

    const enrichedAccounts = accounts.map((account): EnrichedAccount => {
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
            return dateA.getTime() - dateB.getTime();
        });
        const nextInteraction = openTasks[0] || undefined;
        
        const successfulOrders = accountInteractions.filter(o => VALID_SALE_STATUSES.includes(o.status as any));
        let status: AccountStatus;
        if (nextInteraction) {
            status = nextInteraction.status as 'Programada' | 'Seguimiento';
        } else {
            if (successfulOrders.length === 0) {
                 status = accountInteractions.length > 0 ? 'Fallido' : 'Pendiente';
            } else {
                 const lastOrderDate = parseISO(successfulOrders[0].createdAt!);
                 const daysSinceLastOrder = differenceInDays(new Date(), lastOrderDate);
                 if (daysSinceLastOrder > 90) status = 'Inactivo';
                 else if (successfulOrders.length >= 2) status = 'Repetición';
                 else status = 'Activo';
            }
        }

        const lastInteractionOrder = accountInteractions[0];
        const lastInteractionDate = lastInteractionOrder?.createdAt ? parseISO(lastInteractionOrder.createdAt) : undefined;
        
        const totalSuccessfulOrders = successfulOrders.length;
        
        const recentOrderValue = successfulOrders
            .filter(o => o.createdAt && isValid(parseISO(o.createdAt)) && isAfter(parseISO(o.createdAt), subDays(new Date(), 30)))
            .reduce((sum, o) => sum + (o.value || 0), 0);
            
        const leadScore = 50; 
        
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
            lastInteractionDate: lastInteractionDate?.toISOString(),
            interactions: accountInteractions as Order[],
            responsableId: responsable?.id || '',
            responsableName: responsable?.name,
            responsableAvatar: responsable?.avatarUrl,
            total_orders_count: totalSuccessfulOrders,
        };
    });

    return enrichedAccounts;
}
