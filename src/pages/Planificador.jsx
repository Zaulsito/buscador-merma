import { useState } from "react";
import BottomNav from "../components/BottomNav";
import { useTheme } from "../context/ThemeContext";
import AppSidebar from "../components/AppSidebar";
import Navbar from "../components/Navbar";
import PlanificadorFichas from "./PlanificadorFichas";
import PlanificadorMerma from "./PlanificadorMerma";

export default function Planificador({ user, rol, onBack, onNavegar }) {
  const { t } = useTheme();
  const [submodulo, setSubmodulo] = useState(null);

  if (submodulo === "fichas")
    return <PlanificadorFichas user={user} rol={rol} onBack={() => setSubmodulo(null)} onNavegar={onNavegar} />;
  if (submodulo === "merma")
    return <PlanificadorMerma user={user} rol={rol} onBack={() => setSubmodulo(null)} onNavegar={onNavegar} />;

  return (
    <div className={`${t.bg} flex h-screen overflow-hidden`}>

      {/* Sidebar — solo desktop */}
      <div className="hidden md:block flex-shrink-0">
        <AppSidebar user={user} rol={rol} moduloActivo="planificador" onNavegar={onNavegar} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="hidden md:block flex-shrink-0"><Navbar user={user} rol={rol} onNavegar={onNavegar} /></div>

        {/* ── HEADER MÓVIL ── */}
        <header className={`md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 ${t.bgNav} border-b ${t.border}`}
          style={{ backdropFilter: "blur(12px)" }}>
          <button onClick={onBack} className={`w-10 h-10 flex items-center justify-center rounded-full ${t.hover} ${t.text}`}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className={`${t.text} text-base font-bold`}>Planificador</h2>
          <div className="w-10" />
        </header>

        <main className="flex-1 overflow-y-auto relative">

          {/* ── FONDO DECORATIVO desktop ── */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 -right-32 w-80 h-80 bg-indigo-500/8 rounded-full blur-3xl" />
          </div>

          {/* ════════════════════════════
              LAYOUT MÓVIL (mockup)
          ════════════════════════════ */}
          <div className="md:hidden pb-6">

            {/* Hero image */}
            <section className="p-4 pt-5">
              <div className="relative overflow-hidden rounded-2xl aspect-[16/7] flex items-end p-5 group">
                {/* Fondo gradiente */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                {/* Patrón decorativo */}
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: "radial-gradient(circle at 70% 30%, #258cf4 0%, transparent 60%), radial-gradient(circle at 20% 80%, #6366f1 0%, transparent 50%)"
                }} />
                <div className="absolute top-4 right-4 w-16 h-16 bg-blue-500/20 rounded-full blur-xl" />
                <div className="absolute bottom-8 right-8 w-8 h-8 bg-indigo-400/30 rounded-full blur-md" />
                <div className="relative z-10">
                  <h2 className="text-2xl font-extrabold text-white leading-tight">Módulo Planificador</h2>
                  <p className="text-slate-300 text-xs mt-1 max-w-xs">Gestión de producción y control de merma en tiempo real.</p>
                </div>
              </div>
            </section>

            {/* Cards principales */}
            <div className="px-4 space-y-3">

              {/* Fichas Técnicas */}
              <button
                onClick={() => setSubmodulo("fichas")}
                className="w-full text-left rounded-xl p-4 flex flex-col gap-4 shadow-xl border border-white/10 transition-all active:scale-[0.98]"
                style={{
                  background: "rgba(37,140,244,0.07)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className={`${t.text} text-base font-bold`}>Fichas Técnicas</h3>
                    <p className={`${t.textSecondary} text-xs mt-0.5 leading-relaxed`}>
                      Selecciona recetas y genera listas consolidadas de ingredientes con pesaje exacto.
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>description</span>
                  </div>
                </div>
                <div className={`flex items-center justify-between pt-3 border-t border-white/10`}>
                  <span className={`${t.textSecondary} text-xs`}>Planificación de producción</span>
                  <span className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                    Ver Fichas
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                  </span>
                </div>
              </button>

              {/* Control de Merma */}
              <button
                onClick={() => setSubmodulo("merma")}
                className="w-full text-left rounded-xl p-4 flex flex-col gap-4 shadow-xl border border-white/10 transition-all active:scale-[0.98]"
                style={{
                  background: "rgba(37,140,244,0.07)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className={`${t.text} text-base font-bold`}>Control de Merma</h3>
                    <p className={`${t.textSecondary} text-xs mt-0.5 leading-relaxed`}>
                      Selecciona productos del inventario y define cantidades para tu lista de pedido.
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-orange-400" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>inventory</span>
                  </div>
                </div>
                <div className={`flex items-center justify-between pt-3 border-t border-white/10`}>
                  <span className={`${t.textSecondary} text-xs`}>Control de desperdicios</span>
                  <span className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                    Gestionar
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                  </span>
                </div>
              </button>

            </div>

            {/* Métricas */}
            <section className="px-4 mt-5">
              <h4 className={`${t.textSecondary} text-xs font-bold uppercase tracking-widest mb-3`}>Accesos Rápidos</h4>
              <div className="space-y-3">
                <button
                  onClick={() => onNavegar?.("fichas")}
                  className={`w-full ${t.bgCard} border ${t.border} p-4 rounded-xl flex items-center gap-4 active:scale-[0.98] transition-all`}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 20 }}>description</span>
                  </div>
                  <div className="text-left">
                    <p className={`${t.textSecondary} text-xs`}>Módulo</p>
                    <p className={`${t.text} text-sm font-bold`}>Fichas Técnicas</p>
                  </div>
                  <span className={`material-symbols-outlined ${t.textSecondary} ml-auto`} style={{ fontSize: 18 }}>chevron_right</span>
                </button>

                <button
                  onClick={() => onNavegar?.("merma")}
                  className={`w-full ${t.bgCard} border ${t.border} p-4 rounded-xl flex items-center gap-4 active:scale-[0.98] transition-all`}
                >
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-orange-400" style={{ fontSize: 20 }}>search</span>
                  </div>
                  <div className="text-left">
                    <p className={`${t.textSecondary} text-xs`}>Módulo</p>
                    <p className={`${t.text} text-sm font-bold`}>Buscador de Merma</p>
                  </div>
                  <span className={`material-symbols-outlined ${t.textSecondary} ml-auto`} style={{ fontSize: 18 }}>chevron_right</span>
                </button>

                {(rol === "admin" || rol === "unico") && (
                  <button
                    onClick={() => onNavegar?.("usuarios")}
                    className={`w-full ${t.bgCard} border ${t.border} p-4 rounded-xl flex items-center gap-4 active:scale-[0.98] transition-all`}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: 20 }}>manage_accounts</span>
                    </div>
                    <div className="text-left">
                      <p className={`${t.textSecondary} text-xs`}>Módulo</p>
                      <p className={`${t.text} text-sm font-bold`}>Gestionamiento</p>
                    </div>
                    <span className={`material-symbols-outlined ${t.textSecondary} ml-auto`} style={{ fontSize: 18 }}>chevron_right</span>
                  </button>
                )}
              </div>
            </section>
          </div>

          {/* ════════════════════════════
              LAYOUT DESKTOP
          ════════════════════════════ */}
          <div className="hidden md:block relative max-w-4xl mx-auto px-10 py-14">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-8">
              <button onClick={onBack} className={`${t.textSecondary} hover:text-blue-400 text-xs font-medium transition-colors`}>
                Dashboard Principal
              </button>
              <span className={`${t.textSecondary} text-xs`}>›</span>
              <span className="text-blue-400 text-xs font-semibold">Planificador Maestro</span>
            </div>

            {/* Hero desktop */}
            <div className="mb-14">
              <h1 className={`${t.text} text-5xl font-black tracking-tight leading-none mb-3`}>
                Módulo{" "}
                <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Planificador
                </span>
              </h1>
              <p className={`${t.textSecondary} text-base max-w-lg leading-relaxed`}>
                Gestione sus fichas técnicas y control de merma con precisión para elevar la rentabilidad operativa.
              </p>
            </div>

            {/* Cards desktop */}
            <div className="grid grid-cols-2 gap-6">

              <button
                onClick={() => setSubmodulo("fichas")}
                className={`group relative text-left rounded-2xl overflow-hidden border transition-all duration-300
                  ${t.isDark ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-700/50 hover:border-blue-500/50"
                    : "bg-gradient-to-br from-white to-slate-50 border-slate-200 hover:border-blue-400/60"}
                  hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1`}
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
                <div className="p-8">
                  <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 26, fontVariationSettings: "'FILL' 1" }}>description</span>
                  </div>
                  <h3 className={`${t.text} text-xl font-extrabold mb-2`}>Fichas Técnicas</h3>
                  <p className={`${t.textSecondary} text-sm leading-relaxed mb-6`}>
                    Seleccione recetas y genere automáticamente listas consolidadas de ingredientes con pesaje exacto para su producción diaria.
                  </p>
                  <div className="flex items-center justify-end">
                    <span className="flex items-center gap-1.5 text-blue-400 text-sm font-bold group-hover:gap-2.5 transition-all">
                      Acceder
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                    </span>
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 w-32 h-32 opacity-5 group-hover:opacity-10 transition-opacity">
                  <div className="w-full h-full bg-blue-400 rounded-tl-full" />
                </div>
              </button>

              <button
                onClick={() => setSubmodulo("merma")}
                className={`group relative text-left rounded-2xl overflow-hidden border transition-all duration-300
                  ${t.isDark ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-700/50 hover:border-orange-500/50"
                    : "bg-gradient-to-br from-white to-slate-50 border-slate-200 hover:border-orange-400/60"}
                  hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-1`}
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
                <div className="p-8">
                  <div className="w-12 h-12 bg-orange-500/20 border border-orange-500/30 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-orange-400" style={{ fontSize: 26, fontVariationSettings: "'FILL' 1" }}>inventory</span>
                  </div>
                  <h3 className={`${t.text} text-xl font-extrabold mb-2`}>Control de Merma</h3>
                  <p className={`${t.textSecondary} text-sm leading-relaxed mb-6`}>
                    Trazabilidad total de mermas e inventario. Defina desperdicios y active reposiciones para evitar rupturas de stock.
                  </p>
                  <div className="flex items-center justify-end">
                    <span className="flex items-center gap-1.5 text-orange-400 text-sm font-bold group-hover:gap-2.5 transition-all">
                      Gestionar
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                    </span>
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 w-32 h-32 opacity-5 group-hover:opacity-10 transition-opacity">
                  <div className="w-full h-full bg-orange-400 rounded-tl-full" />
                </div>
              </button>

            </div>
          </div>

        </main>
      </div>
    
      <BottomNav moduloActivo="planificador" onNavegar={onNavegar} />
    </div>
  );
}
