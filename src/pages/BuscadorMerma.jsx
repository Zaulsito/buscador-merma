import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchBar";
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

  // Calcular botones de paginación (máx 5)
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
    <div className={`min-h-screen ${t.bg}`}>
      <Navbar user={user} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-teal-600/20 hover:bg-teal-600/40 text-teal-300 text-sm font-semibold px-4 py-2 rounded-full transition border border-teal-500/30 mb-6"
        >
          ← Volver
        </button>

        <div className="flex items-center justify-between mb-6">
          <h2 className={`${t.text} text-2xl font-bold`}>🔍 Buscador de Merma</h2>
          {(rol === "admin" || rol === "unico") && (
            <button
              onClick={() => setShowImportExport(true)}
              className={`${t.bgCard} ${t.hover} ${t.text} text-sm font-semibold px-4 py-2 rounded-lg transition`}
            >
              📂 Importar / Exportar
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          <SearchBar value={search} onChange={setSearch} />
          {(rol === "admin" || rol === "unico") && (
            <button
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition whitespace-nowrap"
            >
              + Agregar producto
            </button>
          )}
        </div>

        {loading ? (
          <p className={`${t.textSecondary} text-center`}>Cargando productos...</p>
        ) : filtered.length === 0 ? (
          <p className={`${t.textSecondary} text-center`}>
            {search ? "No se encontraron productos" : "Aún no hay productos agregados"}
          </p>
        ) : (
          <>
            <p className={`${t.textSecondary} text-sm mb-4`}>
              {filtered.length} productos encontrados · Página {pagina} de {totalPaginas}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {paginados.map((p) => (
                <ProductCard key={p.id} product={p} rol={rol} />
              ))}
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  onClick={() => cambiarPagina(1)}
                  disabled={pagina === 1}
                  className={`${t.bgCard} ${t.hover} ${t.text} px-3 py-2 rounded-lg transition disabled:opacity-40 text-sm`}
                >
                  «
                </button>
                <button
                  onClick={() => cambiarPagina(pagina - 1)}
                  disabled={pagina === 1}
                  className={`${t.bgCard} ${t.hover} ${t.text} px-3 py-2 rounded-lg transition disabled:opacity-40 text-sm`}
                >
                  ‹
                </button>

                {getBotones().map((n) => (
                  <button
                    key={n}
                    onClick={() => cambiarPagina(n)}
                    className={`px-4 py-2 rounded-lg transition text-sm font-semibold ${
                      n === pagina
                        ? "bg-blue-600 text-white"
                        : `${t.bgCard} ${t.hover} ${t.text}`
                    }`}
                  >
                    {n}
                  </button>
                ))}

                <button
                  onClick={() => cambiarPagina(pagina + 1)}
                  disabled={pagina === totalPaginas}
                  className={`${t.bgCard} ${t.hover} ${t.text} px-3 py-2 rounded-lg transition disabled:opacity-40 text-sm`}
                >
                  ›
                </button>
                <button
                  onClick={() => cambiarPagina(totalPaginas)}
                  disabled={pagina === totalPaginas}
                  className={`${t.bgCard} ${t.hover} ${t.text} px-3 py-2 rounded-lg transition disabled:opacity-40 text-sm`}
                >
                  »
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <AddProductModal onClose={() => setShowModal(false)} onAdded={() => setShowModal(false)} />
      )}
      {showImportExport && (
        <ImportExportModal onClose={() => setShowImportExport(false)} />
      )}
    </div>
  );
}