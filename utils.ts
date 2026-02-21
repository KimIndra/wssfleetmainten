
import { format, parseISO, addMonths } from 'date-fns';
import { Truck } from './types';

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  try {
    return format(parseISO(dateString), 'dd MMM yyyy');
  } catch (e) {
    return dateString;
  }
};

export const getNextServiceInfo = (
  lastDate: string,
  lastOdo: number,
  intervalMonths: number,
  intervalKm: number,
  currentOdo: number
) => {
  const nextDate = addMonths(parseISO(lastDate), intervalMonths);
  const nextOdo = lastOdo + intervalKm;
  
  const daysUntil = Math.ceil((nextDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const kmUntil = nextOdo - currentOdo;

  let status: 'ok' | 'warning' | 'overdue' = 'ok';
  
  if (daysUntil < 0 || kmUntil < 0) {
    status = 'overdue';
  } else if (daysUntil < 14 || kmUntil < 1000) {
    status = 'warning';
  }

  return { nextDate, nextOdo, daysUntil, kmUntil, status };
};

// New function to handle multiple schedules per truck
export const getAggregatedServiceStatus = (truck: Truck) => {
  let worstStatus: 'ok' | 'warning' | 'overdue' = 'ok';
  let itemsDue: string[] = [];
  let nearestKm = Infinity;
  let nearestDate = new Date(8640000000000000); // Max Date

  // 1. Check General Schedule (Legacy/Global)
  const generalInfo = getNextServiceInfo(
    truck.lastServiceDate,
    truck.lastServiceOdometer,
    truck.serviceIntervalMonths,
    truck.serviceIntervalKm,
    truck.currentOdometer
  );

  if (generalInfo.status !== 'ok') {
    worstStatus = generalInfo.status;
    itemsDue.push(`Service Rutin (${generalInfo.status === 'overdue' ? 'Lewat' : 'Segera'})`);
  }
  if (generalInfo.kmUntil < nearestKm) nearestKm = generalInfo.kmUntil;
  if (generalInfo.nextDate < nearestDate) nearestDate = generalInfo.nextDate;

  // 2. Check Specific Schedules
  if (truck.schedules && truck.schedules.length > 0) {
    truck.schedules.forEach(sch => {
      const info = getNextServiceInfo(
        sch.lastServiceDate,
        sch.lastServiceOdometer,
        sch.intervalMonths,
        sch.intervalKm,
        truck.currentOdometer
      );

      // Upgrade worst status logic: overdue > warning > ok
      if (info.status === 'overdue') {
        worstStatus = 'overdue';
        itemsDue.push(`${sch.serviceName}`);
      } else if (info.status === 'warning') {
        if (worstStatus !== 'overdue') worstStatus = 'warning';
        itemsDue.push(`${sch.serviceName}`);
      }

      if (info.kmUntil < nearestKm) nearestKm = info.kmUntil;
      if (info.nextDate < nearestDate) nearestDate = info.nextDate;
    });
  }

  return {
    status: worstStatus,
    itemsDue,
    nearestKm,
    nearestDate
  };
};

export const exportToCSV = <T extends Record<string, any>>(data: T[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const val = row[header];
          return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};