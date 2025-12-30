import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Factory, Moon, Sun, Settings, 
  X, Server, Clipboard, Radio, Trash2, Clock, AlertTriangle
} from 'lucide-react';

// Mapeo Maestro para unificar clientes
const CLIENT_MAPPING: Record<string, string> = {
  '0': 'GRAN CANARIA',
  '10': 'GRAN CANARIA',
  '14': 'GRAN CANARIA',
  '5': 'GRAN CANARIA',
  '24': 'FILIPPO',
  '26': 'PINGÜINO',
  '23': 'INSÓLITO',
  '15': 'TENERIFE NORTE',
};

// Función para redondear y evitar errores de precisión de JS (.9999)
const roundSafe = (num: any): number => {
  const val = Number(num) || 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
};

const processIncomingData = (data: any) => {
  if (!data || !data.zonas || !Array.isArray(data.zonas)) return [];
  
  const clientMap = new Map<string, any>();

  data.zonas.forEach((zona: any) => {
    // Normalización agresiva del código de agente
    let agentCodeRaw = String(zona.codigo_agente || '').trim();
    if (agentCodeRaw === 'null' || agentCodeRaw === 'undefined' || agentCodeRaw === '') agentCodeRaw = '0';
    
    // Asignación de cliente (Si es 0, va a Gran Canaria por defecto)
    const clientName = CLIENT_MAPPING[agentCodeRaw] || (agentCodeRaw !== '0' ? `ZONA ${agentCodeRaw}` : 'GRAN CANARIA');
    
    if (!clientMap.has(clientName)) {
      clientMap.set(clientName, {
        clientName: clientName,
        productTotals: new Map<string, number>(),
        grandTotal: 0
      });
    }

    const clientGroup = clientMap.get(clientName);
    let lineQty = 0;
    
    if (Array.isArray(zona.productos)) {
      lineQty = zona.productos.reduce((acc: number, p: any) => acc + (Number(p.cantidad) || 0), 0);
    } else if (zona.cantidad) {
      lineQty = Number(zona.cantidad) || 0;
    }

    const productName = String(zona.nombre || 'PRODUCTO').trim().toUpperCase();
    const currentProductQty = clientGroup.productTotals.get(productName) || 0;
    
    clientGroup.productTotals.set(productName, roundSafe(currentProductQty + lineQty));
    clientGroup.grandTotal = roundSafe(clientGroup.grandTotal + lineQty);
  });

  return Array.from(clientMap.values())
    .map(client => ({
      ...client,
      products: Array.from(client.productTotals.entries())
        .map(([name, totalQuantity]) => ({ name, totalQuantity }))
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
    }))
    .sort((a: any, b: any) => {
      if (a.clientName === 'GRAN CANARIA') return -1;
      if (b.clientName === 'GRAN CANARIA') return 1;
      return a.clientName.localeCompare(b.clientName);
    });
};

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; onReset: () => void }> = ({ isOpen, onClose, onReset }) => {
  if (!isOpen) return null;
  const webhookUrl = `${window.location.origin}/api/webhook`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 rounded-[2.5rem] w-full max-w-2xl border border-slate-800 overflow-hidden flex flex-col shadow-2xl">
        <div className="px-10 py-8 border-b border-slate-800 flex justify-between items-center bg-red-600 text-white">
          <div className="flex items-center gap-4">
            <Server size={32} />
            <h2 className="text-2xl font-black uppercase tracking-tight">Consola de Control</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
        </div>
        <div className="p-10 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">URL del Webhook (Make)</label>
            <div className="flex gap-2">
              <code className="flex-1 px-4 py-3 bg-slate-800 rounded-xl font-mono text-[11px] text-red-400 truncate border border-slate-700">{webhookUrl}</code>
              <button onClick={() => navigator.clipboard.writeText(webhookUrl)} className="p-3 bg-red-600 text-white rounded-xl"><Clipboard size={16} /></button>
            </div>
          </div>
          <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4">
            <AlertTriangle className="text-amber-500 shrink-0" size={20} />
            <p className="text-[11px] font-bold text-amber-200/80 uppercase leading-relaxed">Nota: La zona 0 se unifica automáticamente con Gran Canaria. Los decimales se redondean a 2 posiciones para lectura 4K.</p>
          </div>
          <button onClick={onReset} className="w-full py-5 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl font-black uppercase text-xs tracking-[0.3em] hover:bg-red-600/20 transition-all">Resetear Producción</button>
        </div>
        <div className="p-8 bg-slate-800/50">
          <button onClick={onClose} className="w-full py-4 bg-white text-slate-950 rounded-xl font-black uppercase text-sm">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

const ClientColumn: React.FC<{ data: any; darkMode: boolean }> = ({ data, darkMode }) => (
  <div className={`flex flex-col flex-1 min-w-0 h-full border-r last:border-r-0 transition-all ${darkMode ? 'bg-slate-950 border-white/5' : 'bg-white border-gray-200'}`}>
    {/* Cabecera optimizada */}
    <div className={`px-4 py-4 border-b flex justify-between items-center ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
      <h3 className={`text-2xl xl:text-3xl font-black uppercase tracking-tighter truncate ${darkMode ? 'text-white' : 'text-gray-950'}`}>
        {data.clientName}
      </h3>
      <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
    </div>
    
    {/* Tabla ultra-compacta para evitar scroll vertical */}
    <div className="flex-1 px-4 py-2 overflow-hidden">
      <table className="w-full text-left table-fixed">
        <thead>
          <tr className="text-[9px] font-black uppercase tracking-widest text-gray-500 border-b dark:border-white/10">
            <th className="pb-1 w-2/3">PRODUCTO</th>
            <th className="pb-1 text-right w-1/3">CANT.</th>
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-white/[0.03]">
          {data.products.map((p: any, i: number) => (
            <tr key={i} className="group">
              <td className="py-1.5 pr-2 font-bold text-sm xl:text-base leading-none text-gray-400 group-hover:text-red-500 transition-colors uppercase truncate">
                {p.name}
              </td>
              <td className="py-1.5 text-right font-black text-2xl xl:text-3xl tabular-nums text-white group-hover:text-red-600 transition-all">
                {p.totalQuantity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    {/* Subtotal muy grande para lectura lejana */}
    <div className={`px-6 py-6 mt-auto border-t-2 ${darkMode ? 'bg-red-600/5 border-red-600/20' : 'bg-red-50 border-red-200'}`}>
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-black uppercase text-red-600/50 tracking-[0.4em] mb-1">TOTAL {data.clientName}</span>
        <span className="text-6xl xl:text-7xl font-black text-red-600 leading-none tabular-nums">{data.grandTotal}</span>
      </div>
    </div>
  </div>
);

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [clientGroups, setClientGroups] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error("Fetch error");
      const data = await res.json();
      if (data && data.zonas) {
        setClientGroups(processIncomingData(data));
        setLastUpdated(new Date());
      }
    } catch (e) { console.error("Data error:", e); }
  };

  const resetData = async () => {
    if (!confirm("¿Resetear toda la producción?")) return;
    try {
      await fetch('/api/reset', { 
        method: 'POST', 
        headers: { 'Authorization': 'Bearer DASHBOARD_V3_KEY_2025' } 
      });
      fetchData();
      setIsSettingsOpen(false);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const totalPlanta = useMemo(() => {
    const total = clientGroups.reduce((acc, c) => acc + c.grandTotal, 0);
    return roundSafe(total);
  }, [clientGroups]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-100 text-gray-950'}`}>
      {/* Header Full-Width Industrial */}
      <header className={`flex-none w-full px-8 py-5 border-b-2 ${darkMode ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-300'}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="bg-red-600 p-3 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)]"><Factory size={32} className="text-white" /></div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Factory<span className="text-red-600">Flow</span></h1>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] mt-1">SISTEMA DE CONTROL 4K • NO-SCROLL MODE</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-end px-8 border-r-2 border-white/10">
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">TOTAL GLOBAL PLANTA</span>
               <span className="text-6xl font-black text-red-600 tabular-nums leading-none">{totalPlanta}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDarkMode(!darkMode)} className={`p-4 rounded-xl border transition-all ${darkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-400'}`}>
                {darkMode ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} />}
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className={`p-4 rounded-xl border transition-all ${darkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-400'}`}>
                <Settings size={24} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Area: Columnas fluidas sin scroll */}
      <main className="flex-1 w-full flex overflow-hidden">
        {clientGroups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-fade-in opacity-30">
            <Radio size={80} className="animate-pulse text-red-600" />
            <h2 className="text-4xl font-black uppercase tracking-[0.6em]">SIN DATOS DE PRODUCCIÓN</h2>
          </div>
        ) : (
          <div className="flex w-full h-full animate-fade-in">
            {clientGroups.map((g) => <ClientColumn key={g.clientName} data={g} darkMode={darkMode} />)}
          </div>
        )}
      </main>

      {/* Footer minimalista */}
      <footer className={`flex-none px-8 py-2 border-t flex justify-between items-center text-[9px] font-black uppercase tracking-[0.4em] ${darkMode ? 'bg-slate-900 border-white/5 text-gray-600' : 'bg-gray-200 border-gray-300 text-gray-600'}`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
          {clientGroups.length} CLIENTES ACTIVOS • SYNC OK
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-2">
            <Clock size={10} />
            ACTUALIZACIÓN: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </footer>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onReset={resetData} />
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}