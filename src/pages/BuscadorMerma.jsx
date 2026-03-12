import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import AddProductModal from "../components/AddProductModal";
import ImportExportModal from "../components/ImportExportModal";
import { useTheme } from "../context/ThemeContext";

const POR_PAGINA = 50;
const MAX_BOTONES = 5;

export default function BuscadorMerma({ user, rol, onBack }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const { t } = useTheme();

  useEffect(() => {
    const q = query(collection(db, "merma"), orderBy("fechaCreacion", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setPagina(1);
  }, [search]);

  const filtered = products.filter((p) => {
    const term = search.toLowerCase();
    return (
      p.codigo?.toLowerCase().includes(term) ||
      p.nombre?.toLowerCase().includes(term) ||
      p.categoria?.toLowerCase().includes(term)
    );
  });

  const totalPaginas = Math.ceil(filtered.length / POR_PAGINA);
  const paginados = filtered.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const cambiarPagina = (nueva) => {
    setPagina(nueva);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getBotones = () => {
    if (totalPaginas <= MAX_BOTONES) {
      return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    }
    let inicio = Math.max(1, pagina - 2);
    let fin = inicio + MAX_BOTONES - 1;
    if (fin > totalPaginas) {
      fin = totalPaginas;
      inicio = fin - MAX_BOTONES + 1;
    }
    return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
  };

  return (
    <div className={`min-h-screen ${t.bg} flex flex-col`}>

      {/* ── HEADER ── */}
      <header className={`sticky top-0 z-10 ${t.bgNav} border-b ${t.border} backdrop-blur-md px-4 md:px-8 py-4`}>
        <div className="max-w-7xl mx-auto">

          {/* Top row */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgInput} ${t.hover} ${t.textSecondary} transition`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
              </button>
              <div>
                <h1 className={`${t.text} text-lg font-bold tracking-tight`}>Buscador de Merma</h1>
                <p className={`${t.textSecondary} text-xs font-medium hidden md:block`}>Panel de Control R.info</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(rol === "admin" || rol === "unico") && (
                <button
                  onClick={() => setShowImportExport(true)}
                  className={`flex items-center gap-2 px-3 py-2 ${t.bgInput} ${t.hover} ${t.text} font-semibold rounded-lg transition text-sm`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>ios_share</span>
                  <span className="hidden sm:inline">Import/Export</span>
                </button>
              )}
              {(rol === "admin" || rol === "unico") && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition shadow-lg shadow-blue-500/20 text-sm"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
                  <span className="hidden sm:inline">Agregar producto</span>
                  <span className="sm:hidden">Agregar</span>
                </button>
              )}
            </div>
          </div>

          {/* Buscador */}
          <div className="relative group">
            <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 ${t.textSecondary} group-focus-within:text-blue-400 transition-colors`} style={{ fontSize: 20 }}>search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full ${t.bgInput} ${t.text} border ${t.border} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl py-3 pl-10 pr-4 text-sm outline-none transition-all placeholder:${t.textSecondary}`}
              placeholder="Buscar por nombre de producto, código o categoría..."
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textSecondary} hover:text-red-400 transition-colors`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* ── CONTENT ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-6 pb-24 md:pb-8">

        {/* Breadcrumb desktop */}
        <div className="hidden md:flex items-center gap-2 mb-6">
          <button onClick={onBack} className={`${t.textSecondary} hover:text-blue-400 text-sm transition-colors`}>
            Rincón Informaciones
          </button>
          <span className={`${t.textSecondary} text-sm`}>/</span>
          <span className={`${t.text} text-sm font-semibold`}>Buscador de Merma</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <span className={`material-symbols-outlined ${t.textSecondary} animate-spin`} style={{ fontSize: 32 }}>refresh</span>
              <p className={`${t.textSecondary} text-sm`}>Cargando productos...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className={`material-symbols-outlined ${t.textSecondary}`} style={{ fontSize: 48 }}>search_off</span>
            <p className={`${t.text} font-semibold`}>
              {search ? "No se encontraron productos" : "Aún no hay productos agregados"}
            </p>
            {search && (
              <button onClick={() => setSearch("")} className="text-blue-400 text-sm hover:underline">
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <>
            <p className={`${t.textSecondary} text-sm mb-4`}>
              Mostrando <span className={`${t.text} font-bold`}>{paginados.length}</span> de <span className={`${t.text} font-bold`}>{filtered.length}</span> productos · Página {pagina} de {totalPaginas}
            </p>

            {/* Grid de productos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              {paginados.map((p) => (
                <ProductCard key={p.id} product={p} rol={rol} />
              ))}
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between gap-4">
                <p className={`${t.textSecondary} text-sm hidden sm:block`}>
                  Página {pagina} de {totalPaginas}
                </p>
                <div className="flex items-center gap-2 mx-auto sm:mx-0">
                  <button
                    onClick={() => cambiarPagina(1)}
                    disabled={pagina === 1}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border ${t.border} ${t.textSecondary} hover:border-blue-500 hover:text-blue-400 transition disabled:opacity-40`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>first_page</span>
                  </button>
                  <button
                    onClick={() => cambiarPagina(pagina - 1)}
                    disabled={pagina === 1}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border ${t.border} ${t.textSecondary} hover:border-blue-500 hover:text-blue-400 transition disabled:opacity-40`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
                  </button>
                  {getBotones().map((n) => (
                    <button
                      key={n}
                      onClick={() => cambiarPagina(n)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold transition ${
                        n === pagina
                          ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                          : `border ${t.border} ${t.textSecondary} hover:border-blue-500 hover:text-blue-400`
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => cambiarPagina(pagina + 1)}
                    disabled={pagina === totalPaginas}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border ${t.border} ${t.textSecondary} hover:border-blue-500 hover:text-blue-400 transition disabled:opacity-40`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
                  </button>
                  <button
                    onClick={() => cambiarPagina(totalPaginas)}
                    disabled={pagina === totalPaginas}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border ${t.border} ${t.textSecondary} hover:border-blue-500 hover:text-blue-400 transition disabled:opacity-40`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>last_page</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {showModal && (
        <AddProductModal onClose={() => setShowModal(false)} onAdded={() => setShowModal(false)} />
      )}
      {showImportExport && (
        <ImportExportModal onClose={() => setShowImportExport(false)} />
      )}
    </div>
  );
}
