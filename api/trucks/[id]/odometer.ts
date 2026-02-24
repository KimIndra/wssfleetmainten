import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text, integer } from 'drizzle-orm/pg-core';
import { eq, sql } from 'drizzle-orm';

const trucksTable = pgTable('trucks', {
    id: text('id').primaryKey(),
    currentOdometer: integer('current_odometer').notNull().default(0),
});

function getDb() {
    const url = process.env.DATABASE_URL!;
    return drizzle(neon(url.replace(/[&?]channel_binding=[^&]*/g, '')));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing truck id' });
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};
    const { addedKm } = body;

    if (typeof addedKm !== 'number' || addedKm < 0) {
        return res.status(400).json({ error: 'addedKm must be a non-negative number' });
    }

    try {
        const db = getDb();
        const [updated] = await db.update(trucksTable)
            .set({ currentOdometer: sql<number>`${trucksTable.currentOdometer} + ${addedKm}` })
            .where(eq(trucksTable.id, id)).returning();

        if (!updated) return res.status(404).json({ error: 'Truck not found' });
        return res.status(200).json(updated);
    } catch (err: any) {
        console.error(`[/api/trucks/${id}/odometer]`, err);
        return res.status(500).json({ error: err.message ?? 'Internal server error' });
    }
}
