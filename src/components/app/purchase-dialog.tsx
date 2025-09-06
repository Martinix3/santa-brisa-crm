
"use client";

import * as React from "react";
import { FormProvider } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, ArrowRight, Save } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import type { Expense } from "@/types";
import { usePurchaseWizard } from "@/hooks/use-purchase-wizard";

// Import Step Components
import { StepBasicInfo } from "@/components/app/purchases/step-basic-info";
import { StepDetails } from "@/components/app/purchases/step-details";
import { StepSupplier } from "@/components/app/purchases/step-supplier";

interface PurchaseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Partial<Expense> | null;
}

export function PurchaseDialog({ isOpen, onOpenChange, expense }: PurchaseDialogProps) {
  const { toast } = useToast();
  const wizard = usePurchaseWizard({ isOpen, expense });
  
  const { 
    methods, 
    activeStep, 
    handleBack, 
    handleNext, 
    onSubmit, 
    isLoading, 
    isSaving,
    steps,
    inventoryItems,
    suppliers
  } = wizard;
  
  const isEditMode = !!expense?.id;

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleFinalSubmit = async (values: any) => {
    await onSubmit(values);
    handleClose();
  };
  
  const stopAndPreventSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeStep < steps.length - 1) {
      handleNext();
    } else {
      methods.handleSubmit(handleFinalSubmit)();
    }
  };


  const renderStepContent = () => {
    switch(activeStep) {
        case 0: return <StepBasicInfo />;
        case 1: return <StepDetails allItems={inventoryItems} />;
        case 2: return <StepSupplier allSuppliers={suppliers} />;
        default: return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Gasto/Compra" : "Registrar Gasto o Compra"}</DialogTitle>
          <DialogDescription>
             {steps[activeStep]?.name}: {isEditMode ? `Editando registro ${expense?.id?.substring(0,8)}...` : `Paso ${activeStep + 1} de ${steps.length}`}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
        ) : (
            <FormProvider {...methods}>
              <form onSubmit={stopAndPreventSubmit} className="flex-grow flex flex-col min-h-0">
                 <div className="flex-grow overflow-y-auto pr-2">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeStep}
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -50, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {renderStepContent()}
                        </motion.div>
                    </AnimatePresence>
                 </div>
                <DialogFooter className="pt-4 border-t mt-4 flex-shrink-0">
                  <DialogClose asChild>
                    <Button type="button" variant="ghost" onClick={handleClose} disabled={isSaving}>Cerrar</Button>
                  </DialogClose>
                  <div className="flex-grow" />
                  {activeStep > 0 && (
                    <Button type="button" variant="outline" onClick={handleBack} disabled={isSaving}>
                      <ArrowLeft className="mr-2 h-4 w-4"/> Volver
                    </Button>
                  )}
                  {activeStep < steps.length - 1 ? (
                    <Button type="submit">
                      Siguiente <ArrowRight className="ml-2 h-4 w-4"/>
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Guardando...</> : <><Save className="mr-2 h-4 w-4"/> Finalizar y Guardar</>}
                    </Button>
                  )}
                </DialogFooter>
              </form>
            </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
