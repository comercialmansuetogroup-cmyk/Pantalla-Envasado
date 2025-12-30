import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { Factory, Moon, Sun, Clock, Radio, AlertTriangle } from 'lucide-react';

// --- UTILIDADES DE SEGURIDAD ---

const SafeValue: React.FC<{ value: any; label: string }> = ({ value, label }) => {
  // Patrón solicitado: log justo antes del render
  console.log(`DEBUG: [SafeValue] Renderizando "${label}":`, value, "Tipo:", typeof value);

  if (value === null || value === undefined) return null;
  
  const type = typeof value;
  
  // Si es un objeto pero no un elemento de React válido, lanzamos aviso fuerte
  if (type === 'object' && !React.isValidElement(value)) {
    console.error(`🚨 ERROR #31 INMINENTE: Objeto ilegal detectado en "${label}":`, value);
    try {
      return <span>[OBJ] {JSON.stringify(value)}</span>;
    } catch (e) {
      return <span className="text-red-500">Error: Object</span>;
    }
  }
  
  return <>{value}</>;
};

const roundSafe = (num: any): number => {
  const val = Number(num);
  if (isNaN(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
};

// --- MAPPING ---
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

// --- PROCESADOR DE DATOS ---
const processIncomingData = (data: any) => {
  if (!data || !data.zonas || !Array.isArray(data.zonas)) return [];
  
  const clientMap = new Map<string, any>();

  data.zonas.forEach((zona: any) => {
    let agentCodeRaw = "0";
    if (zona.codigo_agente !== undefined && zona.codigo_agente !== null) {
      agentCodeRaw = String(zona.codigo_agente).trim();
    }
    
    if (agentCodeRaw === '' || agentCodeRaw === 'null' || agentCodeRaw === '0') agentCodeRaw = '0';
    
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

// --- COMPONENTES UI ---

const ClientColumn: React.FC<{ data: any; darkMode: boolean }> = ({ data, darkMode }) => {
  // Debug de props recibidas
  console.log("DEBUG: Render ClientColumn data:", data, typeof data);

  return (
    <div className={`flex flex-col flex-1 min-w-0 h-full border-r last:border-r-0 transition-all ${darkMode ? 'bg-slate-950 border-white/5' : 'bg-white border-gray-200'}`}>
      <div className={`px-4 py-4 border-b flex justify-between items-center ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
        <h3 className={`text-2xl xl:text-3xl font-black uppercase tracking-tighter truncate ${darkMode ? 'text-white' : 'text-gray-950'}`}>
          <SafeValue value={data.clientName} label="data.clientName" />
        </h3>
        <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
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
            {data.products.map((p: any, i: number) => {
              // Log del mapeo solicitado
              console.log(`DEBUG: [Map] Renderizando producto ${i}:`, p.name, "Cantidad:", p.totalQuantity);
              return (
                <tr key={`${data.clientName}-${i}`} className="group">
                  <td className="py-2 pr-2 font-bold text-sm xl:text-base leading-none text-gray-400 group-hover:text-red-500 transition-colors uppercase truncate">
                    <SafeValue value={p.name} label={`p.name[${i}]`} />
                  </td>
                  <td className="py-2 text-right font-black text-2xl xl:text-4xl tabular-nums text-white group-hover:text-red-600 transition-all">
                    {/* Log justo antes de este render específico */}
                    {(() => {
                      console.log("DEBUG: Render p.totalQuantity", p.totalQuantity, typeof p.totalQuantity);
                      return p.totalQuantity;
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className={`px-6 py-8 mt-auto border-t-2 ${darkMode ? 'bg-red-600/5 border-red-600/20' : 'bg-red-50 border-red-200'}`}>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black uppercase text-red-600/50 tracking-[0.4em] mb-1">TOTAL ACUMULADO</span>
          <span className="text-6xl xl:text-8xl font-black text-red-600 leading-none tabular-nums tracking-tighter">
            {(() => {
               console.log("DEBUG: Render grandTotal", data.grandTotal, typeof data.grandTotal);
               return data.grandTotal.toLocaleString('es-ES');
            })()}
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
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      
      if (json && json.zonas) {
        const processed = processIncomingData(json);
        console.log("DEBUG: SetState clientGroups", processed);
        setClientGroups(processed);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (e: any) {
      console.error("Fetch Error:", e);
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const totalPlanta = useMemo(() => {
    const val = roundSafe(clientGroups.reduce((acc, c) => acc + c.grandTotal, 0));
    console.log("DEBUG: Memo totalPlanta", val);
    return val;
  }, [clientGroups]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? 'bg-slate-950' : 'bg-gray-100'}`}>
      <header className={`flex-none w-full px-10 py-5 border-b-2 ${darkMode ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-300'}`}>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-6">
            <div className="bg-red-600 p-4 rounded-xl shadow-lg"><Factory size={32} className="text-white" /></div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Factory<span className="text-red-600">Flow</span></h1>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.6em] mt-1">SISTEMA DE CONTROL • DEBUG ACTIVADO</p>
            </div>
          </div>
          
          <div className="flex items-center gap-10">
            {error && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-600/10 border border-red-600/30 rounded-lg text-red-500 text-xs font-bold animate-pulse">
                <AlertTriangle size={14} /> {error.toUpperCase()}
              </div>
            )}
            <div className="flex flex-col items-end px-10 border-r-2 border-white/10">
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">PRODUCCIÓN PLANTA</span>
               <span className="text-7xl font-black text-red-600 tabular-nums leading-none tracking-tighter">
                {(() => {
                  console.log("DEBUG: Render totalPlanta UI", totalPlanta, typeof totalPlanta);
                  return totalPlanta.toLocaleString('es-ES');
                })()}
               </span>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className={`p-4 rounded-xl border transition-all ${darkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-gray-100 border-gray-400 text-gray-900 hover:bg-gray-200'}`}>
              {darkMode ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full flex overflow-hidden">
        {clientGroups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-fade-in opacity-30">
            <Radio size={80} className="animate-pulse text-red-600" />
            <h2 className="text-4xl font-black uppercase tracking-[0.8em]">CONECTANDO...</h2>
          </div>
        ) : (
          <div className="flex w-full h-full animate-fade-in divide-x divide-white/5">
            {clientGroups.map((g) => {
              console.log("DEBUG: Render clientGroups.map", g.clientName);
              return <ClientColumn key={g.clientName} data={g} darkMode={darkMode} />;
            })}
          </div>
        )}
      </main>

      <footer className={`flex-none px-10 py-3 border-t flex justify-between items-center text-[10px] font-black uppercase tracking-[0.5em] ${darkMode ? 'bg-slate-900 border-white/5 text-gray-600' : 'bg-gray-200 border-gray-300 text-gray-600'}`}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          ESTADO: ONLINE • {clientGroups.length} NODOS
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