import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { doc, deleteDoc, updateDoc, collection, onSnapshot, addDoc } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";

const CATEGORIAS_DEFAULT = ["Carnes", "Abarrotes", "Acompañamientos", "Bollería", "Cafetería"];

export default function ProductCard({ product, rol }) {
  const { t } = useTheme();
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(product.nombre);
  const [categoria, setCategoria] = useState(product.categoria || "");
  const [unidadMedida, setUnidadMedida] = useState(product.unidadMedida || product.sap || "");
  const [categorias, setCategorias] = useState(CATEGORIAS_DEFAULT);
  const [categoriasDocs, setCategoriasDocs] = useState([]);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [agregandoCategoria, setAgregandoCategoria] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categorias"), (snap) => {
      const extras = snap.docs.map((d) => ({ id: d.id, nombre: d.data().nombre }));
      const extrasNombres = extras.map((e) => e.nombre);
      const todas = [...new Set([...CATEGORIAS_DEFAULT, ...extrasNombres])]
        .filter(c => c.toLowerCase() !== "otros");
      todas.push("Otros");
      setCategorias(todas);
      setCategoriasDocs(extras);
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
  };

  const handleEliminarCategoria = async (id) => {
    await deleteDoc(doc(db, "categorias", id));
  };

  const handleSave = async () => {
    setSaving(true);
    await updateDoc(doc(db, "merma", product.id), { nombre, categoria, unidadMedida });
    setSaving(false);
    setEditing(false);
  };

  const esPrivilegiado = rol === "admin" || rol === "unico";
  const inputClass = `w-full ${t.bgInput} ${t.text} px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm`;

  if (editing) {
    return (
      <div className={`${t.bgCard} rounded-xl p-4 shadow`}>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={`${inputClass} mb-2`}
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
                setAgregandoCategoria(false);
              }
            }}
            className={inputClass}
          >
            <option value="">Seleccionar categoría</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="__nueva__">+ Agregar / Eliminar categorías</option>
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
                <button onClick={handleAgregarCategoria} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded-lg transition">
                  Agregar
                </button>
                <button onClick={() => setAgregandoCategoria(false)} className={`${t.bgInput} ${t.hover} ${t.text} text-sm px-3 py-2 rounded-lg transition`}>
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
          value={unidadMedida}
          onChange={(e) => setUnidadMedida(e.target.value)}
          className={`${inputClass} mb-3`}
          placeholder="Unidad de medida (opcional)"
        />

        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className={`flex-1 ${t.bgInput} ${t.hover} ${t.text} text-sm py-2 rounded-lg transition`}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${t.bgCard} rounded-xl p-4 shadow ${t.hoverCard} transition`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <span className="text-xs text-blue-400 font-semibold uppercase tracking-wide">
            {product.categoria || "Otros"}
          </span>
          <h3 className={`${t.text} font-semibold text-lg mt-1`}>{product.nombre}</h3>
        </div>
        <span className={`${t.badge} text-xs font-mono px-3 py-1 rounded-lg whitespace-nowrap`}>
          #{product.codigo}
        </span>
      </div>
      {(product.unidadMedida || product.sap) && (
        <p className={`${t.textSecondary} text-sm mt-2`}>Unidad: {product.unidadMedida || product.sap}</p>
      )}
      {esPrivilegiado && (
        <div className="flex gap-2 mt-3">
          <button onClick={() => setEditing(true)} className={`flex-1 ${t.bgInput} ${t.hover} ${t.text} text-xs py-2 rounded-lg transition`}>
            ✏️ Editar
          </button>
          <button onClick={handleDelete} className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs py-2 rounded-lg transition">
            🗑️ Eliminar
          </button>
        </div>
      )}
    </div>
  );
}