
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ClipboardList, PartyPopper, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export type EntryType = 'commercial_task' | 'event' | 'admin_task';

interface NewEntryTypeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectType: (type: EntryType) => void;
  selectedDate: Date | undefined;
}

export default function NewEntryTypeDialog({ isOpen, onOpenChange, onSelectType, selectedDate }: NewEntryTypeDialogProps) {

  const handleSelect = (type: EntryType) => {
    onSelectType(type);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Qué quieres añadir a tu agenda?</DialogTitle>
          {selectedDate && (
             <DialogDescription>
                Selecciona el tipo de entrada que quieres registrar para el {format(selectedDate, "dd 'de' MMMM", { locale: es })}.
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="py-4 grid grid-cols-1 gap-4">
            <Button
                variant="outline"
                className="h-20 text-lg flex items-center justify-start p-4 gap-4"
                onClick={() => handleSelect('commercial_task')}
            >
                <ClipboardList className="h-8 w-8 text-primary" />
                <span>Tarea Comercial</span>
            </Button>
            <Button
                variant="outline"
                className="h-20 text-lg flex items-center justify-start p-4 gap-4"
                onClick={() => handleSelect('event')}
            >
                <PartyPopper className="h-8 w-8 text-purple-500" />
                <span>Evento</span>
            </Button>
            <Button
                variant="outline"
                className="h-20 text-lg flex items-center justify-start p-4 gap-4"
                onClick={() => handleSelect('admin_task')}
            >
                <Briefcase className="h-8 w-8 text-blue-500" />
                <span>Tarea Administrativa</span>
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
