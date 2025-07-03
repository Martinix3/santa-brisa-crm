
'use server';

import type { Account, Order, TeamMember, EnrichedAccount, AccountStatus } from '@/types';
import { parseISO, isValid, addDays, subDays, isAfter, isWithinInterval } from 'date-fns';
import { calculateAccountStatus, calculateLeadScore } from '@/lib/account-logic';
import { VALID_SALE_STATUSES } from '@/lib/constants';

/**
 * Processes raw accounts and interactions data to return enriched account objects for the Cartera view.
 * This version ensures that clients existing only through interactions are also included.
 */
export async function processCarteraData(
    accounts: Account[],
    orders: Order[],
    teamMembers: TeamMember[]
): Promise<EnrichedAccount[]> {
    const teamMembersMap = new Map(teamMembers.map(tm => [tm.id, tm]));
    
    // Step 1: Group all interactions by a consistent client key and gather all client data.
    const interactionsByClientKey = new Map<string, Order[]>();
    const clientDataMap = new Map<string, { account?: Account; name: string }>();

    // First pass: Populate with existing accounts from the database.
    for (const account of accounts) {
        const clientKey = account.id;
        clientDataMap.set(clientKey, { account, name: account.nombre });
        if (!interactionsByClientKey.has(clientKey)) {
            interactionsByClientKey.set(clientKey, []);
        }
    }

    // Second pass: Group orders and discover clients that exist only via interactions.
    for (const order of orders) {
        let clientKey: string | undefined;
        let clientName = order.clientName;

        // Try to link order to an existing account.
        const matchedAccount = order.accountId 
            ? accounts.find(a => a.id === order.accountId)
            : accounts.find(a => a.nombre.trim().toLowerCase() === clientName.trim().toLowerCase());

        if (matchedAccount) {
            clientKey = matchedAccount.id;
        } else {
            // This interaction is for a client NOT formally in the accounts collection.
            // We use its normalized name as a temporary key.
            clientKey = clientName.trim().toLowerCase(); 
            if (!clientDataMap.has(clientKey)) {
                // If we haven't seen this client name before, add it to our list of clients to process.
                clientDataMap.set(clientKey, { name: clientName });
            }
        }
        
        if (!interactionsByClientKey.has(clientKey)) {
            interactionsByClientKey.set(clientKey, []);
        }
        interactionsByClientKey.get(clientKey)!.push(order);
    }
    
    // Step 2: Process each unique client (both formal and virtual).
    const enrichedAccountsPromises: Promise<EnrichedAccount>[] = [];

    for (const [clientKey, clientInfo] of clientDataMap.entries()) {
        const promise = (async (): Promise<EnrichedAccount> => {
            const accountOrders = interactionsByClientKey.get(clientKey) || [];
            
            // If it's an existing account, use it. Otherwise, create a temporary "virtual" account.
            const account = clientInfo.account || {
                id: clientKey,
                nombre: clientInfo.name,
                potencial: 'medio',
                status: 'Seguimiento', // Default status, will be recalculated
                leadScore: 0,
                responsableId: accountOrders[0]?.salesRep ? teamMembers.find(tm => tm.name === accountOrders[0].salesRep)?.id || '' : '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                cif: '',
                type: 'Otro'
            };

            // Sort interactions for this specific account by date, descending.
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
            
            const responsableId = clientInfo.account?.salesRepId || clientInfo.account?.responsableId || (accountOrders.length > 0 ? teamMembers.find(tm => tm.name === accountOrders[0].salesRep)?.id : undefined);
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
        })();
        enrichedAccountsPromises.push(promise);
    }

    const enrichedAccounts = (await Promise.all(enrichedAccountsPromises)).filter(Boolean) as EnrichedAccount[];
    
    // Final sort based on the calculated lead score
    return enrichedAccounts.sort((a, b) => b.leadScore - a.leadScore);
}
