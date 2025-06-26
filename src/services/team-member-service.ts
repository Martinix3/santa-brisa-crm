

'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import type { firestore as adminFirestore } from 'firebase-admin';
import type { TeamMember, TeamMemberFormValues, UserRole } from '@/types';
import { format, parseISO } from 'date-fns';
import { mockTeamMembers as initialMockTeamMembersForSeeding } from '@/lib/data';

const TEAM_MEMBERS_COLLECTION = 'teamMembers';

const fromFirestoreTeamMember = (docSnap: adminFirestore.DocumentSnapshot): TeamMember => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  return {
    id: docSnap.id,
    authUid: data.authUid || docSnap.id,
    name: data.name || '',
    email: data.email || '',
    avatarUrl: data.avatarUrl || '',
    role: data.role || 'SalesRep',
    monthlyTargetAccounts: data.monthlyTargetAccounts,
    monthlyTargetVisits: data.monthlyTargetVisits,
    createdAt: data.createdAt instanceof adminFirestore.Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : (typeof data.createdAt === 'string' ? data.createdAt : undefined),
    updatedAt: data.updatedAt instanceof adminFirestore.Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : (typeof data.updatedAt === 'string' ? data.updatedAt : undefined),
  };
};

const toFirestoreTeamMember = (data: TeamMemberFormValues, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = {
    authUid: data.authUid,
    name: data.name,
    email: data.email,
    role: data.role,
    avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${data.name.substring(0,2).toUpperCase()}`,
    monthlyTargetAccounts: data.role === 'SalesRep' ? (data.monthlyTargetAccounts || 0) : null,
    monthlyTargetVisits: data.role === 'SalesRep' ? (data.monthlyTargetVisits || 0) : null,
  };

  if (isNew) {
    firestoreData.createdAt = adminFirestore.Timestamp.fromDate(new Date());
  }
  firestoreData.updatedAt = adminFirestore.Timestamp.fromDate(new Date());
  
  Object.keys(firestoreData).forEach(key => {
    if (firestoreData[key] === undefined && key !== 'monthlyTargetAccounts' && key !== 'monthlyTargetVisits') {
      delete firestoreData[key];
    }
  });

  return firestoreData;
};

export const getTeamMembersFS = async (roles?: UserRole[]): Promise<TeamMember[]> => {
  let membersQuery: adminFirestore.Query = db.collection(TEAM_MEMBERS_COLLECTION);
  
  if (roles && roles.length > 0) {
    membersQuery = membersQuery.where('role', 'in', roles);
  }
  
  const snapshot = await membersQuery.orderBy('name', 'asc').get();
  return snapshot.docs.map(docSnap => fromFirestoreTeamMember(docSnap));
};

export const getTeamMemberByIdFS = async (id: string): Promise<TeamMember | null> => {
  if (!id) return null;
  const docRef = db.collection(TEAM_MEMBERS_COLLECTION).doc(id);
  const docSnap = await docRef.get();
  return docSnap.exists ? fromFirestoreTeamMember(docSnap) : null;
};

export const getTeamMemberByAuthUidFS = async (authUid: string): Promise<TeamMember | null> => {
  if (!authUid) return null;
  const q = db.collection(TEAM_MEMBERS_COLLECTION).where('authUid', '==', authUid).limit(1);
  const snapshot = await q.get();
  if (!snapshot.empty) {
    return fromFirestoreTeamMember(snapshot.docs[0]);
  }
  return null;
};

export const getTeamMemberByEmailFS = async (email: string): Promise<TeamMember | null> => {
  if (!email) return null;
  const q = db.collection(TEAM_MEMBERS_COLLECTION).where('email', '==', email.toLowerCase()).limit(1);
  const snapshot = await q.get();
  if (!snapshot.empty) {
    return fromFirestoreTeamMember(snapshot.docs[0]);
  }
  return null;
};

export const addTeamMemberFS = async (data: TeamMemberFormValues): Promise<string> => {
  const firestoreData = toFirestoreTeamMember(data, true);
  const docRef = await db.collection(TEAM_MEMBERS_COLLECTION).add(firestoreData);
  return docRef.id;
};

export const updateTeamMemberFS = async (id: string, data: Partial<TeamMemberFormValues>): Promise<void> => {
  const docRef = db.collection(TEAM_MEMBERS_COLLECTION).doc(id);
  const updateData = toFirestoreTeamMember(data as TeamMemberFormValues, false);
  await docRef.update(updateData);
};

export const deleteTeamMemberFS = async (id: string): Promise<void> => {
  const docRef = db.collection(TEAM_MEMBERS_COLLECTION).doc(id);
  await docRef.delete();
};


export const initializeMockTeamMembersInFirestore = async () => {
    const membersCol = db.collection(TEAM_MEMBERS_COLLECTION);
    const snapshot = await membersCol.limit(1).get();
    if (snapshot.empty && initialMockTeamMembersForSeeding.length > 0) {
        const batch = db.batch();
        initialMockTeamMembersForSeeding.forEach(member => {
            const { id, performanceData, bottlesSold, orders, visits, ...memberData } = member;
            
            const formValues: TeamMemberFormValues = {
                authUid: member.id,
                name: member.name,
                email: member.email.toLowerCase(),
                role: member.role,
                avatarUrl: member.avatarUrl,
                monthlyTargetAccounts: member.monthlyTargetAccounts,
                monthlyTargetVisits: member.monthlyTargetVisits,
            };
            const firestoreReadyData = toFirestoreTeamMember(formValues, true);
            
            const docRef = membersCol.doc(member.id); 
            batch.set(docRef, firestoreReadyData);
        });
        await batch.commit();
        console.log('Mock team members initialized in Firestore.');
    } else if (initialMockTeamMembersForSeeding.length === 0) {
        console.log('No mock team members to seed or data source empty.');
    } else {
        console.log('Team members collection is not empty. Skipping initialization.');
    }
};
