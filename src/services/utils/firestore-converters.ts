

import { Timestamp, type DocumentSnapshot } from "firebase/firestore";
import { format, parseISO, isValid } from "date-fns";
import type { Purchase, PurchaseFormValues, PurchaseFirestorePayload, Supplier, SupplierFormValues, BomLine, ProductionRun, DirectSaleWithExtras, DirectSale } from '@/types';

// --- PURCHASE CONVERTERS ---

export const fromFirestorePurchase = (docSnap: DocumentSnapshot): Purchase => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  return {
    id: docSnap.id,
    supplier: data.supplier || '',
    supplierId: data.supplierId || undefined,
    costCenterIds: data.costCenterIds || [],
    currency: data.currency || 'EUR',
    items: data.items?.map((item: any) => ({ 
        materialId: item.materialId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        batchNumber: item.batchNumber || undefined,
        categoryId: item.categoryId,
        total: item.total
    })) || [],
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

export const toFirestorePurchase = (data: Partial<PurchaseFormValues>, isNew: boolean, supplierId?: string | null): PurchaseFirestorePayload => {
  const subtotal = data.items?.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0) || 0;
  const shippingCost = data.shippingCost || 0;
  const subtotalWithShipping = subtotal + shippingCost;
  const taxRate = data.taxRate !== undefined ? data.taxRate : 21;
  const tax = subtotalWithShipping * (taxRate / 100);
  const totalAmount = subtotalWithShipping + tax;

  const firestoreData: PurchaseFirestorePayload = {
    supplier: data.supplier!,
    supplierId: supplierId || null,
    costCenterIds: data.costCenterIds || [],
    currency: data.currency || 'EUR',
    orderDate: data.orderDate instanceof Date && isValid(data.orderDate) ? Timestamp.fromDate(data.orderDate) : Timestamp.fromDate(new Date()),
    status: data.status!,
    items: data.items?.map(item => ({ 
        materialId: item.materialId || null,
        description: item.description, 
        quantity: item.quantity || 0, 
        unitPrice: item.unitPrice || 0,
        batchNumber: item.batchNumber || null,
        total: (item.quantity || 0) * (item.unitPrice || 0),
        categoryId: item.categoryId,
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
    updatedAt: Timestamp.fromDate(new Date()),
  };
  
  if (isNew) {
    firestoreData.createdAt = Timestamp.fromDate(new Date());
    firestoreData.batchesSeeded = false;
  }

  return firestoreData;
};


// --- SUPPLIER CONVERTERS ---

export const fromFirestoreSupplier = (docSnap: DocumentSnapshot): Supplier => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");
  return {
    id: docSnap.id,
    name: data.name || '',
    cif: data.cif,
    address: data.address,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    notes: data.notes,
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
  };
};

export const toFirestoreSupplier = (data: Partial<SupplierFormValues>, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = {
    name: data.name,
    cif: data.cif || null,
    contactName: data.contactName || null,
    contactEmail: data.contactEmail || null,
    contactPhone: data.contactPhone || null,
    notes: data.notes || null,
  };

  if (data.address_street || data.address_city || data.address_province || data.address_postalCode) {
    firestoreData.address = {
      street: data.address_street || null,
      number: data.address_number || null,
      city: data.address_city || null,
      province: data.address_province || null,
      postalCode: data.address_postalCode || null,
      country: data.address_country || "España",
    };
    Object.keys(firestoreData.address).forEach(key => {
      if (firestoreData.address[key as keyof typeof firestoreData.address] === undefined) {
        firestoreData.address[key as keyof typeof firestoreData.address] = null;
      }
    });
  } else {
    firestoreData.address = null;
  }

  if (isNew) {
    firestoreData.createdAt = Timestamp.fromDate(new Date());
  }
  firestoreData.updatedAt = Timestamp.fromDate(new Date());
  
  return firestoreData;
};


// --- BOM LINE CONVERTER ---

export const fromFirestoreBomLine = (snapshot: DocumentSnapshot): BomLine => {
  const data = snapshot.data();
  if (!data) throw new Error("BOM Line data is undefined.");
  return {
    id: snapshot.id,
    productSku: data.productSku,
    componentId: data.componentId,
    componentName: data.componentName,
    componentSku: data.componentSku,
    quantity: data.quantity,
    uom: data.uom,
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : undefined,
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : undefined,
  };
};

// --- PRODUCTION RUN CONVERTER ---
export const fromFirestoreProductionRun = (snapshot: DocumentSnapshot): ProductionRun => {
  const data = snapshot.data();
  if (!data) throw new Error("Production run data is undefined.");
  return {
    id: snapshot.id,
    productSku: data.productSku,
    productName: data.productName,
    batchNumber: data.batchNumber,
    outputBatchId: data.outputBatchId,
    qtyPlanned: data.qtyPlanned,
    qtyProduced: data.qtyProduced,
    status: data.status,
    startDate: data.startDate instanceof Timestamp ? format(data.startDate.toDate(), "yyyy-MM-dd") : new Date().toISOString(),
    endDate: data.endDate instanceof Timestamp ? format(data.endDate.toDate(), "yyyy-MM-dd") : undefined,
    unitCost: data.unitCost,
    consumedComponents: data.consumedComponents || [],
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : undefined,
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : undefined,
  };
};

// --- DIRECT SALE CONVERTER ---

export const fromFirestoreDirectSale = (docSnap: DocumentSnapshot): DirectSale => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  return {
    id: docSnap.id,
    customerId: data.customerId || '',
    customerName: data.customerName || '',
    channel: data.channel || 'Otro',
    items: data.items || [],
    subtotal: data.subtotal || 0,
    tax: data.tax || 0,
    totalAmount: data.totalAmount || 0,
    issueDate: data.issueDate instanceof Timestamp ? format(data.issueDate.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    dueDate: data.dueDate instanceof Timestamp ? format(data.dueDate.toDate(), "yyyy-MM-dd") : undefined,
    invoiceNumber: data.invoiceNumber || undefined,
    status: data.status || 'Borrador',
    relatedPlacementOrders: data.relatedPlacementOrders || [],
    notes: data.notes || undefined,
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
  };
};

export const toFirestoreDirectSale = (data: Partial<DirectSaleWithExtras>, isNew: boolean): any => {
  const subtotal = data.items?.reduce((sum, item) => sum + (item.quantity || 0) * (item.netUnitPrice || 0), 0) || 0;
  const tax = subtotal * 0.21;
  const totalAmount = subtotal + tax;

  const firestoreData: { [key: string]: any } = {
      customerId: data.customerId || null,
      customerName: data.customerName,
      channel: data.channel,
      items: data.items?.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          netUnitPrice: item.netUnitPrice,
          total: (item.quantity || 0) * (item.netUnitPrice || 0),
          batchId: item.batchId,
          batchNumber: item.batchNumber || null
      })) || [],
      subtotal,
      tax,
      totalAmount,
      status: data.status,
      invoiceNumber: data.invoiceNumber || null,
      relatedPlacementOrders: data.relatedPlacementOrders ? data.relatedPlacementOrders.split(',').map(s => s.trim()) : [],
      notes: data.notes || null,
  };
  
  if (data.issueDate && isValid(data.issueDate)) {
    firestoreData.issueDate = Timestamp.fromDate(data.issueDate);
  } else {
    firestoreData.issueDate = Timestamp.fromDate(new Date());
  }

  if (data.dueDate && isValid(data.dueDate)) {
    firestoreData.dueDate = Timestamp.fromDate(data.dueDate);
  } else {
    firestoreData.dueDate = null;
  }

  if (isNew) {
    firestoreData.createdAt = Timestamp.fromDate(new Date());
  }
  firestoreData.updatedAt = Timestamp.fromDate(new Date());
  
  Object.keys(firestoreData).forEach(key => {
    if (firestoreData[key] === undefined) {
      firestoreData[key] = null;
    }
  });

  return firestoreData;
};
