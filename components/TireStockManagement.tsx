import React, { useState } from 'react';
import { TireStock, Truck } from '../types';
import { formatCurrency } from '../utils';
import {
    Plus, Trash2, Package, CheckCircle, XCircle,
    Search, ChevronDown, ChevronUp, Download, Filter, X
} from 'lucide-react';
import { api } from '../lib/api';

interface TireStockManagementProps {
    tireStock: TireStock[];
    trucks: Truck[];
    onAddTire: (tire: TireStock) => Promise<void>;
    onDeleteTire: (id: string) => Promise<void>;
}

const TireStockManagement: React.FC<TireStockManagementProps> = ({
    tireStock,
    trucks,
    onAddTire,
    onDeleteTire,
}) => {
    const [activeTab, setActiveTab] = useState<'in' | 'out'>('in');
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [searchSerial, setSearchSerial] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'used'>('all');

    // Form state
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formSupplier, setFormSupplier] = useState('');
    const [formItemName, setFormItemName] = useState('');
    const [formQty, setFormQty] = useState(1);
    const [formSerial, setFormSerial] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formPrice, setFormPrice] = useState(0);

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
            supplierName: formSupplier,
            itemName: formItemName,
            quantity: formQty,
            serialNumber: formSerial,
            description: formDesc,
            price: formPrice,
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

    // Filter data
    const availableTires = tireStock.filter(t => t.status === 'available');
    const usedTires = tireStock.filter(t => t.status === 'used');

    const filteredStock = tireStock.filter(t => {
        const matchSearch = !searchSerial ||
            (t.serialNumber ?? '').toLowerCase().includes(searchSerial.toLowerCase()) ||
            t.itemName.toLowerCase().includes(searchSerial.toLowerCase()) ||
            t.supplierName.toLowerCase().includes(searchSerial.toLowerCase());
        const matchStatus = filterStatus === 'all' || t.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const displayedTires = activeTab === 'in'
        ? filteredStock.filter(t => filterStatus === 'all' ? true : t.status === filterStatus)
        : usedTires.filter(t => {
            return !searchSerial ||
                (t.serialNumber ?? '').toLowerCase().includes(searchSerial.toLowerCase()) ||
                t.itemName.toLowerCase().includes(searchSerial.toLowerCase());
        });

    const getTruckPlate = (truckId?: string | null) => {
        if (!truckId) return '-';
        return trucks.find(t => t.id === truckId)?.plateNumber ?? truckId;
    };

    // Summary stats
    const totalIn = tireStock.length;
    const totalAvailable = availableTires.length;
    const totalUsed = usedTires.length;
    const totalValue = availableTires.reduce((sum, t) => sum + t.price, 0);

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
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold shadow-lg shadow-orange-200 hover:shadow-xl hover:from-orange-600 hover:to-red-600 transition-all"
                    >
                        {showForm ? <X size={18} /> : <Plus size={18} />}
                        {showForm ? 'Tutup Form' : 'Tambah Stock Ban'}
                    </button>
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
                        { label: 'Total Masuk', value: totalIn, color: 'from-blue-500 to-blue-600', icon: '📦' },
                        { label: 'Tersedia', value: totalAvailable, color: 'from-green-500 to-emerald-600', icon: '✅' },
                        { label: 'Terpakai', value: totalUsed, color: 'from-red-500 to-rose-600', icon: '🚛' },
                        { label: 'Nilai Stok', value: formatCurrency(totalValue), color: 'from-purple-500 to-indigo-600', icon: '💰', isText: true },
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
                            <Plus size={18} className="text-orange-500" /> Form Tambah Stock Ban (IN)
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
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Nama Supplier <span className="text-red-400">*</span></label>
                                    <input type="text" required placeholder="cth: NAJWA MANDIRI BAN"
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
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Harga Satuan (Rp)</label>
                                    <input type="number" min="0"
                                        className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none bg-slate-50 focus:bg-white text-right"
                                        value={formPrice} onChange={e => setFormPrice(parseInt(e.target.value) || 0)} />
                                </div>
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
                                        className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 flex items-center gap-2">
                                        {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={16} />}
                                        Simpan Stock
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="flex border-b border-slate-200">
                        <button
                            onClick={() => { setActiveTab('in'); setFilterStatus('all'); }}
                            className={`flex-1 py-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'in'
                                ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-500'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            📦 STOCK BAN IN
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'in' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                                {totalIn}
                            </span>
                        </button>
                        <button
                            onClick={() => { setActiveTab('out'); setSearchSerial(''); }}
                            className={`flex-1 py-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'out'
                                ? 'bg-red-50 text-red-600 border-b-2 border-red-500'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            🚛 STOCK BAN OUT
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'out' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                {totalUsed}
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
                        {activeTab === 'in' && (
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
                        {activeTab === 'in' ? (
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
                                    {filteredStock.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                                                Belum ada data stock ban
                                            </td>
                                        </tr>
                                    ) : filteredStock.map(tire => (
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
                                                    <button
                                                        onClick={() => handleDelete(tire.id, tire.serialNumber)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            // STOCK OUT TAB
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 font-semibold">Tgl Pemakaian</th>
                                        <th className="p-4 font-semibold">No Polisi Truk</th>
                                        <th className="p-4 font-semibold">Nama Barang</th>
                                        <th className="p-4 font-semibold font-mono">No Seri</th>
                                        <th className="p-4 font-semibold">Supplier</th>
                                        <th className="p-4 font-semibold text-right">Harga</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usedTires.filter(t =>
                                        !searchSerial ||
                                        (t.serialNumber ?? '').toLowerCase().includes(searchSerial.toLowerCase()) ||
                                        t.itemName.toLowerCase().includes(searchSerial.toLowerCase())
                                    ).length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                                                Belum ada ban yang terpakai
                                            </td>
                                        </tr>
                                    ) : usedTires
                                        .filter(t =>
                                            !searchSerial ||
                                            (t.serialNumber ?? '').toLowerCase().includes(searchSerial.toLowerCase()) ||
                                            t.itemName.toLowerCase().includes(searchSerial.toLowerCase())
                                        )
                                        .map(tire => (
                                            <tr key={tire.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="p-4 text-slate-700">{tire.usedDate || '-'}</td>
                                                <td className="p-4">
                                                    <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg text-sm">
                                                        {getTruckPlate(tire.usedByTruckId)}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-medium text-slate-800">{tire.itemName}</td>
                                                <td className="p-4">
                                                    <span className="font-mono font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded text-xs">
                                                        {tire.serialNumber || '-'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-slate-600">{tire.supplierName}</td>
                                                <td className="p-4 text-right font-semibold text-slate-800">{formatCurrency(tire.price)}</td>
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
