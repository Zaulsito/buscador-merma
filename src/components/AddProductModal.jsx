import { useState, useEffect } from "react";
import { db, auth } from "../firebase/config";
import { collection, addDoc, serverTimestamp, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";

const CATEGORIAS_DEFAULT = ["Carnes", "Abarrotes", "Acompañamientos", "Bollería", "Cafetería"];

export default function AddProductModal({ onClose, onAdded }) {
  const { t } = useTheme();
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [unidadMedida, setUnidadMedida] = useState("");
  const [categorias, setCategorias] = useState(CATEGORIAS_DEFAULT);
  const [categoriasDocs, setCategoriasDocs] = useState([]);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [agregandoCategoria, setAgregandoCategoria] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categorias"), (snap) => {
      const extras = snap.docs.map((d) => ({ id: d.id, nombre: d.data().nombre }));
      const extrasNombres = extras.map((e) => e.nombre);
      const todas = [...new Set([...CATEGORIAS_DEFAULT, ...extrasNombres])].filter(c => c !== "Otros");
      todas.push("Otros");
      setCategorias(todas);
      setCategoriasDocs(extras);
    });
    return () => unsub();
  }, []);

  const handleAgregarCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    await addDoc(collection(db, "categorias"), { nombre: nuevaCategoria.trim() });
    setCategoria(nuevaCategoria.trim());
    setNuevaCategoria("");
  };

  const handleEliminarCategoria = async (id) => {
    await deleteDoc(doc(db, "categorias", id));
  };

  const handleSubmit = async () => {
    if (!codigo || !nombre) {
      setError("Código y nombre son obligatorios");
      return;
    }
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
        />
        <input
          type="text"
          placeholder="Nombre *"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={`${inputClass} mb-3`}
        />

        <div className="mb-3">
          <select
            value={categoria}
            onChange={(e) => {
              if (e.target.value === "__nueva__") {
                setAgregandoCategoria(true);
              } else {
                setCategoria(e.target.value);
                setAgregandoCategoria(false);
              }
            }}
            className={inputClass}
          >
            <option value="">Seleccionar categoría</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="__nueva__">+ Agregar nueva categoría</option>
          </select>

          {agregandoCategoria && (
            <div className="mt-2">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Nueva categoría"
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  className={`flex-1 ${t.bgInput} ${t.text} px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                />
                <button
                  onClick={handleAgregarCategoria}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded-lg transition"
                >
                  Agregar
                </button>
                <button
                  onClick={() => setAgregandoCategoria(false)}
                  className={`${t.bgInput} ${t.hover} ${t.text} text-sm px-3 py-2 rounded-lg transition`}
                >
                  ✕
                </button>
              </div>
              {categoriasDocs.length > 0 && (
                <div className={`${t.bgInput} rounded-lg p-2`}>
                  <p className={`${t.textSecondary} text-xs mb-2`}>Categorías personalizadas:</p>
                  {categoriasDocs.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-1">
                      <span className={`${t.text} text-sm`}>{c.nombre}</span>
                      <button
                        onClick={() => handleEliminarCategoria(c.id)}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded transition"
                      >
                        ✕ Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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