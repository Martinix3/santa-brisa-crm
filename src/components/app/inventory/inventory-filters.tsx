
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Filter, ChevronDown, PlusCircle } from "lucide-react";
import { useCategories } from "@/contexts/categories-context";

export type StockFilter = 'all' | 'inStock';
export type ExpiryFilter = 'all' | 'expiresIn90Days';

interface InventoryFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  categoryFilter: string | "Todos";
  setCategoryFilter: (value: string | "Todos") => void;
  stockFilter: StockFilter;
  setStockFilter: (value: StockFilter) => void;
  expiryFilter: ExpiryFilter;
  setExpiryFilter: (value: ExpiryFilter) => void;
  onOpenCategoryDialog: () => void;
}

export const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  stockFilter,
  setStockFilter,
  expiryFilter,
  setExpiryFilter,
  onOpenCategoryDialog
}) => {
  const { inventoryCategories, categoriesMap, isLoading: isLoadingCategories } = useCategories();

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
      <Input
        placeholder="Buscar (Nombre, SKU, Desc)..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto" disabled={isLoadingCategories}>
            <Filter className="mr-2 h-4 w-4" />
            Categoría: {categoryFilter === "Todos" ? "Todas" : (categoriesMap.get(categoryFilter) || '...')} <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuCheckboxItem onSelect={() => setCategoryFilter("Todos")} checked={categoryFilter === "Todos"}>Todas</DropdownMenuCheckboxItem>
          {inventoryCategories.map(cat => (
            <DropdownMenuCheckboxItem key={cat.id} onSelect={() => setCategoryFilter(cat.id)} checked={categoryFilter === cat.id}>
              {cat.name}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onOpenCategoryDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Nueva Categoría
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="flex items-center gap-2">
        <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todo el Stock</SelectItem><SelectItem value="inStock">Solo con Stock</SelectItem></SelectContent>
        </Select>
        <Select value={expiryFilter} onValueChange={(v) => setExpiryFilter(v as ExpiryFilter)}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Cualquier Caducidad</SelectItem><SelectItem value="expiresIn90Days">Caduca en ≤90 días</SelectItem></SelectContent>
        </Select>
      </div>
    </div>
  );
};
