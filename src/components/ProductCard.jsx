import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { doc, deleteDoc, updateDoc, collection, onSnapshot, addDoc } from "firebase/firestore";

const CATEGORIAS_DEFAULT = ["Carnes", "Abarrotes", "Acompañamientos", "Bollería", "Cafetería"];

export default function ProductCard({ product, rol }) {
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(product.nombre);
  const [categoria, setCategoria] = useState(product.categoria || "");
  const [unidadMedida, setUnidadMedida] = useState(product.unidadMedida || product.sap || "");
  const [categorias, setCategorias] = useState(CATEGORIAS_DEFAULT);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [agregandoCategoria, setAgregandoCategoria] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categorias"), (snap) => {
      const extras = snap.docs.map((d) => d.data().nombre);
      const todas = [...new Set([...CATEGORIAS_DEFAULT, ...extras])].filter(c => c !== "Otros");
      todas.push("Otros");
      setCategorias(todas);
    });
    return () => unsub();
  }, []);

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este producto?")) return;
    await deleteDoc(doc(db, "merma", product.id));
  };

  const handleAgregarCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    await addDoc(collection(db, "categorias"), { nombre: nuevaCategoria.trim() });
    setCategoria(nuevaCategoria.trim());
    setNuevaCategoria("");
    setAgregandoCategoria(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateDoc(doc(db, "merma", product.id), { nombre, categoria, unidadMedida });
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-gray-800 rounded-xl p-4 shadow">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg mb-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          placeholder="Nombre"
        />

        <div className="mb-2">
          <select
            value={categoria}
            onChange={(e) => {
              if (e.target.value === "__nueva__") {
                setAgregandoCategoria(true);
              } else {
                setCategoria(e.target.value);
              }
            }}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
              <button onClick={handleAgregarCategoria} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded-lg transition">
                Agregar
              </button>
              <button onClick={() => setAgregandoCategoria(false)} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-2 rounded-lg transition">
                ✕
              </button>
            </div>
          )}
        </div>

        <input
          value={unidadMedida}
          onChange={(e) => setUnidadMedida(e.target.value)}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          placeholder="Unidad de medida (opcional)"
        />

        <div className="flex gap-2">
          <button
            onClick={() => setEditing(false)}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 shadow hover:shadow-blue-500/20 hover:shadow-lg transition">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <span className="text-xs text-blue-400 font-semibold uppercase tracking-wide">
            {product.categoria || "Sin categoría"}
          </span>
          <h3 className="text-white font-semibold text-lg mt-1">{product.nombre}</h3>
        </div>
        <span className="bg-gray-700 text-gray-300 text-xs font-mono px-3 py-1 rounded-lg whitespace-nowrap">
          #{product.codigo}
        </span>
      </div>
      {(product.unidadMedida || product.sap) && (
        <p className="text-gray-400 text-sm mt-2">Unidad: {product.unidadMedida || product.sap}</p>
      )}
      {rol === "admin" && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setEditing(true)}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 rounded-lg transition"
          >
            ✏️ Editar
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs py-2 rounded-lg transition"
          >
            🗑️ Eliminar
          </button>
        </div>
      )}
    </div>
  );
}