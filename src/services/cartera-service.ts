
'use server';

import type { Account, Interaction, TeamMember, AccountStatus, EnrichedAccount, PotencialType } from '@/types';
import { parseISO, differenceInDays, isValid, startOfDay } from 'date-fns';

/**
 * Calculates the current status of an account based on its interactions.
 * The rules are applied in a specific priority order.
 */
function calculateAccountStatus(
    interactionsForAccount: Interaction[],
    lastInteractionDate?: Date
): AccountStatus {
    const now = new Date();

    // 1. Inactivo: Overrides all other statuses if the last interaction is too old.
    if (lastInteractionDate && differenceInDays(now, lastInteractionDate) > 90) {
        return 'Inactivo';
    }

    // 2. Repetición: A customer with 2 or more successful orders.
    const successfulOrders = interactionsForAccount.filter(i => i.resultado === 'Pedido Exitoso');
    if (successfulOrders.length >= 2) {
        return 'Repetición';
    }

    // 3. Primer Pedido: A customer with exactly 1 successful order.
    if (successfulOrders.length === 1) {
        return 'Primer Pedido';
    }

    // 4. Programado: An active account that has a future task scheduled.
    const futureInteractions = interactionsForAccount.filter(i => 
        ['Programada', 'Requiere seguimiento'].includes(i.resultado) &&
        i.fecha_prevista &&
        isValid(parseISO(i.fecha_prevista)) &&
        parseISO(i.fecha_prevista) >= startOfDay(now) // Use startOfDay to include today
    );
    if (futureInteractions.length > 0) {
        return 'Programado';
    }
    
    // 5. Seguimiento: Default active status if none of the above match.
    // This typically means the last interaction was a 'Fallida' or a 'Requiere seguimiento' with a past date.
    return 'Seguimiento';
}


/**
 * Calculates the lead score for an account based on its interactions and potential.
 */
function calculateLeadScore(account: Account, interactionsForAccount: Interaction[], nextInteraction?: Interaction): number {
    let score = 0;
    const now = new Date();

    const lastInteraction = interactionsForAccount[0]; // Assumes interactions are sorted descending by date

    if (lastInteraction?.resultado === 'Pedido Exitoso') {
        score += 30;
    }

    switch (account.potencial) {
        case 'alto': score += 20; break;
        case 'medio': score += 10; break;
        case 'bajo': score += 5; break;
    }

    if (lastInteraction && (lastInteraction.fecha_real || lastInteraction.createdAt)) {
        const lastDate = parseISO(lastInteraction.fecha_real || lastInteraction.createdAt);
        if (isValid(lastDate)) {
            const daysSinceLastInteraction = differenceInDays(now, lastDate);
            if (daysSinceLastInteraction < 7) score += 20;
            else if (daysSinceLastInteraction < 14) score += 10;
        }
    }

    if (nextInteraction?.fecha_prevista) {
        const daysToNextInteraction = differenceInDays(parseISO(nextInteraction.fecha_prevista), now);
        if (daysToNextInteraction <= 3 && daysToNextInteraction >= 0) {
            score += 20;
        }
    }

    if (account.brandAmbassadorId && lastInteraction) {
        score += 10;
    }

    return Math.min(score, 100);
}

export type TaskBucket = 'vencida' | 'hoy' | 'pendiente';

/**
 * Processes raw accounts and interactions data to return enriched account objects for the Cartera view.
 */
export async function processCarteraData(
    accounts: Account[],
    interactions: Interaction[],
    teamMembers: TeamMember[]
): Promise<EnrichedAccount[]> {
    console.log('>>> DEBUG processCarteraData START');
    const interactionsByAccount = new Map<string, Interaction[]>();
    for (const interaction of interactions) {
        if (!interactionsByAccount.has(interaction.accountId)) {
            interactionsByAccount.set(interaction.accountId, []);
        }
        interactionsByAccount.get(interaction.accountId)!.push(interaction);
    }
    
    // Sort interactions for each account by their effective date (real date first, then creation date).
    for (const accountInteractions of interactionsByAccount.values()) {
        accountInteractions.sort((a, b) => {
            const dateA = a.fecha_real ? parseISO(a.fecha_real) : parseISO(a.createdAt);
            const dateB = b.fecha_real ? parseISO(b.fecha_real) : parseISO(b.createdAt);
            return dateB.getTime() - dateA.getTime();
        });
    }

    const enrichedAccounts: EnrichedAccount[] = accounts.map(account => {
        console.log(`\n--- DEBUG Account ${account.id} (${account.nombre}) ---`);
        console.log('RAW ACCOUNT:', account);
        const accountInteractions = interactionsByAccount.get(account.id) || [];
        console.log('ALL INTERACTIONS:', accountInteractions);
        
        const openInteractions = accountInteractions.filter(i => 
            ['Programada', 'Requiere seguimiento'].includes(i.resultado) &&
            i.fecha_prevista &&
            isValid(parseISO(i.fecha_prevista))
        ).sort((a,b) => parseISO(a.fecha_prevista).getTime() - parseISO(b.fecha_prevista).getTime());

        console.log('FUTURE INTERACTIONS (openInteractions):', openInteractions);

        const nextInteraction = openInteractions.find(i => parseISO(i.fecha_prevista) >= startOfDay(new Date())) || undefined;

        const lastInteraction = accountInteractions[0];
        const lastInteractionDate = lastInteraction 
            ? parseISO(lastInteraction.fecha_real || lastInteraction.createdAt) 
            : undefined;

        const status = calculateAccountStatus(accountInteractions, lastInteractionDate);
        const leadScore = calculateLeadScore(account, accountInteractions, nextInteraction);
        const totalSuccessfulOrders = accountInteractions.filter(i => i.resultado === 'Pedido Exitoso').length;

        console.log('CALCULATED STATUS:', status);
        console.log('CALCULATED LEAD SCORE:', leadScore);
        console.log('--- END DEBUG Account', account.id, '---\n');

        return {
            ...account,
            status,
            leadScore,
            nextInteraction,
            totalSuccessfulOrders,
            lastInteractionDate,
        };
    });

    console.log('>>> DEBUG processCarteraData END');
    return enrichedAccounts.sort((a, b) => b.leadScore - a.leadScore);
}

