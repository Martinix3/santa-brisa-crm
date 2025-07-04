
import { Timestamp, type DocumentSnapshot } from "firebase/firestore";
import { format, parseISO, isValid } from "date-fns";
import type { Purchase, PurchaseFormValues, PurchaseFirestorePayload } from '@/types';

// --- PURCHASE CONVERTERS ---

export const fromFirestorePurchase = (docSnap: DocumentSnapshot): Purchase => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  return {
    id: docSnap.id,
    supplier: data.supplier || '',
    supplierId: data.supplierId || undefined,
    categoryId: data.categoryId,
    costCenterIds: data.costCenterIds || [],
    currency: data.currency || 'EUR',
    items: data.items?.map((item: any) => ({ ...item, batchNumber: item.batchNumber || undefined })) || [],
    subtotal: data.subtotal || 0,
    tax: data.tax || 0,
    taxRate: data.taxRate ?? 21,
    shippingCost: data.shippingCost,
    totalAmount: data.totalAmount || 0,
    orderDate: data.orderDate instanceof Timestamp ? format(data.orderDate.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    status: data.status || 'Borrador',
    invoiceUrl: data.invoiceUrl || undefined,
    invoiceContentType: data.invoiceContentType || undefined,
    storagePath: data.storagePath || undefined,
    notes: data.notes || undefined,
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    batchesSeeded: data.batchesSeeded || false,
  };
};

export const toFirestorePurchase = (data: Partial<PurchaseFormValues>, isNew: boolean, supplierId?: string): PurchaseFirestorePayload => {
  const subtotal = data.items?.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0) || 0;
  const shippingCost = data.shippingCost || 0;
  const subtotalWithShipping = subtotal + shippingCost;
  const taxRate = data.taxRate !== undefined ? data.taxRate : 21;
  const tax = subtotalWithShipping * (taxRate / 100);
  const totalAmount = subtotalWithShipping + tax;

  const firestoreData: PurchaseFirestorePayload = {
    supplier: data.supplier!,
    categoryId: data.categoryId!,
    costCenterIds: data.costCenterIds || [],
    currency: data.currency || 'EUR',
    orderDate: data.orderDate instanceof Date && isValid(data.orderDate) ? Timestamp.fromDate(data.orderDate) : Timestamp.fromDate(new Date()),
    status: data.status!,
    items: data.items?.map(item => ({ 
        materialId: item.materialId, 
        description: item.description, 
        quantity: item.quantity || 0, 
        unitPrice: item.unitPrice || 0,
        batchNumber: item.batchNumber || null,
        total: (item.quantity || 0) * (item.unitPrice || 0) 
    })) || [],
    subtotal,
    tax,
    taxRate,
    shippingCost,
    totalAmount,
    notes: data.notes || null,
    invoiceUrl: data.invoiceUrl || null,
    invoiceContentType: data.invoiceContentType || null,
    storagePath: data.storagePath || null,
    supplierId: supplierId || null,
    updatedAt: Timestamp.fromDate(new Date()),
  };
  
  if (isNew) {
    firestoreData.createdAt = Timestamp.fromDate(new Date());
    firestoreData.batchesSeeded = false;
  }

  return firestoreData;
};
