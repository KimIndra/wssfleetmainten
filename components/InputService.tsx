import React, { useState, useEffect, useRef } from 'react';
import { ServiceRecord, Truck, SparePart } from '../types';
import { formatCurrency } from '../utils';
import { Plus, Trash2, Save, Wrench, Check, CheckCircle, Search, X, Truck as TruckIcon, Calendar, Gauge, UserRound, FileText, Package, DollarSign, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';

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

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredTrucks = trucks.filter(t =>
        t.plateNumber.toLowerCase().includes(truckSearch.toLowerCase()) ||
        t.brand.toLowerCase().includes(truckSearch.toLowerCase()) ||
        t.model.toLowerCase().includes(truckSearch.toLowerCase())
    );

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

    const partsSubtotal = formParts.reduce((sum, part) => sum + ((part.price || 0) * (part.quantity || 0)), 0);
    const totalCost = partsSubtotal + formLaborCost;

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
            totalCost: totalCost
        };

        setIsSubmitting(true);
        try {
            await onAddService(newService);
            setShowSuccess(true);
            resetForm();
            setTimeout(() => setShowSuccess(false), 4000);
        } catch (err: any) {
            alert('Gagal menyimpan: ' + (err.message ?? 'Terjadi kesalahan'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedTruck = trucks.find(t => t.id === formTruckId);

    // Step indicator helper
    const StepBadge = ({ num, label, icon: Icon, done }: { num: number; label: string; icon: any; done: boolean }) => (
        <div className="flex items-center gap-3 mb-5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${done ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}>
                {done ? <Check size={16} /> : num}
            </div>
            <div className="flex items-center gap-2">
                <Icon size={18} className={done ? 'text-green-500' : 'text-blue-600'} />
                <h3 className="text-base font-semibold text-slate-800">{label}</h3>
            </div>
        </div>
    );

    return (
        <div className="p-6 bg-slate-50 min-h-full">
            <div className="max-w-5xl mx-auto">
                {/* Page Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-200">
                            <Wrench size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Input Service Baru</h1>
                            <p className="text-sm text-slate-500">Catat data service dan biaya perawatan armada</p>
                        </div>
                    </div>
                </div>

                {/* Success Banner */}
                {showSuccess && (
                    <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-700 px-5 py-4 rounded-xl flex items-center gap-3 shadow-sm">
                        <div className="p-1 bg-green-500 rounded-full">
                            <CheckCircle size={18} className="text-white" />
                        </div>
                        <div>
                            <p className="font-semibold">Berhasil!</p>
                            <p className="text-sm text-green-600">Data service baru berhasil disimpan ke database.</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Section 1: Informasi Utama */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
                        <StepBadge num={1} label="Informasi Utama" icon={TruckIcon} done={!!formTruckId && !!formDate && !!formMechanic} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-11">
                            {/* Search Armada */}
                            <div className="relative" ref={suggestionsRef}>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">Cari Armada (No Polisi) <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Ketik no polisi, merk, atau model..."
                                        className="w-full border border-slate-200 p-2.5 pl-9 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50 focus:bg-white"
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
                                            className="absolute right-3 top-3 text-slate-400 hover:text-red-500 transition-colors"
                                            onClick={() => { setFormTruckId(''); setTruckSearch(''); }}
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                                {showSuggestions && truckSearch && (
                                    <div className="absolute z-20 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                                        {filteredTrucks.length > 0 ? filteredTrucks.map(t => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                className={`w-full text-left px-4 py-3 hover:bg-blue-50 flex justify-between items-center transition-colors border-b border-slate-50 last:border-0 ${formTruckId === t.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                                                    }`}
                                                onClick={() => {
                                                    setFormTruckId(t.id);
                                                    setTruckSearch(`${t.plateNumber} — ${t.brand} ${t.model}`);
                                                    setShowSuggestions(false);
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <TruckIcon size={14} className="text-slate-400" />
                                                    <span className="font-semibold">{t.plateNumber}</span>
                                                </div>
                                                <span className="text-xs text-slate-400">{t.brand} {t.model}</span>
                                            </button>
                                        )) : (
                                            <div className="px-4 py-4 text-sm text-slate-400 italic text-center">Tidak ada armada ditemukan</div>
                                        )}
                                    </div>
                                )}
                                {selectedTruck && (
                                    <div className="mt-2 p-2.5 bg-green-50 border border-green-100 rounded-lg flex items-center gap-2">
                                        <CheckCircle size={14} className="text-green-500" />
                                        <span className="text-xs text-green-700 font-medium">{selectedTruck.plateNumber} — {selectedTruck.brand} {selectedTruck.model} ({selectedTruck.size})</span>
                                    </div>
                                )}
                            </div>

                            {/* Tanggal */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                    <span className="flex items-center gap-1.5"><Calendar size={14} /> Tanggal Service <span className="text-red-400">*</span></span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50 focus:bg-white"
                                    value={formDate}
                                    onChange={e => setFormDate(e.target.value)}
                                />
                            </div>

                            {/* Odometer */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                    <span className="flex items-center gap-1.5"><Gauge size={14} /> Odometer (KM) <span className="text-red-400">*</span></span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50 focus:bg-white"
                                    value={formOdo}
                                    onChange={e => setFormOdo(parseInt(e.target.value))}
                                />
                                {selectedTruck && (
                                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                                        <Gauge size={11} /> Terakhir: {selectedTruck.currentOdometer.toLocaleString()} KM
                                    </p>
                                )}
                            </div>

                            {/* Mekanik */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                    <span className="flex items-center gap-1.5"><UserRound size={14} /> Nama Mekanik / Bengkel <span className="text-red-400">*</span></span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Pak Budi / Bengkel Resmi"
                                    className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50 focus:bg-white"
                                    value={formMechanic}
                                    onChange={e => setFormMechanic(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Jenis Service */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
                        <StepBadge num={2} label="Jenis Service" icon={Wrench} done={formSelectedTypes.length > 0} />
                        <div className="pl-11">
                            <p className="text-sm text-slate-500 mb-4">Pilih satu atau lebih jenis service yang dilakukan:</p>
                            <div className="flex flex-wrap gap-2">
                                {SERVICE_CATEGORIES.map(type => {
                                    const isSelected = formSelectedTypes.includes(type);
                                    return (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => toggleServiceType(type)}
                                            className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all flex items-center gap-1.5 cursor-pointer
                                                ${isSelected
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100 scale-105'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'}`}
                                        >
                                            {isSelected && <Check size={14} />}
                                            {type}
                                        </button>
                                    );
                                })}
                            </div>
                            {formSelectedTypes.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    <span className="text-xs text-slate-400">Terpilih:</span>
                                    {formSelectedTypes.map(t => (
                                        <span key={t} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{t}</span>
                                    ))}
                                </div>
                            )}
                            <div className="mt-5">
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                    <span className="flex items-center gap-1.5"><FileText size={14} /> Deskripsi / Keluhan</span>
                                </label>
                                <textarea
                                    className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50 focus:bg-white"
                                    rows={3}
                                    placeholder="Catatan detail pekerjaan yang dilakukan..."
                                    value={formDescription}
                                    onChange={e => setFormDescription(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Suku Cadang */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <StepBadge num={3} label="Suku Cadang & Material" icon={Package} done={formParts.some(p => !!p.name)} />
                            <button
                                type="button"
                                onClick={handleAddPart}
                                className="text-sm bg-blue-50 text-blue-600 px-3.5 py-2 rounded-lg hover:bg-blue-100 flex items-center gap-1.5 font-medium transition-colors cursor-pointer border border-blue-100 hover:border-blue-200 mb-5"
                            >
                                <Plus size={15} /> Tambah Baris
                            </button>
                        </div>

                        <div className="pl-11 space-y-3">
                            {/* Table header for desktop */}
                            <div className="hidden md:grid md:grid-cols-12 gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 pb-1">
                                <div className="col-span-4">Nama Part</div>
                                <div className="col-span-2">Kode Part</div>
                                <div className="col-span-1 text-center">Qty</div>
                                <div className="col-span-2 text-right">Harga Satuan</div>
                                <div className="col-span-2 text-right">Subtotal</div>
                                <div className="col-span-1"></div>
                            </div>

                            {formParts.map((part, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors group">
                                    <div className="col-span-4">
                                        <label className="text-xs text-slate-400 block mb-1 md:hidden">Nama Part</label>
                                        <input
                                            type="text"
                                            placeholder="Nama barang"
                                            className="w-full border border-slate-200 p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            value={part.name}
                                            onChange={e => handlePartChange(index, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-slate-400 block mb-1 md:hidden">Kode Part</label>
                                        <input
                                            type="text"
                                            placeholder="Optional"
                                            className="w-full border border-slate-200 p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            value={part.partNumber}
                                            onChange={e => handlePartChange(index, 'partNumber', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-xs text-slate-400 block mb-1 md:hidden">Qty</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full border border-slate-200 p-2 rounded-lg text-sm text-center bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            value={part.quantity}
                                            onChange={e => handlePartChange(index, 'quantity', parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-slate-400 block mb-1 md:hidden">Harga Satuan</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full border border-slate-200 p-2 rounded-lg text-sm text-right bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            value={part.price}
                                            onChange={e => handlePartChange(index, 'price', parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div className="col-span-2 text-right font-mono text-sm text-slate-700 font-medium px-2">
                                        {formatCurrency((part.price || 0) * (part.quantity || 0))}
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePart(index)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                                            disabled={formParts.length === 1}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <div className="flex justify-end pt-2 pr-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-slate-500">Subtotal Parts:</span>
                                    <span className="font-bold text-slate-700">{formatCurrency(partsSubtotal)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Biaya & Total */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-6 hover:shadow-md transition-shadow">
                        <StepBadge num={4} label="Ringkasan Biaya" icon={DollarSign} done={totalCost > 0} />
                        <div className="pl-11">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Biaya Jasa Mekanik</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 text-right font-semibold bg-white outline-none"
                                        value={formLaborCost}
                                        onChange={e => setFormLaborCost(parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Subtotal Parts</p>
                                    <p className="text-lg font-bold text-slate-700">{formatCurrency(partsSubtotal)}</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-4 rounded-xl text-center shadow-lg shadow-blue-200">
                                    <p className="text-xs text-blue-100 uppercase tracking-wider mb-1">Total Biaya</p>
                                    <p className="text-2xl font-bold text-white">{formatCurrency(totalCost)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex justify-between items-center pt-2">
                        <button
                            type="button"
                            onClick={resetForm}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 font-medium disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <RotateCcw size={16} /> Reset Form
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-8 py-3 text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 font-semibold shadow-lg shadow-blue-200 disabled:opacity-50 transition-all cursor-pointer"
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
        </div>
    );
};

export default InputService;
