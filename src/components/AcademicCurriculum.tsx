/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CurricularCompetency, UserRole } from '../types';
import { BookOpen, Plus, Trash2, Edit3, Award, GraduationCap, Archive, CheckCircle, Search, HelpCircle, X } from 'lucide-react';

interface AcademicCurriculumProps {
  competencies: CurricularCompetency[];
  role: UserRole;
  onAddCompetency: (competency: Omit<CurricularCompetency, 'id'>) => void;
  onUpdateCompetency: (id: string, competency: Partial<CurricularCompetency>) => void;
  onDeleteCompetency: (id: string) => void;
}

export default function AcademicCurriculum({
  competencies,
  role,
  onAddCompetency,
  onUpdateCompetency,
  onDeleteCompetency
}: AcademicCurriculumProps) {
  
  const isCoordinator = role === 'coordinador';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCareerFilter, setSelectedCareerFilter] = useState('Todas');
  
  // Form modal states
  const [showAddForm, setShowAddForm] = useState(false);
  const [formCareer, setFormCareer] = useState('T.N.S. en Electricidad y Automatización Industrial');
  const [formSubject, setFormSubject] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formSemester, setFormSemester] = useState('Primer Semestre');
  const [formProfileCompetency, setFormProfileCompetency] = useState('');
  const [formKeyLearningStr, setFormKeyLearningStr] = useState(''); // comma-separated or lines
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter career lists
  const careers = ['Todas', ...Array.from(new Set(competencies.map(c => c.career)))];

  const filteredCompetencies = competencies.filter(c => {
    const matchesSearch = c.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.profileCompetency.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCareer = selectedCareerFilter === 'Todas' || c.career === selectedCareerFilter;
    return matchesSearch && matchesCareer;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalCode = formCode.trim().toUpperCase();
    if (!finalCode && formSubject) {
      const subjectClean = formSubject.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
      const words = subjectClean.split(/\s+/).filter(w => w.length > 2 && !['CON', 'DEL', 'LOS', 'LAS', 'PARA', 'POR', 'UNA', 'UNO', 'Y', 'DE', 'A', 'EN'].includes(w));
      let prefix = '';
      if (words.length >= 2) {
        prefix = words.slice(0, 2).map(w => w.substring(0, 3)).join('');
      } else if (words.length === 1) {
        prefix = words[0].substring(0, 4);
      } else {
        prefix = 'ASIG';
      }
      finalCode = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
    }

    if (!formSubject || !finalCode || !formProfileCompetency) {
      alert("Por favor completa los campos principales requeridos.");
      return;
    }

    const keyLearningArray = formKeyLearningStr
      ? formKeyLearningStr.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      : ["Introducción experimental práctica"];

    const payload = {
      career: formCareer,
      subject: formSubject,
      code: finalCode,
      semester: formSemester,
      profileCompetency: formProfileCompetency,
      keyLearning: keyLearningArray
    };

    if (editingId) {
      onUpdateCompetency(editingId, payload);
    } else {
      onAddCompetency(payload);
    }

    resetForm();
  };

  const startEdit = (comp: CurricularCompetency) => {
    setEditingId(comp.id);
    setFormCareer(comp.career);
    setFormSubject(comp.subject);
    setFormCode(comp.code);
    setFormSemester(comp.semester);
    setFormProfileCompetency(comp.profileCompetency);
    setFormKeyLearningStr(comp.keyLearning.join('\n'));
    setShowAddForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormSubject('');
    setFormCode('');
    setFormProfileCompetency('');
    setFormKeyLearningStr('');
    setShowAddForm(false);
  };

  if (showAddForm) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden" id="academic-curriculum-container">
        {/* Full Page: Nodo Curricular / Asignatura */}
        <div className="bg-slate-900 border-b border-indigo-500/20 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={resetForm}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition cursor-pointer border-none bg-transparent"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <div className="text-[10px] uppercase font-bold text-indigo-400 font-mono tracking-wider">{"Módulos > Currículo > Gestión Académica"}</div>
              <h2 className="text-base font-extrabold tracking-tight font-sans uppercase">
                {editingId ? 'Editar Nodo Curricular' : 'Registrar Nuevo Nodo Curricular'}
              </h2>
            </div>
          </div>
          <button
            onClick={resetForm}
            className="text-slate-400 hover:text-white text-xs font-semibold hover:underline cursor-pointer border-none bg-transparent"
          >
            Volver a la malla
          </button>
        </div>

        <div className="p-6 max-w-4xl mx-auto py-10">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="mb-6 border-b border-slate-200 pb-4">
              <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                Definición Curricular de Asignatura y Competencias
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure la articulación de la competencia técnica de acuerdo con el Modelo Pedagógico del CFT PUCV. Esto alineará automáticamente las experiencias del planificador de taller.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-650 uppercase tracking-wider mb-2">Carrera Técnica CFT PUCV *</label>
                  <select
                    value={formCareer}
                    onChange={(e) => setFormCareer(e.target.value)}
                    className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                  >
                    <option value="T.N.S. en Electricidad y Automatización Industrial">T.N.S. en Electricidad y Automatización Industrial</option>
                    <option value="T.N.S. en Mecánica Automotriz">T.N.S. en Mecánica Automotriz</option>
                    <option value="T.N.S. en Informática y Comunicaciones">T.N.S. en Informática y Comunicaciones</option>
                    <option value="T.N.S. en Logística y Control Industrial">T.N.S. en Logística y Control Industrial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-650 uppercase tracking-wider mb-2">Semestre de Malla *</label>
                  <select
                    value={formSemester}
                    onChange={(e) => setFormSemester(e.target.value)}
                    className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                  >
                    <option value="Primer Semestre">Primer Semestre (S1)</option>
                    <option value="Segundo Semestre">Segundo Semestre (S2)</option>
                    <option value="Tercer Semestre">Tercer Semestre (S3)</option>
                    <option value="Cuarto Semestre">Cuarto Semestre (S4)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-650 uppercase tracking-wider mb-2">Nombre de la Asignatura *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electrónica Analógica y Digital"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-650 uppercase tracking-wider mb-2">Competencia del Perfil de Egreso Vinculada *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe detalladamente cómo tributa al egreso (la redacción formal del perfil técnico)..."
                  value={formProfileCompetency}
                  onChange={(e) => setFormProfileCompetency(e.target.value)}
                  className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 resize-none h-[100px]"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-650 uppercase tracking-wider mb-2">
                  Aprendizajes Clave / Unidades Prácticas de Taller (Uno por línea)
                </label>
                <textarea
                  rows={4}
                  placeholder="Escribe cada actividad práctica que requiere laboratorio en una línea distinta..."
                  value={formKeyLearningStr}
                  onChange={(e) => setFormKeyLearningStr(e.target.value)}
                  className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-2">
                  * Estas unidades dinámicas se cruzan automáticamente con la matriz de trazabilidad de insumos.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 border border-slate-350 rounded-lg text-xs font-bold text-slate-600 font-sans hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-xs"
                >
                  {editingId ? 'Guardar Cambios' : 'Ingresar Nodo a Malla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden" id="academic-curriculum-container">
      
      {/* Module Header */}
      <div className="bg-slate-900 border-b border-indigo-500/20 px-6 py-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight font-sans uppercase">Programa de Estudios y Malla Curricular</h2>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Definición formal de Competencias del Perfil de Egreso y Unidades Academicas
            </p>
          </div>
        </div>
        
        {isCoordinator && (
          <button
            onClick={() => { resetForm(); setShowAddForm(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-wider font-sans transition-all duration-150 flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-white stroke-[3]" />
            Añadir Asignatura o Competencia
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Buscar por código, asignatura o competencia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-slate-700 bg-white placeholder-slate-400 pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto whitespace-nowrap">
          <span className="text-xs font-bold text-slate-500 font-sans">Filtrar por Carrera:</span>
          {careers.map((career) => (
            <button
              key={career}
              onClick={() => setSelectedCareerFilter(career)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold font-sans transition-all cursor-pointer ${
                selectedCareerFilter === career
                  ? 'bg-indigo-900 text-white shadow-sm font-semibold'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-250'
              }`}
            >
              {career === 'Todas' ? 'Todas las carreras' : career.replace("T.N.S. en ", "")}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Forms and Lists */}
      <div className="p-4 sm:p-6">
        
        {/* Absolute modal or inline form for coordination */}
        {showAddForm && (
          <div className="bg-slate-50 border border-slate-250 rounded-xl p-5 mb-6 shadow-sm relative animate-fadeIn">
            <button 
              onClick={resetForm}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-md font-bold text-indigo-950 font-sans mb-4 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              {editingId ? 'Editar Nodo Curricular' : 'Registrar Nuevo Nodo Curricular / Asignatura'}
            </h3>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 font-sans mb-1 uppercase tracking-wider">Carrera Técnica CFT PUCV *</label>
                <select
                  value={formCareer}
                  onChange={(e) => setFormCareer(e.target.value)}
                  className="w-full text-slate-700 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="T.N.S. en Electricidad y Automatización Industrial">T.N.S. en Electricidad y Automatización Industrial</option>
                  <option value="T.N.S. en Mecánica Automotriz">T.N.S. en Mecánica Automotriz</option>
                  <option value="T.N.S. en Informática y Comunicaciones">T.N.S. en Informática y Comunicaciones</option>
                  <option value="T.N.S. en Logística y Control Industrial">T.N.S. en Logística y Control Industrial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 font-sans mb-1 uppercase tracking-wider">Semestre de Malla *</label>
                <select
                  value={formSemester}
                  onChange={(e) => setFormSemester(e.target.value)}
                  className="w-full text-slate-700 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="Primer Semestre">Primer Semestre (S1)</option>
                  <option value="Segundo Semestre">Segundo Semestre (S2)</option>
                  <option value="Tercer Semestre">Tercer Semestre (S3)</option>
                  <option value="Cuarto Semestre">Cuarto Semestre (S4)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 font-sans mb-1 uppercase tracking-wider">Nombre de la Asignatura *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electrónica Analógica y Digital"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full text-slate-700 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 font-sans mb-1 uppercase tracking-wider">Competencia del Perfil de Egreso Vinculada *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe detalladamente cómo tributa al egreso (la redacción formal del perfil técnico)..."
                  value={formProfileCompetency}
                  onChange={(e) => setFormProfileCompetency(e.target.value)}
                  className="w-full text-slate-700 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 font-sans mb-1 uppercase tracking-wider">
                  Aprendizajes Clave / Unidades Prácticas de Taller (Uno por línea)
                </label>
                <textarea
                  rows={3}
                  placeholder="Escribe cada actividad práctica que requiere laboratorio en una línea distinta..."
                  value={formKeyLearningStr}
                  onChange={(e) => setFormKeyLearningStr(e.target.value)}
                  className="w-full text-slate-700 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-bold font-sans hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white rounded-lg text-sm font-bold font-sans transition-all cursor-pointer flex items-center gap-1 shadow-md"
                >
                  <CheckCircle className="w-4 h-4" />
                  {editingId ? 'Guardar Cambios' : 'Registrar Malla'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Competencies list display */}
        {filteredCompetencies.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-sans text-sm">No se encontraron asignaturas o competencias con los filtros seleccionados.</p>
            <p className="text-xs text-slate-400 font-mono mt-1">Busca con otra palabra o añade una nueva en el botón superior.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredCompetencies.map((comp) => {
              return (
                <div 
                  key={comp.id} 
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-xs hover:shadow-md transition-all duration-150 flex flex-col overflow-hidden"
                >
                  {/* Subject Tag banner */}
                  <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded border border-indigo-100">
                          {comp.code}
                        </span>
                        <span className="text-2xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-800 rounded-full">
                          {comp.semester}
                        </span>
                      </div>
                      <h4 className="text-md font-extrabold text-slate-900 tracking-tight font-sans mt-2">{comp.subject}</h4>
                      <p className="text-2xs text-slate-500 font-sans font-medium mt-0.5">{comp.career}</p>
                    </div>

                    {isCoordinator && (
                      <div className="flex space-x-1 shrink-0">
                        <button
                          onClick={() => startEdit(comp)}
                          title="Editar nodo curricular"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Estás seguro de eliminar ${comp.subject}? Se desvincularán sus trazabilidades de laboratorios.`)) {
                              onDeleteCompetency(comp.id);
                            }
                          }}
                          title="Eliminar nodo"
                          className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Curricular & Profile Competence description block */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h5 className="text-xs font-bold text-slate-500 font-sans uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-emerald-500" />
                        Competencia del Perfil de Egreso vinculada:
                      </h5>
                      <p className="text-xs text-slate-700 leading-relaxed font-sans bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                        {comp.profileCompetency}
                      </p>
                    </div>

                    {/* Key Practicals bullets */}
                    <div>
                      <h5 className="text-xs font-bold text-slate-500 font-sans uppercase tracking-wider mb-2">
                        Aprendizajes Clave / Desarrollo de Taller:
                      </h5>
                      <div className="space-y-1.5">
                        {comp.keyLearning.map((item, id) => (
                          <div key={id} className="flex items-start gap-2 text-xs text-slate-600 font-sans">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
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
