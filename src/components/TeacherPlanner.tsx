/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CurricularCompetency, PedagogicalTraceability, InventoryItem, KitRequest, User } from '../types';
import { 
  Sparkles, Search, Compass, Calendar, FileText, CheckCircle, 
  HelpCircle, AlertCircle, Loader, RefreshCw, Send, ArrowRight, Table, Milestone, X,
  Cpu, Wrench
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface TeacherPlannerProps {
  competencies: CurricularCompetency[];
  traceability: PedagogicalTraceability[];
  inventory: InventoryItem[];
  requests: KitRequest[];
  currentUser: User;
  onAddRequest: (req: Omit<KitRequest, 'id' | 'status'>) => void;
}

export default function TeacherPlanner({
  competencies,
  traceability,
  inventory,
  requests,
  currentUser,
  onAddRequest
}: TeacherPlannerProps) {

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');
  
  // Kit Reservation Form state
  const [showReserveModal, setShowReserveModal] = useState<PedagogicalTraceability | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<PedagogicalTraceability | null>(null);
  const [reservationDate, setReservationDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0] // Default to 2 days from now
  );
  const [reservationNotes, setReservationNotes] = useState('');
  const [reservationSuccess, setReservationSuccess] = useState(false);

  // AI Generator Panel states
  const [selectedCompetencyForAI, setSelectedCompetencyForAI] = useState('');
  const [aiObjective, setAiObjective] = useState('');
  const [aiCustomText, setAiCustomText] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResponseMarkdown, setAiResponseMarkdown] = useState('');
  const [aiError, setAiError] = useState('');

  // Filtering for intelligent curricular search
  const filteredTraceabilities = traceability.filter(trace => {
    const subject = competencies.find(c => c.id === trace.subjectId);
    
    // text comparison
    const searchableText = `${trace.labExperience} ${trace.description} ${subject?.subject || ''} ${subject?.code || ''} ${subject?.profileCompetency || ''}`.toLowerCase();
    const matchesSearch = searchableText.includes(searchQuery.toLowerCase());
    
    const matchesSubject = !selectedSubjectFilter || trace.subjectId === selectedSubjectFilter;
    
    return matchesSearch && matchesSubject;
  });

  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReserveModal) return;

    const subjectNode = competencies.find(c => c.id === showReserveModal.subjectId);

    onAddRequest({
      labExperienceId: showReserveModal.id,
      labExperienceName: showReserveModal.labExperience,
      subjectCode: subjectNode ? subjectNode.code : "N/A",
      requestedBy: currentUser.id,
      teacherName: currentUser.name,
      dateRequired: reservationDate,
      notes: reservationNotes
    });

    setReservationSuccess(true);
    setTimeout(() => {
      setReservationSuccess(false);
      setShowReserveModal(null);
      setReservationNotes('');
    }, 2000);
  };

  const handleGenerateAIGuide = async () => {
    if (!selectedCompetencyForAI) {
      alert("Por favor selecciona una asignatura / competencia");
      return;
    }

    setAiGenerating(true);
    setAiError('');
    setAiResponseMarkdown('');

    try {
      const response = await fetch('/api/ai/generate-lab-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competencyId: selectedCompetencyForAI,
          targetObjective: aiObjective,
          customRequirements: aiCustomText
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ocurrió un error inesperado al procesar la guía.");
      }

      setAiResponseMarkdown(data.markdown);
    } catch (e: any) {
      console.error(e);
      setAiError(e.message || "Fallo de conexión o límites excedidos con el servidor de IA.");
    } finally {
      setAiGenerating(false);
    }
  };

  if (showReserveModal) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden" id="teacher-planner-container">
        {/* Full Page: Reservar Kit de Equipamiento */}
        <div className="bg-slate-900 border-b border-indigo-500/20 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowReserveModal(null)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition cursor-pointer border-none bg-transparent"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-400 font-mono tracking-wider">{"Módulos > Planificador > Reservas"}</div>
              <h2 className="text-base font-extrabold tracking-tight font-sans uppercase">Solicitar Kit de Suministro Técnico</h2>
            </div>
          </div>
          <button
            onClick={() => setShowReserveModal(null)}
            className="text-slate-400 hover:text-white text-xs font-semibold hover:underline cursor-pointer border-none bg-transparent"
          >
            Volver al planificador
          </button>
        </div>

        <div className="p-6 max-w-3xl mx-auto py-10">
          <div className="bg-white border border-slate-250 rounded-2xl shadow-sm p-6 space-y-6">
            
            {reservationSuccess ? (
              <div className="py-12 text-center space-y-4 animate-scaleUp">
                <div className="inline-flex p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-2">
                  <CheckCircle className="w-16 h-16 text-emerald-600 animate-bounce" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-lg">¡Solicitud de Reserva Sometida Exitosamente!</h4>
                <p className="text-xs text-slate-550 font-sans max-w-md mx-auto">
                  La requisición de insumos ha sido registrada y transmitida inmediatamente al Encargado de Bodega en estado <strong className="text-emerald-750 bg-emerald-50 px-1.5 py-0.5 rounded">Pendiente</strong>. Se calculará la disponibilidad del stock para tu práctica programada.
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => {
                      setReservationSuccess(false);
                      setShowReserveModal(null);
                      setReservationNotes('');
                    }}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-lg text-xs transition cursor-pointer font-sans"
                  >
                    Entendido, Volver a Planificaciones
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateReservation} className="space-y-6">
                
                {/* Exp Info header */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-700 border border-indigo-150 shrink-0">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-4xs font-bold text-slate-450 uppercase tracking-widest block">Laboratorio Académico Práctico</span>
                      <h4 className="text-sm font-black text-slate-800 font-sans mt-0.5">{showReserveModal.labExperience}</h4>
                      <p className="text-2xs text-slate-500 italic mt-1 leading-normal">
                        "{showReserveModal.description}"
                      </p>
                    </div>
                  </div>
                  
                  {/* Detailed Items requested breakdown */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 sm:w-72 shrink-0">
                    <span className="text-4xs font-extrabold text-indigo-900 uppercase tracking-wider block mb-2 border-b border-indigo-50 pb-1">Suministros del Kit</span>
                    <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                      {showReserveModal.requiredItems.map((req, idx) => {
                        const invItem = inventory.find(i => i.id === req.itemId);
                        return (
                          <div key={idx} className="flex justify-between items-center text-3xs font-mono">
                            <span className="text-slate-600 truncate max-w-[150px]" title={invItem?.name}>{invItem?.name || "Ítem"}</span>
                            <span className="font-bold text-indigo-900">x{req.quantityRequired} {invItem?.unit}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-2">Fecha Programada del Laboratorio / Taller *</label>
                    <input
                      type="date"
                      required
                      value={reservationDate}
                      onChange={(e) => setReservationDate(e.target.value)}
                      className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/25 font-semibold font-mono"
                    />
                    <p className="text-4xs text-slate-400 mt-2 leading-relaxed">
                      El bodeguero requiere al menos 24 hrs de antelación para preparar la estiba, calibrar el material y asegurar el nivel de stock.
                    </p>
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-2">Notas Especiales / Instrucciones adicionales de Montaje</label>
                    <textarea
                      rows={4}
                      placeholder="Ej. Dejar bobinas montadas en mesas de trabajo, o requerimos calibrador pie de rey calibrado en mm extra..."
                      value={reservationNotes}
                      onChange={(e) => setReservationNotes(e.target.value)}
                      className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/25 resize-none h-[100px]"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-3xs text-slate-750 font-mono tracking-tight leading-relaxed">
                  ⚠️ <strong>Reglamento de Prácticas CFT PUCV:</strong> Al formalizar esta reserva de kit, te comprometes a devolver la totalidad de herramientas y maquinaría limpia y en buen estado. El Encargado de Bodega notificará vía esta plataforma de cualquier merma observada durante el desglose.
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-150">
                  <button
                    type="button"
                    onClick={() => setShowReserveModal(null)}
                    className="px-5 py-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Regresar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Enviar Requisición a Bodega
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="teacher-planner-container">
      
      {/* LEFT & CENTER PANEL (Cols 2/3): Curricular Search & Kit Reserver */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Curricular Smart Search bar card */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 border-b border-indigo-500/20 px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Search className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-extrabold text-xs font-sans uppercase tracking-widest text-white">Planificador Inteligente y Buscador CFT</h3>
                <p className="text-[10px] text-slate-400 font-sans mt-0.5">Asocie qué insumos físicos se necesitan para qué laboratorios según su materia</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-3xs font-extrabold text-slate-500 uppercase mb-1">Palabra Clave (Asignatura, Código, Competencia)</label>
              <input
                type="text"
                placeholder="Ej. Electrónica, ELE-102, micrómetro, freno..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs text-slate-755 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-3xs font-extrabold text-slate-500 uppercase mb-1">Filtrar por Asignatura Específica</label>
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="w-full text-xs text-slate-755 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:outline-none"
              >
                <option value="">Todas las Asignaturas</option>
                {competencies.map(c => (
                  <option key={c.id} value={c.id}>[{c.code}] {c.subject}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results displaying traced practices with easy Reservar button */}
          <div className="p-4 sm:p-5 space-y-4">
            <span className="text-3xs font-black text-slate-500 uppercase tracking-widest block">Experiencias y Laboratorios Trazados Disponibles:</span>
            
            {filteredTraceabilities.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                <Compass className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-xs font-sans">No se encontraron experiencias trazadas que dependan de ese criterio.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTraceabilities.map((trace) => {
                  const subjectNode = competencies.find(c => c.id === trace.subjectId);
                  
                  // Check stock readiness
                  const missingItems = trace.requiredItems.filter(req => {
                    const invItem = inventory.find(i => i.id === req.itemId);
                    return !invItem || invItem.stock < req.quantityRequired;
                  });
                  const isStockReady = missingItems.length === 0;

                  return (
                    <div 
                      key={trace.id} 
                      onClick={() => setShowDetailModal(trace)}
                      className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-350 hover:shadow-md transition-all grid grid-cols-1 md:grid-cols-4 gap-4 items-center cursor-pointer hover:bg-slate-50/50 group"
                      title="Haz clic para ver la ficha técnica completa con ubicación de materiales"
                    >
                      
                      {/* Subject Code badge & Practice name */}
                      <div className="md:col-span-2 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          {subjectNode && (
                            <span className="text-4xs font-mono font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">
                              {subjectNode.code} &mdash; {subjectNode.semester}
                            </span>
                          )}
                          <span className="text-3xs text-indigo-600 font-semibold group-hover:underline flex items-center gap-1">
                            <Cpu className="w-3 h-3" /> Ver Ficha
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 font-sans group-hover:text-indigo-950 transition-colors">{trace.labExperience}</h4>
                        <p className="text-3xs text-slate-500 font-sans line-clamp-2">{trace.description}</p>
                      </div>

                      {/* Required inventories preview */}
                      <div className="space-y-1">
                        <span className="text-4xs font-bold text-slate-400 uppercase tracking-widest block">Insumos Requeridos:</span>
                        <div className="space-y-0.5">
                          {trace.requiredItems.slice(0, 3).map((req, idx) => {
                            const original = inventory.find(i => i.id === req.itemId);
                            return (
                              <div key={idx} className="flex justify-between items-center text-3xs text-slate-600 font-sans">
                                <span className="truncate pr-1 max-w-[100px]">{original ? original.name : "Material"}</span>
                                <span className="font-mono bg-slate-50 px-1 py-0.2 rounded font-bold">-{req.quantityRequired}</span>
                              </div>
                            );
                          })}
                          {trace.requiredItems.length > 3 && (
                            <span className="text-4xs text-indigo-650 block">+{trace.requiredItems.length - 3} materiales más...</span>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      <div className="text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setShowReserveModal(trace)}
                          className="w-full md:w-auto px-5 py-2 bg-indigo-900 hover:bg-slate-950 text-white rounded-lg text-xs font-extrabold font-sans transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer uppercase tracking-wider"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          SOLICITAR
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Requests Status list for active Docente */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-sans">
              Mis Solicitudes de Kits y Reservas Históricas
            </h3>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo- sehingga rounded text-4xs font-extrabold uppercase tracking-widest text-indigo-900 font-mono">
              HISTORIAL ACTIVO
            </span>
          </div>

          <div className="p-4 space-y-3.5 text-xs max-h-[300px] overflow-y-auto">
            {requests.length === 0 ? (
              <p className="text-center text-slate-450 italic py-4 text-slate-400 font-sans">No has registrado reservas de kits de laboratorios aún.</p>
            ) : (
              <div className="divide-y divide-slate-150 space-y-3">
                {requests.map(req => (
                  <div key={req.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-2xs">{req.labExperienceName}</span>
                        <span className="font-mono text-3xs bg-slate-100 px-1 py-0.5 rounded text-slate-600 font-bold">{req.subjectCode}</span>
                      </div>
                      <div className="text-3xs text-slate-550 flex items-center gap-3 mt-1 font-mono">
                        <span>Docente: <strong>{req.teacherName}</strong></span>
                        <span>Fecha Requerida: <strong>{req.dateRequired}</strong></span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-3xs font-extrabold tracking-wide uppercase ${
                        req.status === 'pendiente' ? 'bg-orange-100 text-orange-850 border border-orange-200' :
                        req.status === 'preparado' ? 'bg-blue-105 bg-blue-100 text-blue-980' : 
                        req.status === 'entregado' ? 'bg-emerald-100 text-emerald-990 border border-emerald-250' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* RIGHT SIDEBAR PANEL (Col 1/3): Gemini-powered AI Laboratory Planner Helper */}
      <div className="space-y-6">
        
        <div className="bg-slate-900 text-white rounded-xl shadow-lg border border-slate-800 overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center space-x-2.5">
            <div className="p-1.5 bg-indigo-600 rounded text-white shadow-inner">
              <Sparkles className="w-4.5 h-4.5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-[11px] font-black tracking-widest uppercase font-sans">Asistente IA CFT PUCV</h3>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">Generador de Guías Prácticas alineadas con Malla e Inventario Real</p>
            </div>
          </div>

          {/* Form */}
          <div className="p-5 space-y-4">
            
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                1. Selección de Unidad / Competencia
              </label>
              <select
                value={selectedCompetencyForAI}
                onChange={(e) => setSelectedCompetencyForAI(e.target.value)}
                className="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded-lg px-2.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Elige nodo curricular --</option>
                {competencies.map(c => (
                  <option key={c.id} value={c.id}>[{c.code}] {c.subject}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                2. Objetivo Académico de la Guía (Opcional)
              </label>
              <input
                type="text"
                value={aiObjective}
                onChange={(e) => setAiObjective(e.target.value)}
                placeholder="Ej. Medir voltaje con transformador rectificador"
                className="w-full text-xs text-slate-700 bg-white border border-slate-350 rounded-lg px-2.5 py-1.5 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                3. Otras especificaciones técnicas o temáticas
              </label>
              <textarea
                rows={3}
                value={aiCustomText}
                onChange={(e) => setAiCustomText(e.target.value)}
                placeholder="Ej. Añade guantes de seguridad clase 00 para manipulación de tensión, limitar grupos práticos a 2 personas."
                className="w-full text-xs text-slate-700 bg-white border border-slate-350 rounded-lg px-2.5 py-1.5 focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={handleGenerateAIGuide}
              disabled={aiGenerating || !selectedCompetencyForAI}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white border-none font-extrabold uppercase tracking-wider py-3 px-4 rounded-lg text-[10px] leading-none flex items-center justify-center gap-1.5 shadow-xs transition duration-150 cursor-pointer disabled:text-slate-500"
            >
              {aiGenerating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin text-white" />
                  Sintetizando material...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  Estructurar Guía Práctica IA
                </>
              )}
            </button>

          </div>
        </div>

        {/* AI Answer Stream Card */}
        {(aiResponseMarkdown || aiError) && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="bg-slate-100 p-3.5 border-b border-slate-200 flex justify-between items-center text-slate-800">
              <span className="text-3xs font-black uppercase tracking-wider font-sans text-indigo-900 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-indigo-700" />
                Guía Didáctica Generada
              </span>
              <button
                onClick={() => setAiResponseMarkdown('')}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 text-slate-700 max-h-[600px] overflow-y-auto selection:bg-indigo-100 scrollbar-thin">
              {aiError && (
                <div className="bg-red-50 text-red-800 p-3.5 rounded-lg text-xs font-sans flex gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-650" />
                  <div>
                    <strong className="block font-bold">Error de Generación:</strong>
                    <span>{aiError}</span>
                  </div>
                </div>
              )}

              {aiResponseMarkdown && (
                <div className="prose prose-sm prose-slate select-text">
                  <MarkdownRenderer content={aiResponseMarkdown} />
                </div>
              )}
            </div>

            {aiResponseMarkdown && (
              <div className="p-3 bg-indigo-50 border-t border-slate-200 text-center">
                <span className="text-4xs font-mono font-bold text-indigo-900 uppercase tracking-widest block">
                  Material exclusivo CFT PUCV &mdash; Impulsado por Gemini 3.5 Flash
                </span>
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL: Place Reservation request */}
      {showReserveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-250 animate-scaleUp">
            <div className="bg-indigo-950 p-4 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm font-sans flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-emerald-400" />
                Solicitar Kit de Equipamiento Práctico
              </h3>
              <button onClick={() => setShowReserveModal(null)} className="text-indigo-200 hover:text-white p-1 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {reservationSuccess ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="font-bold text-slate-900 text-sm">¡Reserva de Kit Sometida!</h4>
                <p className="text-xs text-slate-550 font-sans">
                  La solicitud de suministros ingresó a la bandeja del Encargado de Bodega en estado <strong>Pendiente</strong>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateReservation} className="p-5 space-y-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-150">
                  <span className="text-4xs font-bold text-slate-500 uppercase block">Laboratorio Seleccionado</span>
                  <span className="text-xs font-black text-slate-900 font-sans block mt-0.5">{showReserveModal.labExperience}</span>
                  <span className="text-3xs text-slate-450 block mt-1 font-mono">Depende de la asignatura de malla asociada</span>
                </div>

                <div>
                  <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha Programada de la Práctica *</label>
                  <input
                    type="date"
                    required
                    value={reservationDate}
                    onChange={(e) => setReservationDate(e.target.value)}
                    className="w-full text-slate-755 bg-slate-50 border border-slate-350 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                  />
                  <span className="text-4xs text-slate-400 block mt-1">El bodeguero preparará la estiba del material para esta fecha especificada.</span>
                </div>

                <div>
                  <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notas / Instrucciones de montaje adicionales</label>
                  <textarea
                    rows={2}
                    placeholder="Ej. Necesitamos cables extras, o calibración previa del osciloscopio..."
                    value={reservationNotes}
                    onChange={(e) => setReservationNotes(e.target.value)}
                    className="w-full text-slate-755 bg-slate-50 border border-slate-350 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none resize-none"
                  />
                </div>

                <div className="bg-slate-900 p-2.5 rounded text-4xs text-slate-300 font-mono tracking-tight leading-relaxed">
                  ⚠️ NOTA REGLAMENTO CFT: Al someter esta reserva, el bodeguero verificará que los materiales no tengan conflicto horario con otros docentes. Recibirá una notificación al cambiar el estado.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReserveModal(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 font-sans hover:bg-slate-100 cursor-pointer"
                  >
                    Salir
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-900 text-white rounded-lg text-xs font-bold font-sans hover:bg-indigo-950 transition cursor-pointer flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Enviar Solicitud
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DETAIL MODAL: Information Sheet for selected experience */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-250 animate-scaleUp">
            
            {/* Header */}
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2.5">
                <Cpu className="w-5 h-5 text-indigo-400" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-indigo-400 font-mono tracking-wider">Ficha Técnica de Experiencia Práctica</div>
                  <h3 className="font-extrabold text-sm font-sans uppercase">
                    {showDetailModal.labExperience}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setShowDetailModal(null)} 
                className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Subject Info Block */}
              {(() => {
                const subjectNode = competencies.find(c => c.id === showDetailModal.subjectId);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-4xs font-bold text-slate-450 uppercase block">Asignatura / Malla CFT</span>
                      <span className="text-xs font-bold text-slate-800 font-sans block mt-0.5">
                        {subjectNode ? `[${subjectNode.code}] ${subjectNode.subject}` : "Asignatura no especificada"}
                      </span>
                    </div>
                    <div>
                      <span className="text-4xs font-bold text-slate-450 uppercase block">Carrera / Área</span>
                      <span className="text-xs font-medium text-slate-700 font-sans block mt-0.5">
                        {subjectNode?.career || "Carrera/Área no cargada"}
                      </span>
                    </div>
                    <div>
                      <span className="text-4xs font-bold text-slate-450 uppercase block">Semestre de Malla</span>
                      <span className="text-xs font-mono font-bold text-slate-700 mt-0.5 block">
                        {subjectNode?.semester || "Semestre N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-4xs font-bold text-slate-450 uppercase block">Competencia Clave del Perfil</span>
                      <span className="text-xs font-medium text-slate-700 font-sans block mt-0.5">
                        {subjectNode?.profileCompetency || "Competencia no definida"}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Description Panel */}
              <div className="space-y-1.5">
                <span className="text-4xs font-black text-slate-500 uppercase tracking-widest block">Directriz Académica de la Experiencia</span>
                <p className="text-xs text-slate-750 font-sans bg-slate-50/50 p-4 rounded-xl border border-slate-150 leading-relaxed">
                  {showDetailModal.description}
                </p>
              </div>

              {/* Physical Materials Requirements with Locations */}
              <div className="space-y-3">
                <span className="text-4xs font-black text-slate-500 uppercase tracking-widest block font-sans">Insumos y Equipos Requeridos de Bodega</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {showDetailModal.requiredItems.map((req, idx) => {
                    const original = inventory.find(i => i.id === req.itemId);
                    const hasEnough = original ? original.stock >= req.quantityRequired : false;
                    return (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 shadow-3xs flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {original ? original.name : "Material / Suministro"}
                            </span>
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                              hasEnough 
                                ? 'bg-emerald-50 text-emerald-800' 
                                : 'bg-rose-50 text-rose-850'
                            }`}>
                              {original ? `Stock: ${original.stock}` : "N/A"}
                            </span>
                          </div>
                          
                          {original && (
                            <div className="mt-2 space-y-1">
                              <span className="text-4xs font-mono text-slate-400 block uppercase">Ubicación Física en Bodega:</span>
                              <div className="bg-slate-50 p-1.5 rounded border border-slate-150 text-[10px] text-slate-600 font-mono tracking-tight">
                                Aula/Taller: {original.location.classroom} • Rack/Estante: {original.location.rack} • Repisa: {original.location.shelf}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-3xs">
                          <span className="text-slate-500">Cantidad Necesaria:</span>
                          <span className="bg-indigo-50 text-indigo-900 px-2.5 py-0.5 rounded font-black font-mono text-xs">
                            {req.quantityRequired} {original?.unit || 'u.'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDetailModal(null)}
                className="px-4 py-2 border border-slate-350 rounded-lg text-xs font-bold text-slate-600 font-sans hover:bg-slate-100 transition cursor-pointer"
              >
                Cerrar Ficha
              </button>
              <button
                type="button"
                onClick={() => {
                  const trace = showDetailModal;
                  setShowDetailModal(null);
                  setShowReserveModal(trace);
                }}
                className="px-5 py-2 bg-indigo-900 hover:bg-slate-950 text-white rounded-lg text-xs font-extrabold font-sans transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                SOLICITAR KIT
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
