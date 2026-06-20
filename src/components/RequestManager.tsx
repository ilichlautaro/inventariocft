/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { KitRequest, InventoryItem, PedagogicalTraceability, UserRole, User } from '../types';
import { 
  ClipboardList, CheckCircle2, Clock, Check, Send, AlertCircle, Trash2, 
  UserCheck, Box, HelpCircle, ArrowRight, Truck 
} from 'lucide-react';

interface RequestManagerProps {
  requests: KitRequest[];
  inventory: InventoryItem[];
  traceability: PedagogicalTraceability[];
  role: UserRole;
  currentUser: User;
  onUpdateRequestStatus: (id: string, status: KitRequest['status'], notes?: string) => void;
}

export default function RequestManager({
  requests,
  inventory,
  traceability,
  role,
  currentUser,
  onUpdateRequestStatus
}: RequestManagerProps) {

  const canEditStatus = role === 'bodeguero' || role === 'coordinador';
  const [managerNotes, setManagerNotes] = useState<{ [reqId: string]: string }>({});

  const handleStatusChange = (id: string, newStatus: KitRequest['status']) => {
    onUpdateRequestStatus(id, newStatus, managerNotes[id] || undefined);
  };

  const handleNotesChange = (id: string, val: string) => {
    setManagerNotes({ ...managerNotes, [id]: val });
  };

  // Helper to fetch details of required inventory items mapped to a certain request
  const getExperienceMaterials = (expId: string) => {
    const mapping = traceability.find(t => t.id === expId);
    if (!mapping) return [];
    
    return mapping.requiredItems.map(req => {
      const invItem = inventory.find(i => i.id === req.itemId);
      return {
        name: invItem ? invItem.name : "Material Descatalogado",
        required: req.quantityRequired,
        currentStock: invItem ? invItem.stock : 0,
        unit: invItem ? invItem.unit : ''
      };
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden" id="request-manager-container">
      
      {/* Banner */}
      <div className="bg-slate-900 border-b border-indigo-500/20 px-6 py-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
            <ClipboardList className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight font-sans uppercase">Pedidos y Reservas de Kits de Práctica</h2>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Preparación, estiba y entrega de insumos físicos solicitados por los docentes para laboratorios activos
            </p>
          </div>
        </div>
        <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono">
          <span className="text-slate-400 uppercase font-black tracking-wider">Pendientes: </span>
          <span className="font-bold text-indigo-400">{requests.filter(r => r.status === 'pendiente').length}</span>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        
        {requests.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-sans text-sm font-medium">Bandeja vacía</p>
            <p className="text-xs text-slate-400 font-sans mt-1">No hay tickets de reserva pendientes ni entregados en el sistema laboral.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {requests.map(req => {
              const materialsNeeded = getExperienceMaterials(req.labExperienceId);
              
              // Verify if there is stock available for ALL items requested in order to prepare the kit
              const hasFullStockToPrepare = materialsNeeded.every(m => m.currentStock >= m.required);

              return (
                <div key={req.id} className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-350 hover:shadow-xs transition-all flex flex-col lg:flex-row gap-6 justify-between">
                  
                  {/* Left Column: Request Profile & Context */}
                  <div className="space-y-3.5 flex-1 select-text">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-3xs font-black text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded uppercase font-mono">
                        {req.subjectCode}
                      </span>
                      <span className="text-3xs font-mono text-slate-400">
                        ID Ticket: {req.id}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded text-3xs font-extrabold uppercase font-sans border tracking-wider ${
                        req.status === 'pendiente' ? 'bg-orange-50 text-orange-800 border-orange-200 animate-pulse' :
                        req.status === 'preparado' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                        req.status === 'entregado' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        'bg-red-50 text-red-800 border-red-200'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 font-sans">{req.labExperienceName}</h4>
                      <p className="text-3xs text-slate-500 font-mono mt-1">
                        Docente Solicitante: <strong className="text-slate-750 font-sans">{req.teacherName}</strong> • Fecha Requerida: <strong className="text-slate-750 font-sans">{req.dateRequired}</strong>
                      </p>
                    </div>

                    {req.notes && (
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-150 text-2xs text-slate-650 italic">
                        <strong className="text-slate-800 font-bold block not-italic mb-0.5 font-sans">Comentarios Docente:</strong>
                        "{req.notes}"
                      </div>
                    )}
                  </div>

                  {/* Middle Column: Physical items checklist & verification */}
                  <div className="bg-slate-50 text-xs p-4 rounded-xl border border-slate-200 lg:w-80 flex flex-col justify-between">
                    <div>
                      <span className="text-4xs font-black text-slate-500 uppercase tracking-widest block mb-2">Checklist de Bodega:</span>
                      <div className="space-y-1.5">
                        {materialsNeeded.map((mat, idx) => {
                          const matAvailable = mat.currentStock >= mat.required;
                          return (
                            <div key={idx} className="flex justify-between items-center text-3xs">
                              <span className="text-slate-700 truncate max-w-[140px]" title={mat.name}>
                                {mat.name}
                              </span>
                              <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                                matAvailable ? 'bg-emerald-50 text-emerald-800' : 'bg-red-100 text-red-800 animate-pulse'
                              }`}>
                                req: {mat.required} / stock: {mat.currentStock}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Safety alert if unable to prepare */}
                    {!hasFullStockToPrepare && req.status === 'pendiente' && (
                      <div className="mt-3 bg-red-50 text-red-850 p-2 rounded-lg border border-red-150 flex items-start gap-1 text-4xs leading-tight">
                        <AlertCircle className="w-3.5 h-3.5 text-red-650 shrink-0 mt-0.5" />
                        <span>Falta stock en bodega. Resurtir antes de dar salida oficial al kit.</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Workflow Transitions Controls (Bodeguero / Coordinador only) */}
                  <div className="lg:w-64 flex flex-col justify-between space-y-3 shrink-0">
                    <div>
                      <label className="block text-4xs font-extrabold text-slate-500 uppercase mb-1">Notas del Encargado Bodega</label>
                      <input
                        type="text"
                        placeholder="Añade retroalimentación..."
                        disabled={!canEditStatus || req.status === 'entregado'}
                        value={managerNotes[req.id] || ''}
                        onChange={(e) => handleNotesChange(req.id, e.target.value)}
                        className="w-full text-3xs text-slate-800 bg-slate-50 disabled:bg-slate-100 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      {canEditStatus ? (
                        <>
                          {req.status === 'pendiente' && (
                            <button
                              onClick={() => handleStatusChange(req.id, 'preparado')}
                              disabled={!hasFullStockToPrepare}
                              className="w-full py-2 bg-blue-900 disabled:bg-slate-300 text-white disabled:text-slate-500 hover:bg-blue-950 font-bold rounded-lg text-3xs transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                            >
                              <Box className="w-3.5 h-3.5" />
                              Marcar como Kit "Preparado"
                            </button>
                          )}

                          {req.status === 'preparado' && (
                            <button
                              onClick={() => handleStatusChange(req.id, 'entregado')}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-bold rounded-lg text-3xs transition cursor-pointer flex items-center justify-center gap-1 shadow-md"
                            >
                              <Truck className="w-3.5 h-3.5 text-slate-950" />
                              Confirmar "Entregado" a Docente
                            </button>
                          )}

                          {req.status === 'entregado' && (
                            <div className="text-center p-2 bg-emerald-100/60 rounded-lg text-emerald-800 font-extrabold text-4xs flex items-center justify-center gap-1 border border-emerald-200 uppercase tracking-widest font-sans">
                              <Check className="w-4 h-4 text-emerald-600" />
                              Entregado con Éxito
                            </div>
                          )}

                          {req.status !== 'entregado' && (
                            <button
                              onClick={() => handleStatusChange(req.id, 'rechazado')}
                              className="w-full text-center py-1 text-4xs hover:bg-red-50 text-red-500 hover:text-red-750 font-bold rounded cursor-pointer transition border border-transparent hover:border-red-200"
                            >
                              Rechazar o Cancelar Solicitud
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="bg-slate-100 text-slate-500 p-2.5 rounded-lg text-center font-bold text-4xs leading-normal">
                          ⚠️ SOLO BODEGUEROS O COORDINADORES TIENEN FACULTADES PARA PROCESAR EL FLUJO DE PREPARACIÓN DE INSUMOS.
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
