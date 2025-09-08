
import { adminDb } from '@/lib/firebaseAdmin';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  type DocumentSnapshot,
} from 'firebase-admin/firestore';
import type { StickyNote } from '@/types';

const NOTES_COLLECTION = 'stickyNotes';

const fromFirestoreNote = (snapshot: DocumentSnapshot): StickyNote => {
  const data = snapshot.data();
  if (!data) throw new Error('Note data is undefined.');
  return {
    id: snapshot.id,
    content: data.content,
    creatorId: data.creatorId,
    assignedToId: data.assignedToId,
    isCompleted: data.isCompleted,
    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
  };
};

export const getNotesForUserFS = async (userId: string): Promise<StickyNote[]> => {
  if (!userId) return [];
  const q = adminDb.collection(NOTES_COLLECTION).where('assignedToId', '==', userId);
  const snapshot = await q.get();
  const notes = snapshot.docs.map(fromFirestoreNote);
  
  notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  return notes;
};

export const getAllNotesFS = async (): Promise<StickyNote[]> => {
  const q = adminDb.collection(NOTES_COLLECTION).orderBy('createdAt', 'desc');
  const snapshot = await q.get();
  return snapshot.docs.map(fromFirestoreNote);
};

export const addNoteFS = async (
  content: string,
  creatorId: string,
  assignedToId: string
): Promise<StickyNote> => {
  const newNote = {
    content,
    creatorId,
    assignedToId,
    isCompleted: false,
    createdAt: Timestamp.now(),
  };
  const docRef = await addDoc(collection(adminDb, NOTES_COLLECTION), newNote);
  return {
    id: docRef.id,
    ...newNote,
    createdAt: newNote.createdAt.toDate().toISOString(),
  };
};

export const updateNoteStatusFS = async (noteId: string, isCompleted: boolean): Promise<void> => {
  const noteRef = doc(adminDb, NOTES_COLLECTION, noteId);
  await updateDoc(noteRef, { isCompleted });
};

export const deleteNoteFS = async (noteId: string): Promise<void> => {
  const noteRef = doc(adminDb, NOTES_COLLECTION, noteId);
  await deleteDoc(noteRef);
};
