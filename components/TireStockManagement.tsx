import React, { useState, useEffect } from 'react';
import { TireStock, Truck } from '../types';
import { formatCurrency } from '../utils';
import {
    Plus, Trash2, Package, CheckCircle, XCircle,
    Search, ChevronDown, ChevronUp, Download, Filter, X, LogOut, ArrowRightLeft
} from 'lucide-react';
import { api } from '../lib/api';

interface TireStockManagementProps {
    tireStock: TireStock[];
    trucks: Truck[];
    onAddTire: (tire: TireStock) => Promise<void>;
    onDeleteTire: (id: string) => Promise<void>;
    onUpdateTire?: (id: string, updates: Partial<TireStock>) => Promise<void>;
}

const TireStockManagement: React.FC<TireStockManagementProps> = ({
    tireStock,
    trucks,
    onAddTire,
    onDeleteTire,
    onUpdateTire,
}) => {
    const [activeTab, setActiveTab] = useState<'in' | 'out' | 'misc_in' | 'misc_out'>('in');
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [searchSerial, setSearchSerial] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'used'>('all');

    // Form state
    const [formType, setFormType] = useState<'normal' | 'misc_in'>('normal');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formSupplier, setFormSupplier] = useState('');
    const [formItemName, setFormItemName] = useState('');
    const [formQty, setFormQty] = useState(1);
    const [formSerial, setFormSerial] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formPrice, setFormPrice] = useState(0);

    // Misc out form state
    const [showOutForm, setShowOutForm] = useState(false);
    const [outSelectedTireId, setOutSelectedTireId] = useState('');
    const [outDesc, setOutDesc] = useState('');

    // Transfer (Mutasi) form state
    const [showTransferForm, setShowTransferForm] = useState(false);
    const [transferTireId, setTransferTireId] = useState('');
    const [transferTruckId, setTransferTruckId] = useState('');
    const [transferDesc, setTransferDesc] = useState('');

    useEffect(() => {
        setShowForm(false);
        setShowOutForm(false);
        setShowTransferForm(false);
        if (activeTab === 'misc_in') setFormType('misc_in');
        else if (activeTab === 'in') setFormType('normal');
    }, [activeTab]);

    const resetForm = () => {
        setFormDate(new Date().toISOString().split('T')[0]);
        setFormSupplier('');
        setFormItemName('');
        setFormQty(1);
        setFormSerial('');
        setFormDesc('');
        setFormPrice(0);
        setShowForm(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formSupplier || !formItemName) {
            alert('Mohon isi nama supplier dan nama barang.');
            return;
        }
        const newTire: TireStock = {
            id: `tire-${Date.now()}`,
            date: formDate,
            supplierName: formType === 'misc_in' && !formSupplier ? 'INTERNAL' : formSupplier,
            itemName: formItemName,
            quantity: formQty,
            serialNumber: formSerial,
            description: formType === 'misc_in' ? `(MISC IN) ${formDesc}` : formDesc,
            price: formType === 'misc_in' ? 0 : formPrice,
            status: 'available',
        };
        setIsSubmitting(true);
        try {
            await onAddTire(newTire);
            setShowSuccess(true);
            resetForm();
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err: any) {
            alert('Gagal menyimpan: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, serial: string) => {
        if (!window.confirm(`Hapus ban No Seri "${serial}" dari stok?`)) return;
        try {
            await onDeleteTire(id);
        } catch (err: any) {
            alert('Gagal menghapus: ' + err.message);
        }
    };

    const handleOutFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!outSelectedTireId || !onUpdateTire) return;
        const selected = tireStock.find(t => t.id === outSelectedTireId);
        if (!selected) return;
        
        try {
            await onUpdateTire(selected.id, {
                status: 'used',
                usedByTruckId: 'MISC-OUT',
                usedDate: new Date().toISOString().split('T')[0],
                description: selected.description 
                    ? `${selected.description} | Misc Out: ${outDesc}` 
                    : `Misc Out: ${outDesc}`
            });
            setShowOutForm(false);
            setOutSelectedTireId('');
            setOutDesc('');
        } catch (err: any) {
            alert('Gagal Misc Out: ' + err.message);
        }
    };

    const handleTransferFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transferTireId || !transferTruckId || !onUpdateTire) return;

        const selectedTire = tireStock.find(t => t.id === transferTireId);
        if (!selectedTire) return;
        if (selectedTire.usedByTruckId === transferTruckId) {
            alert('Truk tujuan tidak boleh sama dengan truk asal (sedang dipakai di truk tersebut).');
            return;
        }

        const originTruck = trucks.find(t => t.id === selectedTire.usedByTruckId)?.plateNumber || selectedTire.usedByTruckId;
        const destTruck = trucks.find(t => t.id === transferTruckId)?.plateNumber || transferTruckId;
        
        try {
            await onUpdateTire(selectedTire.id, {
                usedByTruckId: transferTruckId,
                description: selectedTire.description 
                    ? `${selectedTire.description} | Mutasi dari ${originTruck} ke ${destTruck}${transferDesc ? ' - ' + transferDesc : ''}`
                    : `Mutasi dari ${originTruck} ke ${destTruck}${transferDesc ? ' - ' + transferDesc : ''}`
            });
            setShowTransferForm(false);
            setTransferTireId('');
            setTransferTruckId('');
            setTransferDesc('');
        } catch (err: any) {
            alert('Gagal Mutasi Ban: ' + err.message);
        }
    };

    const isMiscIn = (t: TireStock) => t.price === 0 || (t.description || '').includes('(MISC IN)');
    const isMiscOut = (t: TireStock) => t.status === 'used' && t.usedByTruckId === 'MISC-OUT';

    const normalInTires = tireStock.filter(t => !isMiscIn(t));
    const normalOutTires = tireStock.filter(t => t.status === 'used' && !isMiscOut(t));
    const miscInTires = tireStock.filter(t => isMiscIn(t));
    const miscOutTires = tireStock.filter(t => isMiscOut(t));

    // Summary stats
    const totalValue = normalInTires.filter(t => t.status === 'available').reduce((sum, t) => sum + t.price, 0);

    const getListData = () => {
        let baseData: TireStock[] = [];
        if (activeTab === 'in') baseData = normalInTires;
        else if (activeTab === 'out') baseData = normalOutTires;
        else if (activeTab === 'misc_in') baseData = miscInTires;
        else if (activeTab === 'misc_out') baseData = miscOutTires;

        return baseData.filter(t => {
            const matchSearch = !searchSerial ||
                (t.serialNumber ?? '').toLowerCase().includes(searchSerial.toLowerCase()) ||
                t.itemName.toLowerCase().includes(searchSerial.toLowerCase()) ||
                t.supplierName.toLowerCase().includes(searchSerial.toLowerCase());
            
            const matchStatus = (activeTab === 'out' || activeTab === 'misc_out') 
                ? true 
                : filterStatus === 'all' || t.status === filterStatus;
            
            return matchSearch && matchStatus;
        });
    };

    const currentData = getListData();

    return (
        <div className="p-6 bg-slate-50 min-h-full">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl text-white shadow-lg shadow-orange-200">
                            <Package size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Manajemen Stock Ban</h1>
                            <p className="text-sm text-slate-500">Kelola stok ban masuk dari supplier dan pemakaian</p>
                        </div>
                    </div>
                    {activeTab === 'misc_out' && (
                        <button
                            onClick={() => setShowOutForm(!showOutForm)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white rounded-xl font-semibold shadow-lg shadow-purple-200 hover:shadow-xl hover:from-purple-600 hover:to-fuchsia-600 transition-all"
                        >
                            {showOutForm ? <X size={18} /> : <LogOut size={18} />}
                            {showOutForm ? 'Tutup Form' : 'Pengeluaran MISC OUT'}
                        </button>
                    )}
                    {activeTab === 'out' && (
                        <button
                            onClick={() => setShowTransferForm(!showTransferForm)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-200 hover:shadow-xl hover:from-blue-600 hover:to-indigo-600 transition-all"
                        >
                            {showTransferForm ? <X size={18} /> : <ArrowRightLeft size={18} />}
                            {showTransferForm ? 'Tutup Form' : 'Mutasi Ban Antar Truk'}
                        </button>
                    )}
                    {(activeTab === 'in' || activeTab === 'misc_in') && (
                        <button
                            onClick={() => {
                                setShowForm(!showForm);
                                setFormType(activeTab === 'misc_in' ? 'misc_in' : 'normal');
                            }}
                            className={`flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r text-white rounded-xl font-semibold shadow-lg transition-all ${activeTab === 'misc_in' ? 'from-blue-500 to-indigo-500 shadow-blue-200 hover:from-blue-600 hover:to-indigo-600' : 'from-orange-500 to-red-500 shadow-orange-200 hover:from-orange-600 hover:to-red-600'}`}
                        >
                            {showForm ? <X size={18} /> : <Plus size={18} />}
                            {showForm ? 'Tutup Form' : (activeTab === 'misc_in' ? 'Tambah MISC IN' : 'Tambah Stock IN')}
                        </button>
                    )}
                </div>

                {/* Success Banner */}
                {showSuccess && (
                    <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-5 py-3 rounded-xl flex items-center gap-3">
                        <CheckCircle size={18} className="text-green-500" />
                        <span className="font-semibold">Berhasil! Stock ban baru telah ditambahkan.</span>
                    </div>
                )}



                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Total Stock Masuk', value: normalInTires.length, color: 'from-blue-500 to-blue-600', icon: '📦' },
                        { label: 'Total Tersedia Aktif', value: tireStock.filter(t => t.status === 'available').length, color: 'from-green-500 to-emerald-600', icon: '✅' },
                        { label: 'Total Terpakai', value: tireStock.filter(t => t.status === 'used').length, color: 'from-red-500 to-rose-600', icon: '🚛' },
                        { label: 'Estimasi Nilai Stok', value: formatCurrency(totalValue), color: 'from-purple-500 to-indigo-600', icon: '💰', isText: true },
                    ].map((stat, i) => (
                        <div key={i} className={`bg-gradient-to-br ${stat.color} p-4 rounded-xl text-white shadow-sm`}>
                            <div className="text-2xl mb-1">{stat.icon}</div>
                            <div className={`font-bold ${stat.isText ? 'text-lg' : 'text-2xl'}`}>{stat.value}</div>
                            <div className="text-xs opacity-80 mt-0.5">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Form Tambah Stock */}
                {showForm && (
                    <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 mb-6">
                        <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Plus size={18} className={formType === 'misc_in' ? 'text-blue-500' : 'text-orange-500'} /> 
                            Form Tambah Stock Ban ({formType === 'misc_in' ? 'MISC IN' : 'IN'})
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Tanggal Masuk <span className="text-red-400">*</span></label>
                                    <input type="date" required
                                        className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none bg-slate-50 focus:bg-white"
                                        value={formDate} onChange={e => setFormDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Nama Supplier {formType === 'normal' && <span className="text-red-400">*</span>}</label>
                                    <input type="text" required={formType === 'normal'} placeholder="cth: NAJWA MANDIRI BAN"
                                        className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none bg-slate-50 focus:bg-white"
                                        value={formSupplier} onChange={e => setFormSupplier(e.target.value.toUpperCase())} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Nama Barang <span className="text-red-400">*</span></label>
                                    <input type="text" required placeholder="cth: BAN LUAR 900/20"
                                        className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none bg-slate-50 focus:bg-white"
                                        value={formItemName} onChange={e => setFormItemName(e.target.value.toUpperCase())} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Jumlah</label>
                                    <input type="number" min="1"
                                        className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none bg-slate-50 focus:bg-white"
                                        value={formQty} onChange={e => setFormQty(parseInt(e.target.value))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">No Seri Ban</label>
                                    <input type="text" placeholder="cth: BS 0355"
                                        className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none bg-slate-50 focus:bg-white font-mono"
                                        value={formSerial} onChange={e => setFormSerial(e.target.value.toUpperCase())} />
                                </div>
                                {formType === 'normal' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Harga Satuan (Rp)</label>
                                        <input type="number" min="0" required={formType === 'normal'}
                                            className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none bg-slate-50 focus:bg-white text-right"
                                            value={formPrice} onChange={e => setFormPrice(parseInt(e.target.value) || 0)} />
                                    </div>
                                )}
                                <div className="md:col-span-2 lg:col-span-3">
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Deskripsi / Keterangan</label>
                                    <input type="text" placeholder="Keterangan tambahan..."
                                        className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none bg-slate-50 focus:bg-white"
                                        value={formDesc} onChange={e => setFormDesc(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                <span className="text-sm text-slate-500">
                                    Harga: <strong className="text-slate-700">{formatCurrency(formPrice)}</strong>
                                </span>
                                <div className="flex gap-3">
                                    <button type="button" onClick={resetForm}
                                        className="px-4 py-2 text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                        Batal
                                    </button>
                                    <button type="submit" disabled={isSubmitting}
                                        className={`px-6 py-2 bg-gradient-to-r text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-2 ${formType === 'misc_in' ? 'from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600' : 'from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'}`}>
                                        {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={16} />}
                                        Simpan Stock
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* Form Misc Out */}
                {showOutForm && (
                    <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6 mb-6">
                        <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <LogOut size={18} className="text-purple-500" /> Form Pengeluaran Ban (MISC OUT)
                        </h3>
                        <form onSubmit={handleOutFormSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Pilih Ban Tersedia <span className="text-red-400">*</span></label>
                                    <select
                                        required
                                        className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none bg-slate-50 focus:bg-white"
                                        value={outSelectedTireId}
                                        onChange={e => setOutSelectedTireId(e.target.value)}
                                    >
                                        <option value="">-- Pilih Ban --</option>
                                        {tireStock.filter(t => t.status === 'available').map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.itemName} ({t.serialNumber || 'Tanpa Seri'}) - {t.supplierName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Keterangan / Alasan <span className="text-red-400">*</span></label>
                                    <input type="text" required placeholder="Cth: Dipakai untuk serep cadangan..."
                                        className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none bg-slate-50 focus:bg-white"
                                        value={outDesc} onChange={e => setOutDesc(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => { setShowOutForm(false); setOutDesc(''); setOutSelectedTireId(''); }}
                                    className="px-4 py-2 text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                    Batal
                                </button>
                                <button type="submit" disabled={!outSelectedTireId || !onUpdateTire}
                                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-fuchsia-600 transition-all disabled:opacity-50 flex items-center gap-2">
                                    <LogOut size={16} /> Proses Pengeluaran
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Form Mutasi Ban */}
                {showTransferForm && (
                    <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mb-6">
                        <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <ArrowRightLeft size={18} className="text-blue-500" /> Form Mutasi Pindah Truk
                        </h3>
                        <form onSubmit={handleTransferFormSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Pilih Ban yang Terpakai <span className="text-red-400">*</span></label>
                                    <select
                                        required
                                        className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none bg-slate-50 focus:bg-white"
                                        value={transferTireId}
                                        onChange={e => setTransferTireId(e.target.value)}
                                    >
                                        <option value="">-- Pilih Ban --</option>
                                        {normalOutTires.map(t => (
                                            <option key={t.id} value={t.id}>
                                                [Truk: {trucks.find(tr => tr.id === t.usedByTruckId)?.plateNumber || t.usedByTruckId}] {t.itemName} ({t.serialNumber || '-'})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                     <label className="block text-sm font-medium text-slate-600 mb-1">Pindah ke Truk Baru <span className="text-red-400">*</span></label>
                                    <select
                                        required
                                        className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none bg-slate-50 focus:bg-white"
                                        value={transferTruckId}
                                        onChange={e => setTransferTruckId(e.target.value)}
                                    >
                                        <option value="">-- Pilih Truk Tujuan --</option>
                                        {trucks.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.plateNumber}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Alasan Mutasi (opsional)</label>
                                    <input type="text" placeholder="Cth: Ban serep dialihkan..."
                                        className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none bg-slate-50 focus:bg-white"
                                        value={transferDesc} onChange={e => setTransferDesc(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => { setShowTransferForm(false); setTransferDesc(''); setTransferTireId(''); setTransferTruckId(''); }}
                                    className="px-4 py-2 text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                    Batal
                                </button>
                                <button type="submit" disabled={!transferTireId || !transferTruckId || !onUpdateTire}
                                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all disabled:opacity-50 flex items-center gap-2">
                                    <ArrowRightLeft size={16} /> Proses Mutasi
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="flex border-b border-slate-200 overflow-x-auto hide-scrollbar">
                        <button
                            onClick={() => { setActiveTab('in'); setFilterStatus('all'); }}
                            className={`flex-1 min-w-36 py-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'in'
                                ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-500'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            📦 STOCK BAN IN
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'in' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                                {normalInTires.length}
                            </span>
                        </button>
                        <button
                            onClick={() => { setActiveTab('out'); setSearchSerial(''); }}
                            className={`flex-1 min-w-36 py-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'out'
                                ? 'bg-red-50 text-red-600 border-b-2 border-red-500'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            🚛 STOCK BAN OUT
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'out' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                {normalOutTires.length}
                            </span>
                        </button>
                        <button
                            onClick={() => { setActiveTab('misc_in'); setFilterStatus('all'); }}
                            className={`flex-1 min-w-36 py-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'misc_in'
                                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            📥 MISC IN
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'misc_in' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                {miscInTires.length}
                            </span>
                        </button>
                        <button
                            onClick={() => { setActiveTab('misc_out'); setSearchSerial(''); }}
                            className={`flex-1 min-w-36 py-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'misc_out'
                                ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-500'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            📤 MISC OUT
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'misc_out' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                                {miscOutTires.length}
                            </span>
                        </button>
                    </div>

                    {/* Filter bar */}
                    <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-48">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Cari No Seri, Nama Barang, Supplier..."
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-slate-50 focus:bg-white"
                                value={searchSerial}
                                onChange={e => setSearchSerial(e.target.value)}
                            />
                        </div>
                        {(activeTab === 'in' || activeTab === 'misc_in') && (
                            <select
                                className="border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none bg-slate-50 focus:ring-2 focus:ring-orange-400 cursor-pointer"
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value as any)}
                            >
                                <option value="all">Semua Status</option>
                                <option value="available">Tersedia</option>
                                <option value="used">Terpakai</option>
                            </select>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        {(activeTab === 'in' || activeTab === 'misc_in') ? (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 font-semibold">Tanggal</th>
                                        <th className="p-4 font-semibold">Nama Supplier</th>
                                        <th className="p-4 font-semibold">Nama Barang</th>
                                        <th className="p-4 font-semibold text-center">Jumlah</th>
                                        <th className="p-4 font-semibold font-mono">No Seri</th>
                                        <th className="p-4 font-semibold">Deskripsi</th>
                                        <th className="p-4 font-semibold text-right">Harga</th>
                                        <th className="p-4 font-semibold text-center">Status</th>
                                        <th className="p-4 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentData.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                                                Belum ada data stock ban
                                            </td>
                                        </tr>
                                    ) : currentData.map(tire => (
                                        <tr key={tire.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="p-4 text-slate-700">{tire.date}</td>
                                            <td className="p-4 font-medium text-slate-800">{tire.supplierName}</td>
                                            <td className="p-4 text-slate-700">{tire.itemName}</td>
                                            <td className="p-4 text-center font-mono">{tire.quantity}</td>
                                            <td className="p-4">
                                                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs">
                                                    {tire.serialNumber || '-'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-500 text-xs">{tire.description || '-'}</td>
                                            <td className="p-4 text-right font-semibold text-slate-800">{formatCurrency(tire.price)}</td>
                                            <td className="p-4 text-center">
                                                {tire.status === 'available' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                                        <CheckCircle size={11} /> Tersedia
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                                        <XCircle size={11} /> Terpakai
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {tire.status === 'available' && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleDelete(tire.id, tire.serialNumber)}
                                                            title="Hapus Ban"
                                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            // STOCK OUT & MISC OUT TABS
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 font-semibold">Tgl Pemakaian</th>
                                        <th className="p-4 font-semibold">Tujuan (No Polisi/Alasan)</th>
                                        <th className="p-4 font-semibold">Nama Barang</th>
                                        <th className="p-4 font-semibold font-mono">No Seri</th>
                                        <th className="p-4 font-semibold">Supplier Asal</th>
                                        <th className="p-4 font-semibold text-right">Harga Asal</th>
                                        {activeTab === 'out' && <th className="p-4 w-12"></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentData.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                                                Belum ada ban yang terpakai
                                            </td>
                                        </tr>
                                    ) : currentData.map(tire => (
                                        <tr key={tire.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="p-4 text-slate-700">{tire.usedDate || '-'}</td>
                                            <td className="p-4">
                                                <span className={`font-bold px-2.5 py-1 rounded-lg text-sm ${tire.usedByTruckId === 'MISC-OUT' ? 'text-purple-700 bg-purple-50' : 'text-blue-700 bg-blue-50'}`}>
                                                    {tire.usedByTruckId === 'MISC-OUT' ? 'MISC-OUT' : (trucks.find(t => t.id === tire.usedByTruckId)?.plateNumber ?? tire.usedByTruckId)}
                                                </span>
                                                {tire.usedByTruckId === 'MISC-OUT' && (
                                                    <div className="text-xs text-slate-500 mt-1 max-w-xs">{tire.description}</div>
                                                )}
                                            </td>
                                            <td className="p-4 font-medium text-slate-800">{tire.itemName}</td>
                                            <td className="p-4">
                                                <span className="font-mono font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded text-xs">
                                                    {tire.serialNumber || '-'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-600">{tire.supplierName}</td>
                                            <td className="p-4 text-right font-semibold text-slate-800">{formatCurrency(tire.price)}</td>
                                            {activeTab === 'out' && (
                                                <td className="p-4">
                                                    <button
                                                        onClick={() => { setTransferTireId(tire.id); setShowTransferForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                        title="Mutasi Ban ke Truk Lain"
                                                        className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                                    >
                                                        <ArrowRightLeft size={16} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TireStockManagement;
