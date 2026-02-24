import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { serviceRecords, spareParts, trucks, serviceSchedules } from './_schema';
import { eq, desc } from 'drizzle-orm';

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
            const records = await db.select().from(serviceRecords).orderBy(desc(serviceRecords.serviceDate));
            const parts = await db.select().from(spareParts);

            const result = records.map(r => ({
                ...r,
                parts: parts.filter(p => p.serviceRecordId === r.id),
            }));

            return res.status(200).json(result);
        }

        if (req.method === 'POST') {
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch { body = {}; }
            }
            body = body || {};

            const { id, truckId, serviceDate, odometer, serviceTypes, description, parts = [], laborCost, totalCost, mechanic } = body;

            if (!id || !truckId || !serviceDate || !odometer || !serviceTypes || !description || !mechanic) {
                return res.status(400).json({ error: 'Missing required service record fields' });
            }

            const [created] = await db.insert(serviceRecords).values({
                id, truckId, serviceDate, odometer, serviceTypes, description, laborCost, totalCost, mechanic
            }).returning();

            if (parts.length > 0) {
                const newParts = parts.map((p: any) => ({ ...p, serviceRecordId: id }));
                await db.insert(spareParts).values(newParts);
            }

            const [truck] = await db.select().from(trucks).where(eq(trucks.id, truckId));
            if (truck) {
                await db.update(trucks).set({
                    lastServiceDate: serviceDate,
                    lastServiceOdometer: odometer,
                    currentOdometer: Math.max(truck.currentOdometer, odometer),
                }).where(eq(trucks.id, truckId));

                const schedules = await db.select().from(serviceSchedules).where(eq(serviceSchedules.truckId, truckId));
                for (const schedule of schedules) {
                    const matched = serviceTypes.some((type: string) =>
                        type.toLowerCase() === schedule.serviceName.toLowerCase()
                    );
                    if (matched) {
                        await db.update(serviceSchedules).set({
                            lastServiceDate: serviceDate,
                            lastServiceOdometer: odometer,
                        }).where(eq(serviceSchedules.id, schedule.id));
                    }
                }
            }

            const insertedParts = await db.select().from(spareParts).where(eq(spareParts.serviceRecordId, id));
            return res.status(201).json({ ...created, parts: insertedParts });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error('[/api/services]', err);
        return res.status(500).json({ error: err.message ?? 'Internal server error' });
    }
}
