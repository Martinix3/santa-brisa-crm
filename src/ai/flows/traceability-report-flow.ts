
'use server';
/**
 * @fileOverview An AI agent for generating supply chain traceability reports.
 *
 * - getTraceabilityReport - A function that handles report generation.
 * - TraceabilityReportInput - The input type.
 * - TraceabilityReportOutput - The return type.
 */
import 'server-only';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { collection, query, where, getDocs, doc, getDoc, limit, type DocumentData, type DocumentSnapshot, type DocumentReference } from 'firebase-admin/firestore';
import { adminDb as db } from '@/lib/firebaseAdmin';
import type { ItemBatch, StockTxn, ProductionRun, DirectSale, InventoryItem } from '@/types';
import { fromFirestoreItemBatch } from '@/services/utils/firestore-converters';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDDMMYYYY } from '@/lib/coding';

const TraceabilityReportInputSchema = z.object({
  batchId: z.string().describe('The document ID or internal batch code of the batch to trace.'),
});
export type TraceabilityReportInput = z.infer<typeof TraceabilityReportInputSchema>;

const TraceabilityReportOutputSchema = z.object({
  html: z.string().describe('The full traceability report in HTML format.'),
});
export type TraceabilityReportOutput = z.infer<typeof TraceabilityReportOutputSchema>;

const generateReportHtml = (data: any): string => {
    const consumptionHtml = data.consumption?.length > 0
        ? data.consumption.map((c: any) => `
            <tr>
                <td style="padding: 8px; border: 1px solid #ccc;">${c.componentName}</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #ccc;">${c.quantity} ${c.uom}</td>
                <td style="padding: 8px; border: 1px solid #ccc;">${c.supplierBatchCode}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="3" style="padding: 8px; border: 1px solid #ccc; color: #666;">No se registraron componentes consumidos para esta producción.</td></tr>';

    const salesHtml = data.sales?.length > 0
        ? data.sales.map((s: any) => `
            <tr>
                <td style="padding: 8px; border: 1px solid #ccc;">${s.saleId}</td>
                <td style="padding: 8px; border: 1px solid #ccc;">${s.customerName}</td>
                <td style="padding: 8px; border: 1px solid #ccc;">${s.channel}</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #ccc;">${s.quantity} ${data.uom}</td>
                <td style="padding: 8px; border: 1px solid #ccc;">${s.date}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="5" style="padding: 8px; border: 1px solid #ccc; color: #666;">No hay movimientos de salida (ventas) registrados para este lote.</td></tr>';

    return `
<div style="font-family: sans-serif; max-width: 800px; margin: auto; color: #333;">
  <h2 style="border-bottom: 2px solid #eee; padding-bottom: 10px;">Informe de Trazabilidad</h2>
  <h3 style="margin-top: 25px;">1. Lote Principal</h3>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;"><tbody>
      <tr style="background-color: #f9f9f9;"><td style="padding: 8px; border: 1px solid #eee; width: 150px;"><strong>Producto:</strong></td><td style="padding: 8px; border: 1px solid #eee;">${data.productName} (SKU: ${data.productSku})</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Lote Interno:</strong></td><td style="padding: 8px; border: 1px solid #eee;">${data.internalBatchCode}</td></tr>
      <tr style="background-color: #f9f9f9;"><td style="padding: 8px; border: 1px solid #eee;"><strong>Lote Proveedor:</strong></td><td style="padding: 8px; border: 1px solid #eee;">${data.supplierBatchCode}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Cantidad Inicial:</strong></td><td style="padding: 8px; border: 1px solid #eee;">${data.qtyInitial} ${data.uom}</td></tr>
      <tr style="background-color: #f9f9f9;"><td style="padding: 8px; border: 1px solid #eee;"><strong>Stock Restante:</strong></td><td style="padding: 8px; border: 1px solid #eee;">${data.qtyRemaining} ${data.uom}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Fecha de Creación:</strong></td><td style="padding: 8px; border: 1px solid #eee;">${data.formattedCreatedAt}</td></tr>
      <tr style="background-color: #f9f9f9;"><td style="padding: 8px; border: 1px solid #eee;"><strong>Caducidad:</strong></td><td style="padding: 8px; border: 1px solid #eee;">${data.formattedExpiryDate}</td></tr>
  </tbody></table>
  <h3 style="margin-top: 25px;">2. Origen del Lote (Upstream)</h3>
  ${data.reception ? `<p style="font-weight: bold;">Recepción de Proveedor:</p><ul style="list-style-type: disc; padding-left: 20px; font-size: 14px;"><li><strong>Compra ID:</strong> ${data.reception.purchaseId}</li><li><strong>Proveedor:</strong> ${data.reception.supplierName}</li><li><strong>Fecha de Recepción:</strong> ${data.reception.date}</li></ul>` : ''}
  ${data.production ? `<p style="font-weight: bold;">Producción Interna:</p><ul style="list-style-type: disc; padding-left: 20px; font-size: 14px;"><li><strong>Orden de Producción:</strong> ${data.production.runId}</li><li><strong>Fecha de Producción:</strong> ${data.production.date}</li></ul>` : ''}
  ${data.production ? `<h4 style="margin-top: 15px; margin-bottom: 5px;">Componentes Consumidos</h4><table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc; font-size: 14px; margin-top: 10px;"><thead style="background-color: #f5f5f5;"><tr><th style="text-align: left; padding: 8px; border: 1px solid #ccc;">Ingrediente</th><th style="text-align: right; padding: 8px; border: 1px solid #ccc;">Cantidad</th><th style="text-align: left; padding: 8px; border: 1px solid #ccc;">Lote Proveedor</th></tr></thead><tbody>${consumptionHtml}</tbody></table><p style="text-align: right; font-size: 12px; margin-top: 5px;"><strong>Coste total de componentes:</strong> ${data.totalCostString}</p>` : ''}
  ${!data.reception && !data.production ? '<p style="font-size: 14px; color: #666;">Origen del lote no especificado o es stock inicial.</p>' : ''}
  <h3 style="margin-top: 25px;">3. Destino del Lote (Downstream)</h3>
  ${data.sales?.length > 0 ? `<h4 style="margin-top: 15px; margin-bottom: 5px;">Ventas Registradas</h4><table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc; font-size: 14px; margin-top: 10px;"><thead><tr style="background-color: #f5f5f5;"><th style="text-align: left; padding: 8px; border: 1px solid #ccc;">Documento de Venta</th><th style="text-align: left; padding: 8px; border: 1px solid #ccc;">Cliente</th><th style="text-align: left; padding: 8px; border: 1px solid #ccc;">Canal</th><th style="text-align: right; padding: 8px; border: 1px solid #ccc;">Cantidad</th><th style="text-align: left; padding: 8px; border: 1px solid #ccc;">Fecha</th></tr></thead><tbody>${salesHtml}</tbody></table><p style="font-size: 14px; margin-top: 10px;"><strong>Total vendido:</strong> ${data.totalOut} ${data.uom}</p>` : '<p style="font-size: 14px; color: #666;">No hay movimientos de salida (ventas) registrados para este lote.</p>'}
</div>
    `;
};


async function getBatchDetails(batchIdOrCode: string): Promise<ItemBatch | null> {
    if (!batchIdOrCode) return null;

    const batchRef = doc(db, 'itemBatches', batchIdOrCode);
    const batchSnap = await getDoc(batchRef);
    if (batchSnap.exists()) {
        return fromFirestoreItemBatch(batchSnap);
    }

    const qInternal = query(collection(db, 'itemBatches'), where('internalBatchCode', '==', batchIdOrCode), limit(1));
    const querySnapshotInternal = await getDocs(qInternal);
    if (!querySnapshotInternal.empty) {
        return fromFirestoreItemBatch(querySnapshotInternal.docs[0]);
    }
    
    const qSupplier = query(collection(db, 'itemBatches'), where('supplierBatchCode', '==', batchIdOrCode), limit(1));
    const querySnapshotSupplier = await getDocs(qSupplier);
    if (!querySnapshotSupplier.empty) {
        return fromFirestoreItemBatch(querySnapshotSupplier.docs[0]);
    }

    return null;
}

async function getInventoryItem(itemId: string): Promise<InventoryItem | null> {
    if (!itemId) return null;
    const itemRef = doc(db, 'inventoryItems', itemId);
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) return null;

    const data = itemSnap.data();
    return {
        id: itemSnap.id,
        name: data.name,
        sku: data.sku,
        uom: data.uom || 'unit',
    } as InventoryItem;
}

const traceabilityFlow = ai.defineFlow(
  {
    name: 'traceabilityFlow',
    inputSchema: TraceabilityReportInputSchema,
    outputSchema: TraceabilityReportOutputSchema,
  },
  async (input) => {
    // API is disabled
    throw new Error('El servicio de trazabilidad con IA está desactivado.');

    /*
    // --- DATA FETCHING & PREPARATION ---
    const batchDetails = await getBatchDetails(input.batchId);
    if (!batchDetails) throw new Error(`No se encontró ningún lote con el identificador: "${input.batchId}"`);
    
    const itemDetails = await getInventoryItem(batchDetails.inventoryItemId);
    if (!itemDetails) throw new Error(`Error de integridad: El artículo de inventario (ID: ${batchDetails.inventoryItemId}) para el lote ${batchDetails.internalBatchCode} no fue encontrado.`);

    const allTxnsQuery = query(collection(db, 'stockTxns'), where('batchId', '==', batchDetails.id));
    const allTxnsSnapshot = await getDocs(allTxnsQuery);
    const allTxnsForBatch = allTxnsSnapshot.docs.map(doc => doc.data() as StockTxn);
    const originTxn = allTxnsForBatch.find(txn => (txn.qtyDelta || 0) > 0);
    const downstreamTxns = allTxnsForBatch.filter(txn => (txn.qtyDelta || 0) < 0);
    const totalOut = downstreamTxns.reduce((sum, txn) => sum + Math.abs(txn.qtyDelta || 0), 0);
    
    // Read related documents
    const refsToRead = new Map<string, DocumentReference>();
    if (originTxn?.refId && originTxn.refCollection) {
        refsToRead.set(`origin_${originTxn.refId}`, doc(db, originTxn.refCollection, originTxn.refId));
    }
    downstreamTxns.forEach(txn => {
        if (txn.refId && txn.refCollection) {
            refsToRead.set(`${txn.txnType}_${txn.refId}`, doc(db, txn.refCollection, txn.refId));
        }
    });

    const docsRead = await Promise.all(
        Array.from(refsToRead.values()).map(ref => getDoc(ref))
    );
    const docsMap = new Map<string, DocumentSnapshot>();
    Array.from(refsToRead.keys()).forEach((key, index) => docsMap.set(key, docsRead[index]));

    // --- PREPARE DATA FOR TEMPLATE ---
    
    const promptData: any = {
      internalBatchCode: batchDetails.internalBatchCode || 'N/A',
      productName: itemDetails.name || 'Producto Desconocido',
      productSku: itemDetails.sku || '—',
      qtyInitial: batchDetails.qtyInitial || 0,
      uom: itemDetails.uom || 'unit',
      formattedCreatedAt: formatDDMMYYYY(batchDetails.createdAt),
      formattedExpiryDate: formatDDMMYYYY(batchDetails.expiryDate),
      supplierBatchCode: batchDetails.supplierBatchCode || '—',
      qtyRemaining: batchDetails.qtyRemaining || 0,
      totalOut,
    };
    
    // Origin data
    if (originTxn?.refId && originTxn.refCollection) {
        const originDoc = docsMap.get(`origin_${originTxn.refId}`);
        if (originDoc && originDoc.exists()){
            const originDocData = originDoc.data();
            if (originTxn.txnType === 'recepcion' && originDocData) {
                promptData.reception = {
                    purchaseId: originTxn.refId,
                    supplierName: originDocData.supplierName || 'Proveedor Desconocido',
                    date: formatDDMMYYYY((originTxn.date as any).toDate()),
                };
            } else if (originTxn.txnType === 'produccion' && originDocData) {
                 const runData = originDocData as ProductionRun;
                 promptData.production = {
                    runId: originTxn.refId,
                    date: formatDDMMYYYY((originTxn.date as any).toDate()),
                };
                
                if (runData.consumedComponents && runData.consumedComponents.length > 0) {
                   const componentItems = await Promise.all(
                     runData.consumedComponents.map(c => getInventoryItem(c.componentId))
                   );
                   promptData.consumption = runData.consumedComponents.map((c, i) => ({
                      componentName: c.componentName || 'Componente Desconocido',
                      quantity: c.quantity || 0,
                      uom: componentItems[i]?.uom || 'unit',
                      supplierBatchCode: c.supplierBatchCode || c.batchId || 'N/A',
                   }));

                   const totalCost = (runData.consumedComponents || []).reduce((sum, comp) => {
                      const componentCost = ((comp as any).unitCost || 0) * (comp.quantity || 0);
                      return sum + componentCost;
                   }, 0);

                   promptData.totalCostString = totalCost > 0 ? `${totalCost.toFixed(2)} €` : 'N/D';
                }
            }
        }
    }
    
    // Destination data
    const salesData = [];
    if (downstreamTxns.length > 0) {
        for (const txn of downstreamTxns) {
            if (!txn.refId || txn.txnType !== 'venta') continue;
            const docSnap = docsMap.get(`${txn.txnType}_${txn.refId}`);
            if (docSnap && docSnap.exists()) {
                const sale = docSnap.data() as DirectSale;
                salesData.push({
                    date: formatDDMMYYYY((txn.date as any).toDate()),
                    customerName: sale.customerName || 'Cliente Desconocido',
                    saleId: txn.refId || 'N/A',
                    channel: sale.channel || 'N/D',
                    quantity: Math.abs(txn.qtyDelta || 0),
                });
            }
        }
    }
    promptData.sales = salesData;
    
    // --- RENDER TEMPLATE ---
    const finalHtmlString = generateReportHtml(promptData);
    
    return { html: finalHtmlString };
    */
  }
);


export async function getTraceabilityReport(input: TraceabilityReportInput): Promise<TraceabilityReportOutput> {
    // API is disabled
    throw new Error('El servicio de trazabilidad con IA está desactivado.');
    // const result = await traceabilityFlow(input);
    // return result;
}
