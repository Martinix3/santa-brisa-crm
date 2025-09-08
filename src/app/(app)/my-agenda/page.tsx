
import { getAgendaDataAction } from "@/services/server/agenda-actions";
import MyAgendaClientPage from "@/components/app/my-agenda/my-agenda-client-page";
import { headers } from 'next/headers';
import { adminAuth } from '@/lib/firebaseAdmin';
import { getTeamMemberByAuthUidFS } from "@/services/team-member-service";


export const dynamic = 'force-dynamic';

// This is a simplified way to get user info on the server.
// In a real app with proper session management, you'd get this from the session.
async function getServerSideUser() {
    // This part is complex without a full auth library like next-auth.
    // We will simulate getting the current user for now.
    // In a real scenario, you'd verify a session token from cookies/headers.
    // THIS IS A PLACEHOLDER - assumes a default or first user if no auth is found.
    // A robust solution needs a proper session management strategy.
    try {
        // A more robust way would be to get the session from the request headers
        // but for now, we'll try to get the first user for demonstration.
        const users = await adminAuth.listUsers(1);
        if (users.users.length > 0) {
            return await getTeamMemberByAuthUidFS(users.users[0].uid);
        }
        return null;
    } catch (e) {
        console.error("Could not get server side user", e);
        return null;
    }
}


export default async function MyAgendaPage() {
  
  // This is a simplified way to get user info on the server.
  const teamMember = await getServerSideUser();

  const { orders, events, teamMembers, notes, accounts, inventoryItems, costCenters } = await getAgendaDataAction(teamMember?.role || null, teamMember?.id);

  return (
    <MyAgendaClientPage
      initialAgendaItems={[
        ...orders.map(o => ({...o, itemType: 'order'})),
        ...events.map(e => ({...e, itemType: 'event'}))
      ]}
      initialTeamMembers={teamMembers}
      initialAccounts={accounts}
      initialNotes={notes}
      initialInventoryItems={inventoryItems}
      initialCostCenters={costCenters}
    />
  );
}
