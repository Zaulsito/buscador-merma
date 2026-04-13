import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { doc, deleteDoc, updateDoc, collection, onSnapshot } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";

const COLOR_MAP = {
  red:     { bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/20" },
  orange:  { bg: "bg-orange-500/15",  text: "text-orange-400",  border: "border-orange-500/20" },
  amber:   { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-500/20" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20" },
  cyan:    { bg: "bg-cyan-500/15",    text: "text-cyan-400",    border: "border-cyan-500/20" },
  blue:    { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/20" },
  purple:  { bg: "bg-purple-500/15",  text: "text-purple-400",  border: "border-purple-500/20" },
  pink:    { bg: "bg-pink-500/15",    text: "text-pink-400",    border: "border-pink-500/20" },
  slate:   { bg: "bg-slate-500/15",   text: "text-slate-400",   border: "border-slate-500/20" },
};

export default function ProductCard({ product, rol }) {
  const { t } = useTheme();
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(product.nombre);
  const [categoria, setCategoria] = useState(product.categoria || "");
  const [unidadMedida, setUnidadMedida] = useState(product.unidadMedida || product.sap || "");
  const [categoriasDocs, setCategoriasDocs] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categorias"), (snap) => {
      const docs = snap.docs
        .map((d) => ({ id: d.id, nombre: d.data().nombre, color: d.data().color || "blue" }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      setCategoriasDocs(docs);
    });
    return () => unsub();
  }, []);

  const getCatStyle = () => {
    const found = categoriasDocs.find(c => c.nombre === product.categoria);
    return COLOR_MAP[found?.color] || COLOR_MAP.blue;
  };

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este producto?")) return;
    await deleteDoc(doc(db, "merma", product.id));
  };

  const handleSave = async () => {
    setSaving(true);
    await updateDoc(doc(db, "merma", product.id), { nombre, categoria, unidadMedida });
    setSaving(false);
    setEditing(false);
  };

  const esPrivilegiado = rol === "admin" || rol === "unico";
  const cat = getCatStyle();

  // ── MODO EDICIÓN ──
  if (editing) {
    return (
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-5 shadow-sm`}>
        <p className={`${t.textSecondary} text-xs font-bold uppercase tracking-widest mb-3`}>Editando</p>

        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={`w-full ${t.bgInput} ${t.text} px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm border ${t.border} placeholder:text-slate-500 mb-3`}
          placeholder="Nombre del producto"
        />

        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className={`w-full ${t.bgInput} ${t.text} px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm border ${t.border} mb-3`}
        >
          <option value="">Sin categoría</option>
          {categoriasDocs.map((c) => (
            <option key={c.id} value={c.nombre}>{c.nombre}</option>
          ))}
        </select>

        <select
          value={unidadMedida}
          onChange={(e) => setUnidadMedida(e.target.value)}
          className={`w-full ${t.bgInput} ${t.text} px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm border ${t.border} mb-4`}
        >
          <option value="">Sin unidad</option>
          <option value="UNIDADES">UNIDADES</option>
          <option value="KILOGRAMOS">KILOGRAMOS</option>
          <option value="PORCIONES">PORCIONES</option>
          <option value="LITROS">LITROS</option>
          <option value="GRAMOS">GRAMOS</option>
        </select>

        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className={`flex-1 ${t.bgInput} ${t.hover} ${t.textSecondary} text-sm py-2.5 rounded-lg transition font-semibold`}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:brightness-110 text-white text-sm py-2.5 rounded-lg transition font-bold disabled:opacity-50 shadow-lg shadow-blue-500/20">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    );
  }

  // ── MODO VISTA ──
  return (
    <div className={`${t.bgCard} border ${t.border} rounded-xl p-5 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all group`}>

      <div className="flex justify-between items-start mb-4">
        <span className={`px-3 py-1 rounded-full ${cat.bg} ${cat.text} text-[10px] font-black uppercase tracking-widest border ${cat.border}`}>
          {product.categoria || "Sin categoría"}
        </span>
        <span className={`${t.textSecondary} text-xs font-mono`}>
          ID: {product.codigo}
        </span>
      </div>

      <h3 className={`${t.text} font-bold text-base leading-snug mb-1 h-12 overflow-hidden group-hover:text-blue-400 transition-colors`}>
        {product.nombre}
      </h3>

      {(product.unidadMedida || product.sap) && (
        <p className={`${t.textSecondary} text-xs mb-2`}>
          Medida:  {product.unidadMedida || product.sap}
        </p>
      )}

      {esPrivilegiado && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setEditing(true)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg ${t.bgInput} ${t.textSecondary} text-xs font-bold hover:bg-gradient-to-r hover:from-blue-500 hover:to-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
            Editar
          </button>
          <button
            onClick={handleDelete}
            className={`flex items-center justify-center p-2 rounded-lg ${t.bgInput} ${t.textSecondary} hover:text-red-500 hover:bg-red-500/10 transition-all`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
