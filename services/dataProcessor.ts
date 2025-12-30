import { IncomingDataPayload, ClientGroup } from '../types';
import { CLIENT_MAPPING } from '../constants';

/**
 * Procesa el JSON crudo de Make y agrupa los productos por Cliente
 * basándose en el mapeo de códigos de agentes comerciales.
 */
export const processIncomingData = (data: IncomingDataPayload): ClientGroup[] => {
  if (!data || !data.zonas) return [];

  const clientMap = new Map<string, ClientGroup>();

  data.zonas.forEach((zona) => {
    // 1. Identificar Cliente (limpiamos el código por si viene con espacios o caracteres extraños)
    const agentCodeRaw = String(zona.codigo_agente || '').trim();
    
    // El cliente es la entidad que agrupa varios códigos
    const clientName = CLIENT_MAPPING[agentCodeRaw] || `Cliente Desconocido (Ref: ${agentCodeRaw})`;
    
    // Usamos el nombre del cliente como clave de agrupación
    const mapKey = clientName;

    if (!clientMap.has(mapKey)) {
      clientMap.set(mapKey, {
        clientId: mapKey,
        clientName: clientName,
        products: [],
        grandTotal: 0
      });
    }

    const clientGroup = clientMap.get(mapKey)!;

    // 2. Calcular total de esta línea/entrada
    const entryTotal = Array.isArray(zona.productos) 
      ? zona.productos.reduce((acc, p) => acc + (Number(p.cantidad) || 0), 0)
      : 0;

    // 3. Agrupar por nombre de producto dentro del cliente
    const productName = String(zona.nombre || 'Producto sin nombre').trim();
    const existingProductIndex = clientGroup.products.findIndex(p => p.name === productName);

    if (existingProductIndex >= 0) {
      clientGroup.products[existingProductIndex].totalQuantity += entryTotal;
    } else {
      clientGroup.products.push({
        name: productName,
        totalQuantity: entryTotal
      });
    }

    // 4. Actualizar Gran Total de la columna (Cliente)
    clientGroup.grandTotal += entryTotal;
  });

  // Convertir a Array y ordenar alfabéticamente por cliente
  return Array.from(clientMap.values()).sort((a, b) => a.clientName.localeCompare(b.clientName));
};
