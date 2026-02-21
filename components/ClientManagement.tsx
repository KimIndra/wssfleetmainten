import React, { useState } from 'react';
import { Client } from '../types';
import { Plus, Pencil, Trash2, Users, Phone, User } from 'lucide-react';

interface ClientManagementProps {
    clients: Client[];
    onAddClient: (client: Client) => Promise<void>;
    onDeleteClient?: (id: string) => Promise<void>;
}

const ClientManagement: React.FC<ClientManagementProps> = ({ clients, onAddClient, onDeleteClient }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', contactPerson: '', phone: '' });

    const handleOpenAdd = () => {
        setFormData({ name: '', contactPerson: '', phone: '' });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.contactPerson || !formData.phone) return;

        setIsSubmitting(true);
        try {
            const newClient: Client = {
                id: `c-${Date.now()}`,
                name: formData.name,
                contactPerson: formData.contactPerson,
                phone: formData.phone,
            };
            await onAddClient(newClient);
            setIsModalOpen(false);
            setFormData({ name: '', contactPerson: '', phone: '' });
        } catch (err: any) {
            alert('Gagal menambah client: ' + (err.message ?? 'Terjadi kesalahan'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!onDeleteClient) return;
        if (!window.confirm(`Hapus client "${name}"? Pastikan tidak ada truk aktif yang menggunakan client ini.`)) return;
        try {
            await onDeleteClient(id);
        } catch (err: any) {
            alert('Gagal menghapus client: ' + (err.message ?? 'Terjadi kesalahan'));
        }
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Kelola Client</h1>
                    <p className="text-sm text-gray-500 mt-1">Data client yang terdaftar akan muncul di dropdown saat menambah/edit truk.</p>
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus size={18} /> Tambah Client
                </button>
            </div>

            {/* Stats */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                    <Users size={24} />
                </div>
                <div>
                    <p className="text-sm text-gray-500">Total Client Terdaftar</p>
                    <p className="text-2xl font-bold text-gray-800">{clients.length}</p>
                </div>
            </div>

            {/* Client Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.map(client => (
                    <div key={client.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                                    {client.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{client.name}</h3>
                                    <p className="text-xs text-gray-400">ID: {client.id}</p>
                                </div>
                            </div>
                            {onDeleteClient && (
                                <button
                                    onClick={() => handleDelete(client.id, client.name)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Hapus Client"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>

                        <div className="space-y-2 mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User size={14} className="text-gray-400 flex-shrink-0" />
                                <span>{client.contactPerson}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone size={14} className="text-gray-400 flex-shrink-0" />
                                <span>{client.phone}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {clients.length === 0 && (
                    <div className="col-span-full text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                        <Users size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">Belum ada client terdaftar</p>
                        <p className="text-gray-400 text-sm mt-1">Klik tombol "Tambah Client" untuk menambahkan.</p>
                    </div>
                )}
            </div>

            {/* Modal Tambah Client */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">Tambah Client Baru</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nama Perusahaan / Client <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Contoh: PT Maju Bersama"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nama Contact Person <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Contoh: Budi Santoso"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.contactPerson}
                                    onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nomor Telepon <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Contoh: 021-555-0001"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSubmitting
                                        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</>
                                        : <><Plus size={16} />Simpan Client</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientManagement;
