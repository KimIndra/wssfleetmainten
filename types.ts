
export type TruckSize = 'Small' | 'Big';

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  allocations: string[];
}

export interface ServiceSchedule {
  id: string;
  serviceName: string; // e.g., "Ganti Oli", "Kampas Rem"
  intervalKm: number;
  intervalMonths: number;
  lastServiceDate: string; // ISO Date
  lastServiceOdometer: number;
}

export interface Truck {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  size: TruckSize;
  clientId: string;
  allocation?: string | null;     // Alokasi penempatan truk
  description?: string | null;    // Deskripsi/keterangan truk
  engineNumber?: string | null;   // Nomor mesin
  chassisNumber?: string | null;  // Nomor rangka
  currentOdometer: number;

  // General/Main Service (Legacy/Default)
  lastServiceDate: string;
  lastServiceOdometer: number;
  serviceIntervalKm: number;
  serviceIntervalMonths: number;

  // Specific Schedules
  schedules: ServiceSchedule[];

  // Dokumen Kendaraan
  stnkExpiry?: string | null;       // Masa berlaku pajak STNK tahunan
  tax5yearExpiry?: string | null;   // Masa berlaku pajak 5 tahunan
  kirExpiry?: string | null;        // Masa berlaku KIR
}

export interface SparePart {
  id: string;
  name: string;
  partNumber: string;
  price: number;
  quantity: number;
}

export interface ServiceRecord {
  id: string;
  truckId: string;
  serviceDate: string; // ISO Date
  odometer: number;
  serviceTypes: string[];
  description: string;
  parts: SparePart[];
  laborCost: number;
  totalCost: number;
  mechanic: string;
}

export type ViewState = 'dashboard' | 'monitoring' | 'trucks' | 'history' | 'reports' | 'clients' | 'input-service';