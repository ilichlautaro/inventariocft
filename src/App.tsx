/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DatabaseState, User, InventoryItem, CurricularCompetency, PedagogicalTraceability, KitRequest } from './types';
import Header from './components/Header';
import DashboardOverview from './components/DashboardOverview';
import TeacherPlanner from './components/TeacherPlanner';
import InventoryManager from './components/InventoryManager';
import TraceabilityMatrix from './components/TraceabilityMatrix';
import AcademicCurriculum from './components/AcademicCurriculum';
import RequestManager from './components/RequestManager';
import SyncModal from './components/SyncModal';
import { 
  Compass, Package, Network, BookOpen, ClipboardList, Database, 
  HelpCircle, UserCheck, Key, ShieldCheck, RefreshCw, LayoutDashboard, Menu, X, ChevronRight, Sparkles, AlertTriangle 
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'planner' | 'inventory' | 'traceability' | 'curriculum' | 'requests'>('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
  // All low stock items
  const lowStockCount = dbState.inventory.filter(i => i.stock <= i.minStock).length;

  return (
    <div className="min-h-screen bg-surface flex">
      
      {/* 1. Left Sidebar Shell - Hidden on mobile, sticky on desktop */}
      <aside className={`fixed inset-y-0 left-0 w-70 bg-surface-container-lowest border-r border-outline-variant flex flex-col p-5 z-40 transition-transform duration-300 lg:translate-x-0 ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="mb-8 px-2 flex justify-between items-center">
          <div>
            <div className="w-10 h-10 bg-primary text-white rounded-lg flex flex-col justify-center items-center font-black text-xs leading-none shadow-sm select-none mb-3">
              <span className="text-[8px] font-bold text-slate-300 leading-none">CFT</span>
              <span className="text-white font-extrabold text-[10px] tracking-tight mt-0.5">PUCV</span>
            </div>
            <h1 className="text-xl font-headline font-extrabold text-primary flex items-center gap-1.5">
              EduInventory
            </h1>
            <p className="text-xs text-secondary font-medium font-sans mt-0.5">Gestión Administrativa</p>
          </div>
          
          <button 
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 hover:bg-surface-container rounded-full text-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tab Menu */}
        <nav className="flex-1 space-y-1">
          
          {/* Dashboard/Inicio */}
          <button
            onClick={() => { setActiveTab('dashboard'); setMobileSidebarOpen(false); }}
            className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 select-none cursor-pointer text-xs uppercase tracking-wider ${
              activeTab === 'dashboard'
                ? 'bg-secondary-container text-on-secondary-container font-extrabold shadow-xs'
                : 'text-secondary hover:bg-surface-container-high'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          {/* Buscador Docente */}
          <button
            onClick={() => { setActiveTab('planner'); setMobileSidebarOpen(false); }}
            className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 select-none cursor-pointer text-xs uppercase tracking-wider ${
              activeTab === 'planner'
                ? 'bg-secondary-container text-on-secondary-container font-extrabold shadow-xs'
                : 'text-secondary hover:bg-surface-container-high'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Buscador Docente</span>
          </button>

          {/* Inventario Bodega */}
          <button
            onClick={() => { setActiveTab('inventory'); setMobileSidebarOpen(false); }}
            className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 select-none cursor-pointer text-xs uppercase tracking-wider justify-between ${
              activeTab === 'inventory'
                ? 'bg-secondary-container text-on-secondary-container font-extrabold shadow-xs'
                : 'text-secondary hover:bg-surface-container-high'
            }`}
          >
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4" />
              <span>Inventario Bodega</span>
            </div>
            {criticalStockCount > 0 && (
              <span className="bg-error text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full ring-1 ring-white">
                {criticalStockCount}
              </span>
            )}
          </button>

          {/* Trazabilidad Pedagógica */}
          <button
            onClick={() => { setActiveTab('traceability'); setMobileSidebarOpen(false); }}
            className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 select-none cursor-pointer text-xs uppercase tracking-wider ${
              activeTab === 'traceability'
                ? 'bg-secondary-container text-on-secondary-container font-extrabold shadow-xs'
                : 'text-secondary hover:bg-surface-container-high'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Trazabilidad</span>
          </button>

          {/* Malla Curricular */}
          <button
            onClick={() => { setActiveTab('curriculum'); setMobileSidebarOpen(false); }}
            className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 select-none cursor-pointer text-xs uppercase tracking-wider ${
              activeTab === 'curriculum'
                ? 'bg-secondary-container text-on-secondary-container font-extrabold shadow-xs'
                : 'text-secondary hover:bg-surface-container-high'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Malla Curricular</span>
          </button>

          {/* Bandeja de Solicitudes */}
          <button
            onClick={() => { setActiveTab('requests'); setMobileSidebarOpen(false); }}
            className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 select-none cursor-pointer text-xs uppercase tracking-wider justify-between ${
              activeTab === 'requests'
                ? 'bg-secondary-container text-on-secondary-container font-extrabold shadow-xs'
                : 'text-secondary hover:bg-surface-container-high'
            }`}
          >
            <div className="flex items-center gap-3">
              <ClipboardList className="w-4 h-4" />
              <span>Solicitudes</span>
            </div>
            {pendingRequestsCount > 0 && (
              <span className="bg-primary text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full ring-1 ring-white">
                {pendingRequestsCount}
              </span>
            )}
          </button>

        </nav>

        {/* Sidebar Footer with system info & User profile card */}
        <div className="mt-auto border-t border-outline-variant/60 pt-4">
          
          <button 
            onClick={() => setSyncModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-bold tracking-wider text-secondary hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer select-none uppercase mb-2"
          >
            <Database className="w-4 h-4 text-primary" />
            <span>Estado Base Datos</span>
          </button>

          <div className="flex items-center gap-3 px-3 py-3 mt-1 bg-surface-container-low/60 rounded-xl border border-outline-variant/30">
            <img 
              className="w-10 h-10 rounded-full border-2 border-primary-container object-cover shadow-xs" 
              src={currentUser.avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120"} 
              alt={currentUser.name} 
            />
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-on-surface truncate">{currentUser.name}</p>
              <p className="text-[10px] text-secondary truncate font-mono capitalize">{currentUser.role === 'bodeguero' ? 'Jefe de Bodega' : currentUser.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Background shadow click away overlay for mobile drawer */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/45 z-30 lg:hidden"
        />
      )}

      {/* 2. Main Area (Occupies remainder of space dynamically, starting at left padding on desktops) */}
      <div className="flex-1 lg:pl-70 flex flex-col min-h-screen overflow-hidden">
        
        {/* Top AppBar */}
        <Header
          currentUser={currentUser}
          allUsers={TESTING_USERS}
          onChangeRole={selectTestUserAndRole}
          onResetDb={handleResetDb}
          isResetting={isResetting}
          spreadsheetUrl={spreadsheetUrl}
          onSync={handleSyncSheets}
          isSyncing={isSyncing}
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />

        {/* Content canvas */}
        <main className="flex-1 p-6 md:p-8 bg-surface space-y-6 overflow-y-auto w-full max-w-7xl mx-auto">
          
          {/* Display notification badge warning if sync fails */}
          {lowStockCount > 0 && activeTab === 'dashboard' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-3xs animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-amber-100/80 rounded-lg text-amber-700">
                  <AlertTriangle className="w-4.5 h-4.5" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Alerta de Existencias</h4>
                  <p className="text-[11px] text-amber-700">Se han detectado {lowStockCount} insumos críticos con stock igual o inferior a su mínimo establecido en el pañol escolar.</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('inventory')}
                className="text-[10px] font-bold text-amber-900 underline hover:no-underline cursor-pointer tracking-wider uppercase"
              >
                Ver Bodega
              </button>
            </div>
          )}

          {/* Active rendering view panels */}
          <div className="transition-all duration-350">
            
            {activeTab === 'dashboard' && (
              <DashboardOverview
                dbState={dbState}
                currentUser={currentUser}
                onNavigateToTab={(tab) => setActiveTab(tab)}
                onGenerateReport={handleTriggerSync}
              />
            )}

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

        {/* Corporate footer matched to layout bounds */}
        <footer className="bg-inverse-surface text-secondary border-t border-outline-variant/30 py-6 text-center text-xs mt-auto">
          <div className="max-w-7xl mx-auto px-6 space-y-1.5 opacity-80 animate-fadeIn">
            <p className="font-semibold text-inverse-on-surface">
              © 2026 Centro de Formación Técnica de la Pontificia Universidad Católica de Valparaíso (CFT PUCV).
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              Plataforma Homologada de Acreditación Institucional • Integración de Clases Prácticas y Control Técnico de Bodegas
            </p>
          </div>
        </footer>

      </div>

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
