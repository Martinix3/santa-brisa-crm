
"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Form } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useOrderWizard } from "@/hooks/use-order-form-wizard";

// Step Components
import { StepClient } from "@/components/app/order-form/step-client";
import { StepOutcome } from "@/components/app/order-form/step-outcome";
import { StepDetails } from "@/components/app/order-form/step-details";
import { StepNewClientData } from "@/components/app/order-form/step-new-client-data";
import { StepVerify } from "@/components/app/order-form/step-verify";


export default function OrderFormWizardPage() {
  const wizard = useOrderWizard();
  const { form, step, client, handleBack, isSubmitting, availableMaterials, teamMember, userRole, onSubmit } = wizard;

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
      case "new_client_data":
        return (
          <motion.div key="new_client_data" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <StepNewClientData {...wizard} />
          </motion.div>
        );
       case "verify":
        return (
          <motion.div key="verify" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <StepVerify
                form={form}
                client={client}
                handleBack={handleBack}
                isSubmitting={isSubmitting}
                availableMaterials={availableMaterials}
                teamMember={teamMember}
                userRole={userRole}
                onSubmit={onSubmit}
            />
          </motion.div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
        <FileText className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Registrar Interacción</h1>
      </header>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(wizard.onSubmit)}>
          <Card className="max-w-4xl mx-auto shadow-lg mt-6 overflow-hidden">
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>
          </Card>
        </form>
      </Form>
    </div>
  );
}
