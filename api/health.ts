import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const dbUrl = process.env.DATABASE_URL;
    const result: any = {
        status: 'checking',
        timestamp: new Date().toISOString(),
        database_url_set: !!dbUrl,
        database_url_preview: dbUrl ? dbUrl.substring(0, 40) + '...' : 'NOT SET',
        node_version: process.version,
    };

    if (!dbUrl) {
        return res.status(500).json({ ...result, status: 'error', error: 'DATABASE_URL is not set' });
    }

    // Try actual DB query
    try {
        const { neon } = await import('@neondatabase/serverless');
        const { drizzle } = await import('drizzle-orm/neon-http');

        const sql = neon(dbUrl);
        const db = drizzle(sql);

        // Simple query test
        await db.execute('SELECT 1 as test');

        result.status = 'ok';
        result.db_connection = 'SUCCESS ✅';
        return res.status(200).json(result);
    } catch (err: any) {
        result.status = 'error';
        result.db_connection = 'FAILED ❌';
        result.error = err.message;
        result.error_code = err.code;
        result.detail = String(err);
        return res.status(500).json(result);
    }
}
