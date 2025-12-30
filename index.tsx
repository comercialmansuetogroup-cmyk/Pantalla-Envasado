import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Factory, Moon, Sun, BarChart2, LayoutDashboard, Settings, 
  Package, ArrowLeft, Calendar, TrendingUp, X, Server, 
  Key, Globe, Clipboard, Radio, Clock, Database, Loader2 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

const CLIENT_MAPPING: Record<string, string> = {
  '24': 'Filippo',
  '26': 'Pingüino',
  '23': 'Insólito',
  '15': 'Tenerife Norte',
  '10': 'Gran Canaria',
  '14': 'Gran Canaria',
  '5': 'Gran Canaria',
};

const CHART_COLORS = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#4b5563', '#1f2937'];

const processIncomingData = (data: any) => {
  if (!data || !data.zonas || !Array.isArray(data.zonas)) return [];
  const clientMap = new Map();

  data.zonas.forEach((zona: any) => {
    const agentCodeRaw = String(zona.codigo_agente || '').trim();
    const clientName = CLIENT_MAPPING[agentCodeRaw] || `Zona ${agentCodeRaw}`;
    
    if (!clientMap.has(clientName)) {
      clientMap.set(clientName, {
        clientId: clientName,
        clientName: clientName,
        products: [],
        grandTotal: 0
      });
    }

    const clientGroup = clientMap.get(clientName);
    const entryTotal = Array.isArray(zona.productos) 
      ? zona.productos.reduce((acc: number, p: any) => acc + (Number(p.cantidad) || 0), 0)
      : 0;

    const productName = String(zona.nombre || 'Producto').trim();
    const existingProd = clientGroup.products.find((p: any) => p.name === productName);

    if (existingProd) {
      existingProd.totalQuantity += entryTotal;
    } else {
      clientGroup.products.push({ name: productName, totalQuantity: entryTotal });
    }
    clientGroup.grandTotal += entryTotal;
  });

  return Array.from(clientMap.values()).sort((a: any, b: any) => a.clientName.localeCompare(b.clientName));
};

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  const webhookUrl = `${window.location.origin}/api/webhook`;
  const authToken = 'DASHBOARD_V3_KEY_2025';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-3xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="px-10 py-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-red-600 text-white">
          <div className="flex items-center gap-4">
            <Server size={32} />
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Integración Make</h2>
              <p className="text-xs font-bold uppercase opacity-80">Conexión V3 Activa</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full"><X size={24} /></button>
        </div>
        <div className="p-10 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-500 flex items-center gap-2"><Globe size={14} /> URL Webhook</label>
            <div className="flex gap-2">
              <code className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-800 rounded-xl font-mono text-[10px] text-red-600 truncate border dark:border-slate-700">{webhookUrl}</code>
              <button onClick={() => navigator.clipboard.writeText(webhookUrl)} className="p-3 bg-red-600 text-white rounded-xl"><Clipboard size={16} /></button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-500 flex items-center gap-2"><Key size={14} /> Authorization Header</label>
            <div className="flex gap-2">
              <code className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-800 rounded-xl font-mono text-[10px] text-gray-400 truncate border dark:border-slate-700">Bearer {authToken}</code>
              <button onClick={() => navigator.clipboard.writeText(`Bearer ${authToken}`)} className="p-3 bg-red-600 text-white rounded-xl"><Clipboard size={16} /></button>
            </div>
          </div>
        </div>
        <div className="p-8 bg-gray-50 dark:bg-slate-800/50">
          <button onClick={onClose} className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

const ClientColumn: React.FC<{ data: any; darkMode: boolean }> = ({ data, darkMode }) => (
  <div className={`flex flex-col h-full rounded-[2rem] overflow-hidden shadow-2xl border transition-all duration-500 ${darkMode ? 'bg-slate-900/50 border-white/5' : 'bg-white border-gray-100'}`}>
    <div className={`px-8 py-6 border-b flex justify-between items-center ${darkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
      <h3 className={`text-xl font-black uppercase tracking-tight truncate ${darkMode ? 'text-white' : 'text-gray-800'}`}>{data.clientName}</h3>
      <span className="text-[10px] font-black px-2 py-1 bg-red-600/10 text-red-600 rounded-lg">LIVE</span>
    </div>
    <div className="flex-1 p-6 space-y-4 overflow-y-auto min-h-[300px]">
      <table className="w-full text-left">
        <thead>
          <tr className="text-[10px] font-black uppercase tracking-widest text-gray-500 border-b dark:border-white/5">
            <th className="pb-3">Producto</th>
            <th className="pb-3 text-right">Cant.</th>
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-white/5">
          {data.products.map((p: any, i: number) => (
            <tr key={i} className="group">
              <td className="py-4 pr-4 font-bold text-sm text-gray-400 group-hover:text-red-500 transition-colors">{p.name}</td>
              <td className="py-4 text-right font-black text-lg tabular-nums">{p.totalQuantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className={`px-8 py-6 mt-auto border-t ${darkMode ? 'bg-red-600/5 border-white/5' : 'bg-red-50 border-red-100'}`}>
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-black uppercase text-red-600/60 tracking-widest">Total Unidades</span>
        <span className="text-4xl font-black text-red-600">{data.grandTotal}</span>
      </div>
    </div>
  </div>
);

const StatsDashboard: React.FC<{ data: any[]; darkMode: boolean; onBack: () => void }> = ({ data, darkMode, onBack }) => {
  const stats = useMemo(() => {
    const total = data.reduce((acc: number, c: any) => acc + c.grandTotal, 0);
    const clients = data.length;
    return { total, clients };
  }, [data]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-transform active:scale-95"><ArrowLeft size={16} /> Volver</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className={`p-10 rounded-[3rem] border ${darkMode ? 'bg-slate-900/50 border-white/5' : 'bg-white border-gray-100'}`}>
          <TrendingUp className="text-red-600 mb-4" size={32} />
          <p className="text-xs font-black uppercase text-gray-500 tracking-widest">Producción Total</p>
          <h2 className="text-6xl font-black mt-2">{stats.total}</h2>
        </div>
        <div className={`p-10 rounded-[3rem] border ${darkMode ? 'bg-slate-900/50 border-white/5' : 'bg-white border-gray-100'}`}>
          <Calendar className="text-red-600 mb-4" size={32} />
          <p className="text-xs font-black uppercase text-gray-500 tracking-widest">Clientes Activos</p>
          <h2 className="text-6xl font-black mt-2">{stats.clients}</h2>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [currentView, setCurrentView] = useState<'live' | 'stats'>('live');
  const [clientGroups, setClientGroups] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.zonas) {
        setClientGroups(processIncomingData(data));
        setLastUpdated(new Date());
      }
    } catch (e) { console.error("Fetch error:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
      <header className={`sticky top-0 z-50 w-full px-8 py-6 backdrop-blur-xl border-b ${darkMode ? 'bg-slate-950/80 border-white/5' : 'bg-white/80 border-gray-100'}`}>
        <div className="max-w-[1800px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-3 rounded-2xl shadow-xl shadow-red-600/20"><Factory size={28} className="text-white" /></div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase">Factory<span className="text-red-600">Flow</span></h1>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Real-time Production</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentView(currentView === 'live' ? 'stats' : 'live')} className={`p-4 rounded-2xl border transition-all ${darkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
              {currentView === 'live' ? <BarChart2 size={20} /> : <LayoutDashboard size={20} />}
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className={`p-4 rounded-2xl border transition-all ${darkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
              {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className={`p-4 rounded-2xl border transition-all ${darkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="p-8 max-w-[1800px] mx-auto space-y-8">
        <div className="flex items-center justify-between px-8 py-4 bg-white/5 rounded-[2rem] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${clientGroups.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">{clientGroups.length > 0 ? 'Data Stream Active' : 'Waiting for Data'}</span>
          </div>
          {lastUpdated && <span className="text-[10px] font-bold opacity-40 uppercase tabular-nums">Sync: {lastUpdated.toLocaleTimeString()}</span>}
        </div>

        {clientGroups.length === 0 ? (
          <div className="mt-32 flex flex-col items-center gap-6 text-center animate-fade-in">
            <div className="w-24 h-24 bg-red-600/10 rounded-[2rem] flex items-center justify-center text-red-600 border border-red-600/20 shadow-2xl animate-pulse">
              <Radio size={48} />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase">Dashboard Listo</h2>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">Esperando datos desde el Webhook de Make</p>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            {currentView === 'live' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                {clientGroups.map((g: any) => <ClientColumn key={g.clientId} data={g} darkMode={darkMode} />)}
              </div>
            ) : (
              <StatsDashboard data={clientGroups} darkMode={darkMode} onBack={() => setCurrentView('live')} />
            )}
          </div>
        )}
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);