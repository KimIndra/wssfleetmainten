import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { trucks } from '../../_schema';
import { eq, sql } from 'drizzle-orm';

function getDb() {
    const url = process.env.DATABASE_URL!;
    const cleanUrl = url.replace(/[&?]channel_binding=[^&]*/g, '');
    return drizzle(neon(cleanUrl));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Missing truck id' });
    }

    if (req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const { addedKm } = body;

    if (typeof addedKm !== 'number' || addedKm < 0) {
        return res.status(400).json({ error: 'addedKm must be a non-negative number' });
    }

    try {
        const db = getDb();

        const [updated] = await db
            .update(trucks)
            .set({ currentOdometer: sql<number>`${trucks.currentOdometer} + ${addedKm}` })
            .where(eq(trucks.id, id))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Truck not found' });

        return res.status(200).json(updated);
    } catch (err: any) {
        console.error(`[/api/trucks/${id}/odometer]`, err);
        return res.status(500).json({ error: err.message ?? 'Internal server error' });
    }
}
