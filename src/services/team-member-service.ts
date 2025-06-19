
"use client";

import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  orderBy,
  writeBatch,
  limit
} from 'firebase/firestore';
import type { TeamMember, TeamMemberFormValues, UserRole } from '@/types';
import { format, parseISO } from 'date-fns';
import { mockTeamMembers as initialMockTeamMembersForSeeding } from '@/lib/data'; // For seeding only

const TEAM_MEMBERS_COLLECTION = 'teamMembers';

const fromFirestoreTeamMember = (docSnap: any): TeamMember => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    authUid: data.authUid || docSnap.id, // Fallback to doc id if authUid isn't there
    name: data.name || '',
    email: data.email || '',
    avatarUrl: data.avatarUrl || '',
    role: data.role || 'SalesRep', // Default role if not specified
    monthlyTargetAccounts: data.monthlyTargetAccounts,
    monthlyTargetVisits: data.monthlyTargetVisits,
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : (typeof data.createdAt === 'string' ? data.createdAt : undefined),
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : (typeof data.updatedAt === 'string' ? data.updatedAt : undefined),
  };
};

const toFirestoreTeamMember = (data: TeamMemberFormValues, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = {
    authUid: data.authUid,
    name: data.name,
    email: data.email, // Email should generally not be updated after creation
    role: data.role,
    avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${data.name.substring(0,2).toUpperCase()}`,
    monthlyTargetAccounts: data.role === 'SalesRep' ? (data.monthlyTargetAccounts || 0) : null,
    monthlyTargetVisits: data.role === 'SalesRep' ? (data.monthlyTargetVisits || 0) : null,
  };

  if (isNew) {
    firestoreData.createdAt = Timestamp.fromDate(new Date());
  }
  firestoreData.updatedAt = Timestamp.fromDate(new Date());
  
  // Remove undefined fields explicitly before saving, except for targets which become null
  Object.keys(firestoreData).forEach(key => {
    if (firestoreData[key] === undefined && key !== 'monthlyTargetAccounts' && key !== 'monthlyTargetVisits') {
      delete firestoreData[key];
    }
  });

  return firestoreData;
};

export const getTeamMembersFS = async (roles?: UserRole[]): Promise<TeamMember[]> => {
  let q = query(collection(db, TEAM_MEMBERS_COLLECTION), orderBy('name', 'asc'));
  if (roles && roles.length > 0) {
    q = query(q, where('role', 'in', roles));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => fromFirestoreTeamMember(docSnap));
};

export const getTeamMemberByIdFS = async (id: string): Promise<TeamMember | null> => {
  if (!id) return null;
  const docRef = doc(db, TEAM_MEMBERS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? fromFirestoreTeamMember(docSnap) : null;
};

export const getTeamMemberByAuthUidFS = async (authUid: string): Promise<TeamMember | null> => {
  if (!authUid) return null;
  const q = query(collection(db, TEAM_MEMBERS_COLLECTION), where('authUid', '==', authUid), limit(1));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return fromFirestoreTeamMember(snapshot.docs[0]);
  }
  return null;
};

export const getTeamMemberByEmailFS = async (email: string): Promise<TeamMember | null> => {
  if (!email) return null;
  const q = query(collection(db, TEAM_MEMBERS_COLLECTION), where('email', '==', email.toLowerCase()), limit(1));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return fromFirestoreTeamMember(snapshot.docs[0]);
  }
  return null;
};

export const addTeamMemberFS = async (data: TeamMemberFormValues): Promise<string> => {
  const firestoreData = toFirestoreTeamMember(data, true);
  const docRef = await addDoc(collection(db, TEAM_MEMBERS_COLLECTION), firestoreData);
  // Optionally, update the document with its own ID if you use that as `id` field
  // await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
};

export const updateTeamMemberFS = async (id: string, data: Partial<TeamMemberFormValues>): Promise<void> => {
  const docRef = doc(db, TEAM_MEMBERS_COLLECTION, id);
   // Fetch existing doc to merge if needed, or simply overwrite specific fields
  const updateData = toFirestoreTeamMember(data as TeamMemberFormValues, false); // Cast needed if data is partial
  await updateDoc(docRef, updateData);
};

export const deleteTeamMemberFS = async (id: string): Promise<void> => {
  const docRef = doc(db, TEAM_MEMBERS_COLLECTION, id);
  await deleteDoc(docRef);
};


export const initializeMockTeamMembersInFirestore = async () => {
    const membersCol = collection(db, TEAM_MEMBERS_COLLECTION);
    const snapshot = await getDocs(query(membersCol));
    if (snapshot.empty && initialMockTeamMembersForSeeding.length > 0) {
        const batch = writeBatch(db);
        initialMockTeamMembersForSeeding.forEach(member => {
            const { id, performanceData, bottlesSold, orders, visits, ...memberData } = member; // Excluir campos calculados o de mock puro
            
            const formValues: TeamMemberFormValues = {
                authUid: member.id, // Usamos el ID del mock como authUid para el seeding
                name: member.name,
                email: member.email.toLowerCase(), // Guardar emails en minúscula para consistencia
                role: member.role,
                avatarUrl: member.avatarUrl,
                monthlyTargetAccounts: member.monthlyTargetAccounts,
                monthlyTargetVisits: member.monthlyTargetVisits,
            };
            const firestoreReadyData = toFirestoreTeamMember(formValues, true);
            
            // Para el seeding, el ID del documento será el mismo que el authUid para facilitar la vinculación
            const docRef = doc(membersCol, member.id); 
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
