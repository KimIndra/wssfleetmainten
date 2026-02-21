import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../db';
import { serviceRecords, spareParts, trucks, serviceSchedules } from '../../db/schema';
import type { NewServiceSchedule } from '../../db/schema';
import { eq } from 'drizzle-orm';

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
        if (req.method === 'GET') {
            const [truck] = await db.select().from(trucks).where(eq(trucks.id, id));
            if (!truck) return res.status(404).json({ error: 'Truck not found' });

            const schedules = await db.select().from(serviceSchedules).where(eq(serviceSchedules.truckId, id));
            return res.status(200).json({ ...truck, schedules });
        }

        if (req.method === 'PUT') {
            const body = req.body as {
                plateNumber?: string;
                brand?: string;
                model?: string;
                year?: number;
                size?: 'Small' | 'Big';
                tonnage?: number;
                clientId?: string;
                currentOdometer?: number;
                lastServiceDate?: string | null;
                lastServiceOdometer?: number;
                serviceIntervalKm?: number;
                serviceIntervalMonths?: number;
                schedules?: Array<{ id: string; serviceName: string; intervalKm: number; intervalMonths: number; lastServiceDate?: string; lastServiceOdometer?: number }>;
            };

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
                    const newSchedules: NewServiceSchedule[] = schedules.map(s => ({
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
