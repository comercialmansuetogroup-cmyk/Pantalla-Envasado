import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { Factory, Moon, Sun, Clock, Radio } from 'lucide-react';

// Mapeo Maestro: Forzamos la Zona 0 a Gran Canaria
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

const roundSafe = (num: any): number => {
  const val = Number(num) || 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
};

const processIncomingData = (data: any) => {
  if (!data || !data.zonas || !Array.isArray(data.zonas)) return [];
  
  const clientMap = new Map<string, any>();

  data.zonas.forEach((zona: any) => {
    let agentCodeRaw = String(zona.codigo_agente ?? '0').trim();
    if (agentCodeRaw === '' || agentCodeRaw === 'null' || agentCodeRaw === 'undefined') {
      agentCodeRaw = '0';
    }
    
    const clientName = CLIENT_MAPPING[agentCodeRaw] || `ZONA ${agentCodeRaw}`;
    
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
    } else if (zona.cantidad !== undefined) {
      lineQty = Number(zona.cantidad) || 0;
    }

    // Aseguramos que el nombre sea siempre un string para evitar el Error #31
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

const ClientColumn: React.FC<{ data: any; darkMode: boolean }> = ({ data, darkMode }) => {
  // AUDITORÍA DE DATOS: Si algo aquí es un objeto, React lanzará el Error #31
  useEffect(() => {
    data.products.forEach((p: any) => {
      if (typeof p.name === 'object' || typeof p.totalQuantity === 'object') {
        console.error('⚠️ DETECTADO OBJETO ILEGAL EN RENDER:', p);
      }
    });
  }, [data]);

  return (
    <div className={`flex flex-col flex-1 min-w-0 h-full border-r last:border-r-0 transition-all ${darkMode ? 'bg-slate-950 border-white/5' : 'bg-white border-gray-200'}`}>
      <div className={`px-4 py-4 border-b flex justify-between items-center ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
        <h3 className={`text-2xl xl:text-3xl font-black uppercase tracking-tighter truncate ${darkMode ? 'text-white' : 'text-gray-950'}`}>
          {String(data.clientName)}
        </h3>
        <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
      </div>
      
      <div className="flex-1 px-4 py-2 overflow-hidden">
        <table className="w-full text-left table-fixed">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-widest text-gray-500 border-b dark:border-white/10">
              <th className="pb-1 w-2/3">PRODUCTO</th>
              <th className="pb-1 text-right w-1/3">CANT.</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-white/[0.03]">
            {data.products.map((p: any, i: number) => (
              <tr key={i} className="group">
                <td className="py-2 pr-2 font-bold text-sm xl:text-base leading-none text-gray-400 group-hover:text-red-500 transition-colors uppercase truncate">
                  {String(p.name)} 
                </td>
                <td className="py-2 text-right font-black text-2xl xl:text-4xl tabular-nums text-white group-hover:text-red-600 transition-all">
                  {Number(p.totalQuantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className={`px-6 py-8 mt-auto border-t-2 ${darkMode ? 'bg-red-600/5 border-red-600/20' : 'bg-red-50 border-red-200'}`}>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black uppercase text-red-600/50 tracking-[0.4em] mb-1">TOTAL CLIENTE</span>
          <span className="text-6xl xl:text-8xl font-black text-red-600 leading-none tabular-nums tracking-tighter">
            {roundSafe(data.grandTotal).toLocaleString('es-ES')}
          </span>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [clientGroups, setClientGroups] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error("API Offline");
      const data = await res.json();
      if (data && data.zonas) {
        const processed = processIncomingData(data);
        console.debug('📊 DATOS PROCESADOS:', processed);
        setClientGroups(processed);
        setLastUpdated(new Date());
      }
    } catch (e) { console.error("Sync Error:", e); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const totalPlanta = useMemo(() => {
    return roundSafe(clientGroups.reduce((acc, c) => acc + c.grandTotal, 0));
  }, [clientGroups]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-slate-950' : 'bg-gray-100'}`}>
      <header className={`flex-none w-full px-10 py-5 border-b-2 ${darkMode ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-300'}`}>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-6">
            <div className="bg-red-600 p-4 rounded-xl shadow-lg"><Factory size={32} className="text-white" /></div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Factory<span className="text-red-600">Flow</span></h1>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.6em] mt-1">SISTEMA CENTRAL • DEBUG MODE ON</p>
            </div>
          </div>
          
          <div className="flex items-center gap-10">
            <div className="flex flex-col items-end px-10 border-r-2 border-white/10">
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">TOTAL PLANTA</span>
               <span className="text-7xl font-black text-red-600 tabular-nums leading-none tracking-tighter">
                {totalPlanta.toLocaleString('es-ES')}
               </span>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className={`p-4 rounded-xl border transition-all ${darkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-100 border-gray-400 text-gray-900'}`}>
              {darkMode ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full flex overflow-hidden">
        {clientGroups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-fade-in opacity-30">
            <Radio size={80} className="animate-pulse text-red-600" />
            <h2 className="text-4xl font-black uppercase tracking-[0.8em]">CONECTANDO CON PLANTA...</h2>
          </div>
        ) : (
          <div className="flex w-full h-full animate-fade-in divide-x divide-white/5">
            {clientGroups.map((g) => <ClientColumn key={String(g.clientName)} data={g} darkMode={darkMode} />)}
          </div>
        )}
      </main>

      <footer className={`flex-none px-10 py-3 border-t flex justify-between items-center text-[10px] font-black uppercase tracking-[0.5em] ${darkMode ? 'bg-slate-900 border-white/5 text-gray-600' : 'bg-gray-200 border-gray-300 text-gray-600'}`}>
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          {clientGroups.length} NODOS ACTIVOS • SINCRONIZACIÓN REAL-TIME
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-2">
            <Clock size={12} />
            SYNC: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </footer>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}