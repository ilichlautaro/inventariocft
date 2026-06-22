/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from '../types';
import { 
  RefreshCw, FileSpreadsheet, ExternalLink, Search, Bell, HelpCircle, 
  Menu, X, Laptop, UserCheck, Shield, ChevronDown
} from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  allUsers: User[];
  onChangeRole: (user: User) => void;
  onResetDb: () => void;
  isResetting: boolean;
  spreadsheetUrl?: string;
  onSync?: () => void;
  isSyncing?: boolean;
  globalSearch: string;
  setGlobalSearch: (val: string) => void;
  onToggleMobileSidebar: () => void;
}

export default function Header({ 
  currentUser, 
  allUsers, 
  onChangeRole, 
  onResetDb, 
  isResetting, 
  spreadsheetUrl,
  onSync,
  isSyncing,
  globalSearch,
  setGlobalSearch,
  onToggleMobileSidebar
}: HeaderProps) {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  return (
    <header className="h-16 border-b border-outline-variant bg-surface flex items-center justify-between px-6 sticky top-0 z-35 shadow-xs shrink-0">
      
      {/* Mobile Sidebar Toggle & Module Indicator */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 hover:bg-surface-container rounded-full text-secondary hover:text-primary transition-all cursor-pointer"
          title="Menú"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Global Search Bar (From graphic mockup) */}
        <div className="hidden md:flex items-center bg-surface-container-low px-4 py-1.5 rounded-full w-80 lg:w-96 border border-outline-variant focus-within:ring-2 focus-within:ring-primary transition-all">
          <Search className="w-4 h-4 text-secondary mr-2" />
          <input 
            className="bg-transparent border-none text-xs w-full outline-none focus:ring-0 text-on-surface" 
            placeholder="Buscar insumos, códigos o asignaturas..." 
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
          />
          {globalSearch && (
            <button 
              onClick={() => setGlobalSearch('')}
              className="text-[10px] text-secondary hover:text-primary font-bold mr-1"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Connection & Configuration Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        
        {/* Connection status pills */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-5 border border-emerald-200 text-emerald-800 rounded-full select-none shrink-0 text-[10px] uppercase font-bold tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Nube Escolar</span>
        </div>

        {/* Sync with Google Sheets button */}
        {spreadsheetUrl ? (
          <a
            href={spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir base de datos en Google Sheets"
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg border border-emerald-500 transition-all cursor-pointer text-[10px] font-bold tracking-wider flex items-center gap-1.5 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sheets</span>
            <ExternalLink className="w-3 h-3 text-emerald-200" />
          </a>
        ) : (
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            title="Vincular con Google Sheets"
            className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer text-[10px] font-bold tracking-wider flex items-center gap-1.5 shrink-0 ${
              isSyncing
                ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse cursor-wait'
                : 'bg-primary-fixed text-primary-fixed-dim hover:bg-indigo-100 text-primary border-outline-variant/50'
            }`}
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Sheets'}</span>
          </button>
        )}

        {/* Database Quick Reset */}
        <button
          onClick={onResetDb}
          disabled={isResetting}
          title="Restaurar estado de fábrica"
          className="p-1.5 px-2 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-700 rounded-lg border border-outline-variant hover:border-red-200 transition-all cursor-pointer text-[10px] font-bold tracking-wider flex items-center gap-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">Reset</span>
        </button>

        <div className="h-6 w-[1px] bg-outline-variant hidden sm:block"></div>

        {/* Interactive Testing User Role Switcher Dropdown (Seamless UX) */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-surface-container rounded-lg text-secondary hover:text-primary transition-colors cursor-pointer"
            title="Cambiar de Rol de Pruebas"
          >
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs uppercase">
              {currentUser.role.slice(0, 1)}
            </div>
            <span className="text-[11px] font-bold font-mono tracking-wide hidden md:inline uppercase text-primary">
              [{currentUser.role}]
            </span>
            <ChevronDown className="w-3 h-3 text-secondary" />
          </button>

          {roleMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setRoleMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-outline-variant py-2 z-50 animate-scaleUp">
                <div className="px-4 py-2 border-b border-outline-variant/60">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Simulador de Roles (RBAC)</p>
                  <p className="text-[10px] text-secondary mt-0.5">Permite probar la matriz de permisos</p>
                </div>
                {allUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onChangeRole(u);
                      setRoleMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 hover:bg-surface-container-low transition-colors ${
                      currentUser.id === u.id ? 'font-bold text-primary bg-primary/5' : 'text-slate-650'
                    }`}
                  >
                    <img src={u.avatar} className="w-5 h-5 rounded-full object-cover" />
                    <div className="overflow-hidden">
                      <p className="truncate font-medium">{u.name}</p>
                      <p className="text-[9px] text-secondary capitalize font-mono">{u.role} • {u.specialty?.split(',')[0]}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button className="hover:bg-surface-container rounded-full p-2 transition-colors relative">
          <Bell className="w-4.5 h-4.5 text-primary" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-error rounded-full border border-surface"></span>
        </button>

        <button className="hover:bg-surface-container rounded-full p-2 transition-colors">
          <HelpCircle className="w-4.5 h-4.5 text-primary" />
        </button>

      </div>
    </header>
  );
}
