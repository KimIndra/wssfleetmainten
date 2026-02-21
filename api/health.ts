import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const dbUrl = process.env.DATABASE_URL;

    return res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: {
            configured: !!dbUrl,
            // Hanya tampilkan sebagian URL untuk keamanan
            preview: dbUrl ? dbUrl.substring(0, 30) + '...' : 'NOT SET ❌',
        },
        node_version: process.version,
    });
}
