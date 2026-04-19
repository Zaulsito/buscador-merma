import { useState, useEffect, useRef, useCallback } from "react";
import BottomNav from "../components/BottomNav";
import { db } from "../firebase/config";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import ProductCard from "../components/ProductCard";
import AddProductModal from "../components/AddProductModal";
import AddCategoriaModal from "../components/AddCategoriaModal";
import ImportExportModal from "../components/ImportExportModal";
import { useTheme } from "../context/ThemeContext";
import AppSidebar from "../components/AppSidebar";
import Navbar from "../components/Navbar";

const POR_PAGINA = 50;
const MAX_BOTONES = 5;

export default function BuscadorMerma({ user, rol, onBack, onNavegar }) {
  const [products, setProducts] = useState([]);
  const [categoriasDocs, setCategoriasDocs] = useState([]);
  const [search, setSearch] = useState("");
  const [catActiva, setCatActiva] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showNuevaCat, setShowNuevaCat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [fabVisible, setFabVisible] = useState(true);
  const fabTimerRef = useRef(null);
  const lastScrollY = useRef(0);
  const { t } = useTheme();

  const chipsRef = useRef(null);

  const scrollChips = (dir) => {
    if (chipsRef.current) {
      chipsRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
    }
  };

  const resetFabTimer = useCallback(() => {
    setFabVisible(true);
    clearTimeout(fabTimerRef.current);
    fabTimerRef.current = setTimeout(() => setFabVisible(false), 3000);
  }, []);

  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;

    const onScroll = () => {
      resetFabTimer();
    };

    mainElement.addEventListener("scroll", onScroll, { passive: true });
    
    // Iniciar oculto si no se mueve
    fabTimerRef.current = setTimeout(() => setFabVisible(false), 3000);
    
    return () => {
      mainElement.removeEventListener("scroll", onScroll);
      clearTimeout(fabTimerRef.current);
    };
  }, [resetFabTimer]);

  useEffect(() => {
    const q = query(collection(db, "merma"), orderBy("fechaCreacion", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categorias"), (snap) => {
      const docs = snap.docs
        .map((d) => ({ id: d.id, nombre: d.data().nombre, color: d.data().color || "blue" }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      setCategoriasDocs(docs);
    });
    return () => unsub();
  }, []);

  useEffect(() => { setPagina(1); }, [search, catActiva]);

  const filtered = products.filter((p) => {
    const term = search.toLowerCase();
    const matchSearch =
      p.codigo?.toLowerCase().includes(term) ||
      p.nombre?.toLowerCase().includes(term) ||
      p.categoria?.toLowerCase().includes(term);
    const matchCat = catActiva === "" || (catActiva === "__sin__" ? (!p.categoria || p.categoria === "") : p.categoria === catActiva);
    return matchSearch && matchCat;
  });

  const totalPaginas = Math.ceil(filtered.length / POR_PAGINA);
  const paginados = filtered.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const sinCategoria = products.filter(p => !p.categoria || p.categoria === "").length;

  const mainRef = useRef(null);
  const cambiarPagina = (nueva) => {
    setPagina(nueva);
    // Scroll al top del contenedor principal
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getBotones = () => {
    if (totalPaginas <= MAX_BOTONES) return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    let inicio = Math.max(1, pagina - 2);
    let fin = inicio + MAX_BOTONES - 1;
    if (fin > totalPaginas) { fin = totalPaginas; inicio = fin - MAX_BOTONES + 1; }
    return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
  };

  return (
    <div className={`${t.bg} flex h-screen overflow-hidden`}>

      {/* Sidebar — solo desktop */}
      <div className="hidden md:block flex-shrink-0">
        <AppSidebar user={user} rol={rol} moduloActivo="merma" onNavegar={onNavegar} />
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
            titulo="Gestión de Merma" 
          />
        </div>
        <main ref={mainRef} className="flex-1 overflow-y-auto flex flex-col">

          {/* ── HEADER ── */}
          <header className={`p-6 md:p-8 pb-4 flex flex-col gap-5 border-b ${t.border} flex-shrink-0`}>

            {/* Título + botones */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`mt-1 w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full ${t.bgCard} border ${t.border} ${t.textSecondary} shadow-sm transition-all`}>
                  {/* Flecha solo móvil */}
                  <button 
                    onClick={onBack}
                    className="sm:hidden w-full h-full flex items-center justify-center rounded-full"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back</span>
                  </button>
                  {/* Icono merma solo desktop */}
                  <span className="hidden sm:block material-symbols-outlined text-blue-500/80" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>
                    inventory_2
                  </span>
                </div>
                <div>
                  <h2 className={`${t.text} text-2xl md:text-3xl font-black tracking-tight leading-none`}>Gestión de Merma</h2>
                  <p className={`${t.textSecondary} mt-1.5 text-sm`}>Gestión y control de desperdicios de inventario en tiempo real.</p>
                </div>
              </div>

              <div className="flex flex-row items-stretch gap-3 shrink-0">
                {(rol === "admin" || rol === "unico") && (
                  <>
                    <button 
                      onClick={() => setShowModal(true)} 
                      className="flex-1 sm:w-64 flex items-center justify-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:brightness-110 text-white px-6 py-3.5 rounded-xl font-black tracking-tight transition shadow-lg shadow-blue-500/30 text-xs md:text-sm whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
                      AGREGAR PRODUCTO
                    </button>

                    {/* Botón Importar/Exportar (Ocultado por petición, código preservado)
                    <button 
                      onClick={() => setShowImportExport(true)} 
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl ${t.bgInput} ${t.hover} ${t.textSecondary} font-bold text-[10px] sm:text-xs md:text-sm border ${t.border} transition-all whitespace-nowrap`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>ios_share</span>
                      IMPORTAR/EXPORTAR
                    </button> 
                    */}
                  </>
                )}
              </div>
            </div>

            {/* Chips de categoría con flechas */}
            <div className="flex items-center gap-2">
              {/* Flecha izquierda */}
              <button
                onClick={() => scrollChips(-1)}
                className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${t.bgInput} ${t.textSecondary} hover:text-blue-400 transition-colors`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
              </button>

              <div
                ref={chipsRef}
                className="flex gap-2 overflow-x-auto items-center flex-1 px-4"
                style={{ 
                  scrollbarWidth: "none", 
                  msOverflowStyle: "none",
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)',
                  maskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)'
                }}
              >
                <button
                  onClick={() => setCatActiva("")}
                  className={`px-5 py-2.5 rounded-2xl text-[11px] font-black whitespace-nowrap border transition-all shrink-0 uppercase tracking-widest ${
                    catActiva === ""
                      ? "bg-blue-600 text-white border-transparent shadow-lg shadow-blue-500/25 scale-105"
                      : `${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-blue-400`
                  }`}
                >
                  TODAS
                </button>
                {categoriasDocs.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCatActiva(cat.nombre)}
                    className={`px-5 py-2.5 rounded-2xl text-[11px] font-black whitespace-nowrap border transition-all shrink-0 uppercase tracking-widest ${
                      catActiva === cat.nombre
                        ? "bg-blue-600 text-white border-transparent shadow-lg shadow-blue-500/25 scale-105"
                        : `${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-blue-400`
                    }`}
                  >
                    {cat.nombre}
                  </button>
                ))}
                {sinCategoria > 0 && (
                  <button
                    onClick={() => setCatActiva("__sin__")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap border transition-all shrink-0 ${
                      catActiva === "__sin__"
                        ? "bg-amber-500 text-white border-transparent shadow-lg shadow-amber-500/25"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                    }`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
                    Sin categoría ({sinCategoria})
                  </button>
                )}
                {(rol === "admin" || rol === "unico") && (
                  <button
                    onClick={() => setShowNuevaCat(true)}
                    className={`w-9 h-9 flex items-center justify-center rounded-full border ${t.border} ${t.textSecondary} hover:border-blue-500 hover:text-blue-400 transition-all shrink-0`}
                    title="Nueva categoría"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
                  </button>
                )}
              </div>

              {/* Flecha derecha */}
              <button
                onClick={() => scrollChips(1)}
                className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${t.bgInput} ${t.textSecondary} hover:text-blue-400 transition-colors`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
              </button>
            </div>

            {/* Buscador (Posicionado debajo de categorías para mejor flujo visual) */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <div className="relative flex-1 group">
                <span className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 ${t.textSecondary} group-focus-within:text-blue-400 transition-colors`} style={{ fontSize: 20 }}>search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full pl-12 pr-10 py-4 rounded-xl ${t.bgInput} ${t.text} border-none outline-none focus:ring-2 focus:ring-blue-500 text-sm placeholder:text-slate-500 shadow-xl transition-all`}
                  placeholder="Buscar producto por nombre o SAP..."
                />
                {search && (
                  <button onClick={() => setSearch("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textSecondary} hover:text-red-400 transition-colors`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* ── GRID ── */}
          <section className="flex-1 p-6 md:p-8 pt-4 md:pt-6 pb-24 md:pb-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <span className={`material-symbols-outlined ${t.textSecondary}`} style={{ fontSize: 36 }}>hourglass_empty</span>
                <p className={`${t.textSecondary} text-sm`}>Cargando productos...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <span className={`material-symbols-outlined ${t.textSecondary}`} style={{ fontSize: 48 }}>search_off</span>
                <p className={`${t.text} font-semibold`}>{search || catActiva ? "No se encontraron productos" : "Aún no hay productos agregados"}</p>
                {(search || catActiva) && (
                  <button onClick={() => { setSearch(""); setCatActiva(""); }} className="text-blue-400 text-sm hover:underline">
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className={`${t.textSecondary} text-sm mb-5`}>
                  Mostrando <span className={`${t.text} font-bold`}>{paginados.length}</span> de <span className={`${t.text} font-bold`}>{filtered.length}</span> productos registrados
                  {sinCategoria > 0 && (
                    <button onClick={() => setCatActiva("__sin__")}
                      className="ml-3 flex items-center gap-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold hover:bg-amber-500/20 transition">
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>warning</span>
                      {sinCategoria} sin categoría
                    </button>
                  )}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {paginados.map((p) => (
                    <ProductCard key={p.id} product={p} rol={rol} />
                  ))}
                  
                  {/* Tarjeta Nuevo Producto (Estilo Premium) */}
                  {(rol === "admin" || rol === "unico") && (
                    <button 
                      onClick={() => setShowModal(true)}
                      className={`group relative flex flex-col items-center justify-center gap-4 rounded-[2rem] border-2 border-dashed border-gray-700/50 ${t.bgCard} hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-300 min-h-[380px]`}
                    >
                      <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center text-gray-500 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-xl">
                        <span className="material-symbols-outlined" style={{ fontSize: 32 }}>add</span>
                      </div>
                      <div className="text-center">
                        <p className="text-white font-bold text-sm tracking-wide uppercase">Nuevo Producto</p>
                        <p className="text-gray-500 text-[10px] mt-1 font-medium tracking-widest uppercase">Añadir al Inventario</p>
                      </div>
                      
                      {/* Glow sutil */}
                      <div className="absolute inset-x-10 bottom-10 h-10 bg-blue-500/20 blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                </div>

                {totalPaginas > 1 && (
                  <div className="flex items-center justify-between pt-6 mt-4 border-t" style={{ borderColor: "inherit" }}>
                    <p className={`${t.textSecondary} text-sm hidden sm:block`}>Página {pagina} de {totalPaginas}</p>
                    <div className="flex items-center gap-2 mx-auto sm:mx-0">
                      <button onClick={() => cambiarPagina(pagina - 1)} disabled={pagina === 1}
                        className={`size-10 flex items-center justify-center rounded-lg border ${t.border} ${t.textSecondary} hover:border-blue-500 hover:text-blue-400 transition disabled:opacity-40`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_left</span>
                      </button>
                      {getBotones().map((n) => (
                        <button key={n} onClick={() => cambiarPagina(n)}
                          className={`size-10 flex items-center justify-center rounded-lg text-sm font-bold transition ${
                            n === pagina
                              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25"
                              : `border ${t.border} ${t.textSecondary} hover:border-blue-500 hover:text-blue-400`
                          }`}>
                          {n}
                        </button>
                      ))}
                      <button onClick={() => cambiarPagina(pagina + 1)} disabled={pagina === totalPaginas}
                        className={`size-10 flex items-center justify-center rounded-lg border ${t.border} ${t.textSecondary} hover:border-blue-500 hover:text-blue-400 transition disabled:opacity-40`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

        </main>
      </div>{/* /columna principal */}

      {/* FAB Inteligente Minimalista */}
      {(rol === "admin" || rol === "unico") && (
        <button
          onClick={() => setShowModal(true)}
          className={`
            fixed right-6 z-[60]
            w-14 h-14 rounded-2xl
            bg-gray-900/80 backdrop-blur-xl
            border border-gray-700/50
            text-blue-400 shadow-2xl shadow-black/50
            flex items-center justify-center
            transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
            hover:scale-110 hover:text-blue-300 hover:border-blue-500/30
            active:scale-95
            ${fabVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-50 pointer-events-none"}
          `}
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 90px)" }}
          aria-label="Agregar producto"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-500/5 to-transparent pointer-events-none" />
          <span className="material-symbols-outlined" style={{ fontSize: 32 }}>add</span>
        </button>
      )}

      {showModal && <AddProductModal onClose={() => setShowModal(false)} onAdded={() => setShowModal(false)} />}
      {showImportExport && <ImportExportModal onClose={() => setShowImportExport(false)} />}
      {showNuevaCat && (
        <AddCategoriaModal
          onClose={() => setShowNuevaCat(false)}
          categoriasDocs={categoriasDocs}
        />
      )}
    
      <BottomNav moduloActivo="merma" onNavegar={onNavegar} />
    </div>
  );
}
