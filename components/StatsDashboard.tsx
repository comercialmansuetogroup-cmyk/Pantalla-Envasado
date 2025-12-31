
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Package } from 'lucide-react';

export const StatsDashboard = ({ darkMode }) => {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats);
  }, []);

  const chartData = stats.map(s => ({
    date: new Date(s.log_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    unidades: Number(s.total_units),
    clientes: s.client_count
  })).reverse();

  return (
    <div className="p-10 h-full overflow-y-auto space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-8 rounded-3xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-200 shadow-xl'}`}>
          <TrendingUp className="text-red-600 mb-4" size={32} />
          <h4 className="text-xs font-black opacity-40 uppercase">Último Carga</h4>
          <p className="text-4xl font-black">{stats[0]?.total_units || 0}</p>
        </div>
        <div className={`p-8 rounded-3xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-200 shadow-xl'}`}>
          <Users className="text-blue-500 mb-4" size={32} />
          <h4 className="text-xs font-black opacity-40 uppercase">Clientes Activos</h4>
          <p className="text-4xl font-black">{stats[0]?.client_count || 0}</p>
        </div>
        <div className={`p-8 rounded-3xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-200 shadow-xl'}`}>
          <Package className="text-green-500 mb-4" size={32} />
          <h4 className="text-xs font-black opacity-40 uppercase">Días Registrados</h4>
          <p className="text-4xl font-black">{stats.length}</p>
        </div>
      </div>

      <div className={`p-10 rounded-3xl border h-[400px] ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-200 shadow-xl'}`}>
        <h3 className="text-xl font-black mb-10 uppercase tracking-widest">Evolución de Producción (30 días)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
            <XAxis dataKey="date" stroke={darkMode ? '#94a3b8' : '#64748b'} />
            <YAxis stroke={darkMode ? '#94a3b8' : '#64748b'} />
            <Tooltip 
              contentStyle={{ background: darkMode ? '#0f172a' : '#fff', border: 'none', borderRadius: '16px' }}
              itemStyle={{ color: '#dc2626', fontWeight: 'bold' }}
            />
            <Bar dataKey="unidades" fill="#dc2626" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
