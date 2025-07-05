
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
import { collection, query, where, getDocs, doc, getDoc, limit, type DocumentReference, type DocumentData, type DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ItemBatch, StockTxn, ProductionRun, DirectSale, InventoryItem } from '@/types';
import { fromFirestoreItemBatch } from '@/services/utils/firestore-converters';
import { format, parseISO, isValid } from 'date-fns';


const TraceabilityReportInputSchema = z.object({
  batchId: z.string().describe('The document ID or internal batch code of the batch to trace.'),
});
export type TraceabilityReportInput = z.infer<typeof TraceabilityReportInputSchema>;

const TraceabilityReportOutputSchema = z.object({
  markdown: z.string().describe('The full traceability report in Markdown format.'),
});
export type TraceabilityReportOutput = z.infer<typeof TraceabilityReportOutputSchema>;


async function getBatchDetails(batchIdOrCode: string): Promise<ItemBatch | null> {
    if (!batchIdOrCode) return null;

    const batchRef = doc(db, 'itemBatches', batchIdOrCode);
    const batchSnap = await getDoc(batchRef);
    if (batchSnap.exists()) {
        return fromFirestoreItemBatch(batchSnap);
    }

    const q = query(collection(db, 'itemBatches'), where('internalBatchCode', '==', batchIdOrCode), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return fromFirestoreItemBatch(doc);
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

const ReportDataSchema = z.object({
    internalBatchCode: z.string(),
    productName: z.string(),
    productSku: z.string(),
    qtyInitial: z.number(),
    uom: z.string(),
    formattedCreatedAt: z.string(),
    formattedExpiryDate: z.string(),
    supplierBatchCode: z.string(),
    qtyRemaining: z.number(),
    totalOut: z.number(),
    reception: z.any().optional(),
    production: z.any().optional(),
    consumption: z.array(z.any()).optional(),
    sales: z.array(z.any()).optional(),
});


const reportGenerationPrompt = ai.definePrompt({
  name: 'reportGenerationPrompt',
  input: { schema: ReportDataSchema },
  output: { schema: TraceabilityReportOutputSchema },
  prompt: `You are an expert in supply chain traceability for Santa Brisa. Your task is to generate a detailed, clear, and professional traceability report in Markdown format using ONLY the JSON data provided.

## Formato que debes devolver
Genera **un único bloque Markdown** con:
1. Título con el emoji 🧾.
2. Tabla resumen del lote (usa los campos preformateados para las fechas y placeholders para datos vacíos).
3. Encabezado “🔍 Origen del lote (Upstream)” con:
   * Si existe 'reception', la frase “Recibido desde Proveedor X…”.
   * Si existe 'production', la frase “Producido internamente…”.
   * Tabla de componentes con numeración. Si no hay, no generes la tabla.
   * Si existe 'totalCostString', inclúyelo al final del apartado de origen.
4. Encabezado “📦 Destino del lote (Downstream)” con tablas de consumo o ventas. Si no hay, indica “Sin movimientos de salida.”.
5. Un pie con el stock restante y las notas de lectura.

Usa fechas en formato DD-MM-YYYY y separadores finos (---). No inventes datos.

## Datos del Lote
\`\`\`json
{{{json this}}}
\`\`\`
`,
});

// The main orchestration flow
const traceabilityFlow = ai.defineFlow(
  {
    name: 'traceabilityFlow',
    inputSchema: TraceabilityReportInputSchema,
    outputSchema: TraceabilityReportOutputSchema,
  },
  async (input) => {
    // --- PHASE 1 & 2: DATA FETCHING & TRANSACTIONAL READ PREP ---
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
    if(originTxn?.refId && originTxn.refCollection) refsToRead.set(`origin_${originTxn.refId}`, doc(db, originTxn.refCollection, originTxn.refId));
    downstreamTxns.forEach(txn => {
        if(txn.refId && txn.refCollection) refsToRead.set(`${txn.txnType}_${txn.refId}`, doc(db, txn.refCollection, txn.refId));
    });

    const docsRead = await Promise.all(
        Array.from(refsToRead.values()).map(ref => getDoc(ref))
    );
    const docsMap = new Map<string, DocumentSnapshot>();
    Array.from(refsToRead.keys()).forEach((key, index) => docsMap.set(key, docsRead[index]));

    // --- PHASE 3: PREPARE DATA FOR PROMPT ---
    const formatDDMMYYYY = (date: Date | string | null | undefined): string => {
        if (!date) return '_N/D_';
        const d = typeof date === 'string' ? parseISO(date) : date;
        if (!isValid(d)) return '_N/D_';
        return format(d, 'dd-MM-yyyy');
    };
    
    const totalOut = downstreamTxns.reduce((sum, txn) => sum + Math.abs(txn.qtyDelta || 0), 0);
    
    // Dynamically build the prompt data object to avoid 'undefined' properties
    const promptData: any = {
        internalBatchCode: batchDetails.internalBatchCode,
        productName: itemDetails.name,
        productSku: itemDetails.sku || '—',
        qtyInitial: batchDetails.qtyInitial,
        uom: itemDetails.uom,
        formattedCreatedAt: formatDDMMYYYY(batchDetails.createdAt),
        formattedExpiryDate: formatDDMMYYYY(batchDetails.expiryDate),
        supplierBatchCode: batchDetails.supplierBatchCode || '—',
        qtyRemaining: batchDetails.qtyRemaining,
        totalOut,
    };

    if (originTxn) {
        const originDoc = docsMap.get(`origin_${originTxn.refId}`);
        if(originDoc && originDoc.exists()){
            if (originTxn.txnType === 'recepcion') {
                promptData.reception = {
                    supplier: originDoc.data().supplier,
                    purchaseId: originTxn.refId,
                    date: formatDDMMYYYY(originTxn.date.toDate()),
                };
            } else if (originTxn.txnType === 'produccion') {
                const runData = originDoc.data() as ProductionRun;
                const componentsWithCost = await Promise.all((runData.consumedComponents || []).map(async (comp) => {
                    const batch = await getBatchDetails(comp.batchId);
                    const cost = (batch?.unitCost || 0) * comp.quantity;
                    const compItem = await getInventoryItem(comp.componentId);
                    return { ...comp, cost, uom: compItem?.uom || 'unit' };
                }));
                const totalCost = componentsWithCost.reduce((sum, comp) => sum + comp.cost, 0);

                promptData.production = {
                    runId: originTxn.refId,
                    date: formatDDMMYYYY(originTxn.date.toDate()),
                    components: componentsWithCost.map((c, index) => ({
                        index: index + 1,
                        componentName: c.componentName,
                        quantity: c.quantity,
                        uom: c.uom,
                        batchId: c.batchId,
                    })),
                    totalCostString: totalCost > 0 ? `${totalCost.toFixed(2)} €` : '',
                };
            }
        }
    }
    
    const consumptionData: any[] = [];
    const salesData: any[] = [];
    for (const txn of downstreamTxns) {
        if (!txn.refId || !txn.refCollection) continue;
        const docSnap = docsMap.get(`${txn.txnType}_${txn.refId}`);
        if (docSnap && docSnap.exists()) {
            if (txn.txnType === 'consumo') {
                const run = docSnap.data() as ProductionRun;
                consumptionData.push({
                    date: formatDDMMYYYY(txn.date.toDate()),
                    productName: run.productName,
                    quantity: -txn.qtyDelta,
                    uom: itemDetails.uom,
                    outputBatchId: run.outputBatchId || '—',
                });
            } else if (txn.txnType === 'venta') {
                const sale = docSnap.data() as DirectSale;
                salesData.push({
                    date: formatDDMMYYYY(txn.date.toDate()),
                    customerName: sale.customerName,
                    saleId: sale.id,
                    channel: sale.channel,
                    quantity: -txn.qtyDelta,
                });
            }
        }
    }
    
    if (consumptionData.length > 0) promptData.consumption = consumptionData;
    if (salesData.length > 0) promptData.sales = salesData;
    
    // --- PHASE 4: GENERATE REPORT ---
    const { output } = await reportGenerationPrompt(promptData as z.infer<typeof ReportDataSchema>);
    
    if (!output) {
      throw new Error("AI failed to format the final report.");
    }
    
    return output;
  }
);


export async function getTraceabilityReport(input: TraceabilityReportInput): Promise<TraceabilityReportOutput> {
    const result = await traceabilityFlow(input);
    return result;
}
