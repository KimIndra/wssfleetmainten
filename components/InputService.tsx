import React, { useState, useEffect, useRef } from 'react';
import { ServiceRecord, Truck, SparePart } from '../types';
import { formatCurrency } from '../utils';
import { Plus, Trash, Save, Wrench, Check, CheckCircle, Search, X } from 'lucide-react';

interface InputServiceProps {
    trucks: Truck[];
    onAddService: (service: ServiceRecord) => Promise<void>;
}

const SERVICE_CATEGORIES = [
    'Regular', 'Oil Change', 'Tune Up', 'Brake System',
    'Tire Change', 'Major', 'Engine Repair', 'Electrical',
    'Suspension', 'Body Repair', 'Other'
];

const InputService: React.FC<InputServiceProps> = ({ trucks, onAddService }) => {
    const [formTruckId, setFormTruckId] = useState('');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formOdo, setFormOdo] = useState<number>(0);
    const [formSelectedTypes, setFormSelectedTypes] = useState<string[]>([]);
    const [formMechanic, setFormMechanic] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formLaborCost, setFormLaborCost] = useState<number>(0);
    const [formParts, setFormParts] = useState<Partial<SparePart>[]>([
        { id: Date.now().toString(), name: '', partNumber: '', quantity: 1, price: 0 }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Search suggestion state
    const [truckSearch, setTruckSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filtered trucks for suggestion
    const filteredTrucks = trucks.filter(t =>
        t.plateNumber.toLowerCase().includes(truckSearch.toLowerCase()) ||
        t.brand.toLowerCase().includes(truckSearch.toLowerCase()) ||
        t.model.toLowerCase().includes(truckSearch.toLowerCase())
    );

    // Auto-fill odometer
    useEffect(() => {
        if (formTruckId) {
            const truck = trucks.find(t => t.id === formTruckId);
            if (truck) setFormOdo(truck.currentOdometer);
        }
    }, [formTruckId, trucks]);

    const toggleServiceType = (type: string) => {
        setFormSelectedTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
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

    const resetForm = () => {
        setFormTruckId('');
        setTruckSearch('');
        setFormDate(new Date().toISOString().split('T')[0]);
        setFormOdo(0);
        setFormSelectedTypes([]);
        setFormMechanic('');
        setFormDescription('');
        setFormLaborCost(0);
        setFormParts([{ id: Date.now().toString(), name: '', partNumber: '', quantity: 1, price: 0 }]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formSelectedTypes.length === 0) {
            alert('Mohon pilih setidaknya satu jenis service.');
            return;
        }

        if (!formTruckId) {
            alert('Mohon pilih armada terlebih dahulu.');
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

        setIsSubmitting(true);
        try {
            await onAddService(newService);
            setShowSuccess(true);
            resetForm();
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err: any) {
            alert('Gagal menyimpan: ' + (err.message ?? 'Terjadi kesalahan'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedTruck = trucks.find(t => t.id === formTruckId);

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Wrench className="text-blue-600" /> Input Service Baru
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Catat data service dan biaya perawatan armada</p>
                </div>
            </div>

            {/* Success Banner */}
            {showSuccess && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 animate-pulse">
                    <CheckCircle size={20} />
                    <span className="font-medium">Data service berhasil disimpan!</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section 1: Info Utama */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Informasi Utama</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative" ref={suggestionsRef}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cari Armada (No Polisi) *</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Ketik no polisi..."
                                    className="w-full border p-2.5 pl-9 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={truckSearch}
                                    onChange={e => {
                                        setTruckSearch(e.target.value);
                                        setShowSuggestions(true);
                                        if (!e.target.value) setFormTruckId('');
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                />
                                {formTruckId && (
                                    <button
                                        type="button"
                                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                        onClick={() => { setFormTruckId(''); setTruckSearch(''); }}
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            {showSuggestions && truckSearch && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {filteredTrucks.length > 0 ? filteredTrucks.map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 flex justify-between items-center transition-colors ${formTruckId === t.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'
                                                }`}
                                            onClick={() => {
                                                setFormTruckId(t.id);
                                                setTruckSearch(`${t.plateNumber} - ${t.brand} ${t.model}`);
                                                setShowSuggestions(false);
                                            }}
                                        >
                                            <span className="font-medium">{t.plateNumber}</span>
                                            <span className="text-xs text-gray-400">{t.brand} {t.model}</span>
                                        </button>
                                    )) : (
                                        <div className="px-4 py-3 text-sm text-gray-400 italic">Tidak ada armada ditemukan</div>
                                    )}
                                </div>
                            )}
                            {selectedTruck && (
                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                    <CheckCircle size={12} /> Terpilih: {selectedTruck.plateNumber} — {selectedTruck.brand} {selectedTruck.model} ({selectedTruck.size})
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Service *</label>
                            <input
                                type="date"
                                required
                                className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formDate}
                                onChange={e => setFormDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Odometer (KM) *</label>
                            <input
                                type="number"
                                required
                                className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formOdo}
                                onChange={e => setFormOdo(parseInt(e.target.value))}
                            />
                            {selectedTruck && (
                                <p className="text-xs text-gray-400 mt-1">Odometer terakhir: {selectedTruck.currentOdometer.toLocaleString()} KM</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Mekanik / Bengkel *</label>
                            <input
                                type="text"
                                required
                                placeholder="Contoh: Pak Budi / Bengkel Resmi"
                                className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formMechanic}
                                onChange={e => setFormMechanic(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Section 2: Jenis Service */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Jenis Service *</h3>
                    <p className="text-sm text-gray-500 mb-3">Pilih satu atau lebih jenis service yang dilakukan:</p>
                    <div className="flex flex-wrap gap-2">
                        {SERVICE_CATEGORIES.map(type => {
                            const isSelected = formSelectedTypes.includes(type);
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => toggleServiceType(type)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all flex items-center gap-1.5
                    ${isSelected
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                >
                                    {isSelected && <Check size={14} />}
                                    {type}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi / Keluhan</label>
                        <textarea
                            className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            rows={2}
                            placeholder="Catatan detail pekerjaan..."
                            value={formDescription}
                            onChange={e => setFormDescription(e.target.value)}
                        />
                    </div>
                </div>

                {/* Section 3: Suku Cadang */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-semibold text-gray-800">Suku Cadang & Material</h3>
                        <button
                            type="button"
                            onClick={handleAddPart}
                            className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                        >
                            <Plus size={14} /> Tambah Baris
                        </button>
                    </div>

                    <div className="space-y-3">
                        {formParts.map((part, index) => (
                            <div key={index} className="flex flex-col md:flex-row gap-2 items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
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
                                <div className="w-full md:w-36 text-right pb-0.5 font-mono text-sm text-gray-600 bg-white p-2 border rounded">
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

                {/* Section 4: Biaya & Total */}
                <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-100 p-6">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                        <div className="w-full md:w-64">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Biaya Jasa Mekanik</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 text-right font-semibold"
                                value={formLaborCost}
                                onChange={e => setFormLaborCost(parseInt(e.target.value))}
                            />
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Total Biaya Service</p>
                            <p className="text-3xl font-bold text-blue-700">{formatCurrency(calculateTotalCost())}</p>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={resetForm}
                        disabled={isSubmitting}
                        className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50"
                    >
                        Reset Form
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-8 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-sm disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</>
                        ) : (
                            <><Save size={18} /> Simpan Data Service</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default InputService;
