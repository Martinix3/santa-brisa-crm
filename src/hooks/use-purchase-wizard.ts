
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useCategories } from "@/contexts/categories-context";
import { addPurchaseFS, updatePurchaseFS } from "@/services/purchase-service";
import { getInventoryItemsFS } from "@/services/inventory-item-service";
import { getSuppliersFS } from "@/services/supplier-service";
import type { Expense, InventoryItem, Supplier } from "@/types";
import { purchaseFormSchema, type PurchaseFormValues } from "@/lib/schemas/purchase-schema";
import { parseISO, isValid } from "date-fns";
import { Timestamp } from "firebase/firestore";

interface UsePurchaseWizardProps {
  isOpen: boolean;
  expense?: Partial<Expense> | null;
}

const safeParseDate = (date: any): Date | undefined => {
  if (!date) return undefined;
  if (date instanceof Timestamp) return date.toDate();
  if (date instanceof Date && isValid(date)) return date;
  if (typeof date === 'string') {
    const parsed = parseISO(date);
    if (isValid(parsed)) return parsed;
  }
  if (typeof date === 'object' && date.seconds !== undefined && date.nanoseconds !== undefined) {
      const ts = new Timestamp(date.seconds, date.nanoseconds);
      return ts.toDate();
  }
  const directParsed = new Date(date);
  if(isValid(directParsed)) return directParsed;
  return undefined;
};


export function usePurchaseWizard({ isOpen, expense }: UsePurchaseWizardProps) {
  const { toast } = useToast();
  const { user, refreshDataSignature } = useAuth();
  const { isLoading: isLoadingCategories } = useCategories();
  
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [activeStep, setActiveStep] = React.useState(0);

  const isEditMode = !!expense?.id;
  const isLoading = isLoadingData || isLoadingCategories;

  const methods = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    mode: 'onChange',
    defaultValues: {
      categoriaId: "",
      isInventoryPurchase: false,
      estadoDocumento: 'proforma',
      estadoPago: 'pendiente',
      concepto: "",
      monto: undefined,
      fechaEmision: new Date(),
      fechaVencimiento: undefined,
      items: [],
      proveedorId: "",
      proveedorNombre: "",
      proveedorCif: "",
      invoiceNumber: "",
      notes: "",
      gastosEnvio: undefined,
      impuestos: undefined,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      setActiveStep(0);
      setIsLoadingData(true);
      Promise.all([getInventoryItemsFS(), getSuppliersFS()])
        .then(([items, sups]) => {
          setInventoryItems(items);
          setSuppliers(sups);
        })
        .finally(() => setIsLoadingData(false));
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen && !isLoading) {
      if (expense) {
        const itemsWithDateObjects = (expense.items || []).map(item => ({
            ...item,
            caducidad: safeParseDate(item.caducidad),
        }));
        methods.reset({
            ...(expense as any),
            monto: expense.monto ?? undefined,
            gastosEnvio: expense.gastosEnvio ?? undefined,
            impuestos: expense.impuestos ?? undefined,
            isInventoryPurchase: expense.isInventoryPurchase ?? false,
            fechaEmision: safeParseDate(expense.fechaEmision) || new Date(),
            fechaVencimiento: safeParseDate(expense.fechaVencimiento),
            proveedorId: expense.proveedorId || "",
            items: itemsWithDateObjects,
        });
      } else {
        methods.reset({
            categoriaId: "",
            isInventoryPurchase: false,
            estadoDocumento: 'proforma',
            estadoPago: 'pendiente',
            concepto: "",
            monto: undefined,
            fechaEmision: new Date(),
            items: [],
            proveedorId: "",
            proveedorNombre: ""
        });
      }
    }
  }, [isOpen, expense, isLoading, methods]);

  const steps = [
    { name: "Datos Básicos", fields: ['categoriaId', 'concepto', 'fechaEmision', 'estadoDocumento', 'estadoPago', 'monto', 'invoiceNumber'] },
    { name: "Detalles de Artículos", fields: ['isInventoryPurchase', 'items', 'gastosEnvio', 'impuestos'] },
    { name: "Proveedor y Revisión", fields: ['proveedorId', 'proveedorNombre', 'proveedorCif'] },
  ];

  const handleNext = async () => {
    const fieldsToValidate = steps[activeStep].fields;
    const isValid = await methods.trigger(fieldsToValidate as any, { shouldFocus: true });
    if (isValid) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => setActiveStep(prev => prev - 1);

  const onSubmit = async (data: PurchaseFormValues) => {
    if (!user) return;
    setIsSaving(true);
    
    // Calculate final amount if it's an inventory purchase
    let finalData = { ...data };
    if (data.isInventoryPurchase) {
        const subtotal = data.items?.reduce((acc, item) => acc + (item.cantidad || 0) * (item.costeUnitario || 0), 0) || 0;
        const tax = Number(data.impuestos) || 0;
        const shipping = Number(data.gastosEnvio) || 0;
        finalData.monto = subtotal + tax + shipping;
    }

    try {
      if (isEditMode && expense?.id) {
        await updatePurchaseFS(expense.id, finalData);
        toast({ title: "Registro Actualizado" });
      } else {
        await addPurchaseFS(finalData, user.uid);
        toast({ title: "Registro Creado" });
      }
      refreshDataSignature();
    } catch (error: any) {
      toast({ title: "Error al Guardar", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return {
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
  };
}
