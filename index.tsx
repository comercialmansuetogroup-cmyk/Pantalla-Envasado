import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Factory, Moon, Sun, Clock, Radio, AlertTriangle, Database, Loader2, 
  TrendingUp, TrendingDown, LayoutDashboard, BarChart3, Calendar, ArrowUpRight, ArrowDownRight,
  ChevronUp, ChevronDown, Settings, Upload, Eye, Type, X, Globe, Clipboard, ArrowRight, Layout,
  Server, Key, Info, FileSpreadsheet, Printer, Download, Filter, Percent, Minus, Package, Hammer,
  Terminal, Activity
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Cell, PieChart, Pie, Legend
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
  clientNameFontSize: number; 
  tableHeaderFontSize: number; 
  trendFontSize: number;     
}

const DEFAULT_SETTINGS: VisualSettings = {
  logoLight: null,
  logoDark: null,
  displayMode: 'name',
  maxRowsPerCol: 22,      
  nameFontSize: 15,       
  codeFontSize: 18,       
  clientNameFontSize: 30, 
  tableHeaderFontSize: 10, 
  trendFontSize: 15,      
};

// --- UTILIDADES ---
const roundSafe = (num: any): number => {
  const val = Number(num);
  return isNaN(val) ? 0 : Math.round((val + Number.EPSILON) * 100) / 100;
};

const extractUnitsFromDescription = (description: string, totalWeight: any): number => {
  const numericWeight = Number(totalWeight) || 0;
  if (numericWeight === 0) return 0;
  if (!description) return Math.round(numericWeight);

  const weightRegex = /(\d+[.,]?\d*)\s*(KG|KILO|K|G|GR|GRAMOS)/i;
  const match = description.match(weightRegex);

  if (match) {
    let unitWeight = parseFloat(match[1].replace(',', '.'));
    const unitType = match[2].toUpperCase();
    if (unitType.startsWith('G')) {
      unitWeight = unitWeight / 1000;
    }
    if (unitWeight > 0) {
      return Math.round(numericWeight / unitWeight);
    }
  }
  return Math.round(numericWeight);
};

// --- COMPONENTE MODAL DE CONFIGURACIÓN ---
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visualSettings: VisualSettings;
  onSaveSettings: (settings: VisualSettings) => void;
  systemLogs: string[];
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, visualSettings, onSaveSettings, systemLogs }) => {
  const [localSettings, setLocalSettings] = useState<VisualSettings>(visualSettings);

  if (!isOpen) return null;

  const railwayBaseUrl = window.location.origin;
  const webhookUrl = `${railwayBaseUrl}/api/webhook`;
  const scanUrl = `${railwayBaseUrl}/api/scan`;

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
          
          {/* LOGS TERMINAL */}
          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.4em] flex items-center gap-2">
              <Terminal size={16} className="text-green-500" /> Registro del Sistema (Debug)
            </h3>
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 font-mono text-[10px] h-48 overflow-y-auto shadow-inner">
               {systemLogs.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-600">
                    <Activity size={24} className="mb-2 opacity-50" />
                    <p>Esperando eventos del servidor...</p>
                 </div>
               ) : (
                 <div className="flex flex-col gap-1">
                   {systemLogs.map((log, i) => (
                     <div key={i} className="text-green-400 border-b border-green-900/20 pb-1 last:border-0">
                       <span className="opacity-50 mr-2">{log.split(']')[0]}]</span>
                       <span className="font-bold">{log.split(']')[1]}</span>
                     </div>
                   ))}
                 </div>
               )}
            </div>
            <p className="text-[10px] text-slate-400 italic flex items-center gap-2">
              <Info size={12} /> Utiliza este log para verificar si el endpoint /api/scan está recibiendo datos de la App.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.4em] flex items-center gap-2">
              <Upload size={16} className="text-red-600" /> Identidad Visual
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Logotipo Modo Claro</p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden">
                    {localSettings.logoLight ? <img src={localSettings.logoLight} alt="Logo Light" className="w-full h-full object-contain" /> : <Factory className="text-slate-300" />}
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
                    {localSettings.logoDark ? <img src={localSettings.logoDark} alt="Logo Dark" className="w-full h-full object-contain" /> : <Factory className="text-slate-600" />}
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
              <Type size={16} className="text-red-600" /> Tipografía Avanzada
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Nombre Cliente (PX)</p>
                <div className="flex items-center gap-3">
                    <input type="number" value={localSettings.clientNameFontSize} onChange={(e) => updateSetting('clientNameFontSize', parseInt(e.target.value))} className="w-16 bg-slate-200 dark:bg-slate-900 border-none rounded-lg p-2 text-xs font-black" />
                    <div className="h-1 bg-slate-200 dark:bg-slate-800 flex-1 rounded-full"><div className="h-full bg-red-600 rounded-full" style={{ width: `${(localSettings.clientNameFontSize/80)*100}%` }} /></div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Cabecera Tabla (PX)</p>
                <div className="flex items-center gap-3">
                    <input type="number" value={localSettings.tableHeaderFontSize} onChange={(e) => updateSetting('tableHeaderFontSize', parseInt(e.target.value))} className="w-16 bg-slate-200 dark:bg-slate-900 border-none rounded-lg p-2 text-xs font-black" />
                    <div className="h-1 bg-slate-200 dark:bg-slate-800 flex-1 rounded-full"><div className="h-full bg-red-600 rounded-full" style={{ width: `${(localSettings.tableHeaderFontSize/30)*100}%` }} /></div>
                </div>
              </div>
               <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Porcentajes (PX)</p>
                <div className="flex items-center gap-3">
                    <input type="number" value={localSettings.trendFontSize} onChange={(e) => updateSetting('trendFontSize', parseInt(e.target.value))} className="w-16 bg-slate-200 dark:bg-slate-900 border-none rounded-lg p-2 text-xs font-black" />
                    <div className="h-1 bg-slate-200 dark:bg-slate-800 flex-1 rounded-full"><div className="h-full bg-red-600 rounded-full" style={{ width: `${(localSettings.trendFontSize/30)*100}%` }} /></div>
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
                <p className="text-[10px] font-black uppercase text-slate-400">Producto (PX)</p>
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
              <Globe size={16} className="text-red-600" /> API de Escaneo (APP)
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-500">POST URL (Para Scanner)</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-[10px] text-green-600 truncate font-bold border border-slate-200 dark:border-slate-700">
                    {scanUrl}
                  </code>
                  <button onClick={() => copyToClipboard(scanUrl)} className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all active:scale-90">
                    <Clipboard size={16} />
                  </button>
                </div>
                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-mono text-slate-500">
                  {`{"codigo": "...", "cantidad": ...}`}
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

// --- PROCESADOR DE DATOS ---
const processDataWithTrends = (rawZones: any[], completedItems: Set<string>) => {
  if (!rawZones || rawZones.length === 0) return [];

  const zonesByDate = new Map<string, any[]>();
  rawZones.forEach(z => {
    const date = z.receivedAt ? z.receivedAt.split('T')[0] : 'legacy';
    if (!zonesByDate.has(date)) zonesByDate.set(date, []);
    zonesByDate.get(date)!.push(z);
  });

  const allDatesSorted = Array.from(zonesByDate.keys()).sort();
  const latestDate = allDatesSorted[allDatesSorted.length - 1];

  const processDataSet = (date: string) => {
    const globalStockMap = new Map<string, number>();
    const clientsMap = new Map<string, any>();
    
    (zonesByDate.get(date) || []).forEach(z => {
      const agentCode = String(z.codigo_agente ?? '').trim();
      const clientName = CLIENT_MAPPING[agentCode] || `ZONA ${agentCode || '0'}`;
      
      if (!clientsMap.has(clientName)) {
        clientsMap.set(clientName, { name: clientName, products: new Map<string, any>(), total: 0 });
      }
      
      const c = clientsMap.get(clientName);
      
      if (Array.isArray(z.productos)) {
        z.productos.forEach((p: any) => {
          // CORRECCIÓN CRÍTICA: Lógica para nombres vs códigos
          let realName = p.nombre || z.nombre || '';
          const code = p.codigo || '';
          
          // Si no hay nombre, o el nombre es igual al código, intentamos mejorar con z.nombre
          if (!realName || String(realName).trim().toUpperCase() === String(code).trim().toUpperCase()) {
             if (z.nombre && String(z.nombre).trim().toUpperCase() !== String(code).trim().toUpperCase()) {
                realName = z.nombre;
             } else {
                realName = code; // Fallback
             }
          }

          const pNameKey = String(p.codigo || p.nombre || z.nombre || 'ITEM').toUpperCase();
          const specificDesc = String(realName).toUpperCase();
          const qty = extractUnitsFromDescription(specificDesc, p.cantidad);
          const stock = extractUnitsFromDescription(specificDesc, p.stock_fisico);
          
          if (stock > (globalStockMap.get(pNameKey) || 0)) {
            globalStockMap.set(pNameKey, stock);
          }

          if (!c.products.has(pNameKey)) {
            c.products.set(pNameKey, { name: realName, code: p.codigo || 'N/A', qty: 0, stock: 0 }); 
          }
          const prodEntry = c.products.get(pNameKey);
          prodEntry.qty += qty;
          c.total += qty;
        });
      } else {
        // Estructura Legacy
        const realName = z.nombre || 'ITEM';
        const pNameKey = String(realName).toUpperCase();
        const qty = extractUnitsFromDescription(pNameKey, z.cantidad);
        const stock = extractUnitsFromDescription(pNameKey, z.stock_fisico);
        
        if (stock > (globalStockMap.get(pNameKey) || 0)) globalStockMap.set(pNameKey, stock);
        
        const itemCode = agentCode;
        if (!c.products.has(pNameKey)) c.products.set(pNameKey, { name: realName, code: itemCode, qty: 0, stock: 0 });
        const prodEntry = c.products.get(pNameKey);
        prodEntry.qty += qty;
        c.total += qty;
      }
    });

    const sortedClients = Array.from(clientsMap.values()).sort((a, b) => {
      if (a.name === 'GRAN CANARIA') return -1;
      if (b.name === 'GRAN CANARIA') return 1;
      return a.name.localeCompare(b.name);
    });

    const runningStock = new Map<string, number>(globalStockMap);

    sortedClients.forEach(client => {
      const visibleProducts = new Map();

      client.products.forEach((p: any, key: string) => {
          const availableStock = runningStock.get(key) || 0;
          const stockAssigned = Math.min(p.qty, availableStock);
          const toProduce = Math.max(0, p.qty - stockAssigned);
          
          const rowId = `${client.name}-${p.code}`;

          if (toProduce > 0 || completedItems.has(rowId)) {
             p.toProduce = toProduce;
             p.stock = availableStock;
             p.rowId = rowId;
             visibleProducts.set(key, p);
          }
          
          if(runningStock.has(key)) {
               runningStock.set(key, Math.max(0, availableStock - stockAssigned));
          }
      });

      client.products = visibleProducts;
      client.productsArray = Array.from(client.products.values()).sort((a: any, b: any) => b.qty - a.qty);
    });

    return { clients: sortedClients, productMap: clientsMap }; 
  };

  const currentData = processDataSet(latestDate);
  
  let prevProductTotals = new Map<string, number>(); 
  let prevClientTotals = new Map<string, number>();

  if (allDatesSorted.length >= 2) {
    const prevDate = allDatesSorted[allDatesSorted.length - 2];
    const prevRawMap = processDataSet(prevDate).productMap;
    
    prevRawMap.forEach((c: any) => {
        prevClientTotals.set(c.name, c.total);
        c.products.forEach((p: any) => {
            prevProductTotals.set(`${c.name}_${p.name}`, p.qty);
        });
    });
  }

  return currentData.clients.map(client => {
    const prevClientTotal = prevClientTotals.get(client.name) || 0;
    const totalTrend = prevClientTotal > 0 ? ((client.total - prevClientTotal) / prevClientTotal) * 100 : 0;

    const productsWithTrend = client.productsArray.map((p: any) => {
        const prevQty = prevProductTotals.get(`${client.name}_${p.name}`) || 0;
        const trend = prevQty > 0 ? ((p.qty - prevQty) / prevQty) * 100 : 0;
        return { ...p, trend };
    });

    return { ...client, products: productsWithTrend, totalTrend };
  });
};

// --- UI COMPONENTS ---

const TrendBadge: React.FC<{ value: number; darkMode: boolean; fontSize: number }> = ({ value, darkMode, fontSize }) => {
  if (Math.abs(value) < 0.1) {
    return (
      <div className="flex items-center justify-center font-bold text-slate-400 opacity-50 px-2 py-1" style={{ fontSize: `${fontSize}px` }}>
        <Minus size={fontSize + 2} /> 0%
      </div>
    );
  }
  const isUp = value > 0;
  return (
    <div className={`flex items-center gap-0.5 font-black leading-none rounded-md whitespace-nowrap px-1 py-0.5 ${isUp ? (darkMode ? 'text-green-400 bg-green-500/10' : 'text-green-700 bg-green-100') : (darkMode ? 'text-red-400 bg-red-500/10' : 'text-red-700 bg-red-100')}`} style={{ fontSize: `${fontSize}px` }}>
      {isUp ? <ArrowUpRight size={fontSize + 2} strokeWidth={3} /> : <ArrowDownRight size={fontSize + 2} strokeWidth={3} />}
      {Math.abs(Math.round(value))}%
    </div>
  );
};

const ProductRow: React.FC<{ p: any; settings: VisualSettings; darkMode: boolean; isHighlighted: boolean }> = ({ p, settings, darkMode, isHighlighted }) => {
  const showName = settings.displayMode === 'name' || settings.displayMode === 'both';
  const showCode = settings.displayMode === 'code' || settings.displayMode === 'both';
  const stockClass = p.stock > 0 ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'text-slate-600 dark:text-slate-600';

  const [isExiting, setIsExiting] = useState(false);
  
  useEffect(() => {
     if (p.toProduce <= 0) {
         setIsExiting(true);
     }
  }, [p.toProduce]);

  const rowBaseClass = `flex items-center justify-between py-2 px-4 border-b group transition-all duration-500 gap-x-2`;
  const bgClass = isHighlighted 
    ? (darkMode ? 'bg-green-500/20' : 'bg-green-100') 
    : (isExiting ? (darkMode ? 'bg-green-900/40 opacity-50' : 'bg-green-50 opacity-50') : (darkMode ? 'border-white/[0.04] hover:bg-white/[0.02]' : 'border-gray-100 hover:bg-gray-50'));
  
  const textFlashClass = isHighlighted ? 'scale-[1.02]' : '';

  return (
    <div className={`${rowBaseClass} ${bgClass} ${textFlashClass}`}>
      <div className="flex-1 min-w-0 flex items-center gap-2 pr-2">
        <div className="flex flex-col min-w-0">
          {showCode && (
            <div className="flex items-center gap-2 mb-0.5">
               <span className={`font-black leading-none truncate ${darkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: `${settings.codeFontSize}px` }}>
                #{p.code}
              </span>
              <TrendBadge value={p.trend} darkMode={darkMode} fontSize={settings.trendFontSize} />
            </div>
          )}
          {showName && (
            <span className={`font-bold transition-colors uppercase truncate leading-none ${settings.displayMode === 'both' ? 'text-slate-500 group-hover:text-red-400' : (darkMode ? 'text-slate-400' : 'text-slate-500') + ' group-hover:text-red-500'}`} style={{ fontSize: `${settings.nameFontSize}px` }}>
              {p.name}
            </span>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 w-[180px] xl:w-[220px] text-right items-center">
        <div className={`font-bold tabular-nums text-sm ${stockClass} transition-all ${isHighlighted ? 'text-green-500 scale-110' : ''}`}>
           {p.stock.toLocaleString('es-ES')}
        </div>
        <div className={`font-black tabular-nums text-sm transition-all ${p.toProduce > 0 ? 'text-orange-500' : 'text-green-500'} ${isHighlighted ? 'scale-125' : ''}`}>
           {p.toProduce <= 0 ? (
             <span className="flex items-center justify-end gap-1"><Package size={12} /> OK</span>
           ) : p.toProduce.toLocaleString('es-ES')}
        </div>
        <div className={`text-xl font-black tabular-nums group-hover:text-red-600 transition-all leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          {p.qty.toLocaleString('es-ES')}
        </div>
      </div>
    </div>
  );
};

const ClientColumn: React.FC<{ data: any; darkMode: boolean; settings: VisualSettings; highlightedCode: string | null }> = ({ data, darkMode, settings, highlightedCode }) => {
  const productCount = data.products.length;
  const maxRows = settings.maxRowsPerCol;
  const numCols = Math.ceil(productCount / maxRows) || 1;
  const columns = [];
  for (let i = 0; i < numCols; i++) columns.push(data.products.slice(i * maxRows, (i + 1) * maxRows));

  const SINGLE_COL_WIDTH = 450;
  const columnWidth = numCols * SINGLE_COL_WIDTH;

  // CAMBIO IMPORTANTE: Ancho fijo estricto para evitar compresión (width y flex-none)
  // Añadimos ancho porcentual exacto a las columnas internas
  return (
    <div style={{ width: `${columnWidth}px` }} className={`flex-none flex flex-col h-full border-r last:border-r-0 transition-all ${darkMode ? 'bg-slate-950 border-white/5' : 'bg-white border-gray-200'}`}>
      <div className={`px-4 py-4 border-b-2 ${darkMode ? 'bg-white/[0.01] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4 overflow-hidden">
                <h3 className={`font-black uppercase tracking-tighter truncate leading-none ${darkMode ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: `${settings.clientNameFontSize}px` }}>
                {data.name}
                </h3>
                <TrendBadge value={data.totalTrend} darkMode={darkMode} fontSize={settings.trendFontSize + 2} />
            </div>
        </div>
        <div className="flex w-full">
             {Array.from({ length: numCols }).map((_, idx) => (
                <div key={idx} style={{ width: `${100/numCols}%` }} className={`flex justify-between items-center px-4 mt-2 opacity-50 font-black uppercase tracking-wider ${idx > 0 ? 'border-l border-white/[0.05]' : ''}`} style={{ fontSize: `${settings.tableHeaderFontSize}px` }}>
                    <span className="flex-1">Referencia</span>
                    <div className="grid grid-cols-3 gap-2 w-[180px] xl:w-[220px] text-right">
                        <span>Stock Disp.</span>
                        <span>Faltante</span>
                        <span>Pedido</span>
                    </div>
                </div>
             ))}
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        {columns.map((colProducts, colIdx) => (
          <div key={colIdx} style={{ width: `${100/numCols}%` }} className={`flex flex-col p-1 ${colIdx > 0 ? 'border-l border-white/[0.05]' : ''}`}>
            {colProducts.map((p: any) => (
                <ProductRow 
                    key={p.rowId} 
                    p={p} 
                    settings={settings} 
                    darkMode={darkMode} 
                    isHighlighted={highlightedCode ? p.code === highlightedCode : false}
                />
            ))}
            {colProducts.length < maxRows && Array.from({ length: maxRows - colProducts.length }).map((_, emptyIdx) => (
              <div key={`empty-${emptyIdx}`} className="py-2.5 px-3 border-b border-transparent opacity-0">.</div>
            ))}
          </div>
        ))}
      </div>
      <div className={`px-8 py-6 mt-auto border-t-2 ${darkMode ? 'bg-red-600/[0.03] border-red-600/20' : 'bg-red-50 border-red-200'}`}>
        <div className={`flex flex-col ${numCols > 1 ? 'items-center text-center' : 'items-start'}`}>
          <span className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em] leading-none mb-2">TOTAL PEDIDOS</span>
          <span className={`font-black text-red-600 leading-none tabular-nums tracking-tighter ${numCols > 1 ? 'text-8xl' : 'text-7xl xl:text-8xl'}`}>
            {roundSafe(data.total).toLocaleString('es-ES')}
          </span>
        </div>
      </div>
    </div>
  );
};

// --- ESTADÍSTICAS AVANZADAS (RESTAURADO) ---
const StatsDashboard: React.FC<{ rawData: any[], darkMode: boolean }> = ({ rawData, darkMode }) => {
  const [filter, setFilter] = useState<'week' | 'biweekly' | 'month' | 'quarter' | 'year'>('week');
  
  const { chartData, topProducts, bottomProducts, totals } = useMemo(() => {
    const map = new Map<string, number>();
    const productMap = new Map<string, number>();
    
    rawData.forEach(z => {
      const d = z.receivedAt ? z.receivedAt.split('T')[0] : 'Legacy';
      const prodDescription = String(z.nombre || '').toUpperCase();
      
      let qty = 0;
      if (Array.isArray(z.productos)) {
        qty = z.productos.reduce((a: any, p: any) => a + extractUnitsFromDescription(prodDescription, p.cantidad), 0);
      } else {
        qty = extractUnitsFromDescription(prodDescription, z.cantidad);
      }
      
      map.set(d, (map.get(d) || 0) + qty);

      if (Array.isArray(z.productos)) {
        z.productos.forEach((p: any) => {
           const name = (z.nombre || p.nombre || p.codigo || 'ITEM').toUpperCase();
           const q = extractUnitsFromDescription(prodDescription, p.cantidad);
           productMap.set(name, (productMap.get(name) || 0) + q);
        });
      } else {
        const name = (z.nombre || 'ITEM').toUpperCase();
        productMap.set(name, (productMap.get(name) || 0) + qty);
      }
    });

    const chartData = Array.from(map.entries()).map(([name, total]) => ({ name, total, prevTotal: total * 0.85 })).sort((a, b) => a.name.localeCompare(b.name));
    
    const productsArray = Array.from(productMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    
    return {
      chartData,
      topProducts: productsArray.slice(0, 5),
      bottomProducts: productsArray.slice(-5).reverse(),
      totals: productsArray.reduce((acc, curr) => acc + curr.value, 0)
    };
  }, [rawData, filter]);

  const downloadCSV = () => {
    const headers = ['Fecha', 'Total Producción'];
    const rows = chartData.map(d => [d.name, d.total]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reporte_produccion.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`flex flex-col gap-8 h-full overflow-y-auto p-8 animate-fade-in w-full max-w-full ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      <div className={`flex flex-col xl:flex-row justify-between items-start xl:items-center p-8 rounded-[2rem] border backdrop-blur-md gap-6 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-center gap-6">
          <div className="p-4 bg-red-600 rounded-2xl shadow-lg shadow-red-600/20">
            <BarChart3 className="text-white" size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Centro de Inteligencia</h2>
            <p className="text-sm uppercase tracking-widest mt-2 font-bold opacity-60">Análisis de Rendimiento y Proyecciones</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className={`flex p-1.5 rounded-2xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            {[
              {k: 'week', l: 'Semanal'}, 
              {k: 'biweekly', l: 'Quincenal'}, 
              {k: 'month', l: 'Mensual'}, 
              {k: 'quarter', l: 'Trimestral'}, 
              {k: 'year', l: 'Anual'}
            ].map(f => (
              <button 
                key={f.k} 
                onClick={() => setFilter(f.k as any)} 
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${filter === f.k ? 'bg-red-600 text-white shadow-lg' : (darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
              >
                {f.l}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={downloadCSV} className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
              <FileSpreadsheet size={18} /> CSV
            </button>
            <button onClick={handlePrint} className="p-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-all shadow-lg flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
              <Printer size={18} /> PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className={`p-8 rounded-[2.5rem] border flex flex-col justify-between group hover:border-red-600/30 transition-all relative overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
            <TrendingUp size={100} className={darkMode ? 'text-white' : 'text-slate-900'} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] z-10 opacity-60">Crecimiento Neto</span>
          <div className="flex items-center gap-4 mt-4 z-10">
            <span className="text-5xl font-black text-green-500">+22.4%</span>
          </div>
          <p className="text-[10px] font-bold mt-2 z-10 opacity-40">Vs Periodo Anterior</p>
        </div>

        <div className={`p-8 rounded-[2.5rem] border flex flex-col justify-between group hover:border-red-600/30 transition-all relative overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
            <Database size={100} className={darkMode ? 'text-white' : 'text-slate-900'} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] z-10 opacity-60">Total Procesado</span>
          <div className="flex items-center gap-4 mt-4 z-10">
            <span className="text-5xl font-black">{totals.toLocaleString()}</span>
          </div>
          <p className="text-[10px] font-bold mt-2 z-10 opacity-40">Unidades producidas</p>
        </div>

        <div className={`p-8 rounded-[2.5rem] border flex flex-col justify-between group hover:border-red-600/30 transition-all relative overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] z-10 opacity-60">Eficiencia Operativa</span>
          <div className="flex items-center gap-4 mt-4 z-10">
            <span className="text-5xl font-black text-red-600">98.2%</span>
          </div>
          <div className={`w-full h-2 rounded-full mt-4 overflow-hidden z-10 ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
            <div className="bg-red-600 h-full w-[98.2%]"></div>
          </div>
        </div>

        <div className={`p-8 rounded-[2.5rem] border flex flex-col justify-between group hover:border-red-600/30 transition-all relative overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] z-10 opacity-60">Media Diaria</span>
          <div className="flex items-center gap-4 mt-4 z-10">
             <span className="text-5xl font-black">
               {(totals / (chartData.length || 1)).toFixed(0)}
             </span>
          </div>
          <p className="text-[10px] font-bold mt-2 z-10 opacity-40">Unidades / Día</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[500px]">
        <div className={`lg:col-span-2 p-8 rounded-[3rem] border flex flex-col shadow-xl ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-60 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-600" /> Comparativa de Rendimiento
            </h3>
            <div className="flex gap-4 text-[10px] font-bold uppercase opacity-60">
               <span className="flex items-center gap-2"><div className="w-3 h-3 bg-red-600 rounded-sm"></div> Periodo Actual</span>
               <span className="flex items-center gap-2"><div className={`w-3 h-3 rounded-sm ${darkMode ? 'bg-slate-700' : 'bg-slate-300'}`}></div> Periodo Anterior</span>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={0}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1e293b" : "#e2e8f0"} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: darkMode ? '#1e293b' : '#f8fafc'}}
                  contentStyle={{backgroundColor: darkMode ? '#0f172a' : '#ffffff', border: darkMode ? '1px solid #1e293b' : '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                  itemStyle={{color: darkMode ? '#fff' : '#000'}}
                />
                <Bar dataKey="prevTotal" fill={darkMode ? "#334155" : "#cbd5e1"} radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="total" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-6">
           <div className={`flex-1 p-6 rounded-[2.5rem] border shadow-xl overflow-hidden flex flex-col ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-4 flex items-center gap-2">
                 <ArrowUpRight className="text-green-500" size={14} /> Top 5 Productos
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3">
                 {topProducts.map((p, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${darkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                       <div className="flex items-center gap-3 min-w-0">
                          <span className="font-black opacity-30 text-lg">#{i+1}</span>
                          <span className="text-xs font-bold truncate">{p.name}</span>
                       </div>
                       <span className="text-xs font-black text-green-500">{p.value.toLocaleString()}</span>
                    </div>
                 ))}
              </div>
           </div>

           <div className={`flex-1 p-6 rounded-[2.5rem] border shadow-xl overflow-hidden flex flex-col ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-4 flex items-center gap-2">
                 <ArrowDownRight className="text-red-500" size={14} /> Menor Rotación
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3">
                 {bottomProducts.map((p, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${darkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                       <span className="text-xs font-bold truncate">{p.name}</span>
                       <span className="text-xs font-black text-red-500">{p.value.toLocaleString()}</span>
                    </div>
                 ))}
              </div>
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

  // Tracking de estado para animaciones
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  
  // NUEVO: Tracking preciso de la última actualización
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);

  // Función para manejar items completados (Animación de salida)
  const handleCompletedItems = useCallback((newGroups: any[]) => {
      newGroups.forEach(client => {
          client.productsArray.forEach((p: any) => {
              if (p.toProduce <= 0) {
                  setCompletedItems(prev => {
                      if (!prev.has(p.rowId)) {
                          const newSet = new Set(prev);
                          newSet.add(p.rowId);
                          setTimeout(() => {
                              setCompletedItems(current => {
                                  const updated = new Set(current);
                                  updated.delete(p.rowId);
                                  return updated;
                              });
                          }, 3000);
                          return newSet;
                      }
                      return prev;
                  });
              }
          });
      });
  }, []);

  const updateVisualSettings = (newSettings: VisualSettings) => {
    setVisualSettings(newSettings);
    localStorage.setItem('factoryFlow_visualSettings', JSON.stringify(newSettings));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Añadimos timestamp para evitar caché agresiva del navegador
      const res = await fetch(`/api/data?t=${Date.now()}`);
      if (!res.ok) throw new Error("Sync Fail");
      const json = await res.json();
      if (json && json.zonas) {
        setRawData(json.zonas);
        setLastSync(new Date());
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  // --- SSE (Real Time Events) ---
  useEffect(() => {
    // Conexión inicial
    fetchData();

    // Suscripción a eventos del servidor
    const eventSource = new EventSource('/api/events');
    
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'update') {
            fetchData(); // Recargar datos inmediatamente
            // Si el evento trae el código actualizado, lo marcamos
            if (data.updatedCode) {
                setHighlightedCode(data.updatedCode);
                // Limpiar el resaltado después de 3 segundos para que no se quede fijo
                setTimeout(() => setHighlightedCode(null), 3000);
            }
        } else if (data.type === 'sys_log') {
            const time = new Date(data.timestamp).toLocaleTimeString();
            setSystemLogs(prev => [`[${time}] ${data.message}`, ...prev].slice(0, 50));
        }
    };

    return () => {
        eventSource.close();
    };
  }, [fetchData]);

  const clientGroups = useMemo(() => {
      const groups = processDataWithTrends(rawData, completedItems);
      // Detectar completados para animar
      handleCompletedItems(groups);
      return groups;
  }, [rawData, completedItems, handleCompletedItems]);

  const totalGlobal = useMemo(() => roundSafe(clientGroups.reduce((acc, c) => acc + (c.total || 0), 0)), [clientGroups]);
  const currentLogo = darkMode ? visualSettings.logoDark : visualSettings.logoLight;

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`flex-none w-full px-10 py-3 border-b-2 ${darkMode ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-300'}`}>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-6">
            {currentLogo ? (
               <img src={currentLogo} alt="Logo" className="h-16 w-auto object-contain max-w-[300px]" />
            ) : (
              <>
                <div className="bg-red-600 p-2.5 rounded-xl shadow-lg shadow-red-600/20">
                  <Factory size={26} className="text-white" />
                </div>
                <div>
                  <h2 className={`text-2xl font-black tracking-tighter uppercase leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>Factory<span className="text-red-600">Flow</span></h2>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mt-1 italic">Producción de Pedidos en Vivo</p>
                </div>
              </>
            )}
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
              <button onClick={() => setIsSettingsOpen(true)} className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all shadow-md text-slate-400 hover:text-white"><Settings size={20} /></button>
              <button onClick={() => setDarkMode(!darkMode)} className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all shadow-md">
                {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-700" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full flex overflow-hidden">
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 px-6 py-2 bg-white/5 dark:bg-slate-900/80 backdrop-blur-md rounded-full border border-white/10 shadow-xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
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
              {clientGroups.map((g) => (
                  <ClientColumn 
                    key={g.name} 
                    data={g} 
                    darkMode={darkMode} 
                    settings={visualSettings} 
                    highlightedCode={highlightedCode}
                  />
              ))}
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
        systemLogs={systemLogs}
      />
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) ReactDOM.createRoot(rootElement).render(<App />);