import { useState } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTheme } from "../context/ThemeContext";
import { useIngredientes, useMermaMap } from "../hooks/useIngredientes";


export default function TablaIngredientes({ titulo, lista, campo, onUpdate, onAgregar, onAgregarVarios, onEliminar, onReorder, placeholder = "Ingrediente", conUnidad = false }) {
  const { t } = useTheme();
  const ingredientes = useIngredientes();
  const [sugerencias, setSugerencias] = useState({});
  const [mostrarSap, setMostrarSap] = useState(false);
  const mermaMap = useMermaMap();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDndEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = lista.findIndex((_, i) => `${campo}-${i}` === active.id);
    const newIdx = lista.findIndex((_, i) => `${campo}-${i}` === over.id);
    if (oldIdx !== -1 && newIdx !== -1 && onReorder) {
      onReorder(campo, arrayMove(lista, oldIdx, newIdx));
    }
  };

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

  const formatearEntero = (valor) => {
    const soloNumeros = valor.replace(/\D/g, "");
    return soloNumeros || "0";
  };

  const esEncabezado = (item) => item._tipo === "separador" || !item.unidad || item.unidad === "";

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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDndEnd}>
        <SortableContext items={lista.map((_, i) => `${campo}-${i}`)} strategy={verticalListSortingStrategy}>
          {lista.map((item, i) => (
            <SortableFila key={`${campo}-${i}`} id={`${campo}-${i}`} esEncabezado={esEncabezado(item)}>
              {esEncabezado(item) ? (
                <div className={`grid ${cols} gap-2 mb-2 items-center`}>
                  <div className="col-span-full flex items-center justify-between px-3 py-2 rounded-lg bg-teal-600/20 border border-teal-500/40 gap-2">
                    <input
                      value={item.nombre}
                      onChange={(e) => handleNombreChange(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const siguiente = document.querySelectorAll(`[data-campo="${campo}"]`)[i + 1];
                          if (siguiente) siguiente.focus();
                        }
                      }}
                      data-campo={campo}
                      className="bg-transparent outline-none text-teal-300 text-sm font-bold flex-1"
                      placeholder="Nombre del paso..."
                    />
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={item.unidad || ""}
                        onChange={(e) => onUpdate(campo, i, "unidad", e.target.value)}
                        className={`${t.bgInput} ${t.text} px-2 py-1 rounded-lg outline-none text-xs`}
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
                  </div>
                </div>
              ) : (
                <div className={`grid ${cols} gap-2 mb-2 items-start`}>
                  {/* Nombre */}
                  <div className="relative">
                    <input
                      value={item.nombre}
                      onChange={(e) => handleNombreChange(i, e.target.value)}
                      onBlur={() => setTimeout(() => setSugerencias((s) => ({ ...s, [i]: [] })), 150)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const siguiente = document.querySelectorAll(`[data-campo="${campo}"]`)[i + 1];
                          if (siguiente) siguiente.focus();
                        }
                      }}
                      data-campo={campo}
                      className={inputClass}
                      placeholder={placeholder}
                    />
                    {sugerencias[i]?.length > 0 && (
                      <div className={`absolute z-10 w-full mt-1 ${t.bgCard} border ${t.border} rounded-lg shadow-lg overflow-hidden`}>
                        {sugerencias[i].map((sug, j) => (
                          <button key={j} onMouseDown={() => seleccionarSugerencia(i, sug)} className={`w-full text-left px-3 py-2 text-sm ${t.text} ${t.hover} transition`}>
                            {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* COD. SAP */}
                  {mostrarSap && (
                    <input value={item.codSap || ""} onChange={(e) => onUpdate(campo, i, "codSap", e.target.value)} className={inputClass} placeholder="SAP" />
                  )}

                  {/* Cant. Bruta */}
                  {(item.unidad === "UN/KG" || item.unidad === "L/KG") ? (
                    <input value={item.cantidadBruta} onChange={(e) => { const partes = e.target.value.split("/"); const p1 = formatearEntero(partes[0] || ""); const p2 = partes[1] !== undefined ? formatearCantidad(partes[1]) : "0.000"; onUpdate(campo, i, "cantidadBruta", p1 + "/" + p2); onUpdate(campo, i, "cantidadNeta", p1 + "/" + p2); }} onFocus={(e) => setTimeout(() => e.target.select(), 0)} data-bruta={campo} className={inputClass} placeholder="0/0.000" />
                  ) : item.unidad === "UN" ? (
                    <input value={item.cantidadBruta} onChange={(e) => { const nuevo = formatearEntero(e.target.value); onUpdate(campo, i, "cantidadBruta", nuevo); onUpdate(campo, i, "cantidadNeta", nuevo); }} onFocus={(e) => setTimeout(() => e.target.select(), 0)} data-bruta={campo} className={inputClass} placeholder="0" />
                  ) : (
                    <input value={item.cantidadBruta} onChange={(e) => { const nuevo = formatearCantidad(e.target.value); onUpdate(campo, i, "cantidadBruta", nuevo); onUpdate(campo, i, "cantidadNeta", nuevo); }} onFocus={(e) => setTimeout(() => e.target.select(), 0)} data-bruta={campo} className={inputClass} placeholder="0.000" />
                  )}

                  {/* Cant. Neta */}
                  {(item.unidad === "UN/KG" || item.unidad === "L/KG") ? (
                    <input value={item.cantidadNeta} onChange={(e) => { const partes = e.target.value.split("/"); const p1 = formatearEntero(partes[0] || ""); const p2 = partes[1] !== undefined ? formatearCantidad(partes[1]) : "0.000"; onUpdate(campo, i, "cantidadNeta", p1 + "/" + p2); }} onFocus={(e) => setTimeout(() => e.target.select(), 0)} data-neta={campo} className={inputClass} placeholder="0/0.000" />
                  ) : item.unidad === "UN" ? (
                    <input value={item.cantidadNeta} onChange={(e) => onUpdate(campo, i, "cantidadNeta", formatearEntero(e.target.value))} onFocus={(e) => setTimeout(() => e.target.select(), 0)} data-neta={campo} className={inputClass} placeholder="0" />
                  ) : (
                    <input value={item.cantidadNeta} onChange={(e) => onUpdate(campo, i, "cantidadNeta", formatearCantidad(e.target.value))} onFocus={(e) => setTimeout(() => e.target.select(), 0)} data-neta={campo} className={inputClass} placeholder="0.000" />
                  )}

                  {/* Unidad + eliminar */}
                  {conUnidad && (
                    <div className="flex gap-1 items-center">
                      <select value={item.unidad || ""} onChange={(e) => onUpdate(campo, i, "unidad", e.target.value)} className={`${t.bgInput} ${t.text} px-2 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-xs w-full`}>
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
              )}
            </SortableFila>
          ))}
        </SortableContext>
      </DndContext>

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
            onAgregarVarios(campo, cantidad, { nombre: "", unidad: "KG", cantidadBruta: "0.000", cantidadNeta: "0.000", codSap: "" });
          }}
          className="text-teal-400 text-sm hover:underline"
        >
          a la vez
        </button>
        <span className={`${t.textSecondary} text-xs mx-1`}>|</span>
        <button
          onClick={() => onAgregar(campo, { nombre: "", unidad: "", _tipo: "separador" })}
          className="text-teal-400 text-sm hover:underline flex items-center gap-1"
          title="Agregar separador de sección"
        >
          <span style={{ fontSize: 14 }}>—</span> Sección
        </button>
      </div>
    </div>
  );
}

function SortableFila({ id, children, esEncabezado }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative group/fila">
      <button
        {...attributes} {...listeners}
        className="absolute -left-5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover/fila:opacity-100 transition-opacity z-10"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>drag_indicator</span>
      </button>
      {children}
    </div>
  );
}