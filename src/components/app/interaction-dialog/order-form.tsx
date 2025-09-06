
"use client";

import * as React from 'react';
import { useFormContext, useWatch, useFieldArray } from 'react-hook-form';
import { CardContent, CardFooter } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Send } from "lucide-react";
import type { OrderFormValues } from '@/lib/schemas/order-form-schema';
import type { InventoryItem, TeamMember, UserRole, Account } from '@/types';
import { StepDetails } from '../order-form/step-details';

interface OrderFormProps {
  onBack: () => void;
  onClose: () => void;
  isSubmitting: boolean;
  availableMaterials: InventoryItem[];
  materialFields: any[];
  appendMaterial: any;
  removeMaterial: any;
  userRole: UserRole | null;
  salesRepsList: TeamMember[];
  clavadistas: TeamMember[];
  distributorAccounts: Account[];
}

export function OrderForm({ 
    onBack, 
    onClose, 
    isSubmitting, 
    ...props 
}: OrderFormProps) {
    const form = useFormContext<OrderFormValues>();
    
    return (
        <div className="p-6">
            <StepDetails form={form} handleBack={onBack} handleNextStep={()=>{}} {...props} />
             <DialogFooter className="pt-6 flex justify-between sm:justify-between w-full">
                <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Confirmar Pedido
                </Button>
            </DialogFooter>
        </div>
    );
}
