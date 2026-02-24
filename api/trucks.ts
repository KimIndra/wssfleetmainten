import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { trucks, serviceSchedules, clients } from './_schema';
import { eq } from 'drizzle-orm';

function getDb() {
    const url = process.env.DATABASE_URL!;
    const cleanUrl = url.replace(/[&?]channel_binding=[^&]*/g, '');
    return drizzle(neon(cleanUrl));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const db = getDb();

        if (req.method === 'GET') {
            const allTrucks = await db.select().from(trucks).orderBy(trucks.brand);
            const allSchedules = await db.select().from(serviceSchedules);
            const allClients = await db.select().from(clients);

            const result = allTrucks.map(truck => ({
                ...truck,
                schedules: allSchedules.filter(s => s.truckId === truck.id),
                client: allClients.find(c => c.id === truck.clientId) ?? null,
            }));

            return res.status(200).json(result);
        }

        if (req.method === 'POST') {
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch { body = {}; }
            }
            body = body || {};

            const {
                id, plateNumber, brand, model, year, size, tonnage, clientId,
                currentOdometer, lastServiceDate, lastServiceOdometer,
                serviceIntervalKm, serviceIntervalMonths, schedules = []
            } = body;

            if (!id || !plateNumber || !brand || !model || !year || !size || !tonnage || !clientId) {
                return res.status(400).json({ error: 'Missing required truck fields' });
            }

            const [created] = await db.insert(trucks).values({
                id, plateNumber, brand, model, year, size, tonnage, clientId,
                currentOdometer: currentOdometer ?? 0,
                lastServiceDate: lastServiceDate ?? null,
                lastServiceOdometer: lastServiceOdometer ?? 0,
                serviceIntervalKm: serviceIntervalKm ?? 10000,
                serviceIntervalMonths: serviceIntervalMonths ?? 6,
            }).returning();

            if (schedules.length > 0) {
                const newSchedules = schedules.map((s: any) => ({
                    id: s.id,
                    truckId: id,
                    serviceName: s.serviceName,
                    intervalKm: s.intervalKm,
                    intervalMonths: s.intervalMonths,
                    lastServiceDate: s.lastServiceDate ?? null,
                    lastServiceOdometer: s.lastServiceOdometer ?? 0,
                }));
                await db.insert(serviceSchedules).values(newSchedules);
            }

            const insertedSchedules = await db.select().from(serviceSchedules).where(eq(serviceSchedules.truckId, id));
            return res.status(201).json({ ...created, schedules: insertedSchedules });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error('[/api/trucks]', err);
        return res.status(500).json({ error: err.message ?? 'Internal server error' });
    }
}
