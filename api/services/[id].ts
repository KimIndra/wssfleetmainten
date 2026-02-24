import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { serviceRecords, spareParts } from '../_schema';
import { eq } from 'drizzle-orm';

function getDb() {
    const url = process.env.DATABASE_URL!;
    const cleanUrl = url.replace(/[&?]channel_binding=[^&]*/g, '');
    return drizzle(neon(cleanUrl));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Missing service record id' });
    }

    try {
        const db = getDb();

        if (req.method === 'GET') {
            const [record] = await db.select().from(serviceRecords).where(eq(serviceRecords.id, id));
            if (!record) return res.status(404).json({ error: 'Service record not found' });

            const parts = await db.select().from(spareParts).where(eq(spareParts.serviceRecordId, id));
            return res.status(200).json({ ...record, parts });
        }

        if (req.method === 'DELETE') {
            await db.delete(spareParts).where(eq(spareParts.serviceRecordId, id));
            await db.delete(serviceRecords).where(eq(serviceRecords.id, id));
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error(`[/api/services/${id}]`, err);
        return res.status(500).json({ error: err.message ?? 'Internal server error' });
    }
}
