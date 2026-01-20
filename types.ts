
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
  nombre_producto?: string; // Nuevo campo JSON V4
  nombre?: string; // Legacy
  cantidad: number;
  stock_fisico?: number;
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

// MAPPING ACTUALIZADO SEGÚN SOLICITUD V3
// Se han añadido variantes con cero a la izquierda ('05', '08', '010', '014') por seguridad.
export const CLIENT_MAPPING: Record<string, string> = {
  '24': 'FILIPPO', '024': 'FILIPPO',
  '27': 'PINGÜINO', '027': 'PINGÜINO',
  '26': 'TENERIFE SUR', '026': 'TENERIFE SUR',
  '23': 'LA PALMA', '023': 'LA PALMA',
  '15': 'TENERIFE NORTE', '015': 'TENERIFE NORTE',
  
  // GRUPO GRAN CANARIA COMPLETO (Suma de códigos: 10, 14, 5, 0, 8)
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
