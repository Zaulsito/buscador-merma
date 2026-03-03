import { useState, useEffect } from "react";
import { db, auth } from "../firebase/config";
import { collection, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";

const CATEGORIAS_DEFAULT = ["Carnes", "Abarrotes", "Acompañamientos", "Bollería", "Cafetería"];

export default function AddProductModal({ onClose, onAdded }) {
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [unidadMedida, setUnidadMedida] = useState("");
  const [categorias, setCategorias] = useState(CATEGORIAS_DEFAULT);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [agregandoCategoria, setAgregandoCategoria] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categorias"), (snap) => {
      const extras = snap.docs.map((d) => d.data().nombre);
      const todas = [...new Set([...CATEGORIAS_DEFAULT, ...extras])].filter(c => c !== "Otros");
      todas.push("Otros");
      setCategorias(todas);
    });
    return () => unsub();
  }, []);

  const handleAgregarCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    await addDoc(collection(db, "categorias"), { nombre: nuevaCategoria.trim() });
    setCategoria(nuevaCategoria.trim());
    setNuevaCategoria("");
    setAgregandoCategoria(false);
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-white text-xl font-bold mb-6">Agregar producto</h2>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <input
          type="text"
          placeholder="Código *"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Nombre *"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="mb-3">
          <select
            value={categoria}
            onChange={(e) => {
              if (e.target.value === "__nueva__") {
                setAgregandoCategoria(true);
              } else {
                setCategoria(e.target.value);
              }
            }}
            className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar categoría</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="__nueva__">+ Agregar nueva categoría</option>
          </select>

          {agregandoCategoria && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="Nueva categoría"
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                onClick={handleAgregarCategoria}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded-lg transition"
              >
                Agregar
              </button>
              <button
                onClick={() => setAgregandoCategoria(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-2 rounded-lg transition"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <input
          type="text"
          placeholder="Unidad de medida (opcional)"
          value={unidadMedida}
          onChange={(e) => setUnidadMedida(e.target.value)}
          className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg mb-6 outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
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