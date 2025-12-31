
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

export interface ProductPayload {
  codigo: string;
  cantidad: number;
  stock_fisico?: number;
}

export interface ZonaPayload {
  nombre: string;
  codigo_agente: string;
  nombre_agente: string;
  productos?: ProductPayload[];
}

export interface IncomingDataPayload {
  zonas: ZonaPayload[];
}

export interface VisualSettings {
  logoLight: string | null;
  logoDark: string | null;
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
  '8': 'GRAN CANARIA' // Agregado código 8 solicitado
};

export const DEFAULT_SETTINGS: VisualSettings = {
  logoLight: null,
  logoDark: null,
  displayMode: 'both',
  maxRowsPerCol: 22,      
  nameFontSize: 11,       
  codeFontSize: 16,       
  clientNameFontSize: 36, 
  trendFontSize: 11,
  headerFontSize: 12
};
