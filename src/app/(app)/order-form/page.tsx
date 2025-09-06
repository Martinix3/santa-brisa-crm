
"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Form } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useOrderFormWizard } from "@/hooks/use-order-form-wizard";
import { StepClient } from "@/components/app/order-form/step-client";
import { StepOutcome } from "@/components/app/order-form/step-outcome";
import { StepDetails } from "@/components/app/order-form/step-details";
import { StepVerify } from "@/components/app/order-form/step-verify";

export default function OrderFormPage() {
  const wizard = useOrderFormWizard();

  const {
    form,
    step,
    setStep,
    handleBack,
    handleNextStep,
    isSubmitting,
    isLoading,
    client,
    originatingTask,
    onFormError,
    onSubmit
  } = wizard;

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Cargando datos del formulario...</p>
        </div>
    );
  }
  
  const renderStepContent = () => {
    switch (step) {
      case "client":
        return (
          <motion.div key="client" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <StepClient {...wizard} />
          </motion.div>
        );
      case "outcome":
        return (
          <motion.div key="outcome" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <StepOutcome {...wizard} />
          </motion.div>
        );
      case "details":
        return (
          <motion.div key="details" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <StepDetails {...wizard} />
          </motion.div>
        );
       case "verify":
        return (
          <motion.div key="verify" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <StepVerify {...wizard} />
          </motion.div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onFormError)}>
          <Card className="max-w-3xl mx-auto shadow-lg mt-6 overflow-hidden">
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>
          </Card>
        </form>
      </Form>
    </div>
  );
}
