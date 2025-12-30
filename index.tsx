import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Factory, Moon, Sun, Settings, 
  X, Server, Clipboard, Radio, Trash2
} from 'lucide-react';

const CLIENT_MAPPING: Record<string, string> = {
  '24': 'FILIPPO',
  '26': 'PINGÜINO',
  '23': 'INSÓLITO',
  '15': 'TENERIFE NORTE',
  '10': 'GRAN CANARIA',
  '14': 'GRAN CANARIA',
  '5': 'GRAN CANARIA',
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
      lineQty = zona.productos.reduce((acc: number, p: any) => acc + (Number(p.cantidad) || 0), 0);
    } else if (zona.cantidad) {
      lineQty = Number(zona.cantidad) || 0;
    }

    const productName = String(zona.nombre || 'PRODUCTO SIN NOMBRE').trim().toUpperCase();
    const currentProductQty = clientGroup.productTotals.get(productName) || 0;
    clientGroup.productTotals.set(productName, currentProductQty + lineQty);
    clientGroup.grandTotal += lineQty;
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
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-2xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="px-10 py-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-red-600 text-white">
          <div className="flex items-center gap-4">
            <Server size={32} />
            <h2 className="text-2xl font-black uppercase tracking-tight">Configuración Make</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full"><X size={24} /></button>
        </div>
        <div className="p-10 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-500">URL Webhook</label>
            <div className="flex gap-2">
              <code className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-800 rounded-xl font-mono text-[10px] text-red-600 truncate border dark:border-slate-700">{webhookUrl}</code>
              <button onClick={() => navigator.clipboard.writeText(webhookUrl)} className="p-3 bg-red-600 text-white rounded-xl"><Clipboard size={16} /></button>
            </div>
          </div>
          <div className="pt-4">
            <button onClick={onReset} className="flex items-center gap-3 text-red-600 font-black uppercase text-xs tracking-widest hover:bg-red-50 p-4 rounded-xl transition-all border border-red-100">
              <Trash2 size={18} /> Resetear Producción Actual
            </button>
          </div>
        </div>
        <div className="p-8 bg-gray-50 dark:bg-slate-800/50">
          <button onClick={onClose} className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-black uppercase text-sm">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

const ClientColumn: React.FC<{ data: any; darkMode: boolean }> = ({ data, darkMode }) => (
  <div className={`flex flex-col flex-1 h-full min-w-[350px] border-r last:border-r-0 transition-all duration-300 ${darkMode ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-200'}`}>
    <div className={`px-10 py-10 border-b flex justify-between items-center ${darkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
      <h3 className={`text-5xl font-black uppercase tracking-tighter truncate ${darkMode ? 'text-white' : 'text-gray-950'}`}>{data.clientName}</h3>
      <span className="text-xs font-black px-4 py-2 bg-red-600 text-white rounded-full">EN VIVO</span>
    </div>
    
    <div className="flex-1 p-10 space-y-6 overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="text-sm font-black uppercase tracking-[0.3em] text-gray-500 border-b-2 dark:border-white/10">
            <th className="pb-4">PRODUCTO</th>
            <th className="pb-4 text-right">UNIDADES</th>
          </tr>
        </thead>
        <tbody className="divide-y-2 dark:divide-white/5">
          {data.products.map((p: any, i: number) => (
            <tr key={i} className="group">
              <td className="py-6 pr-6 font-black text-2xl leading-tight text-gray-400 group-hover:text-red-500 transition-colors uppercase whitespace-pre-wrap">{p.name}</td>
              <td className="py-6 text-right font-black text-5xl tabular-nums text-white group-hover:text-red-600 transition-colors">{p.totalQuantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    <div className={`px-12 py-12 mt-auto border-t-4 ${darkMode ? 'bg-red-600/10 border-red-600/20' : 'bg-red-50 border-red-200'}`}>
      <div className="flex justify-between items-end">
        <span className="text-xl font-black uppercase text-red-600 tracking-[0.4em]">TOTAL ACUMULADO</span>
        <span className="text-8xl font-black text-red-600 leading-none">{data.grandTotal}</span>
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
    if (!confirm("¿Borrar toda la producción?")) return;
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

  const totalGlobalProduccion = useMemo(() => {
    return clientGroups.reduce((acc, c) => acc + c.grandTotal, 0);
  }, [clientGroups]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-100 text-gray-950'}`}>
      {/* Header Compacto pero visible */}
      <header className={`flex-none w-full px-12 py-8 border-b-2 ${darkMode ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-300'}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="bg-red-600 p-6 rounded-3xl"><Factory size={48} className="text-white" /></div>
            <div>
              <h1 className="text-5xl font-black tracking-tighter uppercase">Factory<span className="text-red-600">Flow</span></h1>
              <p className="text-lg font-black text-gray-500 uppercase tracking-[0.4em]">SISTEMA DE CONTROL DE PLANTA 4K</p>
            </div>
          </div>
          
          <div className="flex items-center gap-12">
            <div className="flex flex-col items-end px-12 border-r-4 border-white/10">
               <span className="text-xl font-black text-gray-500 uppercase tracking-widest">TOTAL PLANTA</span>
               <span className="text-7xl font-black text-red-600 tabular-nums">{totalGlobalProduccion}</span>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setDarkMode(!darkMode)} className={`p-6 rounded-2xl border-2 transition-all ${darkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-400'}`}>
                {darkMode ? <Sun size={32} className="text-yellow-400" /> : <Moon size={32} />}
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className={`p-6 rounded-2xl border-2 transition-all ${darkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-400'}`}>
                <Settings size={32} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content: Full viewport height minus header */}
      <main className="flex-1 w-full flex overflow-hidden">
        {clientGroups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-10 animate-fade-in">
            <div className="w-64 h-64 bg-red-600/10 rounded-[5rem] flex items-center justify-center text-red-600 border-4 border-red-600/20"><Radio size={128} className="animate-pulse" /></div>
            <h2 className="text-6xl font-black uppercase tracking-tight text-gray-500">ESPERANDO DATOS DE PRODUCCIÓN...</h2>
          </div>
        ) : (
          <div className="flex w-full h-full animate-fade-in overflow-x-auto">
            {clientGroups.map((g) => <ClientColumn key={g.clientName} data={g} darkMode={darkMode} />)}
          </div>
        )}
      </main>

      {/* Status Bar Inferior (Ultra Compacta) */}
      <footer className={`flex-none px-12 py-3 border-t-2 flex justify-between items-center text-sm font-black uppercase tracking-widest ${darkMode ? 'bg-slate-900 border-white/5 text-gray-500' : 'bg-gray-200 border-gray-300 text-gray-600'}`}>
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          SISTEMA SINCRONIZADO - {clientGroups.length} CLIENTES ACTIVOS
        </div>
        {lastUpdated && <div>ACTUALIZADO: {lastUpdated.toLocaleTimeString()}</div>}
      </footer>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onReset={resetData} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);