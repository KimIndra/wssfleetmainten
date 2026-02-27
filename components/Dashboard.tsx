import React from 'react';
import { Truck, ServiceRecord, ViewState } from '../types';
import {
  Truck as TruckIcon,
  Wrench,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  FileText,
  ShieldAlert,
  Edit,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { formatCurrency, getNextServiceInfo } from '../utils';

interface DashboardProps {
  trucks: Truck[];
  services: ServiceRecord[];
  onNavigate?: (view: ViewState, docFilter?: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ trucks, services, onNavigate }) => {
  const totalTrucks = trucks.length;
  const totalServiceCost = services.reduce((sum, s) => sum + s.totalCost, 0);

  const trucksWithServiceInfo = trucks.map(t => ({
    ...t,
    serviceInfo: getNextServiceInfo(
      t.lastServiceDate,
      t.lastServiceOdometer,
      t.serviceIntervalMonths,
      t.serviceIntervalKm,
      t.currentOdometer
    )
  }));

  const overdueCount = trucksWithServiceInfo.filter(t => t.serviceInfo.status === 'overdue').length;
  const warningCount = trucksWithServiceInfo.filter(t => t.serviceInfo.status === 'warning').length;

  // Document monitoring helper
  const getDocStatus = (dateStr?: string | null) => {
    if (!dateStr) return { status: 'none' as const, diffDays: 0, label: '-' };
    const today = new Date();
    const expiry = new Date(dateStr);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { status: 'expired' as const, diffDays, label: `Expired ${Math.abs(diffDays)} hari` };
    if (diffDays <= 30) return { status: 'warning' as const, diffDays, label: `${diffDays} hari lagi` };
    return { status: 'ok' as const, diffDays, label: 'Aman' };
  };

  const docStats = trucks.reduce((acc, t) => {
    const stnk = getDocStatus(t.stnkExpiry);
    const tax5 = getDocStatus(t.tax5yearExpiry);
    const kir = getDocStatus(t.kirExpiry);
    if (stnk.status === 'expired') acc.stnkExpired++;
    if (tax5.status === 'expired') acc.tax5Expired++;
    if (kir.status === 'expired') acc.kirExpired++;
    return acc;
  }, { stnkExpired: 0, tax5Expired: 0, kirExpired: 0 });

  const totalDocAlerts = docStats.stnkExpired + docStats.tax5Expired + docStats.kirExpired;

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
    if (doc.status === 'none') return <span className="text-gray-400">-</span>;
    if (doc.status === 'expired') return <span className="inline-block px-2 py-1 rounded-md text-xs bg-red-100 text-red-700 font-semibold">{doc.label}</span>;
    if (doc.status === 'warning') return <span className="inline-block px-2 py-1 rounded-md text-xs bg-orange-100 text-orange-700 font-semibold">{doc.label}</span>;
    return <span className="inline-block px-2 py-1 rounded-md text-xs bg-green-100 text-green-700 font-medium">{doc.label}</span>;
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-full">
      {/* 1. Page Header */}
      <h1 className="text-2xl font-bold text-slate-800">Dashboard Ringkasan</h1>

      {/* 2. Summary Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div
          onClick={() => onNavigate?.('trucks')}
          className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <TruckIcon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Armada</p>
              <p className="text-2xl font-bold text-slate-800">{totalTrucks}</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
        </div>

        {/* Card 2 */}
        <div
          onClick={() => onNavigate?.('monitoring')}
          className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer hover:shadow-md hover:border-red-200 transition-all group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-100 rounded-lg text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Perlu Service (Urgent)</p>
              <p className="text-2xl font-bold text-slate-800">{overdueCount}</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-slate-300 group-hover:text-red-500 transition-colors" />
        </div>

        {/* Card 3 */}
        <div
          onClick={() => onNavigate?.('monitoring')}
          className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer hover:shadow-md hover:border-yellow-200 transition-all group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-yellow-100 rounded-lg text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white transition-colors">
              <Wrench size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Mendekati Jadwal</p>
              <p className="text-2xl font-bold text-slate-800">{warningCount}</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-slate-300 group-hover:text-yellow-500 transition-colors" />
        </div>

        {/* Card 4 */}
        <div
          onClick={() => onNavigate?.('history')}
          className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer hover:shadow-md hover:border-green-200 transition-all group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Biaya Service</p>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(totalServiceCost)}</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-slate-300 group-hover:text-green-500 transition-colors" />
        </div>
      </div>

      {/* 3. Document Warning Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => docStats.stnkExpired > 0 ? onNavigate?.('trucks', 'stnk-expired') : onNavigate?.('trucks')}
          className={`p-5 rounded-xl shadow-sm border flex justify-between items-center cursor-pointer hover:shadow-md transition-all group ${docStats.stnkExpired > 0 ? 'bg-red-50 border-red-200 hover:border-red-300' : 'bg-white border-slate-100 hover:border-blue-200'}`}
        >
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg transition-colors ${docStats.stnkExpired > 0 ? 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
              <FileText size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">STNK Tahunan</p>
              {docStats.stnkExpired > 0 ? (
                <p className="text-lg font-bold text-red-600">{docStats.stnkExpired} Expired</p>
              ) : (
                <p className="text-lg font-bold text-green-600">Aman</p>
              )}
            </div>
          </div>
          <ArrowRight size={20} className={`transition-colors ${docStats.stnkExpired > 0 ? 'text-red-300 group-hover:text-red-500' : 'text-slate-300 group-hover:text-blue-500'}`} />
        </div>

        <div
          onClick={() => docStats.tax5Expired > 0 ? onNavigate?.('trucks', 'tax5-expired') : onNavigate?.('trucks')}
          className={`p-5 rounded-xl shadow-sm border flex justify-between items-center cursor-pointer hover:shadow-md transition-all group ${docStats.tax5Expired > 0 ? 'bg-red-50 border-red-200 hover:border-red-300' : 'bg-white border-slate-100 hover:border-blue-200'}`}
        >
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg transition-colors ${docStats.tax5Expired > 0 ? 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Pajak 5 Tahunan</p>
              {docStats.tax5Expired > 0 ? (
                <p className="text-lg font-bold text-red-600">{docStats.tax5Expired} Expired</p>
              ) : (
                <p className="text-lg font-bold text-green-600">Aman</p>
              )}
            </div>
          </div>
          <ArrowRight size={20} className={`transition-colors ${docStats.tax5Expired > 0 ? 'text-red-300 group-hover:text-red-500' : 'text-slate-300 group-hover:text-blue-500'}`} />
        </div>

        <div
          onClick={() => docStats.kirExpired > 0 ? onNavigate?.('trucks', 'kir-expired') : onNavigate?.('trucks')}
          className={`p-5 rounded-xl shadow-sm border flex justify-between items-center cursor-pointer hover:shadow-md transition-all group ${docStats.kirExpired > 0 ? 'bg-red-50 border-red-200 hover:border-red-300' : 'bg-white border-slate-100 hover:border-blue-200'}`}
        >
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg transition-colors ${docStats.kirExpired > 0 ? 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">KIR</p>
              {docStats.kirExpired > 0 ? (
                <p className="text-lg font-bold text-red-600">{docStats.kirExpired} Expired</p>
              ) : (
                <p className="text-lg font-bold text-green-600">Aman</p>
              )}
            </div>
          </div>
          <ArrowRight size={20} className={`transition-colors ${docStats.kirExpired > 0 ? 'text-red-300 group-hover:text-red-500' : 'text-slate-300 group-hover:text-blue-500'}`} />
        </div>
      </div>

      {/* 4. Data Table Section: Peringatan Dokumen Kendaraan */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Peringatan Dokumen Kendaraan</h2>
          {totalDocAlerts > 0 && (
            <span className="px-2.5 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full border border-red-200">
              {totalDocAlerts} expired
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-4 font-semibold uppercase text-xs tracking-wider">No Polisi</th>
                <th className="px-5 py-4 font-semibold uppercase text-xs tracking-wider">Merk/Model</th>
                <th className="px-5 py-4 font-semibold uppercase text-xs tracking-wider text-center">STNK Tahunan</th>
                <th className="px-5 py-4 font-semibold uppercase text-xs tracking-wider text-center">Pajak 5 Tahunan</th>
                <th className="px-5 py-4 font-semibold uppercase text-xs tracking-wider text-center">KIR</th>
                <th className="px-5 py-4 font-semibold uppercase text-xs tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trucksWithDocStatus
                .filter(t => t.stnk.status === 'expired' || t.stnk.status === 'warning' || t.tax5.status === 'expired' || t.tax5.status === 'warning' || t.kir.status === 'expired' || t.kir.status === 'warning')
                .slice(0, 5) // Display top 5 urgent
                .map(({ truck, stnk, tax5, kir }) => (
                  <tr key={truck.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-slate-800">{truck.plateNumber}</td>
                    <td className="px-5 py-4 text-slate-500">{truck.brand} {truck.model}</td>
                    <td className="px-5 py-4 text-center">{getStatusBadge(stnk)}</td>
                    <td className="px-5 py-4 text-center">{getStatusBadge(tax5)}</td>
                    <td className="px-5 py-4 text-center">{getStatusBadge(kir)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => onNavigate?.('trucks')}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        title="Update Data"
                      >
                        <RefreshCw size={14} /> Update Data
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Bottom Section (2 columns grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Column: Status Armada Terbaru */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
          <h2 className="text-lg font-semibold mb-5 text-slate-800">Status Armada Terbaru</h2>
          <div className="space-y-4 flex-grow">
            {trucksWithServiceInfo.slice(0, 4).map(truck => {
              const { status, daysUntil, kmUntil } = truck.serviceInfo;

              const isExpiredDoc =
                getDocStatus(truck.stnkExpiry).status === 'expired' ||
                getDocStatus(truck.tax5yearExpiry).status === 'expired' ||
                getDocStatus(truck.kirExpiry).status === 'expired';

              // Determine dot color
              let dotColor = 'bg-green-500';
              if (isExpiredDoc || status === 'overdue') dotColor = 'bg-red-500';
              else if (status === 'warning') dotColor = 'bg-yellow-500';

              // Progress bar logic
              const maxKm = truck.serviceIntervalKm;
              const currentKm = Math.max(0, truck.currentOdometer - truck.lastServiceOdometer);
              // limit to 100%
              const progressPercent = Math.min(100, Math.max(0, (currentKm / maxKm) * 100));
              let progressColor = 'bg-green-500';
              if (progressPercent >= 90) progressColor = 'bg-red-500';
              else if (progressPercent >= 75) progressColor = 'bg-yellow-500';

              return (
                <div
                  key={truck.id}
                  onClick={() => onNavigate?.('monitoring')}
                  className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors px-2 rounded-md -mx-2 cursor-pointer group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative flex h-3 w-3">
                      {(dotColor === 'bg-red-500' || dotColor === 'bg-yellow-500') && (
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`}></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${dotColor}`}></span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{truck.plateNumber}</p>
                      <p className="text-xs text-slate-500">{truck.brand} {truck.model}</p>
                    </div>
                  </div>
                  <div className="text-right w-1/2 flex flex-col items-end">
                    <p className="text-xs font-semibold text-slate-600 mb-1.5 flex justify-between w-full max-w-[180px]">
                      <span>{kmUntil} KM lagi</span>
                    </p>
                    <div className="w-full max-w-[180px] bg-slate-100 rounded-full h-1.5 mb-1.5 overflow-hidden">
                      <div className={`h-1.5 rounded-full ${progressColor}`} style={{ width: `${progressPercent}%` }}></div>
                    </div>
                    <p className="text-xs text-slate-500">Estimasi: {daysUntil} hari lagi</p>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => onNavigate?.('monitoring')}
            className="w-full mt-4 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors border border-dashed border-blue-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            Lihat Semua Jadwal <ArrowRight size={16} />
          </button>
        </div>

        {/* Right Column: Riwayat Service Terakhir */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
          <h2 className="text-lg font-semibold mb-5 text-slate-800">Riwayat Service Terakhir</h2>
          <div className="flex-grow flex flex-col">
            {services.length > 0 ? (
              <div className="space-y-4">
                {services.slice(0, 5).map(service => (
                  <div
                    key={service.id}
                    onClick={() => onNavigate?.('history')}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Wrench size={18} />
                      </div>
                      <div>
                        <div className="flex gap-1 flex-wrap mb-1">
                          {service.serviceTypes.slice(0, 2).map((type, i) => (
                            <span key={i} className="text-[10px] font-semibold bg-white border outline-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-wider">{type}</span>
                          ))}
                          {service.serviceTypes.length > 2 && (
                            <span className="text-[10px] font-semibold bg-white border outline-slate-200 text-slate-500 px-1.5 py-0.5 rounded">+{service.serviceTypes.length - 2}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{service.serviceDate}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{trucks.find(t => t.id === service.truckId)?.plateNumber}</p>
                      <p className="text-sm font-bold text-green-600 mt-0.5">{formatCurrency(service.totalCost)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* AESTHETICS EMPTY STATE */
              <div className="flex-grow flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <div className="w-16 h-16 bg-slate-100 flex items-center justify-center rounded-full mb-4">
                  <Wrench size={32} className="text-slate-400" />
                </div>
                <h3 className="text-slate-800 font-semibold mb-2">Belum ada riwayat service</h3>
                <p className="text-slate-500 text-sm text-center max-w-[250px]">
                  Data perbaikan dan service armada terbaru akan otomatis muncul di sini.
                </p>
              </div>
            )}
          </div>
          {services.length > 0 && (
            <button
              onClick={() => onNavigate?.('history')}
              className="w-full mt-4 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors border border-dashed border-blue-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              Cek Riwayat Lengkap <ArrowRight size={16} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
