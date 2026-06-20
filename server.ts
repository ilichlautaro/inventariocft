/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { initialData } from './src/data/initialData';
import { DatabaseState, InventoryItem, CurricularCompetency, PedagogicalTraceability, StockMovement, KitRequest } from './src/types';
import {
  getGoogleSheetsClient,
  findOrCreateSpreadsheet,
  readAllFromGoogleSheets,
  writeAllToGoogleSheets
} from './src/lib/googleSheetsDb';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Persistent database file setup
const DB_PATH = path.join(process.cwd(), 'src', 'data', 'db.json');

// Ensure database file is initialized with seed data if absent
function getDatabaseState(): DatabaseState {
  try {
    const parentDir = path.dirname(DB_PATH);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(content) as DatabaseState;
  } catch (error) {
    console.error("Error accessing db.json, returning default seed:", error);
    return initialData;
  }
}

function saveDatabaseState(state: DatabaseState): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error("Error writing to db.json:", error);
  }
}

// Ensure database setup runs immediately on load
let db = getDatabaseState();

// Get active database state, either from Google Sheets or from local db.json
async function getActiveDatabaseState(req: express.Request): Promise<{ state: DatabaseState; spreadsheetUrl?: string }> {
  const googleClient = getGoogleSheetsClient(req.headers);
  if (!googleClient) {
    const localState = getDatabaseState();
    return { state: localState };
  }

  try {
    const localState = getDatabaseState();
    const spreadsheetId = await findOrCreateSpreadsheet(googleClient.drive, googleClient.sheets, localState);
    const state = await readAllFromGoogleSheets(googleClient.sheets, spreadsheetId);
    
    // Save to local cache just in case we need it offline
    saveDatabaseState(state);
    
    return {
      state,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    };
  } catch (error) {
    console.error("Error syncing with Google Sheets, falling back to local database:", error);
    const localState = getDatabaseState();
    return { state: localState };
  }
}

// Persist the state to either Google Sheets or local db.json
async function saveActiveDatabaseState(req: express.Request, newState: DatabaseState): Promise<void> {
  // Always write locally first to keep fallback in sync
  saveDatabaseState(newState);

  const googleClient = getGoogleSheetsClient(req.headers);
  if (googleClient) {
    try {
      const spreadsheetId = await findOrCreateSpreadsheet(googleClient.drive, googleClient.sheets, newState);
      await writeAllToGoogleSheets(googleClient.sheets, spreadsheetId, newState);
    } catch (error) {
      console.error("Failed to persist update to Google Sheets:", error);
    }
  }
}

// Initialize the Gemini AI SDK client lazily as per best practices
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no se encuentra configurada en las constantes del entorno.');
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// --- API ENDPOINTS ---

// Get current state of the database
app.get('/api/db', async (req, res) => {
  const { state, spreadsheetUrl } = await getActiveDatabaseState(req);
  res.json({ ...state, spreadsheetUrl });
});

// Reset the database state of the application to default seeds
app.post('/api/db/reset', async (req, res) => {
  await saveActiveDatabaseState(req, initialData);
  res.json({ success: true, message: "Base de datos restaurada con éxito", db: initialData });
});

// Overwrite database state with incoming state (used to sync/preserve local modifications)
app.post('/api/db/overwrite', async (req, res) => {
  const incomingState = req.body as DatabaseState;
  if (!incomingState || !incomingState.inventory || !incomingState.competencies) {
    return res.status(400).json({ error: "Datos de estado inválidos" });
  }
  await saveActiveDatabaseState(req, incomingState);
  res.json({ success: true, db: incomingState });
});

// --- INVENTORY ENDPOINTS (Bodeguero & Coordinador rights) ---
app.post('/api/inventory', async (req, res) => {
  const { state } = await getActiveDatabaseState(req);
  const newItem: InventoryItem = {
    ...req.body,
    id: `inv_${Date.now()}`
  };
  state.inventory.push(newItem);
  
  // Create system log representation
  const log: StockMovement = {
    id: `move_${Date.now()}`,
    itemId: newItem.id,
    itemName: newItem.name,
    type: 'entrada',
    quantity: newItem.stock,
    user: req.body.activeUserLabel || "Sistema",
    timestamp: new Date().toISOString(),
    reason: "Registro inicial de nuevo insumo en almacén CFT"
  };
  state.movements.unshift(log);
  
  await saveActiveDatabaseState(req, state);
  res.status(201).json({ item: newItem, db: state });
});

app.put('/api/inventory/:id', async (req, res) => {
  const { state } = await getActiveDatabaseState(req);
  const { id } = req.params;
  const index = state.inventory.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Insumo no encontrado." });
  }

  const oldItem = state.inventory[index];
  const updatedItem: InventoryItem = {
    ...oldItem,
    ...req.body,
    id // Safety block
  };
  
  state.inventory[index] = updatedItem;

  // Log stock changes automatically if changed
  const stockDifference = updatedItem.stock - oldItem.stock;
  if (stockDifference !== 0) {
    const log: StockMovement = {
      id: `move_${Date.now()}`,
      itemId: id,
      itemName: updatedItem.name,
      type: stockDifference > 0 ? 'entrada' : 'salida',
      quantity: Math.abs(stockDifference),
      user: req.body.activeUserLabel || "Usuario CFT",
      timestamp: new Date().toISOString(),
      reason: req.body.updateReason || `Ajuste manual de stock por bodega (${oldItem.stock} -> ${updatedItem.stock})`
    };
    state.movements.unshift(log);
  }

  await saveActiveDatabaseState(req, state);
  res.json({ item: updatedItem, db: state });
});

app.delete('/api/inventory/:id', async (req, res) => {
  const { state } = await getActiveDatabaseState(req);
  const { id } = req.params;
  const index = state.inventory.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Insumo no encontrado." });
  }

  const name = state.inventory[index].name;
  state.inventory.splice(index, 1);
  
  // Also clean required items lists in traceability that pointed to this id
  state.traceability = state.traceability.map(t => ({
    ...t,
    requiredItems: t.requiredItems.filter(item => item.itemId !== id)
  }));

  // Log deletion
  const log: StockMovement = {
    id: `move_${Date.now()}`,
    itemId: id,
    itemName: name,
    type: 'ajuste',
    quantity: 0,
    user: (req.query.user as string) || "Bodeguero Senior",
    timestamp: new Date().toISOString(),
    reason: `Insumo eliminado por completo del catálogo de inventario`
  };
  state.movements.unshift(log);

  await saveActiveDatabaseState(req, state);
  res.json({ success: true, db: state });
});

// --- COMPETENCIES & CURRICULUM ENDPOINTS ---
app.post('/api/competencies', async (req, res) => {
  const { state } = await getActiveDatabaseState(req);
  const newComp: CurricularCompetency = {
    ...req.body,
    id: `comp_${Date.now()}`
  };
  state.competencies.push(newComp);
  await saveActiveDatabaseState(req, state);
  res.status(201).json({ competency: newComp, db: state });
});

app.put('/api/competencies/:id', async (req, res) => {
  const { state } = await getActiveDatabaseState(req);
  const { id } = req.params;
  const index = state.competencies.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Asignatura o Competencia no encontrada." });
  }

  state.competencies[index] = {
    ...state.competencies[index],
    ...req.body,
    id
  };
  await saveActiveDatabaseState(req, state);
  res.json({ competency: state.competencies[index], db: state });
});

app.delete('/api/competencies/:id', async (req, res) => {
  const { state } = await getActiveDatabaseState(req);
  const { id } = req.params;
  const index = state.competencies.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Asignatura no encontrada." });
  }

  state.competencies.splice(index, 1);
  // Remove related traceability entries that link this subject
  state.traceability = state.traceability.filter(t => t.subjectId !== id);

  await saveActiveDatabaseState(req, state);
  res.json({ success: true, db: state });
});

// --- TRACEABILITY ENDPOINTS (Linking curricular experiences with items) ---
app.post('/api/traceability', async (req, res) => {
  const { state } = await getActiveDatabaseState(req);
  const newTrace: PedagogicalTraceability = {
    ...req.body,
    id: `trac_${Date.now()}`
  };
  state.traceability.push(newTrace);
  await saveActiveDatabaseState(req, state);
  res.status(201).json({ traceability: newTrace, db: state });
});

app.put('/api/traceability/:id', async (req, res) => {
  const { state } = await getActiveDatabaseState(req);
  const { id } = req.params;
  const index = state.traceability.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Mapeo pedagógico no encontrado." });
  }

  state.traceability[index] = {
    ...state.traceability[index],
    ...req.body,
    id
  };
  await saveActiveDatabaseState(req, state);
  res.json({ traceability: state.traceability[index], db: state });
});

app.delete('/api/traceability/:id', async (req, res) => {
  const { state } = await getActiveDatabaseState(req);
  const { id } = req.params;
  const index = state.traceability.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(444).json({ error: "No encontrado" });
  }

  state.traceability.splice(index, 1);
  await saveActiveDatabaseState(req, state);
  res.json({ success: true, db: state });
});

// --- REQUESTS ENDPOINTS (Docentes reserving laboratory kits) ---
app.post('/api/requests', async (req, res) => {
  const { state } = await getActiveDatabaseState(req);
  const newRequest: KitRequest = {
    ...req.body,
    id: `req_${Date.now()}`,
    status: 'pendiente'
  };
  state.requests.push(newRequest);
  await saveActiveDatabaseState(req, state);
  res.status(201).json({ request: newRequest, db: state });
});

app.put('/api/requests/:id', async (req, res) => {
  const { state } = await getActiveDatabaseState(req);
  const { id } = req.params;
  const index = state.requests.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Solicitud no encontrada" });
  }

  const oldRequest = state.requests[index];
  const updatedStatus = req.body.status;
  
  state.requests[index] = {
    ...oldRequest,
    status: updatedStatus,
    notes: req.body.notes || oldRequest.notes
  };

  // If status is "entregado", automatically subtract the quantity of items requested from our inventory!
  // This demonstrates real active inventory simulation!
  if (updatedStatus === 'entregado' && oldRequest.status !== 'entregado') {
    // Find the mapped experience
    const traceMapping = state.traceability.find(t => t.id === oldRequest.labExperienceId);
    if (traceMapping) {
      traceMapping.requiredItems.forEach(reqItem => {
        const itemIndex = state.inventory.findIndex(inv => inv.id === reqItem.itemId);
        if (itemIndex !== -1) {
          const invItem = state.inventory[itemIndex];
          const prevStock = invItem.stock;
          invItem.stock = Math.max(0, invItem.stock - reqItem.quantityRequired);
          
          // Log stock difference
          const diff = prevStock - invItem.stock;
          if (diff > 0) {
            state.movements.unshift({
              id: `move_${Date.now()}_${invItem.id}`,
              itemId: invItem.id,
              itemName: invItem.name,
              type: 'salida',
              quantity: diff,
              user: `${req.body.updatedByUserLabel || "Bodeguero"}`,
              timestamp: new Date().toISOString(),
              reason: `Entrega de kit para Experiencia: ${oldRequest.labExperienceName} - Docente: ${oldRequest.teacherName}`
            });
          }
        }
      });
    }
  }

  await saveActiveDatabaseState(req, state);
  res.json({ request: state.requests[index], db: state });
});

// --- AI PEDAGOGICAL LAB GUIDE GENERATOR WITH GEMINI ---
app.post('/api/ai/generate-lab-guide', async (req, res) => {
  const { competencyId, targetObjective, customRequirements } = req.body;
  
  if (!competencyId) {
    return res.status(400).json({ error: "competencyId es obligatorio para la generación inteligente." });
  }

  try {
    const { state: currentDb } = await getActiveDatabaseState(req);
    const competency = currentDb.competencies.find(c => c.id === competencyId);
    
    if (!competency) {
      return res.status(404).json({ error: "Asignatura/Competencia no encontrada en la base curricular." });
    }

    // Prepare a list of currently available warehouse inventory to teach the model what physically exists
    const inventorySnapshot = currentDb.inventory.map(item => 
      `- [ID: ${item.id}] ${item.name} (Cantidad en stock: ${item.stock} ${item.unit}, Ubicación física: Pasillo/Repisa ${item.location.rack} - ${item.location.shelf}, Categoría: ${item.category})`
    ).join('\n');

    const prompt = `
Actúa como un Diseñador Curricular Senior y Experto de Simulación de Laboratorio para el CFT PUCV (Centro de Formación Técnica del Pacto de Valparaíso).
Te hemos seleccionado para diseñar una "Guía de Experiencia de Laboratorio Práctico" alineador con la competencia académica seleccionada.

--- INFORMACIÓN ACADÉMICA DEL CURRÍCULO CFT PUCV ---
Asignatura: ${competency.subject} (${competency.code})
Semestre: ${competency.semester}
Carrera: ${competency.career}
Competencia del Perfil de Egreso: "${competency.profileCompetency}"
Objetivos Básicos de la Práctica: ${targetObjective || "Verificar experimentalmente los aprendizajes clave de la asignatura de forma segura."}
Requisitos Extras / Comentarios del Docente: ${customRequirements || "Ninguno aportado."}

--- LISTADO DE MATERIALES Y EQUIPOS FÍSICOS DISPONIBLES EN LA BODEGA DE LABORATORIOS CFT ---
${inventorySnapshot}

Tu tarea consiste en generar un informe estructurado en formato MARKDOWN que sea enriquecedor, profesional y directamente aplicable al aula.

RESTRICCIONES CRÍTICAS:
1. SOLO debes recomendar materiales que EXISTAN dentro del anterior listado de materiales de la bodega, especificando su ID único de forma clara (por ejemplo, "Multímetro Digital Fluke 115 [ID: inv_1]"). Si es de fuerza mayor usar un insumo extra que no esté en bodega, colócalo en una sección separada con etiqueta "[REQUERIMIENTO EXTERNO]".
2. Vincula directamente cada paso práctico con la "Competencia de Perfil de Egreso" suministrada.
3. Detalla regulaciones de seguridad específicas asociadas a la carrera (uso de guantes dieléctricos si es electricidad, antiparras, etc.).

Escribe la respuesta estructurada meticulosamente con las siguientes secciones:
1. **Título de la Guía Práctica de Aprendizaje** (Elegante y motivador)
2. **Contexto Pedagógico y Perfil de Egreso** (Explicación de cómo esta práctica tributa directamente al perfil de egreso: "${competency.profileCompetency}")
3. **Equipamientos Técnicos y Consumibles Bodega CFT** (Tabla de insumos recomendados de la Bodega con su ID, ubicación de estante y cantidad sugerida por cada puesto de 2 alumnos).
4. **Instrucciones de Seguridad Obligatorias (Reglamento CFT PUCV)**
5. **Procedimiento de Ejecución del Taller paso-a-paso** (Dividido pedagógicamente en: Inicio, Desarrollo y Cierre/Orden de Taller).
6. **Rúbrica Cualitativa de Evaluación** (De 3 niveles de desempeño: Destacado, Aceptable, Insuficiente).

Hazlo totalmente en idioma Español chileno técnico universitario, con un tono inspirador pero austero, enfocado en el aprendizaje práctico "Saber Hacer".
`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: 0.75,
        systemInstruction: "Eres el Asistente de Planificación Inteligente de Laboratorios de CFT PUCV. Creas guías técnicas que unen el stock físico directo de bodega con la malla pedagógica formal."
      }
    });

    const markdownOutput = response.text;
    res.json({ markdown: markdownOutput, successfullyGenerated: true });
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ 
      error: "Ocurrió un error al contactar al motor de Inteligencia Artificial Gemini.",
      details: error.message 
    });
  }
});


// Serve static/vite assets based on environment build guidelines inside async bootstrap
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start fullstack express engine
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CFT PUCV Backend] Server running on http://localhost:${PORT}`);
  });
}

bootstrap();
