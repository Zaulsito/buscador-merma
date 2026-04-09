import { useState, useEffect, useRef, useCallback } from "react";
import BottomNav from "../components/BottomNav";
import { db } from "../firebase/config";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import Navbar from "../components/Navbar";
import FichaModal from "../components/FichaModal";
import FichaDetalle from "./FichaDetalle";
import { useTheme } from "../context/ThemeContext";
// fichaExcel disponible si se necesita exportar
import AppSidebar from "../components/AppSidebar";

const POR_PAGINA = 25;

// Badge de estado por verificación/costeado
function EstadoBadge({ ficha }) {
  const estados = {
    activa:    { label: "Activa",    dot: "bg-emerald-400", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    pendiente: { label: "Pendiente", dot: "bg-amber-400",   cls: "bg-amber-500/20 text-amber-400 border-amber-500/30"       },
    inactiva:  { label: "Inactiva",  dot: "bg-red-400",     cls: "bg-red-500/20 text-red-400 border-red-500/30"             },
  };
  // Fallback a "activa" si el campo estado no existe (fichas antiguas)
  const e = estados[ficha.estado] || estados.activa;
  return (
    <span className={`flex items-center gap-1 text-[10px] font-black backdrop-blur-md px-2 py-1 rounded border tracking-tight uppercase ${e.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${e.dot}`} />
      {e.label}
    </span>
  );
}

// Tarjeta individual de ficha
function FichaCard({ f, rol, onDetalle, onEditar, onEliminar, t }) {
  return (
    <div
      className={`${t.bgCard} rounded-2xl border ${t.border} hover:border-blue-400/60 transition-all duration-200 group flex flex-col h-full overflow-hidden cursor-pointer shadow-sm hover:shadow-md`}
      onClick={() => onDetalle(f)}
    >
      {/* Imagen */}
      <div className="relative h-48 w-full flex-shrink-0">
        {f.foto ? (
          <img
            src={f.foto}
            alt={f.nombre}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${t.cardImage} flex items-center justify-center`}>
            <span className={`text-5xl ${t.isDark ? "opacity-30" : "opacity-20"}`}>📋</span>
          </div>
        )}
        {/* Icono ficha */}
        <div className="absolute top-3 left-3 flex items-center justify-center bg-blue-500/20 backdrop-blur-md size-9 rounded-lg text-blue-400 border border-blue-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 3a2 2 0 110 4 2 2 0 010-4zm4 12H8v-.57c0-2 2.67-3.12 4-3.12s4 1.12 4 3.12V18z"/>
          </svg>
        </div>
        {/* Badge estado */}
        <div className="absolute top-3 right-3">
          <EstadoBadge ficha={f} />
        </div>
        {/* Alérgeno */}
        {f.esAlergeno && (
          <div className="absolute bottom-3 left-3">
            <span className="text-[10px] font-bold bg-red-500/30 backdrop-blur-md text-red-300 px-2 py-1 rounded border border-red-500/30 uppercase tracking-tight">
              ⚠ Alérgeno
            </span>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-blue-400 mb-1 tracking-wider uppercase">
            {f.seccion}{f.subcategoria ? ` › ${f.subcategoria}` : ""}
          </p>
          <h3 className={`text-sm font-black leading-tight mb-2 group-hover:text-blue-500 transition-colors uppercase tracking-tight line-clamp-2 ${t.text}`}>
            {f.nombre}
          </h3>
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m0 14v1M4 12H3m18 0h-1M6.343 6.343l-.707-.707m12.728 12.728l-.707-.707M6.343 17.657l-.707.707M17.657 6.343l-.707.707" />
            </svg>
            <span className="font-mono">
              SAP: {f.formatosVenta?.[0]?.codSap || "—"}
            </span>
          </div>
        </div>

        {/* Acciones */}
        {(rol === "admin" || rol === "unico") && (
          <div
            className="mt-4 pt-3 flex items-center gap-2 border-t border-[var(--border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onEditar(f)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${t.cardBtn}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
            <button
              onClick={() => onEliminar(f.id)}
              className={`flex items-center justify-center p-2 rounded-lg transition-all ${t.cardBtnDelete}`}
              title="Eliminar ficha"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    
    </div>
  );
}

// Tarjeta "Crear nueva receta"
function NuevaFichaCard({ onNueva, t }) {
  return (
    <div
      onClick={onNueva}
      className={`border-2 border-dashed ${t.border} rounded-2xl flex flex-col items-center justify-center p-8 hover:bg-blue-500/5 hover:border-blue-400/50 transition-all cursor-pointer group min-h-[300px]`}
    >
      <div className={`size-14 rounded-full ${t.bgInput} flex items-center justify-center ${t.textSecondary} group-hover:bg-blue-500/20 group-hover:text-blue-500 mb-4 transition-all`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <p className="font-bold text-slate-400 group-hover:text-blue-400 transition-colors text-sm">
        Crear nueva receta
      </p>
    </div>
  );
}

// Paginación
function Paginacion({ pagina, totalPaginas, cambiarPagina, t }) {
  if (totalPaginas <= 1) return null;

  const paginas = Array.from({ length: totalPaginas }, (_, i) => i + 1)
    .filter(n => n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 2);

  return (
    <div className="mt-10 flex items-center justify-center gap-2 flex-wrap">
      <button
        onClick={() => cambiarPagina(pagina - 1)}
        disabled={pagina === 1}
        className={`size-10 rounded-lg ${t.bgCard} border ${t.border} flex items-center justify-center ${t.textSecondary} hover:text-blue-500 disabled:opacity-40 transition-colors`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      {paginas.map((n, idx) => {
        const prev = paginas[idx - 1];
        return (
          <span key={n} className="flex items-center gap-2">
            {prev && n - prev > 1 && <span className="text-slate-600 text-sm px-1">…</span>}
            <button
              onClick={() => cambiarPagina(n)}
              className={`size-10 rounded-lg text-sm font-bold transition-colors ${
                n === pagina
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : `${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-blue-500`
              }`}
            >
              {n}
            </button>
          </span>
        );
      })}
      <button
        onClick={() => cambiarPagina(pagina + 1)}
        disabled={pagina === totalPaginas}
        className={`size-10 rounded-lg ${t.bgCard} border ${t.border} flex items-center justify-center ${t.textSecondary} hover:text-blue-500 disabled:opacity-40 transition-colors`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

export default function FichasTecnicas({ user, rol, onBack, onNavegar }) {
  const [fichas, setFichas] = useState([]);
  const [secciones, setSecciones] = useState(["Todas"]);
  const [seccionActiva, setSeccionActiva] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [subcategoriaFiltro, setSubcategoriaFiltro] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [fichaEditar, setFichaEditar] = useState(null);
  const [fichaDetalle, setFichaDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [fabVisible, setFabVisible] = useState(true);
  const fabTimerRef = useRef(null);
  const lastScrollY = useRef(0);
  const { t } = useTheme();

  const resetFabTimer = useCallback(() => {
    setFabVisible(true);
    clearTimeout(fabTimerRef.current);
    fabTimerRef.current = setTimeout(() => setFabVisible(false), 3000);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current) resetFabTimer();
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    fabTimerRef.current = setTimeout(() => setFabVisible(false), 3000);
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(fabTimerRef.current);
    };
  }, [resetFabTimer]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "fichas"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFichas(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "secciones"), (snap) => {
      const data = snap.docs.map((d) => d.data().nombre).sort();
      setSecciones(["Todas", ...data]);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setPagina(1);
  }, [seccionActiva, busqueda, subcategoriaFiltro]);

  const subcategorias = [
    ...new Set(fichas.filter((f) => f.subcategoria).map((f) => f.subcategoria)),
  ].sort();

  const fichasFiltradas = fichas.filter((f) => {
    const matchSeccion = seccionActiva === "Todas" || f.seccion === seccionActiva;
    const matchBusqueda = f.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    const matchSubcat = !subcategoriaFiltro || f.subcategoria === subcategoriaFiltro;
    return matchSeccion && matchBusqueda && matchSubcat;
  });

  const totalPaginas = Math.ceil(fichasFiltradas.length / POR_PAGINA);
  const fichasPaginadas = fichasFiltradas.slice(
    (pagina - 1) * POR_PAGINA,
    pagina * POR_PAGINA
  );

  const cambiarPagina = (nueva) => {
    setPagina(nueva);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEliminar = async (id) => {
    if (!confirm("¿Eliminar esta ficha técnica?")) return;
    await deleteDoc(doc(db, "fichas", id));
  };

  const abrirEditar = (f) => {
    setFichaEditar(f);
    setShowModal(true);
  };

  const abrirNueva = () => {
    setFichaEditar(null);
    setShowModal(true);
  };

  if (fichaDetalle)
    return (
      <FichaDetalle
        ficha={fichaDetalle}
        user={user}
        rol={rol}
        onBack={() => setFichaDetalle(null)}
        onNavegar={onNavegar}
        onEditar={() => {
          setFichaEditar(fichaDetalle);
          setFichaDetalle(null);
          setShowModal(true);
        }}
      />
    );

  return (
    <div className={`${t.bg} flex h-screen overflow-hidden`}>

      {/* Sidebar — solo desktop */}
      <div className="hidden md:block flex-shrink-0">
        <AppSidebar user={user} rol={rol} moduloActivo="fichas" onNavegar={onNavegar} />
      </div>

      {/* Columna principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="hidden md:block flex-shrink-0">
          <Navbar user={user} rol={rol} onNavegar={onNavegar} />
        </div>
        <main className="flex-1 overflow-y-auto">
    <div className={`min-h-full ${t.bg}`}>

      {/* Header móvil */}
      <div className="flex items-center gap-3 p-4 md:hidden">
        <button onClick={onBack} className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgInput} ${t.textSecondary}`}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
        </button>
      </div>

      <div className="w-full px-6 lg:px-10 py-8 pt-0 md:pt-8">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Fichas Técnicas
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Gestión integral de recetas y costos de producción.
            </p>
          </div>
          {(rol === "admin" || rol === "unico") && (
            <button
              onClick={abrirNueva}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nueva ficha
            </button>
          )}
        </div>

        {/* Búsqueda */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-blue-400 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={`w-full ${t.bgInput} border ${t.border} rounded-xl pl-12 pr-4 py-3.5 ${t.text} focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 outline-none text-sm`}
              placeholder="Buscar por nombre de receta, categoría o código SAP..."
            />
          </div>

          {/* Filtro subcategoría + limpiar */}
          {(subcategorias.length > 0 || busqueda || subcategoriaFiltro) && (
            <div className="flex gap-3 flex-wrap items-center">
              {subcategorias.length > 0 && (
                <select
                  value={subcategoriaFiltro}
                  onChange={(e) => setSubcategoriaFiltro(e.target.value)}
                  className={`${t.bgInput} border ${t.border} ${t.text} px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                >
                  <option value="">Todas las subcategorías</option>
                  {subcategorias.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
              {(busqueda || subcategoriaFiltro) && (
                <button
                  onClick={() => { setBusqueda(""); setSubcategoriaFiltro(""); }}
                  className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Chips de sección */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          {secciones.map((s) => (
            <button
              key={s}
              onClick={() => setSeccionActiva(s)}
              className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                seccionActiva === s
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : `${t.bgCard} border ${t.border} ${t.textSecondary} hover:border-blue-400 hover:text-blue-500`
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Cargando fichas...</p>
          </div>
        ) : fichasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <span className="text-5xl opacity-30">📋</span>
            <p className="text-slate-400 text-sm">No se encontraron fichas</p>
          </div>
        ) : (
          <>
            {/* Contador */}
            <p className="text-slate-500 text-xs mb-5">
              {fichasFiltradas.length} ficha{fichasFiltradas.length !== 1 ? "s" : ""} encontrada{fichasFiltradas.length !== 1 ? "s" : ""}
              {totalPaginas > 1 && ` · Página ${pagina} de ${totalPaginas}`}
            </p>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 mb-6">
              {fichasPaginadas.map((f) => (
                <FichaCard
                  key={f.id}
                  f={f}
                  rol={rol}
                  t={t}
                  onDetalle={setFichaDetalle}
                  onEditar={abrirEditar}
                  onEliminar={handleEliminar}
                />
              ))}
              {(rol === "admin" || rol === "unico") && pagina === totalPaginas && (
                <NuevaFichaCard onNueva={abrirNueva} t={t} />
              )}
            </div>

            <Paginacion
              pagina={pagina}
              totalPaginas={totalPaginas}
              cambiarPagina={cambiarPagina}
              t={t}
            />
          </>
        )}
      </div>

      {/* FAB móvil - solo visible en pantallas pequeñas */}
      {(rol === "admin" || rol === "unico") && (
        <button
          onClick={abrirNueva}
          onTouchStart={resetFabTimer}
          className={`
            md:hidden fixed right-5 z-50
            w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-500/40
            flex items-center justify-center
            transition-all duration-300 ease-in-out
            ${fabVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
          `}
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
          aria-label="Nueva ficha"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {showModal && (
        <FichaModal
          ficha={fichaEditar}
          seccionInicial={
            seccionActiva === "Todas"
              ? secciones[1] || "Snack y Desayuno"
              : seccionActiva
          }
          onClose={() => setShowModal(false)}
        />
      )}
    </div>{/* /min-h-full */}
        </main>
      </div>{/* /columna principal */}
      <BottomNav moduloActivo="fichas" onNavegar={onNavegar} />
    </div>
  );
}
