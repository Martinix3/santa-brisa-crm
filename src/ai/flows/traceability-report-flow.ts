
'use server';
/**
 * @fileOverview An AI agent for generating supply chain traceability reports.
 *
 * - getTraceabilityReport - A function that handles report generation.
 * - TraceabilityReportInput - The input type.
 * - TraceabilityReportOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { collection, query, where, getDocs, doc, getDoc, limit, type DocumentData, type DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ItemBatch, StockTxn, ProductionRun, DirectSale, InventoryItem } from '@/types';
import { fromFirestoreItemBatch } from '@/services/utils/firestore-converters';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import Handlebars from 'handlebars';


const TraceabilityReportInputSchema = z.object({
  batchId: z.string().describe('The document ID or internal batch code of the batch to trace.'),
});
export type TraceabilityReportInput = z.infer<typeof TraceabilityReportInputSchema>;

const TraceabilityReportOutputSchema = z.object({
  markdown: z.string().describe('The full traceability report in Markdown format.'),
});
export type TraceabilityReportOutput = z.infer<typeof TraceabilityReportOutputSchema>;

// Helper to format dates consistently, with a fallback for invalid ones.
const formatDDMMYYYY = (date: Date | string | null | undefined): string => {
    if (!date) return '_N/D_';
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '_N/D_';
    return format(d, 'dd-MM-yyyy');
};

const traceabilityPromptTemplate = `
# 🧾 Informe de Trazabilidad

### Lote Principal
- **Producto:** {{productName}} (SKU: \`{{productSku}}\`)
- **Lote Interno:** \`{{internalBatchCode}}\`
- **Lote Proveedor:** \`{{supplierBatchCode}}\`
- **Cantidad Inicial:** {{qtyInitial}} {{uom}}
- **Stock Restante:** **{{qtyRemaining}} {{uom}}**
- **Fecha Creación:** {{formattedCreatedAt}}
- **Fecha Caducidad:** {{formattedExpiryDate}}

---

## 🔍 Origen del Lote (Upstream)
> {{{originSummary}}}

{{#if consumption.length}}
### Componentes Consumidos
| Componente | Cantidad | UoM | Lote Consumido (Proveedor) |
|---|---:|---|---|
{{#each consumption}}
| {{this.componentName}} | {{this.quantity}} | {{this.uom}} | \`{{this.supplierBatchCode}}\` |
{{/each}}
{{/if}}
{{#if totalCostString}}
**Coste total de producción:** {{totalCostString}}
{{/if}}

---

## 📦 Destino del Lote (Downstream)

{{#if sales.length}}
| Fecha | Cliente | Documento | Canal | Cantidad |
|---|---|---|---|---:|
{{#each sales}}
| {{this.date}} | **{{this.customerName}}** | Venta \`{{this.saleId}}\` | {{this.channel}} | {{this.quantity}} |
{{/each}}
{{else}}
> Sin movimientos de salida (ventas) registrados para este lote.
{{/if}}

---
`;


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
    // --- PHASE 1 & 2: DATA FETCHING & PREPARATION ---
    const batchDetails = await getBatchDetails(input.batchId);
    if (!batchDetails) throw new Error(`No se encontró ningún lote con el identificador: "${input.batchId}"`);
    
    const itemDetails = await getInventoryItem(batchDetails.inventoryItemId);
    if (!itemDetails) throw new Error(`Error de integridad: El artículo de inventario (ID: ${batchDetails.inventoryItemId}) para el lote ${batchDetails.internalBatchCode} no fue encontrado.`);

    const allTxnsQuery = query(collection(db, 'stockTxns'), where('batchId', '==', batchDetails.id));
    const allTxnsSnapshot = await getDocs(allTxnsQuery);
    const allTxnsForBatch = allTxnsSnapshot.docs.map(doc => doc.data() as StockTxn);
    const originTxn = allTxnsForBatch.find(txn => (txn.qtyDelta || 0) > 0);
    const downstreamTxns = allTxnsForBatch.filter(txn => (txn.qtyDelta || 0) < 0);

    const refsToRead = new Map<string, DocumentReference<DocumentData>>();
    if(originTxn?.refId && originTxn.refCollection) {
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

    // --- PHASE 3: PREPARE DATA FOR PROMPT (with safe fallbacks) ---
    
    let originSummary = "Origen del lote no encontrado (posiblemente stock inicial o migrado).";
    let consumptionData: any[] = [];
    let totalCostString = "";
    
    if (originTxn && originTxn.refId) {
        const originDoc = docsMap.get(`origin_${originTxn.refId}`);
        if(originDoc && originDoc.exists()){
            const originDocData = originDoc.data();
            if (originTxn.txnType === 'recepcion') {
                originSummary = `Recibido del proveedor **${originDocData!.supplier || 'Desconocido'}** en la Compra \`${originTxn.refId}\` el ${formatDDMMYYYY(originTxn.date.toDate())}.`;
            } else if (originTxn.txnType === 'produccion') {
                const runData = originDocData as ProductionRun;
                originSummary = `Producido internamente en la **Orden de Producción** \`${originTxn.refId}\` el ${formatDDMMYYYY(originTxn.date.toDate())}.`;

                const totalCost = (runData.consumedComponents || []).reduce((sum, comp) => {
                  const unitCost = comp.unitCost || 0;
                  return sum + (comp.quantity * unitCost);
                }, 0);
                if (totalCost > 0) totalCostString = `**${totalCost.toFixed(2)} €**`;
                
                if (runData.consumedComponents && runData.consumedComponents.length > 0) {
                   const componentItems = await Promise.all(
                     runData.consumedComponents.map(c => getInventoryItem(c.componentId))
                   );
                   consumptionData = runData.consumedComponents.map((c, i) => ({
                      componentName: c.componentName || 'Componente Desconocido',
                      quantity: c.quantity || 0,
                      uom: componentItems[i]?.uom || 'unit',
                      supplierBatchCode: c.supplierBatchCode || c.batchId, // Fallback to internal batch if supplier one is missing
                   }));
                }
            }
        }
    }
    
    const salesData: any[] = [];
    if (downstreamTxns.length > 0) {
        for (const txn of downstreamTxns) {
            if (!txn.refId || !txn.refCollection || txn.txnType !== 'venta') continue;
            const docSnap = docsMap.get(`${txn.txnType}_${txn.refId}`);
            if (docSnap && docSnap.exists()) {
                const sale = docSnap.data() as DirectSale;
                salesData.push({
                    date: formatDDMMYYYY(txn.date.toDate()),
                    customerName: sale.customerName || 'Cliente Desconocido',
                    saleId: txn.refId || 'N/A',
                    channel: sale.channel || 'N/D',
                    quantity: Math.abs(txn.qtyDelta || 0),
                });
            }
        }
    }
    
    const promptData = {
      internalBatchCode: batchDetails.internalBatchCode || 'N/A',
      productName: itemDetails.name || 'Producto Desconocido',
      productSku: itemDetails.sku || '—',
      qtyInitial: batchDetails.qtyInitial || 0,
      uom: itemDetails.uom || 'unit',
      formattedCreatedAt: formatDDMMYYYY(batchDetails.createdAt),
      formattedExpiryDate: formatDDMMYYYY(batchDetails.expiryDate),
      supplierBatchCode: batchDetails.supplierBatchCode || '—',
      qtyRemaining: batchDetails.qtyRemaining || 0,
      originSummary,
      consumption: consumptionData,
      totalCostString,
      sales: salesData,
    };
    
    // --- PHASE 4: GENERATE REPORT ---
    const compiledPromptTemplate = Handlebars.compile(traceabilityPromptTemplate);
    const finalPromptString = compiledPromptTemplate(promptData);
    
    const result = await ai.generate({
      messages: [
        {
          role: "user",
          content: [
            { text: finalPromptString }
          ]
        }
      ],
      output: {
        schema: TraceabilityReportOutputSchema
      }
    });

    const output = result.output;
    if (!output?.markdown) throw new Error("AI failed to format the final report.");
    
    return { markdown: output.markdown };
  }
);


export async function getTraceabilityReport(input: TraceabilityReportInput): Promise<TraceabilityReportOutput> {
    const result = await traceabilityFlow(input);
    return result;
}
