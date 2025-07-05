
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
import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ItemBatch, StockTxn, ProductionRun, DirectSale, InventoryItem } from '@/types';
import { fromFirestoreItemBatch } from '@/services/utils/firestore-converters';

// Zod schemas remain local to the file
const TraceabilityReportInputSchema = z.object({
  batchId: z.string().describe('The document ID or internal batch code of the batch to trace.'),
});
export type TraceabilityReportInput = z.infer<typeof TraceabilityReportInputSchema>;

const TraceabilityReportOutputSchema = z.object({
  report: z.string().describe('The full traceability report in Markdown format.'),
});
export type TraceabilityReportOutput = z.infer<typeof TraceabilityReportOutputSchema>;

// Helper function to fetch batch details by either ID or internal code
async function getBatchDetails(batchIdOrCode: string): Promise<ItemBatch | null> {
    if (!batchIdOrCode) return null;

    // First, try to get by document ID
    const batchRef = doc(db, 'itemBatches', batchIdOrCode);
    const batchSnap = await getDoc(batchRef);
    if (batchSnap.exists()) {
        return fromFirestoreItemBatch(batchSnap);
    }

    // If not found by ID, query by internalBatchCode
    const q = query(collection(db, 'itemBatches'), where('internalBatchCode', '==', batchIdOrCode), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return fromFirestoreItemBatch(doc);
    }

    return null;
}

// Helper function to fetch inventory item details
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
    } as InventoryItem;
}

// The data schema for the AI prompt
const ReportDataSchema = z.object({
  batchId: z.string(),
  batchDetails: z.any().optional(),
  itemDetails: z.any().optional(),
  reception: z.any().optional(),
  production: z.any().optional(),
  consumption: z.array(z.any()).optional(),
  sales: z.array(z.any()).optional(),
});


// The prompt for generating the report from structured data
const reportGenerationPrompt = ai.definePrompt({
  name: 'reportGenerationPrompt',
  input: { schema: ReportDataSchema },
  output: { schema: TraceabilityReportOutputSchema },
  prompt: `You are an expert in supply chain and food safety traceability for Santa Brisa.
Your task is to generate a detailed, clear, and professional traceability report in Markdown format using ONLY the JSON data provided.

## Traceability Report for Batch: \`{{{batchId}}}\`

### 1. Batch Details
- **Product:** {{{itemDetails.name}}} (SKU: {{{itemDetails.sku}}})
- **Internal Batch Code:** {{{batchDetails.internalBatchCode}}}
- **Supplier Batch Code:** {{{batchDetails.supplierBatchCode}}}
- **Quantity Produced/Received:** {{{batchDetails.qtyInitial}}} {{{batchDetails.uom}}}
- **Creation Date:** {{{batchDetails.createdAt}}}
- **Expiry Date:** {{{batchDetails.expiryDate}}}

---

{{#if reception}}
### 2. Upward Traceability (Origin)
This batch was received from a supplier.
- **Supplier:** {{{reception.supplier}}}
- **Purchase ID:** \`{{{reception.purchaseId}}}\`
- **Reception Date:** {{{reception.date}}}
{{/if}}

{{#if production}}
### 2. Upward Traceability (Origin)
This batch was produced internally.
- **Production Run ID:** \`{{{production.runId}}}\`
- **Production Date:** {{{production.date}}}
- **Components Consumed:**
{{#each production.components}}
  - **{{this.componentName}} ({{this.quantity}} units)** from Batch: \`{{this.batchId}}\`
{{/each}}
{{/if}}

---

{{#if consumption.length}}
### 3. Downward Traceability (Consumption)
This batch of raw material was consumed in the following production runs:
{{#each consumption}}
- **{{this.quantity}} units** consumed in **Production Run \`{{this.runId}}\`** to produce **{{this.productName}}** (Batch: \`{{this.outputBatchId}}\`) on {{this.date}}.
{{/each}}
{{/if}}

{{#if sales.length}}
### 3. Downward Traceability (Sales)
This batch of finished product was sold to the following customers:
{{#each sales}}
- **{{this.quantity}} units** sold to **{{this.customerName}}** via Direct Sale \`{{this.saleId}}\` on {{this.date}}.
{{/each}}
{{/if}}

{{#unless reception}}{{#unless production}}{{#unless consumption.length}}{{#unless sales.length}}
### No Traceability Information Found
No production, consumption, or sales records could be found for this batch ID in the system.
{{/unless}}{{/unless}}{{/unless}}{{/unless}}
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
    // 1. Get Batch and Item details (foundational info)
    const batchDetails = await getBatchDetails(input.batchId);

    if (!batchDetails) {
        throw new Error(`No se encontró ningún lote con el identificador: "${input.batchId}"`);
    }

    const itemDetails = await getInventoryItem(batchDetails.inventoryItemId);

    if (!itemDetails) {
        throw new Error(`Error de integridad: El artículo de inventario (ID: ${batchDetails.inventoryItemId}) para el lote ${batchDetails.internalBatchCode} no fue encontrado.`);
    }

    const reportData: z.infer<typeof ReportDataSchema> = {
        batchId: input.batchId,
        batchDetails: { ...batchDetails, createdAt: new Date(batchDetails.createdAt).toLocaleDateString('es-ES') },
        itemDetails: itemDetails,
    };
    
    // 2. Fetch ALL transactions for this batch in one go to avoid composite indexes.
    const allTxnsQuery = query(collection(db, 'stockTxns'), where('batchId', '==', batchDetails.id));
    const allTxnsSnapshot = await getDocs(allTxnsQuery);
    const allTxnsForBatch = allTxnsSnapshot.docs.map(doc => doc.data() as StockTxn);

    // 3. Trace UPWARDS (how was this batch created?)
    const originTxn = allTxnsForBatch.find(txn => (txn.qtyDelta || 0) > 0);

    if (originTxn) {
        if (originTxn.txnType === 'recepcion' && originTxn.refId) {
            const purchaseRef = doc(db, 'purchases', originTxn.refId);
            const purchaseSnap = await getDoc(purchaseRef);
            if (purchaseSnap.exists()) {
                reportData.reception = {
                    purchaseId: originTxn.refId,
                    supplier: purchaseSnap.data().supplier,
                    date: originTxn.date.toDate().toLocaleDateString('es-ES'),
                };
            }
        } else if (originTxn.txnType === 'produccion' && originTxn.refId) {
            const runRef = doc(db, 'productionRuns', originTxn.refId);
            const runSnap = await getDoc(runRef);
            if (runSnap.exists()) {
                const runData = runSnap.data() as ProductionRun;
                reportData.production = {
                    runId: originTxn.refId,
                    date: originTxn.date.toDate().toLocaleDateString('es-ES'),
                    components: runData.consumedComponents || [],
                };
            }
        }
    }

    // 4. Trace DOWNWARDS (what happened to this batch?)
    const downstreamTxns = allTxnsForBatch.filter(txn => (txn.qtyDelta || 0) < 0);
    
    if (downstreamTxns.length > 0) {
        reportData.consumption = [];
        reportData.sales = [];

        for (const txn of downstreamTxns) {
            if (txn.txnType === 'consumo' && txn.refId) {
                const runRef = doc(db, 'productionRuns', txn.refId);
                const runSnap = await getDoc(runRef);
                if (runSnap.exists()) {
                    const run = runSnap.data() as ProductionRun;
                    reportData.consumption.push({
                        runId: txn.refId,
                        productName: run.productName,
                        outputBatchId: run.outputBatchId,
                        date: txn.date.toDate().toLocaleDateString('es-ES'),
                        quantity: -txn.qtyDelta,
                    });
                }
            } else if (txn.txnType === 'venta' && txn.refId) {
                const saleRef = doc(db, 'directSales', txn.refId);
                const saleSnap = await getDoc(saleRef);
                if (saleSnap.exists()) {
                    const sale = saleSnap.data() as DirectSale;
                    reportData.sales.push({
                        saleId: txn.refId,
                        customerName: sale.customerName,
                        date: txn.date.toDate().toLocaleDateString('es-ES'),
                        quantity: -txn.qtyDelta,
                    });
                }
            }
        }
    }

    // 5. Pass the complete dataset to the AI for formatting.
    const { output } = await reportGenerationPrompt(reportData);
    if (!output) throw new Error("AI failed to format the final report.");
    return output;
  }
);


export async function getTraceabilityReport(input: TraceabilityReportInput): Promise<TraceabilityReportOutput> {
    const result = await traceabilityFlow(input);
    return result;
}
