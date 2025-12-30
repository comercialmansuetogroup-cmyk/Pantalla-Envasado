import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Factory, Moon, Sun, Clock, Radio, AlertTriangle, Database, Loader2, 
  TrendingUp, TrendingDown, LayoutDashboard, BarChart3, Calendar, ArrowUpRight, ArrowDownRight,
  ChevronUp, ChevronDown, Settings, Upload, Eye, Type, X, Globe, Clipboard, ArrowRight, Layout,
  Server, Key, Info, FileSpreadsheet, Printer, Download, Filter, Percent, Minus, Package, Hammer
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
  // Tipografías
  nameFontSize: number;      // Producto Nombre
  codeFontSize: number;      // Producto Código
  clientNameFontSize: number; // Cliente Título
  tableHeaderFontSize: number; // Cabeceras Referencia/Stock
  trendFontSize: number;     // Porcentajes
}

const DEFAULT_SETTINGS: VisualSettings = {
  logoLight: null,
  logoDark: null,
  displayMode: 'name',
  maxRowsPerCol: 22,      // Ajustado a 22 según captura
  nameFontSize: 15,       // Ajustado a 15 según captura
  codeFontSize: 18,       // Mantenido en 18 según captura
  clientNameFontSize: 30, // Ajustado a 30 según captura
  tableHeaderFontSize: 10, // Ajustado a 10 según captura
  trendFontSize: 15,      // Ajustado a 15 según captura
};

// --- UTILIDADES ---
const roundSafe = (num: any): number => {
  const val = Number(num);
  return isNaN(val) ? 0 : Math.round((val + Number.EPSILON) * 100) / 100;
};

// Detecta patrones de peso en el nombre (ej: "1,35 KG") y convierte el total (kg) a unidades (enteros)
const extractUnitsFromDescription = (description: string, totalWeight: any): number => {
  const numericWeight = Number(totalWeight) || 0;
  if (numericWeight === 0) return 0;
  if (!description) return Math.round(numericWeight);

  // Regex para buscar patrones como: "1,35 KG", "1.5KG", "1 KG", "150 G", "500GR"
  // Grupo 1: El número (admite coma o punto). Grupo 2: La unidad.
  const weightRegex = /(\d+[.,]?\d*)\s*(KG|KILO|K|G|GR|GRAMOS)/i;
  const match = description.match(weightRegex);

  if (match) {
    let unitWeight = parseFloat(match[1].replace(',', '.'));
    const unitType = match[2].toUpperCase();

    // Si detectamos gramos (G, GR), convertimos a KG (dividiendo por 1000) asumiendo que el input total viene en KG
    // Ojo: Esto asume que 'totalWeight' siempre viene en KG si el producto es por peso.
    if (unitType.startsWith('G')) {
      unitWeight = unitWeight / 1000;
    }

    if (unitWeight > 0) {
      // Cálculo: Peso Total / Peso por Unidad = Unidades
      // Ejemplo: 2.42 kg / 1.35 kg/u = 1.79 -> Math.round -> 2 Unidades
      return Math.round(numericWeight / unitWeight);
    }
  }

  // Fallback: Si no hay patrón de peso, redondeamos el número tal cual (asumiendo que ya son unidades o kilos sin conversión)
  return Math.round(numericWeight);
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

// --- PROCESADOR DE TENDENCIAS Y STOCK (LÓGICA CASCADA) ---
const processDataWithTrends = (rawZones: any[]) => {
  if (!rawZones || rawZones.length === 0) return [];

  // 1. Agrupar datos por fecha (para tendencias) y obtener el set más reciente
  const zonesByDate = new Map<string, any[]>();
  rawZones.forEach(z => {
    const date = z.receivedAt ? z.receivedAt.split('T')[0] : 'legacy';
    if (!zonesByDate.has(date)) zonesByDate.set(date, []);
    zonesByDate.get(date)!.push(z);
  });

  const allDatesSorted = Array.from(zonesByDate.keys()).sort();
  const latestDate = allDatesSorted[allDatesSorted.length - 1];

  // Helper para procesar un set de datos (de una fecha específica)
  const processDataSet = (date: string) => {
    // A. Identificar Stock Global por Producto y DEMANDA GLOBAL
    const globalStockMap = new Map<string, number>();
    const globalDemandMap = new Map<string, number>();
    
    // B. Estructura temporal de Clientes
    const clientsMap = new Map<string, any>();
    
    // Primera pasada: Construir estructura base, encontrar stock global y calcular demanda global
    (zonesByDate.get(date) || []).forEach(z => {
      const clientName = CLIENT_MAPPING[z.codigo_agente] || `ZONA ${z.codigo_agente || '0'}`;
      if (!clientsMap.has(clientName)) {
        clientsMap.set(clientName, { name: clientName, products: new Map<string, any>(), total: 0 });
      }
      
      const c = clientsMap.get(clientName);
      const prodCode = String(z.codigo_agente || 'N/A').trim();
      
      // Usamos z.nombre para la extracción de unidades si está disponible, ya que suele contener la descripción completa
      const prodDescription = String(z.nombre || '').toUpperCase();

      // Procesar productos dentro de la zona
      if (Array.isArray(z.productos)) {
        z.productos.forEach((p: any) => {
          const pNameKey = (z.nombre || p.codigo || 'ITEM').toUpperCase(); 
          
          // CONVERSIÓN DE UNIDADES (Nuevo)
          // Usamos la descripción (z.nombre) para detectar si hay patrón de peso (ej: 1,35 KG) y convertimos la cantidad raw
          const qty = extractUnitsFromDescription(prodDescription, p.cantidad);
          const stock = extractUnitsFromDescription(prodDescription, p.stock_fisico);
          
          // Actualizar Stock Global si encontramos un valor mayor (fuente de verdad)
          if (stock > (globalStockMap.get(pNameKey) || 0)) {
            globalStockMap.set(pNameKey, stock);
          }

          // CALCULAR DEMANDA TOTAL GLOBAL DEL PRODUCTO
          globalDemandMap.set(pNameKey, (globalDemandMap.get(pNameKey) || 0) + qty);

          // Añadir pedido al cliente
          const itemCode = p.codigo || prodCode;
          if (!c.products.has(pNameKey)) {
            c.products.set(pNameKey, { name: pNameKey, code: itemCode, qty: 0, stock: 0 }); 
          }
          const prodEntry = c.products.get(pNameKey);
          prodEntry.qty += qty;
          c.total += qty;
        });
      } else {
        const pNameKey = String(z.nombre || 'ITEM').toUpperCase();
        
        // CONVERSIÓN DE UNIDADES (Nuevo)
        const qty = extractUnitsFromDescription(prodDescription, z.cantidad);
        const stock = extractUnitsFromDescription(prodDescription, z.stock_fisico);
        
        if (stock > (globalStockMap.get(pNameKey) || 0)) globalStockMap.set(pNameKey, stock);
        // CALCULAR DEMANDA TOTAL GLOBAL
        globalDemandMap.set(pNameKey, (globalDemandMap.get(pNameKey) || 0) + qty);
        
        const itemCode = prodCode;
        if (!c.products.has(pNameKey)) c.products.set(pNameKey, { name: pNameKey, code: itemCode, qty: 0, stock: 0 });
        const prodEntry = c.products.get(pNameKey);
        prodEntry.qty += qty;
        c.total += qty;
      }
    });

    // C. Convertir a Array y ORDENAR POR PRIORIDAD (Gran Canaria Primero)
    const sortedClients = Array.from(clientsMap.values()).sort((a, b) => {
      if (a.name === 'GRAN CANARIA') return -1;
      if (b.name === 'GRAN CANARIA') return 1;
      return a.name.localeCompare(b.name);
    });

    // D. Aplicar Lógica de Cascada (Waterfall)
    const runningStock = new Map<string, number>(globalStockMap);

    sortedClients.forEach(client => {
      // IMPORTANTE: Hemos eliminado el filtro de visibilidad (stock < demanda).
      // Ahora confiamos en que el Servidor (server.js) nos envía solo los productos con cantidad > 0.
      // Si el servidor lo envía, el frontend lo muestra.

      // Aplicar Cascada a los productos
      client.products.forEach((p: any) => {
        const availableStock = runningStock.get(p.name) || 0;
        
        // Asignamos stock al producto de este cliente hasta cubrir la demanda o agotar stock
        const stockAssigned = Math.min(p.qty, availableStock);
        
        p.stock = availableStock; // Stock disponible ANTES de este cliente
        
        // Cálculo A PRODUCIR: Lo que falta
        p.toProduce = Math.max(0, p.qty - stockAssigned);
        
        // Restamos del stock global para el siguiente cliente
        runningStock.set(p.name, availableStock - stockAssigned);
      });
      
      // Convertimos el Map de productos a Array para renderizar
      client.productsArray = Array.from(client.products.values()).sort((a: any, b: any) => b.qty - a.qty);
    });

    return { clients: sortedClients, productMap: clientsMap }; 
  };

  // Procesar datos actuales y anteriores para tendencias
  const currentData = processDataSet(latestDate);
  
  // Para tendencias, necesitamos los datos del día anterior 
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

  // E. Combinar todo: Datos actuales + Tendencias
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

// --- COMPONENTES UI DASHBOARD ---

const TrendBadge: React.FC<{ value: number; darkMode: boolean; fontSize: number }> = ({ value, darkMode, fontSize }) => {
  if (Math.abs(value) < 0.1) {
    return (
      <div 
        className="flex items-center justify-center font-bold text-slate-400 opacity-50 px-2 py-1"
        style={{ fontSize: `${fontSize}px` }}
      >
        <Minus size={fontSize + 2} />
        0%
      </div>
    );
  }

  const isUp = value > 0;
  
  return (
    <div 
      className={`flex items-center gap-0.5 font-black leading-none rounded-md whitespace-nowrap px-1 py-0.5 ${
        isUp 
          ? (darkMode ? 'text-green-400 bg-green-500/10' : 'text-green-700 bg-green-100')
          : (darkMode ? 'text-red-400 bg-red-500/10' : 'text-red-700 bg-red-100')
      }`}
      style={{ fontSize: `${fontSize}px` }}
    >
      {isUp ? <ArrowUpRight size={fontSize + 2} strokeWidth={3} /> : <ArrowDownRight size={fontSize + 2} strokeWidth={3} />}
      {Math.abs(Math.round(value))}%
    </div>
  );
};

const ProductRow: React.FC<{ p: any; settings: VisualSettings; darkMode: boolean }> = ({ p, settings, darkMode }) => {
  const showName = settings.displayMode === 'name' || settings.displayMode === 'both';
  const showCode = settings.displayMode === 'code' || settings.displayMode === 'both';

  // Lógica visual para Stock: Si es 0, mostrar en rojo o gris oscuro
  const stockClass = p.stock > 0 ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'text-slate-600 dark:text-slate-600';

  return (
    <div className={`flex items-center justify-between py-2 px-4 border-b group transition-colors gap-x-2 ${darkMode ? 'border-white/[0.04] hover:bg-white/[0.02]' : 'border-gray-100 hover:bg-gray-50'}`}>
      {/* Sección Izquierda: Info Producto */}
      <div className="flex-1 min-w-0 flex items-center gap-2 pr-2">
        <div className="flex flex-col min-w-0">
          {showCode && (
            <div className="flex items-center gap-2 mb-0.5">
               <span 
                className={`font-black leading-none truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}
                style={{ fontSize: `${settings.codeFontSize}px` }}
              >
                #{p.code}
              </span>
              <TrendBadge value={p.trend} darkMode={darkMode} fontSize={settings.trendFontSize} />
            </div>
          )}
          {showName && (
            <span 
              className={`font-bold transition-colors uppercase truncate leading-none ${settings.displayMode === 'both' ? 'text-slate-500 group-hover:text-red-400' : (darkMode ? 'text-slate-400' : 'text-slate-500') + ' group-hover:text-red-500'}`}
              style={{ fontSize: `${settings.nameFontSize}px` }}
            >
              {p.name}
            </span>
          )}
        </div>
      </div>
      
      {/* Sección Derecha: Columnas Numéricas (Grid fijo para alineación) */}
      <div className="grid grid-cols-3 gap-2 w-[180px] xl:w-[220px] text-right items-center">
        {/* STOCK (Disponible al llegar a este cliente) */}
        <div className={`font-bold tabular-nums text-sm ${stockClass}`}>
           {p.stock.toLocaleString('es-ES')}
        </div>

        {/* A PRODUCIR (Déficit Real) */}
        <div className={`font-black tabular-nums text-sm ${
          p.toProduce > 0 
             ? 'text-orange-500' 
             : (darkMode ? 'text-green-500/50' : 'text-green-600/50')
        }`}>
           {p.toProduce.toLocaleString('es-ES')}
        </div>

        {/* TOTAL PEDIDO */}
        <div className={`text-xl font-black tabular-nums group-hover:text-red-600 transition-all leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          {p.qty.toLocaleString('es-ES')}
        </div>
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
    <div style={{ flex: `${numCols} 0 0` }} className={`flex flex-col h-full border-r last:border-r-0 transition-all min-w-[450px] ${darkMode ? 'bg-slate-950 border-white/5' : 'bg-white border-gray-200'}`}>
      <div className={`px-4 py-4 border-b-2 ${darkMode ? 'bg-white/[0.01] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
        
        {/* HEADER CLIENTE */}
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4 overflow-hidden">
                <h3 
                  className={`font-black uppercase tracking-tighter truncate leading-none ${darkMode ? 'text-white' : 'text-gray-900'}`}
                  style={{ fontSize: `${settings.clientNameFontSize}px` }}
                >
                {data.name}
                </h3>
                <TrendBadge value={data.totalTrend} darkMode={darkMode} fontSize={settings.trendFontSize + 2} />
            </div>
        </div>
        
        {/* CABECERAS DE COLUMNAS INTERNAS (Repetida para mantener alineación) */}
        <div className="flex w-full">
             {Array.from({ length: numCols }).map((_, idx) => (
                <div 
                  key={idx} 
                  className={`flex-1 flex justify-between items-center px-4 mt-2 opacity-50 font-black uppercase tracking-wider ${idx > 0 ? 'border-l border-white/[0.05]' : ''}`} 
                  style={{ fontSize: `${settings.tableHeaderFontSize}px` }}
                >
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
          <div key={colIdx} className={`flex-1 flex flex-col p-1 ${colIdx > 0 ? 'border-l border-white/[0.05]' : ''}`}>
            {colProducts.map((p: any, i: number) => <ProductRow key={i} p={p} settings={settings} darkMode={darkMode} />)}
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

// --- ESTADÍSTICAS AVANZADAS (FULL WIDTH) ---
const StatsDashboard: React.FC<{ rawData: any[], darkMode: boolean }> = ({ rawData, darkMode }) => {
  const [filter, setFilter] = useState<'week' | 'biweekly' | 'month' | 'quarter' | 'year'>('week');
  
  // Procesamiento de datos para gráficas
  const { chartData, topProducts, bottomProducts, totals } = useMemo(() => {
    const map = new Map<string, number>();
    const productMap = new Map<string, number>();
    
    rawData.forEach(z => {
      const d = z.receivedAt ? z.receivedAt.split('T')[0] : 'Legacy';
      // CONVERSIÓN DE UNIDADES (Nuevo) en Stats también
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
           const name = (z.nombre || p.codigo || 'ITEM').toUpperCase();
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
      
      {/* Header Analítica */}
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

      {/* KPI Grid */}
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

      {/* Gráficos Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[500px]">
        {/* Comparativa Historica (2/3 width) */}
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

        {/* Tablas de Ranking (1/3 width) */}
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
          {/* LOGO SECTION - REPLACED ENTIRELY IF LOGO EXISTS */}
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