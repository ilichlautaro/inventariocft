/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { InventoryItem, StockMovement, User, UserRole } from '../types';
import { 
  Package, Plus, HardHat, Eye, ArrowUpRight, ArrowDownRight, Edit2, Trash2, 
  Search, AlertTriangle, MapPin, Database, Bookmark, History, Check, X, ClipboardList 
} from 'lucide-react';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  movements: StockMovement[];
  role: UserRole;
  currentUser: User;
  onAddItem: (item: Omit<InventoryItem, 'id'>) => void;
  onUpdateItem: (id: string, item: Partial<InventoryItem>, reason?: string) => void;
  onDeleteItem: (id: string) => void;
}

export default function InventoryManager({
  inventory,
  movements,
  role,
  currentUser,
  onAddItem,
  onUpdateItem,
  onDeleteItem
}: InventoryManagerProps) {

  const isWarehouseKeeper = role === 'bodeguero';
  const isReadWrite = role === 'bodeguero' || role === 'coordinador';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState<InventoryItem | null>(null);
  const [stockAdjustmentQuantity, setStockAdjustmentQuantity] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState('Ajuste de inventario físico mensual');

  // Form states for new item
  const [formName, setFormName] = useState('');
  const [formStock, setFormStock] = useState<number>(10);
  const [formUnit, setFormUnit] = useState('unidades');
  const [formCategory, setFormCategory] = useState('Instrumental Técnico');
  const [formMinStock, setFormMinStock] = useState<number>(2);
  const [formRack, setFormRack] = useState('Estante A');
  const [formShelf, setFormShelf] = useState('Nivel 1');
  const [formBox, setFormBox] = useState('');
  const [formClassroom, setFormClassroom] = useState('Laboratorio Eléctrico y Automatización');

  const categories = ['Todas', ...Array.from(new Set(inventory.map(item => item.category)))];

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.location.classroom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) {
      alert("Introduce un nombre válido para el insumo.");
      return;
    }

    onAddItem({
      name: formName,
      stock: Number(formStock),
      unit: formUnit,
      category: formCategory,
      minStock: Number(formMinStock),
      location: {
        rack: formRack,
        shelf: formShelf,
        box: formBox || undefined,
        classroom: formClassroom
      }
    });

    // Reset Form
    setFormName('');
    setFormStock(10);
    setFormMinStock(2);
    setFormBox('');
    setShowAddModal(false);
  };

  const handleAdjustStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdjustmentModal) return;

    onUpdateItem(
      showAdjustmentModal.id, 
      { stock: Number(stockAdjustmentQuantity) }, 
      adjustmentReason
    );

    setShowAdjustmentModal(null);
    setStockAdjustmentQuantity(0);
    setAdjustmentReason('Ajuste de inventario físico mensual');
  };

  if (showAddModal) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden" id="inventory-manager-container">
        {/* Full Page: Registrar Nuevo Insumo Físico */}
        <div className="bg-slate-900 border-b border-indigo-500/20 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddModal(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition cursor-pointer border-none"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-400 font-mono tracking-wider">{"Módulos > Inventario > Registro"}</div>
              <h2 className="text-base font-extrabold tracking-tight font-sans uppercase">Registrar Nuevo Insumo Físico</h2>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(false)}
            className="text-slate-400 hover:text-white text-xs font-semibold hover:underline cursor-pointer border-none bg-transparent"
          >
            Volver al listado
          </button>
        </div>

        <div className="p-6 max-w-3xl mx-auto py-10">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="mb-6 border-b border-slate-200 pb-4">
              <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                Especificaciones Técnicas y de Acopio
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                La creación de este insumo registrará automáticamente un lote inicial con la procedencia y ubicación correspondiente de acuerdo al manual técnico CFT.
              </p>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-5">
              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-2">Nombre completo del Insumo / Instrumento *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Multímetro Fluke, Cable Unipolar, Rodamiento"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-2">Stock Inicial *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-2">Unidad Medida *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. unidades, metros, cajones"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-2">Categoría General *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 cursor-pointer"
                  >
                    <option value="Instrumental Técnico">Instrumental Técnico</option>
                    <option value="Equipo de Medida">Equipo de Medida</option>
                    <option value="Herramientas de Soldadura">Herramientas de Soldadura</option>
                    <option value="Placas de Desarrollo">Placas de Desarrollo</option>
                    <option value="Componentes Electrónicos">Componentes Electrónicos</option>
                    <option value="Sistemas Mecánicos">Sistemas Mecánicos</option>
                    <option value="Consumibles">Consumibles</option>
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-2">Stock Mínimo de Alerta *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(Number(e.target.value))}
                    className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Coordinates */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-4">
                <span className="text-2xs font-extrabold text-teal-900 uppercase tracking-wider block border-b border-emerald-100 pb-2">
                  Coordenadas de Almacenamiento y Control
                </span>
                
                <div>
                  <label className="block text-3xs font-bold text-slate-600 mb-1">Ubicación física de Aula / Taller *</label>
                  <input
                    type="text"
                    required
                    value={formClassroom}
                    onChange={(e) => setFormClassroom(e.target.value)}
                    className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-3xs font-bold text-slate-600 mb-1">Estante (Rack) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Estante A"
                      value={formRack}
                      onChange={(e) => setFormRack(e.target.value)}
                      className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                    />
                  </div>
                  <div>
                    <label className="block text-3xs font-bold text-slate-600 mb-1">Nivel (Repisa) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Nivel 3"
                      value={formShelf}
                      onChange={(e) => setFormShelf(e.target.value)}
                      className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                    />
                  </div>
                  <div>
                    <label className="block text-3xs font-bold text-slate-600 mb-1">Caja (Opcional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Caja 4"
                      value={formBox}
                      onChange={(e) => setFormBox(e.target.value)}
                      className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 border border-slate-350 rounded-lg text-xs font-bold text-slate-600 font-sans hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar registro
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-slate-900 font-extrabold rounded-lg text-xs font-sans transition cursor-pointer shadow-xs"
                >
                  Confirmar e Ingresar a Taller
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (showAdjustmentModal) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden" id="inventory-manager-container">
        {/* Full Page: Ajuste de Stock */}
        <div className="bg-slate-900 border-b border-indigo-500/20 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAdjustmentModal(null)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition cursor-pointer border-none"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <div className="text-[10px] uppercase font-bold text-amber-500 font-mono tracking-wider">{"Módulos > Inventario > Auditoría"}</div>
              <h2 className="text-base font-extrabold tracking-tight font-sans uppercase">Ajuste de Stock por Auditoría</h2>
            </div>
          </div>
          <button
            onClick={() => setShowAdjustmentModal(null)}
            className="text-slate-400 hover:text-white text-xs font-semibold hover:underline cursor-pointer border-none bg-transparent"
          >
            Volver al listado
          </button>
        </div>

        <div className="p-6 max-w-2xl mx-auto py-12">
          <div className="bg-white border border-slate-250 rounded-2xl shadow-sm p-6 overflow-hidden">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between mb-6">
              <div>
                <span className="text-3xs font-extrabold text-slate-500 uppercase tracking-widest block">Ítem seleccionado</span>
                <span className="text-sm font-black text-slate-800 block mt-0.5">{showAdjustmentModal.name}</span>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">Cat: {showAdjustmentModal.category}</span>
              </div>
              <div className="text-right">
                <span className="text-3xs font-extrabold text-slate-500 uppercase tracking-widest block">Existencia Actual</span>
                <span className="text-lg font-mono font-black text-slate-800 block">
                  {showAdjustmentModal.stock} <span className="text-xs font-sans font-medium">{showAdjustmentModal.unit}</span>
                </span>
              </div>
            </div>

            <form onSubmit={handleAdjustStockSubmit} className="space-y-6">
              <div>
                <label className="block text-2xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                  Especificar Nuevo Stock Físico Verificado *
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    required
                    min={0}
                    value={stockAdjustmentQuantity}
                    onChange={(e) => setStockAdjustmentQuantity(Number(e.target.value))}
                    className="w-full text-center text-xl font-bold font-mono bg-slate-50 border border-slate-350 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <span className="font-sans text-sm font-bold text-slate-500 w-24 shrink-0">{showAdjustmentModal.unit}</span>
                </div>
              </div>

              <div>
                <label className="block text-2xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                  Motivo Formal de la Modificación Auditora *
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full text-slate-800 bg-white border border-slate-350 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 cursor-pointer"
                >
                  <option value="Conteo físico e inventariado semestral">Conteo físico e inventariado semestral</option>
                  <option value="Reposición de insumos dañados por alumnado">Reposición de insumos dañados por alumnado</option>
                  <option value="Adición de remesas de stock comprados de fábrica">Adición de remesas de stock comprados de fábrica</option>
                  <option value="Reducción por merma o pérdida documentada">Reducción por merma o pérdida documentada</option>
                  <option value="Ajuste manual rápido de emergencia">Ajuste manual rápido de emergencia</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-2 font-mono">
                  * Este motivo se guardará como traza inmutable para fines de auditoría semestral del CFT PUCV.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(null)}
                  className="px-5 py-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-extrabold rounded-lg text-xs transition cursor-pointer shadow-xs"
                >
                  Aplicar Ajuste Físico
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden" id="inventory-manager-container">
      
      {/* Module Title Banner */}
      <div className="bg-slate-900 border-b border-indigo-500/20 px-6 py-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
            <Package className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight font-sans uppercase">Inventario de Bodega y Laboratorios</h2>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Control de existencias físicas, almacenamiento en estantes, insumos técnicos y auditorías
            </p>
          </div>
        </div>

        {isWarehouseKeeper && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-wider font-sans transition-all duration-150 flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-white stroke-[3]" />
            Registrar Nuevo Insumo
          </button>
        )}
      </div>

      {/* Stats counter & Filters */}
      <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-250 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-2xs font-extrabold text-slate-500 uppercase tracking-widest block">Total Ítems en Catálogo</span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-1 block">{inventory.length}</span>
          </div>
          <div className="bg-slate-100 p-2 text-slate-600 rounded-lg">
            <Database className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-250 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-2xs font-extrabold text-slate-500 uppercase tracking-widest block">Stock Crítico o Alertado</span>
            <span className="text-2xl font-black text-yellow-650 font-mono mt-1 block">
              {inventory.filter(i => i.stock <= i.minStock).length}
            </span>
          </div>
          <div className="bg-yellow-50 p-2 text-yellow-600 rounded-lg border border-yellow-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Search */}
        <div className="md:col-span-2 bg-white p-3 rounded-xl border border-slate-250 flex flex-col justify-center">
          <label className="text-3xs font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 block">Buscador y Categoría</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="h-4.5 w-4.5 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Buscar insumo por nombre o ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="Todas">Categorías</option>
              {categories.filter(c => c !== 'Todas').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Layout: Stock Table + Log History */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-4 sm:p-6">
        
        {/* Left 2 Cols: Inventory List */}
        <div className="xl:col-span-2 space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
            <table className="min-w-full divide-y divide-slate-250 text-left text-xs font-sans">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-2xs">
                <tr>
                  <th className="px-4 py-3.5">Detalle del Recurso</th>
                  <th className="px-4 py-3.5">Categoría</th>
                  <th className="px-4 py-3.5 text-center">Nivel Stock</th>
                  <th className="px-4 py-3.5">Ubicación Física</th>
                  {isReadWrite && <th className="px-4 py-3.5 text-right">Controles</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredInventory.map((item) => {
                  const isLowStock = item.stock <= item.minStock;
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${isLowStock ? 'bg-yellow-50/20' : ''}`}>
                      {/* Name & ID */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 text-xs">{item.name}</div>
                        <div className="text-3xs text-slate-500 font-mono mt-0.5 uppercase tracking-wide">ID: {item.id}</div>
                      </td>

                      {/* Category Badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-750 rounded text-3s font-bold">
                          {item.category}
                        </span>
                      </td>

                      {/* Stock Level display */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${
                            isLowStock 
                              ? 'bg-red-100 text-red-800 animate-pulse border border-red-200' 
                              : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            {item.stock} <span className="text-3xs font-sans font-medium">{item.unit}</span>
                          </span>
                          <span className="text-3xs font-semibold text-slate-400 mt-1">Mínimo: {item.minStock}</span>
                        </div>
                      </td>

                      {/* Location Coordinates */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-1 text-slate-650 text-2xs">
                          <MapPin className="w-3.5 h-3.5 text-teal-650 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-slate-750">{item.location.classroom}</div>
                            <div className="text-slate-500 font-mono">
                              Estante: <strong className="text-slate-800">{item.location.rack}</strong> • Repisa: <strong className="text-slate-800">{item.location.shelf}</strong>
                              {item.location.box && ` • Caja: ${item.location.box}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Controls (Write level required) */}
                      {isReadWrite && (
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1.5">
                            {/* Adjustment control */}
                            <button
                              onClick={() => {
                                setStockAdjustmentQuantity(item.stock);
                                setShowAdjustmentModal(item);
                              }}
                              title="Ajustar stock rápido"
                              className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-150 text-teal-900 border border-teal-200 hover:border-teal-350 rounded-lg font-bold font-sans text-3xs transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              Ajustar
                            </button>
                            
                            {/* Delete (only Bodeguero can delete completely) */}
                            {isWarehouseKeeper && (
                              <button
                                onClick={() => {
                                  if (confirm(`¿Estás seguro de eliminar ${item.name} del inventario permanente?`)) {
                                    onDeleteItem(item.id);
                                  }
                                }}
                                title="Eliminar ítem del catálogo"
                                className="p-1.5 text-slate-400 hover:text-red-750 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Physical Traceability Movement Stream Logs */}
        <div className="bg-slate-850/5 border border-slate-200/90 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <History className="w-4.5 h-4.5 text-emerald-600" />
              Trazabilidad de Movimientos
            </h3>
            
            <div className="space-y-3.5 overflow-y-auto max-h-[440px] pr-1 scrollbar-thin">
              {movements.map((move) => {
                const isInput = move.type === 'entrada';
                const isOutput = move.type === 'salida';
                return (
                  <div key={move.id} className="bg-white p-3 rounded-lg border border-slate-150 shadow-3xs hover:shadow-2xs transition-all">
                    <div className="flex items-start justify-between gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-3xs font-extrabold uppercase font-mono tracking-wide ${
                        isInput ? 'bg-emerald-100 text-emerald-800' : isOutput ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {move.type}
                      </span>
                      <span className="text-3xs text-slate-400 font-mono font-medium">
                        {new Date(move.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="mt-2">
                      <span className="text-xs font-extrabold text-slate-900 block">{move.itemName}</span>
                      <span className="text-3xs font-mono text-slate-500 block">Movimiento: {move.quantity > 0 ? `${move.quantity} camb.` : 'Eliminación'}</span>
                    </div>

                    <p className="text-2xs text-slate-600 font-sans italic mt-1.5 border-l-2 border-slate-300 pl-2">
                      "{move.reason}"
                    </p>

                    <div className="bg-slate-50 p-1.5 rounded mt-2 text-3xs text-slate-500 font-mono flex items-center gap-1">
                      <HardHat className="w-3 h-3 text-slate-400" />
                      <span>Resp: {move.user}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 text-slate-300 p-3 rounded-lg text-3xs font-mono mt-4 leading-relaxed">
            <ClipboardList className="w-4.5 h-4.5 text-teal-400 inline mr-1 mb-1" />
            Las entradas y salidas físicas se registran de forma auditable. Cada vez que cambias stock o entregas un kit, se genera una traza de historial inmutable útil para la acreditación académica.
          </div>

        </div>

      </div>

      {/* MODAL: Add New Inventory Item */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-250 animate-scaleUp">
            <div className="bg-emerald-800 p-4 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-md font-sans flex items-center gap-1.5">
                <Package className="w-5 h-5 text-emerald-300" />
                Registrar Nuevo Insumo Físico
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="p-5 space-y-4">
              <div>
                <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre completo del Insumo / Instrumento *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Multímetro Fluke, Cable Unipolar"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-slate-750 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Stock Inicial *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full text-slate-750 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Unidad Medida *</label>
                  <input
                    type="text"
                    required
                    placeholder="unidades, metros, litros"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full text-slate-750 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Categoría General *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full text-slate-750 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="Instrumental Técnico">Instrumental Técnico</option>
                    <option value="Equipo de Medida">Equipo de Medida</option>
                    <option value="Herramientas de Soldadura">Herramientas de Soldadura</option>
                    <option value="Placas de Desarrollo">Placas de Desarrollo</option>
                    <option value="Componentes Electrónicos">Componentes Electrónicos</option>
                    <option value="Sistemas Mecánicos">Sistemas Mecánicos</option>
                    <option value="Consumibles">Consumibles</option>
                  </select>
                </div>
                <div>
                  <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Stock Mínimo Alerta *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(Number(e.target.value))}
                    className="w-full text-slate-750 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Coordinates */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                <span className="text-3xs font-extrabold text-teal-800 uppercase tracking-wider block">Coordenadas de Almacenamiento en Taller</span>
                
                <div>
                  <label className="block text-3xs font-bold text-slate-550 mb-1">Ubicación de Aula / Taller *</label>
                  <input
                    type="text"
                    required
                    value={formClassroom}
                    onChange={(e) => setFormClassroom(e.target.value)}
                    className="w-full text-slate-750 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-3xs font-bold text-slate-550 mb-0.5">Estante (Rack)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Estante A"
                      value={formRack}
                      onChange={(e) => setFormRack(e.target.value)}
                      className="w-full text-slate-750 bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-3xs font-bold text-slate-550 mb-0.5">Nivel (Repisa)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Nivel 3"
                      value={formShelf}
                      onChange={(e) => setFormShelf(e.target.value)}
                      className="w-full text-slate-750 bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-3xs font-bold text-slate-550 mb-0.5">Caja (Opcional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Caja 4"
                      value={formBox}
                      onChange={(e) => setFormBox(e.target.value)}
                      className="w-full text-slate-750 bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 font-sans hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-slate-900 rounded-lg text-xs font-bold font-sans hover:bg-emerald-700 transition px-6 cursor-pointer"
                >
                  Confirmar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK STOCKED ADJUSTMENT MODAL */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-250 animate-scaleUp">
            <div className="bg-slate-950 p-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-sm font-sans">Ajuste de Stock</h3>
                <span className="text-3xs text-emerald-400 font-mono uppercase font-bold pr-2">{showAdjustmentModal.name}</span>
              </div>
              <button onClick={() => setShowAdjustmentModal(null)} className="text-white/80 hover:text-white p-1 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustStockSubmit} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded border border-slate-150">
                <span className="text-3xs font-bold text-slate-500 uppercase tracking-widest block">Nivel Actual</span>
                <span className="text-lg font-black text-slate-800 font-mono mt-0.5 block">
                  {showAdjustmentModal.stock} <span className="text-xs font-sans font-medium">{showAdjustmentModal.unit}</span>
                </span>
              </div>

              <div>
                <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nuevo Stock Físico Auditoría *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={stockAdjustmentQuantity}
                  onChange={(e) => setStockAdjustmentQuantity(Number(e.target.value))}
                  className="w-full text-slate-75 w-full text-center text-lg font-extrabold font-mono bg-slate-50 border border-slate-350 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Motivo formal del Ajuste *</label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full text-slate-700 bg-white border border-slate-300 rounded-lg px-2 py-2 text-xs focus:outline-none"
                >
                  <option value="Conteo físico e inventariado semestral">Conteo físico e inventariado semestral</option>
                  <option value="Reposición de insumos dañados por alumnado">Reposición de insumos dañados por alumnado</option>
                  <option value="Adición de remesas de stock comprados de fábrica">Adición de remesas de stock comprados de fábrica</option>
                  <option value="Reducción por merma o pérdida documentada">Reducción por merma o pérdida documentada</option>
                  <option value="Ajuste manual rápido de emergencia">Ajuste manual rápido de emergencia</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 font-sans hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold font-sans hover:bg-slate-950 transition cursor-pointer"
                >
                  Aplicar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
