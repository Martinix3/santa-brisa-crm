"use server";
import 'server-only';

import { adminDb } from '@/lib/firebaseAdmin';
import { getAccountByIdFS } from './account-service';
import type { Account, Order } from '@/types';
import { fromFirestoreOrder } from './order-service';

/**
 * Traverses a document (or any object) and infers a schema.
 * This is a simplified version for demonstration.
 */
function inferSchema(docs: any[], collectionName: string) {
    const schema: Record<string, any> = {};

    const traverse = (obj: any, path: string) => {
        if (obj === null || obj === undefined) return;
        
        Object.keys(obj).forEach(key => {
            const currentPath = path ? `${path}.${key}` : key;
            const value = obj[key];
            const type = Array.isArray(value) ? 'array' : typeof value;

            if (!schema[currentPath]) {
                schema[currentPath] = { types: new Set(), samples: [], count: 0 };
            }

            schema[currentPath].types.add(type);
            schema[currentPath].count++;
            if (schema[currentPath].samples.length < 3) {
                schema[currentPath].samples.push(value);
            }
        });
    };

    docs.forEach(doc => traverse(doc, ''));
    
    // Convert sets to arrays for JSON serialization
    Object.keys(schema).forEach(key => {
        schema[key].types = Array.from(schema[key].types);
    });

    return schema;
}

/**
 * Calculates aggregate metrics from related documents.
 */
function calculateMetrics(account: Account, relatedData: Record<string, any[]>) {
    const metrics: Record<string, any> = {
        collections: Object.keys(relatedData).length,
        docsCount: Object.values(relatedData).reduce((sum, docs) => sum + docs.length, 0),
        totalAmount: 0,
        sampleImages: [],
    };

    if (relatedData.orders) {
        metrics.totalAmount = relatedData.orders.reduce((sum, order) => sum + (order.amount || order.total || 0), 0);
        relatedData.orders.forEach((order: any) => {
            if (order.imageUrl) metrics.sampleImages.push(order.imageUrl);
        });
    }

    return metrics;
}

/**
 * Finds potential duplicate accounts based on name and city.
 */
async function findDuplicates(currentAccount: Account): Promise<any[]> {
    if (!currentAccount.name) return [];

    const q = adminDb.collection('accounts').where('name', '==', currentAccount.name);
    const snapshot = await q.get();

    const duplicates = [];
    for (const doc of snapshot.docs) {
        if (doc.id !== currentAccount.id) {
            duplicates.push({ id: doc.id, ...doc.data() });
        }
    }
    return duplicates;
}

/**
 * Main service function to aggregate all debug information for an account.
 */
export async function getAccountDebugInfo(accountId: string) {
    // 1. Fetch the main account
    const account = await getAccountByIdFS(accountId);
    if (!account) {
        throw new Error(`Account with ID "${accountId}" not found.`);
    }

    // 2. Fetch related data
    const relatedCollections = {
        orders: adminDb.collection('orders').where('accountId', '==', accountId),
        events: adminDb.collection('events').where('accountId', '==', accountId),
        sampleRequests: adminDb.collection('sampleRequests').where('accountId', '==', accountId),
        // Add other collections here if needed, e.g., tasks, shipments
    };
    
    const relatedData: Record<string, any[]> = {};
    for (const [key, query] of Object.entries(relatedCollections)) {
        const snapshot = await query.get();
        // A simple converter based on the collection name
        const converter = key === 'orders' ? fromFirestoreOrder : (d: any) => ({ id: d.id, ...d.data() });
        relatedData[key] = snapshot.docs.map(converter);
    }
    
    // 3. Infer Schema
    const schema = {
        account: inferSchema([account], 'accounts'),
        ...Object.fromEntries(Object.entries(relatedData).map(([key, docs]) => [key, inferSchema(docs, key)]))
    };

    // 4. Calculate Metrics
    const metrics = calculateMetrics(account, relatedData);

    // 5. Find Duplicates
    const duplicates = await findDuplicates(account);

    // 6. Assemble the final report
    return {
        account,
        related: relatedData,
        schema,
        metrics,
        duplicates,
    };
}
