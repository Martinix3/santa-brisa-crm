
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
  // The query was filtering by 'assignedToId' and ordering by 'createdAt'.
  // This requires a composite index. To avoid this, we remove the orderBy clause.
  const q = query(
    collection(adminDb, NOTES_COLLECTION),
    where('assignedToId', '==', userId)
    // orderBy('createdAt', 'desc') // <-- This line was removed to prevent the index error.
  );
  const snapshot = await getDocs(q);
  const notes = snapshot.docs.map(fromFirestoreNote);
  
  // We now perform the sorting in the application code after fetching the data.
  notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  return notes;
};

export const getAllNotesFS = async (): Promise<StickyNote[]> => {
  const q = query(collection(adminDb, NOTES_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
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
