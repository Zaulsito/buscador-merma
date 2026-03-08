import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useIngredientes } from "../hooks/useIngredientes";

export default function TablaIngredientes({ titulo, lista, campo, onUpdate, onAgregar, onEliminar, placeholder = "Ingrediente", conUnidad = false }) {
  const { t } = useTheme();
  const ingredientes = useIngredientes();
  const [sugerencias, setSugerencias] = useState({});

  const inputClass = `w-full ${t.bgInput} ${t.text} px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm`;

  const handleNombreChange = (i, valor) => {
    onUpdate(campo, i, "nombre", valor);
    if (valor.trim().length >= 2) {
      const filtradas = ingredientes.filter((ing) =>
        ing.toLowerCase().includes(valor.toLowerCase()) && ing.toLowerCase() !== valor.toLowerCase()
      );
      setSugerencias((s) => ({ ...s, [i]: filtradas.slice(0, 5) }));
    } else {
      setSugerencias((s) => ({ ...s, [i]: [] }));
    }
  };

  const seleccionarSugerencia = (i, valor) => {
    onUpdate(campo, i, "nombre", valor);
    setSugerencias((s) => ({ ...s, [i]: [] }));
  };

  return (
    <div className="mb-6">
      <h3 className={`${t.text} font-semibold mb-3`}>{titulo}</h3>
      <div className={`grid ${conUnidad ? "grid-cols-4" : "grid-cols-3"} gap-2 mb-2`}>
        <span className={`${t.textSecondary} text-xs`}>{placeholder}</span>
        <span className={`${t.textSecondary} text-xs`}>Cant. Bruta</span>
        <span className={`${t.textSecondary} text-xs`}>Cant. Neta</span>
        {conUnidad && <span className={`${t.textSecondary} text-xs`}>Unidad</span>}
      </div>
      {lista.map((item, i) => (
        <div key={i} className={`grid ${conUnidad ? "grid-cols-4" : "grid-cols-3"} gap-2 mb-2 items-start`}>
          <div className="relative">
            <input
              value={item.nombre}
              onChange={(e) => handleNombreChange(i, e.target.value)}
              onBlur={() => setTimeout(() => setSugerencias((s) => ({ ...s, [i]: [] })), 150)}
              className={inputClass}
              placeholder={placeholder}
            />
            {sugerencias[i]?.length > 0 && (
              <div className={`absolute z-10 w-full mt-1 ${t.bgCard} border ${t.border} rounded-lg shadow-lg overflow-hidden`}>
                {sugerencias[i].map((sug, j) => (
                  <button
                    key={j}
                    onMouseDown={() => seleccionarSugerencia(i, sug)}
                    className={`w-full text-left px-3 py-2 text-sm ${t.text} ${t.hover} transition`}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            value={item.cantidadBruta}
            onChange={(e) => onUpdate(campo, i, "cantidadBruta", e.target.value)}
            className={inputClass}
            placeholder="0.000"
          />
          <input
            value={item.cantidadNeta}
            onChange={(e) => onUpdate(campo, i, "cantidadNeta", e.target.value)}
            className={inputClass}
            placeholder="0.000"
          />
          {conUnidad && (
            <div className="flex gap-1 items-center">
              <select
                value={item.unidad || ""}
                onChange={(e) => onUpdate(campo, i, "unidad", e.target.value)}
                className={`${t.bgInput} ${t.text} px-2 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-xs w-full`}
              >
                <option value="">—</option>
                <option value="UN">UN</option>
                <option value="KG">KG</option>
                <option value="UN/KG">UN/KG</option>
              </select>
              <button onClick={() => onEliminar(campo, i)} className="text-red-400 text-xs px-2">✕</button>
            </div>
          )}
          {!conUnidad && (
            <div className="flex gap-1 items-center">
              <div className="flex-1" />
              <button onClick={() => onEliminar(campo, i)} className="text-red-400 text-xs px-2">✕</button>
            </div>
          )}
        </div>
      ))}
      <button onClick={() => onAgregar(campo, { nombre: "", unidad: "", cantidadBruta: "", cantidadNeta: "" })} className="text-teal-400 text-sm hover:underline">
        + Agregar {placeholder.toLowerCase()}
      </button>
    </div>
  );
}