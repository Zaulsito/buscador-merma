import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import DecorativeBackground from "../components/DecorativeBackground";
import AppSidebar from "../components/AppSidebar";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";

const SECCIONES = [
  { id: "caliente", nombre: "Cuarto Caliente", icon: "local_fire_department", color: "text-red-500", bg: "bg-red-500/10", borderB: "border-b-red-500", hoverBg: "group-hover:bg-red-500" },
  { id: "postres", nombre: "Postres", icon: "cake", color: "text-pink-400", bg: "bg-pink-500/10", borderB: "border-b-pink-500", hoverBg: "group-hover:bg-pink-500" },
  { id: "frio", nombre: "Cuarto Frío", icon: "ac_unit", color: "text-blue-400", bg: "bg-blue-500/10", borderB: "border-b-blue-500", hoverBg: "group-hover:bg-blue-500" },
  { id: "sizzling", nombre: "Sizzling", icon: "outdoor_grill", color: "text-orange-500", bg: "bg-orange-500/10", borderB: "border-b-orange-500", hoverBg: "group-hover:bg-orange-500" },
  { id: "bolleria", nombre: "Bollería", icon: "bakery_dining", color: "text-amber-500", bg: "bg-amber-500/10", borderB: "border-b-amber-500", hoverBg: "group-hover:bg-amber-500" },
  { id: "sandwich", nombre: "Sandwich", icon: "lunch_dining", color: "text-emerald-500", bg: "bg-emerald-500/10", borderB: "border-b-emerald-500", hoverBg: "group-hover:bg-emerald-500" },
];

export default function TrazabilidadPage({ user, rol, onBack, onNavegar }) {
  const { t } = useTheme();
  const [seccionActiva, setSeccionActiva] = useState(null);

  return (
    <div className={`${t.bg} flex h-screen overflow-hidden`}>
      {/* Sidebar — solo desktop */}
      <div className="hidden md:block flex-shrink-0">
        <AppSidebar user={user} rol={rol} moduloActivo="trazabilidad" onNavegar={onNavegar} />
      </div>

      {/* Columna principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="hidden md:block flex-shrink-0">
          <Navbar 
            user={user} 
            rol={rol} 
            onNavegar={onNavegar} 
            onPerfil={() => onNavegar("perfil")}
            onTutorial={() => { sessionStorage.setItem("trigger_tutorial", "true"); onNavegar(null); }}
            titulo="Trazabilidad" 
          />
        </div>

        <main className="flex-1 overflow-y-auto relative p-4 md:p-8 pb-24">
          <DecorativeBackground color1="purple-600" color2="indigo-500" />

          {/* Header Mobile solo visible en móvil cuando no hay Navbar */}
          <header className={`md:hidden flex items-center justify-between p-4 mb-6 border-b ${t.border} bg-white/5 backdrop-blur-md rounded-2xl`}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => seccionActiva ? setSeccionActiva(null) : onBack()}
                className={`w-10 h-10 flex items-center justify-center rounded-xl ${t.bgInput} ${t.hover} transition-all border ${t.border}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
              </button>
              <div>
                <h2 className={`${t.text} text-lg font-bold flex items-center gap-2`}>
                  <span className="material-symbols-outlined text-purple-400">receipt_long</span>
                  Trazabilidad
                </h2>
                <p className={`${t.textSecondary} text-xs`}>
                  {seccionActiva ? SECCIONES.find(s => s.id === seccionActiva)?.nombre : "Control de procesos"}
                </p>
              </div>
            </div>
          </header>

          {/* Desktop header if section is active */}
          {seccionActiva && (
            <div className="hidden md:flex items-center gap-3 mb-6">
              <button
                onClick={() => setSeccionActiva(null)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl ${t.bgInput} ${t.hover} transition-all border ${t.border}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
              </button>
              <h2 className={`${t.text} text-2xl font-bold flex items-center gap-2`}>
                <span className="material-symbols-outlined text-purple-400">{SECCIONES.find(s => s.id === seccionActiva)?.icon}</span>
                {SECCIONES.find(s => s.id === seccionActiva)?.nombre}
              </h2>
            </div>
          )}

          {!seccionActiva ? (
            <div className="max-w-6xl mx-auto relative z-10">
              <h3 className={`${t.text} text-base font-bold flex items-center gap-2 mb-5 hidden md:flex`}>
                <span className="material-symbols-outlined text-purple-400" style={{ fontSize: 20 }}>grid_view</span>
                Selecciona una sección
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {SECCIONES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSeccionActiva(s.id)}
                    className={`group relative ${t.bgCard} border ${t.border} border-b-4 ${s.borderB} rounded-2xl p-6 flex flex-col gap-4 text-left w-full hover:shadow-2xl hover:-translate-y-1 transition-all`}
                  >
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${s.bg} ${s.color} ${s.hoverBg} group-hover:text-white`}>
                      <span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontSize: 28 }}>{s.icon}</span>
                    </div>
                    <div>
                      <h4 className={`${t.text} text-base font-bold mb-1`}>{s.nombre}</h4>
                      <p className={`${t.textSecondary} text-sm leading-relaxed`}>Gestionar registros y trazabilidad de {s.nombre.toLowerCase()}.</p>
                    </div>
                    <div className="mt-auto flex items-center gap-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: s.color.replace("text-", "") }}>
                      Acceder a los registros
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto flex flex-col items-center justify-center text-center py-20 relative z-10">
               <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${SECCIONES.find(s => s.id === seccionActiva)?.bg} ${SECCIONES.find(s => s.id === seccionActiva)?.color}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40 }}>{SECCIONES.find(s => s.id === seccionActiva)?.icon}</span>
               </div>
               <h3 className={`${t.text} text-2xl font-bold mb-2`}>{SECCIONES.find(s => s.id === seccionActiva)?.nombre}</h3>
               <p className={`${t.textSecondary} text-sm max-w-md`}>Esta sección está lista para integrar los formularios y tablas de trazabilidad correspondientes. Los datos se asignarán próximamente.</p>
               <span className="mt-6 text-xs font-bold px-4 py-1.5 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20 uppercase tracking-wider">Módulo en Desarrollo</span>
            </div>
          )}
        </main>
      </div>
      <BottomNav moduloActivo="trazabilidad" onNavegar={onNavegar} />
    </div>
  );
}
