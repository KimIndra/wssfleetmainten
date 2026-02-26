import React, { useState, useMemo } from 'react';
import { ServiceRecord, Truck } from '../types';
import { formatCurrency, exportToExcel } from '../utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Download, Printer, TrendingUp, TrendingDown, DollarSign, Wrench, AlertCircle, Calendar,
  FileBarChart, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, BarChart3,
  FileSpreadsheet, FileText, Table2, Filter
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ReportsProps {
  services: ServiceRecord[];
  trucks: Truck[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const Reports: React.FC<ReportsProps> = ({ services, trucks }) => {
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState<'charts' | 'table'>('charts');

  // Generate available years from data
  const availableYears = useMemo(() => {
    const years = new Set(services.map(s => parseISO(s.serviceDate).getFullYear().toString()));
    years.add(new Date().getFullYear().toString());
    return Array.from(years).sort().reverse();
  }, [services]);

  // --- Filter Logic ---
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const sDate = parseISO(s.serviceDate);
      const matchYear = sDate.getFullYear().toString() === yearFilter;
      const matchMonth = monthFilter === 'all' || (sDate.getMonth() + 1).toString() === monthFilter;
      return matchYear && matchMonth;
    });
  }, [services, monthFilter, yearFilter]);

  // --- KPI Calculations ---
  const totalCost = filteredServices.reduce((sum, s) => sum + s.totalCost, 0);
  const totalServices = filteredServices.length;
  const avgCost = totalServices > 0 ? totalCost / totalServices : 0;

  // Spending by truck
  const spendingByTruck = filteredServices.reduce((acc, curr) => {
    acc[curr.truckId] = (acc[curr.truckId] || 0) + curr.totalCost;
    return acc;
  }, {} as Record<string, number>);

  const highestSpenderId = Object.keys(spendingByTruck).length > 0
    ? Object.keys(spendingByTruck).reduce((a, b) => spendingByTruck[a] > spendingByTruck[b] ? a : b, '')
    : '';
  const highestSpenderTruck = trucks.find(t => t.id === highestSpenderId);
  const highestSpenderCost = highestSpenderId ? spendingByTruck[highestSpenderId] : 0;

  // Parts cost breakdown
  const totalPartsCost = filteredServices.reduce((sum, s) => sum + s.parts.reduce((ps, p) => ps + p.price * p.quantity, 0), 0);
  const totalLaborCost = filteredServices.reduce((sum, s) => sum + s.laborCost, 0);

  // --- Chart Data ---
  const monthlyTrendData = useMemo(() => {
    const data = [];
    for (let i = 0; i < 12; i++) {
      const label = format(new Date(parseInt(yearFilter), i, 1), 'MMM');
      const monthlyServices = services.filter(s => {
        const d = parseISO(s.serviceDate);
        return d.getFullYear().toString() === yearFilter && d.getMonth() === i;
      });
      const cost = monthlyServices.reduce((sum, s) => sum + s.totalCost, 0);
      const count = monthlyServices.length;
      data.push({ name: label, total: cost, count });
    }
    return data;
  }, [services, yearFilter]);

  const pieData = useMemo(() => {
    const stats = filteredServices.reduce((acc, curr) => {
      curr.serviceTypes.forEach(type => {
        acc[type] = (acc[type] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    return Object.keys(stats)
      .map(key => ({ name: key, value: stats[key] }))
      .sort((a, b) => b.value - a.value);
  }, [filteredServices]);

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
      Tanggal: s.serviceDate,
      'No Polisi': trucks.find(t => t.id === s.truckId)?.plateNumber || 'Unknown',
      Mekanik: s.mechanic,
      'Jenis Service': s.serviceTypes.join(', '),
      Deskripsi: s.description,
      'Biaya Parts': s.parts.reduce((sum, p) => sum + p.price * p.quantity, 0),
      'Biaya Jasa': s.laborCost,
      'Total Biaya': s.totalCost
    }));
    exportToExcel(dataToExport, `Laporan_Service_${yearFilter}_${monthFilter}`, 'Laporan Service');
  };

  const handleExportPDF = () => {
    if (filteredServices.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Laporan Service Armada', 14, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const filterLabel = monthFilter === 'all' ? `Semua Bulan ${yearFilter}` : `Bulan ${monthFilter} / ${yearFilter}`;
    doc.text(`Periode: ${filterLabel}  |  Total: ${filteredServices.length} service  |  Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 25);

    // Table
    const tableData = filteredServices.map((s, idx) => [
      idx + 1,
      s.serviceDate,
      trucks.find(t => t.id === s.truckId)?.plateNumber || '-',
      s.mechanic || '-',
      s.serviceTypes.join(', '),
      formatCurrency(s.parts.reduce((sum, p) => sum + p.price * p.quantity, 0)),
      formatCurrency(s.laborCost),
      formatCurrency(s.totalCost)
    ]);

    autoTable(doc, {
      startY: 32,
      head: [['No', 'Tanggal', 'No Polisi', 'Mekanik', 'Jenis Service', 'Biaya Parts', 'Biaya Jasa', 'Total']],
      body: tableData,
      foot: [['', '', '', '', 'TOTAL', formatCurrency(totalPartsCost), formatCurrency(totalLaborCost), formatCurrency(totalCost)]],
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
      },
    });

    doc.save(`Laporan_Service_${yearFilter}_${monthFilter}.pdf`);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-sm text-indigo-600 font-bold">{formatCurrency(payload[0].value)}</p>
          {payload[0].payload.count !== undefined && (
            <p className="text-xs text-slate-400 mt-0.5">{payload[0].payload.count} service</p>
          )}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl">
          <p className="text-xs font-semibold text-slate-700">{payload[0].name}</p>
          <p className="text-sm font-bold" style={{ color: payload[0].payload.fill }}>{payload[0].value} kali</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-full">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-200">
            <FileBarChart size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Laporan & Analisis</h1>
            <p className="text-sm text-slate-500">Ringkasan performa maintenance armada</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Filter Chips */}
          <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-200 p-1 gap-1">
            <Filter size={14} className="text-slate-400 ml-2" />
            <select
              className="bg-transparent text-sm font-medium text-slate-700 py-1.5 px-2 outline-none cursor-pointer"
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
            >
              <option value="all">Semua Bulan</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i + 1}>{format(new Date(2024, i, 1), 'MMMM')}</option>
              ))}
            </select>
            <div className="w-px h-5 bg-slate-200"></div>
            <select
              className="bg-transparent text-sm font-medium text-slate-700 py-1.5 px-2 outline-none cursor-pointer"
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button onClick={handleExportExcel} className="flex items-center gap-2 bg-white hover:bg-emerald-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl shadow-sm transition-all text-sm font-medium cursor-pointer hover:border-green-300 group" title="Download file Excel (.xlsx)">
            <FileSpreadsheet size={16} className="text-slate-400 group-hover:text-green-600 transition-colors" /> Excel
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-2 bg-white hover:bg-red-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl shadow-sm transition-all text-sm font-medium cursor-pointer hover:border-red-300 group" title="Download file PDF">
            <FileText size={16} className="text-slate-400 group-hover:text-red-600 transition-colors" /> PDF
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white px-4 py-2 rounded-xl shadow-md transition-all text-sm font-medium cursor-pointer">
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pengeluaran */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <DollarSign size={20} />
            </div>
            {totalCost > 0 && (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                <ArrowUpRight size={12} /> Aktif
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Pengeluaran</p>
          <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totalCost)}</h3>
          <div className="mt-2 flex gap-3 text-xs text-slate-400">
            <span>Parts: {formatCurrency(totalPartsCost)}</span>
            <span>Jasa: {formatCurrency(totalLaborCost)}</span>
          </div>
        </div>

        {/* Total Service */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Wrench size={20} />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Service</p>
          <h3 className="text-2xl font-bold text-slate-800">{totalServices} <span className="text-sm font-normal text-slate-400">kali</span></h3>
          <p className="mt-2 text-xs text-slate-400">{trucks.length} unit armada tercatat</p>
        </div>

        {/* Rata-rata */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-violet-50 rounded-lg text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Rata-rata / Service</p>
          <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(avgCost)}</h3>
          <p className="mt-2 text-xs text-slate-400">Per kunjungan service</p>
        </div>

        {/* Unit Paling Boros */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-rose-50 rounded-lg text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <AlertCircle size={20} />
            </div>
            {highestSpenderCost > 0 && (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                <ArrowUpRight size={12} /> Tertinggi
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Unit Paling Boros</p>
          <h3 className="text-xl font-bold text-slate-800 truncate" title={highestSpenderTruck?.plateNumber}>
            {highestSpenderTruck ? highestSpenderTruck.plateNumber : '-'}
          </h3>
          <p className="mt-1 text-xs font-semibold text-rose-500">{highestSpenderCost > 0 ? formatCurrency(highestSpenderCost) : 'Belum ada data'}</p>
        </div>
      </div>

      {/* Tab Navigation: Charts vs Table */}
      <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-100 w-fit no-print">
        <button
          onClick={() => setActiveTab('charts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeTab === 'charts' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <BarChart3 size={16} /> Grafik & Chart
        </button>
        <button
          onClick={() => setActiveTab('table')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeTab === 'table' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <Table2 size={16} /> Data Tabel
        </button>
      </div>

      {/* CHARTS VIEW */}
      {activeTab === 'charts' && (
        <>
          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-500" /> Tren Pengeluaran Tahunan
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Data bulanan untuk tahun {yearFilter}</p>
                </div>
                <span className="text-xs font-medium bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">{yearFilter}</span>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toString()}
                      width={50}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeDasharray: '5 5' }} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorTotal)"
                      activeDot={{ r: 6, strokeWidth: 2, stroke: '#6366f1', fill: '#fff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col">
              <div className="mb-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <PieChartIcon size={16} className="text-indigo-500" /> Jenis Service
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Distribusi frekuensi pekerjaan</p>
              </div>
              {pieData.length > 0 ? (
                <div className="flex-1 min-h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend below */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
                    {pieData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-xs text-slate-600">{entry.name} <span className="text-slate-400">({entry.value})</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <PieChartIcon size={40} className="mb-2 opacity-30" />
                  <p className="text-sm">Belum ada data</p>
                </div>
              )}
            </div>
          </div>

          {/* Top 5 Bar Chart + Cost Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top 5 */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="mb-6">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 size={16} className="text-amber-500" /> Top 5 Biaya Tertinggi
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Unit armada dengan maintenance cost terbesar</p>
              </div>
              {topTrucksData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topTrucksData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        width={100}
                        tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                      />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        formatter={(value: number) => [formatCurrency(value), 'Total Biaya']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,.1)' }}
                      />
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                      </defs>
                      <Bar dataKey="cost" fill="url(#barGrad)" radius={[0, 6, 6, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <BarChart3 size={40} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Belum ada data</p>
                  </div>
                </div>
              )}
            </div>

            {/* Cost Breakdown Summary */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col">
              <h2 className="text-base font-bold text-slate-800 mb-4">Ringkasan Biaya</h2>
              <div className="space-y-4 flex-1">
                {/* Parts */}
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Biaya Parts</span>
                    <span className="text-xs text-blue-500">{totalCost > 0 ? Math.round((totalPartsCost / totalCost) * 100) : 0}%</span>
                  </div>
                  <p className="text-lg font-bold text-blue-700">{formatCurrency(totalPartsCost)}</p>
                  <div className="w-full bg-blue-100 rounded-full h-1.5 mt-2">
                    <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${totalCost > 0 ? (totalPartsCost / totalCost) * 100 : 0}%` }}></div>
                  </div>
                </div>

                {/* Labor */}
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Biaya Jasa</span>
                    <span className="text-xs text-emerald-500">{totalCost > 0 ? Math.round((totalLaborCost / totalCost) * 100) : 0}%</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalLaborCost)}</p>
                  <div className="w-full bg-emerald-100 rounded-full h-1.5 mt-2">
                    <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${totalCost > 0 ? (totalLaborCost / totalCost) * 100 : 0}%` }}></div>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="p-4 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl text-white mt-auto">
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-100">Grand Total</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(totalCost)}</p>
                  <p className="text-xs text-indigo-200 mt-1">{totalServices} kali service</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TABLE VIEW */}
      {activeTab === 'table' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-800">Rincian Data Service</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {filteredServices.length} data ditemukan
                {monthFilter !== 'all' && ` • Bulan ${format(new Date(2024, parseInt(monthFilter) - 1, 1), 'MMMM')}`}
                {` • Tahun ${yearFilter}`}
              </p>
            </div>
            <span className="px-3 py-1 text-xs font-bold bg-slate-100 text-slate-600 rounded-full">
              {filteredServices.length} record
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider">Tanggal</th>
                  <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider">No Polisi</th>
                  <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider">Mekanik</th>
                  <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider">Jenis Pekerjaan</th>
                  <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider text-right">Biaya Parts</th>
                  <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider text-right">Biaya Jasa</th>
                  <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredServices.length > 0 ? filteredServices.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-5 py-3.5 text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-300" />
                        {s.serviceDate}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{trucks.find(t => t.id === s.truckId)?.plateNumber}</td>
                    <td className="px-5 py-3.5 text-slate-500">{s.mechanic || '-'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {s.serviceTypes.slice(0, 2).map((type, i) => (
                          <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-semibold uppercase tracking-wider">{type}</span>
                        ))}
                        {s.serviceTypes.length > 2 && <span className="text-[10px] text-slate-400 self-center font-medium">+{s.serviceTypes.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-600 font-mono text-xs">{formatCurrency(s.parts.reduce((sum, p) => sum + p.price * p.quantity, 0))}</td>
                    <td className="px-5 py-3.5 text-right text-slate-600 font-mono text-xs">{formatCurrency(s.laborCost)}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-800">{formatCurrency(s.totalCost)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                          <Table2 size={28} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">Tidak ada data service</p>
                        <p className="text-xs text-slate-400 mt-1">Coba ubah filter bulan atau tahun</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredServices.length > 0 && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={4} className="px-5 py-3.5 font-bold text-slate-700 uppercase text-xs tracking-wider">Total Keseluruhan</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-700 font-mono text-xs">{formatCurrency(totalPartsCost)}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-700 font-mono text-xs">{formatCurrency(totalLaborCost)}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-indigo-700 text-base">{formatCurrency(totalCost)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default Reports;
