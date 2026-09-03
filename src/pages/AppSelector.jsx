import React from "react";
import { useAuth } from "../context/AuthContext";
import DecorativeBackground from "../components/DecorativeBackground";
import { useTheme } from "../context/ThemeContext";

export default function AppSelector({ onSelectApp }) {
  const { user, logout, rol } = useAuth();
  const { t } = useTheme();

  return (
    <div className={`min-h-screen ${t.bg} flex flex-col relative overflow-hidden font-sans`}>
      <DecorativeBackground color1="blue-600" color2="purple-600" />
      
      {/* Header */}
      <header className={`relative z-10 px-6 py-4 flex items-center justify-between border-b ${t.border} ${t.bgNav}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="material-symbols-outlined text-white" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>
              widgets
            </span>
          </div>
          <div>
            <h1 className={`text-xl font-black ${t.text}`}>Portal de Aplicaciones</h1>
            <p className={`text-xs ${t.textSecondary}`}>Selecciona un entorno de trabajo</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className={`text-sm font-bold ${t.text}`}>{user?.nombre || user?.email}</p>
            <p className={`text-xs ${t.textSecondary} uppercase tracking-wider`}>{rol}</p>
          </div>
          <button 
            onClick={logout}
            className={`w-10 h-10 flex items-center justify-center rounded-xl ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-red-400 transition-colors shadow-sm`}
            title="Cerrar Sesión"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 pb-20">
        <h2 className={`text-3xl md:text-4xl font-black ${t.text} mb-2 text-center`}>¿Qué deseas hacer hoy?</h2>
        <p className={`${t.textSecondary} mb-12 text-center max-w-md`}>
          Selecciona el módulo al que deseas acceder para continuar con tus labores.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          
          {/* Card Rincón */}
          <button 
            onClick={() => onSelectApp("rincon")}
            className={`group relative overflow-hidden flex flex-col p-8 rounded-3xl border ${t.border} ${t.bgCard} shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 text-left`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 border border-blue-500/30">
              <span className="material-symbols-outlined text-blue-500" style={{ fontSize: 32 }}>storefront</span>
            </div>
            
            <h3 className={`text-2xl font-black ${t.text} mb-3`}>El Rincón</h3>
            <p className={`${t.textSecondary} flex-1 leading-relaxed`}>
              Accede a las herramientas operativas: Fichas Técnicas, Gestión de Merma, Planificador, Trazabilidad, y más.
            </p>
            
            <div className="mt-8 flex items-center gap-2 text-blue-500 font-bold text-sm uppercase tracking-wider">
              Ingresar al Rincón
              <span className="material-symbols-outlined transition-transform group-hover:translate-x-1" style={{ fontSize: 18 }}>arrow_forward</span>
            </div>
          </button>

          {/* Card Auditoria */}
          <button 
            onClick={() => onSelectApp("auditoria")}
            className={`group relative overflow-hidden flex flex-col p-8 rounded-3xl border ${t.border} ${t.bgCard} shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 text-left`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 border border-purple-500/30">
              <span className="material-symbols-outlined text-purple-500" style={{ fontSize: 32 }}>fact_check</span>
            </div>
            
            <h3 className={`text-2xl font-black ${t.text} mb-3`}>Auditoría</h3>
            <p className={`${t.textSecondary} flex-1 leading-relaxed`}>
              Panel dedicado a la revisión, evaluación y control de calidad de los procesos e inventarios.
            </p>
            
            <div className="mt-8 flex items-center gap-2 text-purple-500 font-bold text-sm uppercase tracking-wider">
              Ingresar a Auditoría
              <span className="material-symbols-outlined transition-transform group-hover:translate-x-1" style={{ fontSize: 18 }}>arrow_forward</span>
            </div>
          </button>

        </div>
      </main>
    </div>
  );
}
