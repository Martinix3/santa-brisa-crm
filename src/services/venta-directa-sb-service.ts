
'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import * as adminFirestore from 'firebase-admin/firestore';
import type { DirectSale, DirectSaleItem } from '@/types';
import { format, parseISO, isValid } from 'date-fns';

const DIRECT_SALES_COLLECTION = 'directSales';

const fromFirestoreDirectSale = (docSnap: adminFirestore.DocumentSnapshot<adminFirestore.DocumentData>): DirectSale => {
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
    issueDate: data.issueDate instanceof adminFirestore.Timestamp ? format(data.issueDate.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    dueDate: data.dueDate instanceof adminFirestore.Timestamp ? format(data.dueDate.toDate(), "yyyy-MM-dd") : undefined,
    invoiceNumber: data.invoiceNumber || undefined,
    status: data.status || 'Borrador',
    relatedPlacementOrders: data.relatedPlacementOrders || [],
    notes: data.notes || undefined,
    createdAt: data.createdAt instanceof adminFirestore.Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    updatedAt: data.updatedAt instanceof adminFirestore.Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
  };
};

const toFirestoreDirectSale = (data: Partial<DirectSale>, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = { ...data };

  if (data.issueDate && typeof data.issueDate === 'string') {
    firestoreData.issueDate = adminFirestore.Timestamp.fromDate(parseISO(data.issueDate));
  } else if (data.issueDate instanceof Date) {
     firestoreData.issueDate = adminFirestore.Timestamp.fromDate(data.issueDate);
  }
   if (data.dueDate && typeof data.dueDate === 'string') {
    firestoreData.dueDate = adminFirestore.Timestamp.fromDate(parseISO(data.dueDate));
  } else if (data.dueDate instanceof Date) {
     firestoreData.dueDate = adminFirestore.Timestamp.fromDate(data.dueDate);
  } else {
    firestoreData.dueDate = null;
  }

  if (isNew) {
    firestoreData.createdAt = adminFirestore.Timestamp.fromDate(new Date());
  }
  firestoreData.updatedAt = adminFirestore.Timestamp.fromDate(new Date());
  
  Object.keys(firestoreData).forEach(key => {
    if (firestoreData[key] === undefined) {
      firestoreData[key] = null;
    }
  });

  return firestoreData;
};


export const getDirectSalesFS = async (): Promise<DirectSale[]> => {
  const salesCol = adminFirestore.collection(db, DIRECT_SALES_COLLECTION);
  const q = adminFirestore.query(salesCol, adminFirestore.orderBy('issueDate', 'desc'));
  const salesSnapshot = await adminFirestore.getDocs(q);
  return salesSnapshot.docs.map(docSnap => fromFirestoreDirectSale(docSnap));
};


export const addDirectSaleFS = async (data: Partial<DirectSale>): Promise<string> => {
  const firestoreData = toFirestoreDirectSale(data, true);
  const docRef = await adminFirestore.addDoc(adminFirestore.collection(db, DIRECT_SALES_COLLECTION), firestoreData);
  return docRef.id;
};

export const updateDirectSaleFS = async (id: string, data: Partial<DirectSale>): Promise<void> => {
  const saleDocRef = adminFirestore.doc(db, DIRECT_SALES_COLLECTION, id);
  const firestoreData = toFirestoreDirectSale(data, false);
  await adminFirestore.updateDoc(saleDocRef, firestoreData);
};

export const deleteDirectSaleFS = async (id: string): Promise<void> => {
  const saleDocRef = adminFirestore.doc(db, DIRECT_SALES_COLLECTION, id);
  await adminFirestore.deleteDoc(saleDocRef);
};


export const initializeMockDirectSalesInFirestore = async (mockData: DirectSale[]) => {
    const salesCol = adminFirestore.collection(db, DIRECT_SALES_COLLECTION);
    const snapshot = await adminFirestore.getDocs(adminFirestore.query(salesCol));
    if (snapshot.empty && mockData.length > 0) {
        const batch = adminFirestore.writeBatch(db);
        mockData.forEach(sale => {
            const { id, createdAt, updatedAt, issueDate, dueDate, ...saleData } = sale;
            
            const firestoreReadyData: any = { ...saleData };
            firestoreReadyData.issueDate = issueDate ? adminFirestore.Timestamp.fromDate(parseISO(issueDate)) : adminFirestore.Timestamp.fromDate(new Date());
            firestoreReadyData.dueDate = dueDate ? adminFirestore.Timestamp.fromDate(parseISO(dueDate)) : null;
            firestoreReadyData.createdAt = createdAt ? adminFirestore.Timestamp.fromDate(parseISO(createdAt)) : adminFirestore.Timestamp.fromDate(new Date());
            firestoreReadyData.updatedAt = updatedAt ? adminFirestore.Timestamp.fromDate(parseISO(updatedAt)) : adminFirestore.Timestamp.fromDate(new Date());
            
            const docRef = adminFirestore.doc(salesCol);
            batch.set(docRef, firestoreReadyData);
        });
        await batch.commit();
        console.log('Mock direct sales initialized in Firestore.');
    }
};
