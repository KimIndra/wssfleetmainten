import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text, integer, real, timestamp } from 'drizzle-orm/pg-core';
import { desc } from 'drizzle-orm';

const tireStockTable = pgTable('tire_stock', {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    supplierName: text('supplier_name').notNull(),
    itemName: text('item_name').notNull(),
    quantity: integer('quantity').notNull().default(1),
    serialNumber: text('serial_number'),
    description: text('description'),
    price: real('price').notNull().default(0),
    status: text('status').notNull().default('available'),
    usedByTruckId: text('used_by_truck_id'),
    usedDate: text('used_date'),
    serviceRecordId: text('service_record_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

function getDb() {
    const url = process.env.DATABASE_URL!;
    return drizzle(neon(url.replace(/[&?]channel_binding=[^&]*/g, '')));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const db = getDb();

        // GET — list all tire stock
        if (req.method === 'GET') {
            const items = await db.select().from(tireStockTable).orderBy(desc(tireStockTable.createdAt));
            return res.status(200).json(items);
        }

        // POST — add new tire stock (Stock IN)
        if (req.method === 'POST') {
            let body = req.body;
            if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
            body = body || {};

            const { id, date, supplierName, itemName, quantity, serialNumber, description, price } = body;

            if (!id || !date || !supplierName || !itemName) {
                return res.status(400).json({ error: 'Missing required fields: id, date, supplierName, itemName' });
            }

            const [created] = await db.insert(tireStockTable).values({
                id,
                date,
                supplierName,
                itemName,
                quantity: quantity ?? 1,
                serialNumber: serialNumber ?? '',
                description: description ?? '',
                price: price ?? 0,
                status: 'available',
            }).returning();

            return res.status(201).json(created);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error('[/api/tire-stock]', err);
        return res.status(500).json({ error: err.message ?? 'Internal server error' });
    }
}
