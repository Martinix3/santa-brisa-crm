
"use client";

import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  orderBy,
  // where, // Placeholder for future filtering
  // WriteBatch, // Placeholder for future batch operations
  // writeBatch // Placeholder for future batch operations
} from 'firebase/firestore';
import type { VentaDirectaSB, VentaDirectaSBItem } from '@/types';
import { format, parseISO, isValid } from 'date-fns';

const VENTAS_DIRECTAS_SB_COLLECTION = 'ventasDirectasSB';

// Helper para convertir datos de Firestore a tipo VentaDirectaSB (UI)
const fromFirestoreVentaDirectaSB = (docSnap: any): VentaDirectaSB => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    fechaEmision: data.fechaEmision instanceof Timestamp ? format(data.fechaEmision.toDate(), "yyyy-MM-dd") : (typeof data.fechaEmision === 'string' ? data.fechaEmision : format(new Date(), "yyyy-MM-dd")),
    numeroFacturaSB: data.numeroFacturaSB || undefined,
    clienteId: data.clienteId,
    nombreClienteFactura: data.nombreClienteFactura || '',
    cifClienteFactura: data.cifClienteFactura || undefined,
    direccionClienteFactura: data.direccionClienteFactura || undefined,
    canalVentaDirectaSB: data.canalVentaDirectaSB,
    items: data.items || [],
    subtotalGeneralNetoSB: data.subtotalGeneralNetoSB || 0,
    tipoIvaAplicadoSB: data.tipoIvaAplicadoSB || undefined,
    importeIvaSB: data.importeIvaSB || undefined,
    totalFacturaSB: data.totalFacturaSB || 0,
    estadoVentaDirectaSB: data.estadoVentaDirectaSB || 'Borrador',
    fechaVencimientoPago: data.fechaVencimientoPago instanceof Timestamp ? format(data.fechaVencimientoPago.toDate(), "yyyy-MM-dd") : (typeof data.fechaVencimientoPago === 'string' ? data.fechaVencimientoPago : undefined),
    referenciasOrdenesColocacion: data.referenciasOrdenesColocacion || [],
    notasInternasSB: data.notasInternasSB || undefined,
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : (typeof data.createdAt === 'string' ? data.createdAt : format(new Date(), "yyyy-MM-dd")),
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : (typeof data.updatedAt === 'string' ? data.updatedAt : format(new Date(), "yyyy-MM-dd")),
  };
};

// Helper para convertir datos del formulario/UI a lo que se guarda en Firestore
const toFirestoreVentaDirectaSB = (data: Partial<VentaDirectaSB>, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = {};

  // Map all known fields from VentaDirectaSB type
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = (data as any)[key];
      if (value === undefined && key !== 'numeroFacturaSB' && key !== 'cifClienteFactura' && key !== 'direccionClienteFactura' && key !== 'tipoIvaAplicadoSB' && key !== 'importeIvaSB' && key !== 'fechaVencimientoPago' && key !== 'notasInternasSB') continue; 

      if ((key === 'fechaEmision' || key === 'fechaVencimientoPago') && value) {
        const dateValue = typeof value === 'string' ? parseISO(value) : value;
        firestoreData[key] = dateValue instanceof Date && isValid(dateValue) ? Timestamp.fromDate(dateValue) : null;
      } else if (key === 'items' || key === 'referenciasOrdenesColocacion') {
        firestoreData[key] = Array.isArray(value) ? value : [];
      } else {
        firestoreData[key] = value;
      }
    }
  }

  // Ensure optional fields that should be null if empty string
  ['numeroFacturaSB', 'cifClienteFactura', 'direccionClienteFactura', 'notasInternasSB'].forEach(key => {
    if (firestoreData[key] === '') firestoreData[key] = null;
  });
  
  // Ensure numeric optional fields are numbers or null
  ['tipoIvaAplicadoSB', 'importeIvaSB'].forEach(key => {
      if (firestoreData[key] === '' || firestoreData[key] === undefined) firestoreData[key] = null;
      else if (typeof firestoreData[key] === 'string') firestoreData[key] = parseFloat(firestoreData[key]);
  });


  if (isNew) {
    firestoreData.createdAt = Timestamp.fromDate(new Date());
    if (!firestoreData.estadoVentaDirectaSB) firestoreData.estadoVentaDirectaSB = 'Borrador';
  }
  firestoreData.updatedAt = Timestamp.fromDate(new Date());
  
  // Clean up any specifically undefined fields before sending
  Object.keys(firestoreData).forEach(key => {
    if (firestoreData[key] === undefined) {
      firestoreData[key] = null; // Store undefined as null
    }
  });

  return firestoreData;
};


export const getVentasDirectasSB_FS = async (): Promise<VentaDirectaSB[]> => {
  const ventasCol = collection(db, VENTAS_DIRECTAS_SB_COLLECTION);
  const q = query(ventasCol, orderBy('fechaEmision', 'desc'));
  const ventaSnapshot = await getDocs(q);
  return ventaSnapshot.docs.map(docSnap => fromFirestoreVentaDirectaSB(docSnap));
};

export const getVentaDirectaSBByIdFS = async (id: string): Promise<VentaDirectaSB | null> => {
  if (!id) {
    console.warn("getVentaDirectaSBByIdFS called with no ID.");
    return null;
  }
  const ventaDocRef = doc(db, VENTAS_DIRECTAS_SB_COLLECTION, id);
  const docSnap = await getDoc(ventaDocRef);
  return docSnap.exists() ? fromFirestoreVentaDirectaSB(docSnap) : null;
};

export const addVentaDirectaSB_FS = async (data: Partial<VentaDirectaSB>): Promise<string> => {
  const firestoreData = toFirestoreVentaDirectaSB(data, true);
  const docRef = await addDoc(collection(db, VENTAS_DIRECTAS_SB_COLLECTION), firestoreData);
  return docRef.id;
};

export const updateVentaDirectaSB_FS = async (id: string, data: Partial<VentaDirectaSB>): Promise<void> => {
  const ventaDocRef = doc(db, VENTAS_DIRECTAS_SB_COLLECTION, id);
  const firestoreData = toFirestoreVentaDirectaSB(data, false);
  await updateDoc(ventaDocRef, firestoreData);
};

export const deleteVentaDirectaSB_FS = async (id: string): Promise<void> => {
  const ventaDocRef = doc(db, VENTAS_DIRECTAS_SB_COLLECTION, id);
  await deleteDoc(ventaDocRef);
};
