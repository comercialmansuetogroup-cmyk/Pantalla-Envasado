
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { Calendar, Package, TrendingUp, Download, FileText, ChevronDown } from 'lucide-react';
import { TimeFilter } from '../types';

export const StatsDashboard = ({ darkMode }: { darkMode: boolean }) => {
  const [stats, setStats] = useState<any[]>([]);
  const [filter, setFilter] = useState<TimeFilter>('week');
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(data => {
      // Mock stats generator based on current data for visual purposes
      // In production, this would hit /api/stats with the filter
      const mockStats = Array.from({ length: 7 }).map((_, i) => ({
        log_date: new Date(Date.now() - i * 86400000).toISOString(),
        total_units: Math.floor(Math.random() * 5000) + 1000,
        client_count: 5
      }));
      setStats(mockStats);

      // Extract top products
      const productsMap: Record<string, number> = {};
      data.forEach((row: any) => {
        productsMap[row.product_name] = (productsMap[row.product_name] || 0) + Number(row.total_qty);
      });
      const top = Object.entries(productsMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, qty]) => ({ name, qty }));
      setTopProducts(top);
    });
  }, [filter]);

  const chartData = stats.map(s => ({
    label: new Date(s.log_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    unidades: Number(s.total_units)
  })).reverse();

  const exportCSV = () => {
    const headers = "Fecha,Unidades,Clientes\n";
    const rows = stats.map(s => `${s.log_date},${s.total_units},${s.client_count}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_produccion_${filter}.csv`;
    a.click();
  };

  return (
    <div className="p-12 h-full overflow-y-auto space-y-12 bg-[#0a0c10] custom-scroll">
      {/* Header Analítica */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase italic tracking-tighter">Analítica de Producción</h2>
          <p className="text-xs font-bold opacity-30 uppercase tracking-[0.4em] mt-2">Industrial Engine Stats V14</p>
        </div>
        
        <div className="flex gap-4">
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
            {(['week', 'month', 'quarter', 'year'] as TimeFilter[]).map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-[10px] font-black uppercase transition-all rounded ${filter === f ? 'bg-red-600' : 'opacity-40 hover:opacity-100'}`}
              >
                {f === 'week' ? 'Semana' : f === 'month' ? 'Mes' : f === 'quarter' ? 'Trimestre' : 'Año'}
              </button>
            ))}
          </div>
          <button onClick={exportCSV} className="flex items-center gap-2 px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase hover:bg-white/10">
            <Download size={14} /> EXCEL (CSV)
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2 bg-red-600 border border-white/10 rounded-lg text-[10px] font-black uppercase hover:bg-red-700">
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { icon: TrendingUp, label: 'Promedio Diario', val: '2,450', color: 'text-red-600' },
          { icon: Package, label: 'Unidades Totales', val: '46,325', color: 'text-blue-500' },
          { icon: Calendar, label: 'Crecimiento', val: '+14%', color: 'text-green-500' },
          { icon: TrendingUp, label: 'Líneas Activas', val: '128', color: 'text-orange-500' }
        ].map((kpi, i) => (
          <div key={i} className="p-8 bg-white/2 border border-white/5 flex flex-col gap-4">
            <kpi.icon className={kpi.color} size={32} />
            <div>
              <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">{kpi.label}</p>
              <p className="text-4xl font-black tabular-nums">{kpi.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficas Principales */}
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 p-10 bg-white/2 border border-white/5 h-[450px]">
          <h3 className="text-xs font-black uppercase opacity-40 mb-10 tracking-widest flex items-center gap-2">
            <div className="w-1 h-4 bg-red-600"></div> Evolución Unidades Producción
          </h3>
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorU" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" stroke="rgba(255,255,255,0.2)" fontSize={10} fontVariant="black" />
              <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} fontVariant="black" />
              <Tooltip 
                contentStyle={{ background: '#000', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px' }}
                itemStyle={{ color: '#dc2626', fontWeight: '900' }}
              />
              <Area type="monotone" dataKey="unidades" stroke="#dc2626" strokeWidth={4} fillOpacity={1} fill="url(#colorU)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="p-10 bg-white/2 border border-white/5 h-[450px] flex flex-col">
          <h3 className="text-xs font-black uppercase opacity-40 mb-10 tracking-widest flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-600"></div> TOP 10 PRODUCTOS (CANTIDAD)
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 custom-scroll pr-2">
            {topProducts.map((p, i) => (
              <div key={i} className="flex flex-col gap-1 border-b border-white/5 pb-2">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase truncate max-w-[200px]">{p.name}</span>
                  <span className="text-sm font-black text-red-600">{p.qty.toLocaleString()}</span>
                </div>
                <div className="h-1 bg-white/5 w-full">
                  <div 
                    className="h-full bg-blue-600" 
                    style={{ width: `${(p.qty / topProducts[0].qty) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
