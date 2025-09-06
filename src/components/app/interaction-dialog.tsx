"use client";

import * as React from "react";
import { FormProvider } from "react-hook-form";
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
import { Loader2 } from "lucide-react";
import type { Account, Order } from "@/types";
import { useOrderFormWizard } from "@/hooks/use-order-form-wizard";
import { StepOutcome } from "@/components/app/order-form/step-outcome";
import { StepDetails } from "@/components/app/order-form/step-details";
import { StepVerify } from "@/components/app/order-form/step-verify";

interface InteractionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  client: Account | null;
  originatingTask?: Order | null;
}

export function InteractionDialog({ isOpen, onOpenChange, client, originatingTask = null }: InteractionDialogProps) {
  const wizard = useOrderFormWizard(client, originatingTask);
  const { form, onSubmit, isLoading } = wizard;
  const isSubmitting = form.formState.isSubmitting;

  const handleClose = () => onOpenChange(false);
  
  const handleFinalSubmit = async (values: any) => {
    await onSubmit(values);
    handleClose();
  };

  const stopAndPreventSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    form.handleSubmit(handleFinalSubmit)();
  };

  const [activeStep, setActiveStep] = React.useState<'outcome' | 'details' | 'verify'>('outcome');

  React.useEffect(() => {
    if (isOpen) {
        setActiveStep(originatingTask ? 'outcome' : 'details');
    }
  }, [isOpen, originatingTask]);

  const renderStepContent = () => {
    switch (activeStep) {
      case "outcome": return <StepOutcome setStep={setActiveStep} />;
      case "details": return <StepDetails {...wizard} handleBack={() => setActiveStep('outcome')} handleNextStep={() => setActiveStep('verify')} />;
      case "verify": return <StepVerify {...wizard} handleBack={() => setActiveStep('details')} />;
      default: return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Registrar Interacción para: {client?.nombre}</DialogTitle>
          <DialogDescription>
            {originatingTask ? `Resultado de la tarea: "${originatingTask.notes}"` : "Nueva interacción."}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
        ) : (
          <FormProvider {...form}>
            <form onSubmit={stopAndPreventSubmit} className="flex-grow flex flex-col min-h-0">
              <div className="flex-grow overflow-y-auto pr-2">
                {renderStepContent()}
              </div>
            </form>
          </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}