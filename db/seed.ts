import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
    console.log('🌱 Seeding database...');

    // ── CLIENTS ──────────────────────────────────────────────
    console.log('📦 Inserting clients...');
    await db.insert(schema.clients).values([
        { id: 'c1', name: 'PT Unilever Indonesia', contactPerson: 'Budi Santoso', phone: '021-555001' },
        { id: 'c2', name: 'PT Indofood CBP', contactPerson: 'Siti Aminah', phone: '021-555002' },
        { id: 'c3', name: 'PT Mayora Indah', contactPerson: 'Rudi Hartono', phone: '021-555003' },
    ]).onConflictDoNothing();

    // ── TRUCKS ───────────────────────────────────────────────
    console.log('🚛 Inserting trucks...');
    await db.insert(schema.trucks).values([
        { id: 't1', plateNumber: 'B 9021 UYT', brand: 'Hino', model: 'Ranger 500', year: 2019, size: 'Big', tonnage: 15, clientId: 'c1', currentOdometer: 145000, lastServiceDate: '2023-10-15', lastServiceOdometer: 140000, serviceIntervalKm: 10000, serviceIntervalMonths: 6 },
        { id: 't2', plateNumber: 'B 9112 KLO', brand: 'Mitsubishi', model: 'Fuso Fighter', year: 2020, size: 'Big', tonnage: 8, clientId: 'c1', currentOdometer: 82000, lastServiceDate: '2024-01-20', lastServiceOdometer: 80000, serviceIntervalKm: 10000, serviceIntervalMonths: 6 },
        { id: 't3', plateNumber: 'D 8822 XA', brand: 'Isuzu', model: 'Elf NLR', year: 2021, size: 'Small', tonnage: 3, clientId: 'c2', currentOdometer: 45000, lastServiceDate: '2024-03-01', lastServiceOdometer: 44000, serviceIntervalKm: 5000, serviceIntervalMonths: 3 },
        { id: 't4', plateNumber: 'L 1234 AB', brand: 'Hino', model: 'Dutro', year: 2022, size: 'Small', tonnage: 4, clientId: 'c3', currentOdometer: 25000, lastServiceDate: '2024-04-10', lastServiceOdometer: 20000, serviceIntervalKm: 5000, serviceIntervalMonths: 3 },
    ]).onConflictDoNothing();

    // ── SERVICE SCHEDULES ────────────────────────────────────
    console.log('📅 Inserting service schedules...');
    await db.insert(schema.serviceSchedules).values([
        { id: 'sch1', truckId: 't1', serviceName: 'Oil Change', intervalKm: 10000, intervalMonths: 6, lastServiceDate: '2023-10-15', lastServiceOdometer: 140000 },
        { id: 'sch2', truckId: 't1', serviceName: 'Tire Change', intervalKm: 40000, intervalMonths: 24, lastServiceDate: '2022-01-01', lastServiceOdometer: 110000 },
        { id: 'sch3', truckId: 't2', serviceName: 'Oil Change', intervalKm: 10000, intervalMonths: 6, lastServiceDate: '2024-01-20', lastServiceOdometer: 80000 },
        { id: 'sch4', truckId: 't2', serviceName: 'Brake System', intervalKm: 20000, intervalMonths: 12, lastServiceDate: '2024-01-20', lastServiceOdometer: 80000 },
        { id: 'sch5', truckId: 't3', serviceName: 'Regular', intervalKm: 5000, intervalMonths: 3, lastServiceDate: '2024-03-01', lastServiceOdometer: 44000 },
    ]).onConflictDoNothing();

    // ── SERVICE RECORDS ──────────────────────────────────────
    console.log('🔧 Inserting service records...');
    await db.insert(schema.serviceRecords).values([
        { id: 's1', truckId: 't1', serviceDate: '2023-10-15', odometer: 140000, serviceTypes: ['Regular', 'Oil Change'] as string[], description: 'Ganti Oli dan Filter', laborCost: 500000, totalCost: 2250000, mechanic: 'Agus' },
        { id: 's2', truckId: 't2', serviceDate: '2024-01-20', odometer: 80000, serviceTypes: ['Brake System', 'Oil Change'] as string[], description: 'Ganti Kampas Rem Depan Belakang', laborCost: 750000, totalCost: 4150000, mechanic: 'Budi' },
        { id: 's3', truckId: 't3', serviceDate: '2024-03-01', odometer: 44000, serviceTypes: ['Regular', 'Tune Up'] as string[], description: 'Service Berkala Ringan', laborCost: 300000, totalCost: 1200000, mechanic: 'Joko' },
        { id: 's4', truckId: 't4', serviceDate: '2024-04-10', odometer: 20000, serviceTypes: ['Tune Up', 'Electrical'] as string[], description: 'Tune up mesin dan cek kelistrikan', laborCost: 400000, totalCost: 1000000, mechanic: 'Agus' },
    ]).onConflictDoNothing();

    // ── SPARE PARTS ──────────────────────────────────────────
    console.log('⚙️  Inserting spare parts...');
    await db.insert(schema.spareParts).values([
        { id: 'p1', serviceRecordId: 's1', name: 'Oli Mesin Drum', partNumber: 'OIL-001', price: 1500000, quantity: 1 },
        { id: 'p2', serviceRecordId: 's1', name: 'Filter Oli', partNumber: 'FLT-001', price: 250000, quantity: 1 },
        { id: 'p3', serviceRecordId: 's2', name: 'Kampas Rem Depan', partNumber: 'BRK-F-01', price: 800000, quantity: 2 },
        { id: 'p4', serviceRecordId: 's2', name: 'Kampas Rem Belakang', partNumber: 'BRK-R-01', price: 900000, quantity: 2 },
        { id: 'p5', serviceRecordId: 's3', name: 'Oli Mesin Galon', partNumber: 'OIL-002', price: 450000, quantity: 2 },
        { id: 'p6', serviceRecordId: 's4', name: 'Busi Set', partNumber: 'SPK-001', price: 150000, quantity: 4 },
    ]).onConflictDoNothing();

    console.log('✅ Seeding complete!');
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seed error:', err);
    process.exit(1);
});
