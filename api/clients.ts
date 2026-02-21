import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../db';
import { clients } from '../db/schema';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const all = await db.select().from(clients).orderBy(clients.name);
            return res.status(200).json(all);
        }

        if (req.method === 'POST') {
            const { id, name, contactPerson, phone } = req.body;
            if (!id || !name || !contactPerson || !phone) {
                return res.status(400).json({ error: 'Missing required fields: id, name, contactPerson, phone' });
            }
            const [created] = await db.insert(clients).values({ id, name, contactPerson, phone }).returning();
            return res.status(201).json(created);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error('[/api/clients]', err);
        return res.status(500).json({ error: err.message ?? 'Internal server error' });
    }
}
