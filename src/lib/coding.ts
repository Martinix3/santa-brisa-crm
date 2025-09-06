
'use server';

import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { doc, runTransaction } from "firebase/firestore";
import type { Category } from '@/types';

// A simple Base36 checksum-like generator. Not a real CRC.
function generateChecksum(input: string): string {
    if (!input) return '00';
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).toUpperCase().slice(-2).padStart(2, '0');
}

/**
 * Gets the next atomic sequence number from Firestore for a given key.
 */
async function getNextSeq(key: string, digits = 3): Promise<string> {
    if (!key) throw new Error("A key must be provided for the sequence counter.");
    const ref = doc(db, 'counters', key);
    
    const newVal = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists() ? (snap.data().value as number) : 0;
      const next = current + 1;
      tx.set(ref, { value: next, updatedAt: new Date() });
      return next;
    });

    return newVal.toString().padStart(digits, '0');
}

// --- SKU GENERATION LOGIC ---

function getSkuPrefix(categoryName: string): string {
    const normalizedName = categoryName.trim().toLowerCase();
    if (normalizedName.includes('materia prima')) return 'RM';
    if (normalizedName.includes('embalaje')) return 'PK';
    if (normalizedName.includes('producto terminado')) return 'FG';
    if (normalizedName.includes('granel') || normalizedName.includes('intermedio')) return 'BLK';
    if (normalizedName.includes('promocional') || normalizedName.includes('merchandising') || normalizedName.includes('plv')) return 'PM';
    if (normalizedName.includes('servicio')) return 'SVC';
    return 'OTH';
}

function getSkuIdentifier(itemName: string, prefix: string): string {
    if (prefix === 'FG' || prefix === 'BLK') {
        return itemName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5).padEnd(5, 'X');
    }
    return itemName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X');
}

/**
 * Generates a new, unique SKU for an inventory item based on its name and category.
 * @param name The name of the item.
 * @param category The category object of the item.
 * @returns A promise that resolves to the unique SKU string.
 */
export async function generateSku(name: string, category: Category): Promise<string> {
    const prefix = getSkuPrefix(category.name);
    const identifier = getSkuIdentifier(name, prefix);
    const counterKey = `sku-${prefix}-${identifier}`;
    const sequence = await getNextSeq(counterKey, 4);

    return `${prefix}-${identifier}-${sequence}`;
}

// --- CODE GENERATORS (for transactions, etc.) ---

export async function generateRawMaterialInternalCode(supplierId: string, supplierBatch: string, date: Date = new Date()): Promise<string> {
  const cleanSupplierId = (supplierId || 'NA').substring(0, 3).toUpperCase();
  if (!/^[A-Z0-9]{1,3}$/i.test(cleanSupplierId)) throw new Error('El código de proveedor debe ser de 1 a 3 caracteres alfanuméricos.');
  if (!/^[A-Z0-9-/.]{1,20}$/i.test(supplierBatch)) throw new Error('El lote de proveedor contiene caracteres no permitidos o es demasiado largo.');

  const yymmdd = format(date, 'yyMMdd');
  const cleanSupplierBatch = supplierBatch.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const checksum = generateChecksum(`${yymmdd}${cleanSupplierId}${cleanSupplierBatch}`);
  
  return `M${yymmdd}-${cleanSupplierId}-${cleanSupplierBatch}-${checksum}`;
}

export async function generateProductionRunCode(line: number = 1, type: 'M' | 'E' | 'B' = 'M', date: Date = new Date()): Promise<string> {
  if (line < 1 || line > 9) throw new Error('Línea de producción fuera de rango (1-9).');
  const yymmdd = format(date, 'yyMMdd');
  const counterKey = `prod-run-${yymmdd}-L${line}`;
  const seqStr = await getNextSeq(counterKey, 3);
  return `P${yymmdd}-L${line}-${seqStr}-${type}`;
}

export async function generateFinishedGoodBatchCode(sku: string, line: number = 1, date: Date = new Date()): Promise<string> {
    if (line < 1 || line > 9) throw new Error('Línea de producción fuera de rango (1-9).');
    const yymmdd = format(date, 'yyMMdd');
    const cleanSku = sku.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4).padEnd(4, 'X');
    const counterKey = `fg-batch-${yymmdd}-L${line}-${cleanSku}`;
    const seqStr = await getNextSeq(counterKey, 2);
    const checksum = generateChecksum(`${yymmdd}${cleanSku}${line}${seqStr}`);
    return `B${yymmdd}-${cleanSku}-L${line}-${seqStr}-${checksum}`;
}

export async function generateDirectSaleCode(channel: 'E' | 'H' | 'O' | 'D' | 'X' = 'X', date: Date = new Date()): Promise<string> {
    const yymmdd = format(date, 'yyMMdd');
    const counterKey = `sale-${yymmdd}-${channel}`;
    const seqStr = await getNextSeq(counterKey, 3);
    return `V${yymmdd}-${channel}-${seqStr}`;
}

export async function generateManualBatchCode(sku: string, date: Date = new Date()): Promise<string> {
    const yymmdd = format(date, 'yyMMdd');
    const cleanSku = sku.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4).padEnd(4, 'X');
    const counterKey = `man-batch-${yymmdd}-${cleanSku}`;
    const seqStr = await getNextSeq(counterKey, 2);
    const checksum = generateChecksum(`${yymmdd}${cleanSku}${seqStr}`);
    return `MAN${yymmdd}-${cleanSku}-${seqStr}-${checksum}`;
}
