import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text, integer, real, timestamp } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Missing tire stock ID' });
    }

    try {
        const db = getDb();

        // PUT — update tire stock (mark as used / Stock OUT, or edit)
        if (req.method === 'PUT') {
            let body = req.body;
            if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
            body = body || {};

            const updateData: any = {};
            if (body.date !== undefined) updateData.date = body.date;
            if (body.supplierName !== undefined) updateData.supplierName = body.supplierName;
            if (body.itemName !== undefined) updateData.itemName = body.itemName;
            if (body.quantity !== undefined) updateData.quantity = body.quantity;
            if (body.serialNumber !== undefined) updateData.serialNumber = body.serialNumber;
            if (body.description !== undefined) updateData.description = body.description;
            if (body.price !== undefined) updateData.price = body.price;
            if (body.status !== undefined) updateData.status = body.status;
            if (body.usedByTruckId !== undefined) updateData.usedByTruckId = body.usedByTruckId;
            if (body.usedDate !== undefined) updateData.usedDate = body.usedDate;
            if (body.serviceRecordId !== undefined) updateData.serviceRecordId = body.serviceRecordId;

            const [updated] = await db.update(tireStockTable)
                .set(updateData)
                .where(eq(tireStockTable.id, id))
                .returning();

            if (!updated) {
                return res.status(404).json({ error: 'Tire stock item not found' });
            }

            return res.status(200).json(updated);
        }

        // DELETE — remove tire stock item
        if (req.method === 'DELETE') {
            const [deleted] = await db.delete(tireStockTable)
                .where(eq(tireStockTable.id, id))
                .returning();

            if (!deleted) {
                return res.status(404).json({ error: 'Tire stock item not found' });
            }

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error('[/api/tire-stock/[id]]', err);
        return res.status(500).json({ error: err.message ?? 'Internal server error' });
    }
}
