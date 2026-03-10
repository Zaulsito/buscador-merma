import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useIngredientes, useMermaMap } from "../hooks/useIngredientes";


export default function TablaIngredientes({ titulo, lista, campo, onUpdate, onAgregar, onEliminar, placeholder = "Ingrediente", conUnidad = false }) {
  const { t } = useTheme();
  const ingredientes = useIngredientes();
  const [sugerencias, setSugerencias] = useState({});
  const [mostrarSap, setMostrarSap] = useState(false);
  const mermaMap = useMermaMap();

  const inputClass = `w-full ${t.bgInput} ${t.text} px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm`;

  const handleNombreChange = (i, valor) => {
    onUpdate(campo, i, "nombre", valor);
    // Autocompletar COD. SAP desde merma
    const sapEncontrado = mermaMap[valor.toLowerCase().trim()];
    if (sapEncontrado) {
      onUpdate(campo, i, "codSap", sapEncontrado);
    }
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
    const sapEncontrado = mermaMap[valor.toLowerCase().trim()];
    if (sapEncontrado) {
      onUpdate(campo, i, "codSap", sapEncontrado);
    }
  };
  console.log("mermaMap:", mermaMap);

  const formatearCantidad = (valor) => {
    const soloNumeros = valor.replace(/\D/g, "").slice(0, 6);
    if (!soloNumeros) return "0.000";
    const padded = soloNumeros.padStart(4, "0");
    const resultado = padded.slice(0, -3) + "." + padded.slice(-3);
    return parseFloat(resultado).toFixed(3).toString();
  };

  const cols = conUnidad
    ? mostrarSap ? "grid-cols-5" : "grid-cols-4"
    : mostrarSap ? "grid-cols-4" : "grid-cols-3";

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className={`${t.text} font-semibold`}>{titulo}</h3>
        <button
          onClick={() => setMostrarSap(s => !s)}
          className={`text-xs px-3 py-1 rounded-lg transition ${mostrarSap ? "bg-teal-600 text-white" : `${t.bgInput} ${t.textSecondary}`}`}
        >
          {mostrarSap ? "✓ COD. SAP" : "+ COD. SAP"}
        </button>
      </div>

      {/* Headers */}
      <div className={`grid ${cols} gap-2 mb-2`}>
        <span className={`${t.textSecondary} text-xs`}>{placeholder}</span>
        {mostrarSap && <span className={`${t.textSecondary} text-xs`}>COD. SAP</span>}
        <span className={`${t.textSecondary} text-xs`}>Cant. Bruta</span>
        <span className={`${t.textSecondary} text-xs`}>Cant. Neta</span>
        {conUnidad && <span className={`${t.textSecondary} text-xs`}>Unidad</span>}
      </div>

      {lista.map((item, i) => (
        <div key={i} className={`grid ${cols} gap-2 mb-2 items-start`}>
          {/* Nombre */}
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

          {/* COD. SAP */}
          {mostrarSap && (
            <input
              value={item.codSap || ""}
              onChange={(e) => onUpdate(campo, i, "codSap", e.target.value)}
              className={inputClass}
              placeholder="SAP"
            />
          )}

          {/* Cant. Bruta */}
          {(item.unidad === "UN/KG" || item.unidad === "L/KG") ? (
            <input
              value={item.cantidadBruta}
              onChange={(e) => {
                const partes = e.target.value.split("/");
                const p1 = formatearCantidad(partes[0] || "");
                const p2 = partes[1] !== undefined ? formatearCantidad(partes[1]) : "0.000";
                onUpdate(campo, i, "cantidadBruta", p1 + "/" + p2);
                onUpdate(campo, i, "cantidadNeta", p1 + "/" + p2);
              }}
              onFocus={(e) => setTimeout(() => e.target.select(), 0)}
              className={inputClass}
              placeholder="0.000/0.000"
            />
          ) : (
            <input
              value={item.cantidadBruta}
              onChange={(e) => {
                const nuevo = formatearCantidad(e.target.value);
                onUpdate(campo, i, "cantidadBruta", nuevo);
                onUpdate(campo, i, "cantidadNeta", nuevo);
              }}
              onFocus={(e) => setTimeout(() => e.target.select(), 0)}
              className={inputClass}
              placeholder="0.000"
            />
          )}

          {/* Cant. Neta */}
          {(item.unidad === "UN/KG" || item.unidad === "L/KG") ? (
            <input
              value={item.cantidadNeta}
              onChange={(e) => {
                const partes = e.target.value.split("/");
                const p1 = formatearCantidad(partes[0] || "");
                const p2 = partes[1] !== undefined ? formatearCantidad(partes[1]) : "0.000";
                onUpdate(campo, i, "cantidadNeta", p1 + "/" + p2);
              }}
              onFocus={(e) => setTimeout(() => e.target.select(), 0)}
              className={inputClass}
              placeholder="0.000/0.000"
            />
          ) : (
            <input
              value={item.cantidadNeta}
              onChange={(e) => onUpdate(campo, i, "cantidadNeta", formatearCantidad(e.target.value))}
              onFocus={(e) => setTimeout(() => e.target.select(), 0)}
              className={inputClass}
              placeholder="0.000"
            />
          )}

          {/* Unidad + eliminar */}
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
                <option value="L">L</option>
                <option value="UN/KG">UN/KG</option>
                <option value="L/KG">L/KG</option>
              </select>
              <button onClick={() => onEliminar(campo, i)} className="text-red-400 text-xs px-2">✕</button>
            </div>
          )}
          {!conUnidad && (
            <div className="flex gap-1 items-center justify-end">
              <button onClick={() => onEliminar(campo, i)} className="text-red-400 text-xs px-2">✕</button>
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={() => onAgregar(campo, { nombre: "", unidad: "KG", cantidadBruta: "0.000", cantidadNeta: "0.000", codSap: "" })}
          className="text-teal-400 text-sm hover:underline"
        >
          + Agregar {placeholder.toLowerCase()}
        </button>
        <span className={`${t.textSecondary} text-xs`}>o agregar</span>
        <input
          type="number"
          min="1"
          max="50"
          defaultValue="5"
          id={`bulk-${campo}`}
          className={`${t.bgInput} ${t.text} px-2 py-1 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-xs w-16 text-center`}
        />
        <button
          onClick={() => {
            const cantidad = parseInt(document.getElementById(`bulk-${campo}`)?.value || "5");
            for (let i = 0; i < cantidad; i++) {
              onAgregar(campo, { nombre: "", unidad: "KG", cantidadBruta: "0.000", cantidadNeta: "0.000", codSap: "" });
            }
          }}
          className="text-teal-400 text-sm hover:underline"
        >
          a la vez
        </button>
      </div>
    </div>
  );
}