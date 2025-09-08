'use server';

import {
  addNoteFS,
  deleteNoteFS,
  updateNoteStatusFS,
} from '@/services/note-service';
import type { StickyNote } from '@/types';

export async function addNoteAction(
  content: string,
  creatorId: string,
  assignedToId: string
): Promise<StickyNote> {
  try {
    return await addNoteFS(content, creatorId, assignedToId);
  } catch (error) {
    console.error('Error in addNoteAction:', error);
    throw new Error('Failed to add note.');
  }
}

export async function updateNoteStatusAction(
  noteId: string,
  isCompleted: boolean
): Promise<void> {
  try {
    await updateNoteStatusFS(noteId, isCompleted);
  } catch (error) {
    console.error('Error in updateNoteStatusAction:', error);
    throw new Error('Failed to update note status.');
  }
}

export async function deleteNoteAction(noteId: string): Promise<void> {
  try {
    await deleteNoteFS(noteId);
  } catch (error) {
    console.error('Error in deleteNoteAction:', error);
    throw new Error('Failed to delete note.');
  }
}
