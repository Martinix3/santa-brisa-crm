
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
  writeBatch
} from 'firebase/firestore';
import type { VentaDirectaSB, VentaDirectaSBItem, VentaDirectaSBFormValues } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { mockVentasDirectasSB } from '@/lib/data'; // Para seeding

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
    tipoIvaAplicadoSB: data.tipoIvaAplicadoSB, // Puede ser undefined o null
    importeIvaSB: data.importeIvaSB, // Puede ser undefined o null
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
// NOTA: Este helper ya no se usará directamente aquí, sino que la lógica estará en la página o diálogo.
// Se mantiene por si se decide centralizar de nuevo.
// La función `handleSaveVenta` en la page.tsx ahora construye el `Partial<VentaDirectaSB>` directamente.

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

// data es Partial<VentaDirectaSB> porque ya viene procesada de handleSaveVenta
export const addVentaDirectaSB_FS = async (data: Partial<VentaDirectaSB>): Promise<string> => {
  const dataWithTimestamps = {
    ...data,
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date()),
    fechaEmision: data.fechaEmision ? Timestamp.fromDate(parseISO(data.fechaEmision)) : Timestamp.fromDate(new Date()),
    fechaVencimientoPago: data.fechaVencimientoPago ? Timestamp.fromDate(parseISO(data.fechaVencimientoPago)) : null,
  };
  const docRef = await addDoc(collection(db, VENTAS_DIRECTAS_SB_COLLECTION), dataWithTimestamps);
  return docRef.id;
};

export const updateVentaDirectaSB_FS = async (id: string, data: Partial<VentaDirectaSB>): Promise<void> => {
  const ventaDocRef = doc(db, VENTAS_DIRECTAS_SB_COLLECTION, id);
  const dataWithTimestamps = {
    ...data,
    updatedAt: Timestamp.fromDate(new Date()),
    // Solo actualiza fechaEmision si se provee, de lo contrario mantiene la existente (si existe)
    ...(data.fechaEmision && { fechaEmision: Timestamp.fromDate(parseISO(data.fechaEmision)) }),
    fechaVencimientoPago: data.fechaVencimientoPago ? Timestamp.fromDate(parseISO(data.fechaVencimientoPago)) : null,
  };
  await updateDoc(ventaDocRef, dataWithTimestamps);
};

export const deleteVentaDirectaSB_FS = async (id: string): Promise<void> => {
  const ventaDocRef = doc(db, VENTAS_DIRECTAS_SB_COLLECTION, id);
  await deleteDoc(ventaDocRef);
};


export const initializeMockVentasDirectasSBInFirestore = async (mockData: VentaDirectaSB[]) => {
    const ventasCol = collection(db, VENTAS_DIRECTAS_SB_COLLECTION);
    const snapshot = await getDocs(query(ventasCol));
    if (snapshot.empty && mockData.length > 0) {
        const batch = writeBatch(db);
        mockData.forEach(venta => {
            const { id, createdAt, updatedAt, fechaEmision, fechaVencimientoPago, ...ventaData } = venta;
            
            const firestoreReadyData: any = { ...ventaData };
            firestoreReadyData.fechaEmision = fechaEmision ? Timestamp.fromDate(parseISO(fechaEmision)) : Timestamp.fromDate(new Date());
            firestoreReadyData.fechaVencimientoPago = fechaVencimientoPago ? Timestamp.fromDate(parseISO(fechaVencimientoPago)) : null;
            firestoreReadyData.createdAt = createdAt ? Timestamp.fromDate(parseISO(createdAt)) : Timestamp.fromDate(new Date());
            firestoreReadyData.updatedAt = updatedAt ? Timestamp.fromDate(parseISO(updatedAt)) : Timestamp.fromDate(new Date());
            
            // Limpiar campos opcionales que podrían ser string vacíos
            ['numeroFacturaSB', 'cifClienteFactura', 'direccionClienteFactura', 'notasInternasSB'].forEach(key => {
                if (firestoreReadyData[key] === '') firestoreReadyData[key] = null;
            });
            if (firestoreReadyData.tipoIvaAplicadoSB === undefined) firestoreReadyData.tipoIvaAplicadoSB = null;
            if (firestoreReadyData.importeIvaSB === undefined) firestoreReadyData.importeIvaSB = null;


            const docRef = doc(ventasCol); // Firestore generará el ID
            batch.set(docRef, firestoreReadyData);
        });
        await batch.commit();
        console.log('Mock ventas directas SB initialized in Firestore.');
    } else if (mockData.length === 0) {
        console.log('No mock ventas directas SB to seed.');
    } else {
        console.log('VentasDirectasSB collection is not empty. Skipping initialization.');
    }
};
