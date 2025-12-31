
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Download, TrendingUp, Package, Calendar, Users, FileText, Share2 } from 'lucide-react';
import { TimeFilter } from '../types';

export const StatsDashboard = ({ darkMode }: { darkMode: boolean }) => {
  const [filter, setFilter] = useState<TimeFilter>('week');
  const [data, setData] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Simulación de carga de datos robusta para gráficas
    const count = filter === 'week' ? 7 : filter === 'month' ? 30 : filter === 'quarter' ? 90 : 365;
    const mockStats = Array.from({ length: count }).map((_, i) => ({
      date: new Date(Date.now() - (count - i) * 86400000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      produccion: Math.floor(Math.random() * 5000) + 2000,
      stock: Math.floor(Math.random() * 3000) + 1000,
    }));
    
    setTimeout(() => {
      setData(mockStats);
      setTopItems([
        { name: 'Coca Cola Zero 33cl', qty: 12400 },
        { name: 'Fanta Naranja 33cl', qty: 9800 },
        { name: 'Agua Mineral 1.5L', qty: 8500 },
        { name: 'Cerveza Especial', qty: 7200 },
        { name: 'Zumo Piña', qty: 6100 },
        { name: 'Nestea Limón', qty: 5400 },
      ]);
      setLoading(false);
    }, 400);
  }, [filter]);

  const exportData = (type: 'csv' | 'pdf') => {
    alert(`Generando reporte ${type.toUpperCase()} con los filtros actuales...`);
  };

  return (
    <div className="p-16 h-full overflow-y-auto bg-[#080a0f] space-y-16 custom-scroll">
      {/* Header Analítica */}
      <div className="flex justify-between items-end border-b border-white/5 pb-10">
        <div>
          <h2 className="text-7xl font-black uppercase italic tracking-tighter text-white">Analítica Industrial</h2>
          <p className="text-sm font-bold text-red-600 uppercase tracking-[0.5em] mt-4 flex items-center gap-3">
            <div className="w-12 h-0.5 bg-red-600"></div> Intelligence Node v18
          </p>
        </div>
        
        <div className="flex gap-6">
          <div className="flex bg-white/5 p-1.5 border border-white/10 rounded-sm">
            {(['week', 'month', 'quarter', 'year'] as TimeFilter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-8 py-3 text-[12px] font-black uppercase transition-all ${filter === f ? 'bg-red-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>
                {f === 'week' ? 'Semana' : f === 'month' ? 'Mes' : f === 'quarter' ? 'Trimestre' : 'Año'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => exportData('csv')} className="flex items-center gap-3 px-8 py-3 bg-white/5 border border-white/10 text-[12px] font-black uppercase hover:bg-white/10 transition-all">
              <Download size={16} /> EXCEL
            </button>
            <button onClick={() => exportData('pdf')} className="flex items-center gap-3 px-8 py-3 bg-red-600/20 border border-red-600/20 text-[12px] font-black uppercase text-red-500 hover:bg-red-600 hover:text-white transition-all">
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-8">
        {[
          { label: 'Unidades Producidas', val: '412,890', icon: Package, color: 'text-red-600', trend: '+12.4%' },
          { label: 'Eficiencia Media', val: '94.2%', icon: TrendingUp, color: 'text-green-500', trend: '+2.1%' },
          { label: 'Zonas Activas', val: '5 Regiones', icon: Users, color: 'text-blue-500', trend: 'Estable' },
          { label: 'Promedio Diario', val: '5,420', icon: Calendar, color: 'text-orange-500', trend: '-1.5%' }
        ].map((kpi, i) => (
          <div key={i} className="p-12 bg-white/2 border border-white/5 flex flex-col gap-6 group hover:bg-white/5 transition-all">
            <div className="flex justify-between items-start">
              <kpi.icon className={kpi.color} size={40} />
              <span className={`text-xs font-black ${kpi.trend.includes('+') ? 'text-green-500' : 'text-slate-500'}`}>{kpi.trend}</span>
            </div>
            <div>
              <p className="text-[12px] font-black opacity-30 uppercase tracking-[0.2em] mb-2">{kpi.label}</p>
              <p className="text-5xl font-black tabular-nums text-white">{kpi.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficas Principales */}
      <div className="grid grid-cols-3 gap-10">
        <div className="col-span-2 p-12 bg-white/2 border border-white/5 h-[650px] flex flex-col shadow-inner">
          <div className="flex justify-between items-center mb-12">
            <h3 className="text-sm font-black uppercase opacity-60 tracking-[0.4em] flex items-center gap-4">
              <div className="w-2 h-8 bg-red-600"></div> Evolución Producción vs Stock
            </h3>
            <div className="flex gap-6 text-[10px] font-black uppercase opacity-40">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-600"></div> PRODUCCIÓN</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-600"></div> STOCK</div>
            </div>
          </div>
          
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="prodColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="stockColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#0a0c10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0' }}
                  itemStyle={{ fontWeight: '900', fontSize: '12px', textTransform: 'uppercase' }}
                />
                <Area type="monotone" dataKey="produccion" stroke="#dc2626" strokeWidth={5} fillOpacity={1} fill="url(#prodColor)" />
                <Area type="monotone" dataKey="stock" stroke="#2563eb" strokeWidth={5} fillOpacity={1} fill="url(#stockColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 10 Productos */}
        <div className="p-12 bg-white/2 border border-white/5 h-[650px] flex flex-col">
          <h3 className="text-sm font-black uppercase opacity-60 tracking-[0.4em] flex items-center gap-4 mb-12">
            <div className="w-2 h-8 bg-blue-600"></div> TOP PRODUCTOS (VOLUMEN)
          </h3>
          <div className="flex-1 overflow-y-auto space-y-8 custom-scroll pr-4">
            {topItems.map((item, i) => (
              <div key={i} className="space-y-3 group">
                <div className="flex justify-between items-end">
                  <span className="text-[12px] font-black uppercase truncate max-w-[200px] text-white/80 group-hover:text-red-500 transition-colors">{item.name}</span>
                  <span className="text-lg font-black text-red-600 tabular-nums">{item.qty.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-white/5 w-full relative">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-1000 ease-out" 
                    style={{ width: `${(item.qty / topItems[0].qty) * 100}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
          <button className="mt-10 w-full py-4 bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-3">
            <Share2 size={14} /> Compartir Informe Semanal
          </button>
        </div>
      </div>
    </div>
  );
};
