
import React, { useState, useMemo } from 'react';
import { ServiceRecord, Truck } from '../types';
import { formatCurrency, exportToCSV } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { Download, Printer, TrendingUp, DollarSign, Wrench, AlertCircle, Calendar } from 'lucide-react';
import { format, subMonths, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface ReportsProps {
  services: ServiceRecord[];
  trucks: Truck[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const Reports: React.FC<ReportsProps> = ({ services, trucks }) => {
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());

  // --- 1. Filter Logic ---
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const sDate = parseISO(s.serviceDate);
      const matchYear = sDate.getFullYear().toString() === yearFilter;
      const matchMonth = monthFilter === 'all' || (sDate.getMonth() + 1).toString() === monthFilter;
      return matchYear && matchMonth;
    });
  }, [services, monthFilter, yearFilter]);

  // --- 2. KPI Calculations ---
  const totalCost = filteredServices.reduce((sum, s) => sum + s.totalCost, 0);
  const totalServices = filteredServices.length;
  const avgCost = totalServices > 0 ? totalCost / totalServices : 0;

  // Find Highest Spender Truck
  const spendingByTruck = filteredServices.reduce((acc, curr) => {
    acc[curr.truckId] = (acc[curr.truckId] || 0) + curr.totalCost;
    return acc;
  }, {} as Record<string, number>);

  const highestSpenderId = Object.keys(spendingByTruck).reduce((a, b) => 
    spendingByTruck[a] > spendingByTruck[b] ? a : b
  , '');
  
  const highestSpenderTruck = trucks.find(t => t.id === highestSpenderId);
  const highestSpenderCost = highestSpenderId ? spendingByTruck[highestSpenderId] : 0;

  // --- 3. Chart Data Preparation ---

  // A. Monthly Trend (Last 12 Months) - Always shows trend regardless of month filter (uses year filter context or global)
  const monthlyTrendData = useMemo(() => {
    const data = [];
    // Show data for the selected year
    for (let i = 0; i < 12; i++) {
      const monthIndex = i;
      const label = format(new Date(parseInt(yearFilter), monthIndex, 1), 'MMM');
      
      const monthlyServices = services.filter(s => {
        const d = parseISO(s.serviceDate);
        return d.getFullYear().toString() === yearFilter && d.getMonth() === monthIndex;
      });

      const cost = monthlyServices.reduce((sum, s) => sum + s.totalCost, 0);
      data.push({ name: label, total: cost });
    }
    return data;
  }, [services, yearFilter]);

  // B. Service Types Distribution (Pie)
  const pieData = useMemo(() => {
    const stats = filteredServices.reduce((acc, curr) => {
      curr.serviceTypes.forEach(type => {
        acc[type] = (acc[type] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(stats)
      .map(key => ({ name: key, value: stats[key] }))
      .sort((a, b) => b.value - a.value); // Sort desc
  }, [filteredServices]);

  // C. Top 5 Most Expensive Trucks (Bar)
  const topTrucksData = useMemo(() => {
    const data = Object.keys(spendingByTruck).map(truckId => {
      const truck = trucks.find(t => t.id === truckId);
      return {
        name: truck ? truck.plateNumber : 'Unknown',
        cost: spendingByTruck[truckId]
      };
    });
    return data.sort((a, b) => b.cost - a.cost).slice(0, 5);
  }, [spendingByTruck, trucks]);

  // --- Handlers ---
  const handleExportExcel = () => {
    const dataToExport = filteredServices.map(s => ({
      ID: s.id,
      Date: s.serviceDate,
      Truck: trucks.find(t => t.id === s.truckId)?.plateNumber || 'Unknown',
      Types: s.serviceTypes.join(', '),
      Description: s.description,
      Mechanic: s.mechanic,
      TotalCost: s.totalCost
    }));
    exportToCSV(dataToExport, `Laporan_Service_${yearFilter}_${monthFilter}`);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
          <p className="text-sm font-semibold text-gray-700">{label}</p>
          <p className="text-sm text-blue-600 font-bold">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50/50 min-h-screen">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Laporan Keuangan & Analisis</h1>
          <p className="text-slate-500 mt-1">Ringkasan performa maintenance armada Anda.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Filters */}
          <div className="flex bg-white rounded-lg shadow-sm border border-slate-200 p-1">
            <select 
              className="bg-transparent text-sm font-medium text-slate-700 py-1 px-3 outline-none cursor-pointer"
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
            >
              <option value="all">Semua Bulan</option>
              {Array.from({length: 12}, (_, i) => (
                <option key={i} value={i + 1}>{format(new Date(2024, i, 1), 'MMMM')}</option>
              ))}
            </select>
            <div className="w-px bg-slate-200 mx-1"></div>
            <select 
              className="bg-transparent text-sm font-medium text-slate-700 py-1 px-3 outline-none cursor-pointer"
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
            >
              <option value="2023">2023</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
            </select>
          </div>

          <button onClick={handleExportExcel} className="flex items-center space-x-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg shadow-sm transition-all text-sm font-medium">
            <Download size={16} /> <span>Excel</span>
          </button>
          <button onClick={() => window.print()} className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg shadow-md transition-all text-sm font-medium">
            <Printer size={16} /> <span>Print</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <DollarSign size={20} />
            </div>
            {monthFilter !== 'all' && <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">Bulan Ini</span>}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Pengeluaran</p>
            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totalCost)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Wrench size={20} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Kunjungan Service</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalServices} <span className="text-sm font-normal text-slate-400">kali</span></h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-violet-50 rounded-lg text-violet-600">
              <TrendingUp size={20} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Rata-rata Biaya / Service</p>
            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(avgCost)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <AlertCircle size={20} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Unit Paling Boros</p>
            <div className="flex items-end gap-2">
              <h3 className="text-xl font-bold text-slate-800 truncate max-w-[120px]" title={highestSpenderTruck?.plateNumber}>
                {highestSpenderTruck ? highestSpenderTruck.plateNumber : '-'}
              </h3>
              <span className="text-xs text-rose-600 font-semibold mb-1">
                 {highestSpenderCost > 0 ? formatCurrency(highestSpenderCost) : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Trend (Takes 2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:shadow-none print:border-none">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={18} className="text-slate-400" /> Tren Pengeluaran Tahunan ({yearFilter})
            </h2>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  tickFormatter={(value) => `${value / 1000000}M`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Categories */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:shadow-none print:border-none flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 mb-2">Komposisi Jenis Service</h2>
          <p className="text-sm text-slate-400 mb-6">Distribusi berdasarkan frekuensi pekerjaan.</p>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{fontSize: '11px', paddingTop: '20px'}}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 5 Spenders & Table Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top 5 Trucks Bar Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:shadow-none print:border-none">
          <h2 className="text-lg font-bold text-slate-800 mb-2">Top 5 Biaya Tertinggi</h2>
          <p className="text-sm text-slate-400 mb-6">Unit armada dengan maintenance cost terbesar.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTrucksData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={90}
                  tick={{fill: '#475569', fontSize: 12, fontWeight: 500}}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  formatter={(value: number) => [formatCurrency(value), 'Total Biaya']}
                />
                <Bar dataKey="cost" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Table (Takes 2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Rincian Data</h2>
              <p className="text-xs text-slate-400">Menampilkan data sesuai filter yang aktif.</p>
            </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-4 whitespace-nowrap">Tanggal</th>
                  <th className="p-4 whitespace-nowrap">No Polisi</th>
                  <th className="p-4 whitespace-nowrap">Jenis Pekerjaan</th>
                  <th className="p-4 text-right whitespace-nowrap">Biaya</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.length > 0 ? filteredServices.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-600">{s.serviceDate}</td>
                    <td className="p-4 font-medium text-slate-800">{trucks.find(t => t.id === s.truckId)?.plateNumber}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {s.serviceTypes.slice(0, 2).map((type, i) => (
                           <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs border border-slate-200">{type}</span>
                        ))}
                        {s.serviceTypes.length > 2 && <span className="text-xs text-slate-400 self-center">+{s.serviceTypes.length - 2}</span>}
                      </div>
                    </td>
                    <td className="p-4 text-right font-semibold text-slate-700">{formatCurrency(s.totalCost)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                      Tidak ada data service untuk periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Reports;
