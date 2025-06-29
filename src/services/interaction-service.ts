
'use server';

import { db } from '@/lib/firebase';
import {
  collection, query, getDocs, Timestamp, orderBy,
  type DocumentSnapshot,
} from "firebase/firestore";
import type { Interaction } from '@/types';
import { format, isValid, parseISO } from 'date-fns';

const INTERACTIONS_COLLECTION = 'interactions';

const fromFirestoreInteraction = (docSnap: DocumentSnapshot): Interaction => {
    const data = docSnap.data();
    if (!data) throw new Error("Document data is undefined.");

    const parseTimestamp = (ts: any): string => {
        if (!ts) return new Date().toISOString();
        if (ts instanceof Timestamp) return ts.toDate().toISOString();
        if (typeof ts === 'string') return ts;
        return new Date().toISOString();
    };

    return {
        id: docSnap.id,
        accountId: data.accountId,
        tipo: data.tipo,
        resultado: data.resultado,
        fecha_prevista: parseTimestamp(data.fecha_prevista),
        fecha_real: data.fecha_real ? parseTimestamp(data.fecha_real) : undefined,
        importe: data.importe,
        promoItems: data.promoItems,
        createdBy: data.createdBy,
        createdAt: parseTimestamp(data.createdAt),
    };
};

export const getInteractionsFS = async (): Promise<Interaction[]> => {
  const interactionsCol = collection(db, INTERACTIONS_COLLECTION);
  const q = query(interactionsCol, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  const interactionList = snapshot.docs.map(docSnap => fromFirestoreInteraction(docSnap));
  return interactionList;
};
