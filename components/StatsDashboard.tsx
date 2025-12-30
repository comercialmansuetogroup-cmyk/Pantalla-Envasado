import React, { useState, useMemo } from 'react';
import { ClientGroup, TimeFilter } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowLeft, Calendar, TrendingUp } from 'lucide-react';
import { CHART_COLORS } from '../constants';

interface StatsDashboardProps {
  data: ClientGroup[];
  darkMode: boolean;
  onBack: () => void;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ data, darkMode, onBack }) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');

  const filters: { key: TimeFilter; label: string }[] = [
    { key: 'week', label: 'Esta Semana' },
    { key: 'month', label: 'Este Mes' },
    { key: 'quarter', label: 'Este Trimestre' },
    { key: 'year', label: 'Este Año' },
  ];

  // Prepare Chart Data (Aggregated by Client)
  const clientChartData = useMemo(() => {
    return data.map(client => ({
      name: client.name,
      total: client.total
    }));
  }, [data]);

  // Prepare Product Distribution Data (Top 5 Products Overall)
  const productChartData = useMemo(() => {
    const productMap = new Map<string, number>();
    data.forEach(client => {
      // products is Product[] in ClientGroup
      client.products.forEach(prod => {
        // In utils.ts: productsWithTrend = client.productsArray.map... so prod has name property
        // But type Product has 'name'.
        // However, in utils.ts logic: "productsWithTrend = ... { ...p, trend }"
        // And p comes from visibleProducts values.
        // It should have 'qty' or 'totalQuantity'?
        // Product interface has 'qty'.
        // services/dataProcessor.ts used 'totalQuantity'.
        // utils.ts (used by App) uses 'qty'.
        const current = productMap.get(prod.name) || 0;
        productMap.set(prod.name, current + prod.qty);
      });
    });
    
    return Array.from(productMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5
  }, [data]);

  const textColor = darkMode ? '#e2e8f0' : '#1f2937';
  const gridColor = darkMode ? '#334155' : '#e5e7eb';
  const tooltipBg = darkMode ? '#1e293b' : '#ffffff';

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <button
          onClick={onBack}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
            ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'}
          `}
        >
          <ArrowLeft size={18} />
          <span>Volver a Pedidos</span>
        </button>

        <div className={`p-1 flex rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setTimeFilter(f.key)}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-all
                ${timeFilter === f.key 
                  ? 'bg-red-600 text-white shadow-sm' 
                  : (darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')}
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-xl border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Unidades</p>
              <h3 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {data.reduce((acc, c) => acc + c.total, 0).toLocaleString()}
              </h3>
            </div>
          </div>
        </div>
        <div className={`p-6 rounded-xl border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Calendar size={24} />
            </div>
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Clientes Activos</p>
              <h3 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {data.length}
              </h3>
            </div>
          </div>
        </div>
         <div className={`p-6 rounded-xl border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-4">
             {/* Placeholder for future metric */}
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Crecimiento (YoY)</p>
              <h3 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                +12.5%
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[500px]">
        
        {/* Client Distribution */}
        <div className={`p-6 rounded-xl border shadow-sm flex flex-col ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Volumen por Cliente</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" stroke={textColor} tick={{fill: textColor}} axisLine={false} tickLine={false} />
                <YAxis stroke={textColor} tick={{fill: textColor}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: textColor }}
                  cursor={{fill: darkMode ? '#334155' : '#f3f4f6'}}
                />
                <Bar dataKey="total" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Mix */}
        <div className={`p-6 rounded-xl border shadow-sm flex flex-col ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Top 5 Productos</h3>
          <div className="flex-1 w-full min-h-0">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {productChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: 'none', borderRadius: '8px' }} itemStyle={{ color: textColor }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};