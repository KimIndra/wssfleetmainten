import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { clients } from './_schema';

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
            const all = await db.select().from(clients).orderBy(clients.name);
            return res.status(200).json(all);
        }

        if (req.method === 'POST') {
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch { body = {}; }
            }
            body = body || {};

            const { name, contactPerson, phone } = body;

            if (!name) return res.status(400).json({ error: 'Field "name" wajib diisi' });
            if (!contactPerson) return res.status(400).json({ error: 'Field "contactPerson" wajib diisi' });
            if (!phone) return res.status(400).json({ error: 'Field "phone" wajib diisi' });

            const id = `c-${Date.now()}`;
            const [created] = await db.insert(clients).values({ id, name, contactPerson, phone }).returning();
            return res.status(201).json(created);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error('[/api/clients]', err);
        return res.status(500).json({ error: err.message ?? 'Internal server error' });
    }
}
