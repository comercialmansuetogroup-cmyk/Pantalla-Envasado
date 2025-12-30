import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Factory, Moon, Sun, Clock, Radio, AlertTriangle, Database, Loader2, 
  TrendingUp, TrendingDown, LayoutDashboard, BarChart3, Calendar, ArrowUpRight, ArrowDownRight,
  ChevronUp, ChevronDown, Settings, Upload, Eye, Type, X, Globe, Clipboard, ArrowRight, Layout,
  Server, Key, Info
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Cell
} from 'recharts';

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

// --- COMPONENTE MODAL DE CONFIGURACIÓN ---
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visualSettings: VisualSettings;
  onSaveSettings: (settings: VisualSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, visualSettings, onSaveSettings }) => {
  const [localSettings, setLocalSettings] = useState<VisualSettings>(visualSettings);

  if (!isOpen) return null;

  const railwayBaseUrl = window.location.origin;
  const webhookUrl = `${railwayBaseUrl}/api/webhook`;
  const authToken = 'DASHBOARD_V3_KEY_2025';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, mode: 'light' | 'dark') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const newSettings = { ...localSettings, [mode === 'light' ? 'logoLight' : 'logoDark']: base64 };
        setLocalSettings(newSettings);
        onSaveSettings(newSettings);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateSetting = (key: keyof VisualSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSaveSettings(newSettings);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-4xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col h-[90vh]">
        <div className="px-10 py-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-red-600 flex-none">
          <div className="flex items-center gap-4 text-white">
            <Settings size={32} />
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Panel de Configuración</h2>
              <p className="text-xs font-bold uppercase opacity-80">Gestión Visual y de Datos V4</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-10 space-y-12 overflow-y-auto flex-1 text-slate-900 dark:text-white">
          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.4em] flex items-center gap-2">
              <Upload size={16} className="text-red-600" /> Identidad Visual
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Logotipo Modo Claro</p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden">
                    {localSettings.logoLight ? <img src={localSettings.logoLight} className="w-full h-full object-contain" /> : <Factory className="text-slate-300" />}
                  </div>
                  <label className="flex-1 cursor-pointer py-3 px-4 bg-red-600 text-white rounded-xl text-center font-black text-xs uppercase hover:bg-red-700 transition-colors">
                    Subir Imagen
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'light')} />
                  </label>
                </div>
              </div>
              <div className="p-6 bg-slate-950 dark:bg-slate-900 rounded-3xl border border-slate-800 space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-500">Logotipo Modo Oscuro</p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden">
                    {localSettings.logoDark ? <img src={localSettings.logoDark} className="w-full h-full object-contain" /> : <Factory className="text-slate-600" />}
                  </div>
                  <label className="flex-1 cursor-pointer py-3 px-4 bg-red-600 text-white rounded-xl text-center font-black text-xs uppercase hover:bg-red-700 transition-colors">
                    Subir Imagen
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'dark')} />
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.4em] flex items-center gap-2">
              <Layout size={16} className="text-red-600" /> Estructura de Datos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Modo de Visualización</p>
                <div className="flex flex-col gap-2">
                  {['name', 'code', 'both'].map((m) => (
                    <button
                      key={m}
                      onClick={() => updateSetting('displayMode', m as any)}
                      className={`py-3 px-4 rounded-xl text-xs font-black uppercase transition-all ${localSettings.displayMode === m ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
                    >
                      {m === 'name' ? 'Solo Nombre' : m === 'code' ? 'Solo Código' : 'Código + Nombre'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Max Productos por Columna</p>
                <div className="flex flex-col gap-4">
                  <input 
                    type="range" min="5" max="40" step="1"
                    value={localSettings.maxRowsPerCol}
                    onChange={(e) => updateSetting('maxRowsPerCol', parseInt(e.target.value))}
                    className="accent-red-600"
                  />
                  <div className="flex justify-between items-center font-black text-xl">
                    <span className="text-red-600">{localSettings.maxRowsPerCol}</span>
                    <span className="text-slate-400 text-xs">FILAS</span>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Tamaño Tipografía (PX)</p>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase">Nombre</span>
                    <div className="flex items-center gap-3">
                      <input type="number" value={localSettings.nameFontSize} onChange={(e) => updateSetting('nameFontSize', parseInt(e.target.value))} className="w-16 bg-slate-200 dark:bg-slate-900 border-none rounded-lg p-2 text-xs font-black" />
                      <div className="h-1 bg-slate-200 dark:bg-slate-800 flex-1 rounded-full"><div className="h-full bg-red-600 rounded-full" style={{ width: `${(localSettings.nameFontSize/32)*100}%` }} /></div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase">Código</span>
                    <div className="flex items-center gap-3">
                      <input type="number" value={localSettings.codeFontSize} onChange={(e) => updateSetting('codeFontSize', parseInt(e.target.value))} className="w-16 bg-slate-200 dark:bg-slate-900 border-none rounded-lg p-2 text-xs font-black" />
                      <div className="h-1 bg-slate-200 dark:bg-slate-800 flex-1 rounded-full"><div className="h-full bg-red-600 rounded-full" style={{ width: `${(localSettings.codeFontSize/32)*100}%` }} /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.4em] flex items-center gap-2">
              <Globe size={16} className="text-red-600" /> Conexión HTTP (Make)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-500">Endpoint URL</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-[10px] text-red-600 truncate font-bold border border-slate-200 dark:border-slate-700">
                    {webhookUrl}
                  </code>
                  <button onClick={() => copyToClipboard(webhookUrl)} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all active:scale-90">
                    <Clipboard size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-500">Authorization Header</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-[10px] text-slate-600 dark:text-slate-400 truncate font-bold border border-slate-200 dark:border-slate-700">
                    Bearer {authToken}
                  </code>
                  <button onClick={() => copyToClipboard(`Bearer ${authToken}`)} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all active:scale-90">
                    <Clipboard size={16} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="p-10 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex-none">
          <button 
            onClick={onClose} 
            className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl font-black uppercase tracking-[0.3em] text-sm shadow-2xl hover:scale-[1.01] transition-all"
          >
            Cerrar Configuración
          </button>
        </div>
      </div>
    </div>
  );
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
      const prodCode = String(z.codigo_agente || 'N/A').trim();
      
      let qty = Array.isArray(z.productos) ? z.productos.reduce((acc: number, p: any) => acc + (Number(p.cantidad) || 0), 0) : Number(z.cantidad) || 0;
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

// --- COMPONENTES UI DASHBOARD ---

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
        <div className="flex items-center gap-4 text-slate-900 dark:text-white">
          <BarChart3 className="text-red-600" size={32} />
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Análisis Estadístico</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2 font-bold">Histórico de Producción y Crecimiento</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 border border-white/10 p-8 rounded-[2rem] flex flex-col justify-between group hover:border-red-600/30 transition-all">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Crecimiento Promedio</span>
          <div className="flex items-center justify-between">
            <span className="text-6xl font-black text-green-500">+18.4%</span>
            <TrendingUp size={48} className="text-green-500/10 group-hover:scale-110 transition-transform" />
          </div>
        </div>
        <div className="bg-slate-900/50 border border-white/10 p-8 rounded-[2rem] flex flex-col justify-between group hover:border-red-600/30 transition-all">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Volumen Histórico</span>
          <div className="flex items-center justify-between">
            <span className="text-6xl font-black text-white">{chartData.reduce((a, b) => a + b.total, 0).toLocaleString()}</span>
            <Database size={48} className="text-white/10" />
          </div>
        </div>
        <div className="bg-slate-900/50 border border-white/10 p-8 rounded-[2rem] flex flex-col justify-between group hover:border-red-600/30 transition-all">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Eficiencia Global</span>
          <div className="flex items-center justify-between">
            <span className="text-6xl font-black text-red-600">94%</span>
            <ArrowUpRight size={48} className="text-red-600/10" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[400px]">
        <div className="bg-slate-900/80 border border-white/10 p-8 rounded-[3rem] flex flex-col shadow-2xl">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-8 text-slate-500">Histórico de Carga</h3>
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
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-8 text-slate-500">Reparto de Producción</h3>
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
              <button onClick={() => setView('live')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black transition-all ${view === 'live' ? 'bg-red-600 text-white shadow-xl' : 'hover:bg-white/5 text-slate-500'}`}>
                <LayoutDashboard size={14} /> PEDIDOS
              </button>
              <button onClick={() => setView('stats')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black transition-all ${view === 'stats' ? 'bg-red-600 text-white shadow-xl' : 'hover:bg-white/5 text-slate-500'}`}>
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
        {/* Status Bar */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 px-6 py-2 bg-white/5 dark:bg-slate-900/80 backdrop-blur-md rounded-full border border-white/10 shadow-xl opacity-0 hover:opacity-100 transition-opacity duration-300">
           <div className="flex items-center gap-2">
             <Server size={10} className={rawData.length > 0 ? "text-green-500" : "text-amber-500"} />
             <span className="text-[9px] font-black uppercase text-slate-400">Stream Status: {rawData.length > 0 ? 'ACTIVE' : 'IDLE'}</span>
           </div>
           {lastSync && (
             <div className="flex items-center gap-2 border-l border-white/10 pl-4">
               <Clock size={10} className="text-blue-500" />
               <span className="text-[9px] font-bold text-slate-400">{lastSync.toLocaleTimeString()}</span>
             </div>
           )}
        </div>

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
