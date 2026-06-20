/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PedagogicalTraceability, InventoryItem, CurricularCompetency, UserRole } from '../types';
import { 
  Network, Link2, Plus, Trash2, Eye, HelpCircle, FileText, Settings, AlertOctagon, 
  CheckCircle2, AlertTriangle, Hammer, Compass, Tag, RefreshCw, X 
} from 'lucide-react';

interface TraceabilityMatrixProps {
  traceability: PedagogicalTraceability[];
  inventory: InventoryItem[];
  competencies: CurricularCompetency[];
  role: UserRole;
  onAddTraceability: (trace: Omit<PedagogicalTraceability, 'id'>) => void;
  onUpdateTraceability: (id: string, trace: Partial<PedagogicalTraceability>) => void;
  onDeleteTraceability: (id: string) => void;
}

export default function TraceabilityMatrix({
  traceability,
  inventory,
  competencies,
  role,
  onAddTraceability,
  onUpdateTraceability,
  onDeleteTraceability
}: TraceabilityMatrixProps) {

  const isCoordinator = role === 'coordinador';
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New mapping form state
  const [formLabExperience, setFormLabExperience] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  
  // Selection of multiple items for mapping
  const [selectedItems, setSelectedItems] = useState<{ itemId: string; quantity: number }[]>([]);
  const [temporaryItemId, setTemporaryItemId] = useState('');
  const [temporaryQuantity, setTemporaryQuantity] = useState<number>(1);

  // Helper: calculate stock readiness status for a laboratory practical experience
  const getReadinessStatus = (trace: PedagogicalTraceability) => {
    let hasShortage = false;
    let isTenseStock = false;
    const itemsDetailed = [];

    for (const req of trace.requiredItems) {
      const invItem = inventory.find(i => i.id === req.itemId);
      if (!invItem) {
        hasShortage = true;
        itemsDetailed.push({
          name: "Insumo Descatalogado",
          required: req.quantityRequired,
          available: 0,
          status: 'shortage'
        });
        continue;
      }

      const available = invItem.stock;
      const status = available >= req.quantityRequired 
        ? (available - req.quantityRequired <= invItem.minStock ? 'warning' : 'ok')
        : 'shortage';

      if (status === 'shortage') hasShortage = true;
      if (status === 'warning') isTenseStock = true;

      itemsDetailed.push({
        name: invItem.name,
        required: req.quantityRequired,
        available: available,
        unit: invItem.unit,
        location: invItem.location,
        status: status
      });
    }

    if (hasShortage) {
      return { code: 'red', label: 'Stock Insuficiente', desc: 'No se puede impartir hoy por falta de materiales.', items: itemsDetailed };
    }
    if (isTenseStock) {
      return { code: 'yellow', label: 'Stock Crítico', desc: 'Material suficiente pero reservas de bodega tensas.', items: itemsDetailed };
    }
    return { code: 'green', label: 'Totalmente Apto', desc: 'Suministros suficientes en bodega para todo el estudiantado.', items: itemsDetailed };
  };

  const handleAddItemToPreset = () => {
    if (!temporaryItemId) return;
    const index = selectedItems.findIndex(i => i.itemId === temporaryItemId);
    if (index !== -1) {
      // Overwrite or add
      const updated = [...selectedItems];
      updated[index].quantity = Number(temporaryQuantity);
      setSelectedItems(updated);
    } else {
      setSelectedItems([...selectedItems, { itemId: temporaryItemId, quantity: Number(temporaryQuantity) }]);
    }
    // reset selection
    setTemporaryItemId('');
    setTemporaryQuantity(1);
  };

  const handleRemoveItemFromPreset = (itemId: string) => {
    setSelectedItems(selectedItems.filter(i => i.itemId !== itemId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabExperience || !formSubjectId || selectedItems.length === 0) {
      alert("Por favor introduce el nombre, vinculación a asignatura e incluye al menos un insumo específico.");
      return;
    }

    onAddTraceability({
      labExperience: formLabExperience,
      subjectId: formSubjectId,
      description: formDescription,
      requiredItems: selectedItems.map(item => ({
        itemId: item.itemId,
        quantityRequired: item.quantity
      }))
    });

    // Reset Form
    setFormLabExperience('');
    setFormSubjectId('');
    setFormDescription('');
    setSelectedItems([]);
    setShowAddForm(false);
  };

  if (showAddForm) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden" id="traceability-matrix-container">
        {/* Full Page: Asociar Insumos Físicos */}
        <div className="bg-slate-900 border-b border-indigo-500/20 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddForm(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition cursor-pointer border-none bg-transparent"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <div className="text-[10px] uppercase font-bold text-indigo-400 font-mono tracking-wider">{"Módulos > Trazabilidad > Vinculación"}</div>
              <h2 className="text-base font-extrabold tracking-tight font-sans uppercase">Asociar Insumos Físicos a Práctica Curricular</h2>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(false)}
            className="text-slate-400 hover:text-white text-xs font-semibold hover:underline cursor-pointer border-none bg-transparent"
          >
            Volver a la matriz
          </button>
        </div>

        <div className="p-6 max-w-4xl mx-auto py-10">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="mb-6 border-b border-slate-200 pb-4">
              <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Link2 className="w-5 h-5 text-indigo-650" />
                Vínculo Técnico-Pedagógico de Laboratorio
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                La trazabilidad permite predecir la disponibilidad en tiempo real de insumos de bodega respecto a las prácticas programadas según los requerimientos académicos.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-655 uppercase tracking-wider mb-2">Nombre de la Experiencia Práctica *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Laboratorio 5: Armado de circuitos integrados"
                    value={formLabExperience}
                    onChange={(e) => setFormLabExperience(e.target.value)}
                    className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-655 uppercase tracking-wider mb-2">Asignatura de la Malla CFT PUCV *</label>
                  <select
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                    className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                  >
                    {competencies.map(c => (
                      <option key={c.id} value={c.id}>[{c.code}] {c.subject}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-655 uppercase tracking-wider mb-2">Breve Descripción Directriz Pedagógica *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detalla qué objetivos prácticos de taller persigue el docente y el estudiantado en este laboratorio..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 resize-none h-[80px]"
                />
              </div>

              {/* Linking Items Sub-section */}
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <span className="text-2xs font-bold text-slate-700 uppercase tracking-wider block mb-3">Materiales e Instrumentos Solicitados de Bodega</span>
                
                <div className="flex flex-col sm:flex-row gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-150 mb-4">
                  <div className="flex-1 w-full">
                    <label className="block text-3xs font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Insumo en Bodega Disponible</label>
                    <select
                      value={temporaryItemId}
                      onChange={(e) => setTemporaryItemId(e.target.value)}
                      className="w-full text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    >
                      <option value="">-- Selecciona material físico --</option>
                      {inventory.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} (Stock: {item.stock} {item.unit} • Ubic.: {item.location.rack})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-28">
                    <label className="block text-3xs font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Cant. Necesaria</label>
                    <input
                      type="number"
                      min={1}
                      value={temporaryQuantity}
                      onChange={(e) => setTemporaryQuantity(Number(e.target.value))}
                      className="w-full text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemToPreset}
                    disabled={!temporaryItemId}
                    className="px-5 py-2.5 bg-indigo-900 text-white hover:bg-indigo-950 disabled:bg-slate-300 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 border-none"
                  >
                    Vincular Ítem
                  </button>
                </div>

                {/* Grid showing linked items ready */}
                {selectedItems.length === 0 ? (
                  <p className="text-xs text-rose-600 font-medium italic mt-2">Debes vincular al menos 1 insumo material para habilitar la trazabilidad.</p>
                ) : (
                  <div className="space-y-2">
                    <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Insumos vinculados para la práctica:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedItems.map((linked) => {
                        const original = inventory.find(i => i.id === linked.itemId);
                        return (
                          <div key={linked.itemId} className="flex justify-between items-center text-xs bg-indigo-50/50 px-4 py-2.5 rounded-lg border border-indigo-100">
                            <span className="font-semibold text-slate-800 text-2xs truncate pr-2">
                              {original ? original.name : "Insumo cargando"}
                            </span>
                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="bg-indigo-900 text-white font-mono font-bold text-3xs px-2 py-0.5 rounded">
                                Cant: {linked.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveItemFromPreset(linked.itemId)}
                                className="text-red-550 hover:text-red-700 bg-white hover:bg-red-50 rounded-full p-1 cursor-pointer border border-slate-200"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-5 py-2.5 border border-slate-350 rounded-lg text-xs font-bold text-slate-600 font-sans hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={selectedItems.length === 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-slate-900 font-extrabold rounded-lg text-xs transition cursor-pointer shadow-xs"
                >
                  Confirmar Trazado
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden" id="traceability-matrix-container">
      
      {/* Module Banner */}
      <div className="bg-slate-900 border-b border-indigo-500/20 px-6 py-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
            <Network className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight font-sans uppercase">Trazabilidad Pedagógica</h2>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Matriz asociativa que vincula guías de práctica académica con recursos de bodega
            </p>
          </div>
        </div>

        {isCoordinator && (
          <button
            onClick={() => {
              if (competencies.length === 0 || inventory.length === 0) {
                alert("Debes tener asignaturas y stock físico cargados antes de realizar una trazabilidad.");
                return;
              }
              setFormSubjectId(competencies[0]?.id || '');
              setShowAddForm(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-wider font-sans transition-all duration-150 flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-white stroke-[3]" />
            Nuevo Vínculo de Laboratorio
          </button>
        )}
      </div>

      <div className="p-4 sm:p-6">
        
        {/* ADD TRACEABILITY MAPPING FORM */}
        {showAddForm && (
          <div className="bg-slate-50 border border-slate-250 rounded-xl p-5 mb-8 shadow-inner relative animate-fadeIn">
            <button 
              onClick={() => setShowAddForm(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-black text-slate-800 font-sans mb-4 flex items-center gap-1.5 border-b border-indigo-150 pb-2 uppercase tracking-wider">
              <Link2 className="w-5 h-5 text-indigo-700" />
              Asociar Insumos Físicos a Experiencia de Malla
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-extrabold text-slate-550 uppercase mb-1">Nombre Descriptivo de la Experiencia Práctica *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Laboratorio 5: Armado de circuitos digitales integrados"
                    value={formLabExperience}
                    onChange={(e) => setFormLabExperience(e.target.value)}
                    className="w-full text-slate-700 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-extrabold text-slate-550 uppercase mb-1">Asignatura de la Malla CFT PUCV *</label>
                  <select
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                    className="w-full text-slate-700 bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-xs focus:outline-none"
                  >
                    {competencies.map(c => (
                      <option key={c.id} value={c.id}>[{c.code}] {c.subject}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-2xs font-extrabold text-slate-550 uppercase mb-1">Breve Descripción Directriz Pedagógica *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Detalla qué objetivos prácticos de taller persigue el docente y el estudiantado en este laboratorio..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full text-slate-755 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              {/* Linking Items Sub-section */}
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <span className="text-2xs font-extrabold text-indigo-950 uppercase tracking-wide block mb-3">Materiales e Instrumentos Solicitados de Bodega</span>
                
                <div className="flex flex-col sm:flex-row gap-3 items-end bg-slate-50 p-3 rounded-lg border border-slate-150 mb-3">
                  <div className="flex-1 w-full">
                    <label className="block text-3xs font-bold text-slate-500 uppercase mb-1">Insumo en Bodega Disponible</label>
                    <select
                      value={temporaryItemId}
                      onChange={(e) => setTemporaryItemId(e.target.value)}
                      className="w-full text-slate-700 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:outline-none"
                    >
                      <option value="">-- Selecciona material físico --</option>
                      {inventory.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} (Stock: {item.stock} {item.unit} • Ubic.: {item.location.rack})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-28">
                    <label className="block text-3xs font-bold text-slate-500 uppercase mb-1">Cantidad Necesaria</label>
                    <input
                      type="number"
                      min={1}
                      value={temporaryQuantity}
                      onChange={(e) => setTemporaryQuantity(Number(e.target.value))}
                      className="w-full text-slate-700 bg-white border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemToPreset}
                    disabled={!temporaryItemId}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-900 text-white hover:bg-indigo-950 disabled:bg-slate-300 rounded text-xs font-bold transition cursor-pointer"
                  >
                    Vincular Ítem
                  </button>
                </div>

                {/* Grid showing linked items ready */}
                {selectedItems.length === 0 ? (
                  <p className="text-xs text-rose-600 font-medium italic">Debes vincular al menos 1 insumo material para habilitar la trazabilidad.</p>
                ) : (
                  <div className="space-y-1.5">
                    <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Insumos vinculados para la práctica:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedItems.map((linked) => {
                        const original = inventory.find(i => i.id === linked.itemId);
                        return (
                          <div key={linked.itemId} className="flex justify-between items-center text-xs bg-indigo-50/50 px-3 py-1.5 rounded border border-indigo-100">
                            <span className="font-medium text-slate-800 text-2xs truncate pr-2">
                              {original ? original.name : "Insumo cargando"}
                            </span>
                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="bg-indigo-900 text-white font-mono font-bold text-3xs px-1.5 py-0.5 rounded">
                                Cant: {linked.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveItemFromPreset(linked.itemId)}
                                className="text-red-500 hover:text-red-700 hover:bg-white rounded border border-transparent hover:border-red-200 p-0.5 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-bold font-sans hover:bg-slate-100 transition shadow-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={selectedItems.length === 0}
                  className="px-5 py-2 bg-emerald-600 text-slate-950 font-bold hover:bg-emerald-700 disabled:bg-slate-350 disabled:text-slate-500 rounded-lg text-xs font-sans transition shadow-md cursor-pointer"
                >
                  Confirmar Trazado
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Traceability mapping grid with SEMAFORO STATUSES */}
        <div className="space-y-6">
          {traceability.map((trace) => {
            const subjectNode = competencies.find(c => c.id === trace.subjectId);
            const statusInfo = getReadinessStatus(trace);
            
            return (
              <div 
                key={trace.id} 
                className="bg-white border rounded-xl shadow-xs overflow-hidden hover:shadow-md transition-all duration-150 grid grid-cols-1 lg:grid-cols-4"
                style={{
                  borderLeft: `5px solid ${statusInfo.code === 'green' ? '#10b981' : statusInfo.code === 'yellow' ? '#f59e0b' : '#ef4444'}`
                }}
              >
                
                {/* Col 1 & 2: Curricular Link Description */}
                <div className="p-4 lg:col-span-2 space-y-3.5">
                  <div>
                    {subjectNode && (
                      <span className="font-mono text-3xs font-extrabold px-1.5 py-0.5 bg-indigo-100 text-indigo-900 rounded tracking-wider block w-max uppercase border border-indigo-200">
                        {subjectNode.code} &mdash; {subjectNode.subject}
                      </span>
                    )}
                    <h4 className="text-sm font-black text-slate-905 tracking-tight font-sans mt-2">{trace.labExperience}</h4>
                    <p className="text-2xs text-slate-600 font-sans leading-relaxed mt-1 italic">
                      "{trace.description}"
                    </p>
                  </div>

                  {subjectNode && (
                    <div className="bg-slate-50/70 p-2 rounded border border-slate-150 flex items-start gap-1.5 text-3xs text-slate-500">
                      <Compass className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-700 block">Competencia Tributada:</strong>
                        <span className="line-clamp-2">{subjectNode.profileCompetency}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Col 3: Materials snapshot and stock readiness check */}
                <div className="p-4 bg-slate-50 border-y lg:border-y-0 lg:border-x border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="text-3xs font-black text-slate-500 uppercase tracking-wider block mb-2">Insumos y Estado de Stock:</span>
                    <div className="space-y-1.5">
                      {statusInfo.items.map((item, idx) => {
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-2xs text-slate-750 font-medium truncate max-w-[140px]" title={item.name}>
                              {item.name}
                            </span>
                            <span className={`font-mono text-3xs font-bold px-1.5 py-0.5 rounded ${
                              item.status === 'shortage' 
                                ? 'bg-red-100 text-red-800' 
                                : item.status === 'warning' 
                                  ? 'bg-yellow-105 bg-yellow-100 text-yellow-800' 
                                  : 'bg-emerald-50 text-emerald-800'
                            }`}>
                              req: {item.required} / stock: {item.available}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {isCoordinator && (
                    <button
                      onClick={() => {
                        if (confirm("¿Estás seguro de disociar esta trazabilidad práctica?")) {
                          onDeleteTraceability(trace.id);
                        }
                      }}
                      className="text-red-500 hover:text-red-750 text-3xs font-bold font-sans flex items-center justify-end gap-1 mt-3 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Disociar experiencia
                    </button>
                  )}
                </div>

                {/* Col 4: Preparation Status traffic-light indicator */}
                <div className="p-4 flex flex-col justify-center items-center text-center space-y-2">
                  <span className="text-3xs font-extrabold text-slate-500 uppercase tracking-widest block">Semáforo de Preparación:</span>
                  
                  {statusInfo.code === 'green' && (
                    <div className="text-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                      <span className="text-emerald-800 bg-emerald-50 text-2xs font-extrabold px-3 py-1 rounded-full border border-emerald-100 mt-2 inline-block">
                        {statusInfo.label}
                      </span>
                      <p className="text-4xs text-slate-500 font-sans mt-1.5 max-w-[150px] mx-auto leading-tight">{statusInfo.desc}</p>
                    </div>
                  )}

                  {statusInfo.code === 'yellow' && (
                    <div className="text-center">
                      <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto" />
                      <span className="text-yellow-800 bg-yellow-50 text-2xs font-extrabold px-3 py-1 rounded-full border border-yellow-250 mt-2 inline-block">
                        {statusInfo.label}
                      </span>
                      <p className="text-4xs text-slate-500 font-sans mt-1.5 max-w-[150px] mx-auto leading-tight">{statusInfo.desc}</p>
                    </div>
                  )}

                  {statusInfo.code === 'red' && (
                    <div className="text-center">
                      <AlertOctagon className="w-10 h-10 text-red-500 mx-auto" style={{ animation: 'pulse 2s infinite' }} />
                      <span className="text-red-800 bg-red-50 text-2xs font-extrabold px-3 py-1 rounded-full border border-red-250 mt-2 inline-block">
                        {statusInfo.label}
                      </span>
                      <p className="text-4xs text-slate-500 font-sans mt-1.5 max-w-[150px] mx-auto leading-tight">{statusInfo.desc}</p>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
