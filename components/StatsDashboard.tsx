
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Download, FileText, TrendingUp, Package, Calendar, Users } from 'lucide-react';
import { TimeFilter } from '../types';

export const StatsDashboard = ({ darkMode }: { darkMode: boolean }) => {
  const [filter, setFilter] = useState<TimeFilter>('week');
  const [data, setData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    // Generador de datos simulado para la demo visual pero conectable a API
    const days = filter === 'week' ? 7 : filter === 'month' ? 30 : 90;
    const mockData = Array.from({ length: days }).map((_, i) => ({
      date: new Date(Date.now() - (days - i) * 86400000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      unidades: Math.floor(Math.random() * 4000) + 1000,
    }));
    setData(mockData);

    fetch('/api/data').then(r => r.json()).then(raw => {
      const pMap: Record<string, number> = {};
      raw.forEach((r: any) => {
        pMap[r.product_name] = (pMap[r.product_name] || 0) + Number(r.total_qty);
      });
      setTopProducts(Object.entries(pMap).sort((a,b) => b[1] - a[1]).slice(0, 10).map(e => ({ name: e[0], qty: e[1] })));
    });
  }, [filter]);

  return (
    <div className="p-12 h-full overflow-y-auto bg-[#0a0c10] space-y-12 custom-scroll">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-5xl font-black uppercase italic tracking-tighter">Analítica Brutal</h2>
          <p className="text-xs font-bold opacity-30 uppercase tracking-[0.4em] mt-3">Intelligence Hub v15</p>
        </div>
        
        <div className="flex gap-4">
          <div className="flex bg-white/5 p-1 border border-white/10 rounded-sm">
            {(['week', 'month', 'quarter', 'year'] as TimeFilter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-6 py-2 text-[10px] font-black uppercase transition-all ${filter === f ? 'bg-red-600 text-white' : 'opacity-40 hover:opacity-100'}`}>
                {f === 'week' ? 'SEMANA' : f === 'month' ? 'MES' : f === 'quarter' ? 'TRIMESTRE' : 'AÑO'}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-6 py-2 bg-white/5 border border-white/10 text-[10px] font-black uppercase hover:bg-white/10">
            <Download size={14} /> EXPORTAR CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Unidades Totales', val: '124,530', icon: Package, color: 'text-red-600' },
          { label: 'Crecimiento', val: '+18.4%', icon: TrendingUp, color: 'text-green-500' },
          { label: 'Clientes Activos', val: '5 Zonas', icon: Users, color: 'text-blue-500' },
          { label: 'Promedio Diario', val: '3,240', icon: Calendar, color: 'text-orange-500' }
        ].map((kpi, i) => (
          <div key={i} className="p-10 bg-white/2 border border-white/5 flex flex-col gap-4">
            <kpi.icon className={kpi.color} size={32} />
            <div>
              <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-1">{kpi.label}</p>
              <p className="text-4xl font-black tabular-nums">{kpi.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 p-10 bg-white/2 border border-white/5 h-[500px]">
          <h3 className="text-xs font-black uppercase opacity-40 mb-10 tracking-[0.3em] flex items-center gap-3">
            <div className="w-1.5 h-6 bg-red-600"></div> Evolución Unidades de Producción
          </h3>
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorUnidades" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#000', border: '1px solid #333' }} />
              <Area type="monotone" dataKey="unidades" stroke="#dc2626" strokeWidth={4} fillOpacity={1} fill="url(#colorUnidades)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="p-10 bg-white/2 border border-white/5 h-[500px] flex flex-col">
          <h3 className="text-xs font-black uppercase opacity-40 mb-10 tracking-[0.3em] flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-600"></div> TOP 10 PRODUCTOS
          </h3>
          <div className="flex-1 overflow-y-auto space-y-6 custom-scroll pr-4">
            {topProducts.map((p, i) => (
              <div key={i} className="space-y-2 border-b border-white/5 pb-4">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase truncate max-w-[200px]">{p.name}</span>
                  <span className="text-sm font-black text-red-600">{p.qty.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-white/5 w-full">
                  <div className="h-full bg-blue-600" style={{ width: `${(p.qty / topProducts[0].qty) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
