

import { Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { format, parseISO, isValid } from "date-fns";
import type { Order, TeamMember, CrmEvent, Account, Supplier, Expense, BomLine, ItemBatch, Tank, DirectSale, DirectSaleItem } from '@/types';
import { fromFirestoreOrder } from '../order-service';
import { CanalVentaDirecta as DirectSaleChannel } from "@ssot";

const toDateString = (ts: any, defaultNow = true): string | undefined => {
    if (ts === null || ts === undefined) {
      return defaultNow ? new Date().toISOString() : undefined;
    }
    
    if (ts instanceof Timestamp) return ts.toDate().toISOString();
    
    if (typeof ts === 'string') {
        const parsed = parseISO(ts);
        if (isValid(parsed)) return parsed.toISOString();
    }
    
    if (ts.toDate && typeof ts.toDate === 'function') {
        const date = ts.toDate();
        if(isValid(date)) return date.toISOString();
    }

    if (typeof ts === 'object' && ts.seconds !== undefined && ts.nanoseconds !== undefined) {
        const date = new Timestamp(ts.seconds, ts.nanoseconds).toDate();
        if (isValid(date)) return date.toISOString();
    }

    const directParsed = new Date(ts);
    if(isValid(directParsed)) return directParsed.toISOString();

    return defaultNow ? new Date().toISOString() : undefined;
};

export const fromFirestoreTeamMember = (docSnap: DocumentSnapshot): TeamMember => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  return {
    id: docSnap.id,
    authUid: data.authUid || docSnap.id,
    name: data.name || '',
    email: data.email || '',
    avatarUrl: data.avatarUrl || '',
    role: data.role || 'SalesRep',
    monthlyTargetAccounts: data.monthlyTargetAccounts,
    monthlyTargetVisits: data.monthlyTargetVisits,
    createdAt: toDateString(data.createdAt),
    updatedAt: toDateString(data.updatedAt),
    liderId: data.liderId,
    equipoIds: data.equipoIds,
    condiciones_personalizadas: data.condiciones_personalizadas,
    total_comisiones: data.total_comisiones,
    total_bonus: data.total_bonus,
    accountId: data.accountId,
  };
};


export const fromFirestoreBomLine = (snapshot: DocumentSnapshot): BomLine => {
  const data = snapshot.data();
  if (!data) throw new Error("Document data is undefined.");
  return {
      id: snapshot.id,
      productSku: data.productSku,
      componentId: data.componentId,
      componentName: data.componentName,
      componentSku: data.componentSku,
      quantity: data.quantity,
      uom: data.uom,
      type: data.type,
      createdAt: toDateString(data.createdAt),
      updatedAt: toDateString(data.updatedAt),
  };
};

export const fromFirestoreItemBatch = (snapshot: DocumentSnapshot): ItemBatch => {
    const data = snapshot.data();
    if (!data) throw new Error("Document data is undefined.");
    return {
        id: snapshot.id,
        inventoryItemId: data.inventoryItemId, // FK to inventoryItems
        supplierBatchCode: data.supplierBatchCode, // The original batch code from the supplier's invoice
        internalBatchCode: data.internalBatchCode, // Our own generated code (M... or B...)
        qtyInitial: data.qtyInitial,
        qtyRemaining: data.qtyRemaining,
        uom: data.uom,
        unitCost: data.unitCost,
        expiryDate: toDateString(data.expiryDate, false), // ISO String
        locationId: data.locationId,
        isClosed: !!data.isClosed,
        createdAt: toDateString(data.createdAt)!, 
        updatedAt: toDateString(data.updatedAt),
        qcStatus: data.qcStatus || 'Pending',
        isLegacy: !!data.isLegacy,
        costLayers: data.costLayers || [],
    };
};

export const fromFirestoreDirectSale = (docSnap: DocumentSnapshot): DirectSale => {
  const data = docSnap.data()!;
  return {
    id: docSnap.id,
    customerId: data.customerId,
    customerName: data.customerName,
    channel: data.channel as DirectSaleChannel | undefined,
    items: data.items || [],
    subtotal: data.subtotal,
    tax: data.tax,
    totalAmount: data.totalAmount,
    issueDate: toDateString(data.issueDate)!,
    dueDate: toDateString(data.dueDate, false),
    invoiceNumber: data.invoiceNumber,
    status: data.status,
    relatedPlacementOrders: data.relatedPlacementOrders,
    notes: data.notes,
    createdAt: toDateString(data.createdAt)!,
    updatedAt: toDateString(data.updatedAt)!,
    paidStatus: data.paidStatus || 'Pendiente',
    paymentMethod: data.paymentMethod,
    costOfGoods: data.costOfGoods,
    type: data.type || 'directa', // Fallback for old data
    qtyRemainingInConsignment: data.qtyRemainingInConsignment,
    originalConsignmentId: data.originalConsignmentId,
  };
};

export const toFirestoreDirectSale = (data: any, isNew: boolean): any => {
    const firestoreData: { [key: string]: any } = {
        updatedAt: Timestamp.now(),
    };

    // Only map fields that are actually present in the `data` object
    if (data.customerId !== undefined) firestoreData.customerId = data.customerId || null;
    if (data.customerName !== undefined) firestoreData.customerName = data.customerName;
    if (data.channel !== undefined) firestoreData.channel = data.channel || null;
    if (data.subtotal !== undefined) firestoreData.subtotal = data.subtotal || 0;
    if (data.tax !== undefined) firestoreData.tax = data.tax || 0;
    if (data.totalAmount !== undefined) firestoreData.totalAmount = data.totalAmount || 0;
    if (data.issueDate) firestoreData.issueDate = data.issueDate instanceof Date ? Timestamp.fromDate(data.issueDate) : Timestamp.fromDate(new Date(data.issueDate));
    if (data.dueDate !== undefined) firestoreData.dueDate = data.dueDate ? (data.dueDate instanceof Date ? Timestamp.fromDate(data.dueDate) : Timestamp.fromDate(new Date(data.dueDate))) : null;
    if (data.invoiceNumber !== undefined) firestoreData.invoiceNumber = data.invoiceNumber || null;
    if (data.status !== undefined) firestoreData.status = data.status || 'borrador';
    if (data.paymentMethod !== undefined) firestoreData.paymentMethod = data.paymentMethod || null;
    if (data.notes !== undefined) firestoreData.notes = data.notes || null;
    if (data.type !== undefined) firestoreData.type = data.type || 'directa';

    if (data.items) {
      firestoreData.items = data.items.map((item: DirectSaleItem) => ({ 
            productId: item.productId,
            productName: item.productName,
            batchId: item.batchId,
            batchNumber: item.batchNumber,
            quantity: item.quantity,
            netUnitPrice: item.netUnitPrice,
            total: (item.quantity || 0) * (item.netUnitPrice || 0),
        }));
    }

    if (data.relatedPlacementOrders) {
      firestoreData.relatedPlacementOrders = Array.isArray(data.relatedPlacementOrders) 
          ? data.relatedPlacementOrders 
          : data.relatedPlacementOrders.split(',').map((s:string) => s.trim());
    } else if (data.relatedPlacementOrders !== undefined) {
      firestoreData.relatedPlacementOrders = [];
    }

    if (isNew) {
        firestoreData.createdAt = Timestamp.now();
        firestoreData.paidStatus = 'Pendiente';
    }
    
    return firestoreData;
};


export const fromFirestoreExpense = (docSnap: DocumentSnapshot): Expense => {
    const data = docSnap.data()!;
    
    const items = (data.items || []).map((item: any) => ({
      ...item,
      caducidad: toDateString(item.caducidad, false)
    }));

    return {
        id: docSnap.id,
        categoriaId: data.categoriaId,
        categoria: data.categoria, 
        isInventoryPurchase: !!data.isInventoryPurchase,
        estadoDocumento: data.estadoDocumento,
        estadoPago: data.estadoPago,
        recepcionCompleta: !!data.recepcionCompleta,
        concepto: data.concepto,
        monto: data.monto,
        moneda: data.moneda || 'EUR',
        fechaEmision: toDateString(data.fechaEmision, false),
        fechaVencimiento: toDateString(data.fechaVencimiento, false),
        fechaPago: toDateString(data.fechaPago, false),
        items: items,
        gastosEnvio: data.gastosEnvio,
        impuestos: data.impuestos,
        proveedorId: data.proveedorId,
        proveedorNombre: data.proveedorNombre,
        invoiceNumber: data.invoiceNumber,
        notes: data.notes,
        adjuntos: data.adjuntos,
        creadoPor: data.creadoPor,
        fechaCreacion: toDateString(data.fechaCreacion)!,
    }
};

export const toFirestoreExpense = (data: any, isNew: boolean, creatorId?: string): any => {
    const payload: { [key: string]: any } = {
        ...data,
        updatedAt: Timestamp.now(),
    };
    if (isNew) {
        payload.fechaCreacion = Timestamp.now();
        if(creatorId) payload.creadoPor = creatorId;
    }
    
    ['fechaEmision', 'fechaVencimiento'].forEach(key => {
        if (data[key]) {
            payload[key] = Timestamp.fromDate(new Date(data[key]));
        } else {
            payload[key] = null;
        }
    });

    if (data.items) {
      payload.items = data.items.map((item: any) => ({
        ...item,
        caducidad: item.caducidad ? Timestamp.fromDate(new Date(item.caducidad)) : null
      }));
    }

    Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
            payload[key] = null;
        }
    });

    return payload;
};

export const fromFirestoreSupplier = (docSnap: DocumentSnapshot): Supplier => {
    const data = docSnap.data()!;
    return {
        id: docSnap.id,
        name: data.name,
        code: data.code,
        cif: data.cif,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        address: data.address,
        iban: data.iban,
        notes: data.notes,
        createdAt: toDateString(data.createdAt)!,
        updatedAt: toDateString(data.updatedAt)!,
    };
};

export const toFirestoreSupplier = (data: any, isNew: boolean): any => {
    const payload: { [key: string]: any } = {
        name: data.name,
        code: data.code || null,
        cif: data.cif || null,
        contactName: data.contactName || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        address: {
            street: data.address_street || null,
            number: data.address_number || null,
            city: data.address_city || null,
            province: data.address_province || null,
            postalCode: data.address_postalCode || null,
            country: data.address_country || "España",
        },
        iban: data.iban || null,
        notes: data.notes || null,
        updatedAt: Timestamp.now(),
    };
    if (isNew) {
        payload.createdAt = Timestamp.now();
    }
    return payload;
};

export const fromFirestoreInteraction = (docSnap: any): Order => {
  const data = docSnap.data();
  if (!data) return {} as Order; // Should not happen
  return fromFirestoreOrder(docSnap); // Use the main order converter
};
