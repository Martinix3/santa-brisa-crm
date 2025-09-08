

import { getAgendaDataAction } from "@/services/server/agenda-actions";
import MyAgendaClientPage from "@/components/app/my-agenda/my-agenda-client-page";
import { getTeamMemberByAuthUidFS } from "@/services/team-member-service";
import { headers } from "next/headers";
import { adminAuth } from "@/lib/firebaseAdmin";


export const dynamic = 'force-dynamic';

async function getServerSideUser() {
    // This is a placeholder for a real session management system.
    // In a production app, you would verify a session token from cookies/headers.
    try {
        const usersResult = await adminAuth.listUsers(1);
        if (usersResult.users.length > 0) {
            const firstUser = usersResult.users[0];
            return await getTeamMemberByAuthUidFS(firstUser.uid);
        }
        return null;
    } catch (e) {
        console.error("Could not get server side user for agenda:", e);
        return null;
    }
}


export default async function MyAgendaPage() {
  
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


