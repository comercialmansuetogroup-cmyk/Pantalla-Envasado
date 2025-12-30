const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Token de seguridad (Debe coincidir en Make y Volt.io)
const CUSTOM_DASHBOARD_TOKEN = "DASHBOARD_V3_KEY_2025";

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// --- MEMORIA DE DATOS ---

// 1. Lo que dice Make (La "Demanda" Total acumulada del día)
// Ejemplo: Make dice que hoy se necesitan 1200 Burratas en total.
let rawMakeData = [];

// 2. Lo que dice Volt.io (Lo que YA se ha fabricado/escaneado hoy)
// Ejemplo: Ya hemos fabricado 1000 Burratas.
// Formato: { "CODIGO_PRODUCTO": CANTIDAD_ACUMULADA }
let scannedInventory = {};

// Códigos de Agente que pertenecen a Gran Canaria (Prioridad 1)
const GC_AGENTS = ['10', '14', '5', '0'];

app.use(express.static(__dirname));

/**
 * LÓGICA CENTRAL: CASCADA (WATERFALL)
 * Esta función se ejecuta cada vez que el Dashboard pide datos (cada 5 seg).
 * Calcula: [Total Pedido por Make] - [Total Ya Escaneado] = [Lo que falta en pantalla]
 */
const getProcessedData = () => {
  // Hacemos una copia profunda de los datos de Make para no modificar el original
  // "rawMakeData" siempre tiene la verdad absoluta de los pedidos TOTALES del día.
  let processedZones = JSON.parse(JSON.stringify(rawMakeData));

  // Iteramos sobre cada producto que hayamos escaneado en la App Móvil
  Object.keys(scannedInventory).forEach(productCode => {
    const totalScanned = scannedInventory[productCode];
    let remainingToDeduct = totalScanned;

    // 1. Encontrar todas las líneas en los pedidos que coincidan con este código
    let matchingLines = [];

    processedZones.forEach(zone => {
      if (zone.productos && Array.isArray(zone.productos)) {
        zone.productos.forEach(prod => {
          // Normalizamos códigos (trim) para evitar errores de espacios
          if (String(prod.codigo).trim() === String(productCode).trim()) {
            matchingLines.push({
              agentCode: String(zone.codigo_agente),
              productRef: prod // Referencia directa al objeto para poder restarle cantidad
            });
          }
        });
      }
    });

    // 2. Ordenar líneas por prioridad: Gran Canaria PRIMERO, luego el resto
    matchingLines.sort((a, b) => {
      const isGC_A = GC_AGENTS.includes(a.agentCode);
      const isGC_B = GC_AGENTS.includes(b.agentCode);
      if (isGC_A && !isGC_B) return -1; // A (GC) va antes
      if (!isGC_A && isGC_B) return 1;  // B (GC) va antes
      return 0; // Igual prioridad
    });

    // 3. Aplicar la resta en cascada (Waterfall)
    // Vamos restando la cantidad escaneada a las líneas de pedido en orden.
    for (let line of matchingLines) {
      if (remainingToDeduct <= 0) break; // Ya hemos descontado todo lo escaneado

      const currentQty = Number(line.productRef.cantidad) || 0;
      
      // Cuánto podemos restar de esta línea específica
      const deduction = Math.min(currentQty, remainingToDeduct);
      
      // Aplicamos la resta al pedido
      line.productRef.cantidad = currentQty - deduction;
      
      // Reducimos lo que nos queda por descontar
      remainingToDeduct -= deduction;
    }
  });

  // 4. LIMPIEZA FINAL:
  // Si la cantidad de un producto llega a 0 (o menos), ELIMINAMOS la línea.
  // Si una zona (cliente) se queda sin productos, ELIMINAMOS la zona.
  const finalZones = processedZones.map(zone => {
    if (zone.productos && Array.isArray(zone.productos)) {
      zone.productos = zone.productos.filter(p => (Number(p.cantidad) || 0) > 0);
    }
    return zone;
  }).filter(zone => zone.productos && zone.productos.length > 0);

  return finalZones;
};

/**
 * ENDPOINT 1: GET /api/data (Para el Dashboard Web)
 * Devuelve los datos YA PROCESADOS (restados y filtrados).
 */
app.get('/api/data', (req, res) => {
  const cleanData = getProcessedData();
  res.json({ zonas: cleanData });
});

/**
 * ENDPOINT 2: POST /api/scan (Para Volt.io App Móvil)
 * Recibe un escaneo individual y lo suma al acumulado del día.
 * NO sobrescribe, SUMA.
 */
app.post('/api/scan', (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${CUSTOM_DASHBOARD_TOKEN}`;

  if (!authHeader || authHeader !== expectedToken) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const { codigo, cantidad } = req.body;

  if (!codigo || cantidad === undefined) {
    return res.status(400).json({ error: 'Faltan datos: codigo, cantidad' });
  }

  const codeKey = String(codigo).trim();
  const qtyNum = Number(cantidad);

  if (!scannedInventory[codeKey]) {
    scannedInventory[codeKey] = 0;
  }

  // Sumamos al inventario escaneado
  scannedInventory[codeKey] += qtyNum;

  console.log(`📱 SCAN APP: Código ${codeKey} (+${qtyNum}). Total escaneado hoy: ${scannedInventory[codeKey]}`);
  
  // Respondemos con el nuevo total acumulado de ese producto
  res.json({ 
    status: 'scan_received', 
    product: codeKey,
    total_scanned_today: scannedInventory[codeKey]
  });
});

/**
 * ENDPOINT 3: POST /api/webhook (Para Make)
 * Actualiza la demanda TOTAL del día.
 * IMPORTANTE: No borra lo escaneado. Solo actualiza la "lista de deseos".
 */
app.post('/api/webhook', (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${CUSTOM_DASHBOARD_TOKEN}`;

  if (!authHeader || authHeader !== expectedToken) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  if (req.body && req.body.zonas && Array.isArray(req.body.zonas)) {
    const timestamp = new Date().toISOString();
    
    // Sobrescribimos rawMakeData con la nueva foto completa de Make
    rawMakeData = req.body.zonas.map(z => ({ 
      ...z, 
      receivedAt: timestamp 
    }));
    
    console.log(`📥 WEBHOOK MAKE: ${rawMakeData.length} zonas recibidas. Se recalcularán los pendientes.`);
    
    return res.status(200).json({ status: 'ok' });
  }
  
  res.status(400).json({ error: 'Formato incorrecto' });
});

/**
 * ENDPOINT 4: POST /api/reset (Reinicio Total - Botón de Pánico o Fin de Día)
 * Borra TANTO los datos de Make COMO el inventario escaneado.
 */
app.post('/api/reset', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${CUSTOM_DASHBOARD_TOKEN}`) {
    rawMakeData = [];
    scannedInventory = {}; // Reseteamos a cero todo
    console.log('🔄 RESET COMPLETO: Sistema limpio.');
    return res.json({ status: 'reset_ok' });
  }
  res.status(401).json({ error: 'No autorizado' });
});

app.get('*', (req, res) => {
  const ext = path.extname(req.url);
  if (ext && ext !== '.html') return res.status(404).send('Not found');
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 FACTORYFLOW PRO - SERVIDOR ACTIVO EN PUERTO ${PORT}`);
  console.log(`🔑 TOKEN ACTIVO: ${CUSTOM_DASHBOARD_TOKEN}`);
});