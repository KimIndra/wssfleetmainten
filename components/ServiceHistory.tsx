
import React, { useState, useEffect } from 'react';
import { ServiceRecord, Truck, SparePart } from '../types';
import { formatDate, formatCurrency, exportToCSV } from '../utils';
import { Search, ChevronDown, ChevronUp, Plus, Trash, Save, Wrench, Check, Download } from 'lucide-react';

interface ServiceHistoryProps {
  services: ServiceRecord[];
  trucks: Truck[];
  onAddService: (service: ServiceRecord) => void;
}

// Available Categories for selection
const SERVICE_CATEGORIES = [
  'Regular', 'Oil Change', 'Tune Up', 'Brake System', 
  'Tire Change', 'Major', 'Engine Repair', 'Electrical', 
  'Suspension', 'Body Repair', 'Other'
];

const ServiceHistory: React.FC<ServiceHistoryProps> = ({ services, trucks, onAddService }) => {
  const [filterType, setFilterType] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formTruckId, setFormTruckId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formOdo, setFormOdo] = useState<number>(0);
  
  // Changed to Array for Multi-select
  const [formSelectedTypes, setFormSelectedTypes] = useState<string[]>([]);
  
  const [formMechanic, setFormMechanic] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLaborCost, setFormLaborCost] = useState<number>(0);
  
  // Dynamic Parts State
  const [formParts, setFormParts] = useState<Partial<SparePart>[]>([
    { id: Date.now().toString(), name: '', partNumber: '', quantity: 1, price: 0 }
  ]);

  // Derive available years
  const years = Array.from(new Set(services.map(s => s.serviceDate.split('-')[0]))).sort();

  // Auto-fill odometer when truck is selected
  useEffect(() => {
    if (formTruckId) {
      const truck = trucks.find(t => t.id === formTruckId);
      if (truck) {
        setFormOdo(truck.currentOdometer);
      }
    }
  }, [formTruckId, trucks]);

  const filteredServices = services.filter(service => {
    const date = new Date(service.serviceDate);
    // Filter logic: if 'all', show all. Else, check if the array includes the selected type.
    const matchesType = filterType === 'all' || service.serviceTypes.includes(filterType);
    const matchesMonth = filterMonth === 'all' || (date.getMonth() + 1).toString() === filterMonth;
    const matchesYear = filterYear === 'all' || date.getFullYear().toString() === filterYear;

    return matchesType && matchesMonth && matchesYear;
  });

  const toggleExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Form Handlers
  const toggleServiceType = (type: string) => {
    setFormSelectedTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleAddPart = () => {
    setFormParts([...formParts, { id: Date.now().toString(), name: '', partNumber: '', quantity: 1, price: 0 }]);
  };

  const handleRemovePart = (index: number) => {
    const newParts = [...formParts];
    newParts.splice(index, 1);
    setFormParts(newParts);
  };

  const handlePartChange = (index: number, field: keyof SparePart, value: any) => {
    const newParts = [...formParts];
    newParts[index] = { ...newParts[index], [field]: value };
    setFormParts(newParts);
  };

  const calculateTotalCost = () => {
    const partsCost = formParts.reduce((sum, part) => sum + ((part.price || 0) * (part.quantity || 0)), 0);
    return partsCost + formLaborCost;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formSelectedTypes.length === 0) {
      alert("Mohon pilih setidaknya satu jenis service.");
      return;
    }

    const validParts = formParts.filter(p => p.name && p.price);
    
    const newService: ServiceRecord = {
      id: `srv-${Date.now()}`,
      truckId: formTruckId,
      serviceDate: formDate,
      odometer: formOdo,
      serviceTypes: formSelectedTypes,
      description: formDescription,
      mechanic: formMechanic,
      parts: validParts as SparePart[],
      laborCost: formLaborCost,
      totalCost: calculateTotalCost()
    };

    onAddService(newService);
    setIsModalOpen(false);
    
    // Reset Form
    setFormTruckId('');
    setFormDescription('');
    setFormLaborCost(0);
    setFormSelectedTypes([]);
    setFormParts([{ id: Date.now().toString(), name: '', partNumber: '', quantity: 1, price: 0 }]);
  };

  const handleOpenModal = () => {
    setFormSelectedTypes(['Regular']); // Default selection
    setIsModalOpen(true);
  }

  const handleExport = () => {
    const dataToExport = filteredServices.map(s => {
      const truck = trucks.find(t => t.id === s.truckId);
      // Summarize parts into a single string for CSV readability
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
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
          >
            <Download size={18} /> Export Data
          </button>
          <button 
            onClick={handleOpenModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
          >
            <Wrench size={18} /> Input Service Baru
          </button>
        </div>
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

      {/* Input Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Wrench className="text-blue-600" /> Input Service Baru
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
              
              {/* Section 1: Informasi Utama */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Armada</label>
                  <select 
                    required 
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formTruckId}
                    onChange={e => setFormTruckId(e.target.value)}
                  >
                    <option value="">-- Pilih Truck --</option>
                    {trucks.map(t => (
                      <option key={t.id} value={t.id}>{t.plateNumber} - {t.brand}</option>
                    ))}
                  </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Service</label>
                   <input 
                      type="date" 
                      required 
                      className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Odometer (KM)</label>
                   <input 
                      type="number" 
                      required 
                      className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formOdo}
                      onChange={e => setFormOdo(parseInt(e.target.value))}
                   />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Mekanik / Bengkel</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Contoh: Pak Budi / Bengkel Resmi"
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formMechanic}
                    onChange={e => setFormMechanic(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Service (Bisa pilih lebih dari satu)</label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded bg-slate-50">
                    {SERVICE_CATEGORIES.map(type => {
                      const isSelected = formSelectedTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleServiceType(type)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1
                            ${isSelected 
                              ? 'bg-blue-600 text-white border-blue-600' 
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}
                        >
                          {isSelected && <Check size={14} />}
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi / Keluhan</label>
                   <textarea 
                      className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                      rows={2}
                      placeholder="Catatan detail pekerjaan..."
                      value={formDescription}
                      onChange={e => setFormDescription(e.target.value)}
                   />
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Section 2: Spare Parts */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-700">Suku Cadang & Material</h3>
                  <button 
                    type="button" 
                    onClick={handleAddPart}
                    className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 flex items-center"
                  >
                    <Plus size={14} className="mr-1" /> Tambah Baris
                  </button>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                  {formParts.map((part, index) => (
                    <div key={index} className="flex flex-col md:flex-row gap-2 items-end">
                      <div className="flex-grow">
                        <label className="text-xs text-gray-500 block mb-1">Nama Part</label>
                        <input 
                          type="text" 
                          placeholder="Nama barang"
                          className="w-full border p-2 rounded text-sm"
                          value={part.name}
                          onChange={e => handlePartChange(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="w-full md:w-32">
                        <label className="text-xs text-gray-500 block mb-1">Kode Part</label>
                        <input 
                          type="text" 
                          placeholder="Optional"
                          className="w-full border p-2 rounded text-sm"
                          value={part.partNumber}
                          onChange={e => handlePartChange(index, 'partNumber', e.target.value)}
                        />
                      </div>
                      <div className="w-24">
                        <label className="text-xs text-gray-500 block mb-1">Qty</label>
                        <input 
                          type="number" 
                          min="1"
                          className="w-full border p-2 rounded text-sm text-center"
                          value={part.quantity}
                          onChange={e => handlePartChange(index, 'quantity', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="w-full md:w-40">
                        <label className="text-xs text-gray-500 block mb-1">Harga Satuan</label>
                        <input 
                          type="number" 
                          min="0"
                          className="w-full border p-2 rounded text-sm text-right"
                          value={part.price}
                          onChange={e => handlePartChange(index, 'price', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="w-full md:w-40 text-right pb-2 font-mono text-sm text-gray-600 bg-white p-2 border rounded">
                         {formatCurrency((part.price || 0) * (part.quantity || 0))}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemovePart(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                        disabled={formParts.length === 1}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  ))}
                  
                  <div className="flex justify-end pt-2 text-sm text-gray-600">
                     <span>Subtotal Parts: <b>{formatCurrency(formParts.reduce((sum, part) => sum + ((part.price || 0) * (part.quantity || 0)), 0))}</b></span>
                  </div>
                </div>
              </div>

              {/* Section 3: Biaya Jasa & Total */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex flex-col md:flex-row justify-end items-center gap-4">
                  <div className="w-full md:w-64">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Biaya Jasa Mekanik</label>
                    <input 
                      type="number" 
                      min="0"
                      className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 text-right font-semibold"
                      value={formLaborCost}
                      onChange={e => setFormLaborCost(parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center border-t border-blue-200 pt-4">
                   <span className="text-lg font-bold text-gray-700">Total Biaya Service</span>
                   <span className="text-2xl font-bold text-blue-700">{formatCurrency(calculateTotalCost())}</span>
                </div>
              </div>

            </form>
            
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white sticky bottom-0">
               <button 
                 type="button" 
                 onClick={() => setIsModalOpen(false)}
                 className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
               >
                 Batal
               </button>
               <button 
                 onClick={handleSubmit}
                 className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
               >
                 <Save size={18} /> Simpan Data Service
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceHistory;
