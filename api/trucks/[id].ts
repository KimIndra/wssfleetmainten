import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { serviceRecords, spareParts, trucks, serviceSchedules } from '../_schema';
import { eq } from 'drizzle-orm';

function getDb() {
    const url = process.env.DATABASE_URL!;
    const cleanUrl = url.replace(/[&?]channel_binding=[^&]*/g, '');
    return drizzle(neon(cleanUrl));
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
            const [truck] = await db.select().from(trucks).where(eq(trucks.id, id));
            if (!truck) return res.status(404).json({ error: 'Truck not found' });

            const schedules = await db.select().from(serviceSchedules).where(eq(serviceSchedules.truckId, id));
            return res.status(200).json({ ...truck, schedules });
        }

        if (req.method === 'PUT') {
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch { body = {}; }
            }
            body = body || {};

            const {
                plateNumber, brand, model, year, size, tonnage, clientId,
                currentOdometer, lastServiceDate, lastServiceOdometer,
                serviceIntervalKm, serviceIntervalMonths, schedules
            } = body;

            const [updated] = await db
                .update(trucks)
                .set({ plateNumber, brand, model, year, size, tonnage, clientId, currentOdometer, lastServiceDate, lastServiceOdometer, serviceIntervalKm, serviceIntervalMonths })
                .where(eq(trucks.id, id))
                .returning();

            if (!updated) return res.status(404).json({ error: 'Truck not found' });

            if (schedules && Array.isArray(schedules)) {
                await db.delete(serviceSchedules).where(eq(serviceSchedules.truckId, id));
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
            }

            const updatedSchedules = await db.select().from(serviceSchedules).where(eq(serviceSchedules.truckId, id));
            return res.status(200).json({ ...updated, schedules: updatedSchedules });
        }

        if (req.method === 'DELETE') {
            const records = await db.select().from(serviceRecords).where(eq(serviceRecords.truckId, id));
            for (const r of records) {
                await db.delete(spareParts).where(eq(spareParts.serviceRecordId, r.id));
            }
            await db.delete(serviceRecords).where(eq(serviceRecords.truckId, id));
            await db.delete(serviceSchedules).where(eq(serviceSchedules.truckId, id));
            await db.delete(trucks).where(eq(trucks.id, id));
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error(`[/api/trucks/${id}]`, err);
        return res.status(500).json({ error: err.message ?? 'Internal server error' });
    }
}
