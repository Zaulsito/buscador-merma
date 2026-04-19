import { useState, useEffect, useRef, useCallback } from "react";
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
import ListaPreciosPage from "./ListaPreciosPage";
import TraspasosPage from "./TraspasosPage";
import TutorialOverlay from "../components/TutorialOverlay";
import InformacionPage from "./InformacionPage";
import BottomNav from "../components/BottomNav";
import Navbar from "../components/Navbar";

const modulos = [
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
    id: "merma",
    nombre: "Gestión de Merma",
    descripcion: "Localiza y analiza pérdidas operativas eficientemente.",
    icon: "inventory_2",
    accion: "Acceder módulo",
    color: "#258cf4",
    colorClass: "text-blue-400",
    bg: "bg-blue-500/10",
    hoverBg: "group-hover:bg-blue-500",
    borderB: "border-b-blue-500",
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
    id: "traspasos",
    nombre: "Traspasos",
    descripcion: "Gestiona y registra traspasos de productos entre secciones.",
    icon: "swap_horiz",
    accion: "Ver traspasos",
    color: "#06b6d4",
    colorClass: "text-cyan-400",
    bg: "bg-cyan-500/10",
    hoverBg: "group-hover:bg-cyan-500",
    borderB: "border-b-cyan-500",
  },
  {
    id: "precios",
    nombre: "Lista de Precios",
    descripcion: "Gestiona precios de productos y fichas técnicas con SAP vigente.",
    icon: "sell",
    accion: "Ver precios",
    color: "#f59e0b",
    colorClass: "text-amber-400",
    bg: "bg-amber-500/10",
    hoverBg: "group-hover:bg-amber-500",
    borderB: "border-b-amber-500",
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => {
    return !localStorage.getItem("rinfo_tutorial_visto");
  });

  // Detectar trigger de tutorial desde otras páginas
  useEffect(() => {
    if (sessionStorage.getItem("trigger_tutorial") === "true") {
      sessionStorage.removeItem("trigger_tutorial");
      setShowTutorial(true);
    }
  }, [modulo]); // Se dispara al volver al dashboard (modulo === null)
  const [actividadReal, setActividadReal] = useState([]);
  // ── Búsqueda global (misma lógica que Navbar) ──
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchResultados, setSearchResultados] = useState([]);
  const [searchBuscando, setSearchBuscando] = useState(false);
  const [searchCache, setSearchCache] = useState({});
  const searchDebounceRef = useRef(null);
  const mobileSearchInputRef = useRef(null);

  const SEARCH_GRUPOS = [
    {
      id: "fichas", label: "Fichas Técnicas", icon: "description",
      color: "text-orange-400", bg: "bg-orange-500/10", modulo: "fichas",
      buscar: (docs, q) => docs
        .filter(d => [d.nombre, d.codigo, d.seccion].some(c => c?.toLowerCase().includes(q.toLowerCase())))
        .slice(0, 4).map(d => ({ id: d.id, titulo: d.nombre, sub: d.seccion || "—", modulo: "fichas" })),
    },
    {
      id: "merma", label: "Gestión de Merma", icon: "inventory_2",
      color: "text-blue-400", bg: "bg-blue-500/10", modulo: "merma",
      buscar: (docs, q) => docs
        .filter(d => [d.nombre, d.codigo, d.categoria].some(c => c?.toLowerCase().includes(q.toLowerCase())))
        .slice(0, 4).map(d => ({ id: d.id, titulo: d.nombre || d.codigo, sub: d.categoria || "—", modulo: "merma" })),
    },
    {
      id: "precios", label: "Lista de Precios", icon: "sell",
      color: "text-amber-400", bg: "bg-amber-500/10", modulo: "precios",
      buscar: (docs, q) => docs
        .filter(d => [d.nombre, d.codSap].some(c => c?.toLowerCase().includes(q.toLowerCase())))
        .slice(0, 4).map(d => ({
          id: d.id, titulo: d.nombre,
          sub: d.precio != null ? `$${Number(d.precio).toLocaleString("es-CL")}` : "Sin precio",
          modulo: "precios",
        })),
    },
  ];

  // Cargar cache de colecciones una sola vez
  useEffect(() => {
    const cargar = async () => {
      try {
        const [snapF, snapM, snapP] = await Promise.all([
          getDocs(collection(db, "fichas")),
          getDocs(collection(db, "merma")),
          getDocs(collection(db, "lista_precios")),
        ]);
        setSearchCache({
          fichas:  snapF.docs.map(d => ({ id: d.id, ...d.data() })),
          merma:   snapM.docs.map(d => ({ id: d.id, ...d.data() })),
          precios: snapP.docs.map(d => ({ id: d.id, ...d.data() })),
        });
      } catch { /* continuar sin cache */ }
    };
    cargar();
  }, []);

  // Debounce búsqueda
  useEffect(() => {
    clearTimeout(searchDebounceRef.current);
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResultados([]);
      setSearchBuscando(false);
      return;
    }
    setSearchBuscando(true);
    searchDebounceRef.current = setTimeout(() => {
      const grupos = SEARCH_GRUPOS
        .map(g => ({ ...g, items: g.buscar(searchCache[g.id] || [], searchQuery) }))
        .filter(g => g.items.length > 0);
      setSearchResultados(grupos);
      setSearchBuscando(false);
    }, 250);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchQuery, searchCache]);

  const searchTotalResultados = searchResultados.reduce((acc, g) => acc + g.items.length, 0);
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
            icon: "inventory_2",
            color: "bg-blue-500/10 text-blue-400",
            titulo: `Gestión: ${d.data().nombre || d.data().codigo || "Sin nombre"}`,
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

    const unsubPlanograma = onSnapshot(
      query(collection(db, "planograma"), limit(20)),
      (snap) => {
        eventos.planograma = snap.docs
          .filter(d => d.data()._modifiedAt)
          .map(d => ({
            _ts: d.data()._modifiedAt?.seconds || 0,
            icon: "calendar_month",
            color: "bg-purple-500/10 text-purple-400",
            titulo: `Planograma: ${d.id}`,
            desc: `Modificado por ${d.data()._modifiedBy || "—"}`,
            tiempo: tiempoRelativo(d.data()._modifiedAt),
          }))
          .sort((a, b) => b._ts - a._ts)
          .slice(0, 6);
        actualizar();
      }
    );

    return () => { unsubFichas(); unsubMerma(); unsubInsumos(); unsubPlanograma(); };
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
  if (modulo === "perfil")       return <PerfilPage       user={user} rol={rol} onBack={() => navegarA(null)} onNavegar={navegarA} />;
  if (modulo === "fichas")       return <FichasTecnicas   user={user} rol={rol} onBack={() => navegarA(null)} onNavegar={navegarA} />;
  if (modulo === "informacion") return <InformacionPage user={user} rol={rol} onBack={() => navegarA(null)} onNavegar={navegarA} />;
  if (modulo === "planograma")  return <PlanogramaPage   user={user} rol={rol} onBack={() => navegarA(null)} onNavegar={navegarA} />;
  if (modulo === "precios")      return <ListaPreciosPage user={user} rol={rol} onBack={() => navegarA(null)} onNavegar={navegarA} />;
  if (modulo === "traspasos")    return <TraspasosPage    user={user} rol={rol} onBack={() => navegarA(null)} onNavegar={navegarA} />;
  if (modulo === "planificador") return <Planificador     user={user} rol={rol} onBack={() => navegarA(null)} onNavegar={navegarA} />;

  const nombre = user?.displayName?.split(" ")[0] || "Usuario";
  const iniciales = (user?.displayName || "U").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const todosModulos = (rol === "admin" || rol === "unico") ? [...modulos, moduloAdmin] : modulos;
  const modulosFiltrados = searchQuery.trim()
    ? todosModulos.filter(m =>
        m.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.descripcion.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : todosModulos;

  // Resaltar coincidencia de búsqueda
  const resaltarTexto = (texto, q) => {
    if (!texto || !q) return texto;
    const idx = texto.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return texto;
    return (
      <>
        {texto.slice(0, idx)}
        <mark className="bg-blue-500/30 text-blue-300 rounded px-0.5 not-italic">{texto.slice(idx, idx + q.length)}</mark>
        {texto.slice(idx + q.length)}
      </>
    );
  };

  return (
    // ✅ h-screen + overflow-hidden en el root — el scroll ocurre solo en main
    <div className={`h-screen overflow-hidden ${t.bg} flex flex-col`}>

      {/* ── TOP NAV mobile ── */}
      <header className={`md:hidden w-full ${t.bgNav} flex-shrink-0`}>
        {/* Fila principal */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${t.border}`}>
          <div className="flex items-center gap-3">
            <img src="/icon-192.png" className="w-9 h-9 rounded-xl object-contain flex-shrink-0" alt="logo"
              onError={e => { e.target.style.display = "none"; }} />
            <h1 className={`${t.text} text-sm font-bold tracking-tight leading-tight`}>Rincon<br/>Informaciones</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Botón búsqueda móvil */}
            <button
              onClick={() => { setMobileSearchOpen(o => !o); setSearchQuery(""); }}
              className={`w-9 h-9 flex items-center justify-center rounded-full ${t.hover} transition ${mobileSearchOpen ? "bg-blue-500/20 text-blue-400" : t.textSecondary}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                {mobileSearchOpen ? "close" : "search"}
              </span>
            </button>
            <button className={`w-9 h-9 flex items-center justify-center rounded-full ${t.hover} relative`}>
              <span className={`material-symbols-outlined ${t.textSecondary}`} style={{ fontSize: 22 }}>notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full"></span>
            </button>
            <button onClick={() => navegarA("perfil")} className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
              {iniciales}
            </button>
          </div>
        </div>

        {/* Barra de búsqueda expandible móvil */}
        {mobileSearchOpen && (
          <div className={`px-4 py-3 border-b ${t.border}`}>
            {/* Input */}
            <div className="relative mb-2">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                {searchBuscando
                  ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>
                }
              </span>
              <input
                ref={mobileSearchInputRef}
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Escape" && setMobileSearchOpen(false)}
                placeholder="Buscar fichas, merma, precios..."
                className={`w-full pl-9 pr-9 py-2.5 ${t.bgInput} border ${t.border} ${t.text} rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textSecondary} hover:text-white`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                </button>
              )}
            </div>

            {/* Resultados globales */}
            {searchQuery.length >= 2 && (
              <div className={`rounded-xl border ${t.border} overflow-hidden`} style={{ maxHeight: 340, overflowY: "auto" }}>
                {searchResultados.length === 0 && !searchBuscando ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-1.5">
                    <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 28 }}>search_off</span>
                    <p className={`${t.textSecondary} text-sm`}>Sin resultados para "{searchQuery}"</p>
                  </div>
                ) : (
                  <>
                    <div className={`px-4 py-2 border-b ${t.border} flex items-center justify-between ${t.isDark ? "bg-white/[0.02]" : "bg-slate-50"}`}>
                      <span className={`${t.textSecondary} text-[10px] font-black uppercase tracking-wider`}>
                        {searchTotalResultados} resultado{searchTotalResultados !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {searchResultados.map(grupo => (
                      <div key={grupo.id}>
                        <div className={`flex items-center gap-2 px-4 py-2 ${t.isDark ? "bg-white/[0.02]" : "bg-slate-50"}`}>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${grupo.bg}`}>
                            <span className={`material-symbols-outlined ${grupo.color}`} style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>{grupo.icon}</span>
                          </div>
                          <span className={`${t.textSecondary} text-[10px] font-black uppercase tracking-wider`}>{grupo.label}</span>
                          <button onClick={() => { navegarA(grupo.modulo); setSearchQuery(""); setMobileSearchOpen(false); }}
                            className={`${grupo.color} text-[10px] font-bold ml-auto`}>Ver todos →</button>
                        </div>
                        {grupo.items.map(item => (
                          <button key={item.id}
                            onClick={() => { navegarA(item.modulo); setSearchQuery(""); setMobileSearchOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left border-t ${t.border} transition-colors ${t.hover}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${grupo.bg}`}>
                              <span className={`material-symbols-outlined ${grupo.color}`} style={{ fontSize: 15, fontVariationSettings: "'FILL' 1" }}>{grupo.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`${t.text} text-sm font-semibold truncate`}>{resaltarTexto(item.titulo, searchQuery)}</p>
                              <p className={`${t.textSecondary} text-xs truncate`}>{item.sub}</p>
                            </div>
                            <span className="material-symbols-outlined text-slate-600 flex-shrink-0" style={{ fontSize: 14 }}>arrow_forward</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── LAYOUT desktop: sidebar + main ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR desktop ── */}
        <AppSidebar user={user} rol={rol} moduloActivo={null} onNavegar={navegarA} />

        {/* ── MAIN CONTENT ── scroll solo aquí ── */}
        <main className="flex-1 overflow-y-auto">

          {/* Top bar desktop */}
          <div className="hidden md:block">
            <Navbar 
              user={user} 
              rol={rol} 
              onNavegar={navegarA} 
              onPerfil={() => navegarA("perfil")}
              onTutorial={() => setShowTutorial(true)}
              titulo={null} 
            />
          </div>


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
