import React, { useState, useMemo, useRef, useEffect } from "react";
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

  // Deduplicar categorías recibidas
  const categoriasUnicas = useMemo(() => {
    const map = new Map();
    (categorias || []).forEach(c => {
      const nom = (typeof c === "string" ? c : (c?.nombre || "")).trim();
      if (nom && !map.has(nom.toLowerCase())) {
        map.set(nom.toLowerCase(), typeof c === "string" ? { id: nom, nombre: nom } : c);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
  }, [categorias]);

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

  // Estados de IA y Archivos
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputSingleRef = useRef(null);
  const fileInputBulkRef = useRef(null);
  const [bulkPreview, setBulkPreview] = useState(null);

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

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Función unificada de procesamiento de imágenes (funciona con archivo o Ctrl+V)
  const procesarArchivo = async (file, modo = "bulk") => {
    if (!file) return;

    const toastId = toast.loading(
      modo === "single" 
        ? "Analizando imagen para el pasillo con IA..." 
        : "Escaneando hoja completa de pasillos con IA..."
    );
    setIsAnalyzing(true);

    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/analizar-ficha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mimeType: file.type || "image/jpeg",
          tipo: "sectores_pasillos"
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error al analizar imagen");

      let result = data;
      if (typeof result === "string") {
        try {
          result = JSON.parse(result.replace(/```json|```/g, "").trim());
        } catch (err) {}
      }

      if (modo === "single") {
        const firstSector = Array.isArray(result.sectores) && result.sectores.length > 0 ? result.sectores[0] : null;

        if (!firstSector && (!result.nombre || !result.items)) {
          toast.error("No se detectaron pasillos en la foto", { id: toastId });
          return;
        }

        const sectorName = firstSector ? firstSector.nombre : (result.nombre || "");
        const sectorTipo = firstSector ? (firstSector.tipo || "Pasillo") : (result.tipo || "Pasillo");
        const sectorItems = firstSector ? (firstSector.items || []) : (result.items || []);

        setMostrarNuevoSector(true);
        if (sectorName) setNuevoNombre(sectorName);
        if (sectorTipo) setNuevoTipo(sectorTipo);
        if (sectorItems.length > 0) setNuevoItemsTexto(sectorItems.join(", "));

        toast.success("¡Datos pegados con éxito! Revisa y guarda el pasillo.", { id: toastId });
      } else {
        const detectedSectores = Array.isArray(result.sectores) ? result.sectores : [];

        if (detectedSectores.length === 0) {
          toast.error("No se detectaron pasillos o sectores en la imagen", { id: toastId });
          return;
        }

        let detectedSeccion = (result.seccion || "").trim();
        if (detectedSeccion) {
          const match = categoriasUnicas.find(c => c.nombre.toLowerCase() === detectedSeccion.toLowerCase());
          if (match) detectedSeccion = match.nombre;
          else detectedSeccion = seccionActiva;
        } else {
          detectedSeccion = seccionActiva;
        }

        setBulkPreview({
          seccion: detectedSeccion,
          sectores: detectedSectores.map((s, idx) => ({
            id: `bulk_${idx}`,
            nombre: s.nombre || `Pasillo ${idx + 1}`,
            tipo: s.tipo || "Pasillo",
            items: Array.isArray(s.items) ? s.items : [],
            selected: true
          }))
        });

        toast.success(`¡Se detectaron ${detectedSectores.length} sectores pegados! Revisa la vista previa.`, { id: toastId });
      }

    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error al procesar la imagen", { id: toastId });
    } finally {
      setIsAnalyzing(false);
      if (fileInputSingleRef.current) fileInputSingleRef.current.value = "";
      if (fileInputBulkRef.current) fileInputBulkRef.current.value = "";
    }
  };

  // Listener para Ctrl + V (Pegar imagen)
  useEffect(() => {
    const handlePaste = (e) => {
      // Si el usuario está pegando texto normal en un input o textarea, permitir comportamiento nativo
      // a menos que lo que esté en el portapapeles sea estrictamente una IMAGEN.
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            // Si el formulario de crear sector está abierto, procesar como 'single'
            // Si no, procesar como 'bulk' (hoja completa)
            if (mostrarNuevoSector) {
              procesarArchivo(file, "single");
            } else {
              procesarArchivo(file, "bulk");
            }
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [mostrarNuevoSector, seccionActiva, categoriasUnicas, sectoresDeSeccion]);

  // Confirmar y guardar sectores en lote
  const handleConfirmBulk = async () => {
    if (!bulkPreview || !bulkPreview.sectores) return;
    const toSave = bulkPreview.sectores.filter(s => s.selected);
    if (toSave.length === 0) {
      toast.error("Selecciona al menos un sector para guardar");
      return;
    }

    const toastId = toast.loading(`Guardando ${toSave.length} sectores en ${bulkPreview.seccion}...`);
    try {
      for (let i = 0; i < toSave.length; i++) {
        const sec = toSave[i];
        await addDoc(collection(db, "auditoria_sectores"), {
          seccion: bulkPreview.seccion,
          nombre: sec.nombre.trim(),
          tipo: sec.tipo || "Pasillo",
          items: sec.items || [],
          orden: sectoresDeSeccion.length + i + 1,
          creadoEn: new Date()
        });
      }

      toast.success(`¡${toSave.length} sectores guardados correctamente!`, { id: toastId });
      setBulkPreview(null);
      setSeccionActiva(bulkPreview.seccion);
      onUpdate();
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar sectores en lote", { id: toastId });
    }
  };

  // Crear nuevo sector manualmente
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
      
      {/* Input oculto para escaneo individual */}
      <input
        ref={fileInputSingleRef}
        type="file"
        accept="image/*"
        onChange={(e) => procesarArchivo(e.target.files?.[0], "single")}
        className="hidden"
      />

      {/* Input oculto para escaneo de hoja completa */}
      <input
        ref={fileInputBulkRef}
        type="file"
        accept="image/*"
        onChange={(e) => procesarArchivo(e.target.files?.[0], "bulk")}
        className="hidden"
      />

      <div className={`${t.bgCard} rounded-3xl w-full max-w-5xl shadow-2xl border ${t.border} flex flex-col max-h-[92vh] overflow-hidden relative`}>
        
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

        {/* Barra de Filtros, Búsqueda y Botón Hoja Completa */}
        <div className={`p-4 border-b ${t.border} space-y-3 bg-slate-900/20`}>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Buscador inteligente */}
            <div className="relative flex-1">
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

            {/* Botón Escanear Hoja Completa con IA (con soporte Ctrl+V) */}
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => fileInputBulkRef.current?.click()}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 flex-shrink-0 disabled:opacity-50"
              title="Sube una foto o simplemente presiona Ctrl+V para escanear"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {isAnalyzing ? "sync" : "document_scanner"}
              </span>
              <span>{isAnalyzing ? "Analizando..." : "Escanear Hoja"}</span>
              <span className="hidden md:inline px-1.5 py-0.5 rounded text-[10px] bg-white/20 font-mono tracking-tight">
                Ctrl + V
              </span>
            </button>
          </div>

          {/* Pestañas de Secciones */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categoriasUnicas.map(cat => {
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

          {/* Formulario desplegable para nuevo sector con botón IA y soporte Ctrl+V */}
          {mostrarNuevoSector && (
            <form onSubmit={handleCrearSector} className={`p-4 rounded-2xl border ${t.border} ${t.bgInput} space-y-3 animate-fadeIn`}>
              <div className="flex items-center justify-between">
                <h4 className={`text-sm font-bold ${t.text} flex items-center gap-1.5 text-purple-400`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>playlist_add</span>
                  Crear Sector en {seccionActiva}
                </h4>

                {/* Botón de Rellenar con Foto / Ctrl+V */}
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => fileInputSingleRef.current?.click()}
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                  title="Sube una foto o simplemente presiona Ctrl+V para rellenar"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    {isAnalyzing ? "sync" : "photo_camera"}
                  </span>
                  <span>{isAnalyzing ? "Extrayendo..." : "Rellenar con Foto"}</span>
                  <span className="hidden md:inline px-1 py-0.2 rounded text-[10px] bg-white/10 font-mono">
                    Ctrl + V
                  </span>
                </button>
              </div>

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
                  Productos o categorías del pasillo (separados por coma o viñetas)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Rosé, Late harvest, Mezcla tinto..."
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
                Puedes crear pasillos manualmente o presionar <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[11px]">Ctrl + V</kbd> con una imagen copiada.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={() => setMostrarNuevoSector(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-sm inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                  Crear pasillo manual
                </button>
                <button
                  onClick={() => fileInputBulkRef.current?.click()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>document_scanner</span>
                  Escanear hoja (o Ctrl+V)
                </button>
              </div>
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
            💡 Tip: Puedes presionar <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[11px] text-white">Ctrl + V</kbd> en cualquier momento para pegar una imagen copiada.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>

        {/* Modal de Vista Previa para Importación en Lote (Hoja Completa) */}
        {bulkPreview && (
          <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[80] p-4 backdrop-blur-md animate-fadeIn">
            <div className={`${t.bgCard} rounded-3xl w-full max-w-2xl shadow-2xl border ${t.border} p-6 flex flex-col max-h-[85vh]`}>
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-purple-400" style={{ fontSize: 24 }}>
                    document_scanner
                  </span>
                  <div>
                    <h3 className={`text-base font-black ${t.text}`}>
                      Vista Previa de Sectores Detectados
                    </h3>
                    <p className={`text-xs ${t.textSecondary}`}>
                      Revisa los pasillos y productos extraídos de la hoja
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setBulkPreview(null)}
                  className={`w-8 h-8 rounded-full ${t.bgInput} ${t.textSecondary} flex items-center justify-center hover:text-white`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              {/* Selector de Sección Destino */}
              <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-purple-300">
                  Guardar estos sectores en la sección:
                </span>
                <select
                  value={bulkPreview.seccion}
                  onChange={(e) => setBulkPreview(prev => ({ ...prev, seccion: e.target.value }))}
                  className={`px-3 py-1.5 rounded-lg ${t.bgCard} border ${t.border} ${t.text} text-xs font-bold focus:outline-none`}
                >
                  {categoriasUnicas.map(c => (
                    <option key={c.id || c.nombre} value={c.nombre}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Lista de sectores detectados */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-4">
                {bulkPreview.sectores.map((sec, idx) => (
                  <div
                    key={sec.id}
                    className={`p-3 rounded-xl border transition-all ${
                      sec.selected ? "border-purple-500/50 bg-slate-900/60" : "border-white/5 opacity-50 bg-slate-900/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sec.selected}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setBulkPreview(prev => ({
                              ...prev,
                              sectores: prev.sectores.map((s, i) => i === idx ? { ...s, selected: checked } : s)
                            }));
                          }}
                          className="rounded text-purple-600 focus:ring-0"
                        />
                        <span className={`text-xs font-black ${t.text}`}>{sec.nombre}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-slate-300 uppercase font-bold">
                          {sec.tipo}
                        </span>
                      </label>
                      <span className={`text-[11px] ${t.textSecondary}`}>
                        {sec.items.length} productos
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 pl-6">
                      {sec.items.map((it, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                          {it}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setBulkPreview(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold ${t.bgCard} ${t.textSecondary} hover:text-white`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulk}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20"
                >
                  Guardar {bulkPreview.sectores.filter(s => s.selected).length} Sectores en {bulkPreview.seccion}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
