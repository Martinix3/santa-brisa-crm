
'use server';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, where, type DocumentSnapshot, orderBy, Timestamp, limit, writeBatch } from 'firebase/firestore';
import type { Category, CategoryKind } from '@/types';
import { format } from 'date-fns';
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
        parentId: data.parentId || undefined,
        createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : undefined,
    };
};

export const getCategoriesFS = async (kind?: CategoryKind | CategoryKind[]): Promise<Category[]> => {
    const categoriesCol = collection(db, CATEGORIES_COLLECTION);
    let q;
    let shouldSortManually = false;

    if (Array.isArray(kind)) {
        if (kind.length > 10) {
            throw new Error('Firestore "in" query supports a maximum of 10 items.');
        }
        q = query(categoriesCol, where('kind', 'in', kind));
        shouldSortManually = true;
    } else if (kind) {
        q = query(categoriesCol, where('kind', '==', kind));
        shouldSortManually = true;
    } else {
        q = query(categoriesCol, orderBy('name', 'asc'));
    }
    
    const snapshot = await getDocs(q);
    const categories = snapshot.docs.map(fromFirestoreCategory);

    // Sort in-memory if Firestore didn't handle it, to avoid composite indexes.
    if(shouldSortManually) {
      categories.sort((a, b) => a.name.localeCompare(b.name));
    }

    return categories;
};

export const getCategoryByIdFS = async (id: string): Promise<Category | null> => {
    if (!id) return null;
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? fromFirestoreCategory(snapshot) : null;
};

export const addCategoryFS = async (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const dataToSave = {
        ...category,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };
    const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), dataToSave);
    return docRef.id;
};

export const updateCategoryFS = async (id: string, category: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    const dataToUpdate = {
        ...category,
        updatedAt: Timestamp.now()
    };
    await updateDoc(docRef, dataToUpdate);
};

export const deleteCategoryFS = async (id: string): Promise<void> => {
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    await deleteDoc(docRef);
};

export const initializeMockCategoriesInFirestore = async () => {
    const categoriesCol = collection(db, CATEGORIES_COLLECTION);
    const snapshot = await getDocs(query(categoriesCol, limit(1)));
    if (snapshot.empty && mockCategories.length > 0) {
        console.log('Categories collection is empty. Seeding...');
        const batch = writeBatch(db);
        mockCategories.forEach(category => {
            const docRef = doc(categoriesCol);
            const dataToSave = {
                ...category,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            batch.set(docRef, dataToSave);
        });
        await batch.commit();
        console.log('Mock categories initialized in Firestore.');
    } else {
        console.log('Categories collection is not empty or no mock data provided. Skipping initialization.');
    }
};
