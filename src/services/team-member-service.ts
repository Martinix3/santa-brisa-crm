import { adminDb } from '@/lib/firebaseAdmin';
import {
  collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, limit,
  type DocumentSnapshot,
} from "firebase-admin/firestore";
import type { TeamMember, TeamMemberFormValues } from '@/types';
import { format, parseISO } from 'date-fns';
import { RolUsuario as UserRole } from "@ssot";

const TEAM_MEMBERS_COLLECTION = 'teamMembers';

const fromFirestoreTeamMember = (docSnap: DocumentSnapshot): TeamMember => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  return {
    id: docSnap.id,
    authUid: data.authUid || docSnap.id,
    name: data.name || '',
    email: data.email || '',
    avatarUrl: data.avatarUrl || '',
    role: data.role || 'Ventas',
    monthlyTargetAccounts: data.monthlyTargetAccounts,
    monthlyTargetVisits: data.monthlyTargetVisits,
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : (typeof data.createdAt === 'string' ? data.createdAt : undefined),
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : (typeof data.updatedAt === 'string' ? data.updatedAt : undefined),
    liderId: data.liderId,
    equipoIds: data.equipoIds,
    condiciones_personalizadas: data.condiciones_personalizadas,
    total_comisiones: data.total_comisiones,
    total_bonus: data.total_bonus,
    accountId: data.accountId,
  };
};

const toFirestoreTeamMember = (data: Partial<TeamMemberFormValues>, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = {
    authUid: data.authUid,
    name: data.name,
    email: data.email?.toLowerCase(),
    role: data.role,
    avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${data.name?.substring(0,2).toUpperCase()}`,
    liderId: data.liderId || null,
    accountId: data.accountId || null,
  };

  if (data.role === 'Ventas') {
    firestoreData.monthlyTargetAccounts = data.monthlyTargetAccounts || 0;
    firestoreData.monthlyTargetVisits = data.monthlyTargetVisits || 0;
  } else {
    firestoreData.monthlyTargetAccounts = null;
    firestoreData.monthlyTargetVisits = null;
  }
  
  if (data.uses_custom_conditions) {
    firestoreData.condiciones_personalizadas = data.condiciones_personalizadas || null;
  } else {
    firestoreData.condiciones_personalizadas = null;
  }


  if (isNew) {
    firestoreData.createdAt = Timestamp.now();
    firestoreData.total_comisiones = 0;
    firestoreData.total_bonus = 0;
  }
  firestoreData.updatedAt = Timestamp.now();
  
  Object.keys(firestoreData).forEach(key => {
    if (firestoreData[key] === undefined) {
      delete firestoreData[key];
    }
  });

  return firestoreData;
};

export const getTeamMembersFS = async (roles?: UserRole[]): Promise<TeamMember[]> => {
  let q: FirebaseFirestore.Query = adminDb.collection(TEAM_MEMBERS_COLLECTION);

  if (roles && roles.length > 0) {
    q = q.where('role', 'in', roles);
  } else {
    q = q.orderBy('name', 'asc');
  }
  
  const snapshot = await q.get();
  const members = snapshot.docs.map(docSnap => fromFirestoreTeamMember(docSnap));

  // Sort manually if we didn't order by name in the query to avoid composite indexes
  if (roles && roles.length > 0) {
    members.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  return members;
};

export const getTeamMemberByIdFS = async (id: string): Promise<TeamMember | null> => {
  if (!id) return null;
  const docRef = adminDb.collection(TEAM_MEMBERS_COLLECTION).doc(id);
  const docSnap = await docRef.get();
  return docSnap.exists ? fromFirestoreTeamMember(docSnap) : null;
};

export const getTeamMemberByEmailFS = async (email: string): Promise<TeamMember | null> => {
  if (!email) return null;
  const membersCol = adminDb.collection(TEAM_MEMBERS_COLLECTION);
  const q = membersCol.where('email', '==', email.toLowerCase()).limit(1);
  const snapshot = await q.get();
  if (!snapshot.empty) {
    return fromFirestoreTeamMember(snapshot.docs[0]);
  }
  return null;
};

export const addTeamMemberFS = async (data: TeamMemberFormValues): Promise<string> => {
  const firestoreData = toFirestoreTeamMember(data, true);
  const docRef = await adminDb.collection(TEAM_MEMBERS_COLLECTION).add(firestoreData);
  return docRef.id;
};

export const updateTeamMemberFS = async (id: string, data: Partial<TeamMemberFormValues>): Promise<void> => {
  const docRef = adminDb.collection(TEAM_MEMBERS_COLLECTION).doc(id);
  const updateData = toFirestoreTeamMember(data, false);
  await docRef.update(updateData);
};

export const deleteTeamMemberFS = async (id: string): Promise<void> => {
  const docRef = adminDb.collection(TEAM_MEMBERS_COLLECTION).doc(id);
  await docRef.delete();
};


export const initializeMockTeamMembersInFirestore = async () => {
    const membersCol = adminDb.collection(TEAM_MEMBERS_COLLECTION);
    const snapshot = await membersCol.limit(1).get();
    if (snapshot.empty) {
        console.log('No team members found, skipping initialization.');
    } else {
        console.log('Team members collection is not empty. Skipping initialization.');
    }
};
