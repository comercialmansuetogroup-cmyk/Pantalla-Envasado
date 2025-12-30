import { IncomingDataPayload } from './types';

// Client Mapping based on Agent Codes
// Filippo 24, Pingüino 26, Insólito 23, Tenerife norte 15, Gran canaria 10, 14, 5
export const CLIENT_MAPPING: Record<string, string> = {
  '24': 'Filippo',
  '26': 'Pingüino',
  '23': 'Insólito',
  '15': 'Tenerife Norte',
  '10': 'Gran Canaria',
  '14': 'Gran Canaria',
  '5': 'Gran Canaria',
};

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

  const agentCodes = ['24', '26', '23', '15', '10', '14', '5'];

  const zones = Array.from({ length: 15 }).map(() => {
    const randomProduct = productNames[Math.floor(Math.random() * productNames.length)];
    const randomAgent = agentCodes[Math.floor(Math.random() * agentCodes.length)];
    
    return {
      nombre: randomProduct,
      codigo_agente: randomAgent,
      nombre_agente: 'Agent Name Placeholder',
      productos: [
        {
          codigo: `P-${Math.floor(Math.random() * 1000)}`,
          cantidad: Math.floor(Math.random() * 50) + 1
        },
        // Sometimes a line has multiple entries for the same base product logic if needed
        {
            codigo: `P-${Math.floor(Math.random() * 1000)}`,
            cantidad: Math.floor(Math.random() * 10)
        }
      ]
    };
  });

  return { zonas: zones };
};