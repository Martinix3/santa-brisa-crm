
'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import { collection, query, orderBy, getDocs, doc, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase-admin/firestore';
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

const toFirestoreDirectSale = (data: Partial<DirectSale>, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = { ...data };

  if (data.issueDate && typeof data.issueDate === 'string') {
    firestoreData.issueDate = Timestamp.fromDate(parseISO(data.issueDate));
  } else if (data.issueDate instanceof Date) {
     firestoreData.issueDate = Timestamp.fromDate(data.issueDate);
  }
   if (data.dueDate && typeof data.dueDate === 'string') {
    firestoreData.dueDate = Timestamp.fromDate(parseISO(data.dueDate));
  } else if (data.dueDate instanceof Date) {
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


export const getDirectSalesFS = async (): Promise<DirectSale[]> => {
  const salesCol = collection(db, DIRECT_SALES_COLLECTION);
  const q = query(salesCol, orderBy('issueDate', 'desc'));
  const salesSnapshot = await getDocs(q);
  return salesSnapshot.docs.map(docSnap => fromFirestoreDirectSale(docSnap));
};


export const addDirectSaleFS = async (data: Partial<DirectSale>): Promise<string> => {
  const firestoreData = toFirestoreDirectSale(data, true);
  const docRef = await addDoc(collection(db, DIRECT_SALES_COLLECTION), firestoreData);
  return docRef.id;
};

export const updateDirectSaleFS = async (id: string, data: Partial<DirectSale>): Promise<void> => {
  const saleDocRef = doc(db, DIRECT_SALES_COLLECTION, id);
  const firestoreData = toFirestoreDirectSale(data, false);
  await updateDoc(saleDocRef, firestoreData);
};

export const deleteDirectSaleFS = async (id: string): Promise<void> => {
  const saleDocRef = doc(db, DIRECT_SALES_COLLECTION, id);
  await deleteDoc(saleDocRef);
};


export const initializeMockDirectSalesInFirestore = async (mockData: DirectSale[]) => {
    const salesCol = collection(db, DIRECT_SALES_COLLECTION);
    const snapshot = await getDocs(query(salesCol));
    if (snapshot.empty && mockData.length > 0) {
        const batch = db.batch();
        mockData.forEach(sale => {
            const { id, createdAt, updatedAt, issueDate, dueDate, ...saleData } = sale;
            
            const firestoreReadyData: any = { ...saleData };
            firestoreReadyData.issueDate = issueDate ? Timestamp.fromDate(parseISO(issueDate)) : Timestamp.fromDate(new Date());
            firestoreReadyData.dueDate = dueDate ? Timestamp.fromDate(parseISO(dueDate)) : null;
            firestoreReadyData.createdAt = createdAt ? Timestamp.fromDate(parseISO(createdAt)) : Timestamp.fromDate(new Date());
            firestoreReadyData.updatedAt = updatedAt ? Timestamp.fromDate(parseISO(updatedAt)) : Timestamp.fromDate(new Date());
            
            const docRef = doc(salesCol);
            batch.set(docRef, firestoreReadyData);
        });
        await batch.commit();
        console.log('Mock direct sales initialized in Firestore.');
    }
};
