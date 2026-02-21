import React, { useState } from 'react';
import { Truck } from '../types';
import { getAggregatedServiceStatus, formatDate, formatCurrency } from '../utils';
import { Navigation, Calendar, Gauge, Clock, Wrench, Wallet, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface MonitoringProps {
  trucks: Truck[];
  onUpdateOdometer: (truckId: string, addedKm: number) => Promise<void>;
}

// Estimated Cost Dictionary (Min, Max) based on Truck Size
const SERVICE_COST_RANGES: Record<string, { Small: [number, number]; Big: [number, number] }> = {
  'Oil Change': { Small: [600000, 900000], Big: [1500000, 2200000] },
  'Brake System': { Small: [500000, 1200000], Big: [1200000, 2500000] },
  'Tire Change': { Small: [1500000, 4000000], Big: [3000000, 8000000] },
  'Regular Service': { Small: [1000000, 2000000], Big: [2500000, 4500000] },
  'General Checkup': { Small: [300000, 800000], Big: [500000, 1500000] }, // Default/Misc
};

const Monitoring: React.FC<MonitoringProps> = ({ trucks, onUpdateOdometer }) => {
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [tripDistance, setTripDistance] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentMonth = format(new Date(), 'MMMM yyyy');

  const filteredTrucks = trucks.filter(truck => {
    const aggStatus = getAggregatedServiceStatus(truck);

    // Logic: Show if status is NOT ok OR if the nearest date is within this month
    const isUrgent = aggStatus.status !== 'ok';
    const nearestMonth = format(aggStatus.nearestDate, 'MMMM yyyy');
    const isThisMonth = nearestMonth === currentMonth;

    return isUrgent || isThisMonth;
  });

  const handleTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTruckId || !tripDistance) return;

    setIsSubmitting(true);
    try {
      await onUpdateOdometer(selectedTruckId, parseInt(tripDistance));
      // Tutup modal hanya jika berhasil
      setTripDistance('');
      setSelectedTruckId(null);
    } catch (err: any) {
      alert('Gagal update odometer: ' + (err.message ?? 'Terjadi kesalahan'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEstimatedCostRange = (truck: Truck, itemsDue: string[]) => {
    let minTotal = 0;
    let maxTotal = 0;

    if (itemsDue.length === 0) {
      // Fallback if no specific items are flagged but it appears on monitoring (e.g. monthly check)
      const range = SERVICE_COST_RANGES['General Checkup'][truck.size];
      return { min: range[0], max: range[1] };
    }

    itemsDue.forEach(item => {
      // Clean up string (e.g., remove " (Segera)" or " (Overdue)")
      const cleanName = item.split('(')[0].trim().toLowerCase();

      let matchedKey = 'General Checkup';

      // Keyword matching
      if (cleanName.includes('oli') || cleanName.includes('oil')) matchedKey = 'Oil Change';
      else if (cleanName.includes('rem') || cleanName.includes('brake')) matchedKey = 'Brake System';
      else if (cleanName.includes('ban') || cleanName.includes('tire')) matchedKey = 'Tire Change';
      else if (cleanName.includes('rutin') || cleanName.includes('regular')) matchedKey = 'Regular Service';

      const range = SERVICE_COST_RANGES[matchedKey][truck.size];
      minTotal += range[0];
      maxTotal += range[1];
    });

    return { min: minTotal, max: maxTotal };
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Monitoring Service</h1>
          <p className="text-gray-500">Periode: {currentMonth} (dan status Urgent)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrucks.map(truck => {
          const agg = getAggregatedServiceStatus(truck);
          const estCost = getEstimatedCostRange(truck, agg.itemsDue);

          const statusColor = agg.status === 'overdue' ? 'border-red-500 bg-red-50'
            : agg.status === 'warning' ? 'border-yellow-500 bg-yellow-50'
              : 'border-green-500 bg-white';

          const badgeColor = agg.status === 'overdue' ? 'bg-red-100 text-red-700'
            : agg.status === 'warning' ? 'bg-yellow-100 text-yellow-700'
              : 'bg-green-100 text-green-700';

          return (
            <div key={truck.id} className={`rounded-xl border-l-4 p-5 shadow-sm bg-white hover:shadow-md transition-shadow ${statusColor.split(' ')[0]} flex flex-col h-full`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{truck.plateNumber}</h3>
                  <p className="text-sm text-gray-500">{truck.brand} {truck.model}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${badgeColor}`}>
                  {agg.status.toUpperCase()}
                </span>
              </div>

              <div className="space-y-4 mb-4 flex-1">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-gray-500 text-sm">Odometer Saat Ini</span>
                  <span className="font-mono font-bold text-lg text-gray-800">{truck.currentOdometer.toLocaleString()} KM</span>
                </div>

                {/* Alerts for Specific Items */}
                {agg.itemsDue.length > 0 && (
                  <div className="bg-white border border-red-100 rounded-lg p-2 space-y-1">
                    {agg.itemsDue.map((item, idx) => (
                      <div key={idx} className="flex items-center text-xs text-red-600 font-bold">
                        <AlertCircle size={12} className="mr-1" /> {item}
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggestion Section */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                    <Wrench size={12} className="mr-1" /> Target Service Terdekat
                  </h4>

                  <div className="space-y-2">
                    {/* KM Prediction */}
                    <div className="flex items-center justify-between text-sm text-gray-700">
                      <div className="flex items-center">
                        <Gauge className="w-4 h-4 mr-2 opacity-70" />
                        <span>Target KM</span>
                      </div>
                      <span className="font-semibold">{(truck.currentOdometer + agg.nearestKm).toLocaleString()}</span>
                    </div>

                    {/* Time Prediction */}
                    <div className="flex items-center justify-between text-sm text-gray-700">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 opacity-70" />
                        <span>Target Waktu</span>
                      </div>
                      <span className="font-semibold">{formatDate(agg.nearestDate.toISOString())}</span>
                    </div>

                    {/* Cost Prediction */}
                    <div className="flex flex-col text-sm text-gray-700 mt-2 border-t border-slate-200 pt-2">
                      <div className="flex items-center mb-1">
                        <Wallet className="w-4 h-4 mr-2 opacity-70" />
                        <span>Est. Biaya</span>
                      </div>
                      <span className="font-semibold text-blue-600 text-right">
                        {formatCurrency(estCost.min)} - {formatCurrency(estCost.max)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedTruckId(truck.id)}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
              >
                <Navigation size={16} />
                <span>Input Trip (KM)</span>
              </button>
            </div>
          );
        })}

        {filteredTrucks.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">Tidak ada jadwal service mendesak atau terjadwal bulan ini.</p>
          </div>
        )}
      </div>

      {/* Modal for adding trip */}
      {selectedTruckId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96">
            <h3 className="text-lg font-bold mb-4">Tambah Jarak Tempuh</h3>
            <p className="text-sm text-gray-500 mb-4">
              Simulasi penambahan KM untuk Truck {trucks.find(t => t.id === selectedTruckId)?.plateNumber}.
            </p>
            <form onSubmit={handleTripSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Jarak Tujuan (KM)</label>
                <input
                  type="number"
                  min="1"
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={tripDistance}
                  onChange={(e) => setTripDistance(e.target.value)}
                  placeholder="Contoh: 150"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedTruckId(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</>
                    : 'Simpan Perjalanan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Monitoring;