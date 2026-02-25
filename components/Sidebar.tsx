import React from 'react';
import { LayoutDashboard, Truck, History, FileBarChart, Activity, LogOut, Users, Wrench } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const menuItems: { id: ViewState; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'monitoring', label: 'Monitoring Service', icon: <Activity size={20} /> },
    { id: 'input-service', label: 'Input Service', icon: <Wrench size={20} /> },
    { id: 'trucks', label: 'Data Armada', icon: <Truck size={20} /> },
    { id: 'clients', label: 'Kelola Client', icon: <Users size={20} /> },
    { id: 'history', label: 'Riwayat Service', icon: <History size={20} /> },
    { id: 'reports', label: 'Laporan', icon: <FileBarChart size={20} /> },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 no-print">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-wider">WSS FLEET</h1>
        <p className="text-xs text-slate-400 mt-1">Expedition Management</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === item.id
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
