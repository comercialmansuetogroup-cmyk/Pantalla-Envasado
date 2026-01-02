
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { ClientColumn } from './components/ClientColumn';
import { StatsDashboard } from './components/StatsDashboard';
import { SettingsModal } from './components/SettingsModal';
import { DEFAULT_SETTINGS, CLIENT_MAPPING } from './types';

export default function App() {
  const [view, setView] = useState<'live' | 'stats'>('live');
  const [darkMode, setDarkMode] = useState(false);
  
  const [data, setData] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('factory_settings_v20');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const fetchData = useCallback(async () => {
    try {
      setIsConnecting(true);
      setErrorMsg(null);
      
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      
      const raw = await res.json();
      
      // 1. Agrupar filas por Cliente
      const groups: Record<string, any> = {};
      const globalStockMap = new Map<string, number>();

      if (Array.isArray(raw)) {
        raw.forEach((row: any) => {
          // Si el total de hoy es 0 y el de ayer también, ignoramos (a menos que haya stock)
          if (Number(row.total_qty) === 0 && Number(row.yesterday_qty) === 0 && Number(row.global_stock) === 0) return;

          // Normalizar nombre de cliente
          const clientName = CLIENT_MAPPING[row.agent_code] || row.agent_name || `ZONA ${row.agent_code}`;
          
          if (!groups[clientName]) {
            groups[clientName] = { 
              name: clientName, 
              products: [],
              totalToday: 0,
              totalYesterday: 0
            };
          }
          
          // Guardar Stock Global (viene repetido en cada fila, tomamos el valor)
          const pCode = row.product_code;
          const stock = Number(row.global_stock);
          globalStockMap.set(pCode, stock);

          const qtyToday = Number(row.total_qty);
          const qtyYesterday = Number(row.yesterday_qty);

          // Calcular tendencia individual del producto
          // Si ayer fue 0, y hoy > 0, es 100%
          let trend = 0;
          if (qtyYesterday > 0) {
            trend = ((qtyToday - qtyYesterday) / qtyYesterday) * 100;
          } else if (qtyToday > 0) {
            trend = 100;
          }

          // Agregar producto al grupo
          // IMPORTANTE: Incluso si qtyToday es 0, lo agregamos si qtyYesterday > 0 para que afecte al cálculo global
          const existingProd = groups[clientName].products.find((p: any) => p.code === row.product_code);
          if (existingProd) {
             existingProd.qty += qtyToday;
             existingProd.yesterdayQty += qtyYesterday;
             // Recalcular tendencia del producto si ya existía
             if (existingProd.yesterdayQty > 0) {
                existingProd.trend = ((existingProd.qty - existingProd.yesterdayQty) / existingProd.yesterdayQty) * 100;
             }
          } else {
            groups[clientName].products.push({
              code: row.product_code,
              name: row.product_name,
              qty: qtyToday,
              yesterdayQty: qtyYesterday, // Guardamos dato de ayer para cálculos internos
              stock: 0, 
              trend: trend
            });
          }

          // Acumuladores de Cliente (Aquí es donde se define la tendencia global real)
          groups[clientName].totalToday += qtyToday;
          groups[clientName].totalYesterday += qtyYesterday;
        });
      }

      // 2. Ordenar Clientes (GRAN CANARIA PRIMERO)
      const sortedClients = Object.values(groups).sort((a,b) => {
        if(a.name === 'GRAN CANARIA') return -1;
        if(b.name === 'GRAN CANARIA') return 1;
        return a.name.localeCompare(b.name);
      });

      // 3. CALCULAR TENDENCIA GLOBAL DEL CLIENTE Y DISTRIBUIR STOCK
      sortedClients.forEach(client => {
         // Tendencia Global del Cliente
         let clientTrend = 0;
         if (client.totalYesterday > 0) {
            clientTrend = ((client.totalToday - client.totalYesterday) / client.totalYesterday) * 100;
         } else if (client.totalToday > 0) {
            clientTrend = 100;
         }
         client.trend = clientTrend;

         // Algoritmo de Consumo de Stock
         client.products.forEach((p: any) => {
             const available = globalStockMap.get(p.code) || 0;
             const needed = p.qty; // Usamos el qty de HOY para consumir stock
             
             const assigned = Math.min(needed, available);
             p.stock = assigned; 
             
             globalStockMap.set(p.code, Math.max(0, available - assigned));
         });
         
         // Ordenar productos por cantidad descendente
         client.products.sort((a: any, b: any) => b.qty - a.qty);
      });

      // 4. FILTRAR CLIENTES VACÍOS DE HOY (La solicitud del usuario)
      // Si el cliente no tiene producción HOY (totalToday == 0), no mostramos la columna,
      // independientemente de si tuvo datos ayer.
      const activeClientsToday = sortedClients.filter(c => c.totalToday > 0);

      setData(activeClientsToday);

    } catch (e: any) { 
      console.warn('Connection failed:', e);
      setErrorMsg(e.message || 'Connection Error');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    let es: EventSource | null = null;
    let reconnectTimeout: any = null;
    
    const connectSSE = () => {
      if (es) es.close();
      es = new EventSource('/api/events');
      
      es.onopen = () => {
        setErrorMsg(null);
      };

      es.onmessage = (e) => {
        if (e.data === ':' || e.data.trim() === '') return;
        
        const rawData = e.data?.trim();
        if (!rawData) return;
        
        try {
          const msg = JSON.parse(rawData);
          // Si recibimos evento, refrescamos datos
          fetchData();
          
          if (msg.code) {
            setHighlightedCode(msg.code);
            setTimeout(() => setHighlightedCode(null), 3000);
          }
        } catch(err) {}
      };

      es.onerror = (err) => {
        es?.close();
        reconnectTimeout = setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();
    
    const interval = setInterval(fetchData, 15000);

    return () => {
      if (es) es.close();
      clearInterval(interval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [fetchData]);

  const globalTotal = useMemo(() => {
    return data.reduce((acc, client) => acc + client.products.reduce((pAcc: number, p: any) => pAcc + p.qty, 0), 0);
  }, [data]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-[#080a0f] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        view={view} 
        setView={setView} 
        onSettings={() => setIsSettingsOpen(true)}
        total={globalTotal}
        settings={settings}
      />

      <main className="flex-1 relative overflow-hidden">
        {errorMsg && (
          <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-[10px] font-black uppercase text-center py-1 z-50">
             {errorMsg} - Retrying...
          </div>
        )}

        {view === 'live' ? (
          <div className="absolute inset-0 flex overflow-x-auto items-start custom-scroll">
            {data.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center opacity-20 font-black text-slate-500">
                <p className="text-4xl uppercase tracking-[0.5em] italic">
                   {isConnecting ? 'SINCRONIZANDO...' : 'ESPERANDO DATOS...'}
                </p>
              </div>
            ) : (
              data.map((client) => (
                <ClientColumn 
                  key={client.name} 
                  group={client} 
                  darkMode={darkMode} 
                  settings={settings}
                  highlightedCode={highlightedCode}
                />
              ))
            )}
          </div>
        ) : (
          <StatsDashboard darkMode={darkMode} data={data} />
        )}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        visualSettings={settings}
        onSaveSettings={(s) => {
          setSettings(s);
          localStorage.setItem('factory_settings_v20', JSON.stringify(s));
        }}
      />
    </div>
  );
}
