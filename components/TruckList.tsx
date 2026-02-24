import React, { useState } from 'react';
import { Truck, Client, ServiceSchedule } from '../types';
import { Search, Plus, Pencil, Trash, Calendar, Settings } from 'lucide-react';

interface TruckListProps {
  trucks: Truck[];
  clients: Client[];
  onAddTruck: (truck: Truck) => Promise<void>;
  onEditTruck: (truck: Truck) => Promise<void>;
}

const TruckList: React.FC<TruckListProps> = ({ trucks, clients, onAddTruck, onEditTruck }) => {
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterSize, setFilterSize] = useState<string>('all');

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Truck Form State
  const initialFormState: Partial<Truck> = {
    size: 'Big',
    serviceIntervalKm: 10000,
    serviceIntervalMonths: 6,
    currentOdometer: 0,
    lastServiceOdometer: 0,
    schedules: []
  };

  const [formData, setFormData] = useState<Partial<Truck>>(initialFormState);

  // State for new schedule input
  const [newSchedule, setNewSchedule] = useState<Partial<ServiceSchedule>>({
    serviceName: '',
    intervalKm: 10000,
    intervalMonths: 6
  });

  const filteredTrucks = trucks.filter(truck => {
    const matchesClient = filterClient === 'all' || truck.clientId === filterClient;
    const matchesSize = filterSize === 'all' || truck.size === filterSize;
    const matchesSearch = truck.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.brand.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesClient && matchesSize && matchesSearch;
  });

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

  // Schedule Management Handlers
  const handleAddSchedule = () => {
    if (newSchedule.serviceName && newSchedule.intervalKm) {
      const scheduleToAdd: ServiceSchedule = {
        id: `sch-${Date.now()}`,
        serviceName: newSchedule.serviceName,
        intervalKm: newSchedule.intervalKm,
        intervalMonths: newSchedule.intervalMonths || 6,
        lastServiceDate: new Date().toISOString().split('T')[0], // Default to today
        lastServiceOdometer: formData.currentOdometer || 0 // Default to current
      };

      setFormData({
        ...formData,
        schedules: [...(formData.schedules || []), scheduleToAdd]
      });

      setNewSchedule({ serviceName: '', intervalKm: 10000, intervalMonths: 6 });
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
        // Edit Mode
        await onEditTruck(formData as Truck);
      } else {
        // Add Mode
        const newTruckData: Truck = {
          ...formData as Truck,
          id: Math.random().toString(36).substr(2, 9),
          lastServiceDate: new Date().toISOString().split('T')[0],
          schedules: formData.schedules || []
        };
        await onAddTruck(newTruckData);
      }
      // Tutup modal hanya jika API berhasil
      setIsModalOpen(false);
      setFormData(initialFormState);
    } catch (err: any) {
      alert('Gagal menyimpan data: ' + (err.message ?? 'Terjadi kesalahan'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Data Armada & Jadwal</h1>
        <button
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={18} /> Tambah Truk
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="relative md:col-span-1">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari No Polisi / Merk..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="border border-gray-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500"
          value={filterClient}
          onChange={e => setFilterClient(e.target.value)}
        >
          <option value="all">Semua Client</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          className="border border-gray-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500"
          value={filterSize}
          onChange={e => setFilterSize(e.target.value)}
        >
          <option value="all">Semua Ukuran</option>
          <option value="Small">Kecil (Small)</option>
          <option value="Big">Besar (Big)</option>
        </select>


      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold">No Polisi</th>
                <th className="p-4 font-semibold">Merk/Model</th>
                <th className="p-4 font-semibold">Client</th>
                <th className="p-4 font-semibold">Kategori</th>

                <th className="p-4 font-semibold text-right">KM Saat Ini</th>
                <th className="p-4 font-semibold text-right">Service Default</th>
                <th className="p-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrucks.map(truck => (
                <tr key={truck.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-medium text-gray-800">{truck.plateNumber}</td>
                  <td className="p-4 text-gray-600">{truck.brand} {truck.model} ({truck.year})</td>
                  <td className="p-4 text-blue-600">{clients.find(c => c.id === truck.clientId)?.name}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${truck.size === 'Big' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>
                      Truck {truck.size}
                    </span>
                  </td>

                  <td className="p-4 text-right font-mono">{truck.currentOdometer.toLocaleString()}</td>
                  <td className="p-4 text-right text-gray-500">Every {truck.serviceIntervalKm.toLocaleString()} KM</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleOpenEdit(truck)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1 mx-auto"
                      title="Edit / Atur Jadwal"
                    >
                      <Settings size={16} /> <span className="text-xs">Atur</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTrucks.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">Data tidak ditemukan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">{isEditing ? 'Edit Data & Jadwal Truk' : 'Tambah Data Truk'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">

              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 border-b pb-2">Informasi Kendaraan</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">No Polisi</label>
                    <input required className="w-full border p-2 rounded" value={formData.plateNumber || ''} onChange={e => setFormData({ ...formData, plateNumber: e.target.value })} placeholder="B 1234 CD" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Merk</label>
                    <input required className="w-full border p-2 rounded" value={formData.brand || ''} onChange={e => setFormData({ ...formData, brand: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input required className="w-full border p-2 rounded" value={formData.model || ''} onChange={e => setFormData({ ...formData, model: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
                    <input type="number" required className="w-full border p-2 rounded" value={formData.year || ''} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                    <select className="w-full border p-2 rounded" required value={formData.clientId || ''} onChange={e => setFormData({ ...formData, clientId: e.target.value })}>
                      <option value="">Pilih Client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Odometer Saat Ini</label>
                    <input type="number" required className="w-full border p-2 rounded" value={formData.currentOdometer || ''} onChange={e => setFormData({ ...formData, currentOdometer: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ukuran</label>
                    <select
                      className="w-full border p-2 rounded"
                      value={formData.size || 'Big'}
                      onChange={e => setFormData({ ...formData, size: e.target.value as any })}
                    >
                      <option value="Small">Small</option>
                      <option value="Big">Big</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Default/General Service Schedule */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 border-b pb-2">Jadwal Service Umum (Regular)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interval KM</label>
                    <input type="number" required className="w-full border p-2 rounded" value={formData.serviceIntervalKm || ''} onChange={e => setFormData({ ...formData, serviceIntervalKm: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interval Bulan</label>
                    <input type="number" required className="w-full border p-2 rounded" value={formData.serviceIntervalMonths || ''} onChange={e => setFormData({ ...formData, serviceIntervalMonths: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Service KM</label>
                    <input type="number" required className="w-full border p-2 rounded" value={formData.lastServiceOdometer || ''} onChange={e => setFormData({ ...formData, lastServiceOdometer: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Service Date</label>
                    <input type="date" required className="w-full border p-2 rounded" value={formData.lastServiceDate || ''} onChange={e => setFormData({ ...formData, lastServiceDate: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Specific Schedules */}
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800 border-b pb-2 flex items-center justify-between">
                  <span>Jadwal Khusus (Per Item)</span>
                  <span className="text-xs font-normal text-gray-500">Contoh: Ganti Ban, Kampas Rem</span>
                </h3>

                {/* List Existing Schedules */}
                {formData.schedules && formData.schedules.length > 0 ? (
                  <div className="space-y-2">
                    {formData.schedules.map((sch) => (
                      <div key={sch.id} className="flex items-center justify-between bg-white p-3 rounded border shadow-sm">
                        <div>
                          <p className="font-bold text-sm text-blue-700">{sch.serviceName}</p>
                          <p className="text-xs text-gray-500">
                            Setiap {sch.intervalKm.toLocaleString()} KM / {sch.intervalMonths} Bulan
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSchedule(sch.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Belum ada jadwal khusus.</p>
                )}

                {/* Add New Schedule Form */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="text-xs font-bold text-gray-600 uppercase mb-2 block">Tambah Jadwal Baru</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Nama (Mis: Ganti Ban)"
                      className="border p-2 rounded text-sm"
                      value={newSchedule.serviceName}
                      onChange={e => setNewSchedule({ ...newSchedule, serviceName: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="KM Interval"
                        className="border p-2 rounded text-sm w-full"
                        value={newSchedule.intervalKm}
                        onChange={e => setNewSchedule({ ...newSchedule, intervalKm: parseInt(e.target.value) })}
                      />
                      <input
                        type="number"
                        placeholder="Bulan"
                        className="border p-2 rounded text-sm w-full"
                        value={newSchedule.intervalMonths}
                        onChange={e => setNewSchedule({ ...newSchedule, intervalMonths: parseInt(e.target.value) })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSchedule}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-1"
                    >
                      <Plus size={14} /> Tambah
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {isSubmitting ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</> : 'Simpan Data'}
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