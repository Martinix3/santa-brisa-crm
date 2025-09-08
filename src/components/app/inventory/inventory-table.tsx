
"use client";

import * as React from "react";
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from "@/components/ui/table";
import { useCategories } from "@/contexts/categories-context";
import { addDays, parseISO, isValid, isAfter } from 'date-fns';
import type { InventoryItem, ItemBatch } from "@/types";
import { InventoryRow } from "./inventory-row";
import { BatchSubTable } from "./batch-sub-table";
import { EstadoQC as QcStatus } from "@ssot";

interface InventoryTableProps {
  items: InventoryItem[];
  batches: ItemBatch[];
  filters: {
    debouncedSearchTerm: string;
    categoryFilter: string | "Todos";
    stockFilter: 'all' | 'inStock';
    expiryFilter: 'all' | 'expiresIn90Days';
  };
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onEditBatch: (batch: ItemBatch) => void;
  onQuickUpdateBatchStatus: (batchId: string, newStatus: QcStatus) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ items, batches, filters, onEditItem, onDeleteItem, onEditBatch, onQuickUpdateBatchStatus }) => {
  const { categoriesMap } = useCategories();
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const batchesByItemId = React.useMemo(() => {
    return batches.reduce((acc, batch) => {
        if (!acc[batch.inventoryItemId]) {
            acc[batch.inventoryItemId] = [];
        }
        acc[batch.inventoryItemId].push(batch);
        return acc;
    }, {} as Record<string, ItemBatch[]>);
  }, [batches]);

  const augmentedAndFilteredItems = React.useMemo(() => {
    const ninetyDaysFromNow = addDays(new Date(), 90);
    const { debouncedSearchTerm, categoryFilter, stockFilter, expiryFilter } = filters;
      
    return items
      .map(item => {
        const itemBatches = batchesByItemId[item.id] || [];
        const relevantBatches = itemBatches.filter(b => b.qcStatus === 'Released' && b.qtyRemaining > 0);
        
        const totalValue = relevantBatches.reduce((sum, batch) => sum + (batch.qtyRemaining * batch.unitCost), 0);
        const totalQty = relevantBatches.reduce((sum, batch) => sum + batch.qtyRemaining, 0);
        
        const averageCost = totalQty > 0 ? totalValue / totalQty : null;

        return { ...item, averageCost };
      })
      .filter(item =>
        (item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (item.sku && item.sku.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
        )
      )
      .filter(item => categoryFilter === "Todos" || item.categoryId === categoryFilter)
      .filter(item => stockFilter === 'all' || item.stock > 0)
      .filter(item => {
          if (expiryFilter === 'all') return true;
          const itemBatches = batchesByItemId[item.id] || [];
          return itemBatches.some(batch => 
              batch.expiryDate && 
              isValid(parseISO(batch.expiryDate)) && 
              isAfter(new Date(), parseISO(batch.expiryDate)) === false && // Check it's not already expired
              isAfter(ninetyDaysFromNow, parseISO(batch.expiryDate)) 
          );
      });
  }, [items, batchesByItemId, filters]);

  const toggleRowExpansion = (itemId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="table-header-std w-[5%]"></TableHead>
            <TableHead className="table-header-std w-[25%]">Nombre del Artículo</TableHead>
            <TableHead className="table-header-std w-[15%]">SKU</TableHead>
            <TableHead className="table-header-std w-[15%]">Categoría</TableHead>
            <TableHead className="table-header-std text-right w-[10%]">Stock Total</TableHead>
            <TableHead className="table-header-std text-right w-[10%]">Coste Medio (€)</TableHead>
            <TableHead className="table-header-std text-center w-[10%]">Estado QC</TableHead>
            <TableHead className="table-header-std text-right w-[10%]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {augmentedAndFilteredItems.length > 0 ? augmentedAndFilteredItems.map((item) => {
            const itemBatches = batchesByItemId[item.id] || [];
            const isExpanded = expandedRows.has(item.id);
            return (
              <React.Fragment key={item.id}>
                <InventoryRow
                  item={item}
                  itemBatches={itemBatches}
                  categoryName={categoriesMap.get(item.categoryId) || 'N/D'}
                  isExpanded={isExpanded}
                  onToggleExpand={() => toggleRowExpansion(item.id)}
                  onEdit={() => onEditItem(item)}
                  onDelete={() => onDeleteItem(item.id)}
                />
                {isExpanded && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={8} className="p-0">
                      <BatchSubTable 
                        batches={itemBatches}
                        onEditBatch={onEditBatch}
                        onQuickUpdateBatchStatus={onQuickUpdateBatchStatus}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          }) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center h-24">
                No se encontraron artículos que coincidan con tu búsqueda o filtros.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
