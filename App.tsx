
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
      
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      
      const raw = await res.json();
      
      // --- FASE 1: AGRUPACIÓN POR CLIENTE ---
      const groups: Record<string, any> = {};

      if (Array.isArray(raw)) {
        raw.forEach((row: any) => {
          // Ignorar filas vacías
          if (Number(row.total_qty) === 0 && Number(row.yesterday_qty) === 0 && Number(row.global_stock) === 0) return;

          const rawCode = String(row.agent_code ?? '').trim();
          const rawAgentName = String(row.agent_name ?? '').trim().toUpperCase();
          
          // 1. DETERMINAR NOMBRE DEL CLIENTE (COLUMNA)
          let clientName = CLIENT_MAPPING[rawCode];

          if (!clientName) {
             // Fallback por nombre para INTEGRA y otros
             if (rawAgentName.includes('INTEGRA')) clientName = 'INTEGRA TRANSPORTE';
             else if (rawAgentName.includes('TENERIFE NORTE')) clientName = 'TENERIFE NORTE';
             else if (rawAgentName.includes('TENERIFE SUR')) clientName = 'TENERIFE SUR';
             else clientName = rawAgentName || `AGENTE ${rawCode}`;
          }
          
          if (!groups[clientName]) {
            groups[clientName] = { 
              name: clientName, 
              products: [], // Aquí meteremos los productos
              totalToday: 0,
              totalYesterday: 0
            };
          }
          
          // --- FASE 2: GESTIÓN DE PRODUCTOS ---
          const qtyToday = Number(row.total_qty);
          const qtyYesterday = Number(row.yesterday_qty);
          const stockReal = Number(row.global_stock); // Este viene de la tabla inventory en la query SQL
          
          // Buscar si el producto ya existe en este cliente (para agrupar si viene repetido)
          const existingProd = groups[clientName].products.find((p: any) => p.code === row.product_code);
          
          if (existingProd) {
             existingProd.qty += qtyToday;
             existingProd.yesterdayQty += qtyYesterday;
             // El stock es global por producto, no se suma, se toma el valor actual
             existingProd.stock = stockReal; 
          } else {
            groups[clientName].products.push({
              code: row.product_code,
              name: row.product_name, // Esto ya viene limpio desde server.js
              qty: qtyToday,
              yesterdayQty: qtyYesterday, 
              stock: stockReal, 
              trend: 0
            });
          }

          groups[clientName].totalToday += qtyToday;
          groups[clientName].totalYesterday += qtyYesterday;
        });
      }

      // --- FASE 3: ORDENAMIENTO Y CÁLCULOS FINALES ---
      const sortedClients = Object.values(groups).sort((a,b) => {
        // Gran Canaria siempre primero (opcional, por orden alfabético iría después de G)
        if(a.name === 'GRAN CANARIA') return -1;
        if(b.name === 'GRAN CANARIA') return 1;
        return a.name.localeCompare(b.name);
      });

      sortedClients.forEach(client => {
         // Calcular tendencia Cliente
         let clientTrend = 0;
         if (client.totalYesterday > 0) {
            clientTrend = ((client.totalToday - client.totalYesterday) / client.totalYesterday) * 100;
         } else if (client.totalToday > 0) {
            clientTrend = 100;
         }
         client.trend = clientTrend;

         // Calcular tendencias Productos y Pendientes
         client.products.forEach((p: any) => {
             let prodTrend = 0;
             if (p.yesterdayQty > 0) {
                prodTrend = ((p.qty - p.yesterdayQty) / p.yesterdayQty) * 100;
             } else if (p.qty > 0) {
                prodTrend = 100;
             }
             p.trend = prodTrend;
             
             // Aquí no necesitamos calcular 'stock asignado' complejo si el stock ya viene dedicado
             // Pero asumiendo que el stock es global para el producto (sin importar cliente)
             // Simplemente mostramos el stock disponible.
             // El 'Pendiente' (lo que falta por producir) es Total Pedido - Stock (si es positivo)
             // NOTA: Si quieres lógica de asignación (repartir stock entre clientes), avísame. 
             // Por ahora: Pendiente = Max(0, Cantidad - Stock)
         });
         
         // Ordenar productos por cantidad (Mayor a menor)
         client.products.sort((a: any, b: any) => b.qty - a.qty);
      });

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
      es.onopen = () => setErrorMsg(null);
      es.onmessage = (e) => {
        if (e.data === ':' || e.data.trim() === '') return;
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'RESET') { window.location.reload(); return; }
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
