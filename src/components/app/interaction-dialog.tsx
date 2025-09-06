
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { InteractionHeader } from '@/components/app/interaction-dialog/header';
import { CompactForm } from '@/components/app/interaction-dialog/compact-form';
import { OrderForm } from '@/components/app/interaction-dialog/order-form';
import { cn } from '@/lib/utils';
import type { Account, Order } from '@/types';
import { interactionFormSchema, type InteractionFormValues } from '@/lib/schemas/interaction-schema';
import { useInteractionWizard } from '@/hooks/use-interaction-wizard';

export type InteractionMode = 'compact' | 'order';

export function InteractionDialog({
  open,
  onOpenChange,
  client,
  originatingTask
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: Account | null;
  originatingTask: Order | null;
}) {
  const [mode, setMode] = useState<InteractionMode>('compact');

  const {
    form,
    onSubmit,
    isLoading,
    isSubmitting,
    availableMaterials,
    materialFields,
    appendMaterial,
    removeMaterial,
    userRole,
    salesRepsList,
    clavadistas,
    distributorAccounts
  } = useInteractionWizard(client, originatingTask);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setMode('compact');
        form.reset();
      }, 300); // Reset after closing animation
    }
  }, [open, form]);

  const contentSize = mode === 'compact'
    ? 'sm:max-w-lg'
    : 'sm:max-w-4xl';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'w-full p-0 border transition-[max-width] duration-300 ease-in-out',
          contentSize
        )}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <motion.div layout transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}>
                    <InteractionHeader mode={mode} />
                    {mode === 'compact' ? (
                        <CompactForm
                            onGoOrder={() => setMode('order')}
                            onClose={() => onOpenChange(false)}
                            isSubmitting={isSubmitting}
                        />
                    ) : (
                        <OrderForm
                            onBack={() => setMode('compact')}
                            onClose={() => onOpenChange(false)}
                            isSubmitting={isSubmitting}
                            availableMaterials={availableMaterials}
                            materialFields={materialFields}
                            appendMaterial={appendMaterial}
                            removeMaterial={removeMaterial}
                            userRole={userRole}
                            salesRepsList={salesRepsList}
                            clavadistas={clavadistas}
                            distributorAccounts={distributorAccounts}
                        />
                    )}
                </motion.div>
            </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
