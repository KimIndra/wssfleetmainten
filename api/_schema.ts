// Inline schema definitions for Vercel Serverless Functions
// Separated from db/schema.ts to avoid pgEnum compilation issues at Vercel runtime
import { pgTable, text, integer, real, timestamp, jsonb } from 'drizzle-orm/pg-core';

// ── CLIENTS ──────────────────────────────────────────────────
export const clients = pgTable('clients', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    contactPerson: text('contact_person').notNull(),
    phone: text('phone').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── TRUCKS ───────────────────────────────────────────────────
// Note: 'size' column uses text instead of pgEnum to avoid Vercel runtime issues
export const trucks = pgTable('trucks', {
    id: text('id').primaryKey(),
    plateNumber: text('plate_number').notNull(),
    brand: text('brand').notNull(),
    model: text('model').notNull(),
    year: integer('year').notNull(),
    size: text('size').notNull(), // was pgEnum, now plain text
    tonnage: real('tonnage').notNull(),
    clientId: text('client_id').notNull(),
    currentOdometer: integer('current_odometer').notNull().default(0),
    lastServiceDate: text('last_service_date'),
    lastServiceOdometer: integer('last_service_odometer').default(0),
    serviceIntervalKm: integer('service_interval_km').notNull().default(10000),
    serviceIntervalMonths: integer('service_interval_months').notNull().default(6),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── SERVICE SCHEDULES ────────────────────────────────────────
export const serviceSchedules = pgTable('service_schedules', {
    id: text('id').primaryKey(),
    truckId: text('truck_id').notNull(),
    serviceName: text('service_name').notNull(),
    intervalKm: integer('interval_km').notNull(),
    intervalMonths: integer('interval_months').notNull(),
    lastServiceDate: text('last_service_date'),
    lastServiceOdometer: integer('last_service_odometer').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── SERVICE RECORDS ──────────────────────────────────────────
export const serviceRecords = pgTable('service_records', {
    id: text('id').primaryKey(),
    truckId: text('truck_id').notNull(),
    serviceDate: text('service_date').notNull(),
    odometer: integer('odometer').notNull(),
    serviceTypes: jsonb('service_types').notNull().$type<string[]>(),
    description: text('description').notNull(),
    laborCost: real('labor_cost').notNull().default(0),
    totalCost: real('total_cost').notNull().default(0),
    mechanic: text('mechanic').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── SPARE PARTS ──────────────────────────────────────────────
export const spareParts = pgTable('spare_parts', {
    id: text('id').primaryKey(),
    serviceRecordId: text('service_record_id').notNull(),
    name: text('name').notNull(),
    partNumber: text('part_number').notNull(),
    price: real('price').notNull().default(0),
    quantity: integer('quantity').notNull().default(1),
});
