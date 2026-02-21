
export type TruckSize = 'Small' | 'Big';

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
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
  tonnage: number;
  clientId: string;
  currentOdometer: number;
  
  // General/Main Service (Legacy/Default)
  lastServiceDate: string; 
  lastServiceOdometer: number;
  serviceIntervalKm: number;
  serviceIntervalMonths: number;

  // Specific Schedules
  schedules: ServiceSchedule[];
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

export type ViewState = 'dashboard' | 'monitoring' | 'trucks' | 'history' | 'reports';