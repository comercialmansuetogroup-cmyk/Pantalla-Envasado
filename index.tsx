import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Factory, Moon, Sun, Settings, 
  X, Server, Clipboard, Radio, Trash2
} from 'lucide-react';

const CLIENT_MAPPING: Record<string, string> = {
  '0': 'GRAN CANARIA', // Unificación solicitada
  '10': 'GRAN CANARIA',
  '14': 'GRAN CANARIA',
  '5': 'GRAN CANARIA',
  '24': 'FILIPPO',
  '26': 'PINGÜINO',
  '23': 'INSÓLITO',
  '15': 'TENERIFE NORTE',
};

// Función para limpiar números y evitar .99999999
const cleanNum = (val: any): number => {
  const n = Number(val) || 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

const processIncomingData = (data: any) => {
  if (!data || !data.zonas || !Array.isArray(data.zonas)) return [];
  const clientMap = new Map<string, any>();

  data.zonas.forEach((zona: any) => {
    const agentCodeRaw = String(zona.codigo_agente || '').trim();
    const clientName = CLIENT_MAPPING[agentCodeRaw] || (agentCodeRaw ? `ZONA ${agentCodeRaw}` : 'ZONA DESCONOCIDA');
    
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
      lineQty = zona.productos.reduce((acc: number, p: any) => acc + cleanNum(p.cantidad), 0);
    } else if (zona.cantidad) {
      lineQty = cleanNum(zona.cantidad);
    }

    const productName = String(zona.nombre || 'PRODUCTO SIN NOMBRE').trim().toUpperCase();
    const currentProductQty = clientGroup.productTotals.get(productName) || 0;
    clientGroup.productTotals.set(productName, cleanNum(currentProductQty + lineQty));
    clientGroup.grandTotal = cleanNum(clientGroup.grandTotal + lineQty);
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
  const authToken = 'DASHBOARD_V3_KEY_2025';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 rounded-[2rem] w-full max-w-2xl border border-slate-800 overflow-hidden flex flex-col">
        <div className="px-10 py-8 border-b border-slate-800 flex justify-between items-center bg-red-600 text-white">
          <div className="flex items-center gap-4">
            <Server size={32} />
            <h2 className="text-2xl font-black uppercase tracking-tight">Make Config</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full"><X size={24} /></button>
        </div>
        <div className="p-10 space-y-6">
          <div className="space-y-2 text-white">
            <label className="text-xs font-black uppercase text-gray-500">URL Webhook</label>
            <div className="flex gap-2">
              <code className="flex-1 px-4 py-3 bg-slate-800 rounded-xl font-mono text-[10px] text-red-400 truncate border border-slate-700">{webhookUrl}</code>
              <button onClick={() => navigator.clipboard.writeText(webhookUrl)} className="p-3 bg-red-600 text-white rounded-xl"><Clipboard size={16} /></button>
            </div>
          </div>
          <button onClick={onReset} className="w-full py-4 text-red-500 border border-red-900/50 bg-red-500/5 rounded-xl font-black uppercase text-xs tracking-[0.2em] hover:bg-red-500/10">Borrar Datos de Hoy</button>
        </div>
        <div className="p-8 bg-slate-800/50">
          <button onClick={onClose} className="w-full py-4 bg-white text-slate-950 rounded-xl font-black uppercase text-sm">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

const ClientColumn: React.FC<{ data: any; darkMode: boolean }> = ({ data, darkMode }) => (
  <div className={`flex flex-col flex-1 h-full border-r last:border-r-0 transition-all ${darkMode ? 'bg-slate-950 border-white/5' : 'bg-white border-gray-200'}`}>
    {/* Cabecera de Cliente más compacta para ganar espacio vertical */}
    <div className={`px-6 py-6 border-b flex justify-between items-center ${darkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
      <h3 className={`text-3xl font-black uppercase tracking-tighter truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{data.clientName}</h3>
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-black px-2 py-0.5 bg-red-600 text-white rounded-sm">LIVE</span>
      </div>
    </div>
    
    {/* Listado de Productos - Sin Scroll, optimizado */}
    <div className="flex-1 p-6 space-y-4 overflow-hidden">
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
              <td className="py-3 pr-4 font-bold text-lg leading-tight text-gray-400 group-hover:text-red-500 transition-colors uppercase truncate max-w-[200px] xl:max-w-none">
                {p.name}
              </td>
              <td className="py-3 text-right font-black text-4xl tabular-nums text-white group-hover:text-red-600 transition-colors">
                {p.totalQuantity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    {/* Footer de Cliente - Muy prominente para lectura desde lejos */}
    <div className={`px-8 py-8 mt-auto border-t-2 ${darkMode ? 'bg-red-600/5 border-red-600/20' : 'bg-red-50 border-red-200'}`}>
      <div className="flex flex-col items-end">
        <span className="text-xs font-black uppercase text-red-600/60 tracking-[0.4em] mb-1">SUBTOTAL CLIENTE</span>
        <span className="text-7xl font-black text-red-600 leading-none tabular-nums">{data.grandTotal}</span>
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
    if (!confirm("¿Resetear producción?")) return;
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

  const totalGlobalProduccion = useMemo(() => {
    return cleanNum(clientGroups.reduce((acc, c) => acc + c.grandTotal, 0));
  }, [clientGroups]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-100 text-gray-950'}`}>
      {/* Header Full-Width */}
      <header className={`flex-none w-full px-10 py-6 border-b-2 ${darkMode ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-300'}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="bg-red-600 p-4 rounded-xl shadow-lg shadow-red-600/20"><Factory size={40} className="text-white" /></div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Factory<span className="text-red-600">Flow</span></h1>
              <p className="text-xs font-black text-gray-500 uppercase tracking-[0.4em] mt-1">SISTEMA 4K DE PRODUCCIÓN CENTRALIZADA</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-end px-10 border-r-2 border-white/10">
               <span className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">TOTAL PLANTA</span>
               <span className="text-6xl font-black text-red-600 tabular-nums leading-none">{totalGlobalProduccion}</span>
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

      {/* Main Content: Layout Dinámico sin scroll */}
      <main className="flex-1 w-full flex overflow-hidden">
        {clientGroups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-fade-in opacity-40">
            <Radio size={80} className="animate-pulse text-red-600" />
            <h2 className="text-3xl font-black uppercase tracking-[0.5em]">ESCUCHANDO PRODUCCIÓN...</h2>
          </div>
        ) : (
          <div className="flex w-full h-full animate-fade-in">
            {clientGroups.map((g) => <ClientColumn key={g.clientName} data={g} darkMode={darkMode} />)}
          </div>
        )}
      </main>

      {/* Barra de Estado Inferior Ultra-Plana */}
      <footer className={`flex-none px-10 py-2 border-t flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] ${darkMode ? 'bg-slate-900 border-white/5 text-gray-600' : 'bg-gray-200 border-gray-300 text-gray-600'}`}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          {clientGroups.length} ENTIDADES ACTIVAS EN TIEMPO REAL
        </div>
        {lastUpdated && <div>LAST SYNC: {lastUpdated.toLocaleTimeString()}</div>}
      </footer>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onReset={resetData} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);