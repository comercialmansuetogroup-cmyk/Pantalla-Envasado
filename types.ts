
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

export interface VisualSettings {
  logoLight: string | null;
  logoDark: string | null;
  displayMode: 'name' | 'code' | 'both';
  maxRowsPerCol: number;
  nameFontSize: number;      
  codeFontSize: number;      
  clientNameFontSize: number; 
  
  // Nuevos campos para control de %
  trendFontSize: number;       // Para productos
  clientTrendFontSize: number; // Para cabecera de cliente
  
  headerFontSize: number;

  // Nuevos campos de Estructura (Solicitud Usuario V2)
  colWidthSingle: number;    // Ancho para clientes de 1 columna (Pingüino)
  colWidthMulti: number;     // Ancho para clientes de 2+ columnas (Gran Canaria)
  rowVerticalPadding: number; // Separación vertical entre filas
  
  // NUEVO: Control de Pie de Página
  footerTotalFontSize: number;   // Tamaño del Número Grande Rojo
  footerMetricsFontSize: number; // Tamaño base de la sección derecha (Productos, Stock, etc)
}

export interface IncomingProduct {
  codigo: string;
  cantidad: number;
}

export interface IncomingZona {
  nombre: string;
  codigo_agente: string;
  nombre_agente: string;
  productos: IncomingProduct[];
}

export interface IncomingDataPayload {
  zonas: IncomingZona[];
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
  maxRowsPerCol: 18,      
  nameFontSize: 13,       
  codeFontSize: 20,       
  clientNameFontSize: 48, 
  trendFontSize: 14,
  clientTrendFontSize: 18,
  headerFontSize: 16,
  
  // Valores por defecto ajustados
  colWidthSingle: 340, 
  colWidthMulti: 520,  
  rowVerticalPadding: 8,

  // Defaults Pie de Página
  footerTotalFontSize: 60, // Tamaño del número rojo grande
  footerMetricsFontSize: 11 // Tamaño de las etiquetas de métricas (los números serán un poco más grandes proporcionalmente)
};
