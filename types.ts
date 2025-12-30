export interface Product {
  name: string;
  code: string;
  qty: number;
  stock: number;
  toProduce: number;
  rowId: string;
  trend: number;
}

export interface ClientData {
  name: string;
  products: Map<string, any> | Product[];
  productsArray: Product[];
  total: number;
  totalTrend: number;
  clientId?: string;
}

export interface ClientGroup extends ClientData {
  products: Product[];
}

export interface IncomingDataPayload {
  zonas: any[];
}

export type TimeFilter = 'week' | 'month' | 'quarter' | 'year';

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
  '24': 'FILIPPO', '26': 'PINGÜINO', '23': 'LA PALMA', '15': 'TENERIFE NORTE',
  '10': 'GRAN CANARIA', '14': 'GRAN CANARIA', '5': 'GRAN CANARIA', '0': 'GRAN CANARIA'
};

export const DEFAULT_SETTINGS: VisualSettings = {
  logoLight: null,
  logoDark: null,
  displayMode: 'name',
  maxRowsPerCol: 22,      
  nameFontSize: 15,       
  codeFontSize: 18,       
  clientNameFontSize: 30, 
  tableHeaderFontSize: 10, 
  trendFontSize: 15,      
};