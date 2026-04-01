import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, query, limit, onSnapshot, getDocs } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import BuscadorMerma from "./BuscadorMerma";
import GestionUsuarios from "./GestionUsuarios";
import PerfilPage from "./PerfilPage";
import FichasTecnicas from "./FichasTecnicas";
import Planificador from "./Planificador";
import AppSidebar from "../components/AppSidebar";
import PlanogramaPage from "./PlanogramaPage";
import TutorialOverlay from "../components/TutorialOverlay";
import InformacionPage from "./InformacionPage";
import BottomNav from "../components/BottomNav";

const modulos = [
  {
    id: "merma",
    nombre: "Buscador de Merma",
    descripcion: "Localiza y analiza pérdidas operativas eficientemente.",
    icon: "search",
    accion: "Acceder módulo",
    color: "#258cf4",
    colorClass: "text-blue-400",
    bg: "bg-blue-500/10",
    hoverBg: "group-hover:bg-blue-500",
    borderB: "border-b-blue-500",
  },
  {
    id: "fichas",
    nombre: "Fichas Técnicas",
    descripcion: "Biblioteca centralizada de especificaciones y procesos.",
    icon: "description",
    accion: "Consultar archivos",
    color: "#f97316",
    colorClass: "text-orange-500",
    bg: "bg-orange-500/10",
    hoverBg: "group-hover:bg-orange-500",
    borderB: "border-b-orange-500",
  },
  {
    id: "planificador",
    nombre: "Planificador",
    descripcion: "Organiza tareas y cronogramas de producción.",
    icon: "account_tree",
    accion: "Abrir panel",
    color: "#10b981",
    colorClass: "text-emerald-500",
    bg: "bg-emerald-500/10",
    hoverBg: "group-hover:bg-emerald-500",
    borderB: "border-b-emerald-500",
  },
  {
    id: "informacion",
    nombre: "Información Útil",
    descripcion: "Manual de vida útil, conservación y almacenamiento de insumos por sección.",
    icon: "menu_book",
    accion: "Consultar manual",
    color: "#6366f1",
    colorClass: "text-indigo-400",
    bg: "bg-indigo-500/10",
    hoverBg: "group-hover:bg-indigo-500",
    borderB: "border-b-indigo-500",
  },
];

const moduloAdmin = {
  id: "usuarios",
  nombre: "Gestionamiento",
  descripcion: "Administración de usuarios, roles y permisos del sistema.",
  icon: "manage_accounts",
  accion: "Administrar equipo",
  color: "#a855f7",
  colorClass: "text-purple-500",
  bg: "bg-purple-500/10",
  hoverBg: "group-hover:bg-purple-500",
  borderB: "border-b-purple-500",
};



export default function DashboardPage({ user, rol }) {
  const [modulo, setModulo] = useState(window.location.hash.replace("#", "") || null);
  const [showTutorial, setShowTutorial] = useState(() => {
    return !localStorage.getItem("rinfo_tutorial_visto");
  });
  const [actividadReal, setActividadReal] = useState([]);
  const esAdmin = rol === "admin" || rol === "unico";
  const { t } = useTheme();

  // Función para calcular tiempo relativo
  const tiempoRelativo = (ts) => {
    if (!ts) return "Ahora";
    const fecha = ts?.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - fecha.getTime()) / 1000);
    if (diff < 60) return "Ahora mismo";
    if (diff < 3600) return `Hace ${Math.floor(diff/60)}m`;
    if (diff < 86400) return `Hace ${Math.floor(diff/3600)}h`;
    if (diff < 604800) return `Hace ${Math.floor(diff/86400)}d`;
    return fecha.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
  };

  // Escuchar actividad real en Firestore — solo para admins
  useEffect(() => {
    if (!esAdmin) return;

    const eventos = {};
    const actualizar = () => {
      const todos = Object.values(eventos).flat()
        .sort((a, b) => (b._ts || 0) - (a._ts || 0))
        .slice(0, 12);
      setActividadReal(todos);
    };

    // Sin orderBy para evitar requerir índice — ordenamos en cliente
    const unsubFichas = onSnapshot(
      query(collection(db, "fichas"), limit(20)),
      (snap) => {
        eventos.fichas = snap.docs
          .map(d => ({
            _ts: d.data().fechaCreacion?.seconds || 0,
            icon: "description",
            color: "bg-orange-500/10 text-orange-400",
            titulo: `Ficha: ${d.data().nombre || "Sin nombre"}`,
            desc: `Sección: ${d.data().seccion || "—"} · Estado: ${d.data().estado || "activa"}`,
            tiempo: tiempoRelativo(d.data().fechaCreacion),
          }))
          .sort((a, b) => b._ts - a._ts)
          .slice(0, 6);
        actualizar();
      }
    );

    const unsubMerma = onSnapshot(
      query(collection(db, "merma"), limit(20)),
      (snap) => {
        eventos.merma = snap.docs
          .map(d => ({
            _ts: d.data().fechaCreacion?.seconds || 0,
            icon: "search",
            color: "bg-blue-500/10 text-blue-400",
            titulo: `Merma: ${d.data().nombre || d.data().codigo || "Sin nombre"}`,
            desc: `Código: ${d.data().codigo || "—"} · Categoría: ${d.data().categoria || "—"}`,
            tiempo: tiempoRelativo(d.data().fechaCreacion),
          }))
          .sort((a, b) => b._ts - a._ts)
          .slice(0, 6);
        actualizar();
      }
    );

    const unsubInsumos = onSnapshot(
      query(collection(db, "vida_util_insumos"), limit(10)),
      (snap) => {
        eventos.insumos = snap.docs
          .map(d => ({
            _ts: d.data().fechaCreacion?.seconds || 0,
            icon: "inventory_2",
            color: "bg-emerald-500/10 text-emerald-400",
            titulo: `Insumo: ${d.data().insumo || "Sin nombre"}`,
            desc: `Cerrado: ${d.data().cerrado_modo || "—"} · Abierto: ${d.data().abierto_duracion || "—"}`,
            tiempo: tiempoRelativo(d.data().fechaCreacion),
          }))
          .sort((a, b) => b._ts - a._ts)
          .slice(0, 4);
        actualizar();
      }
    );

    return () => { unsubFichas(); unsubMerma(); unsubInsumos(); };
  }, [esAdmin]);

  useEffect(() => {
    const handleHash = () => setModulo(window.location.hash.replace("#", "") || null);
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const navegarA = (m) => {
    if (m) {
      window.location.hash = m;
    } else {
      history.pushState("", document.title, window.location.pathname);
      setModulo(null);
    }
  };

  if (modulo === "merma")        return <BuscadorMerma   user={user} rol={rol} onBack={() => navegarA(null)} onNavegar={navegarA} />;
  if (modulo === "usuarios")     return <GestionUsuarios user={user} rol={rol} onBack={() => navegarA(null)} onNavegar={navegarA} />;
  if (modulo === "perfil")       return <PerfilPage       user={user} rol={rol} onBack={() => navegarA(null)} />;
  if (modulo === "fichas")       return <FichasTecnicas   user={user} rol={rol} onBack={() => navegarA(null)} onNavegar={navegarA} />;
  if (modulo === "informacion") return <InformacionPage user={user} rol={rol} onBack={() => navegarA(null)} onNavegar={navegarA} />;
  if (modulo === "planograma")  return <PlanogramaPage user={user} rol={rol} onBack={() => navegarA(null)} onNavegar={navegarA} />;
  if (modulo === "planificador") return <Planificador     user={user} rol={rol} onBack={() => navegarA(null)} onNavegar={navegarA} />;

  const nombre = user?.displayName?.split(" ")[0] || "Usuario";
  const iniciales = (user?.displayName || "U").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const todosModulos = (rol === "admin" || rol === "unico") ? [...modulos, moduloAdmin] : modulos;

  return (
    // ✅ h-screen + overflow-hidden en el root — el scroll ocurre solo en main
    <div className={`h-screen overflow-hidden ${t.bg} flex flex-col`}>

      {/* ── TOP NAV mobile ── */}
      <header className={`md:hidden w-full border-b ${t.border} ${t.bgNav} px-4 py-3 flex items-center justify-between flex-shrink-0`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>monitoring</span>
          </div>
          <h1 className={`${t.text} text-lg font-black tracking-tight uppercase`}>R.info</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className={`w-9 h-9 flex items-center justify-center rounded-full ${t.hover} relative`}>
            <span className={`material-symbols-outlined ${t.textSecondary}`} style={{ fontSize: 22 }}>notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full"></span>
          </button>
          <button onClick={() => navegarA("perfil")} className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
            {iniciales}
          </button>
        </div>
      </header>

      {/* ── LAYOUT desktop: sidebar + main ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR desktop ── */}
        <AppSidebar user={user} rol={rol} moduloActivo={null} onNavegar={navegarA} />

        {/* ── MAIN CONTENT ── scroll solo aquí ── */}
        <main className="flex-1 overflow-y-auto">

          {/* Top bar desktop */}
          <header className={`hidden md:flex h-16 ${t.bgNav} border-b ${t.border} items-center justify-between px-8 sticky top-0 z-20`} style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", backgroundColor: "var(--bg-nav, #0f1923)" }}>
            <div className="flex-1 max-w-md relative">
              <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 ${t.textSecondary}`} style={{ fontSize: 18 }}>search</span>
              <input className={`w-full pl-10 pr-4 py-2 ${t.bgInput} ${t.text} rounded-lg focus:ring-2 focus:ring-blue-500 text-sm outline-none border-none`} placeholder="Buscar módulos o reportes..." />
            </div>
            <div className="flex items-center gap-3">
              <button className={`w-10 h-10 flex items-center justify-center rounded-full ${t.hover} ${t.textSecondary} relative`}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button
                onClick={() => setShowTutorial(true)}
                className={`w-10 h-10 flex items-center justify-center rounded-full ${t.hover} ${t.textSecondary} hover:text-blue-400 transition-colors`}
                title="Ver tutorial"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>help</span>
              </button>
              <div className={`h-6 w-px ${t.bgInput}`}></div>
              <button onClick={() => navegarA("perfil")} className="flex items-center gap-2 group">
                <span className={`${t.text} text-sm font-semibold group-hover:text-blue-400 transition-colors`}>{nombre}</span>
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">{iniciales}</div>
              </button>
            </div>
          </header>

          <div className="p-4 md:p-8 space-y-8 pb-24 md:pb-8">

            {/* Hero */}
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 p-8 md:p-10 text-white shadow-xl shadow-blue-500/20">
              <div className="relative z-10 max-w-2xl">
                <span className="text-blue-100 text-xs font-semibold uppercase tracking-widest">Panel de Control</span>
                <h2 className="text-3xl md:text-4xl font-black mt-1 mb-2">Bienvenido, {nombre}</h2>
                <p className="text-blue-100 text-sm md:text-base max-w-md">
                  Gestiona tus procesos, accede a fichas técnicas y planifica tus operaciones desde un solo lugar.
                </p>
              </div>
              <div className="absolute top-0 right-0 h-full w-1/3 bg-white/10 pointer-events-none" style={{ clipPath: "polygon(30% 0, 100% 0, 100% 100%, 0% 100%)" }}></div>
              <div className="absolute bottom-0 right-1/4 h-1/2 w-1/4 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
            </section>

            {/* Stats */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`${t.text} text-base font-bold flex items-center gap-2`}>
                  <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 20 }}>analytics</span>
                  Estadísticas Rápidas
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => navegarA("planograma")}
                  className={`${t.bgCard} border ${t.border} rounded-2xl p-4 hover:border-emerald-500/50 transition-colors text-left`}>
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg w-fit">
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>calendar_month</span>
                    </div>
                  </div>
                  <p className={`${t.textSecondary} text-xs font-medium`}>Planograma</p>
                  <p className={`${t.text} text-sm font-bold mt-1 leading-snug`}>Menú del día por cuarto</p>
                  <p className={`${t.textSecondary} text-xs mt-1 leading-relaxed`}>Organiza y consulta los platos planificados por sección para cada jornada.</p>
                </button>
                <div className={`${t.bgCard} border ${t.border} rounded-2xl p-4 hover:border-blue-500/50 transition-colors`}>
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="p-2 bg-slate-500/10 text-slate-400 rounded-lg w-fit">
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>rocket_launch</span>
                    </div>
                    <span className="text-slate-400 text-[10px] font-bold px-2 py-0.5 bg-slate-500/10 rounded-full w-fit">Próximamente</span>
                  </div>
                  <p className={`${t.textSecondary} text-xs font-medium`}>Módulos Nuevos</p>
                  <p className={`${t.text} text-sm font-bold mt-1`}>En desarrollo</p>
                </div>
              </div>
            </section>

            {/* Módulos */}
            <section>
              <h3 className={`${t.text} text-base font-bold flex items-center gap-2 mb-5`}>
                <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 20 }}>grid_view</span>
                Módulos Principales
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {todosModulos.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => navegarA(m.id)}
                    className={`group relative ${t.bgCard} border ${t.border} border-b-4 ${m.borderB} rounded-2xl p-6 flex flex-col gap-4 text-left w-full hover:shadow-2xl hover:-translate-y-1 transition-all`}
                  >
                    <div className={`w-14 h-14 rounded-xl ${m.bg} ${m.colorClass} flex items-center justify-center ${m.hoverBg} group-hover:text-white transition-colors`}>
                      <span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontSize: 28 }}>{m.icon}</span>
                    </div>
                    <div>
                      <h4 className={`${t.text} text-base font-bold mb-1`}>{m.nombre}</h4>
                      <p className={`${t.textSecondary} text-sm leading-relaxed`}>{m.descripcion}</p>
                    </div>
                    <div className="mt-auto flex items-center gap-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: m.color }}>
                      {m.accion}
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Actividad Reciente + Próximos Eventos */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {esAdmin && (
              <div className={`lg:col-span-2 ${t.bgCard} border ${t.border} rounded-2xl p-6`}>
                <div className="flex items-center justify-between mb-5">
                  <h4 className={`${t.text} font-bold flex items-center gap-2`}>
                    <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 18 }}>history</span>
                    Actividad Reciente
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/15 text-blue-400 rounded-full border border-blue-500/20">EN VIVO</span>
                  </h4>
                </div>
                {actividadReal.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <span className={`material-symbols-outlined ${t.textSecondary}`} style={{ fontSize: 36 }}>hourglass_empty</span>
                    <p className={`${t.textSecondary} text-sm`}>Sin actividad reciente registrada</p>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                    {actividadReal.map((a, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 ${t.hover} rounded-xl transition-colors`}>
                        <div className={`w-9 h-9 rounded-xl ${a.color} flex items-center justify-center flex-shrink-0`}>
                          <span className="material-symbols-outlined" style={{ fontSize: 17 }}>{a.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`${t.text} text-sm font-semibold truncate`}>{a.titulo}</p>
                          <p className={`${t.textSecondary} text-xs mt-0.5 truncate`}>{a.desc}</p>
                        </div>
                        <span className={`${t.textSecondary} text-xs whitespace-nowrap flex-shrink-0`}>{a.tiempo}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              <div className={`${t.bgCard} border ${t.border} rounded-2xl p-6 flex flex-col items-center justify-center text-center`}>
                <span className="material-symbols-outlined text-slate-600 mb-3" style={{ fontSize: 40 }}>event</span>
                <p className={`${t.text} font-bold text-sm mb-1`}>Próximos Eventos</p>
                <p className={`${t.textSecondary} text-xs leading-relaxed`}>Módulo de calendario en desarrollo. Pronto podrás ver y gestionar eventos del equipo desde aquí.</p>
                <span className="mt-4 text-[10px] font-bold px-3 py-1 bg-slate-500/10 text-slate-400 rounded-full border border-slate-500/20">Próximamente</span>
              </div>

            </section>

            <p className={`${t.textSecondary} text-xs text-center py-4`}>
              © 2026 R.info · Sistema de Información Operativa. Todos los derechos reservados.
            </p>

          </div>
        </main>
      </div>
      <BottomNav moduloActivo={null} onNavegar={navegarA} />

      {/* Tutorial */}
      {showTutorial && (
        <TutorialOverlay rol={rol} onClose={() => setShowTutorial(false)} />
      )}

    </div>
  );
}
