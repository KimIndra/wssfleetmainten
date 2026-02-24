// Standalone DB connection helper for API routes
// Does NOT rely on module-level initialization to avoid Vercel cold-start issues
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

export function createDb() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set in environment variables');

    // Remove channel_binding parameter (not supported by HTTP driver)
    let cleanUrl = url;
    try {
        const parsed = new URL(url);
        parsed.searchParams.delete('channel_binding');
        cleanUrl = parsed.toString();
    } catch {
        cleanUrl = url.replace(/[&?]channel_binding=[^&]*/g, '');
    }

    const sql = neon(cleanUrl);
    return drizzle(sql);
}
