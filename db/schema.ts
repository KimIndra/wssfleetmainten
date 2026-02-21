import { pgTable, text, integer, real, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core';

// Enums
export const truckSizeEnum = pgEnum('truck_size', ['Small', 'Big']);

// ============================================================
// CLIENTS TABLE
// ============================================================
export const clients = pgTable('clients', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    contactPerson: text('contact_person').notNull(),
    phone: text('phone').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// TRUCKS TABLE
// ============================================================
export const trucks = pgTable('trucks', {
    id: text('id').primaryKey(),
    plateNumber: text('plate_number').notNull().unique(),
    brand: text('brand').notNull(),
    model: text('model').notNull(),
    year: integer('year').notNull(),
    size: truckSizeEnum('size').notNull(),
    tonnage: real('tonnage').notNull(),
    clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
    currentOdometer: integer('current_odometer').notNull().default(0),
    lastServiceDate: text('last_service_date'),
    lastServiceOdometer: integer('last_service_odometer').default(0),
    serviceIntervalKm: integer('service_interval_km').notNull().default(10000),
    serviceIntervalMonths: integer('service_interval_months').notNull().default(6),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// SERVICE SCHEDULES TABLE
// ============================================================
export const serviceSchedules = pgTable('service_schedules', {
    id: text('id').primaryKey(),
    truckId: text('truck_id').notNull().references(() => trucks.id, { onDelete: 'cascade' }),
    serviceName: text('service_name').notNull(),
    intervalKm: integer('interval_km').notNull(),
    intervalMonths: integer('interval_months').notNull(),
    lastServiceDate: text('last_service_date'),
    lastServiceOdometer: integer('last_service_odometer').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// SERVICE RECORDS TABLE
// ============================================================
export const serviceRecords = pgTable('service_records', {
    id: text('id').primaryKey(),
    truckId: text('truck_id').notNull().references(() => trucks.id, { onDelete: 'cascade' }),
    serviceDate: text('service_date').notNull(),
    odometer: integer('odometer').notNull(),
    serviceTypes: jsonb('service_types').notNull().$type<string[]>(),
    description: text('description').notNull(),
    laborCost: real('labor_cost').notNull().default(0),
    totalCost: real('total_cost').notNull().default(0),
    mechanic: text('mechanic').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// SPARE PARTS TABLE
// ============================================================
export const spareParts = pgTable('spare_parts', {
    id: text('id').primaryKey(),
    serviceRecordId: text('service_record_id').notNull().references(() => serviceRecords.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    partNumber: text('part_number').notNull(),
    price: real('price').notNull().default(0),
    quantity: integer('quantity').notNull().default(1),
});

// Types
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Truck = typeof trucks.$inferSelect;
export type NewTruck = typeof trucks.$inferInsert;
export type ServiceSchedule = typeof serviceSchedules.$inferSelect;
export type NewServiceSchedule = typeof serviceSchedules.$inferInsert;
export type ServiceRecord = typeof serviceRecords.$inferSelect;
export type NewServiceRecord = typeof serviceRecords.$inferInsert;
export type SparePart = typeof spareParts.$inferSelect;
export type NewSparePart = typeof spareParts.$inferInsert;
