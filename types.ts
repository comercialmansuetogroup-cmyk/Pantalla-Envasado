
export type TimeFilter = 'week' | 'month' | 'quarter' | 'year';

export interface Product {
  name: string;
  code: string;
  qty: number;
  stock: number;
  toProduce: number;
  rowId: string;
  trend: number;
}

export interface ClientGroup {
  name: string;
  products: Product[];
  clientId?: string;
  code?: string;
}

// Added missing interface for product payloads in webhooks
export interface ProductPayload {
  codigo: string;
  cantidad: number;
  stock_fisico?: number;
}

// Added missing interface for zone payloads in webhooks
export interface ZonaPayload {
  nombre: string;
  codigo_agente: string;
  nombre_agente: string;
  productos?: ProductPayload[];
}

// Fix for: Error in file constants.ts on line 1: Module '"./types"' has no exported member 'IncomingDataPayload'.
export interface IncomingDataPayload {
  zonas: ZonaPayload[];
}

export interface VisualSettings {
  logoLight: string | null;
  logoDark: string | null;
  // Fix for: Property 'displayMode' does not exist on type 'VisualSettings' in ProductRow.tsx
  displayMode: 'name' | 'code' | 'both';
  maxRowsPerCol: number;
  nameFontSize: number;      
  codeFontSize: number;      
  clientNameFontSize: number; 
  trendFontSize: number;     
  headerFontSize: number;
}

export const CLIENT_MAPPING: Record<string, string> = {
  '24': 'FILIPPO', 
  '26': 'PINGÜINO', 
  '23': 'LA PALMA', 
  '15': 'TENERIFE NORTE',
  '10': 'GRAN CANARIA', 
  '14': 'GRAN CANARIA', 
  '5': 'GRAN CANARIA', 
  '0': 'GRAN CANARIA',
  '8': 'GRAN CANARIA'
};

export const DEFAULT_SETTINGS: VisualSettings = {
  logoLight: null,
  logoDark: null,
  // Added default value for missing displayMode property
  displayMode: 'both',
  maxRowsPerCol: 22,      
  nameFontSize: 11,       
  codeFontSize: 15,       
  clientNameFontSize: 32, 
  trendFontSize: 11,
  headerFontSize: 10
};
