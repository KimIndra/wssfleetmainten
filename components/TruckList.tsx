import React, { useState } from 'react';
import { Truck, Client, ServiceSchedule, TruckSize } from '../types';
import { Settings, Plus, Trash2, FileText, Search, Truck as TruckIcon, Calendar, Gauge, Building2, Hash, ClipboardList, Clock, Save, X, ChevronDown, MapPin, Wrench, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

const ALLOCATION_OPTIONS: Record<TruckSize, string[]> = {
  Big: ['Kurere', 'Depo', 'Dam CBT', 'Dongjin'],
  Small: ['DDS JKT', 'DDS KRW', 'DDS SMRG', 'DAM KRW', 'Dongjin', 'Nissin'],
};// --- Reusable sub-components (defined OUTSIDE to prevent re-mount on parent re-render) ---
const InputField = ({ label, icon: Icon, required, ...props }: any) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
      {Icon && <span className="inline-flex items-center gap-1"><Icon size={12} /> {label}</span>}
      {!Icon && label}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    <input
      className="w-full border border-slate-200 bg-slate-50 focus:bg-white p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
      {...props}
    />
  </div>
);

const SelectField = ({ label, icon: Icon, required, children, ...props }: any) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
      {Icon && <span className="inline-flex items-center gap-1"><Icon size={12} /> {label}</span>}
      {!Icon && label}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    <select
      className="w-full border border-slate-200 bg-slate-50 focus:bg-white p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer appearance-none"
      {...props}
    >
      {children}
    </select>
  </div>
);

const SectionHeader = ({ num, icon: Icon, title, subtitle }: { num: number; icon: any; title: string; subtitle?: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
      {num}
    </div>
    <div className="flex items-center gap-2">
      <Icon size={16} className="text-blue-600" />
      <div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
      </div>
    </div>
  </div>
);

// --- Main Component ---
interface TruckListProps {
  trucks: Truck[];
  clients: Client[];
  onAddTruck: (truck: Truck) => Promise<void>;
  onEditTruck: (truck: Truck) => Promise<void>;
  onDeleteTruck?: (truckId: string) => Promise<void>;
  docFilter?: string | null;
  onClearDocFilter?: () => void;
}

const TruckList: React.FC<TruckListProps> = ({ trucks, clients, onAddTruck, onEditTruck, onDeleteTruck, docFilter, onClearDocFilter }) => {
  const getExpiryBadge = (dateStr?: string | null) => {
    if (!dateStr) return <span className="text-xs text-gray-400 italic">Belum diisi</span>;
    const today = new Date();
    const expiry = new Date(dateStr);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 font-semibold">Expired</span>;
    if (diffDays <= 30) return <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700 font-semibold">{diffDays} hari lagi</span>;
    return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">{dateStr}</span>;
  };
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterSize, setFilterSize] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const initialFormState: Partial<Truck> = {
    size: 'Big',
    serviceIntervalKm: 10000,
    serviceIntervalMonths: 3,
    currentOdometer: 0,
    lastServiceOdometer: 0,
    schedules: []
  };

  const [formData, setFormData] = useState<Partial<Truck>>(initialFormState);
  const [newSchedule, setNewSchedule] = useState<Partial<ServiceSchedule>>({
    serviceName: '',
    intervalKm: 10000,
    intervalMonths: 3
  });

  const filteredTrucks = trucks.filter(truck => {
    const matchesClient = filterClient === 'all' || truck.clientId === filterClient;
    const matchesSize = filterSize === 'all' || truck.size === filterSize;
    const matchesSearch = truck.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.brand.toLowerCase().includes(searchTerm.toLowerCase());

    // Doc expiry filter from Dashboard
    if (docFilter) {
      const today = new Date();
      const isExpired = (dateStr?: string | null) => {
        if (!dateStr) return true; // treat missing as expired
        return new Date(dateStr) < today;
      };
      if (docFilter === 'stnk-expired' && !isExpired(truck.stnkExpiry)) return false;
      if (docFilter === 'tax5-expired' && !isExpired(truck.tax5yearExpiry)) return false;
      if (docFilter === 'kir-expired' && !isExpired(truck.kirExpiry)) return false;
    }

    return matchesClient && matchesSize && matchesSearch;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTrucks.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTrucks = filteredTrucks.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setCurrentPage(1);
  };

  const handleOpenAdd = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (truck: Truck) => {
    setFormData({ ...truck });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleAddSchedule = () => {
    if (newSchedule.serviceName && newSchedule.intervalKm) {
      const scheduleToAdd: ServiceSchedule = {
        id: `sch-${Date.now()}`,
        serviceName: newSchedule.serviceName,
        intervalKm: newSchedule.intervalKm,
        intervalMonths: newSchedule.intervalMonths || 3,
        lastServiceDate: new Date().toISOString().split('T')[0],
        lastServiceOdometer: formData.currentOdometer || 0
      };
      setFormData({
        ...formData,
        schedules: [...(formData.schedules || []), scheduleToAdd]
      });
      setNewSchedule({ serviceName: '', intervalKm: 10000, intervalMonths: 3 });
    }
  };

  const handleRemoveSchedule = (id: string) => {
    setFormData({
      ...formData,
      schedules: (formData.schedules || []).filter(s => s.id !== id)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plateNumber || !formData.clientId) return;

    setIsSubmitting(true);
    try {
      if (isEditing && formData.id) {
        await onEditTruck(formData as Truck);
      } else {
        const newTruckData: Truck = {
          ...formData as Truck,
          id: Math.random().toString(36).substr(2, 9),
          lastServiceDate: new Date().toISOString().split('T')[0],
          schedules: formData.schedules || []
        };
        await onAddTruck(newTruckData);
      }
      setIsModalOpen(false);
      setFormData(initialFormState);
    } catch (err: any) {
      alert('Gagal menyimpan data: ' + (err.message ?? 'Terjadi kesalahan'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTruck = async (truck: Truck) => {
    if (!onDeleteTruck) return;
    if (!window.confirm(`Hapus truk ${truck.plateNumber} (${truck.brand} ${truck.model})? Semua data service terkait juga akan dihapus.`)) return;
    try {
      await onDeleteTruck(truck.id);
    } catch (err: any) {
      alert('Gagal menghapus: ' + (err.message ?? 'Terjadi kesalahan'));
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-200">
            <TruckIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Data Armada & Jadwal</h1>
            <p className="text-sm text-slate-500">{trucks.length} unit armada terdaftar</p>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-blue-200 transition-all cursor-pointer"
        >
          <Plus size={18} /> Tambah Truk
        </button>
      </div>

      {/* Active Doc Filter Banner */}
      {docFilter && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle size={18} />
            <span className="text-sm font-medium">
              Menampilkan armada dengan {docFilter === 'stnk-expired' ? 'STNK Tahunan' : docFilter === 'tax5-expired' ? 'Pajak 5 Tahunan' : 'KIR'} <span className="font-bold">Expired</span>
            </span>
            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">{filteredTrucks.length} unit</span>
          </div>
          <button
            onClick={onClearDocFilter}
            className="text-sm text-red-600 hover:text-red-800 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <X size={14} /> Hapus Filter
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="relative md:col-span-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari No Polisi / Merk..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white transition-all"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <select
          className="border border-slate-200 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all cursor-pointer"
          value={filterClient}
          onChange={e => handleFilterChange(setFilterClient, e.target.value)}
        >
          <option value="all">Semua Client</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          className="border border-slate-200 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all cursor-pointer"
          value={filterSize}
          onChange={e => handleFilterChange(setFilterSize, e.target.value)}
        >
          <option value="all">Semua Ukuran</option>
          <option value="Small">Kecil (Small)</option>
          <option value="Big">Besar (Big)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold">No Polisi</th>
                <th className="p-4 font-semibold">Merk/Model</th>
                <th className="p-4 font-semibold">Client</th>
                <th className="p-4 font-semibold">Kategori</th>
                <th className="p-4 font-semibold">Alokasi</th>
                <th className="p-4 font-semibold text-right">KM Saat Ini</th>
                <th className="p-4 font-semibold text-center">STNK</th>
                <th className="p-4 font-semibold text-center">Pajak 5th</th>
                <th className="p-4 font-semibold text-center">KIR</th>
                <th className="p-4 font-semibold text-right">Service Default</th>
                <th className="p-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTrucks.map(truck => (
                <tr key={truck.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-gray-800">{truck.plateNumber}</td>
                  <td className="p-4 text-gray-600">{truck.brand} {truck.model} ({truck.year})</td>
                  <td className="p-4 text-blue-600">{clients.find(c => c.id === truck.clientId)?.name}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${truck.size === 'Big' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>
                      Truck {truck.size}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded text-xs bg-indigo-100 text-indigo-700">
                      {truck.allocation || '-'}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono">{truck.currentOdometer.toLocaleString()}</td>
                  <td className="p-4 text-center">{getExpiryBadge(truck.stnkExpiry)}</td>
                  <td className="p-4 text-center">{getExpiryBadge(truck.tax5yearExpiry)}</td>
                  <td className="p-4 text-center">{getExpiryBadge(truck.kirExpiry)}</td>
                  <td className="p-4 text-right text-gray-500">Every {truck.serviceIntervalKm.toLocaleString()} KM</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(truck)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="Edit / Atur Jadwal"
                      >
                        <Settings size={16} /> <span className="text-xs">Atur</span>
                      </button>
                      {onDeleteTruck && (
                        <button
                          onClick={() => handleDeleteTruck(truck)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          title="Hapus Truk"
                        >
                          <Trash2 size={16} /> <span className="text-xs">Hapus</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTrucks.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-gray-500">Data tidak ditemukan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredTrucks.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500">
              Menampilkan <span className="font-semibold text-slate-700">{(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filteredTrucks.length)}</span> dari <span className="font-semibold text-slate-700">{filteredTrucks.length}</span> data
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${page === safePage
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-white hover:text-blue-600 border border-slate-200'
                    }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white z-10 p-5 border-b border-slate-100 flex justify-between items-center rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <TruckIcon size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{isEditing ? 'Edit Data & Jadwal Truk' : 'Tambah Data Truk Baru'}</h2>
                  <p className="text-xs text-slate-400">Lengkapi informasi kendaraan di bawah ini</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">

              {/* Section 1: Informasi Kendaraan */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <SectionHeader num={1} icon={TruckIcon} title="Informasi Kendaraan" subtitle="Data identitas utama armada" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <InputField label="No Polisi" icon={Hash} required placeholder="B 1234 CD" value={formData.plateNumber || ''} onChange={(e: any) => setFormData({ ...formData, plateNumber: e.target.value })} />
                  <InputField label="Merk" required placeholder="Mitsubishi" value={formData.brand || ''} onChange={(e: any) => setFormData({ ...formData, brand: e.target.value })} />
                  <InputField label="Model" required placeholder="Colt Diesel" value={formData.model || ''} onChange={(e: any) => setFormData({ ...formData, model: e.target.value })} />
                  <InputField label="Tahun" type="number" required placeholder="2024" value={formData.year || ''} onChange={(e: any) => setFormData({ ...formData, year: parseInt(e.target.value) })} />
                  <InputField label="No Mesin" placeholder="4D34-T12345" value={formData.engineNumber || ''} onChange={(e: any) => setFormData({ ...formData, engineNumber: e.target.value })} />
                  <InputField label="No Rangka" placeholder="MHMFE74P5BK12345" value={formData.chassisNumber || ''} onChange={(e: any) => setFormData({ ...formData, chassisNumber: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <SelectField label="Client" icon={Building2} required value={formData.clientId || ''} onChange={(e: any) => setFormData({ ...formData, clientId: e.target.value })}>
                    <option value="">Pilih Client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </SelectField>
                  <SelectField label="Ukuran" value={formData.size || 'Big'} onChange={(e: any) => setFormData({ ...formData, size: e.target.value as any })}>
                    <option value="Small">Small</option>
                    <option value="Big">Big</option>
                  </SelectField>
                  <div className="relative">
                    <InputField
                      label="Alokasi"
                      icon={MapPin}
                      placeholder="Ketik atau pilih..."
                      list="truck-allocations"
                      value={formData.allocation || ''}
                      onChange={(e: any) => setFormData({ ...formData, allocation: e.target.value || null })}
                    />
                    {(() => {
                      const baseOptions = ALLOCATION_OPTIONS[(formData.size as TruckSize) || 'Big'] || [];
                      const existingAllocs = trucks
                        .filter(t => t.size === (formData.size || 'Big') && t.allocation)
                        .map(t => t.allocation as string);

                      const options = Array.from(new Set([...baseOptions, ...existingAllocs])).sort();

                      if (options.length === 0) return null;
                      return (
                        <datalist id="truck-allocations">
                          {options.map((opt: string) => (
                            <option key={opt} value={opt} />
                          ))}
                        </datalist>
                      );
                    })()}
                  </div>
                  <InputField label="Odometer" icon={Gauge} type="number" required placeholder="0" value={formData.currentOdometer || ''} onChange={(e: any) => setFormData({ ...formData, currentOdometer: parseInt(e.target.value) })} />
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    <span className="inline-flex items-center gap-1"><ClipboardList size={12} /> Deskripsi / Keterangan</span>
                  </label>
                  <textarea
                    className="w-full border border-slate-200 bg-slate-50 focus:bg-white p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    rows={2}
                    placeholder="Catatan tambahan tentang truk..."
                    value={formData.description || ''}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              {/* Section 2: Dokumen Kendaraan */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <SectionHeader num={2} icon={FileText} title="Dokumen Kendaraan" subtitle="Masa berlaku dokumen resmi" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      <span className="inline-flex items-center gap-1"><Calendar size={12} /> Pajak STNK Tahunan</span>
                    </label>
                    <input type="date" className="w-full border border-slate-200 bg-slate-50 focus:bg-white p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.stnkExpiry || ''} onChange={e => setFormData({ ...formData, stnkExpiry: e.target.value })} />
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      <span className="inline-flex items-center gap-1"><Calendar size={12} /> Pajak 5 Tahunan</span>
                    </label>
                    <input type="date" className="w-full border border-slate-200 bg-slate-50 focus:bg-white p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.tax5yearExpiry || ''} onChange={e => setFormData({ ...formData, tax5yearExpiry: e.target.value })} />
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      <span className="inline-flex items-center gap-1"><Calendar size={12} /> Masa Berlaku KIR</span>
                    </label>
                    <input type="date" className="w-full border border-slate-200 bg-slate-50 focus:bg-white p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.kirExpiry || ''} onChange={e => setFormData({ ...formData, kirExpiry: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Section 3: Jadwal Service Umum */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <SectionHeader num={3} icon={Clock} title="Jadwal Service Umum (Regular)" subtitle="Interval service berkala default" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InputField label="Interval KM" type="number" required value={formData.serviceIntervalKm || ''} onChange={(e: any) => setFormData({ ...formData, serviceIntervalKm: parseInt(e.target.value) })} />
                  <InputField label="Interval Bulan" type="number" required value={formData.serviceIntervalMonths || ''} onChange={(e: any) => setFormData({ ...formData, serviceIntervalMonths: parseInt(e.target.value) })} />
                  <InputField label="Last Service KM" icon={Gauge} type="number" required value={formData.lastServiceOdometer || ''} onChange={(e: any) => setFormData({ ...formData, lastServiceOdometer: parseInt(e.target.value) })} />
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      <span className="inline-flex items-center gap-1"><Calendar size={12} /> Last Service Date</span>
                    </label>
                    <input type="date" required className="w-full border border-slate-200 bg-slate-50 focus:bg-white p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.lastServiceDate || ''} onChange={e => setFormData({ ...formData, lastServiceDate: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Section 4: Jadwal Khusus */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <SectionHeader num={4} icon={Wrench} title="Jadwal Khusus (Per Item)" subtitle="Contoh: Ganti Ban, Kampas Rem, dll" />

                {/* Existing Schedules */}
                {formData.schedules && formData.schedules.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {formData.schedules.map((sch) => (
                      <div key={sch.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                            <Wrench size={14} />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-slate-800">{sch.serviceName}</p>
                            <p className="text-[11px] text-slate-400">
                              Setiap {sch.intervalKm.toLocaleString()} KM / {sch.intervalMonths} Bulan
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSchedule(sch.id)}
                          className="text-slate-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mb-4 p-4 bg-white border-2 border-dashed border-slate-200 rounded-xl text-center">
                    <Wrench size={24} className="mx-auto text-slate-300 mb-1" />
                    <p className="text-sm text-slate-400">Belum ada jadwal khusus</p>
                  </div>
                )}

                {/* Add New Schedule */}
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 block">Tambah Jadwal Baru</label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                      type="text"
                      placeholder="Nama (Mis: Ganti Ban)"
                      className="border border-slate-200 bg-slate-50 focus:bg-white p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all md:col-span-1"
                      value={newSchedule.serviceName}
                      onChange={e => setNewSchedule({ ...newSchedule, serviceName: e.target.value })}
                    />
                    <input
                      type="number"
                      placeholder="KM Interval"
                      className="border border-slate-200 bg-slate-50 focus:bg-white p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={newSchedule.intervalKm}
                      onChange={e => setNewSchedule({ ...newSchedule, intervalKm: parseInt(e.target.value) })}
                    />
                    <input
                      type="number"
                      placeholder="Bulan"
                      className="border border-slate-200 bg-slate-50 focus:bg-white p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={newSchedule.intervalMonths}
                      onChange={e => setNewSchedule({ ...newSchedule, intervalMonths: parseInt(e.target.value) })}
                    />
                    <button
                      type="button"
                      onClick={handleAddSchedule}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 rounded-lg text-sm flex items-center justify-center gap-1.5 font-medium transition-colors cursor-pointer"
                    >
                      <Plus size={15} /> Tambah
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 font-medium disabled:opacity-50 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-2.5 text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 font-semibold shadow-lg shadow-blue-200 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</>
                  ) : (
                    <><Save size={18} /> Simpan Data</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TruckList;