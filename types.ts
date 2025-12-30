export interface ProductItem {
  codigo: string;
  cantidad: number;
}

export interface IncomingZoneData {
  nombre: string;
  codigo_agente: string;
  nombre_agente?: string;
  productos: ProductItem[];
}

export interface IncomingDataPayload {
  zonas: IncomingZoneData[];
}

export interface AggregatedProduct {
  name: string;
  totalQuantity: number;
}

export interface ClientGroup {
  clientId: string;
  clientName: string;
  products: AggregatedProduct[];
  grandTotal: number;
}

export type TimeFilter = 'week' | 'month' | 'quarter' | 'year';

export interface AppSettings {
  webhookUrl: string;
  apiKey: string;      // This can be the Webhook ID or the Make API Token
  region: string;      // eu1, us1, etc.
  refreshRate: number;
  useMockData: boolean;
  useProxy: boolean;   // Added to solve CORS issues in frontend-only environments
}
