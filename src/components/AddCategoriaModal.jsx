import { useState } from "react";
import { db } from "../firebase/config";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";

const COLORES = [
  { id: "red",     label: "Rojo",    preview: "bg-red-400",     bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/20" },
  { id: "orange",  label: "Naranja", preview: "bg-orange-400",  bg: "bg-orange-500/15",  text: "text-orange-400",  border: "border-orange-500/20" },
  { id: "amber",   label: "Ámbar",   preview: "bg-amber-400",   bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-500/20" },
  { id: "emerald", label: "Verde",   preview: "bg-emerald-400", bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20" },
  { id: "cyan",    label: "Cyan",    preview: "bg-cyan-400",    bg: "bg-cyan-500/15",    text: "text-cyan-400",    border: "border-cyan-500/20" },
  { id: "blue",    label: "Azul",    preview: "bg-blue-400",    bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/20" },
  { id: "purple",  label: "Morado",  preview: "bg-purple-400",  bg: "bg-purple-500/15",  text: "text-purple-400",  border: "border-purple-500/20" },
  { id: "pink",    label: "Rosa",    preview: "bg-pink-400",    bg: "bg-pink-500/15",    text: "text-pink-400",    border: "border-pink-500/20" },
  { id: "slate",   label: "Gris",    preview: "bg-slate-400",   bg: "bg-slate-500/15",   text: "text-slate-400",   border: "border-slate-500/20" },
];

export default function AddCategoriaModal({ onClose, categoriasDocs = [] }) {
  const { t } = useTheme();
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState("blue");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const colorActual = COLORES.find(c => c.id === color) || COLORES[5];

  const handleSubmit = async () => {
    if (!nombre.trim()) { setError("El nombre es obligatorio"); return; }
    const existe = categoriasDocs.some(c => c.nombre.toLowerCase() === nombre.toLowerCase());
    if (existe) { setError("Esa categoría ya existe"); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, "categorias"), { nombre: nombre.trim(), color });
      onClose();
    } catch (err) {
      setError("Error al guardar la categoría");
    }
    setLoading(false);
  };

  const inputClass = `w-full ${t.bgInput} ${t.text} px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className={`${t.bgCard} rounded-2xl p-6 w-full max-w-md shadow-xl`}>
        <h2 className={`${t.text} text-xl font-bold mb-6`}>Nueva categoría</h2>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {/* Nombre */}
        <input
          type="text"
          placeholder="Nombre de la categoría *"
          value={nombre}
          onChange={(e) => { setNombre(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className={`${inputClass} mb-5`}
          autoFocus
        />

        {/* Selector de color */}
        <p className={`${t.textSecondary} text-sm font-semibold mb-3`}>Color del badge</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {COLORES.map((c) => (
            <button
              key={c.id}
              onClick={() => setColor(c.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                color === c.id
                  ? `${c.bg} ${c.text} ${c.border} ring-2 ring-offset-1 ring-current`
                  : `${t.bgInput} ${t.textSecondary} border-transparent hover:${c.text}`
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${c.preview} shrink-0`} />
              {c.label}
            </button>
          ))}
        </div>

        {/* Preview */}
        {nombre.trim() && (
          <div className={`${t.bgInput} rounded-xl px-4 py-3 mb-5 flex items-center gap-3`}>
            <p className={`${t.textSecondary} text-xs`}>Vista previa:</p>
            <span className={`px-3 py-1 rounded-full ${colorActual.bg} ${colorActual.text} text-[10px] font-black uppercase tracking-widest border ${colorActual.border}`}>
              {nombre}
            </span>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={`flex-1 ${t.bgInput} ${t.hover} ${t.text} font-semibold py-3 rounded-lg transition`}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !nombre.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
