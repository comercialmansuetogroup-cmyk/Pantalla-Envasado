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

// 1. Lo que dice Make (La "Demanda" Total del día)
let rawMakeData = [];

// 2. Lo que dice Volt.io (Lo que ya se ha fabricado/escaneado)
// Formato: { "CODIGO_PRODUCTO": CANTIDAD_ACUMULADA }
let scannedInventory = {};

// Códigos de Agente que pertenecen a Gran Canaria (Prioridad 1)
const GC_AGENTS = ['10', '14', '5', '0'];

app.use(express.static(__dirname));

/**
 * LÓGICA CENTRAL: CASCADA (WATERFALL)
 * Resta el inventario escaneado a la demanda de Make, priorizando GC.
 */
const getProcessedData = () => {
  // Hacemos una copia profunda para no modificar el original
  let processedZones = JSON.parse(JSON.stringify(rawMakeData));

  // Iteramos sobre cada producto que hayamos escaneado
  Object.keys(scannedInventory).forEach(productCode => {
    const totalScanned = scannedInventory[productCode];
    let remainingToDeduct = totalScanned;

    // 1. Encontrar todas las líneas que coincidan con este código de producto
    // Nota: Buscamos dentro de los arrays de 'productos' de cada zona
    let matchingLines = [];

    processedZones.forEach(zone => {
      if (zone.productos && Array.isArray(zone.productos)) {
        zone.productos.forEach(prod => {
          // Normalizamos códigos para evitar errores de espacios
          if (String(prod.codigo).trim() === String(productCode).trim()) {
            matchingLines.push({
              agentCode: String(zone.codigo_agente),
              productRef: prod // Referencia al objeto para modificarlo directamente
            });
          }
        });
      }
    });

    // 2. Ordenar líneas por prioridad: Gran Canaria primero, luego el resto
    matchingLines.sort((a, b) => {
      const isGC_A = GC_AGENTS.includes(a.agentCode);
      const isGC_B = GC_AGENTS.includes(b.agentCode);
      if (isGC_A && !isGC_B) return -1; // A va antes
      if (!isGC_A && isGC_B) return 1;  // B va antes
      return 0; // Igual prioridad
    });

    // 3. Aplicar la resta en cascada
    for (let line of matchingLines) {
      if (remainingToDeduct <= 0) break;

      const currentQty = Number(line.productRef.cantidad) || 0;
      
      // Cuánto podemos restar de esta línea
      const deduction = Math.min(currentQty, remainingToDeduct);
      
      // Aplicamos resta
      line.productRef.cantidad = currentQty - deduction;
      remainingToDeduct -= deduction;
    }
  });

  // 4. LIMPIEZA: Eliminar líneas que hayan quedado en 0 o negativo
  // Y si una zona se queda sin productos, eliminar la zona entera.
  const finalZones = processedZones.map(zone => {
    if (zone.productos && Array.isArray(zone.productos)) {
      zone.productos = zone.productos.filter(p => (Number(p.cantidad) || 0) > 0);
    }
    return zone;
  }).filter(zone => zone.productos && zone.productos.length > 0);

  return finalZones;
};

/**
 * ENDPOINT 1: GET /api/data (Para el Dashboard)
 * Devuelve los datos YA PROCESADOS (restados y filtrados).
 */
app.get('/api/data', (req, res) => {
  const cleanData = getProcessedData();
  res.json({ zonas: cleanData });
});

/**
 * ENDPOINT 2: POST /api/scan (Para Volt.io App)
 * Recibe un escaneo y lo suma al inventario acumulado.
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

  scannedInventory[codeKey] += qtyNum;

  console.log(`📱 SCAN RECIBIDO: ${codeKey} (+${qtyNum}). Total escaneado hoy: ${scannedInventory[codeKey]}`);
  
  res.json({ 
    status: 'scan_received', 
    product: codeKey,
    total_scanned_today: scannedInventory[codeKey]
  });
});

/**
 * ENDPOINT 3: POST /api/webhook (Para Make)
 * Actualiza la demanda total, PERO NO BORRA lo escaneado.
 */
app.post('/api/webhook', (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${CUSTOM_DASHBOARD_TOKEN}`;

  if (!authHeader || authHeader !== expectedToken) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  if (req.body && req.body.zonas && Array.isArray(req.body.zonas)) {
    const timestamp = new Date().toISOString();
    // Guardamos la nueva "Verdad" de Make
    rawMakeData = req.body.zonas.map(z => ({ 
      ...z, 
      receivedAt: timestamp 
    }));
    
    console.log(`📥 WEBHOOK MAKE: Datos actualizados. ${rawMakeData.length} zonas recibidas.`);
    console.log(`ℹ️ Inventario escaneado se mantiene intacto para aplicar resta.`);
    
    return res.status(200).json({ status: 'ok' });
  }
  
  res.status(400).json({ error: 'Formato incorrecto' });
});

/**
 * ENDPOINT 4: POST /api/reset (Reinicio total diario)
 * Borra TANTO los datos de Make COMO el inventario escaneado.
 */
app.post('/api/reset', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${CUSTOM_DASHBOARD_TOKEN}`) {
    rawMakeData = [];
    scannedInventory = {}; // IMPORTANTE: Reseteamos también los escaneos
    console.log('🔄 RESET COMPLETO EJECUTADO');
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
  console.log(`🚀 FACTORYFLOW PRO - SERVER RUNNING ON PORT ${PORT}`);
});