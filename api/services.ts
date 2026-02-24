import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text, integer, real, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { eq, desc } from 'drizzle-orm';

const trucksTable = pgTable('trucks', {
    id: text('id').primaryKey(),
    currentOdometer: integer('current_odometer').notNull().default(0),
    lastServiceDate: text('last_service_date'),
    lastServiceOdometer: integer('last_service_odometer').default(0),
});

const schedulesTable = pgTable('service_schedules', {
    id: text('id').primaryKey(),
    truckId: text('truck_id').notNull(),
    serviceName: text('service_name').notNull(),
    lastServiceDate: text('last_service_date'),
    lastServiceOdometer: integer('last_service_odometer').default(0),
});

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const db = getDb();

        if (req.method === 'GET') {
            const records = await db.select().from(recordsTable).orderBy(desc(recordsTable.serviceDate));
            const parts = await db.select().from(partsTable);
            const result = records.map(r => ({
                ...r,
                parts: parts.filter(p => p.serviceRecordId === r.id),
            }));
            return res.status(200).json(result);
        }

        if (req.method === 'POST') {
            let body = req.body;
            if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
            body = body || {};

            const { id, truckId, serviceDate, odometer, serviceTypes, description, parts = [], laborCost, totalCost, mechanic } = body;

            if (!id || !truckId || !serviceDate || !odometer || !serviceTypes || !description || !mechanic) {
                return res.status(400).json({ error: 'Missing required service record fields' });
            }

            const [created] = await db.insert(recordsTable).values({
                id, truckId, serviceDate, odometer, serviceTypes, description, laborCost, totalCost, mechanic
            }).returning();

            if (parts.length > 0) {
                const newParts = parts.map((p: any) => ({ ...p, serviceRecordId: id }));
                await db.insert(partsTable).values(newParts);
            }

            // Update truck
            const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.id, truckId));
            if (truck) {
                await db.update(trucksTable).set({
                    lastServiceDate: serviceDate,
                    lastServiceOdometer: odometer,
                    currentOdometer: Math.max(truck.currentOdometer, odometer),
                }).where(eq(trucksTable.id, truckId));

                // Update matching schedules
                const schedules = await db.select().from(schedulesTable).where(eq(schedulesTable.truckId, truckId));
                for (const schedule of schedules) {
                    if (serviceTypes.some((t: string) => t.toLowerCase() === schedule.serviceName.toLowerCase())) {
                        await db.update(schedulesTable).set({
                            lastServiceDate: serviceDate,
                            lastServiceOdometer: odometer,
                        }).where(eq(schedulesTable.id, schedule.id));
                    }
                }
            }

            const insertedParts = await db.select().from(partsTable).where(eq(partsTable.serviceRecordId, id));
            return res.status(201).json({ ...created, parts: insertedParts });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error('[/api/services]', err);
        return res.status(500).json({ error: err.message ?? 'Internal server error' });
    }
}
