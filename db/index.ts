import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Sanitize DATABASE_URL - remove parameters not supported by the HTTP driver
function getDbUrl(): string {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL environment variable is not set');

    // Strip 'channel_binding' - TCP-level feature not supported in HTTP driver
    try {
        const parsed = new URL(url);
        parsed.searchParams.delete('channel_binding');
        return parsed.toString();
    } catch {
        // If URL parsing fails, return as-is
        return url.replace(/[&?]channel_binding=[^&]*/g, '');
    }
}

const sql = neon(getDbUrl());
export const db = drizzle(sql, { schema });
