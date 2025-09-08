'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, Trash2, StickyNote as StickyNoteIcon, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StickyNote, TeamMember } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { addNoteAction, updateNoteStatusAction, deleteNoteAction } from '@/services/server/note-actions';

interface StickyNotesWidgetProps {
  initialNotes: StickyNote[];
  currentUserId: string;
  isAdmin: boolean;
  onNotesChange: () => void;
  allAssignableUsers: TeamMember[];
  teamMembersMap: Map<string, TeamMember>;
}

export function StickyNotesWidget({
  initialNotes,
  currentUserId,
  isAdmin,
  onNotesChange,
  allAssignableUsers,
  teamMembersMap,
}: StickyNotesWidgetProps) {
  const [notes, setNotes] = React.useState(initialNotes);
  const [newNoteContent, setNewNoteContent] = React.useState('');
  const [assignedToId, setAssignedToId] = React.useState(currentUserId);
  const [isAdding, setIsAdding] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  React.useEffect(() => {
    if (!isAdmin) {
      setAssignedToId(currentUserId);
    }
  }, [isAdmin, currentUserId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    setIsAdding(true);
    try {
      await addNoteAction(newNoteContent, currentUserId, assignedToId);
      setNewNoteContent('');
      if (!isAdmin) {
          setAssignedToId(currentUserId);
      }
      onNotesChange();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo añadir la nota.',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleStatus = async (noteId: string, isCompleted: boolean) => {
    setIsUpdating(noteId);
    try {
      await updateNoteStatusAction(noteId, isCompleted);
      onNotesChange();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la nota.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setIsUpdating(noteId);
    try {
      await deleteNoteAction(noteId);
      onNotesChange();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la nota.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(null);
    }
  };
  
  const getAssigneeName = (id: string) => teamMembersMap.get(id)?.name || 'Desconocido';

  return (
    <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StickyNoteIcon className="h-5 w-5 text-primary" />
          Bloc de Notas Rápido
        </CardTitle>
        <CardDescription>
          {isAdmin
            ? 'Añade y gestiona todas las tareas rápidas del equipo.'
            : 'Añade y gestiona tus tareas rápidas personales.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddNote} className="space-y-2 mb-4">
          <Input
            placeholder="Añadir una nueva tarea o idea..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            disabled={isAdding}
          />
          <div className="flex gap-2 justify-between">
            {isAdmin && (
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Asignar a..." />
                </SelectTrigger>
                <SelectContent>
                  {allAssignableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button type="submit" disabled={isAdding || !newNoteContent.trim()} className={isAdmin ? "" : "w-full"}>
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <><Plus className="mr-2 h-4 w-4" /> Añadir Nota</>
              )}
            </Button>
          </div>
        </form>
        <ScrollArea className="h-48 pr-3">
          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="flex items-start gap-3 p-2 rounded-md transition-colors hover:bg-muted/50"
              >
                <Checkbox
                  id={`note-${note.id}`}
                  checked={note.isCompleted}
                  onCheckedChange={(checked) => handleToggleStatus(note.id, !!checked)}
                  disabled={isUpdating === note.id}
                  className="mt-1"
                />
                <div className="flex-grow">
                  <label
                    htmlFor={`note-${note.id}`}
                    className={cn(
                      'text-sm cursor-pointer',
                      note.isCompleted && 'line-through text-muted-foreground'
                    )}
                  >
                    {note.content}
                  </label>
                  {isAdmin && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" /> Asignada a: {getAssigneeName(note.assignedToId)}
                    </p>
                  )}
                </div>
                {isUpdating === note.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => handleDeleteNote(note.id)}
                    aria-label="Eliminar nota"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {notes.length === 0 && (
              <p className="text-center text-sm text-muted-foreground pt-8">
                No hay notas aún. ¡Añade una!
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
