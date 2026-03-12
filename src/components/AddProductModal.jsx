import { useState, useEffect } from "react";
import { db, auth } from "../firebase/config";
import { collection, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";

export default function AddProductModal({ onClose, onAdded }) {
  const { t } = useTheme();
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [unidadMedida, setUnidadMedida] = useState("");
  const [categoriasDocs, setCategoriasDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categorias"), (snap) => {
      const docs = snap.docs
        .map((d) => ({ id: d.id, nombre: d.data().nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      setCategoriasDocs(docs);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async () => {
    if (!codigo || !nombre) { setError("Código y nombre son obligatorios"); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, "merma"), {
        codigo,
        nombre,
        categoria,
        unidadMedida,
        creadoPor: auth.currentUser?.uid,
        fechaCreacion: serverTimestamp(),
      });
      onAdded();
      onClose();
    } catch (err) {
      setError("Error al guardar el producto");
    }
    setLoading(false);
  };

  const inputClass = `w-full ${t.bgInput} ${t.text} px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className={`${t.bgCard} rounded-2xl p-6 w-full max-w-md shadow-xl`}>
        <h2 className={`${t.text} text-xl font-bold mb-6`}>Agregar producto</h2>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <input
          type="text"
          placeholder="Código *"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          className={`${inputClass} mb-3`}
          autoFocus
        />
        <input
          type="text"
          placeholder="Nombre *"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={`${inputClass} mb-3`}
        />

        {/* Select categoría — solo desde Firestore */}
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className={`${inputClass} mb-3`}
        >
          <option value="">Sin categoría</option>
          {categoriasDocs.map((c) => (
            <option key={c.id} value={c.nombre}>{c.nombre}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Unidad de medida (opcional)"
          value={unidadMedida}
          onChange={(e) => setUnidadMedida(e.target.value)}
          className={`${inputClass} mb-6`}
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={`flex-1 ${t.bgInput} ${t.hover} ${t.text} font-semibold py-3 rounded-lg transition`}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
