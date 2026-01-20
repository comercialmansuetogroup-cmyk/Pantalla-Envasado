
import { IncomingDataPayload, CLIENT_MAPPING as MAPPING_SOURCE } from './types';

export const CLIENT_MAPPING = MAPPING_SOURCE;
export const CHART_COLORS = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#4b5563', '#1f2937'];

// Mock Data Generator exacto según tu JSON de Make
export const generateMockData = (): IncomingDataPayload => {
  const productNames = [
    'Coca Cola Zero 33cl', 'Fanta Naranja 33cl', 'Agua Mineral 1.5L',
    'Cerveza Especial', 'Zumo Piña', 'RICOTTA FRESCA 5 KG BANDEJA'
  ];
  const agentCodes = ['14', '24', '10'];

  const zones = Array.from({ length: 3 }).map(() => {
    const randomProduct = productNames[Math.floor(Math.random() * productNames.length)];
    const randomAgentCode = agentCodes[Math.floor(Math.random() * agentCodes.length)];
    
    return {
      nombre: "COMERCIAL ZONA SUR",
      codigo_agente: randomAgentCode,
      nombre_agente: "COMERCIAL ZONA SUR",
      productos: [
        {
          codigo: `PROD-${Math.floor(Math.random() * 100)}`,
          nombre_producto: randomProduct, // Campo clave
          cantidad: Math.floor(Math.random() * 50) + 1,
          stock_fisico: Math.floor(Math.random() * 20)
        }
      ]
    };
  });

  return { zonas: zones };
};
