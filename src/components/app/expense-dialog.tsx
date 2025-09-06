"use client";

import * as React from "react";
import { useForm, useWatch, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, PlusCircle, Trash2, FileText, Calendar as CalendarIcon, Wallet, Warehouse, Building, Repeat, FileUp, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useCategories } from "@/contexts/categories-context";
import type { InventoryItem, Supplier, Expense } from "@/types";
import { addPurchaseFS, updatePurchaseFS } from "@/services/purchase-service";
import { getInventoryItemsFS } from "@/services/inventory-item-service";
import { getSuppliersFS } from "@/services/supplier-service";
import { parseISO } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { purchaseFormSchema, type PurchaseFormValues } from "@/lib/schemas/purchase-schema";

const NEW_ITEM_SENTINEL = '##NEW##';

interface ExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Partial<Expense> | null;
}

export function ExpenseDialog({ isOpen, onOpenChange, expense }: ExpenseDialogProps) {
  const { toast } = useToast();
  const { user, refreshDataSignature } = useAuth();
  const { inventoryCategories, costCategories } = useCategories();
  
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const isEditMode = !!expense?.id;

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      categoriaId: undefined,
      isInventoryPurchase: false,
      estadoDocumento: 'proforma',
      estadoPago: 'pendiente',
      concepto: "",
      monto: undefined,
      fechaEmision: new Date(),
      items: [],
      proveedorNombre: ""
    },
  });
  
  const { control, watch, setValue } = form;
  const watchedIsInventory = watch("isInventoryPurchase");
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  React.useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      Promise.all([getInventoryItemsFS(), getSuppliersFS()])
        .then(([items, sups]) => {
          setInventoryItems(items);
          setSuppliers(sups);
        })
        .finally(() => setIsLoading(false));
      
      const allKnownCategories = [...inventoryCategories, ...costCategories];
      
      if(expense) {
        const categoryOfExpense = allKnownCategories.find(c => c.id === expense.categoriaId);
        form.reset({
            ...(expense as any),
            monto: expense.monto ?? undefined,
            isInventoryPurchase: categoryOfExpense?.kind === 'inventory',
            gastosEnvio: expense.gastosEnvio ?? undefined,
            impuestos: expense.impuestos ?? undefined,
            fechaEmision: expense.fechaEmision ? parseISO(expense.fechaEmision) : new Date(),
            fechaVencimiento: expense.fechaVencimiento ? parseISO(expense.fechaVencimiento) : undefined,
        });
      } else {
        form.reset({
            categoriaId: undefined,
            isInventoryPurchase: false,
            estadoDocumento: 'proforma',
            estadoPago: 'pendiente',
            concepto: "",
            monto: undefined,
            fechaEmision: new Date(),
            items: [],
            proveedorNombre: ""
        });
      }
    }
  }, [isOpen, expense, form, inventoryCategories, costCategories]);

  const onSubmit = async (data: PurchaseFormValues) => {
    if (!user) return;
    setIsSaving(true);
    try {
        if (isEditMode && expense?.id) {
            await updatePurchaseFS(expense.id, data);
            toast({ title: "Registro Actualizado" });
        } else {
            await addPurchaseFS(data, user.uid);
            toast({ title: "Registro Creado" });
        }
        refreshDataSignature();
        onOpenChange(false);
    } catch (error: any) {
        toast({ title: "Error al Guardar", description: error.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Gasto/Compra" : "Registrar Gasto o Compra"}</DialogTitle>
          <DialogDescription>Completa los detalles. Los campos se adaptarán según tus selecciones.</DialogDescription>
        </DialogHeader>
        {isLoading ? <Loader2 className="animate-spin" /> : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Separator />
                <h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5 text-primary"/>Información General</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={control} name="categoriaId" render={({ field }) => (<FormItem><FormLabel>Categoría *</FormLabel><Select onValueChange={(value) => { const cat = [...inventoryCategories, ...costCategories].find(c => c.id === value); field.onChange(value); setValue('isInventoryPurchase', cat?.kind === 'inventory'); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={'Selecciona una categoría...'} /></SelectTrigger></FormControl><SelectContent>{costCategories.length > 0 && <SelectGroup><FormLabel className="px-2 text-xs text-muted-foreground">Gastos Generales</FormLabel>{costCategories.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}</SelectGroup>}{inventoryCategories.length > 0 && <SelectGroup><FormLabel className="px-2 text-xs text-muted-foreground">Compras de Inventario</FormLabel>{inventoryCategories.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}</SelectGroup>}</SelectContent></Select><FormMessage /></FormItem>)}/>
                  <FormField control={form.control} name="concepto" render={({ field }) => (<FormItem><FormLabel>Concepto *</FormLabel><FormControl><Input placeholder="Ej: Compra de botellas, Licencia Adobe" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                </div>
                
                <DialogFooter className="pt-4">
                  <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button></DialogClose>
                  <Button type="submit" disabled={isSaving || isLoading}><>{isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Guardando...</>) : "Guardar Registro"}</></Button>
                </DialogFooter>
              </form>
            </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
