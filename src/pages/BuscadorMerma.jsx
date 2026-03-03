import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchBar";
import ProductCard from "../components/ProductCard";
import AddProductModal from "../components/AddProductModal";
import ImportExportModal from "../components/ImportExportModal";

export default function BuscadorMerma({ user, rol, onBack }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "merma"), orderBy("fechaCreacion", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = products.filter((p) => {
    const term = search.toLowerCase();
    return (
      p.codigo?.toLowerCase().includes(term) ||
      p.nombre?.toLowerCase().includes(term) ||
      p.categoria?.toLowerCase().includes(term)
    );
  });

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} rol={rol} />
            ))}
          </div>
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