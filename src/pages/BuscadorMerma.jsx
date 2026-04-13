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
        <div className="hidden md:block flex-shrink-0"><Navbar user={user} rol={rol} onNavegar={onNavegar} /></div>
        <main ref={mainRef} className="flex-1 overflow-y-auto flex flex-col">

          {/* ── HEADER ── */}
          <header className={`p-6 md:p-8 pb-4 flex flex-col gap-5 border-b ${t.border} flex-shrink-0`}>

            {/* Título + botones */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <button onClick={onBack} className={`mt-1 sm:hidden w-9 h-9 flex items-center justify-center rounded-lg ${t.bgInput} ${t.textSecondary} shrink-0`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
                </button>
                <div>
                  <h2 className={`${t.text} text-2xl md:text-3xl font-black tracking-tight`}>Buscador de Merma</h2>
                  <p className={`${t.textSecondary} mt-0.5 text-sm`}>Gestión y control de desperdicios de inventario en tiempo real.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {(rol === "admin" || rol === "unico") && (
                  <button onClick={() => setShowImportExport(true)} className={`hidden sm:flex items-center gap-2 px-4 py-2.5 ${t.bgInput} ${t.hover} ${t.text} font-semibold rounded-lg transition text-sm border ${t.border}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>ios_share</span>
                    Importar/Exportar
                  </button>
                )}
                {(rol === "admin" || rol === "unico") && (
                  <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:brightness-110 text-white px-5 py-2.5 rounded-lg font-bold transition shadow-lg shadow-blue-500/30 text-sm">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                    Agregar Producto
                  </button>
                )}
              </div>
            </div>

            {/* Buscador */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 group">
                <span className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 ${t.textSecondary} group-focus-within:text-blue-400 transition-colors`} style={{ fontSize: 20 }}>search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full pl-12 pr-10 py-3 rounded-xl ${t.bgInput} ${t.text} border-none outline-none focus:ring-2 focus:ring-blue-500 text-sm placeholder:text-slate-500 shadow-inner`}
                  placeholder="Buscar producto por nombre o ID..."
                />
                {search && (
                  <button onClick={() => setSearch("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textSecondary} hover:text-red-400 transition-colors`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                  </button>
                )}
              </div>
              {(rol === "admin" || rol === "unico") && (
                <button onClick={() => setShowImportExport(true)} className={`sm:hidden flex items-center justify-center gap-2 px-4 py-3 rounded-xl ${t.bgInput} ${t.textSecondary} font-medium text-sm border ${t.border}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>ios_share</span>
                  Import/Export
                </button>
              )}
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

              {/* Chips scrolleables sin scrollbar */}
              <div
                ref={chipsRef}
                className="flex gap-2 overflow-x-auto items-center flex-1"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <button
                  onClick={() => setCatActiva("")}
                  className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap border transition-all shrink-0 ${
                    catActiva === ""
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-transparent shadow-lg shadow-blue-500/25"
                      : `${t.bgInput} ${t.textSecondary} border-transparent hover:text-blue-400`
                  }`}
                >
                  Todas
                </button>
                {categoriasDocs.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCatActiva(cat.nombre)}
                    className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap border transition-all shrink-0 ${
                      catActiva === cat.nombre
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-transparent shadow-lg shadow-blue-500/25"
                        : `${t.bgInput} ${t.textSecondary} border-transparent hover:text-blue-400`
                    }`}
                  >
                    {cat.nombre}
                  </button>
                ))}
                {/* Chip "Sin categoría" — solo visible si hay productos sin asignar */}
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

      {/* FAB móvil */}
      {(rol === "admin" || rol === "unico") && (
        <button
          onClick={() => setShowModal(true)}
          onTouchStart={resetFabTimer}
          className={`
            md:hidden fixed right-5 z-50
            w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-500/40
            flex items-center justify-center
            transition-all duration-300 ease-in-out
            ${fabVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
          `}
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
          aria-label="Agregar producto"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>add</span>
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
