import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

const clientsTable = pgTable('clients', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    contactPerson: text('contact_person').notNull(),
    phone: text('phone').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

const trucksTable = pgTable('trucks', {
    id: text('id').primaryKey(),
    plateNumber: text('plate_number').notNull(),
    brand: text('brand').notNull(),
    model: text('model').notNull(),
    year: integer('year').notNull(),
    size: text('size').notNull(),
    clientId: text('client_id').notNull(),
    allocation: text('allocation'),
    description: text('description'),
    engineNumber: text('engine_number'),
    chassisNumber: text('chassis_number'),
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
            const allTrucks = await db.select().from(trucksTable).orderBy(trucksTable.brand);
            const allSchedules = await db.select().from(schedulesTable);
            const allClients = await db.select().from(clientsTable);

            const result = allTrucks.map(truck => ({
                ...truck,
                schedules: allSchedules.filter(s => s.truckId === truck.id),
                client: allClients.find(c => c.id === truck.clientId) ?? null,
            }));

            return res.status(200).json(result);
        }

        if (req.method === 'POST') {
            let body = req.body;
            if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
            body = body || {};

            const { id, plateNumber, brand, model, year, size, clientId, allocation, description, engineNumber, chassisNumber,
                currentOdometer, lastServiceDate, lastServiceOdometer,
                serviceIntervalKm, serviceIntervalMonths,
                stnkExpiry, tax5yearExpiry, kirExpiry,
                schedules = [] } = body;

            if (!id || !plateNumber || !brand || !model || !year || !size || !clientId) {
                return res.status(400).json({ error: 'Missing required truck fields' });
            }

            const [created] = await db.insert(trucksTable).values({
                id, plateNumber, brand, model, year, size, clientId,
                allocation: allocation ?? null,
                description: description ?? null,
                engineNumber: engineNumber ?? null,
                chassisNumber: chassisNumber ?? null,
                currentOdometer: currentOdometer ?? 0,
                lastServiceDate: lastServiceDate ?? null,
                lastServiceOdometer: lastServiceOdometer ?? 0,
                serviceIntervalKm: serviceIntervalKm ?? 10000,
                serviceIntervalMonths: serviceIntervalMonths ?? 6,
                stnkExpiry: stnkExpiry ?? null,
                tax5yearExpiry: tax5yearExpiry ?? null,
                kirExpiry: kirExpiry ?? null,
            }).returning();

            if (schedules.length > 0) {
                const newSchedules = schedules.map((s: any) => ({
                    id: s.id, truckId: id, serviceName: s.serviceName,
                    intervalKm: s.intervalKm, intervalMonths: s.intervalMonths,
                    lastServiceDate: s.lastServiceDate ?? null,
                    lastServiceOdometer: s.lastServiceOdometer ?? 0,
                }));
                await db.insert(schedulesTable).values(newSchedules);
            }

            const insertedSchedules = await db.select().from(schedulesTable).where(eq(schedulesTable.truckId, id));
            return res.status(201).json({ ...created, schedules: insertedSchedules });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error('[/api/trucks]', err);
        return res.status(500).json({ error: err.message ?? 'Internal server error' });
    }
}
