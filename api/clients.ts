import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

const clientsTable = pgTable('clients', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    contactPerson: text('contact_person').notNull(),
    phone: text('phone').notNull(),
    allocations: jsonb('allocations').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

function getDb() {
    const url = process.env.DATABASE_URL!;
    return drizzle(neon(url.replace(/[&?]channel_binding=[^&]*/g, '')));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const db = getDb();

        if (req.method === 'GET') {
            const all = await db.select().from(clientsTable).orderBy(clientsTable.name);
            return res.status(200).json(all);
        }

        if (req.method === 'POST') {
            let body = req.body;
            if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
            body = body || {};

            const { name, contactPerson, phone, allocations } = body;
            if (!name) return res.status(400).json({ error: 'Field "name" wajib diisi' });
            if (!contactPerson) return res.status(400).json({ error: 'Field "contactPerson" wajib diisi' });
            if (!phone) return res.status(400).json({ error: 'Field "phone" wajib diisi' });

            const id = `c-${Date.now()}`;
            const [created] = await db.insert(clientsTable).values({ id, name, contactPerson, phone, allocations: allocations || [] }).returning();
            return res.status(201).json(created);
        }

        if (req.method === 'PUT') {
            let body = req.body;
            if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
            body = body || {};

            const { id, name, contactPerson, phone, allocations } = body;
            if (!id) return res.status(400).json({ error: 'Field "id" wajib diisi' });

            const updateData: any = {};
            if (name !== undefined) updateData.name = name;
            if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
            if (phone !== undefined) updateData.phone = phone;
            if (allocations !== undefined) updateData.allocations = allocations;

            const [updated] = await db.update(clientsTable).set(updateData).where(eq(clientsTable.id, id)).returning();
            return res.status(200).json(updated);
        }

        if (req.method === 'DELETE') {
            let body = req.body;
            if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
            body = body || {};
            const { id } = body;
            if (!id) return res.status(400).json({ error: 'Field "id" wajib diisi' });

            await db.delete(clientsTable).where(eq(clientsTable.id, id));
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error('[/api/clients]', err);
        return res.status(500).json({ error: err.message ?? 'Internal server error' });
    }
}
