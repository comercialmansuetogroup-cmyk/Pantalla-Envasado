import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Factory, Moon, Sun, Settings, 
  X, Server, Clipboard, Radio, Trash2, Clock
} from 'lucide-react';

// Mapeo unificado: 0, 10, 14, 5 -> GRAN CANARIA
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

// Función de limpieza para evitar decimales infinitos de JS
const formatNumber = (val: any): number => {
  const n = Number(val) || 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

const processIncomingData = (data: any) => {
  if (!data || !data.zonas || !Array.isArray(data.zonas)) return [];
  const clientMap = new Map<string, any>();

  data.zonas.forEach((zona: any) => {
    const agentCodeRaw = String(zona.codigo_agente || '').trim();
    const clientName = CLIENT_MAPPING[agentCodeRaw] || (agentCodeRaw ? `ZONA ${agentCodeRaw}` : 'DESCONOCIDO');
    
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
    clientGroup.productTotals.set(productName, formatNumber(currentProductQty + lineQty));
    clientGroup.grandTotal = formatNumber(clientGroup.grandTotal + lineQty);
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
      <div className="bg-slate-900 rounded-[2rem] w-full max-w-2xl border border-slate-800 overflow-hidden flex flex-col">
        <div className="px-10 py-8 border-b border-slate-800 flex justify-between items-center bg-red-600 text-white">
          <div className="flex items-center gap-4">
            <Server size={32} />
            <h2 className="text-2xl font-black uppercase tracking-tight">Configuración Webhook</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
        </div>
        <div className="p-10 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-500">URL Destino (Make)</label>
            <div className="flex gap-2">
              <code className="flex-1 px-4 py-3 bg-slate-800 rounded-xl font-mono text-[11px] text-red-400 truncate border border-slate-700">{webhookUrl}</code>
              <button onClick={() => navigator.clipboard.writeText(webhookUrl)} className="p-3 bg-red-600 text-white rounded-xl"><Clipboard size={16} /></button>
            </div>
          </div>
          <button onClick={onReset} className="w-full py-4 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-600/20 transition-all">Limpiar Datos de Producción</button>
        </div>
        <div className="p-8 bg-slate-800/50 text-center">
          <button onClick={onClose} className="w-full py-4 bg-white text-slate-950 rounded-xl font-black uppercase text-sm tracking-widest">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

const ClientColumn: React.FC<{ data: any; darkMode: boolean }> = ({ data, darkMode }) => (
  <div className={`flex flex-col flex-1 h-full border-r last:border-r-0 transition-all ${darkMode ? 'bg-slate-950 border-white/5' : 'bg-white border-gray-200'}`}>
    {/* Cabecera Cliente */}
    <div className={`px-6 py-6 border-b flex justify-between items-center ${darkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
      <h3 className={`text-4xl font-black uppercase tracking-tighter truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{data.clientName}</h3>
      <span className="text-[10px] font-black px-3 py-1 bg-red-600 text-white rounded-md tracking-widest">LIVE</span>
    </div>
    
    {/* Listado de Productos - Sin scroll, optimizado verticalmente */}
    <div className="flex-1 p-6 space-y-2 overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 border-b dark:border-white/10">
            <th className="pb-2">PRODUCTO</th>
            <th className="pb-2 text-right">CANT.</th>
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-white/5">
          {data.products.map((p: any, i: number) => (
            <tr key={i} className="group">
              <td className="py-2.5 pr-4 font-bold text-lg leading-none text-gray-400 group-hover:text-red-500 transition-colors uppercase truncate">
                {p.name}
              </td>
              <td className="py-2.5 text-right font-black text-4xl tabular-nums text-white group-hover:text-red-600 transition-all">
                {p.totalQuantity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    {/* Subtotal Cliente */}
    <div className={`px-8 py-8 mt-auto border-t-2 ${darkMode ? 'bg-red-600/5 border-red-600/20' : 'bg-red-50 border-red-200'}`}>
      <div className="flex flex-col items-end">
        <span className="text-xs font-black uppercase text-red-600/60 tracking-[0.4em] mb-1">TOTAL CLIENTE</span>
        <span className="text-8xl font-black text-red-600 leading-none tabular-nums">{data.grandTotal}</span>
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
      const data = await res.json();
      if (data && data.zonas) {
        setClientGroups(processIncomingData(data));
        setLastUpdated(new Date());
      }
    } catch (e) { console.error(e); }
  };

  const resetData = async () => {
    if (!confirm("¿Deseas resetear toda la producción?")) return;
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
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const totalPlanta = useMemo(() => {
    const total = clientGroups.reduce((acc, c) => acc + c.grandTotal, 0);
    return formatNumber(total);
  }, [clientGroups]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header Full-Width */}
      <header className={`flex-none w-full px-10 py-6 border-b-2 ${darkMode ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-300'}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="bg-red-600 p-4 rounded-xl shadow-2xl shadow-red-600/40"><Factory size={40} className="text-white" /></div>
            <div>
              <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">Factory<span className="text-red-600">Flow</span></h1>
              <p className="text-xs font-black text-gray-500 uppercase tracking-[0.4em] mt-1">SISTEMA DE CONTROL DE PLANTA - 4K READY</p>
            </div>
          </div>
          
          <div className="flex items-center gap-10">
            <div className="flex flex-col items-end px-10 border-r-2 border-white/10">
               <span className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">TOTAL PLANTA</span>
               <span className="text-7xl font-black text-red-600 tabular-nums leading-none">{totalPlanta}</span>
            </div>
            <div className="flex gap-3">
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

      {/* Main Content Area */}
      <main className="flex-1 w-full flex overflow-hidden">
        {clientGroups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-fade-in opacity-30">
            <Radio size={100} className="animate-pulse text-red-600" />
            <h2 className="text-4xl font-black uppercase tracking-[0.4em]">SISTEMA EN ESPERA...</h2>
          </div>
        ) : (
          <div className="flex w-full h-full animate-fade-in">
            {clientGroups.map((g) => <ClientColumn key={g.clientName} data={g} darkMode={darkMode} />)}
          </div>
        )}
      </main>

      {/* Footer / Status Bar */}
      <footer className={`flex-none px-10 py-3 border-t flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] ${darkMode ? 'bg-slate-900 border-white/5 text-gray-600' : 'bg-gray-200 border-gray-300 text-gray-600'}`}>
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
          {clientGroups.length} CLIENTES ACTIVOS • SINCRONIZACIÓN EN TIEMPO REAL
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-2">
            <Clock size={12} />
            ACTUALIZADO: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </footer>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onReset={resetData} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);