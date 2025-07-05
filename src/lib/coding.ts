
import { format } from 'date-fns';

// A simple Base36 checksum-like generator. Not a real CRC.
function generateChecksum(input: string): string {
    let hash = 0;
    if (input.length === 0) return '00';
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).toUpperCase().slice(-2).padStart(2, '0');
}


// From Briefing: M-YYMMDD-SUP-SBATCH-CC
export function generateRawMaterialInternalCode(supplierCode: string, supplierBatch: string, date: Date = new Date()): string {
  const yymmdd = format(date, 'yyMMdd');
  const cleanSupplierCode = supplierCode.substring(0, 3).toUpperCase();
  const cleanSupplierBatch = supplierBatch.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
  const checksum = generateChecksum(`${yymmdd}${cleanSupplierCode}${cleanSupplierBatch}`);
  return `M${yymmdd}-${cleanSupplierCode}-${cleanSupplierBatch}-${checksum}`;
}

// From Briefing: P-YYMMDD-Lx-SSS-T
export function generateProductionRunCode(line: number = 1, type: string = 'M', date: Date = new Date()): string {
    const yymmdd = format(date, 'yyMMdd');
    // Using timestamp to ensure sequence uniqueness for this implementation
    const seqStr = Date.now().toString().slice(-3);
    return `P${yymmdd}-L${line}-${seqStr}-${type.toUpperCase()}`;
}

// From Briefing: B-YYMMDD-SKU-Lx-SS-CC
export function generateFinishedGoodBatchCode(sku: string, line: number = 1, date: Date = new Date()): string {
    const yymmdd = format(date, 'yyMMdd');
    const cleanSku = sku.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    const seqStr = Date.now().toString().slice(-2); // Sequence
    const checksum = generateChecksum(`${yymmdd}${cleanSku}${seqStr}`);
    return `B${yymmdd}-${cleanSku}-L${line}-${seqStr}-${checksum}`;
}

// From Briefing: V-YYMMDD-C-QQQ
export function generateDirectSaleCode(channel: string = 'E', date: Date = new Date()): string {
    const yymmdd = format(date, 'yyMMdd');
    const channelChar = channel.charAt(0).toUpperCase();
    const seqStr = Date.now().toString().slice(-3);
    return `V${yymmdd}-${channelChar}-${seqStr}`;
}
