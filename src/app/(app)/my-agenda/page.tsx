import { getAgendaDataAction } from "@/services/server/agenda-actions";
import MyAgendaClientPage from "@/components/app/my-agenda/my-agenda-client-page";
import { auth } from "@/lib/firebase";
import { getTeamMemberByAuthUidFS } from "@/services/client/team-member-service.client";

export const dynamic = 'force-dynamic';

export default async function MyAgendaPage() {
  
  // This is a simplified way to get user info on the server.
  // In a real app with proper session management, you'd get this from the session.
  const currentUser = auth.currentUser;
  let teamMember = null;
  if(currentUser) {
     teamMember = await getTeamMemberByAuthUidFS(currentUser.uid);
  }

  const { orders, events, teamMembers, notes, accounts } = await getAgendaDataAction(teamMember?.role || null, teamMember?.id);

  return (
    <MyAgendaClientPage
      initialAgendaItems={[
        ...orders.map(o => ({...o, itemType: 'order'})),
        ...events.map(e => ({...e, itemType: 'event'}))
      ]}
      initialTeamMembers={teamMembers}
      initialAccounts={accounts}
      initialNotes={notes}
    />
  );
}
