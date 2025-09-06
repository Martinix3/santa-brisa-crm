
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FormProvider } from 'react-hook-form';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { InteractionHeader } from '@/components/app/interaction-dialog/header';
import { CompactForm } from '@/components/app/interaction-dialog/compact-form';
import { OrderForm } from '@/components/app/interaction-dialog/order-form';
import { cn } from '@/lib/utils';
import type { Account, Order } from '@/types';
import { useInteractionWizard } from '@/hooks/use-interaction-wizard';
import { Loader2 } from 'lucide-react';

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

  const wizard = useInteractionWizard(client, originatingTask, () => onOpenChange(false));

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
    distributorAccounts,
  } = wizard;

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setMode('compact');
        form.reset();
      }, 200); 
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
        onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
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
        )}
      </DialogContent>
    </Dialog>
  );
}
