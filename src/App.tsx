/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DatabaseState, User, InventoryItem, CurricularCompetency, PedagogicalTraceability, KitRequest } from './types';
import Header from './components/Header';
import TeacherPlanner from './components/TeacherPlanner';
import InventoryManager from './components/InventoryManager';
import TraceabilityMatrix from './components/TraceabilityMatrix';
import AcademicCurriculum from './components/AcademicCurriculum';
import RequestManager from './components/RequestManager';
import SyncModal from './components/SyncModal';
import { 
  Compass, Package, Network, BookOpen, ClipboardList, Database, 
  HelpCircle, UserCheck, Key, ShieldCheck, RefreshCw 
} from 'lucide-react';

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// Global reference for client-side Firebase Firestore instance
let firebaseClientDb: any = null;

// Predefined testing users mapping RBAC roles
const TESTING_USERS: User[] = [
  {
    id: "user_p_henriquez",
    name: "Paula Henríquez",
    email: "paula.henriquez@cftpucv.cl",
    role: "coordinador",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120",
    specialty: "Coordinadora Académica General"
  },
  {
    id: "user_m_salinas",
    name: "Mario Salinas",
    email: "mario.salinas@cftpucv.cl",
    role: "bodeguero",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
    specialty: "Jefe de Bodega y Pañoles"
  },
  {
    id: "user_a_rojas",
    name: "Alejandro Rojas",
    email: "alejandro.rojas@docentes.cftpucv.cl",
    role: "docente",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120",
    specialty: "Área Electricidad, Automatización y Mecánica"
  }
];

export default function App() {
  // Session Active User role management
  const [currentUser, setCurrentUser] = useState<User>(TESTING_USERS[0]); // Paula Henríquez (Coordinadora) default
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | undefined>(undefined);
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // DB Sync states
  const [dbState, setDbState] = useState<DatabaseState>({
    inventory: [],
    competencies: [],
    traceability: [],
    movements: [],
    requests: []
  });
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'planner' | 'inventory' | 'traceability' | 'curriculum' | 'requests'>('planner');

  // Load state from backend on mount & initialize real-time Cloud Firestore client-side sync
  useEffect(() => {
    fetchDbState();

    let unsubscribeFirestore: (() => void) | undefined = undefined;

    const initFirebase = async () => {
      try {
        const configRes = await fetch('/api/firebase-config');
        if (!configRes.ok) throw new Error("Fallo al obtener config de Firebase");
        const config = await configRes.json();
        
        if (config && config.projectId && config.apiKey) {
          console.log("Initializing client-side Firebase for live database synchronization...");
          const apps = getApps();
          let appInstance;
          if (apps.length === 0) {
            appInstance = initializeApp(config);
          } else {
            appInstance = apps[0];
          }
          
          const dbInstance = getFirestore(appInstance, config.firestoreDatabaseId || '(default)');
          firebaseClientDb = dbInstance;
          
          // Connect real-time Firestore synchronization for multiuser updates
          const docRef = doc(dbInstance, 'config', 'dbState');
          unsubscribeFirestore = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              const cloudData = docSnap.data().state as DatabaseState;
              if (cloudData) {
                console.log("Real-time cloud database update synced in CFT PUCV web-client successfully.");
                setDbState(cloudData);
                localStorage.setItem('cft_pucv_db_state', JSON.stringify(cloudData));
              }
            } else {
              console.log("Cloud database is uninitialized, seeding it now with local cache...");
              const currentSaved = localStorage.getItem('cft_pucv_db_state');
              if (currentSaved) {
                try {
                  const seedState = JSON.parse(currentSaved);
                  setDoc(docRef, { state: seedState });
                } catch (e) {
                  console.error(e);
                }
              }
            }
          }, (err) => {
            console.warn("Firestore snapshot subscription message:", err.message);
          });
        }
      } catch (err) {
        console.error("Firebase client initialization failed:", err);
      }
    };

    initFirebase();

    return () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  // Sync to Cloud Firestore when local mutations are successfully processed and saved
  const syncToFirestore = async (state: DatabaseState) => {
    if (firebaseClientDb) {
      try {
        const docRef = doc(firebaseClientDb, 'config', 'dbState');
        await setDoc(docRef, { state });
        console.log("Cloud Firestore database successfully synchronized client-side.");
      } catch (err) {
        console.warn("Could not sync state to Cloud Firestore client-side:", err);
      }
    }
  };

  // Sync state changes to localStorage automatically when dbState updates to preserve inputs (insumos)
  useEffect(() => {
    if (dbState && (dbState.inventory.length > 0 || dbState.competencies.length > 0)) {
      localStorage.setItem('cft_pucv_db_state', JSON.stringify(dbState));
    }
  }, [dbState]);

  const fetchDbState = async (silently: boolean = false) => {
    try {
      if (!silently) setLoading(true);
      const res = await fetch('/api/db');
      if (!res.ok) throw new Error("Fallo al contactar el servidor Express");
      const data = await res.json();
      
      const localSaved = localStorage.getItem('cft_pucv_db_state');
      let mergedData = { ...data };
      let updatedClientSide = false;

      if (localSaved) {
        try {
          const parsedLocal = JSON.parse(localSaved) as DatabaseState;
          
          // Compare inventory items
          const serverInvIds = new Set((data.inventory || []).map((i: any) => i.id));
          const missingInServer = (parsedLocal.inventory || []).filter(i => !serverInvIds.has(i.id));

          if (missingInServer.length > 0) {
            mergedData.inventory = [...(data.inventory || []), ...missingInServer];
            updatedClientSide = true;
          }

          // Compare stock movements
          const serverMoveIds = new Set((data.movements || []).map((m: any) => m.id));
          const missingMovements = (parsedLocal.movements || []).filter(m => !serverMoveIds.has(m.id));
          if (missingMovements.length > 0) {
            mergedData.movements = [...missingMovements, ...(data.movements || [])];
            updatedClientSide = true;
          }

          // Compare requests
          const serverReqIds = new Set((data.requests || []).map((r: any) => r.id));
          const missingRequests = (parsedLocal.requests || []).filter(r => !serverReqIds.has(r.id));
          if (missingRequests.length > 0) {
            mergedData.requests = [...(data.requests || []), ...missingRequests];
            updatedClientSide = true;
          }

          // Compare competencies
          const serverCompIds = new Set((data.competencies || []).map((c: any) => c.id));
          const missingCompetencies = (parsedLocal.competencies || []).filter(c => !serverCompIds.has(c.id));
          if (missingCompetencies.length > 0) {
            mergedData.competencies = [...(data.competencies || []), ...missingCompetencies];
            updatedClientSide = true;
          }

          // Compare traceability
          const serverTraceIds = new Set((data.traceability || []).map((t: any) => t.id));
          const missingTrace = (parsedLocal.traceability || []).filter(t => !serverTraceIds.has(t.id));
          if (missingTrace.length > 0) {
            mergedData.traceability = [...(data.traceability || []), ...missingTrace];
            updatedClientSide = true;
          }

          if (updatedClientSide) {
            console.log("Restoring local changes back to Cloud Run server to keep fallback in sync...");
            await fetch('/api/db/overwrite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(mergedData)
            });
          }
        } catch (errJson) {
          console.error("Error merging with localStorage:", errJson);
        }
      }

      setDbState(mergedData);
      localStorage.setItem('cft_pucv_db_state', JSON.stringify(mergedData));

      if (mergedData.spreadsheetUrl) {
        setSpreadsheetUrl(mergedData.spreadsheetUrl);
        return mergedData.spreadsheetUrl;
      } else {
        setSpreadsheetUrl(undefined);
      }
      return undefined;
    } catch (err) {
      console.error("Error sincronizando base de datos central:", err);
      // Absolute fallback to local localStorage database if server is unreachable or offline
      const localSaved = localStorage.getItem('cft_pucv_db_state');
      if (localSaved) {
        try {
          const parsedLocal = JSON.parse(localSaved) as DatabaseState;
          setDbState(parsedLocal);
        } catch (e) {
          console.error("Error fall-backing to local storage:", e);
        }
      }
      return undefined;
    } finally {
      if (!silently) setLoading(false);
    }
  };

  const handleSyncSheets = () => {
    setSyncModalOpen(true);
  };

  const handleTriggerSync = async () => {
    try {
      setIsSyncing(true);
      const url = await fetchDbState(true);
      return url;
    } catch (e) {
      console.error(e);
      return undefined;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetDb = async () => {
    if (!confirm("Se eliminarán los registros cargados temporalmente para reiniciar a los valores demo por defecto. ¿Continuar con la restauración fiscal?")) {
      return;
    }
    
    try {
      setIsResetting(true);
      const res = await fetch('/api/db/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDbState(data.db);
        syncToFirestore(data.db);
        if (data.spreadsheetUrl) {
          setSpreadsheetUrl(data.spreadsheetUrl);
        }
        alert("¡Base de datos CFT restaurada de fábrica con éxito!");
      }
    } catch (error) {
      console.error(error);
      alert("Error de reseteo físico.");
    } finally {
      setIsResetting(false);
    }
  };

  // --- ACTIONS HANDLERS ---

  // INVENTORY ITEMS
  const handleAddItem = async (itemPayload: Omit<InventoryItem, 'id'>) => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...itemPayload,
          activeUserLabel: `${currentUser.name} (${currentUser.role})`
        })
      });
      const data = await res.json();
      if (data.db) {
        setDbState(data.db);
        syncToFirestore(data.db);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateItem = async (id: string, updatedFields: Partial<InventoryItem>, reason?: string) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedFields,
          activeUserLabel: `${currentUser.name} (${currentUser.role})`,
          updateReason: reason
        })
      });
      const data = await res.json();
      if (data.db) {
        setDbState(data.db);
        syncToFirestore(data.db);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/${id}?user=${encodeURIComponent(currentUser.name + ' (' + currentUser.role + ')')}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.db) {
        setDbState(data.db);
        syncToFirestore(data.db);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // CURRICULAR COMPETENCIES
  const handleAddCompetency = async (compPayload: Omit<CurricularCompetency, 'id'>) => {
    try {
      const res = await fetch('/api/competencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(compPayload)
      });
      const data = await res.json();
      if (data.db) {
        setDbState(data.db);
        syncToFirestore(data.db);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateCompetency = async (id: string, updatedFields: Partial<CurricularCompetency>) => {
    try {
      const res = await fetch(`/api/competencies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      const data = await res.json();
      if (data.db) {
        setDbState(data.db);
        syncToFirestore(data.db);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCompetency = async (id: string) => {
    try {
      const res = await fetch(`/api/competencies/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.db) {
        setDbState(data.db);
        syncToFirestore(data.db);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // PEDAGOGICAL TRACEABILITIES
  const handleAddTraceability = async (tracePayload: Omit<PedagogicalTraceability, 'id'>) => {
    try {
      const res = await fetch('/api/traceability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tracePayload)
      });
      const data = await res.json();
      if (data.db) {
        setDbState(data.db);
        syncToFirestore(data.db);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTraceability = async (id: string, updatedFields: Partial<PedagogicalTraceability>) => {
    try {
      const res = await fetch(`/api/traceability/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      const data = await res.json();
      if (data.db) {
        setDbState(data.db);
        syncToFirestore(data.db);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTraceability = async (id: string) => {
    try {
      const res = await fetch(`/api/traceability/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.db) {
        setDbState(data.db);
        syncToFirestore(data.db);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // MATERIAL RESERVATION REQUESTS
  const handleAddRequest = async (reqPayload: Omit<KitRequest, 'id' | 'status'>) => {
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqPayload)
      });
      const data = await res.json();
      if (data.db) {
        setDbState(data.db);
        syncToFirestore(data.db);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateRequestStatus = async (id: string, newStatus: KitRequest['status'], notes?: string) => {
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notes,
          updatedByUserLabel: `${currentUser.name} (${currentUser.role})`
        })
      });
      const data = await res.json();
      if (data.db) {
        setDbState(data.db);
        syncToFirestore(data.db);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectTestUserAndRole = (user: User) => {
    setCurrentUser(user);
    // Auto shift view contexts on login transition to match typical work scopes
    if (user.role === 'bodeguero') {
      setActiveTab('inventory');
    } else if (user.role === 'coordinador') {
      setActiveTab('curriculum');
    } else {
      setActiveTab('planner');
    }
  };

  // Loading spinner view
  if (loading && dbState.inventory.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans space-y-4 select-none">
        <RefreshCw className="w-12 h-12 text-blue-900 animate-spin" />
        <div className="text-center">
          <p className="text-sm font-extrabold text-blue-950 font-sans uppercase tracking-widest leading-none">Cargando Trazabilidad CFT PUCV...</p>
          <p className="text-xs text-slate-500 font-mono mt-1">Conectando base de datos central en la nube escolar de Valparaíso</p>
        </div>
      </div>
    );
  }

  // Stock critical count
  const criticalStockCount = dbState.inventory.filter(i => i.stock <= i.minStock).length;
  // Pending requests count
  const pendingRequestsCount = dbState.requests.filter(r => r.status === 'pendiente').length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      
      {/* Full RBAC Managed Header */}
      <Header
        currentUser={currentUser}
        allUsers={TESTING_USERS}
        onChangeRole={selectTestUserAndRole}
        onResetDb={handleResetDb}
        isResetting={isResetting}
        spreadsheetUrl={spreadsheetUrl}
        onSync={handleSyncSheets}
        isSyncing={isSyncing}
      />

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        
        {/* Navigation Tabs */}
        <div className="bg-white border border-slate-200 p-1.5 rounded-xl shadow-xs flex flex-wrap items-center gap-1">
          
          <button
            onClick={() => setActiveTab('planner')}
            className={`px-4 py-2 rounded-lg text-[11px] font-extrabold tracking-wider uppercase transition-all duration-150 flex items-center gap-2 cursor-pointer select-none ${
              activeTab === 'planner'
                ? 'bg-indigo-600 text-white shadow-xs border border-indigo-700'
                : 'text-slate-500 border border-transparent hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Compass className="w-4 h-4" />
            Buscador Docente
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-lg text-[11px] font-extrabold tracking-wider uppercase transition-all duration-150 flex items-center gap-2 cursor-pointer select-none ${
              activeTab === 'inventory'
                ? 'bg-indigo-600 text-white shadow-xs border border-indigo-700'
                : 'text-slate-500 border border-transparent hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            Inventario Bodega
            {criticalStockCount > 0 && (
              <span className="bg-red-500 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full ring-1 ring-white">
                {criticalStockCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('traceability')}
            className={`px-4 py-2 rounded-lg text-[11px] font-extrabold tracking-wider uppercase transition-all duration-150 flex items-center gap-2 cursor-pointer select-none ${
              activeTab === 'traceability'
                ? 'bg-indigo-600 text-white shadow-xs border border-indigo-700'
                : 'text-slate-500 border border-transparent hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Network className="w-4 h-4" />
            Trazabilidad Pedagógica
          </button>

          <button
            onClick={() => setActiveTab('curriculum')}
            className={`px-4 py-2 rounded-lg text-[11px] font-extrabold tracking-wider uppercase transition-all duration-150 flex items-center gap-2 cursor-pointer select-none ${
              activeTab === 'curriculum'
                ? 'bg-indigo-600 text-white shadow-xs border border-indigo-700'
                : 'text-slate-500 border border-transparent hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Malla Curricular
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg text-[11px] font-extrabold tracking-wider uppercase transition-all duration-150 flex items-center gap-2 cursor-pointer select-none ${
              activeTab === 'requests'
                ? 'bg-indigo-600 text-white shadow-xs border border-indigo-700'
                : 'text-slate-500 border border-transparent hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Bandeja de Solicitudes
            {pendingRequestsCount > 0 && (
              <span className="bg-amber-550 bg-amber-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full ring-1 ring-white">
                {pendingRequestsCount}
              </span>
            )}
          </button>

        </div>

        {/* Dynamic Tab Panel loading */}
        <div className="transition-all animate-fadeIn">
          
          {activeTab === 'planner' && (
            <TeacherPlanner
              competencies={dbState.competencies}
              traceability={dbState.traceability}
              inventory={dbState.inventory}
              requests={dbState.requests.filter(r => r.requestedBy === currentUser.id)}
              currentUser={currentUser}
              onAddRequest={handleAddRequest}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryManager
              inventory={dbState.inventory}
              movements={dbState.movements}
              role={currentUser.role}
              currentUser={currentUser}
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
            />
          )}

          {activeTab === 'traceability' && (
            <TraceabilityMatrix
              traceability={dbState.traceability}
              inventory={dbState.inventory}
              competencies={dbState.competencies}
              role={currentUser.role}
              onAddTraceability={handleAddTraceability}
              onUpdateTraceability={handleUpdateTraceability}
              onDeleteTraceability={handleDeleteTraceability}
            />
          )}

          {activeTab === 'curriculum' && (
            <AcademicCurriculum
              competencies={dbState.competencies}
              role={currentUser.role}
              onAddCompetency={handleAddCompetency}
              onUpdateCompetency={handleUpdateCompetency}
              onDeleteCompetency={handleDeleteCompetency}
            />
          )}

          {activeTab === 'requests' && (
            <RequestManager
              requests={dbState.requests}
              inventory={dbState.inventory}
              traceability={dbState.traceability}
              role={currentUser.role}
              currentUser={currentUser}
              onUpdateRequestStatus={handleUpdateRequestStatus}
            />
          )}

        </div>

      </main>

      {/* Corporate footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 text-center text-xs font-sans mt-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-medium text-slate-300">
            © 2026 Centro de Formación Técnica de la Pontificia Universidad Católica de Valparaíso (CFT PUCV).
          </p>
          <p className="text-3xs text-slate-500 font-mono">
            Plataforma Corporativa Homologada • Reglas de Trazabilidad Educacional en el Aula y Auditoría Permanente de Bodega
          </p>
          <div className="flex justify-center space-x-4 text-3xs font-bold text-slate-500 font-mono pt-1">
            <span>Sede Quillota</span> • <span>Sede Valparaíso</span> • <span>Sede Viña del Mar</span> • <span>Sede La Calera</span>
          </div>
        </div>
      </footer>

      {/* Database sync status modal */}
      <SyncModal
        isOpen={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        spreadsheetUrl={spreadsheetUrl}
        isSyncing={isSyncing}
        onSync={handleTriggerSync}
      />

    </div>
  );
}
