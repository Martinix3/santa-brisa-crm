
'use client';

import { collection, query, where, getDocs, doc, type DocumentSnapshot, limit } from "firebase/firestore";
import { db } from '@/lib/firebase-client';
import type { TeamMember } from '@/types';
import { fromFirestoreTeamMember } from '@/services/utils/firestore-converters.client';

const TEAM_MEMBERS_COLLECTION = 'teamMembers';

export const getTeamMemberByAuthUidFS = async (authUid: string): Promise<TeamMember | null> => {
  if (!authUid) return null;
  const membersCol = collection(db, TEAM_MEMBERS_COLLECTION);
  const q = query(membersCol, where('authUid', '==', authUid), limit(1));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return fromFirestoreTeamMember(snapshot.docs[0]);
  }
  return null;
};
