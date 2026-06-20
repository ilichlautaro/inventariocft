/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { DatabaseState, InventoryItem, CurricularCompetency, PedagogicalTraceability, StockMovement, KitRequest } from '../types';

const CONFIG_PATH = path.join(process.cwd(), 'src', 'data', 'sheets_config.json');

interface SheetsConfig {
  spreadsheetId?: string;
}

export function getCachedSpreadsheetId(): string | undefined {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const config = JSON.parse(content) as SheetsConfig;
      return config.spreadsheetId;
    }
  } catch (error) {
    console.error("Error reading sheets_config.json:", error);
  }
  return undefined;
}

export function saveCachedSpreadsheetId(spreadsheetId: string): void {
  try {
    const parentDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ spreadsheetId }, null, 2), 'utf-8');
  } catch (error) {
    console.error("Error writing sheets_config.json:", error);
  }
}

export function getGoogleSheetsClient(headers: any) {
  const accessToken = headers['x-goog-user-access-token'] as string;
  const refreshToken = headers['x-goog-user-refresh-token'] as string;
  const clientId = headers['x-goog-user-client-id'] as string;
  const clientSecret = headers['x-goog-user-client-secret'] as string;

  if (!accessToken) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return {
    sheets: google.sheets({ version: 'v4', auth: oauth2Client }),
    drive: google.drive({ version: 'v3', auth: oauth2Client }),
    accessToken
  };
}

const HEADERS = {
  inventory: ["id", "name", "category", "stock", "unit", "minStock", "location_classroom", "location_rack", "location_shelf", "location_box"],
  competencies: ["id", "career", "subject", "code", "semester", "profileCompetency", "keyLearning"],
  traceability: ["id", "labExperience", "subjectId", "description", "requiredItems"],
  movements: ["id", "itemId", "itemName", "type", "quantity", "user", "timestamp", "reason"],
  requests: ["id", "labExperienceId", "labExperienceName", "subjectCode", "requestedBy", "teacherName", "dateRequired", "status", "notes"]
};

export function inventoryToRows(inventory: InventoryItem[]): any[][] {
  return [
    HEADERS.inventory,
    ...inventory.map(item => [
      item.id,
      item.name,
      item.category,
      item.stock,
      item.unit,
      item.minStock,
      item.location?.classroom || "",
      item.location?.rack || "",
      item.location?.shelf || "",
      item.location?.box || ""
    ])
  ];
}

export function competenciesToRows(competencies: CurricularCompetency[]): any[][] {
  return [
    HEADERS.competencies,
    ...competencies.map(c => [
      c.id,
      c.career,
      c.subject,
      c.code,
      c.semester,
      c.profileCompetency,
      JSON.stringify(c.keyLearning || [])
    ])
  ];
}

export function traceabilityToRows(traceability: PedagogicalTraceability[]): any[][] {
  return [
    HEADERS.traceability,
    ...traceability.map(t => [
      t.id,
      t.labExperience,
      t.subjectId,
      t.description,
      JSON.stringify(t.requiredItems || [])
    ])
  ];
}

export function movementsToRows(movements: StockMovement[]): any[][] {
  return [
    HEADERS.movements,
    ...movements.map(m => [
      m.id,
      m.itemId,
      m.itemName,
      m.type,
      m.quantity,
      m.user,
      m.timestamp,
      m.reason
    ])
  ];
}

export function requestsToRows(requests: KitRequest[]): any[][] {
  return [
    HEADERS.requests,
    ...requests.map(r => [
      r.id,
      r.labExperienceId,
      r.labExperienceName,
      r.subjectCode,
      r.requestedBy,
      r.teacherName,
      r.dateRequired,
      r.status,
      r.notes || ""
    ])
  ];
}

export async function writeAllToGoogleSheets(sheets: any, spreadsheetId: string, dbState: DatabaseState): Promise<void> {
  // Ensure all tabs exist before trying to read/clear/write them
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = (meta.data.sheets || []).map((s: any) => s.properties?.title);
    const missingTitles = ['inventory', 'competencies', 'traceability', 'movements', 'requests'].filter(
      title => !existingTitles.includes(title)
    );

    if (missingTitles.length > 0) {
      console.log(`Creating missing sheets/tabs in spreadsheet: ${missingTitles.join(', ')}`);
      const requests = missingTitles.map(title => ({
        addSheet: { properties: { title } }
      }));
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });
    }
  } catch (err) {
    console.error("Error verifying or creating missing spreadsheet sheets:", err);
  }

  const data = [
    { range: 'inventory!A1', values: inventoryToRows(dbState.inventory) },
    { range: 'competencies!A1', values: competenciesToRows(dbState.competencies) },
    { range: 'traceability!A1', values: traceabilityToRows(dbState.traceability) },
    { range: 'movements!A1', values: movementsToRows(dbState.movements) },
    { range: 'requests!A1', values: requestsToRows(dbState.requests) }
  ];

  for (const sheetName of ['inventory', 'competencies', 'traceability', 'movements', 'requests']) {
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A1:Z5000`
      });
    } catch (e) {
      console.error(`Error clearing ${sheetName} sheet before rewrite:`, e);
    }
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data
    }
  });
}

function parseJson(str: string, defaultValue: any) {
  try {
    return str ? JSON.parse(str) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

export async function readAllFromGoogleSheets(sheets: any, spreadsheetId: string): Promise<DatabaseState> {
  // Ensure all tabs exist before trying to read them to prevent API errors
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = (meta.data.sheets || []).map((s: any) => s.properties?.title);
    const missingTitles = ['inventory', 'competencies', 'traceability', 'movements', 'requests'].filter(
      title => !existingTitles.includes(title)
    );

    if (missingTitles.length > 0) {
      console.log(`Re-creating missing sheets/tabs before read: ${missingTitles.join(', ')}`);
      const requests = missingTitles.map(title => ({
        addSheet: { properties: { title } }
      }));
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });
    }
  } catch (err) {
    console.error("Error verifying or creating missing spreadsheet sheets before read:", err);
  }

  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: ['inventory!A1:Z1000', 'competencies!A1:Z1000', 'traceability!A1:Z1000', 'movements!A1:Z1000', 'requests!A1:Z1000']
  });

  const valueRanges = res.data.valueRanges || [];
  
  const getSheetValues = (sheetName: string): any[][] => {
    const vr = valueRanges.find((item: any) => item.range && item.range.toLowerCase().includes(sheetName));
    return vr?.values || [];
  };

  const rawInventory = getSheetValues('inventory');
  const inventory: InventoryItem[] = [];
  if (rawInventory.length > 1) {
    for (let i = 1; i < rawInventory.length; i++) {
      const row = rawInventory[i];
      if (!row[0]) continue;
      inventory.push({
        id: row[0],
        name: row[1] || "",
        category: row[2] || "",
        stock: Number(row[3] || 0),
        unit: row[4] || "unidades",
        minStock: Number(row[5] || 0),
        location: {
          classroom: row[6] || "",
          rack: row[7] || "",
          shelf: row[8] || "",
          box: row[9] || ""
        }
      });
    }
  }

  const rawCompetencies = getSheetValues('competencies');
  const competencies: CurricularCompetency[] = [];
  if (rawCompetencies.length > 1) {
    for (let i = 1; i < rawCompetencies.length; i++) {
      const row = rawCompetencies[i];
      if (!row[0]) continue;
      competencies.push({
        id: row[0],
        career: row[1] || "",
        subject: row[2] || "",
        code: row[3] || "",
        semester: row[4] || "",
        profileCompetency: row[5] || "",
        keyLearning: parseJson(row[6], [])
      });
    }
  }

  const rawTraceability = getSheetValues('traceability');
  const traceability: PedagogicalTraceability[] = [];
  if (rawTraceability.length > 1) {
    for (let i = 1; i < rawTraceability.length; i++) {
      const row = rawTraceability[i];
      if (!row[0]) continue;
      traceability.push({
        id: row[0],
        labExperience: row[1] || "",
        subjectId: row[2] || "",
        description: row[3] || "",
        requiredItems: parseJson(row[4], [])
      });
    }
  }

  const rawMovements = getSheetValues('movements');
  const movements: StockMovement[] = [];
  if (rawMovements.length > 1) {
    for (let i = 1; i < rawMovements.length; i++) {
      const row = rawMovements[i];
      if (!row[0]) continue;
      movements.push({
        id: row[0],
        itemId: row[1] || "",
        itemName: row[2] || "",
        type: (row[3] || "ajuste") as any,
        quantity: Number(row[4] || 0),
        user: row[5] || "Usuario CFT",
        timestamp: row[6] || new Date().toISOString(),
        reason: row[7] || ""
      });
    }
  }

  const rawRequests = getSheetValues('requests');
  const requests: KitRequest[] = [];
  if (rawRequests.length > 1) {
    for (let i = 1; i < rawRequests.length; i++) {
      const row = rawRequests[i];
      if (!row[0]) continue;
      requests.push({
        id: row[0],
        labExperienceId: row[1] || "",
        labExperienceName: row[2] || "",
        subjectCode: row[3] || "",
        requestedBy: row[4] || "",
        teacherName: row[5] || "Docente CFT",
        dateRequired: row[6] || "",
        status: (row[7] || "pendiente") as any,
        notes: row[8] || ""
      });
    }
  }

  return {
    inventory,
    competencies,
    traceability,
    movements,
    requests
  };
}

export async function findOrCreateSpreadsheet(drive: any, sheets: any, fallbackDbState: DatabaseState): Promise<string> {
  let spreadsheetId = getCachedSpreadsheetId();
  if (spreadsheetId) {
    try {
      await sheets.spreadsheets.get({ spreadsheetId });
      return spreadsheetId;
    } catch (e) {
      console.log(`Cached spreadsheet ID ${spreadsheetId} is invalid or inaccessible. Searching in Drive...`);
    }
  }

  try {
    const res = await drive.files.list({
      q: "name = 'Base de Datos - CFT PUCV (Inventario y Trazabilidad)' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const files = res.data.files || [];
    if (files.length > 0 && files[0].id) {
      const foundId = files[0].id;
      saveCachedSpreadsheetId(foundId);
      return foundId;
    }
  } catch (err) {
    console.error("Error searching spreadsheet in Google Drive:", err);
  }

  try {
    const newSheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: "Base de Datos - CFT PUCV (Inventario y Trazabilidad)"
        },
        sheets: [
          { properties: { title: 'inventory' } },
          { properties: { title: 'competencies' } },
          { properties: { title: 'traceability' } },
          { properties: { title: 'movements' } },
          { properties: { title: 'requests' } }
        ]
      }
    });

    const createdId = newSheet.data.spreadsheetId;
    if (!createdId) throw new Error("No spreadsheet ID returned after creation");

    saveCachedSpreadsheetId(createdId);

    // Initial write of current state
    await writeAllToGoogleSheets(sheets, createdId, fallbackDbState);

    return createdId;
  } catch (err) {
    console.error("Critical error creating Google Spreadsheet:", err);
    throw err;
  }
}
