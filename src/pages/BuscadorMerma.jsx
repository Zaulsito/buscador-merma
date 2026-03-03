import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchBar";
import ProductCard from "../components/ProductCard";
import AddProductModal from "../components/AddProductModal";
import ImportExportModal from "../components/ImportExportModal";

const POR_PAGINA = 50;

export default function BuscadorMerma({ user, rol, onBack }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);

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

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar user={user} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-2 transition"
        >
          ← Volver al inicio
        </button>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-2xl font-bold">🔍 Buscador de Merma</h2>
          {rol === "admin" && (
            <button
              onClick={() => setShowImportExport(true)}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              📂 Importar / Exportar
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          <SearchBar value={search} onChange={setSearch} />
          {rol === "admin" && (
            <button
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition whitespace-nowrap"
            >
              + Agregar producto
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-gray-400 text-center">Cargando productos...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-center">
            {search ? "No se encontraron productos" : "Aún no hay productos agregados"}
          </p>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-4">
              {filtered.length} productos encontrados · Página {pagina} de {totalPaginas}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {paginados.map((p) => (
                <ProductCard key={p.id} product={p} rol={rol} />
              ))}
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <span className="text-gray-400 text-sm">{pagina} / {totalPaginas}</span>
                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-40"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <AddProductModal
          onClose={() => setShowModal(false)}
          onAdded={() => setShowModal(false)}
        />
      )}

      {showImportExport && (
        <ImportExportModal onClose={() => setShowImportExport(false)} />
      )}
    </div>
  );
}