import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text, integer, real, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

const recordsTable = pgTable('service_records', {
    id: text('id').primaryKey(),
    truckId: text('truck_id').notNull(),
    serviceDate: text('service_date').notNull(),
    odometer: integer('odometer').notNull(),
    serviceTypes: jsonb('service_types').notNull().$type<string[]>(),
    description: text('description').notNull(),
    laborCost: real('labor_cost').notNull().default(0),
    totalCost: real('total_cost').notNull().default(0),
    mechanic: text('mechanic').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

const partsTable = pgTable('spare_parts', {
    id: text('id').primaryKey(),
    serviceRecordId: text('service_record_id').notNull(),
    name: text('name').notNull(),
    partNumber: text('part_number').notNull(),
    price: real('price').notNull().default(0),
    quantity: integer('quantity').notNull().default(1),
});

function getDb() {
    const url = process.env.DATABASE_URL!;
    return drizzle(neon(url.replace(/[&?]channel_binding=[^&]*/g, '')));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing service record id' });

    try {
        const db = getDb();

        if (req.method === 'GET') {
            const [record] = await db.select().from(recordsTable).where(eq(recordsTable.id, id));
            if (!record) return res.status(404).json({ error: 'Service record not found' });
            const parts = await db.select().from(partsTable).where(eq(partsTable.serviceRecordId, id));
            return res.status(200).json({ ...record, parts });
        }

        if (req.method === 'DELETE') {
            await db.delete(partsTable).where(eq(partsTable.serviceRecordId, id));
            await db.delete(recordsTable).where(eq(recordsTable.id, id));
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error(`[/api/services/${id}]`, err);
        return res.status(500).json({ error: err.message ?? 'Internal server error' });
    }
}
