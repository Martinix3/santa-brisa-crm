import { adminDb } from '@/lib/firebaseAdmin';
import { doc, getDoc, setDoc, Timestamp } from "firebase-admin/firestore";
import type { AmbassadorSettings } from '@/types';

const SETTINGS_COLLECTION = 'settings';
const AMBASSADOR_DOC_ID = 'ambassadors';

const defaultSettings: AmbassadorSettings = {
    horeca: { pago_apertura: 50, bonus_segundo_pedido: 100, comision_inicial: 5, comision_indefinida: 2.5, min_pedido: 1, segundo_pedido_plazo_dias: 45 },
    distribuidor_mediano: { pago_apertura: 150, bonus_segundo_pedido: 150, comision_inicial: 4, comision_indefinida: 2, min_pedido: 20, segundo_pedido_plazo_dias: 45 },
    distribuidor_grande: { pago_apertura: 500, bonus_segundo_pedido: 500, comision_inicial: 3, comision_indefinida: 1.5, min_pedido: 50, segundo_pedido_plazo_dias: 45 },
    distribuidor_top: { pago_apertura: 1000, bonus_segundo_pedido: 1000, comision_inicial: 2, comision_indefinida: 1, min_pedido: 100, segundo_pedido_plazo_dias: 45 },
};


export const getAmbassadorSettingsFS = async (): Promise<AmbassadorSettings> => {
    const docRef = adminDb.collection(SETTINGS_COLLECTION).doc(AMBASSADOR_DOC_ID);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
        const data = docSnap.data()!;
        // Merge with defaults to ensure all fields are present
        return {
            horeca: { ...defaultSettings.horeca, ...data.horeca },
            distribuidor_mediano: { ...defaultSettings.distribuidor_mediano, ...data.distribuidor_mediano },
            distribuidor_grande: { ...defaultSettings.distribuidor_grande, ...data.distribuidor_grande },
            distribuidor_top: { ...defaultSettings.distribuidor_top, ...data.distribuidor_top },
        };
    } else {
        // If the document doesn't exist, create it with default values and return them
        await docRef.set({ ...defaultSettings, updatedAt: Timestamp.now() });
        return defaultSettings;
    }
};

export const saveAmbassadorSettingsFS = async (settings: AmbassadorSettings): Promise<void> => {
    const docRef = adminDb.collection(SETTINGS_COLLECTION).doc(AMBASSADOR_DOC_ID);
    await docRef.set({ ...settings, updatedAt: Timestamp.now() }, { merge: true });
};
