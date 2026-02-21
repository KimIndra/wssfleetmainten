
import React from 'react';
import { Truck, ServiceRecord } from '../types';
import { Truck as TruckIcon, Wrench, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { formatCurrency, getNextServiceInfo } from '../utils';

interface DashboardProps {
  trucks: Truck[];
  services: ServiceRecord[];
}

const Dashboard: React.FC<DashboardProps> = ({ trucks, services }) => {
  const totalTrucks = trucks.length;
  const totalServiceCost = services.reduce((sum, s) => sum + s.totalCost, 0);
  
  const overdueCount = trucks.filter(t => {
    const { status } = getNextServiceInfo(
      t.lastServiceDate, 
      t.lastServiceOdometer, 
      t.serviceIntervalMonths, 
      t.serviceIntervalKm, 
      t.currentOdometer
    );
    return status === 'overdue';
  }).length;

  const warningCount = trucks.filter(t => {
    const { status } = getNextServiceInfo(
      t.lastServiceDate, 
      t.lastServiceOdometer, 
      t.serviceIntervalMonths, 
      t.serviceIntervalKm, 
      t.currentOdometer
    );
    return status === 'warning';
  }).length;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Ringkasan</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
            <TruckIcon size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Armada</p>
            <p className="text-2xl font-bold text-gray-800">{totalTrucks}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-red-100 rounded-lg text-red-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Perlu Service (Urgent)</p>
            <p className="text-2xl font-bold text-gray-800">{overdueCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-yellow-100 rounded-lg text-yellow-600">
            <Wrench size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Mendekati Jadwal</p>
            <p className="text-2xl font-bold text-gray-800">{warningCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-lg text-green-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Biaya Service</p>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(totalServiceCost)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Status Armada Terbaru</h2>
          <div className="space-y-4">
            {trucks.slice(0, 5).map(truck => {
              const { status, daysUntil, kmUntil } = getNextServiceInfo(
                truck.lastServiceDate, 
                truck.lastServiceOdometer, 
                truck.serviceIntervalMonths, 
                truck.serviceIntervalKm, 
                truck.currentOdometer
              );
              
              const statusColor = status === 'overdue' ? 'bg-red-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-green-500';
              
              return (
                <div key={truck.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${statusColor}`} />
                    <div>
                      <p className="font-medium text-gray-800">{truck.plateNumber}</p>
                      <p className="text-xs text-gray-500">{truck.brand} {truck.model}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{kmUntil} KM lagi</p>
                    <p className="text-xs text-gray-500">{daysUntil} hari lagi</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Riwayat Service Terakhir</h2>
          <div className="space-y-4">
            {services.slice(0, 5).map(service => (
              <div key={service.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                <div>
                  <div className="flex gap-1 flex-wrap mb-1">
                    {service.serviceTypes.map((type, i) => (
                      <span key={i} className="text-xs font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{type}</span>
                    ))}
                  </div>
                  <p className="text-sm font-bold text-gray-700">{formatCurrency(service.totalCost)}</p>
                </div>
                <div className="text-right">
                   <p className="text-xs font-semibold bg-slate-200 px-2 py-1 rounded text-slate-700">{trucks.find(t => t.id === service.truckId)?.plateNumber}</p>
                   <p className="text-xs text-gray-400 mt-1">{service.serviceDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
