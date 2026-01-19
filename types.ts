
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
  totalToday: number;
  totalYesterday: number;
  trend: number;
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

export interface IncomingProductPayload {
  codigo: string;
  cantidad: number;
  stock_fisico?: number;
}

export interface IncomingZonePayload {
  nombre: string;
  codigo_agente: string;
  nombre_agente: string;
  productos: IncomingProductPayload[];
  cantidad?: number;
  stock_fisico?: number;
}

export interface IncomingDataPayload {
  zonas: IncomingZonePayload[];
}

export const CLIENT_MAPPING: Record<string, string> = {
  '24': 'FILIPPO', 
  '27': 'PINGÜINO',      
  '26': 'TENERIFE SUR',  
  '23': 'LA PALMA', 
  '15': 'TENERIFE NORTE',
  
  // TRANSPORTES
  'INTEGRA': 'INTEGRA TRANSPORTE',
  
  // GRUPO GRAN CANARIA
  '10': 'GRAN CANARIA', 
  '14': 'GRAN CANARIA', 
  '5': 'GRAN CANARIA', '05': 'GRAN CANARIA',
  '0': 'GRAN CANARIA', '00': 'GRAN CANARIA',
  '8': 'GRAN CANARIA', '08': 'GRAN CANARIA'
};

export const DEFAULT_SETTINGS: VisualSettings = {
  logoLight: null,
  logoDark: null,
  displayMode: 'both',
  maxRowsPerCol: 18,      
  nameFontSize: 13,       
  codeFontSize: 20,       
  clientNameFontSize: 48, 
  trendFontSize: 14,
  clientTrendFontSize: 18,
  headerFontSize: 16,
  
  colWidthSingle: 340, 
  colWidthMulti: 520,  
  rowVerticalPadding: 8,

  footerTotalFontSize: 60, 
  footerMetricsFontSize: 11 
};