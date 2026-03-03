import { useState } from "react";
import { db, auth } from "../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function AddProductModal({ onClose, onAdded }) {
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [sap, setSap] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        sap,
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
        <input
          type="text"
          placeholder="Categoría"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="SAP (opcional)"
          value={sap}
          onChange={(e) => setSap(e.target.value)}
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