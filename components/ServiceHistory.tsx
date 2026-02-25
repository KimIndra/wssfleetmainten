
import React, { useState } from 'react';
import { ServiceRecord, Truck } from '../types';
import { formatDate, formatCurrency, exportToCSV } from '../utils';
import { ChevronDown, ChevronUp, Trash, Download } from 'lucide-react';

interface ServiceHistoryProps {
  services: ServiceRecord[];
  trucks: Truck[];
  onDeleteService?: (serviceId: string) => Promise<void>;
}

// Available Categories for selection
const SERVICE_CATEGORIES = [
  'Regular', 'Oil Change', 'Tune Up', 'Brake System',
  'Tire Change', 'Major', 'Engine Repair', 'Electrical',
  'Suspension', 'Body Repair', 'Other'
];

const ServiceHistory: React.FC<ServiceHistoryProps> = ({ services, trucks, onDeleteService }) => {
  const [filterType, setFilterType] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Derive available years
  const years = Array.from(new Set(services.map(s => s.serviceDate.split('-')[0]))).sort();

  const filteredServices = services.filter(service => {
    const date = new Date(service.serviceDate);
    const matchesType = filterType === 'all' || service.serviceTypes.includes(filterType);
    const matchesMonth = filterMonth === 'all' || (date.getMonth() + 1).toString() === filterMonth;
    const matchesYear = filterYear === 'all' || date.getFullYear().toString() === filterYear;
    return matchesType && matchesMonth && matchesYear;
  });

  const toggleExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const handleDeleteService = async (service: ServiceRecord) => {
    if (!onDeleteService) return;
    const truck = trucks.find(t => t.id === service.truckId);
    if (!window.confirm(`Hapus data service tanggal ${service.serviceDate} untuk ${truck?.plateNumber ?? 'truk'}?`)) return;
    try {
      await onDeleteService(service.id);
    } catch (err: any) {
      alert('Gagal menghapus: ' + (err.message ?? 'Terjadi kesalahan'));
    }
  };

  const handleExport = () => {
    const dataToExport = filteredServices.map(s => {
      const truck = trucks.find(t => t.id === s.truckId);
      const partsSummary = s.parts.map(p => `${p.name} (${p.quantity}x)`).join('; ');
      return {
        'ID Service': s.id,
        'Tanggal': s.serviceDate,
        'No Polisi': truck ? truck.plateNumber : 'Unknown',
        'Merk': truck ? truck.brand : '-',
        'Odometer': s.odometer,
        'Jenis Service': s.serviceTypes.join(', '),
        'Mekanik': s.mechanic,
        'Deskripsi': s.description,
        'Rincian Sparepart': partsSummary,
        'Biaya Jasa': s.laborCost,
        'Total Biaya': s.totalCost
      };
    });
    exportToCSV(dataToExport, `Data_Service_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Riwayat Service & Pembayaran</h1>
        <button
          onClick={handleExport}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
        >
          <Download size={18} /> Export Data
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Filter Kategori</label>
          <select
            className="border border-gray-300 rounded-lg py-2 px-3 outline-none"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">Semua Jenis Service</option>
            {SERVICE_CATEGORIES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Filter Bulan</label>
          <select
            className="border border-gray-300 rounded-lg py-2 px-3 outline-none"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
          >
            <option value="all">Semua Bulan</option>
            <option value="1">Januari</option>
            <option value="2">Februari</option>
            <option value="3">Maret</option>
            <option value="4">April</option>
            <option value="5">Mei</option>
            <option value="6">Juni</option>
            <option value="7">Juli</option>
            <option value="8">Agustus</option>
            <option value="9">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Filter Tahun</label>
          <select
            className="border border-gray-300 rounded-lg py-2 px-3 outline-none"
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
          >
            <option value="all">Semua Tahun</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-4 w-10"></th>
                <th className="p-4 font-semibold">Tanggal</th>
                <th className="p-4 font-semibold">Truk</th>
                <th className="p-4 font-semibold">Jenis Service</th>
                <th className="p-4 font-semibold">Mekanik</th>
                <th className="p-4 font-semibold text-right">Total Biaya</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map(service => {
                const truck = trucks.find(t => t.id === service.truckId);
                const isExpanded = expandedRow === service.id;

                return (
                  <React.Fragment key={service.id}>
                    <tr
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => toggleExpand(service.id)}
                    >
                      <td className="p-4 text-gray-400">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </td>
                      <td className="p-4 text-gray-800">{formatDate(service.serviceDate)}</td>
                      <td className="p-4 font-medium text-gray-800">{truck?.plateNumber || '-'}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {service.serviceTypes.map((type, idx) => (
                            <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs whitespace-nowrap">
                              {type}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">{service.mechanic}</td>
                      <td className="p-4 text-right font-bold text-gray-800">{formatCurrency(service.totalCost)}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <td colSpan={6} className="p-4">
                          <div className="bg-white rounded border border-slate-200 p-4">
                            <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">Detail Pembayaran & Suku Cadang</h4>
                            <p className="text-gray-600 mb-3 text-sm italic">{service.description}</p>
                            <table className="w-full text-sm mb-3">
                              <thead className="text-gray-500 bg-gray-50">
                                <tr>
                                  <th className="p-2 text-left">Nama Part</th>
                                  <th className="p-2 text-left">Kode Part</th>
                                  <th className="p-2 text-center">Qty</th>
                                  <th className="p-2 text-right">Harga Satuan</th>
                                  <th className="p-2 text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {service.parts.map(part => (
                                  <tr key={part.id} className="border-b border-gray-100">
                                    <td className="p-2">{part.name}</td>
                                    <td className="p-2 text-gray-500">{part.partNumber}</td>
                                    <td className="p-2 text-center">{part.quantity}</td>
                                    <td className="p-2 text-right">{formatCurrency(part.price)}</td>
                                    <td className="p-2 text-right">{formatCurrency(part.price * part.quantity)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="flex justify-end space-y-1 flex-col items-end border-t pt-3">
                              <div className="flex w-64 justify-between text-gray-600">
                                <span>Total Parts:</span>
                                <span>{formatCurrency(service.parts.reduce((sum, p) => sum + (p.price * p.quantity), 0))}</span>
                              </div>
                              <div className="flex w-64 justify-between text-gray-600">
                                <span>Jasa Mekanik:</span>
                                <span>{formatCurrency(service.laborCost)}</span>
                              </div>
                              <div className="flex w-64 justify-between font-bold text-lg text-gray-800 mt-2 border-t border-dashed pt-2">
                                <span>Total:</span>
                                <span>{formatCurrency(service.totalCost)}</span>
                              </div>
                            </div>
                            {onDeleteService && (
                              <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteService(service); }}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                >
                                  <Trash size={14} /> Hapus Data Service Ini
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ServiceHistory;
