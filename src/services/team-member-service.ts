
'use server';
import 'server-only';

import { adminDb } from '@/lib/firebaseAdmin';
import {
  collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, limit,
  type DocumentSnapshot,
} from "firebase-admin/firestore";
import type { TeamMember, TeamMemberFormValues } from '@/types';
import type { RolUsuario } from "@ssot";
import { fromFirestoreTeamMember } from './utils/firestore-converters';

const TEAM_MEMBERS_COLLECTION = 'teamMembers';

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

export const getTeamMembersFS = async (roles?: RolUsuario[]): Promise<TeamMember[]> => {
  let q: FirebaseFirestore.Query = adminDb.collection(TEAM_MEMBERS_COLLECTION);

  if (roles && roles.length > 0) {
    q = q.where('role', 'in', roles);
  }
  q = q.orderBy('name', 'asc');
  
  const snapshot = await q.get();
  const members = snapshot.docs.map(docSnap => fromFirestoreTeamMember(docSnap));
  
  return members;
};

export const getTeamMemberByIdFS = async (id: string): Promise<TeamMember | null> => {
  if (!id) return null;
  const docRef = adminDb.collection(TEAM_MEMBERS_COLLECTION).doc(id);
  const docSnap = await docRef.get();
  return docSnap.exists ? fromFirestoreTeamMember(docSnap) : null;
};

export const getTeamMemberByAuthUidFS = async (authUid: string): Promise<TeamMember | null> => {
  if (!authUid) return null;
  const membersCol = adminDb.collection(TEAM_MEMBERS_COLLECTION);
  const q = membersCol.where('authUid', '==', authUid).limit(1);
  const snapshot = await q.get();
  if (!snapshot.empty) {
    return fromFirestoreTeamMember(snapshot.docs[0]);
  }
  return null;
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
