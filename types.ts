
// TimeFilter type for production analysis
export type TimeFilter = 'week' | 'month' | 'quarter' | 'year';

// IncomingDataPayload interface for webhook data handling
export interface IncomingDataPayload {
  zonas: Array<{
    nombre: string;
    codigo_agente: string;
    nombre_agente: string;
    productos: Array<{
      codigo: string;
      cantidad: number;
    }>;
  }>;
}

export interface Product {
  name: string;
  code: string;
  qty: number;
  stock: number;
  toProduce: number;
  rowId: string;
  trend: number;
}

// ClientGroup used for dashboard columns
export interface ClientGroup {
  name: string;
  products: Product[];
  clientId?: string;
  code?: string;
}

export interface ClientData {
  name: string;
  products: Product[];
  total: number;
  totalTrend: number;
  clientId?: string;
  code?: string;
}

export interface VisualSettings {
  logoLight: string | null;
  logoDark: string | null;
  displayMode: 'name' | 'code' | 'both';
  maxRowsPerCol: number;
  nameFontSize: number;      
  codeFontSize: number;      
  clientNameFontSize: number; 
  tableHeaderFontSize: number; 
  trendFontSize: number;     
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
  displayMode: 'both',
  maxRowsPerCol: 22,      
  nameFontSize: 11,       
  codeFontSize: 14,       
  clientNameFontSize: 28, 
  tableHeaderFontSize: 9, 
  trendFontSize: 10,      
};
