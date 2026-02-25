import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text, integer, real, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

const trucksTable = pgTable('trucks', {
    id: text('id').primaryKey(),
    plateNumber: text('plate_number').notNull(),
    brand: text('brand').notNull(),
    model: text('model').notNull(),
    year: integer('year').notNull(),
    size: text('size').notNull(),
    clientId: text('client_id').notNull(),
    allocation: text('allocation'),
    currentOdometer: integer('current_odometer').notNull().default(0),
    lastServiceDate: text('last_service_date'),
    lastServiceOdometer: integer('last_service_odometer').default(0),
    serviceIntervalKm: integer('service_interval_km').notNull().default(10000),
    serviceIntervalMonths: integer('service_interval_months').notNull().default(6),
    stnkExpiry: text('stnk_expiry'),
    tax5yearExpiry: text('tax5year_expiry'),
    kirExpiry: text('kir_expiry'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

const schedulesTable = pgTable('service_schedules', {
    id: text('id').primaryKey(),
    truckId: text('truck_id').notNull(),
    serviceName: text('service_name').notNull(),
    intervalKm: integer('interval_km').notNull(),
    intervalMonths: integer('interval_months').notNull(),
    lastServiceDate: text('last_service_date'),
    lastServiceOdometer: integer('last_service_odometer').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

const recordsTable = pgTable('service_records', {
    id: text('id').primaryKey(),
    truckId: text('truck_id').notNull(),
});

const partsTable = pgTable('spare_parts', {
    id: text('id').primaryKey(),
    serviceRecordId: text('service_record_id').notNull(),
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
        return res.status(400).json({ error: 'Missing truck id' });
    }

    try {
        const db = getDb();

        if (req.method === 'GET') {
            const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.id, id));
            if (!truck) return res.status(404).json({ error: 'Truck not found' });

            const schedules = await db.select().from(schedulesTable).where(eq(schedulesTable.truckId, id));
            return res.status(200).json({ ...truck, schedules });
        }

        if (req.method === 'PUT') {
            let body = req.body;
            if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
            body = body || {};

            const { plateNumber, brand, model, year, size, clientId, allocation,
                currentOdometer, lastServiceDate, lastServiceOdometer,
                serviceIntervalKm, serviceIntervalMonths,
                stnkExpiry, tax5yearExpiry, kirExpiry,
                schedules } = body;

            const [updated] = await db.update(trucksTable)
                .set({ plateNumber, brand, model, year, size, clientId, allocation, currentOdometer, lastServiceDate, lastServiceOdometer, serviceIntervalKm, serviceIntervalMonths, stnkExpiry, tax5yearExpiry, kirExpiry })
                .where(eq(trucksTable.id, id)).returning();

            if (!updated) return res.status(404).json({ error: 'Truck not found' });

            if (schedules && Array.isArray(schedules)) {
                await db.delete(schedulesTable).where(eq(schedulesTable.truckId, id));
                if (schedules.length > 0) {
                    const vals = schedules.map((s: any) => ({
                        id: s.id, truckId: id, serviceName: s.serviceName,
                        intervalKm: s.intervalKm, intervalMonths: s.intervalMonths,
                        lastServiceDate: s.lastServiceDate ?? null,
                        lastServiceOdometer: s.lastServiceOdometer ?? 0,
                    }));
                    await db.insert(schedulesTable).values(vals);
                }
            }

            const updatedSchedules = await db.select().from(schedulesTable).where(eq(schedulesTable.truckId, id));
            return res.status(200).json({ ...updated, schedules: updatedSchedules });
        }

        if (req.method === 'DELETE') {
            const records = await db.select().from(recordsTable).where(eq(recordsTable.truckId, id));
            for (const r of records) {
                await db.delete(partsTable).where(eq(partsTable.serviceRecordId, r.id));
            }
            await db.delete(recordsTable).where(eq(recordsTable.truckId, id));
            await db.delete(schedulesTable).where(eq(schedulesTable.truckId, id));
            await db.delete(trucksTable).where(eq(trucksTable.id, id));
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error(`[/api/trucks/${id}]`, err);
        return res.status(500).json({ error: err.message ?? 'Internal server error' });
    }
}
