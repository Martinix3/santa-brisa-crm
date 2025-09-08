
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { TankFormValues, Tank } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "../ui/separator";
import { EstadoTanque as TankStatus, UdM as UoM, ESTADOS_TANQUE as tankStatusList, UDM as uomList } from "@ssot";

const tankFormSchema = z.object({
  name: z.string().min(2, "El nombre del tanque es obligatorio."),
  capacity: z.coerce.number().positive("La capacidad debe ser un número positivo."),
  location: z.string().min(2, "La ubicación es obligatoria."),
  status: z.enum(tankStatusList as [TankStatus, ...TankStatus[]]),
  currentBatchId: z.string().optional().nullable(),
  currentQuantity: z.coerce.number().nonnegative("La cantidad no puede ser negativa.").optional().nullable(),
  currentUom: z.enum(uomList as [UoM, ...UoM[]]).optional().nullable(),
});


interface TankDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: TankFormValues, tankId?: string) => void;
  tank: Tank | null;
}

export default function TankDialog({ isOpen, onOpenChange, onSave, tank }: TankDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const isEditMode = !!tank;

  const form = useForm<TankFormValues>({
    resolver: zodResolver(tankFormSchema),
    defaultValues: {
      name: "",
      capacity: 1000,
      location: "",
      status: 'Libre',
      currentBatchId: null,
      currentQuantity: null,
      currentUom: null,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        form.reset({
          name: tank.name,
          capacity: tank.capacity,
          location: tank.location,
          status: tank.status,
          currentBatchId: tank.currentBatchId || null,
          currentQuantity: tank.currentQuantity || null,
          currentUom: tank.currentUom || null,
        });
      } else {
        form.reset({
          name: "",
          capacity: 1000,
          location: "Zona de Mezcla",
          status: 'Libre',
          currentBatchId: null,
          currentQuantity: null,
          currentUom: null,
        });
      }
    }
  }, [isOpen, tank, isEditMode, form]);

  const onSubmit = async (data: TankFormValues) => {
    setIsSaving(true);
    await onSave(data, tank?.id);
    setIsSaving(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Tanque" : "Añadir Nuevo Tanque"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? `Modifica los detalles del tanque ${tank.name}.` : "Introduce los detalles del nuevo tanque de producción."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre del Tanque</FormLabel><FormControl><Input placeholder="Ej: Tanque de Mezcla 3" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="capacity" render={({ field }) => (<FormItem><FormLabel>Capacidad (L)</FormLabel><FormControl><Input type="number" placeholder="Ej: 1000" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormLabel>Ubicación</FormLabel><FormControl><Input placeholder="Ej: Zona de Mezcla" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            {isEditMode && (
              <>
                <Separator />
                <h3 className="font-semibold text-muted-foreground pt-2 text-sm">Estado Manual</h3>
                <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Estado</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{tankStatusList.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="currentBatchId" render={({ field }) => (<FormItem><FormLabel>Lote Actual (Opcional)</FormLabel><FormControl><Input placeholder="ID del lote" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="currentQuantity" render={({ field }) => (<FormItem><FormLabel>Cantidad Actual (L)</FormLabel><FormControl><Input type="number" step="any" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="currentUom" render={({ field }) => (<FormItem><FormLabel>UoM</FormLabel><Select onValueChange={field.onChange} value={field.value ?? undefined}><FormControl><SelectTrigger><SelectValue placeholder="Unidad"/></SelectTrigger></FormControl><SelectContent>{uomList.map(u => (<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
              </>
            )}

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                ) : (
                  isEditMode ? "Guardar Cambios" : "Crear Tanque"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
