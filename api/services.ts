import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createDb } from '../db';
import { serviceRecords, spareParts, trucks, serviceSchedules } from '../db/schema';
import type { NewServiceRecord, NewSparePart } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const db = createDb();

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

            // 1. Insert service record
            const newRecord: NewServiceRecord = { id, truckId, serviceDate, odometer, serviceTypes, description, laborCost, totalCost, mechanic };
            const [created] = await db.insert(serviceRecords).values(newRecord).returning();

            // 2. Insert spare parts
            if (parts.length > 0) {
                const newParts: NewSparePart[] = parts.map((p: any) => ({ ...p, serviceRecordId: id }));
                await db.insert(spareParts).values(newParts);
            }

            // 3. Update truck: lastServiceDate, lastServiceOdometer, currentOdometer
            const [truck] = await db.select().from(trucks).where(eq(trucks.id, truckId));
            if (truck) {
                await db.update(trucks).set({
                    lastServiceDate: serviceDate,
                    lastServiceOdometer: odometer,
                    currentOdometer: Math.max(truck.currentOdometer, odometer),
                }).where(eq(trucks.id, truckId));

                // 4. Update matching schedules
                const schedules = await db.select().from(serviceSchedules).where(eq(serviceSchedules.truckId, truckId));
                for (const schedule of schedules) {
                    const matched = serviceTypes.some((type: string) =>
                        type.toLowerCase() === schedule.serviceName.toLowerCase() ||
                        (type === 'Oil Change' && schedule.serviceName === 'Ganti Oli') ||
                        (type === 'Regular' && schedule.serviceName === 'Service Rutin')
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
