
import React from 'react';
import { Truck, ServiceRecord } from '../types';
import { Truck as TruckIcon, Wrench, AlertTriangle, CheckCircle, TrendingUp, FileText, ShieldAlert } from 'lucide-react';
import { formatCurrency, getNextServiceInfo } from '../utils';

interface DashboardProps {
  trucks: Truck[];
  services: ServiceRecord[];
}

const Dashboard: React.FC<DashboardProps> = ({ trucks, services }) => {
  const totalTrucks = trucks.length;
  const totalServiceCost = services.reduce((sum, s) => sum + s.totalCost, 0);

  const overdueCount = trucks.filter(t => {
    const { status } = getNextServiceInfo(
      t.lastServiceDate,
      t.lastServiceOdometer,
      t.serviceIntervalMonths,
      t.serviceIntervalKm,
      t.currentOdometer
    );
    return status === 'overdue';
  }).length;

  const warningCount = trucks.filter(t => {
    const { status } = getNextServiceInfo(
      t.lastServiceDate,
      t.lastServiceOdometer,
      t.serviceIntervalMonths,
      t.serviceIntervalKm,
      t.currentOdometer
    );
    return status === 'warning';
  }).length;

  // Document monitoring helper
  const getDocStatus = (dateStr?: string | null) => {
    if (!dateStr) return { status: 'none' as const, diffDays: 0, label: 'Belum diisi' };
    const today = new Date();
    const expiry = new Date(dateStr);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { status: 'expired' as const, diffDays, label: `Expired ${Math.abs(diffDays)} hari` };
    if (diffDays <= 30) return { status: 'warning' as const, diffDays, label: `${diffDays} hari lagi` };
    return { status: 'ok' as const, diffDays, label: dateStr };
  };

  // Count document statuses
  const docStats = trucks.reduce((acc, t) => {
    const stnk = getDocStatus(t.stnkExpiry);
    const tax5 = getDocStatus(t.tax5yearExpiry);
    const kir = getDocStatus(t.kirExpiry);
    if (stnk.status === 'expired') acc.stnkExpired++;
    if (stnk.status === 'warning') acc.stnkWarning++;
    if (tax5.status === 'expired') acc.tax5Expired++;
    if (tax5.status === 'warning') acc.tax5Warning++;
    if (kir.status === 'expired') acc.kirExpired++;
    if (kir.status === 'warning') acc.kirWarning++;
    return acc;
  }, { stnkExpired: 0, stnkWarning: 0, tax5Expired: 0, tax5Warning: 0, kirExpired: 0, kirWarning: 0 });

  const totalDocAlerts = docStats.stnkExpired + docStats.tax5Expired + docStats.kirExpired;
  const totalDocWarnings = docStats.stnkWarning + docStats.tax5Warning + docStats.kirWarning;

  // Sort trucks by most urgent document first
  const trucksWithDocStatus = trucks.map(t => ({
    truck: t,
    stnk: getDocStatus(t.stnkExpiry),
    tax5: getDocStatus(t.tax5yearExpiry),
    kir: getDocStatus(t.kirExpiry),
  })).sort((a, b) => {
    const urgencyA = Math.min(
      a.stnk.status === 'none' ? 9999 : a.stnk.diffDays,
      a.tax5.status === 'none' ? 9999 : a.tax5.diffDays,
      a.kir.status === 'none' ? 9999 : a.kir.diffDays
    );
    const urgencyB = Math.min(
      b.stnk.status === 'none' ? 9999 : b.stnk.diffDays,
      b.tax5.status === 'none' ? 9999 : b.tax5.diffDays,
      b.kir.status === 'none' ? 9999 : b.kir.diffDays
    );
    return urgencyA - urgencyB;
  });

  const getStatusBadge = (doc: ReturnType<typeof getDocStatus>) => {
    if (doc.status === 'none') return <span className="text-xs text-gray-400 italic">-</span>;
    if (doc.status === 'expired') return <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 font-semibold">{doc.label}</span>;
    if (doc.status === 'warning') return <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700 font-semibold">{doc.label}</span>;
    return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">{doc.label}</span>;
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Ringkasan</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
            <TruckIcon size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Armada</p>
            <p className="text-2xl font-bold text-gray-800">{totalTrucks}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-red-100 rounded-lg text-red-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Perlu Service (Urgent)</p>
            <p className="text-2xl font-bold text-gray-800">{overdueCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-yellow-100 rounded-lg text-yellow-600">
            <Wrench size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Mendekati Jadwal</p>
            <p className="text-2xl font-bold text-gray-800">{warningCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-lg text-green-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Biaya Service</p>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(totalServiceCost)}</p>
          </div>
        </div>
      </div>

      {/* Document Monitoring Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl shadow-sm border flex items-center space-x-4 ${docStats.stnkExpired > 0 ? 'bg-red-50 border-red-200' : docStats.stnkWarning > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-100'}`}>
          <div className={`p-3 rounded-lg ${docStats.stnkExpired > 0 ? 'bg-red-100 text-red-600' : docStats.stnkWarning > 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">STNK Tahunan</p>
            {docStats.stnkExpired > 0 ? (
              <p className="text-lg font-bold text-red-700">{docStats.stnkExpired} Expired</p>
            ) : docStats.stnkWarning > 0 ? (
              <p className="text-lg font-bold text-yellow-700">{docStats.stnkWarning} Segera Habis</p>
            ) : (
              <p className="text-lg font-bold text-green-700">Semua Aman</p>
            )}
          </div>
        </div>

        <div className={`p-4 rounded-xl shadow-sm border flex items-center space-x-4 ${docStats.tax5Expired > 0 ? 'bg-red-50 border-red-200' : docStats.tax5Warning > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-100'}`}>
          <div className={`p-3 rounded-lg ${docStats.tax5Expired > 0 ? 'bg-red-100 text-red-600' : docStats.tax5Warning > 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pajak 5 Tahunan</p>
            {docStats.tax5Expired > 0 ? (
              <p className="text-lg font-bold text-red-700">{docStats.tax5Expired} Expired</p>
            ) : docStats.tax5Warning > 0 ? (
              <p className="text-lg font-bold text-yellow-700">{docStats.tax5Warning} Segera Habis</p>
            ) : (
              <p className="text-lg font-bold text-green-700">Semua Aman</p>
            )}
          </div>
        </div>

        <div className={`p-4 rounded-xl shadow-sm border flex items-center space-x-4 ${docStats.kirExpired > 0 ? 'bg-red-50 border-red-200' : docStats.kirWarning > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-100'}`}>
          <div className={`p-3 rounded-lg ${docStats.kirExpired > 0 ? 'bg-red-100 text-red-600' : docStats.kirWarning > 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">KIR</p>
            {docStats.kirExpired > 0 ? (
              <p className="text-lg font-bold text-red-700">{docStats.kirExpired} Expired</p>
            ) : docStats.kirWarning > 0 ? (
              <p className="text-lg font-bold text-yellow-700">{docStats.kirWarning} Segera Habis</p>
            ) : (
              <p className="text-lg font-bold text-green-700">Semua Aman</p>
            )}
          </div>
        </div>
      </div>

      {/* Document Monitoring Table */}
      {(totalDocAlerts > 0 || totalDocWarnings > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <ShieldAlert size={20} className="text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-700">Peringatan Dokumen Kendaraan</h2>
            {totalDocAlerts > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full">{totalDocAlerts} expired</span>
            )}
            {totalDocWarnings > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-yellow-100 text-yellow-700 rounded-full">{totalDocWarnings} segera habis</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3 font-semibold">No Polisi</th>
                  <th className="p-3 font-semibold">Merk/Model</th>
                  <th className="p-3 font-semibold text-center">STNK Tahunan</th>
                  <th className="p-3 font-semibold text-center">Pajak 5 Tahunan</th>
                  <th className="p-3 font-semibold text-center">KIR</th>
                </tr>
              </thead>
              <tbody>
                {trucksWithDocStatus
                  .filter(t => t.stnk.status === 'expired' || t.stnk.status === 'warning' || t.tax5.status === 'expired' || t.tax5.status === 'warning' || t.kir.status === 'expired' || t.kir.status === 'warning')
                  .map(({ truck, stnk, tax5, kir }) => (
                    <tr key={truck.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-medium text-gray-800">{truck.plateNumber}</td>
                      <td className="p-3 text-gray-600">{truck.brand} {truck.model}</td>
                      <td className="p-3 text-center">{getStatusBadge(stnk)}</td>
                      <td className="p-3 text-center">{getStatusBadge(tax5)}</td>
                      <td className="p-3 text-center">{getStatusBadge(kir)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Status Armada Terbaru</h2>
          <div className="space-y-4">
            {trucks.slice(0, 5).map(truck => {
              const { status, daysUntil, kmUntil } = getNextServiceInfo(
                truck.lastServiceDate,
                truck.lastServiceOdometer,
                truck.serviceIntervalMonths,
                truck.serviceIntervalKm,
                truck.currentOdometer
              );

              const statusColor = status === 'overdue' ? 'bg-red-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-green-500';

              return (
                <div key={truck.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${statusColor}`} />
                    <div>
                      <p className="font-medium text-gray-800">{truck.plateNumber}</p>
                      <p className="text-xs text-gray-500">{truck.brand} {truck.model}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{kmUntil} KM lagi</p>
                    <p className="text-xs text-gray-500">{daysUntil} hari lagi</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Riwayat Service Terakhir</h2>
          <div className="space-y-4">
            {services.slice(0, 5).map(service => (
              <div key={service.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                <div>
                  <div className="flex gap-1 flex-wrap mb-1">
                    {service.serviceTypes.map((type, i) => (
                      <span key={i} className="text-xs font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{type}</span>
                    ))}
                  </div>
                  <p className="text-sm font-bold text-gray-700">{formatCurrency(service.totalCost)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold bg-slate-200 px-2 py-1 rounded text-slate-700">{trucks.find(t => t.id === service.truckId)?.plateNumber}</p>
                  <p className="text-xs text-gray-400 mt-1">{service.serviceDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
