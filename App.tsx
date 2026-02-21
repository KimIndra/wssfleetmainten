import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Monitoring from './components/Monitoring';
import TruckList from './components/TruckList';
import ServiceHistory from './components/ServiceHistory';
import Reports from './components/Reports';
import ClientManagement from './components/ClientManagement';
import { ViewState, Truck, ServiceRecord, Client } from './types';
import { api } from './lib/api';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  // App State (from Database)
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load data from API on mount ────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [trucksData, servicesData, clientsData] = await Promise.all([
        api.trucks.list(),
        api.services.list(),
        api.clients.list(),
      ]);
      setTrucks(trucksData);
      setServices(servicesData);
      setClients(clientsData);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message ?? 'Gagal memuat data dari server. Pastikan DATABASE_URL sudah diset di Vercel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Handlers ───────────────────────────────────────────────
  const handleAddTruck = async (newTruck: Truck): Promise<void> => {
    const created = await api.trucks.create(newTruck);
    setTrucks(prev => [...prev, created]);
  };

  const handleEditTruck = async (updatedTruck: Truck): Promise<void> => {
    const updated = await api.trucks.update(updatedTruck.id, updatedTruck);
    setTrucks(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const handleUpdateOdometer = async (truckId: string, addedKm: number): Promise<void> => {
    const updated = await api.trucks.updateOdometer(truckId, addedKm);
    setTrucks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
  };

  const handleAddService = async (newService: ServiceRecord): Promise<void> => {
    const created = await api.services.create(newService);
    setServices(prev => [created, ...prev]);
    // Refresh trucks to get updated odometer/service dates
    const updatedTrucks = await api.trucks.list();
    setTrucks(updatedTrucks);
  };

  const handleAddClient = async (newClient: Client): Promise<void> => {
    const created = await api.clients.create(newClient);
    setClients(prev => [...prev, created]);
  };

  // ── Render ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Memuat data armada...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center bg-white rounded-xl shadow-md p-8 max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Gagal Terhubung ke Server</h2>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <button
            onClick={loadData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard trucks={trucks} services={services} />;
      case 'monitoring':
        return <Monitoring trucks={trucks} onUpdateOdometer={handleUpdateOdometer} />;
      case 'trucks':
        return (
          <TruckList
            trucks={trucks}
            clients={clients}
            onAddTruck={handleAddTruck}
            onEditTruck={handleEditTruck}
          />
        );
      case 'history':
        return (
          <ServiceHistory
            services={services}
            trucks={trucks}
            onAddService={handleAddService}
          />
        );
      case 'reports':
        return <Reports services={services} trucks={trucks} />;
      case 'clients':
        return (
          <ClientManagement
            clients={clients}
            onAddClient={handleAddClient}
          />
        );
      default:
        return <Dashboard trucks={trucks} services={services} />;
    }
  };

  return (
    <div className="flex bg-slate-100 min-h-screen">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 ml-64">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;