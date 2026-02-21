// Base URL for API calls - works for both dev (Vite proxy) and production (Vercel)
const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? `API error ${res.status}`);
    }
    return res.json() as Promise<T>;
}

// ── CLIENTS ──────────────────────────────────────────────────
export const api = {
    clients: {
        list: () => request<any[]>('/clients'),
        create: (data: any) => request<any>('/clients', { method: 'POST', body: JSON.stringify(data) }),
    },

    // ── TRUCKS ────────────────────────────────────────────────
    trucks: {
        list: () => request<any[]>('/trucks'),
        get: (id: string) => request<any>(`/trucks/${id}`),
        create: (data: any) => request<any>('/trucks', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: any) => request<any>(`/trucks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id: string) => request<any>(`/trucks/${id}`, { method: 'DELETE' }),
        updateOdometer: (id: string, addedKm: number) =>
            request<any>(`/trucks/${id}/odometer`, { method: 'PUT', body: JSON.stringify({ addedKm }) }),
    },

    // ── SERVICES ─────────────────────────────────────────────
    services: {
        list: () => request<any[]>('/services'),
        get: (id: string) => request<any>(`/services/${id}`),
        create: (data: any) => request<any>('/services', { method: 'POST', body: JSON.stringify(data) }),
        delete: (id: string) => request<any>(`/services/${id}`, { method: 'DELETE' }),
    },
};
