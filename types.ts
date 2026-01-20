
export type TimeFilter = 'week' | 'month' | 'quarter' | 'year';

export interface Product {
  name: string;
  code: string;
  qty: number;
  stock: number;
  toProduce?: number;
  rowId?: string;
  trend: number;
  yesterdayQty?: number;
}

export interface ClientGroup {
  name: string;
  products: Product[];
  clientId?: string;
  code?: string;
  totalToday?: number;
  totalYesterday?: number;
  trend?: number;
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
  clientTrendFontSize: number; 
  headerFontSize: number;
  colWidthSingle: number;    
  colWidthMulti: number;     
  rowVerticalPadding: number; 
  footerTotalFontSize: number;   
  footerMetricsFontSize: number; 
}

export interface IncomingProduct {
  codigo: string;
  codigo_producto?: string; // Alternativa Make
  nombre_producto?: string; // CAMPO CLAVE
  nombre?: string; 
  cantidad: number;
  cantidad_producto?: number;
  stock_fisico?: number;
}

export interface IncomingZona {
  nombre: string;
  nombre_comercial?: string;
  codigo_agente: string;
  nombre_agente: string;
  productos: IncomingProduct[];
}

export interface IncomingDataPayload {
  zonas: IncomingZona[];
}

export const CLIENT_MAPPING: Record<string, string> = {
  '24': 'FILIPPO', '024': 'FILIPPO',
  '27': 'PINGÜINO', '027': 'PINGÜINO',
  '26': 'TENERIFE SUR', '026': 'TENERIFE SUR',
  '23': 'LA PALMA', '023': 'LA PALMA',
  '15': 'TENERIFE NORTE', '015': 'TENERIFE NORTE',
  '10': 'GRAN CANARIA', '010': 'GRAN CANARIA',
  '14': 'GRAN CANARIA', '014': 'GRAN CANARIA', 
  '5': 'GRAN CANARIA', '05': 'GRAN CANARIA', '005': 'GRAN CANARIA',
  '0': 'GRAN CANARIA', '00': 'GRAN CANARIA',
  '8': 'GRAN CANARIA', '08': 'GRAN CANARIA', '008': 'GRAN CANARIA'
};

export const DEFAULT_SETTINGS: VisualSettings = {
  logoLight: null,
  logoDark: null,
  displayMode: 'both',
  maxRowsPerCol: 20,
  nameFontSize: 12,
  codeFontSize: 14,
  clientNameFontSize: 24,
  trendFontSize: 10,
  clientTrendFontSize: 12,
  headerFontSize: 16,
  colWidthSingle: 340,
  colWidthMulti: 520,
  rowVerticalPadding: 8,
  footerTotalFontSize: 32,
  footerMetricsFontSize: 12
};
