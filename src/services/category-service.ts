
'use server';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, where, type DocumentSnapshot, orderBy } from 'firebase/firestore';
import type { Category, CategoryKind } from '@/types';

const CATEGORIES_COLLECTION = 'categories';

const fromFirestoreCategory = (snapshot: DocumentSnapshot): Category => {
    const data = snapshot.data();
    if (!data) throw new Error("Category data is undefined.");
    return {
        id: snapshot.id,
        name: data.name,
        kind: data.kind,
        isConsumable: data.isConsumable || false,
        parentId: data.parentId || undefined,
    };
};

export const getCategoriesFS = async (kind?: CategoryKind | CategoryKind[]): Promise<Category[]> => {
    const categoriesCol = collection(db, CATEGORIES_COLLECTION);
    let q;

    if (Array.isArray(kind)) {
        q = query(categoriesCol, where('kind', 'in', kind), orderBy('name', 'asc'));
    } else if (kind) {
        q = query(categoriesCol, where('kind', '==', kind), orderBy('name', 'asc'));
    } else {
        q = query(categoriesCol, orderBy('name', 'asc'));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(fromFirestoreCategory);
};

export const getCategoryByIdFS = async (id: string): Promise<Category | null> => {
    if (!id) return null;
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? fromFirestoreCategory(snapshot) : null;
};

export const addCategoryFS = async (category: Omit<Category, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), category);
    return docRef.id;
};

export const updateCategoryFS = async (id: string, category: Partial<Omit<Category, 'id'>>): Promise<void> => {
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    await updateDoc(docRef, category);
};

export const deleteCategoryFS = async (id: string): Promise<void> => {
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    await deleteDoc(docRef);
};
