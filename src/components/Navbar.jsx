import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase/config";
import { signOut } from "firebase/auth";
import { useTheme } from "../context/ThemeContext";
import { collection, getDocs } from "firebase/firestore";

const temasInfo = {
  oscuro: { label: "Oscuro", emoji: "🌑" },
  gris:   { label: "Gris",   emoji: "🌫️" },
  claro:  { label: "Claro",  emoji: "☀️" },
  verde:  { label: "Verde",  emoji: "🌿" },
};

// ── Grupos de resultados ───────────────────────────────────────────────────
const GRUPOS = [
  {
    id: "fichas",
    label: "Fichas Técnicas",
    icon: "description",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    modulo: "fichas",
    buscar: (docs, q) => docs
      .filter(d => matchQuery(q, [d.nombre, d.codigo, d.seccion]))
      .slice(0, 4)
      .map(d => ({ id: d.id, titulo: d.nombre, sub: d.seccion || "—", modulo: "fichas" })),
  },
  {
    id: "merma",
    label: "Buscador de Merma",
    icon: "search",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    modulo: "merma",
    buscar: (docs, q) => docs
      .filter(d => matchQuery(q, [d.nombre, d.codigo, d.categoria]))
      .slice(0, 4)
      .map(d => ({ id: d.id, titulo: d.nombre || d.codigo, sub: d.categoria || "—", modulo: "merma" })),
  },
  {
    id: "precios",
    label: "Lista de Precios",
    icon: "sell",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    modulo: "precios",
    buscar: (docs, q) => docs
      .filter(d => matchQuery(q, [d.nombre, d.codSap]))
      .slice(0, 4)
      .map(d => ({
        id: d.id,
        titulo: d.nombre,
        sub: d.precio != null ? `$${Number(d.precio).toLocaleString("es-CL")}` : "Sin precio",
        modulo: "precios",
      })),
  },
];

function matchQuery(q, campos) {
  const qLow = q.toLowerCase();
  return campos.some(c => c?.toLowerCase().includes(qLow));
}

export default function Navbar({ user, rol, onPerfil, onConfig, onNavegar, titulo }) {
  const [menuOpen, setMenuOpen]   = useState(false);
  const [temaOpen, setTemaOpen]   = useState(false);
  const { tema, setTema, t, temas } = useTheme();

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  const [query, setQuery]           = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando]     = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef(null);
  const [cache, setCache]           = useState({}); // { fichas: [...], merma: [...], precios: [...] }
  const debounceRef = useRef(null);
  const inputRef    = useRef(null);
  const searchRef   = useRef(null);

  // Cargar colecciones en cache al montar
  useEffect(() => {
    const cargar = async () => {
      try {
        const [snapF, snapM, snapP] = await Promise.all([
          getDocs(collection(db, "fichas")),
          getDocs(collection(db, "merma")),
          getDocs(collection(db, "lista_precios")),
        ]);
        setCache({
          fichas:  snapF.docs.map(d => ({ id: d.id, ...d.data() })),
          merma:   snapM.docs.map(d => ({ id: d.id, ...d.data() })),
          precios: snapP.docs.map(d => ({ id: d.id, ...d.data() })),
        });
      } catch { /* sin acceso, continuar */ }
    };
    cargar();
  }, []);

  // Buscar con debounce
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 2) {
      setResultados([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    debounceRef.current = setTimeout(() => {
      const grupos = GRUPOS
        .map(g => ({
          ...g,
          items: g.buscar(cache[g.id] || [], query),
        }))
        .filter(g => g.items.length > 0);
      setResultados(grupos);
      setBuscando(false);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, cache]);

  // Cerrar al hacer click afuera
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Ctrl+K para abrir búsqueda
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const irA = (modulo) => {
    setSearchOpen(false);
    setQuery("");
    onNavegar?.(modulo);
  };

  const totalResultados = resultados.reduce((acc, g) => acc + g.items.length, 0);

  // ── Resto del Navbar ──────────────────────────────────────────────────────
  const nombre    = user?.displayName || user?.email || "Usuario";
  const iniciales = nombre.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  const rolLabel  = rol === "unico" ? "Programador" : rol === "admin" ? "Admin" : rol || "Usuario";

  const cerrarMenus = () => { setMenuOpen(false); setTemaOpen(false); };

  return (
    <nav
      className={`${t.bgNav} sticky top-0 z-40 border-b border-white/5`}
      style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", backgroundColor: "var(--bg-nav, #0f1923)" }}
    >
      <div className="w-full px-6 lg:px-10 h-16 flex items-center justify-between gap-4">

        {/* Logo - Solo visible en móvil para evitar redundancia con el Sidebar en Desktop */}
        <div className="flex md:hidden items-center gap-3 cursor-pointer flex-shrink-0" onClick={() => onNavegar?.(null)}>
          <img src="/icon-192.png" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" alt="logo"
            onError={e => { e.target.style.display = "none"; }} />
          <h1 className={`${t.text} font-bold text-xs tracking-tight leading-tight`}>
            Rincon Belloto<br />Informaciones
          </h1>
        </div>

        {/* Breadcrumbs - Solo visible en Desktop */}
        <div className="hidden md:flex items-center gap-2 text-sm font-medium flex-shrink-0">
          <button 
            onClick={() => onNavegar?.(null)}
            className={`${t.textSecondary} hover:text-white transition-colors flex items-center gap-2 group`}
          >
            <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">home</span>
            Dashboard
          </button>
          
          {titulo && (
            <>
              <span className="text-slate-600 font-light mx-1">/</span>
              <button 
                onClick={() => window.location.reload()} // O la lógica de refresh que prefieras
                className="text-blue-400 font-bold hover:text-blue-300 transition-colors"
                title="Refrescar sección"
              >
                {titulo}
              </button>
            </>
          )}
        </div>

        {/* ── Búsqueda global (desktop) ── */}
        <div ref={searchRef} className="hidden md:flex flex-1 max-w-sm relative">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
              {buscando
                ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
              }
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              className="w-full bg-black/30 border border-white/10 rounded-xl pl-9 pr-16 py-2 text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
              placeholder="Buscar fichas, merma, precios..."
              type="text"
            />
            {/* Atajo teclado */}
            {!query && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <kbd className="text-[9px] text-slate-500 bg-white/5 border border-white/10 rounded px-1 py-0.5 font-mono">Ctrl</kbd>
                <kbd className="text-[9px] text-slate-500 bg-white/5 border border-white/10 rounded px-1 py-0.5 font-mono">K</kbd>
              </span>
            )}
            {query && (
              <button onClick={() => { setQuery(""); setSearchOpen(false); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            )}
          </div>

          {/* Dropdown resultados */}
          {searchOpen && query.length >= 2 && (
            <div className={`absolute top-full mt-2 left-0 right-0 ${t.bgCard} border ${t.border} rounded-2xl shadow-2xl overflow-hidden z-50`}
              style={{ maxHeight: 420 }}>

              {resultados.length === 0 && !buscando ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 32 }}>search_off</span>
                  <p className={`${t.textSecondary} text-sm`}>Sin resultados para "{query}"</p>
                </div>
              ) : (
                <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
                  {/* Contador */}
                  <div className={`px-4 py-2 border-b ${t.border} flex items-center justify-between`}>
                    <span className={`${t.textSecondary} text-xs font-bold uppercase tracking-wider`}>
                      {totalResultados} resultado{totalResultados !== 1 ? "s" : ""}
                    </span>
                    <span className={`${t.textSecondary} text-[10px]`}>Esc para cerrar</span>
                  </div>

                  {resultados.map(grupo => (
                    <div key={grupo.id}>
                      {/* Header grupo */}
                      <div className={`flex items-center justify-between px-4 py-2 ${t.isDark ? "bg-white/[0.02]" : "bg-slate-50"}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${grupo.bg}`}>
                            <span className={`material-symbols-outlined ${grupo.color}`} style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>{grupo.icon}</span>
                          </div>
                          <span className={`${t.textSecondary} text-[10px] font-black uppercase tracking-wider`}>{grupo.label}</span>
                        </div>
                        <button onClick={() => irA(grupo.modulo)}
                          className={`${grupo.color} text-[10px] font-bold hover:underline`}>
                          Ver todos →
                        </button>
                      </div>

                      {/* Items */}
                      {grupo.items.map(item => (
                        <button key={item.id}
                          onClick={() => irA(item.modulo)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${t.hover} border-b ${t.border} last:border-0`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${grupo.bg}`}>
                            <span className={`material-symbols-outlined ${grupo.color}`} style={{ fontSize: 15, fontVariationSettings: "'FILL' 1" }}>{grupo.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`${t.text} text-sm font-semibold truncate`}>
                              {resaltarQuery(item.titulo, query)}
                            </p>
                            <p className={`${t.textSecondary} text-xs truncate`}>{item.sub}</p>
                          </div>
                          <span className="material-symbols-outlined text-slate-600 flex-shrink-0" style={{ fontSize: 14 }}>arrow_forward</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Acciones derecha */}
        <div className="flex items-center gap-3 sm:gap-4">

          {/* Búsqueda — solo móvil */}
          <button
            className="md:hidden relative p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition"
            onClick={() => { setMobileSearchOpen(o => !o); setQuery(""); setTimeout(() => mobileInputRef.current?.focus(), 100); }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {mobileSearchOpen ? "close" : "search"}
            </span>
          </button>

          {/* Campana */}
          <button className="relative p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--bg-nav,#101922)]" />
          </button>

          {/* Avatar + menú */}
          <div className="relative">
            <button onClick={() => { setMenuOpen(!menuOpen); setTemaOpen(false); }}
              className="flex items-center gap-2.5 hover:bg-white/5 px-2 py-1.5 rounded-xl transition">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-100 leading-tight">{nombre.split(" ")[0]}</p>
                <p className={`text-[10px] uppercase tracking-widest leading-tight font-bold ${rol === "unico" ? "text-emerald-400" : rol === "admin" ? "text-amber-400" : "text-blue-400"}`}>{rolLabel}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-600/30 border-2 border-blue-500/40 flex items-center justify-center flex-shrink-0">
                {user?.photoURL
                  ? <img src={user.photoURL} alt={nombre} className="w-full h-full object-cover rounded-full" />
                  : <span className="text-blue-300 text-xs font-black">{iniciales}</span>
                }
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 text-slate-500 transition-transform ${menuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={cerrarMenus} />
                <div className={`absolute right-0 mt-2 w-60 ${t.bgCard} rounded-2xl shadow-2xl z-50 overflow-hidden border ${t.border}`}
                  style={{ backdropFilter: "blur(16px)" }}>

                  {/* Info usuario */}
                  <div className={`px-4 py-4 border-b ${t.border} flex items-center gap-3`}>
                    <div className="w-10 h-10 rounded-full bg-blue-600/30 border-2 border-blue-500/40 flex items-center justify-center flex-shrink-0">
                      {user?.photoURL
                        ? <img src={user.photoURL} alt={nombre} className="w-full h-full object-cover rounded-full" />
                        : <span className="text-blue-300 text-sm font-black">{iniciales}</span>
                      }
                    </div>
                    <div className="min-w-0">
                      <p className={`${t.text} text-sm font-bold truncate`}>{nombre}</p>
                      <p className={`${t.textSecondary} text-xs truncate`}>{user?.email}</p>
                    </div>
                  </div>

                  {onPerfil && (
                    <button onClick={() => { onPerfil(); cerrarMenus(); }}
                      className={`w-full text-left px-4 py-3 ${t.text} ${t.hover} transition text-sm flex items-center gap-3`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Mi Perfil
                    </button>
                  )}

                  {onConfig && (
                    <button onClick={() => { onConfig(); cerrarMenus(); }}
                      className={`w-full text-left px-4 py-3 ${t.text} ${t.hover} transition text-sm flex items-center gap-3`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configuración
                    </button>
                  )}

                  <button onClick={() => setTemaOpen(!temaOpen)}
                    className={`w-full text-left px-4 py-3 ${t.text} ${t.hover} transition text-sm flex items-center justify-between gap-3`}>
                    <span className="flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                      Tema: {temasInfo[tema].emoji} {temasInfo[tema].label}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 text-slate-500 transition-transform ${temaOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {temaOpen && (
                    <div className={`border-t ${t.border} bg-black/10`}>
                      {temas.map((t2) => (
                        <button key={t2} onClick={() => { setTema(t2); cerrarMenus(); }}
                          className={`w-full text-left px-6 py-2.5 ${t.text} ${t.hover} transition text-sm flex items-center gap-2 ${tema === t2 ? "font-bold" : "opacity-70"}`}>
                          <span>{temasInfo[t2].emoji}</span>
                          <span>{temasInfo[t2].label}</span>
                          {tema === t2 && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 ml-auto text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={`border-t ${t.border}`}>
                    <button onClick={() => signOut(auth)}
                      className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/10 transition text-sm flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {/* ── Búsqueda móvil overlay ── */}
      {mobileSearchOpen && (
        <div className={`md:hidden border-b border-white/10 px-4 py-3`}
          style={{ backgroundColor: "var(--bg-nav, #0f1923)", backdropFilter: "blur(12px)" }}>
          <div className="relative mb-2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              {buscando
                ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              }
            </span>
            <input
              ref={mobileInputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Escape" && setMobileSearchOpen(false)}
              placeholder="Buscar fichas, merma, precios..."
              className={`w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/50`}
            />
            {query && (
              <button onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            )}
          </div>

          {/* Resultados móvil */}
          {query.length >= 2 && (
            <div className={`rounded-xl border border-white/10 overflow-hidden`}
              style={{ backgroundColor: "rgba(15,25,35,0.97)", maxHeight: 320, overflowY: "auto" }}>
              {resultados.length === 0 && !buscando ? (
                <div className="flex flex-col items-center justify-center py-6 gap-1.5">
                  <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 28 }}>search_off</span>
                  <p className="text-slate-400 text-sm">Sin resultados para "{query}"</p>
                </div>
              ) : (
                resultados.map(grupo => (
                  <div key={grupo.id}>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.03]">
                      <div className={`w-4 h-4 rounded flex items-center justify-center ${grupo.bg}`}>
                        <span className={`material-symbols-outlined ${grupo.color}`} style={{ fontSize: 10, fontVariationSettings: "'FILL' 1" }}>{grupo.icon}</span>
                      </div>
                      <span className="text-slate-500 text-[10px] font-black uppercase tracking-wider">{grupo.label}</span>
                    </div>
                    {grupo.items.map(item => (
                      <button key={item.id}
                        onClick={() => { irA(item.modulo); setMobileSearchOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 border-t border-white/5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${grupo.bg}`}>
                          <span className={`material-symbols-outlined ${grupo.color}`} style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>{grupo.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-200 text-sm font-semibold truncate">{resaltarQuery(item.titulo, query)}</p>
                          <p className="text-slate-500 text-xs truncate">{item.sub}</p>
                        </div>
                        <span className="material-symbols-outlined text-slate-600" style={{ fontSize: 14 }}>arrow_forward</span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

// Resalta el texto que coincide con la búsqueda
function resaltarQuery(texto, query) {
  if (!texto || !query) return texto;
  const idx = texto.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return texto;
  return (
    <>
      {texto.slice(0, idx)}
      <mark className="bg-blue-500/30 text-blue-300 rounded px-0.5">{texto.slice(idx, idx + query.length)}</mark>
      {texto.slice(idx + query.length)}
    </>
  );
}
