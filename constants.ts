
import { IncomingDataPayload, CLIENT_MAPPING as MAPPING_SOURCE } from './types';

// Exporting directly from types to avoid duplication and inconsistencies
export const CLIENT_MAPPING = MAPPING_SOURCE;

// Colors for charts
export const CHART_COLORS = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#4b5563', '#1f2937'];

// Mock Data Generator to simulate Make webhook
export const generateMockData = (): IncomingDataPayload => {
  const productNames = [
    'Coca Cola Zero 33cl',
    'Fanta Naranja 33cl',
    'Agua Mineral 1.5L',
    'Cerveza Especial',
    'Zumo Piña',
    'Nestea Limón',
    'Aquarius',
    'Monster Energy'
  ];

  // Updated mock codes to test new mapping
  const agentCodes = ['24', '27', '26', '23', '15', '10', '14', '5', '0', '8'];

  const zones = Array.from({ length: 20 }).map(() => {
    const randomProduct = productNames[Math.floor(Math.random() * productNames.length)];
    const randomAgent = agentCodes[Math.floor(Math.random() * agentCodes.length)];
    
    return {
      nombre: 'NOMBRE_ZONA_CLIENTE',
      codigo_agente: randomAgent,
      nombre_agente: 'CLIENTE MOCK',
      productos: [
        {
          codigo: `P-${Math.floor(Math.random() * 1000)}`,
          nombre: randomProduct,
          cantidad: Math.floor(Math.random() * 50) + 1,
          stock_fisico: Math.floor(Math.random() * 20)
        }
      ]
    };
  });

  return { zonas: zones };
};
