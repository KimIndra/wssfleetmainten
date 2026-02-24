import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createDb } from '../db';
import { clients } from '../db/schema';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const db = createDb();

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

            const { name, contactPerson, phone } = body as {
                name?: string;
                contactPerson?: string;
                phone?: string;
            };

            if (!name) return res.status(400).json({ error: 'Field "name" wajib diisi' });
            if (!contactPerson) return res.status(400).json({ error: 'Field "contactPerson" wajib diisi' });
            if (!phone) return res.status(400).json({ error: 'Field "phone" wajib diisi' });

            const id = `c-${Date.now()}`;
            const result = await db.insert(clients).values({ id, name, contactPerson, phone }).returning();
            const created = result[0];

            if (!created) return res.status(500).json({ error: 'Insert berhasil tapi data tidak dikembalikan' });

            return res.status(201).json(created);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error('[/api/clients] Error:', err);
        return res.status(500).json({
            error: err.message || err.code || String(err) || 'Internal server error',
            code: err.code,
        });
    }
}
