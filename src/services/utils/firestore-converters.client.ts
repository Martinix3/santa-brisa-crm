
'use client';

import { Timestamp, type DocumentSnapshot } from "firebase/firestore";
import { format, parseISO, isValid } from "date-fns";
import type { TeamMember } from '@/types';

// This file contains converters that are safe to use on the client-side.
// They use the client-side Firebase SDK and do not contain any server-only logic.

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
