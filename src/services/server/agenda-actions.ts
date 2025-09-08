
'use server';

import { getOrdersFS, addScheduledTaskFS, deleteOrderFS, updateScheduledTaskFS, reorderTasksBatchFS, updateOrderStatusFS } from '@/services/order-service';
import { getEventsFS, addEventFS, deleteEventFS, updateEventFS, reorderEventsBatchFS } from '@/services/event-service';
import { getTeamMembersFS } from '@/services/team-member-service';
import { getNotesForUserFS, getAllNotesFS } from '@/services/note-service';
import type { Order, CrmEvent, TeamMember, UserRole, NewScheduledTaskData, EventFormValues, StickyNote } from '@/types';
import { AgendaItemType } from '@/app/(app)/my-agenda/page';


export async function getAgendaDataAction(userRole: UserRole | null, userId?: string): Promise<{
    orders: Order[],
    events: CrmEvent[],
    teamMembers: TeamMember[],
    notes: StickyNote[],
}> {
    if (!userRole) {
        throw new Error("User role is not defined.");
    }
    try {
        const [orders, events, teamMembers] = await Promise.all([
            getOrdersFS(),
            getEventsFS(),
            getTeamMembersFS(['SalesRep', 'Clavadista', 'Admin', 'Líder Clavadista']),
        ]);
        
        let notes: StickyNote[] = [];
        if (userRole === 'Admin') {
            notes = await getAllNotesFS();
        } else if (userId) {
            notes = await getNotesForUserFS(userId);
        }

        return { orders, events, teamMembers, notes };
    } catch (error) {
        console.error("Error in getAgendaDataAction:", error);
        throw new Error("Failed to fetch agenda data. Please check server logs.");
    }
}

export async function updateTaskOrderAction(updates: { id: string; orderIndex: number; date?: Date, type: AgendaItemType }[]): Promise<void> {
    try {
        const taskUpdates = updates.filter(u => u.type !== 'evento').map(({ id, orderIndex, date }) => ({ id, orderIndex, date }));
        const eventUpdates = updates.filter(u => u.type === 'evento').map(({ id, orderIndex, date }) => ({ id, orderIndex, date }));

        await Promise.all([
            taskUpdates.length > 0 ? reorderTasksBatchFS(taskUpdates) : Promise.resolve(),
            eventUpdates.length > 0 ? reorderEventsBatchFS(eventUpdates) : Promise.resolve(),
        ]);
    } catch (error) {
        console.error("Error in updateTaskOrderAction:", error);
        throw new Error("Failed to reorder tasks.");
    }
}

export async function deleteAgendaItemAction(id: string, type: AgendaItemType): Promise<void> {
    try {
        if (type === 'evento') {
            await deleteEventFS(id);
        } else {
            await deleteOrderFS(id);
        }
    } catch (error) {
        console.error(`Error deleting item ${id} of type ${type}:`, error);
        throw new Error("Failed to delete agenda item.");
    }
}

export async function addScheduledTaskAction(data: NewScheduledTaskData, currentUser: TeamMember): Promise<string> {
    try {
        return await addScheduledTaskFS(data, currentUser);
    } catch (error) {
        console.error("Error in addScheduledTaskAction:", error);
        throw new Error("Failed to add scheduled task.");
    }
}

export async function updateScheduledTaskAction(id: string, data: NewScheduledTaskData): Promise<void> {
     try {
        await updateScheduledTaskFS(id, data);
    } catch (error) {
        console.error("Error in updateScheduledTaskAction:", error);
        throw new Error("Failed to update scheduled task.");
    }
}

export async function addEventAction(data: EventFormValues): Promise<string> {
    try {
        return await addEventFS(data);
    } catch (error) {
        console.error("Error in addEventAction:", error);
        throw new Error("Failed to add event.");
    }
}

export async function updateEventAction(id: string, data: EventFormValues): Promise<void> {
    try {
        await updateEventFS(id, data);
    } catch (error) {
        console.error("Error in updateEventAction:", error);
        throw new Error("Failed to update event.");
    }
}

export async function markTaskAsCompleteAction(id: string): Promise<void> {
    try {
        await updateOrderStatusFS(id, "Completado");
    } catch (error) {
        console.error("Error in markTaskAsCompleteAction:", error);
        throw new Error("Failed to mark task as complete.");
    }
}

