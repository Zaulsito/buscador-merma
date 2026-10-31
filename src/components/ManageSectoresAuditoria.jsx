import React, { useState, useMemo } from "react";
import { db } from "../firebase/config";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import toast from "react-hot-toast";

const TIPOS_SECTOR = [
  "Pasillo",
  "Pared",
  "Góndola",
  "Cabecera",
  "Mueble",
  "Cámara / Frío",
  "Isla"
];

export default function ManageSectoresAuditoria({ 
  sectores = [], 
  categorias = [], 
  seccionInicial = "Botillería",
  onClose, 
  onUpdate 
}) {
  const { t } = useTheme();

  // Sección activa
  const [seccionActiva, setSeccionActiva] = useState(() => {
    if (categorias.some(c => c.nombre === seccionInicial)) return seccionInicial;
    return categorias[0]?.nombre || "Botillería";
  });

  // Búsqueda rápida
  const [busqueda, setBusqueda] = useState("");

  // Crear nuevo sector
  const [mostrarNuevoSector, setMostrarNuevoSector] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState("Pasillo");
  const [nuevoItemsTexto, setNuevoItemsTexto] = useState("");

  // Edición de sector
  const [editandoSectorId, setEditandoSectorId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editTipo, setEditTipo] = useState("Pasillo");

  // Input rápido para agregar ítem dentro de una tarjeta
  const [nuevoItemPorSector, setNuevoItemPorSector] = useState({});

  // Filtrar sectores de la sección activa
  const sectoresDeSeccion = useMemo(() => {
    return sectores.filter(s => (s.seccion || "").toLowerCase() === seccionActiva.toLowerCase());
  }, [sectores, seccionActiva]);

  // Búsqueda global o local
  const term = busqueda.trim().toLowerCase();

  // Crear nuevo sector
  const handleCrearSector = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) {
      toast.error("Ingresa el nombre del sector o pasillo");
      return;
    }

    const items = nuevoItemsTexto
      ? nuevoItemsTexto.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean)
      : [];

    try {
      await addDoc(collection(db, "auditoria_sectores"), {
        seccion: seccionActiva,
        nombre: nuevoNombre.trim(),
        tipo: nuevoTipo || "Pasillo",
        items,
        orden: sectoresDeSeccion.length + 1,
        creadoEn: new Date()
      });
      toast.success("Sector creado con éxito");
      setNuevoNombre("");
      setNuevoTipo("Pasillo");
      setNuevoItemsTexto("");
      setMostrarNuevoSector(false);
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error("Error al crear sector");
    }
  };

  // Guardar edición de nombre/tipo
  const handleGuardarEdicion = async (sectorId) => {
    if (!editNombre.trim()) return;
    try {
      await updateDoc(doc(db, "auditoria_sectores", sectorId), {
        nombre: editNombre.trim(),
        tipo: editTipo
      });
      toast.success("Sector actualizado");
      setEditandoSectorId(null);
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar sector");
    }
  };

  // Eliminar sector
  const handleEliminarSector = async (sector) => {
    if (window.confirm(`¿Seguro que deseas eliminar "${sector.nombre}"?`)) {
      try {
        await deleteDoc(doc(db, "auditoria_sectores", sector.id));
        toast.success("Sector eliminado");
        onUpdate();
      } catch (error) {
        console.error(error);
        toast.error("Error al eliminar sector");
      }
    }
  };

  // Agregar ítem rápido a un sector
  const handleAgregarItem = async (sector) => {
    const texto = (nuevoItemPorSector[sector.id] || "").trim();
    if (!texto) return;

    const itemsActuales = Array.isArray(sector.items) ? [...sector.items] : [];
    if (itemsActuales.some(it => it.toLowerCase() === texto.toLowerCase())) {
      toast.error("Ese producto ya está en este sector");
      return;
    }

    const nuevosItems = [...itemsActuales, texto];
    try {
      await updateDoc(doc(db, "auditoria_sectores", sector.id), {
        items: nuevosItems
      });
      setNuevoItemPorSector(prev => ({ ...prev, [sector.id]: "" }));
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error("Error al agregar producto");
    }
  };

  // Eliminar un ítem individual de un sector
  const handleEliminarItem = async (sector, itemAEliminar) => {
    const itemsActuales = Array.isArray(sector.items) ? [...sector.items] : [];
    const nuevosItems = itemsActuales.filter(it => it !== itemAEliminar);
    try {
      await updateDoc(doc(db, "auditoria_sectores", sector.id), {
        items: nuevosItems
      });
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar producto");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[70] p-4 backdrop-blur-md animate-fadeIn">
      <div className={`${t.bgCard} rounded-3xl w-full max-w-5xl shadow-2xl border ${t.border} flex flex-col max-h-[92vh] overflow-hidden`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${t.border} flex items-center justify-between bg-slate-900/40`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 flex-shrink-0">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 24 }}>
                map
              </span>
            </div>
            <div>
              <h2 className={`${t.text} text-lg md:text-xl font-black flex items-center gap-2`}>
                Sectores y Distribución de Pasillos
              </h2>
              <p className={`${t.textSecondary} text-xs`}>
                Consulta qué categorías y familias de productos van en cada pasillo
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className={`w-9 h-9 flex items-center justify-center rounded-xl ${t.bgInput} ${t.textSecondary} hover:text-white transition-colors`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className={`p-4 border-b ${t.border} space-y-3 bg-slate-900/20`}>
          {/* Buscador inteligente */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>search</span>
            </span>
            <input
              type="text"
              placeholder="Buscar producto o categoría (ej: Pisco, Whisky, Aperol, Espumantes, 14-D)..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl ${t.bgInput} border ${t.border} ${t.text} text-sm focus:outline-none focus:border-purple-500 transition-colors`}
            />
            {busqueda && (
              <button 
                onClick={() => setBusqueda("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            )}
          </div>

          {/* Pestañas de Secciones */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categorias.map(cat => {
              const count = sectores.filter(s => (s.seccion || "").toLowerCase() === cat.nombre.toLowerCase()).length;
              const isSelected = seccionActiva.toLowerCase() === cat.nombre.toLowerCase();
              return (
                <button
                  key={cat.id || cat.nombre}
                  onClick={() => setSeccionActiva(cat.nombre)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
                    isSelected
                      ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/20 scale-105"
                      : `${t.bgCard} ${t.textSecondary} ${t.border} hover:text-purple-400 hover:border-purple-500/40`
                  }`}
                >
                  <span>{cat.nombre}</span>
                  {count > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isSelected ? "bg-black/30 text-white" : "bg-white/10 text-slate-300"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          
          {/* Header de la Sección Activa y Botón Agregar Sector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
            <div>
              <h3 className={`text-base font-black ${t.text} flex items-center gap-2`}>
                <span>Pasillos de {seccionActiva}</span>
                <span className="text-xs font-normal text-purple-400">
                  ({sectoresDeSeccion.length} sectores registrados)
                </span>
              </h3>
              {term && (
                <p className="text-xs text-amber-400 mt-0.5">
                  Filtrando por: "{term}"
                </p>
              )}
            </div>

            <button
              onClick={() => setMostrarNuevoSector(prev => !prev)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {mostrarNuevoSector ? "close" : "add"}
              </span>
              <span>{mostrarNuevoSector ? "Cancelar" : "Nuevo Pasillo / Sector"}</span>
            </button>
          </div>

          {/* Formulario desplegable para nuevo sector */}
          {mostrarNuevoSector && (
            <form onSubmit={handleCrearSector} className={`p-4 rounded-2xl border ${t.border} ${t.bgInput} space-y-3 animate-fadeIn`}>
              <h4 className={`text-sm font-bold ${t.text} flex items-center gap-1.5 text-purple-400`}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>playlist_add</span>
                Crear Sector en {seccionActiva}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className={`block text-xs font-semibold ${t.textSecondary} mb-1`}>
                    Nombre del Pasillo / Sector *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Pasillo 13-D, Pared 14-D, Cabecera..."
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl ${t.bgCard} border ${t.border} ${t.text} text-sm focus:outline-none focus:border-purple-500`}
                    autoFocus
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold ${t.textSecondary} mb-1`}>
                    Tipo de Sector
                  </label>
                  <select
                    value={nuevoTipo}
                    onChange={(e) => setNuevoTipo(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl ${t.bgCard} border ${t.border} ${t.text} text-sm focus:outline-none focus:border-purple-500`}
                  >
                    {TIPOS_SECTOR.map(tp => (
                      <option key={tp} value={tp}>{tp}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold ${t.textSecondary} mb-1`}>
                  Productos o categorías iniciales (opcional, separados por coma)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Rosé, Late harvest, Mezcla tinto"
                  value={nuevoItemsTexto}
                  onChange={(e) => setNuevoItemsTexto(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl ${t.bgCard} border ${t.border} ${t.text} text-sm focus:outline-none focus:border-purple-500`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarNuevoSector(false)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${t.bgCard} ${t.textSecondary} hover:text-white`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-sm"
                >
                  Guardar Sector
                </button>
              </div>
            </form>
          )}

          {/* Grid de Sectores */}
          {sectoresDeSeccion.length === 0 ? (
            <div className={`p-8 text-center rounded-2xl border ${t.border} ${t.bgInput} space-y-2`}>
              <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 40 }}>
                shelves
              </span>
              <p className={`${t.text} font-bold text-sm`}>
                No hay sectores definidos para {seccionActiva}
              </p>
              <p className={`${t.textSecondary} text-xs max-w-sm mx-auto`}>
                Agrega los pasillos y paredes de esta sección para organizar qué categorías de productos corresponden a cada lugar.
              </p>
              <button
                onClick={() => setMostrarNuevoSector(true)}
                className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-sm inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                Crear primer pasillo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sectoresDeSeccion.map(sector => {
                const isEditing = editandoSectorId === sector.id;
                const items = Array.isArray(sector.items) ? sector.items : [];
                
                // Verificar si coincide con la búsqueda
                const matchesSectorName = sector.nombre.toLowerCase().includes(term);
                const matchingItems = term ? items.filter(it => it.toLowerCase().includes(term)) : [];
                const isMatch = !term || matchesSectorName || matchingItems.length > 0;

                if (!isMatch) return null;

                const isPared = (sector.tipo || "").toLowerCase() === "pared";

                return (
                  <div 
                    key={sector.id} 
                    className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                      matchingItems.length > 0 
                        ? "border-purple-500 ring-2 ring-purple-500/20 shadow-lg" 
                        : `${t.border} hover:border-purple-500/40`
                    } ${t.bgCard}`}
                  >
                    <div>
                      {/* Cabecera de la tarjeta */}
                      <div className="flex items-start justify-between gap-2 mb-3 pb-2.5 border-b border-white/5">
                        {isEditing ? (
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={editNombre}
                              onChange={(e) => setEditNombre(e.target.value)}
                              className={`w-full px-2 py-1 rounded-lg ${t.bgInput} border ${t.border} ${t.text} text-xs font-bold focus:outline-none`}
                              autoFocus
                            />
                            <select
                              value={editTipo}
                              onChange={(e) => setEditTipo(e.target.value)}
                              className={`w-full px-2 py-1 rounded-lg ${t.bgInput} border ${t.border} ${t.text} text-xs focus:outline-none`}
                            >
                              {TIPOS_SECTOR.map(tp => (
                                <option key={tp} value={tp}>{tp}</option>
                              ))}
                            </select>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleGuardarEdicion(sector.id)}
                                className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditandoSectorId(null)}
                                className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-[11px]"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className={`text-sm font-black ${t.text} truncate`}>
                                  {sector.nombre}
                                </h4>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide uppercase ${
                                  isPared
                                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                    : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                }`}>
                                  {sector.tipo || "Pasillo"}
                                </span>
                              </div>
                              <p className={`text-[11px] ${t.textSecondary} mt-0.5`}>
                                {items.length} {items.length === 1 ? "categoría" : "categorías"}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => {
                                  setEditandoSectorId(sector.id);
                                  setEditNombre(sector.nombre);
                                  setEditTipo(sector.tipo || "Pasillo");
                                }}
                                className={`w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors`}
                                title="Editar nombre"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                              </button>
                              <button
                                onClick={() => handleEliminarSector(sector)}
                                className={`w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors`}
                                title="Eliminar sector"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Lista de Ítems / Categorías del Pasillo */}
                      <div className="flex flex-wrap gap-1.5 mb-3 min-h-[48px] content-start">
                        {items.length === 0 ? (
                          <span className={`text-[11px] ${t.textSecondary} italic py-1`}>
                            Sin productos asignados aún.
                          </span>
                        ) : (
                          items.map((item, idx) => {
                            const isItemMatch = term && item.toLowerCase().includes(term);
                            return (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                                  isItemMatch
                                    ? "bg-purple-600 text-white border-purple-400 ring-2 ring-purple-400/30 scale-105"
                                    : `${t.bgInput} ${t.text} ${t.border} hover:border-purple-400/40`
                                }`}
                              >
                                <span>{item}</span>
                                <button
                                  type="button"
                                  onClick={() => handleEliminarItem(sector, item)}
                                  className="text-slate-400 hover:text-red-400 transition-colors ml-0.5"
                                  title={`Quitar ${item}`}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>close</span>
                                </button>
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Agregar Ítem rápido al sector */}
                    <div className="pt-2 border-t border-white/5 flex gap-1.5 items-center">
                      <input
                        type="text"
                        placeholder="Añadir producto..."
                        value={nuevoItemPorSector[sector.id] || ""}
                        onChange={(e) => setNuevoItemPorSector(prev => ({ ...prev, [sector.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAgregarItem(sector);
                          }
                        }}
                        className={`flex-1 px-2.5 py-1.5 rounded-lg ${t.bgInput} border ${t.border} ${t.text} text-xs focus:outline-none focus:border-purple-500`}
                      />
                      <button
                        type="button"
                        onClick={() => handleAgregarItem(sector)}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center justify-center flex-shrink-0"
                        title="Agregar producto a este pasillo"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t ${t.border} flex items-center justify-between bg-slate-900/30 text-xs ${t.textSecondary}`}>
          <span>
            💡 Tip: Puedes buscar cualquier producto arriba para ver en qué pasillo o pared está ubicado.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
