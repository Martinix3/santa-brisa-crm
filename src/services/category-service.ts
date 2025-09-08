
import { adminDb } from '@/lib/firebaseAdmin';
import { collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, where, type DocumentSnapshot, orderBy, Timestamp, limit, writeBatch } from "firebase-admin/firestore";
import type { Category, CategoryKind } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { mockCategories } from '@/lib/data';

const CATEGORIES_COLLECTION = 'categories';

const fromFirestoreCategory = (snapshot: DocumentSnapshot): Category => {
    const data = snapshot.data();
    if (!data) throw new Error("Category data is undefined.");
    return {
        id: snapshot.id,
        name: data.name,
        kind: data.kind,
        isConsumable: !!data.isConsumable,
        costType: data.costType,
        parentId: data.parentId || undefined,
        createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : undefined,
    };
};

export const getCategoriesFS = async (): Promise<Category[]> => {
    const categoriesCol = adminDb.collection(CATEGORIES_COLLECTION);
    const q = categoriesCol.orderBy('name', 'asc');
    const snapshot = await q.get();
    return snapshot.docs.map(fromFirestoreCategory);
};

export const getCategoryByIdFS = async (id: string): Promise<Category | null> => {
    if (!id) return null;
    const docRef = adminDb.collection(CATEGORIES_COLLECTION).doc(id);
    const snapshot = await docRef.get();
    return snapshot.exists ? fromFirestoreCategory(snapshot) : null;
};

export const addCategoryFS = async (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const dataToSave: { [key: string]: any } = {
        ...category,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };
    if (category.kind === 'inventory') {
        delete dataToSave.costType;
    }
    const docRef = await adminDb.collection(CATEGORIES_COLLECTION).add(dataToSave);
    return docRef.id;
};

export const updateCategoryFS = async (id: string, category: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    const docRef = adminDb.collection(CATEGORIES_COLLECTION).doc(id);
    const dataToUpdate: { [key: string]: any } = {
        ...category,
        updatedAt: Timestamp.now()
    };
     if (category.kind === 'inventory') {
        delete dataToUpdate.costType;
    }
    await docRef.update(dataToUpdate);
};

export const deleteCategoryFS = async (id: string): Promise<void> => {
    const docRef = adminDb.collection(CATEGORIES_COLLECTION).doc(id);
    await docRef.delete();
};

export const initializeMockCategoriesInFirestore = async () => {
    console.log("Checking categories and seeding if necessary...");
    const categoriesCol = adminDb.collection(CATEGORIES_COLLECTION);
    
    const existingSnapshot = await categoriesCol.get();
    const existingIds = new Set(existingSnapshot.docs.map(doc => doc.id));

    const batch = adminDb.batch();
    let newCategoriesAdded = 0;

    for (const category of mockCategories) {
        const { idOverride, ...categoryData } = category;
        
        if (idOverride && !existingIds.has(idOverride)) {
            const docRef = categoriesCol.doc(idOverride);
            const dataToSave = {
                ...categoryData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            batch.set(docRef, dataToSave);
            newCategoriesAdded++;
            console.log(`  -> Queued new category for addition: ${dataToSave.name} (ID: ${idOverride})`);
        }
    }

    if (newCategoriesAdded > 0) {
        await batch.commit();
        console.log(`Successfully added ${newCategoriesAdded} new categories to Firestore.`);
    } else {
        console.log('All categories from the seed data already exist. No changes were made.');
    }
};
