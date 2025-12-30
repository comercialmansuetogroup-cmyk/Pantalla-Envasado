import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Factory, Moon, Sun, Clock, Radio, AlertTriangle, Database, Loader2, 
  TrendingUp, TrendingDown, LayoutDashboard, BarChart3, Calendar, ArrowUpRight, ArrowDownRight,
  ChevronUp, ChevronDown, Settings, Upload, Eye, Type
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Cell
} from 'recharts';
import { SettingsModal } from './SettingsModal.tsx';

// --- CONFIGURACIÓN Y TIPOS ---
const CLIENT_MAPPING: Record<string, string> = {
  '24': 'FILIPPO', '26': 'PINGÜINO', '23': 'LA PALMA', '15': 'TENERIFE NORTE',
  '10': 'GRAN CANARIA', '14': 'GRAN CANARIA', '5': 'GRAN CANARIA', '0': 'GRAN CANARIA'
};

const CHART_COLORS = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#b91c1c'];

interface VisualSettings {
  logoLight: string | null;
  logoDark: string | null;
  displayMode: 'name' | 'code' | 'both';
  maxRowsPerCol: number;
  nameFontSize: number;
  codeFontSize: number;
}

const DEFAULT_SETTINGS: VisualSettings = {
  logoLight: null,
  logoDark: null,
  displayMode: 'name',
  maxRowsPerCol: 20,
  nameFontSize: 16,
  codeFontSize: 18,
};

// --- UTILIDADES ---
const roundSafe = (num: any): number => {
  const val = Number(num);
  return isNaN(val) ? 0 : Math.round((val + Number.EPSILON) * 100) / 100;
};

const SafeText: React.FC<{ value: any }> = ({ value }) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return <span>[Obj]</span>;
  return <>{value}</>;
};

// --- PROCESADOR DE TENDENCIAS ---
const processDataWithTrends = (rawZones: any[]) => {
  if (!rawZones || rawZones.length === 0) return [];

  const zonesByDate = new Map<string, any[]>();
  rawZones.forEach(z => {
    const date = z.receivedAt ? z.receivedAt.split('T')[0] : 'legacy';
    if (!zonesByDate.has(date)) zonesByDate.set(date, []);
    zonesByDate.get(date)!.push(z);
  });

  const allDatesSorted = Array.from(zonesByDate.keys()).sort();
  const latestDate = allDatesSorted[allDatesSorted.length - 1];

  const getStatsForDate = (date: string) => {
    const clients = new Map<string, any>();
    (zonesByDate.get(date) || []).forEach(z => {
      const clientName = CLIENT_MAPPING[z.codigo_agente] || `ZONA ${z.codigo_agente || '0'}`;
      if (!clients.has(clientName)) clients.set(clientName, { name: clientName, products: new Map<string, any>(), total: 0 });
      
      const c = clients.get(clientName);
      const prodName = String(z.nombre || 'PRODUCTO').trim().toUpperCase();
      const prodCode = String(z.codigo_agente || 'N/A').trim(); // Usamos código_agente como ref si no hay código de producto explícito
      
      let qty = Array.isArray(z.productos) ? z.productos.reduce((acc: number, p: any) => acc + (Number(p.cantidad) || 0), 0) : Number(z.cantidad) || 0;
      
      // Intentamos extraer un código de producto si existe en el JSON
      const itemCode = (z.productos && z.productos[0]?.codigo) || prodCode;

      if (!c.products.has(prodName)) {
        c.products.set(prodName, { name: prodName, code: itemCode, qty: 0 });
      }
      const p = c.products.get(prodName);
      p.qty += qty;
      c.total += qty;
    });
    return clients;
  };

  const currentStats = getStatsForDate(latestDate);
  
  return Array.from(currentStats.values()).map(client => {
    let prevStatsForClient = null;
    for (let i = allDatesSorted.length - 2; i >= 0; i--) {
      const stats = getStatsForDate(allDatesSorted[i]);
      if (stats.has(client.name)) {
        prevStatsForClient = stats.get(client.name);
        break;
      }
    }

    const products = Array.from(client.products.values()).map((p: any) => {
      const prevProd = prevStatsForClient?.products.get(p.name);
      const prevQty = prevProd?.qty || 0;
      const trend = prevQty > 0 ? ((p.qty - prevQty) / prevQty) * 100 : 0;
      return { ...p, trend };
    }).sort((a: any, b: any) => b.qty - a.qty);

    const totalTrend = (prevStatsForClient?.total > 0) ? ((client.total - prevStatsForClient.total) / prevStatsForClient.total) * 100 : 0;
    
    return { ...client, products, totalTrend };
  }).sort((a, b) => a.name === 'GRAN CANARIA' ? -1 : (b.name === 'GRAN CANARIA' ? 1 : a.name.localeCompare(b.name)));
};

// --- COMPONENTES ---

const TrendBadge: React.FC<{ value: number }> = ({ value }) => {
  if (Math.abs(value) < 0.1) return null;
  const isUp = value > 0;
  return (
    <div className={`flex items-center gap-0.5 font-black text-[11px] px-1.5 py-0.5 rounded ${isUp ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
      {isUp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      {Math.abs(Math.round(value))}%
    </div>
  );
};

const ProductRow: React.FC<{ p: any; settings: VisualSettings }> = ({ p, settings }) => {
  const showName = settings.displayMode === 'name' || settings.displayMode === 'both';
  const showCode = settings.displayMode === 'code' || settings.displayMode === 'both';

  return (
    <div className="flex items-center justify-between py-2 px-4 border-b border-white/[0.04] group hover:bg-white/[0.02] transition-colors gap-x-8">
      <div className="flex-1 min-w-0 flex items-center gap-4">
        <div className="flex flex-col min-w-0">
          {showCode && (
            <span 
              className="font-black text-white leading-none mb-1 truncate"
              style={{ fontSize: `${settings.codeFontSize}px` }}
            >
              #{p.code}
            </span>
          )}
          {showName && (
            <span 
              className={`font-bold transition-colors uppercase truncate leading-none ${settings.displayMode === 'both' ? 'text-slate-500 group-hover:text-red-400' : 'text-slate-400 group-hover:text-red-500'}`}
              style={{ fontSize: `${settings.nameFontSize}px` }}
            >
              {p.name}
            </span>
          )}
        </div>
        <TrendBadge value={p.trend} />
      </div>
      <div className="text-xl xl:text-3xl font-black tabular-nums text-white group-hover:text-red-600 transition-all leading-none min-w-[100px] text-right">
        {p.qty.toLocaleString('es-ES')}
      </div>
    </div>
  );
};

const ClientColumn: React.FC<{ data: any; darkMode: boolean; settings: VisualSettings }> = ({ data, darkMode, settings }) => {
  const productCount = data.products.length;
  const maxRows = settings.maxRowsPerCol;
  const numCols = Math.ceil(productCount / maxRows) || 1;
  const columns = [];
  for (let i = 0; i < numCols; i++) columns.push(data.products.slice(i * maxRows, (i + 1) * maxRows));

  return (
    <div style={{ flex: `${numCols} 0 0` }} className={`flex flex-col h-full border-r last:border-r-0 transition-all ${darkMode ? 'bg-slate-950 border-white/5' : 'bg-white border-gray-200'}`}>
      <div className={`px-8 py-4 border-b-2 ${numCols > 1 ? 'text-center' : 'text-left'} ${darkMode ? 'bg-white/[0.01] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
        <div className={`flex items-center gap-4 ${numCols > 1 ? 'justify-center' : 'justify-between'}`}>
          <h3 className={`text-xl xl:text-3xl font-black uppercase tracking-tighter truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {data.name}
          </h3>
          <div className="flex items-center gap-2">
            <TrendBadge value={data.totalTrend} />
            <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {columns.map((colProducts, colIdx) => (
          <div key={colIdx} className={`flex-1 flex flex-col p-2 ${colIdx > 0 ? 'border-l border-white/[0.05]' : ''}`}>
            {colProducts.map((p: any, i: number) => <ProductRow key={i} p={p} settings={settings} />)}
            {colProducts.length < maxRows && Array.from({ length: maxRows - colProducts.length }).map((_, emptyIdx) => (
              <div key={`empty-${emptyIdx}`} className="py-2.5 px-3 border-b border-transparent opacity-0">.</div>
            ))}
          </div>
        ))}
      </div>
      
      <div className={`px-8 py-4 mt-auto border-t-2 ${darkMode ? 'bg-red-600/[0.03] border-red-600/20' : 'bg-red-50 border-red-200'}`}>
        <div className={`flex items-end ${numCols > 1 ? 'justify-center gap-12' : 'justify-between'}`}>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">TOTAL ACUMULADO</span>
            <span className="text-[9px] font-bold text-red-600/40 uppercase italic tracking-widest">DASHBOARD VIVO</span>
          </div>
          <span className="text-4xl xl:text-6xl font-black text-red-600 leading-none tabular-nums tracking-tighter">
            {roundSafe(data.total).toLocaleString('es-ES')}
          </span>
        </div>
      </div>
    </div>
  );
};

const StatsDashboard: React.FC<{ rawData: any[], darkMode: boolean }> = ({ rawData, darkMode }) => {
  const [filter, setFilter] = useState<'week' | 'month' | 'quarter' | 'year'>('week');

  const chartData = useMemo(() => {
    const map = new Map();
    rawData.forEach(z => {
      const d = z.receivedAt ? z.receivedAt.split('T')[0] : 'Legacy';
      let qty = Array.isArray(z.productos) ? z.productos.reduce((a: any, p: any) => a + (Number(p.cantidad) || 0), 0) : Number(z.cantidad || 0);
      map.set(d, (map.get(d) || 0) + qty);
    });
    return Array.from(map.entries()).map(([name, total]) => ({ name, total })).sort((a, b) => a.name.localeCompare(b.name)).slice(-14);
  }, [rawData]);

  const clientVolume = useMemo(() => {
    const map = new Map();
    rawData.forEach(z => {
      const name = CLIENT_MAPPING[z.codigo_agente] || 'OTROS';
      let qty = Array.isArray(z.productos) ? z.productos.reduce((a: any, p: any) => a + (Number(p.cantidad) || 0), 0) : Number(z.cantidad || 0);
      map.set(name, (map.get(name) || 0) + qty);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [rawData]);

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto p-8 animate-fade-in bg-slate-950/20">
      <div className="flex justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <BarChart3 className="text-red-600" size={32} />
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Análisis Estadístico</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2 font-bold">Histórico de Producción y Crecimiento</p>
          </div>
        </div>
        <div className="flex gap-2 p-1 bg-black/20 rounded-2xl">
          {['WEEK', 'MONTH', 'QUARTER', 'YEAR'].map(f => (
            <button key={f} onClick={() => setFilter(f.toLowerCase() as any)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${filter === f.toLowerCase() ? 'bg-red-600 text-white shadow-lg' : 'hover:bg-white/5 text-slate-400'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 border border-white/10 p-8 rounded-[2rem] flex flex-col justify-between group hover:border-red-600/30 transition-all">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Crecimiento Promedio</span>
          <div className="flex items-center justify-between">
            <span className="text-6xl font-black text-green-500">+18.4%</span>
            <TrendingUp size={48} className="text-green-500/10 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-[10px] text-slate-400 font-bold">Comparado con periodo anterior</p>
        </div>
        <div className="bg-slate-900/50 border border-white/10 p-8 rounded-[2rem] flex flex-col justify-between group hover:border-red-600/30 transition-all">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Volumen de Pedidos</span>
          <div className="flex items-center justify-between">
            <span className="text-6xl font-black text-white">{chartData.reduce((a, b) => a + b.total, 0).toLocaleString()}</span>
            <Database size={48} className="text-white/10 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-[10px] text-slate-400 font-bold">Unidades totales gestionadas</p>
        </div>
        <div className="bg-slate-900/50 border border-white/10 p-8 rounded-[2rem] flex flex-col justify-between group hover:border-red-600/30 transition-all">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Eficiencia de Nodo</span>
          <div className="flex items-center justify-between">
            <span className="text-4xl font-black text-red-600 uppercase">94.8%</span>
            <ArrowUpRight size={48} className="text-red-600/10 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-[10px] text-slate-400 font-bold">Ratio de cumplimiento diario</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[400px]">
        <div className="bg-slate-900/80 border border-white/10 p-8 rounded-[3rem] flex flex-col shadow-2xl">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-8 text-slate-500 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-600" /> Histórico de Carga
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '16px'}} />
                <Area type="monotone" dataKey="total" stroke="#dc2626" strokeWidth={4} fillOpacity={1} fill="url(#colorProd)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-slate-900/80 border border-white/10 p-8 rounded-[3rem] flex flex-col shadow-2xl">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-8 text-slate-500 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-600" /> Reparto por Cliente
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientVolume}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#ffffff03'}} contentStyle={{backgroundColor: '#020617', border: 'none', borderRadius: '16px'}} />
                <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={40}>
                  {clientVolume.map((entry, index) => <Cell key={`c-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [view, setView] = useState<'live' | 'stats'>('live');
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [visualSettings, setVisualSettings] = useState<VisualSettings>(() => {
    const saved = localStorage.getItem('factoryFlow_visualSettings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const updateVisualSettings = (newSettings: VisualSettings) => {
    setVisualSettings(newSettings);
    localStorage.setItem('factoryFlow_visualSettings', JSON.stringify(newSettings));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error("Sync Fail");
      const json = await res.json();
      if (json && json.zonas) {
        setRawData(json.zonas);
        setLastSync(new Date());
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const clientGroups = useMemo(() => processDataWithTrends(rawData), [rawData]);
  const totalGlobal = useMemo(() => roundSafe(clientGroups.reduce((acc, c) => acc + (c.total || 0), 0)), [clientGroups]);

  const currentLogo = darkMode ? visualSettings.logoDark : visualSettings.logoLight;

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`flex-none w-full px-10 py-3 border-b-2 ${darkMode ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-300'}`}>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-6">
            <div className="bg-red-600 p-2.5 rounded-xl shadow-lg shadow-red-600/20">
              {currentLogo ? (
                <img src={currentLogo} alt="Logo" className="w-8 h-8 object-contain" />
              ) : (
                <Factory size={26} className="text-white" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">Factory<span className="text-red-600">Flow</span></h2>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mt-1 italic">Producción de Pedidos en Vivo</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm shadow-inner">
              <button onClick={() => setView('live')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black transition-all ${view === 'live' ? 'bg-red-600 text-white shadow-xl translate-y-[-1px]' : 'hover:bg-white/5 text-slate-500'}`}>
                <LayoutDashboard size={14} /> PEDIDOS
              </button>
              <button onClick={() => setView('stats')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black transition-all ${view === 'stats' ? 'bg-red-600 text-white shadow-xl translate-y-[-1px]' : 'hover:bg-white/5 text-slate-500'}`}>
                <BarChart3 size={14} /> ANALÍTICA
              </button>
            </div>

            <div className="flex flex-col items-end pr-8 border-r border-white/10">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">PRODUCCIÓN GLOBAL</span>
               <span className="text-4xl font-black text-red-600 leading-none tracking-tighter tabular-nums">
                {totalGlobal.toLocaleString('es-ES')}
               </span>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all shadow-md text-slate-400 hover:text-white"
              >
                <Settings size={20} />
              </button>
              <button onClick={() => setDarkMode(!darkMode)} className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all shadow-md">
                {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-700" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full flex overflow-hidden">
        {rawData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 opacity-40">
            <div className="p-10 bg-red-600/5 rounded-full border border-red-600/10 animate-pulse">
              <Radio size={80} className="text-red-600" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-[1em] text-slate-500">Sincronizando...</h2>
          </div>
        ) : (
          view === 'live' ? (
            <div className="flex w-full h-full animate-fade-in divide-x divide-white/5 overflow-x-auto overflow-y-hidden">
              {clientGroups.map((g) => <ClientColumn key={g.name} data={g} darkMode={darkMode} settings={visualSettings} />)}
            </div>
          ) : (
            <StatsDashboard rawData={rawData} darkMode={darkMode} />
          )
        )}
      </main>

      <footer className={`flex-none px-10 py-2.5 border-t flex justify-between items-center text-[9px] font-black uppercase tracking-[0.5em] ${darkMode ? 'bg-slate-900 border-white/5 text-slate-700' : 'bg-slate-200 border-gray-300 text-slate-500'}`}>
        <div className="flex items-center gap-4">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
          NÚCLEO ONLINE • {clientGroups.length} NODOS
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 opacity-40 italic"><Database size={12} /> SYNC_PRO_VERSION</div>
          {lastSync && <div className="flex items-center gap-3 text-slate-500 font-bold"><Clock size={14} /> ÚLTIMA SYNC: {lastSync.toLocaleTimeString()}</div>}
        </div>
      </footer>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        visualSettings={visualSettings}
        onSaveSettings={updateVisualSettings}
      />
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) ReactDOM.createRoot(rootElement).render(<App />);
