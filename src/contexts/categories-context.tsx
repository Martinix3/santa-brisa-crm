
"use client";

import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { getCategoriesFS } from '@/services/category-service';
import type { Category } from '@/types';

interface CategoriesContextType {
    allCategories: Category[];
    isLoading: boolean;
    categoriesMap: Map<string, string>;
    inventoryCategories: Category[];
    costCategories: Category[];
}

export const CategoriesContext = createContext<CategoriesContextType>({
    allCategories: [],
    isLoading: true,
    categoriesMap: new Map(),
    inventoryCategories: [],
    costCategories: [],
});

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCategoriesFS()
      .then(setAllCategories)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const value = useMemo(() => {
    const categoriesMap = new Map(allCategories.map(c => [c.id, c.name]));
    const inventoryCategories = allCategories.filter(c => c.kind === 'inventory');
    const costCategories = allCategories.filter(c => c.kind === 'cost');

    return { 
        allCategories, 
        isLoading, 
        categoriesMap,
        inventoryCategories,
        costCategories
    };
  }, [allCategories, isLoading]);

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
    const context = useContext(CategoriesContext);
    if (context === undefined) {
        throw new Error('useCategories must be used within a CategoriesProvider');
    }
    return context;
}
