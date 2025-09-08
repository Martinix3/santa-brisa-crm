
"use client";

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { addPurchaseFS, updatePurchaseFS } from "@/services/purchase-service";
import { getInventoryItemsFS } from "@/services/inventory-item-service";
import { getSuppliersFS } from "@/services/supplier-service";
import { parseISO } from "date-fns";
import { purchaseFormSchema, type PurchaseFormValues } from "@/lib/schemas/purchase-schema";
import { useCategories } from "@/contexts/categories-context";
import { StepGeneral } from './purchases/step-general';
import { StepDetails } from './purchases/step-details';
import { StepInvoice } from './purchases/step-invoice';
import type { InventoryItem, Supplier, Expense } from '@/types';

type Step = 'general' | 'details' | 'invoice';

interface ExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Partial<Expense> | null;
}

export function ExpenseDialog({ isOpen, onOpenChange, expense }: ExpenseDialogProps) {
  const { toast } = useToast();
  const { user, refreshDataSignature } = useAuth();
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [step, setStep] = React.useState<Step>('general');

  const { inventoryCategories, costCategories } = useCategories();
  const isEditMode = !!expense?.id;

  const formMethods = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    mode: "onChange",
    defaultValues: {
      isInventoryPurchase: false,
      estadoDocumento: 'proforma',
      estadoPago: 'pendiente',
      items: [],
    },
  });
  
  const { watch, reset, trigger, handleSubmit } = formMethods;
  const isInventoryPurchase = watch("isInventoryPurchase");

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
        reset({
            ...(expense as any),
            monto: expense.monto ?? undefined,
            isInventoryPurchase: categoryOfExpense?.kind === 'inventory',
            gastosEnvio: expense.gastosEnvio ?? undefined,
            impuestos: expense.impuestos ?? undefined,
            fechaEmision: expense.fechaEmision ? parseISO(expense.fechaEmision) : new Date(),
            fechaVencimiento: expense.fechaVencimiento ? parseISO(expense.fechaVencimiento) : undefined,
        });
      } else {
        reset({
            isInventoryPurchase: false,
            estadoDocumento: 'proforma',
            estadoPago: 'pendiente',
            items: [],
        });
      }
      setStep('general');
    }
  }, [isOpen, expense, reset, inventoryCategories, costCategories]);
  
  React.useEffect(() => {
    const isInv = watch("categoriaId") ? inventoryCategories.some(c => c.id === watch("categoriaId")) : false;
    if (watch('isInventoryPurchase') !== isInv) {
        formMethods.setValue('isInventoryPurchase', isInv);
    }
  }, [watch('categoriaId'), inventoryCategories, watch, formMethods]);
  
  const handleNext = async () => {
    let fieldsToValidate: (keyof PurchaseFormValues)[] = [];
    if (step === 'general') {
        fieldsToValidate = ['categoriaId', 'concepto', 'proveedorId', 'proveedorNombre'];
        if (!isInventoryPurchase) fieldsToValidate.push('monto');
    } else if (step === 'details' && isInventoryPurchase) {
        fieldsToValidate = ['items'];
    }
    
    const isValid = await trigger(fieldsToValidate);
    if(isValid) {
        if(step === 'general') setStep(isInventoryPurchase ? 'details' : 'invoice');
        else if(step === 'details') setStep('invoice');
    }
  };

  const handleBack = () => {
    if(step === 'invoice') setStep(isInventoryPurchase ? 'details' : 'general');
    else if(step === 'details') setStep('general');
  };

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
      <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Gasto/Compra" : "Registrar Gasto o Compra"}</DialogTitle>
          <DialogDescription>Completa los detalles. Los campos se adaptarán según tus selecciones.</DialogDescription>
        </DialogHeader>
        {isLoading ? <Loader2 className="animate-spin m-auto" /> : (
            <FormProvider {...formMethods}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                {step === 'general' && <StepGeneral suppliers={suppliers} />}
                {step === 'details' && <StepDetails inventoryItems={inventoryItems} />}
                {step === 'invoice' && <StepInvoice />}

                <DialogFooter className="pt-4 flex justify-between w-full">
                    <div>
                        {step !== 'general' && <Button type="button" variant="ghost" onClick={handleBack} disabled={isSaving}><ArrowLeft className="mr-2 h-4 w-4"/> Volver</Button>}
                    </div>
                    <div className="flex gap-2">
                        <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button></DialogClose>
                        {step === 'invoice' || (step === 'general' && !isInventoryPurchase) ? (
                            <Button type="submit" disabled={isSaving || isLoading}><>{isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Guardando...</>) : "Guardar Registro"}</></Button>
                        ) : (
                            <Button type="button" onClick={handleNext} disabled={isSaving}>Siguiente <ArrowRight className="ml-2 h-4 w-4"/></Button>
                        )}
                    </div>
                </DialogFooter>
              </form>
            </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
