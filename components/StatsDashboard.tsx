
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Download, TrendingUp, Package, Calendar, Users, FileText, Share2, BarChart3 } from 'lucide-react';
import { TimeFilter, ClientGroup } from '../types';

interface StatsDashboardProps {
  darkMode: boolean;
  data: ClientGroup[];
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ darkMode, data }) => {
  const [filter, setFilter] = useState<TimeFilter>('week');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 1. Calcular KPIs REALES basados en 'data' (Estado Actual)
  const totalProduction = useMemo(() => {
    return data.reduce((acc, client) => acc + client.products.reduce((pAcc: number, p: any) => pAcc + p.qty, 0), 0);
  }, [data]);

  const totalStock = useMemo(() => {
    return data.reduce((acc, client) => acc + client.products.reduce((pAcc: number, p: any) => pAcc + p.stock, 0), 0);
  }, [data]);

  const activeZones = data.length;
  const averagePerZone = activeZones > 0 ? Math.round(totalProduction / activeZones) : 0;
  
  // Eficiencia actual (Stock vs Producción)
  const efficiency = totalProduction > 0 ? Math.min(99.9, ((totalProduction - Math.max(0, totalProduction - totalStock)) / totalProduction) * 100).toFixed(1) : '100';

  // 2. Calcular TOP PRODUCTOS (Acumulado Total)
  const topItems = useMemo(() => {
    const allProducts = new Map<string, number>();
    
    data.forEach(client => {
      client.products.forEach(p => {
        const current = allProducts.get(p.name) || 0;
        allProducts.set(p.name, current + p.qty);
      });
    });

    return Array.from(allProducts.entries())
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [data]);

  // 3. Obtener Historial Real del Servidor
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await fetch(`/api/history?period=${filter}`);
        if (res.ok) {
          const json = await res.json();
          setHistoryData(json);
        } else {
          console.error("Error fetching history");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [filter]);

  // --- LÓGICA DE EXPORTACIÓN ---
  const downloadCSV = () => {
    // BOM para que Excel reconozca UTF-8 correctamente
    const BOM = "\uFEFF"; 
    let csvContent = BOM;
    
    // Encabezado
    csvContent += `REPORTE DE ANALITICA INDUSTRIAL - ANSUETO\n`;
    csvContent += `Fecha Generacion;${new Date().toLocaleString()}\n`;
    csvContent += `Filtro Temporal;${filter.toUpperCase()}\n\n`;

    // Sección KPIs
    csvContent += "RESUMEN EJECUTIVO\n";
    csvContent += "Indicador;Valor\n";
    csvContent += `Unidades Producidas;${totalProduction}\n`;
    csvContent += `Eficiencia Global;${efficiency}%\n`;
    csvContent += `Regiones Activas;${activeZones}\n`;
    csvContent += `Promedio por Zona;${averagePerZone}\n\n`;

    // Sección Histórico
    csvContent += `HISTORICO DE PRODUCCION (${filter.toUpperCase()})\n`;
    csvContent += "Periodo;Produccion\n";
    historyData.forEach(row => {
      csvContent += `${row.date} (${row.fullDate ? row.fullDate.split('T')[0] : ''});${row.produccion}\n`;
    });
    csvContent += "\n";

    // Sección Top Productos
    csvContent += "TOP 10 PRODUCTOS\n";
    csvContent += "Producto;Cantidad Total\n";
    topItems.forEach(item => {
      csvContent += `${item.name};${item.qty}\n`;
    });

    // Crear Blob y descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reporte_Ansueto_${filter}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportData = (type: 'csv' | 'pdf') => {
    if (type === 'csv') {
      downloadCSV();
    } else {
      // Para PDF, invocamos la impresión del navegador.
      // Los estilos CSS en index.html (@media print) se encargarán de ocultar botones y dejarlo limpio.
      window.print();
    }
  };

  // Estilos
  const bgClass = darkMode ? 'bg-[#080a0f]' : 'bg-slate-50';
  const cardBgClass = darkMode ? 'bg-white/2 border-white/5' : 'bg-white border-slate-200 shadow-sm';
  const textTitleClass = darkMode ? 'text-white' : 'text-slate-900';
  const textSubClass = darkMode ? 'text-white/60' : 'text-slate-500';
  const gridColor = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const axisColor = darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)';
  const tooltipBg = darkMode ? '#0a0c10' : '#ffffff';
  const tooltipBorder = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const chartTitle = filter === 'week' ? 'Últimas 4 Semanas' 
                   : filter === 'month' ? 'Últimos 12 Meses'
                   : filter === 'quarter' ? 'Evolución Trimestral'
                   : 'Histórico Anual';

  return (
    <div className={`p-16 h-full overflow-y-auto space-y-16 custom-scroll transition-colors duration-300 ${bgClass} print:p-0 print:overflow-visible print:bg-white print:h-auto`}>
      {/* Header Analítica */}
      <div className={`flex justify-between items-end border-b pb-10 transition-colors ${darkMode ? 'border-white/5' : 'border-slate-200'} print:border-slate-900`}>
        <div>
          <h2 className={`text-7xl font-black uppercase italic tracking-tighter ${textTitleClass} print:text-black`}>Analítica Industrial</h2>
          <div className="text-sm font-bold text-red-600 uppercase tracking-[0.5em] mt-4 flex items-center gap-3">
            <div className="w-12 h-0.5 bg-red-600"></div> Intelligence Node v18
          </div>
        </div>
        
        {/* Ocultar botones en impresión */}
        <div className="flex gap-6 print:hidden">
          <div className={`flex p-1.5 border rounded-sm ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
            {(['week', 'month', 'quarter', 'year'] as TimeFilter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-8 py-3 text-[12px] font-black uppercase transition-all ${filter === f ? 'bg-red-600 text-white shadow-lg' : (darkMode ? 'text-white opacity-40 hover:opacity-100' : 'text-slate-600 opacity-60 hover:opacity-100 hover:bg-slate-100')}`}>
                {f === 'week' ? 'Semana' : f === 'month' ? 'Mes' : f === 'quarter' ? 'Trimestre' : 'Año'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => exportData('csv')} className={`flex items-center gap-3 px-8 py-3 border text-[12px] font-black uppercase transition-all ${darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
              <Download size={16} /> EXCEL
            </button>
            <button onClick={() => exportData('pdf')} className="flex items-center gap-3 px-8 py-3 bg-red-600/10 border border-red-600/20 text-[12px] font-black uppercase text-red-600 hover:bg-red-600 hover:text-white transition-all">
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-8">
        {[
          { label: 'Unidades Producidas', val: totalProduction.toLocaleString(), icon: Package, color: 'text-red-600', trend: '+12.4%', trendUp: true },
          { label: 'Eficiencia Global', val: `${efficiency}%`, icon: TrendingUp, color: 'text-green-500', trend: '+2.1%', trendUp: true },
          { label: 'Regiones Activas', val: `${activeZones}`, icon: Users, color: 'text-blue-500', trend: 'Estable', trendUp: null },
          { label: 'Media Por Zona', val: averagePerZone.toLocaleString(), icon: Calendar, color: 'text-orange-500', trend: '-1.5%', trendUp: false }
        ].map((kpi, i) => (
          <div key={i} className={`p-12 border flex flex-col gap-6 group transition-all duration-300 ${cardBgClass} ${darkMode ? 'hover:bg-white/5' : 'hover:shadow-md'} print:border-slate-300 print:bg-white print:break-inside-avoid`}>
            <div className="flex justify-between items-start">
              <kpi.icon className={kpi.color} size={40} />
              <span className={`text-3xl font-black tracking-tight ${
                  kpi.trendUp === true ? 'text-green-500' : 
                  kpi.trendUp === false ? 'text-red-500' : 
                  (darkMode ? 'text-slate-500' : 'text-slate-400')
              }`}>
                {kpi.trend}
              </span>
            </div>
            <div>
              <p className={`text-[12px] font-black uppercase tracking-[0.2em] mb-2 ${textSubClass} print:text-slate-600`}>{kpi.label}</p>
              <p className={`text-5xl font-black tabular-nums ${textTitleClass} print:text-black`}>{kpi.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfica Histórica y Top */}
      <div className="grid grid-cols-3 gap-10 print:block print:space-y-10">
        <div className={`col-span-2 p-12 border h-[650px] flex flex-col ${cardBgClass} print:border-slate-300 print:bg-white print:h-[500px] print:mb-8 print:break-inside-avoid`}>
          <div className="flex justify-between items-center mb-12">
            <h3 className={`text-sm font-black uppercase tracking-[0.4em] flex items-center gap-4 ${darkMode ? 'text-white/60' : 'text-slate-500'} print:text-slate-800`}>
              <div className="w-2 h-8 bg-red-600"></div> Evolución Producción ({chartTitle})
            </h3>
            <div className={`flex gap-6 text-[10px] font-black uppercase ${darkMode ? 'text-white/40' : 'text-slate-400'} print:text-slate-600`}>
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-600"></div> VOLUMEN</div>
            </div>
          </div>
          
          <div className="flex-1 relative">
            {loadingHistory ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs font-black uppercase opacity-40">Cargando histórico...</div>
            ) : historyData.length === 0 ? (
               <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 opacity-30">
                  <BarChart3 size={48} />
                  <span className="text-xs font-black uppercase tracking-widest">Sin datos históricos suficientes para comparar</span>
               </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData}>
                  <defs>
                    <linearGradient id="prodColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="date" stroke={axisColor} fontSize={11} axisLine={false} tickLine={false} fontWeight={700} />
                  <YAxis stroke={axisColor} fontSize={11} axisLine={false} tickLine={false} fontWeight={700} />
                  <Area type="monotone" dataKey="produccion" stroke="#dc2626" strokeWidth={5} fillOpacity={1} fill="url(#prodColor)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top 10 Productos */}
        <div className={`p-12 border h-[650px] flex flex-col ${cardBgClass} print:border-slate-300 print:bg-white print:h-auto print:break-inside-avoid`}>
          <h3 className={`text-sm font-black uppercase tracking-[0.4em] flex items-center gap-4 mb-12 ${darkMode ? 'text-white/60' : 'text-slate-500'} print:text-slate-800`}>
            <div className="w-2 h-8 bg-blue-600"></div> TOP PRODUCTOS (VOLUMEN)
          </h3>
          <div className="flex-1 overflow-y-auto space-y-8 custom-scroll pr-4 print:overflow-visible print:h-auto">
            {topItems.length === 0 ? (
               <div className="h-full flex items-center justify-center opacity-40 text-xs font-black uppercase text-center">
                 Esperando datos...
               </div>
            ) : topItems.map((item, i) => (
              <div key={i} className="space-y-3 group">
                <div className="flex justify-between items-end">
                  <span className={`text-[12px] font-black uppercase truncate max-w-[200px] transition-colors ${darkMode ? 'text-white/80 group-hover:text-red-500' : 'text-slate-700 group-hover:text-red-600'} print:text-slate-800`}>{item.name}</span>
                  <span className="text-lg font-black text-red-600 tabular-nums">{item.qty.toLocaleString()}</span>
                </div>
                <div className={`h-2 w-full relative ${darkMode ? 'bg-white/5' : 'bg-slate-100'} print:bg-slate-100`}>
                  <div 
                    className="h-full bg-blue-600 transition-all duration-1000 ease-out print:bg-blue-600" 
                    style={{ width: `${(item.qty / topItems[0].qty) * 100}%`, printColorAdjust: 'exact' }} 
                  />
                </div>
              </div>
            ))}
          </div>
          <button className={`mt-10 w-full py-4 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-3 ${darkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-800'} print:hidden`}>
            <Share2 size={14} /> Compartir Informe Semanal
          </button>
        </div>
      </div>
    </div>
  );
};
