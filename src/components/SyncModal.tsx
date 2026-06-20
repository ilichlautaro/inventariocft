import React from 'react';
import { X, FileSpreadsheet, CheckCircle, AlertTriangle, ShieldCheck, ExternalLink, RefreshCw } from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  spreadsheetUrl?: string;
  isSyncing: boolean;
  onSync: () => void;
}

export default function SyncModal({ isOpen, onClose, spreadsheetUrl, isSyncing, onSync }: SyncModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-scale-up">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-100 text-indigo-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase">Sincronización de Google Sheets</h3>
              <p className="text-[10px] text-slate-400 font-mono">ESTADO DE LA CONEXIÓN CENTRAL</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-150 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {spreadsheetUrl ? (
            <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-4 flex items-start gap-3">
              <div className="bg-emerald-100 p-1.5 rounded-md text-emerald-700 shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">Servicio Activo y Sincronizado</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                  La aplicación se encuentra exitosamente vinculada con una hoja de cálculo real en tu Google Drive. Los registros de inventario, solicitudes de kits y matrices se leen y escriben en tiempo real.
                </p>
                <div className="pt-2">
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 uppercase tracking-widest hover:underline"
                  >
                    <span>Ver Hoja de Cálculo</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
              <div className="bg-indigo-50 p-1.5 rounded-md text-indigo-600 shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-indigo-900 text-xs uppercase tracking-wider">Modo Autónomo Local Activo</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                  La aplicación está funcionando en modo local seguro y duradero usando la base de datos local JSON montada en el servidor Cloud Run.
                </p>
              </div>
            </div>
          )}

          {/* Contextual Warning about Standalone/Deploy Mode */}
          {!spreadsheetUrl && (
            <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 flex items-start gap-3">
              <div className="bg-amber-100 p-1.5 rounded-md text-amber-700 shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wider">¿Por qué de forma local?</h4>
                <p className="text-[11px] text-slate-655 leading-relaxed font-sans">
                  Para conectar Google Sheets directamente a esta copia <strong className="text-amber-850">desplegada fuera de AI Studio</strong>, necesitas inicializar el túnel de autentificación seguro. 
                  Este enlace se gestiona automáticamente de forma nativa en tu consola de pruebas de <strong>Google AI Studio</strong>.
                </p>
                <p className="text-[10px] text-slate-500 italic font-mono leading-normal">
                  * Nota: Al presionar "Sincronizar" se consultará si tienes credenciales de prueba activas.
                </p>
              </div>
            </div>
          )}

          {/* Visual Architecture Map */}
          <div className="border border-slate-150 rounded-xl p-3 bg-slate-50/30">
            <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider mb-2 text-center">Flujo de Datos Arquitectónico</span>
            <div className="flex items-center justify-center gap-2 text-center font-mono text-[9px] font-extrabold">
              <div className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1.5 rounded">
                Cliente Web App
              </div>
              <div className="text-slate-400 shrink-0">⇦ ⇨</div>
              <div className="bg-indigo-50 border border-indigo-150 text-indigo-750 px-2 py-1.5 rounded">
                Servidor Express
              </div>
              <div className="text-slate-400 shrink-0">⇦ ⇨</div>
              <div className={`px-2 py-1.5 rounded border transition-colors ${spreadsheetUrl ? 'bg-emerald-50 border-emerald-150 text-emerald-800 animate-pulse' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                {spreadsheetUrl ? 'Google sheets (OK)' : 'Google Sheets (Local)'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 font-sans text-xs font-semibold tracking-wide transition-colors cursor-pointer"
          >
            Cerrar Ventana
          </button>
          
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            className={`px-4 py-2 rounded-xl text-white font-sans text-xs font-bold tracking-wide shadow-sm flex items-center gap-1.5 cursor-pointer transition-all ${
              isSyncing 
                ? 'bg-amber-500 cursor-wait animate-pulse' 
                : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Probar Sincronización'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
