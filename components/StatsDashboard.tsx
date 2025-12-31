
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Package, TrendingUp } from 'lucide-react';

export const StatsDashboard = ({ darkMode }) => {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats);
  }, []);

  const chartData = stats.map(s => ({
    label: new Date(s.log_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    unidades: Number(s.total_units),
    clientes: s.client_count
  })).reverse();

  return (
    <div className="p-12 h-full overflow-y-auto space-y-10 animate-fade-in">
      {/* KPIs Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: TrendingUp, label: 'Promedio Diario', val: stats.length ? Math.round(stats.reduce((a,b) => a + Number(b.total_units), 0) / stats.length) : 0, color: 'text-red-600' },
          { icon: Package, label: 'Unidades Totales Mes', val: stats.reduce((a,b) => a + Number(b.total_units), 0), color: 'text-blue-500' },
          { icon: Calendar, label: 'Días Operativos', val: stats.length, color: 'text-green-500' }
        ].map((kpi, i) => (
          <div key={i} className={`p-10 rounded-[3rem] border transition-all ${darkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-200 shadow-xl'}`}>
            <kpi.icon className={`${kpi.color} mb-6`} size={40} />
            <h4 className="text-xs font-black opacity-40 uppercase tracking-widest">{kpi.label}</h4>
            <p className="text-5xl font-black tracking-tighter tabular-nums">{kpi.val}</p>
          </div>
        ))}
      </div>

      {/* Gráfico de Evolución */}
      <div className={`p-12 rounded-[3.5rem] border h-[500px] ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-2xl'}`}>
        <h3 className="text-2xl font-black mb-12 uppercase tracking-tighter flex items-center gap-4">
          <div className="w-2 h-10 bg-red-600 rounded-full" />
          Evolución de Producción (30 Días)
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="5 5" vertical={false} stroke={darkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0'} />
            <XAxis dataKey="label" stroke={darkMode ? '#475569' : '#64748b'} fontSize={10} fontVariant="black" />
            <YAxis stroke={darkMode ? '#475569' : '#64748b'} fontSize={10} fontVariant="black" />
            <Tooltip 
              cursor={{fill: 'rgba(220, 38, 38, 0.1)'}}
              contentStyle={{ background: darkMode ? '#0f172a' : '#fff', borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ color: '#dc2626', fontWeight: '900', textTransform: 'uppercase' }}
            />
            <Bar dataKey="unidades" fill="#dc2626" radius={[12, 12, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
