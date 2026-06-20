/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from '../types';
import { RefreshCw, Layers, HardHat, FileText, UserCheck, FileSpreadsheet, ExternalLink } from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  allUsers: User[];
  onChangeRole: (user: User) => void;
  onResetDb: () => void;
  isResetting: boolean;
  spreadsheetUrl?: string;
  onSync?: () => void;
  isSyncing?: boolean;
}

export default function Header({ 
  currentUser, 
  allUsers, 
  onChangeRole, 
  onResetDb, 
  isResetting, 
  spreadsheetUrl,
  onSync,
  isSyncing
}: HeaderProps) {
  return (
    <header className="bg-white text-slate-900 shadow-xs border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo and Institution Title */}
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-indigo-600 text-white rounded-md flex flex-col justify-center items-center font-black text-sm tracking-tighter leading-none shadow-sm select-none">
              <span className="text-[10px] font-bold text-indigo-200 leading-none">CFT</span>
              <span className="text-white font-extrabold text-[12px] tracking-tight leading-none">PUCV</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight font-sans text-slate-900 leading-none">
                  Gestión de Inventario y Trazabilidad Pedagógica
                </h1>
                <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-250 text-emerald-800 text-[9px] font-black rounded uppercase tracking-wider hidden sm:inline-block">
                  Conectado
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-mono tracking-wider text-slate-500 mt-1">
                Sistemas de Laboratorios CFT PUCV - Región de Valparaíso
              </p>
            </div>
          </div>

          {/* Quick RBAC Role Switcher & DB Reset Panel */}
          <div className="flex items-center space-x-3">
            
            <div className="hidden lg:flex flex-col items-end text-right mr-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Operando como</span>
              <span className="text-xs font-bold text-indigo-600 font-sans flex items-center gap-1.5 mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {currentUser.name}
              </span>
            </div>

            {/* Quick access switcher */}
            <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1">
              {allUsers.map((user) => {
                const isActive = currentUser.id === user.id;
                return (
                  <button
                    key={user.id}
                    title={`${user.name} - ${user.specialty}`}
                    onClick={() => onChangeRole(user)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-sans transition-all duration-150 flex items-center gap-1 cursor-pointer select-none uppercase tracking-wider ${
                      isActive 
                        ? 'bg-white text-indigo-600 shadow-xs border border-slate-200' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    {user.role === 'coordinador' && <Layers className="w-3 h-3" />}
                    {user.role === 'bodeguero' && <HardHat className="w-3 h-3" />}
                    {user.role === 'docente' && <FileText className="w-3 h-3" />}
                    <span className="hidden sm:inline capitalize font-bold">{user.role}</span>
                  </button>
                );
              })}
            </div>

            {/* Google Sheets database indicator or direct link */}
            {spreadsheetUrl ? (
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir base de datos en Google Sheets"
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg border border-emerald-500 transition-all cursor-pointer font-sans text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                <span className="hidden md:inline">Google Sheets</span>
                <ExternalLink className="w-3 h-3 text-emerald-200 animate-pulse" />
              </a>
            ) : (
              <button
                type="button"
                onClick={onSync}
                disabled={isSyncing}
                title="Presionar para vincular, crear o sincronizar con Google Sheets"
                className={`px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer font-sans text-[10px] uppercase font-semibold tracking-wider flex items-center gap-1.5 shrink-0 ${
                  isSyncing
                    ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse cursor-wait'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-205 hover:bg-indigo-100/80 active:bg-indigo-100 border-indigo-200'
                }`}
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : 'text-indigo-600'}`} />
                <span className="hidden md:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar Sheets'}</span>
              </button>
            )}

            {/* Reset DB Button */}
            <button
              onClick={onResetDb}
              disabled={isResetting}
              title="Restaurar estado de fábrica"
              className="p-1 px-2.5 py-1.5 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-700 rounded-lg border border-slate-250 hover:border-red-200 transition-all cursor-pointer font-sans text-[10px] uppercase font-bold tracking-wider flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reset</span>
            </button>

          </div>
        </div>
      </div>

    </header>
  );
}
