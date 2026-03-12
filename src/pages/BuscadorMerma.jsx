import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import ProductCard from "../components/ProductCard";
import AddProductModal from "../components/AddProductModal";
import AddCategoriaModal from "../components/AddCategoriaModal";
import ImportExportModal from "../components/ImportExportModal";
import { useTheme } from "../context/ThemeContext";

const POR_PAGINA = 50;
const MAX_BOTONES = 5;

export default function BuscadorMerma({ user, rol, onBack }) {
  const [products, setProducts] = useState([]);
  const [categoriasDocs, setCategoriasDocs] = useState([]);
  const [search, setSearch] = useState("");
  const [catActiva, setCatActiva] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showNuevaCat, setShowNuevaCat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const { t } = useTheme();

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
    const matchCat = catActiva === "" || p.categoria === catActiva;
    return matchSearch && matchCat;
  });

  const totalPaginas = Math.ceil(filtered.length / POR_PAGINA);
  const paginados = filtered.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const cambiarPagina = (nueva) => {
    setPagina(nueva);
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
    <div className={`min-h-screen ${t.bg} flex flex-col`}>

      {/* ── HEADER ── */}
      <header className={`p-6 md:p-8 pb-4 flex flex-col gap-5 border-b ${t.border}`}>

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
            <button onClick={onBack} className={`hidden sm:flex items-center gap-1.5 px-3 py-2.5 ${t.bgInput} ${t.hover} ${t.textSecondary} font-semibold rounded-lg transition text-sm`}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
              Volver
            </button>
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

        {/* Chips de categoría */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 no-scrollbar items-center">

          {/* Todas */}
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

          {/* Chips dinámicos */}
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

          {/* Botón "+" nueva categoría */}
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

      {showModal && <AddProductModal onClose={() => setShowModal(false)} onAdded={() => setShowModal(false)} />}
      {showImportExport && <ImportExportModal onClose={() => setShowImportExport(false)} />}
      {showNuevaCat && (
        <AddCategoriaModal
          onClose={() => setShowNuevaCat(false)}
          categoriasDocs={categoriasDocs}
        />
      )}
    </div>
  );
}
