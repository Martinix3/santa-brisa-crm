
'use server';

import type { Account, Interaction, TeamMember, AccountStatus, EnrichedAccount, PotencialType } from '@/types';
import { parseISO, differenceInDays, isValid } from 'date-fns';

/**
 * Calculates the current status of an account based on its interactions.
 */
function calculateAccountStatus(interactionsForAccount: Interaction[], lastInteractionDate?: Date): AccountStatus {
    const now = new Date();

    if (lastInteractionDate && differenceInDays(now, lastInteractionDate) > 90) {
        return 'Inactivo';
    }

    const successfulOrders = interactionsForAccount.filter(i => i.resultado === 'Pedido Exitoso');
    if (successfulOrders.length >= 2) {
        return 'Repetición';
    }
    if (successfulOrders.length === 1) {
        return 'Primer Pedido';
    }

    const openInteractions = interactionsForAccount.filter(i => 
        ['Programada', 'Requiere seguimiento'].includes(i.resultado) && 
        i.fecha_prevista && 
        isValid(parseISO(i.fecha_prevista)) &&
        parseISO(i.fecha_prevista) >= now
    );
    if (openInteractions.length > 0) {
        return 'Programado';
    }

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

    if (lastInteraction && lastInteraction.createdAt) {
        const daysSinceLastInteraction = differenceInDays(now, parseISO(lastInteraction.createdAt));
        if (daysSinceLastInteraction < 7) score += 20;
        else if (daysSinceLastInteraction < 14) score += 10;
    }

    if (nextInteraction?.fecha_prevista) {
        const daysToNextInteraction = differenceInDays(parseISO(nextInteraction.fecha_prevista), now);
        if (daysToNextInteraction <= 3 && daysToNextInteraction >= 0) {
            score += 20;
        }
    }

    if (account.brandAmbassadorId && lastInteraction) {
        // This is a simplification. A real implementation might need to check if the BA was on the specific interaction.
        // For now, we assume if an account HAS a BA, it's a positive signal on the last action.
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
    const interactionsByAccount = new Map<string, Interaction[]>();
    for (const interaction of interactions) {
        if (!interactionsByAccount.has(interaction.accountId)) {
            interactionsByAccount.set(interaction.accountId, []);
        }
        interactionsByAccount.get(interaction.accountId)!.push(interaction);
    }
    
    // Sort interactions for each account
    for (const accountInteractions of interactionsByAccount.values()) {
        accountInteractions.sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
    }

    const enrichedAccounts: EnrichedAccount[] = accounts.map(account => {
        const accountInteractions = interactionsByAccount.get(account.id) || [];
        
        const openInteractions = accountInteractions.filter(i => 
            ['Programada', 'Requiere seguimiento'].includes(i.resultado) &&
            isValid(parseISO(i.fecha_prevista))
        ).sort((a,b) => parseISO(a.fecha_prevista).getTime() - parseISO(b.fecha_prevista).getTime());

        const nextInteraction = openInteractions.find(i => parseISO(i.fecha_prevista) >= new Date()) || undefined;

        const lastInteractionDate = accountInteractions[0] ? parseISO(accountInteractions[0].createdAt) : undefined;

        const status = calculateAccountStatus(accountInteractions, lastInteractionDate);
        const leadScore = calculateLeadScore(account, accountInteractions, nextInteraction);
        const totalSuccessfulOrders = accountInteractions.filter(i => i.resultado === 'Pedido Exitoso').length;

        return {
            ...account,
            status,
            leadScore,
            nextInteraction,
            totalSuccessfulOrders,
            lastInteractionDate,
        };
    });

    return enrichedAccounts.sort((a, b) => b.leadScore - a.leadScore);
}
