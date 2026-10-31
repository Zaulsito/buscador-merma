import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "../context/ThemeContext";
import { db, storage } from "../firebase/config";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";

// Colores por sección para los marcadores
const SECCION_COLORES = {
  "botilleria": "#a855f7",
  "abarrotes": "#3b82f6",
  "carniceria": "#ef4444",
  "fiambreria": "#eab308",
  "lacteos": "#10b981",
  "aseo y limpieza": "#06b6d4",
  "panaderia": "#f97316",
  "pasteleria": "#ec4899",
  "verdulería": "#22c55e",
  "verduleria": "#22c55e",
  "mundo bio": "#84cc16",
  "mascotas": "#14b8a6",
  "default": "#8b5cf6"
};

const getSeccionColor = (seccion) => {
  if (!seccion) return SECCION_COLORES.default;
  const s = seccion.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return SECCION_COLORES[s] || SECCION_COLORES.default;
};

export default function MapaSupermercadoLeaflet({ 
  productos = [], 
  sectores = [], 
  categorias = [],
  onUpdateSectores 
}) {
  const { t } = useTheme();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const imageOverlayRef = useRef(null);
  const markersLayerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Estados del Modo Editor y Calibración
  const [modoEditor, setModoEditor] = useState(false);
  const [sectorCalibrando, setSectorCalibrando] = useState(null);
  const [sectorSeleccionado, setSectorSeleccionado] = useState(null);
  const [seccionFiltro, setSeccionFiltro] = useState("Todas");
  const [busquedaSector, setBusquedaSector] = useState("");
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  // Configuración del plano (URL de imagen de fondo y dimensiones)
  const [mapaConfig, setMapaConfig] = useState(() => {
    try {
      const guardado = localStorage.getItem("mapa_supermercado_config");
      if (guardado) return JSON.parse(guardado);
    } catch {
      // fallback
    }
    return {
      imagenUrl: null,
      alto: 900,
      ancho: 1500
    };
  });

  // Cargar configuración del plano desde Firebase
  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "auditoria_sectores", "_config_mapa_"));
        if (snap.exists()) {
          const data = snap.data();
          if (data.imagenUrl) {
            const conf = {
              imagenUrl: data.imagenUrl,
              alto: data.alto || 900,
              ancho: data.ancho || 1500
            };
            setMapaConfig(conf);
            localStorage.setItem("mapa_supermercado_config", JSON.stringify(conf));
          }
        }
      } catch (err) {
        console.warn("No se pudo cargar config remota del mapa:", err);
      }
    };
    cargarConfig();
  }, []);

  // Límites del mapa según la imagen o el tamaño por defecto
  const mapBounds = useMemo(() => {
    return [[0, 0], [mapaConfig.alto, mapaConfig.ancho]];
  }, [mapaConfig]);

  // Inicializar Leaflet con CRS.Simple
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -1.5,
      maxZoom: 2,
      zoomSnap: 0.1,
      attributionControl: false,
      zoomControl: true,
    });

    map.fitBounds(mapBounds);
    map.setMaxBounds([[-200, -200], [mapaConfig.alto + 200, mapaConfig.ancho + 200]]);

    // Capa de marcadores
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Actualizar imagen de fondo en el mapa
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.setMaxBounds([[-200, -200], [mapaConfig.alto + 200, mapaConfig.ancho + 200]]);

    if (imageOverlayRef.current) {
      map.removeLayer(imageOverlayRef.current);
      imageOverlayRef.current = null;
    }

    if (mapaConfig.imagenUrl) {
      const overlay = L.imageOverlay(mapaConfig.imagenUrl, mapBounds, {
        opacity: 0.95,
        interactive: false
      }).addTo(map);
      imageOverlayRef.current = overlay;
      map.fitBounds(mapBounds);
    } else {
      // Plano esquemático por defecto (cuadrícula oscura con marcas)
      const bgPolygon = L.rectangle(mapBounds, {
        color: "#3b82f6",
        weight: 1.5,
        dashArray: "6, 6",
        fillColor: "#0b0f19",
        fillOpacity: 0.95,
        interactive: false,
      }).addTo(map);
      imageOverlayRef.current = bgPolygon;
    }
  }, [mapaConfig, mapBounds]);

  // Evento de clic en el mapa (Para calibrar / ubicar un sector)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = async (e) => {
      if (!modoEditor || !sectorCalibrando) return;

      const y = Math.round(e.latlng.lat);
      const x = Math.round(e.latlng.lng);

      try {
        await updateDoc(doc(db, "auditoria_sectores", sectorCalibrando.id), {
          mapCoords: { x, y },
          updatedAt: serverTimestamp()
        });

        toast.success(`📍 ${sectorCalibrando.nombre} fijado en [X: ${x}, Y: ${y}]`);
        setSectorCalibrando(null);
        if (onUpdateSectores) await onUpdateSectores();
      } catch (err) {
        console.error("Error al calibrar coordenadas:", err);
        toast.error("Error al guardar la ubicación en el mapa");
      }
    };

    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [modoEditor, sectorCalibrando, onUpdateSectores]);

  // Renderizar marcadores de pasillos/sectores
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    sectores.forEach(sec => {
      if (!sec.mapCoords || typeof sec.mapCoords.x !== "number" || typeof sec.mapCoords.y !== "number") {
        return; // Sin coordenadas fijadas aún
      }

      const matchSeccion = seccionFiltro === "Todas" || sec.seccion === seccionFiltro;
      if (!matchSeccion) return;

      const lat = sec.mapCoords.y;
      const lng = sec.mapCoords.x;
      const color = getSeccionColor(sec.seccion);
      const isSelected = sectorSeleccionado?.id === sec.id;

      // Pin personalizado con Tailwind y HTML
      const pinHtml = `
        <div style="cursor: ${modoEditor ? "grab" : "pointer"}; display: flex; flex-direction: column; align-items: center; transition: all 0.2s;" class="group">
          <div style="background: ${isSelected ? '#ec4899' : color}; color: white; border: 2px solid white; border-radius: 9999px; padding: 2px 8px; font-size: 10px; font-weight: 900; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.6); display: flex; items-center; gap: 4px;">
            <span>📍</span>
            <span>${sec.nombre}</span>
          </div>
          <div style="width: 6px; height: 6px; background: ${isSelected ? '#ec4899' : color}; transform: rotate(45deg); margin-top: -3px; border-right: 1px solid white; border-bottom: 1px solid white;"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: pinHtml,
        iconSize: [120, 28],
        iconAnchor: [60, 26]
      });

      // Si está en modo editor, permitir arrastrar para ajuste fino
      const marker = L.marker([lat, lng], {
        icon: customIcon,
        draggable: modoEditor
      });

      // Tooltip / Popup con productos del pasillo
      const itemsList = Array.isArray(sec.items) ? sec.items : (Array.isArray(sec.productos) ? sec.productos : []);
      const popupHtml = `
        <div style="padding: 6px; font-family: sans-serif; min-width: 190px;">
          <div style="font-size: 9px; color: ${color}; font-weight: 800; text-transform: uppercase;">
            ${sec.seccion} &bull; ${sec.tipo || "Pasillo"}
          </div>
          <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 2px;">
            ${sec.nombre}
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
            Coordenadas: [X: ${lng}, Y: ${lat}]
          </div>
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0;">
            <div style="font-size: 10px; font-weight: 700; color: #334155; margin-bottom: 4px;">
              Productos / Familias (${itemsList.length}):
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 3px; max-height: 80px; overflow-y: auto;">
              ${itemsList.slice(0, 8).map(it => `
                <span style="font-size: 9px; background: #f1f5f9; color: #334155; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd5e1;">
                  ${it}
                </span>
              `).join("")}
              ${itemsList.length > 8 ? `<span style="font-size: 9px; color: #64748b;">+${itemsList.length - 8} más</span>` : ""}
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      // Al arrastrar en modo editor, actualizar posición al soltar
      if (modoEditor) {
        marker.on("dragend", async (ev) => {
          const newPos = ev.target.getLatLng();
          const newY = Math.round(newPos.lat);
          const newX = Math.round(newPos.lng);
          try {
            await updateDoc(doc(db, "auditoria_sectores", sec.id), {
              mapCoords: { x: newX, y: newY },
              updatedAt: serverTimestamp()
            });
            toast.success(`📍 ${sec.nombre} ajustado a [X: ${newX}, Y: ${newY}]`);
            if (onUpdateSectores) await onUpdateSectores();
          } catch (err) {
            console.error(err);
            toast.error("Error al mover el marcador");
          }
        });
      }

      marker.on("click", () => {
        setSectorSeleccionado(sec);
      });

      markersLayer.addLayer(marker);
    });
  }, [sectores, seccionFiltro, sectorSeleccionado, modoEditor, onUpdateSectores]);

  // Manejar subida de foto o plano del local
  const handleSubirPlano = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoImagen(true);
    const toastId = toast.loading("Cargando imagen del plano...");

    try {
      // 1. Obtener dimensiones naturales de la imagen
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });

      const ancho = img.naturalWidth || 1500;
      const alto = img.naturalHeight || 900;

      // 2. Subir a Firebase Storage
      const storageRef = ref(storage, `auditoria/planos/plano_local_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // 3. Guardar en Firestore y localStorage
      const nuevaConfig = { imagenUrl: downloadUrl, ancho, alto };
      await setDoc(doc(db, "auditoria_sectores", "_config_mapa_"), {
        ...nuevaConfig,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setMapaConfig(nuevaConfig);
      localStorage.setItem("mapa_supermercado_config", JSON.stringify(nuevaConfig));

      toast.success("¡Plano del local cargado exitosamente!", { id: toastId });
    } catch (err) {
      console.error("Error al subir plano:", err);
      toast.error("No se pudo cargar la imagen del plano", { id: toastId });
    } finally {
      setSubiendoImagen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Restablecer plano por defecto
  const handleRestablecerPlano = async () => {
    if (!window.confirm("¿Deseas quitar la imagen personalizada y volver al plano base?")) return;
    try {
      const conf = { imagenUrl: null, ancho: 1500, alto: 900 };
      await setDoc(doc(db, "auditoria_sectores", "_config_mapa_"), {
        imagenUrl: null,
        ancho: 1500,
        alto: 900,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setMapaConfig(conf);
      localStorage.removeItem("mapa_supermercado_config");
      toast.success("Plano restablecido al modo esquemático");
    } catch (err) {
      console.error(err);
    }
  };

  // Quitar ubicación de un sector
  const handleQuitarUbicacion = async (sectorId, nombre) => {
    try {
      await updateDoc(doc(db, "auditoria_sectores", sectorId), {
        mapCoords: null,
        updatedAt: serverTimestamp()
      });
      toast.success(`Ubicación de ${nombre} eliminada`);
      if (onUpdateSectores) await onUpdateSectores();
    } catch (err) {
      console.error(err);
      toast.error("Error al quitar ubicación");
    }
  };

  // Enfocar suavemente un sector (flyTo)
  const enfocarSector = (sec) => {
    setSectorSeleccionado(sec);
    if (!mapInstanceRef.current) return;
    if (sec.mapCoords) {
      mapInstanceRef.current.flyTo([sec.mapCoords.y, sec.mapCoords.x], 0.8, { duration: 1.2 });
    } else {
      toast("Este pasillo aún no tiene coordenadas en el plano. Activa el Modo Editor para ubicarlo.", {
        icon: "📍"
      });
    }
  };

  // Filtrar sectores para la lista del editor
  const sectoresFiltrados = useMemo(() => {
    return sectores.filter(s => {
      const matchSeccion = seccionFiltro === "Todas" || s.seccion === seccionFiltro;
      const matchBusqueda = !busquedaSector || s.nombre.toLowerCase().includes(busquedaSector.toLowerCase());
      return matchSeccion && matchBusqueda;
    });
  }, [sectores, seccionFiltro, busquedaSector]);

  const totalUbicados = sectores.filter(s => s.mapCoords?.x !== undefined).length;

  return (
    <div className="space-y-4 animate-fadeIn">
      
      {/* Input oculto para subir imagen de plano */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleSubirPlano}
        className="hidden"
      />

      {/* Header y Barra de Herramientas del Mapa */}
      <div className={`p-4 sm:p-5 rounded-3xl border ${t.border} ${t.bgCard} shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4`}>
        
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${modoEditor ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-pulse"}`}></span>
            <h2 className={`text-base sm:text-lg font-black ${t.text} flex items-center gap-2`}>
              <span>Mapa del Supermercado</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                modoEditor 
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40" 
                  : "bg-purple-500/20 text-purple-300 border-purple-500/40"
              }`}>
                {modoEditor ? "MODO EDITOR / CALIBRADOR" : "MODO VISTA"}
              </span>
            </h2>
          </div>
          <p className={`text-xs ${t.textSecondary} mt-0.5`}>
            {modoEditor 
              ? "Selecciona un pasillo en la lista lateral y haz clic en el plano para ubicarlo o arrastra los pines para calibrar."
              : `${totalUbicados} de ${sectores.length} pasillos ubicados en el plano. Haz clic en un pasillo para ver sus productos.`
            }
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Subir foto del plano */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={subiendoImagen}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              mapaConfig.imagenUrl 
                ? "bg-blue-600/15 border-blue-500/40 text-blue-300 hover:bg-blue-600/25"
                : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
            }`}
            title="Cargar foto o plano del local"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {subiendoImagen ? "hourglass_empty" : "add_photo_alternate"}
            </span>
            <span>{mapaConfig.imagenUrl ? "Cambiar imagen del plano" : "Subir foto del plano"}</span>
          </button>

          {mapaConfig.imagenUrl && (
            <button
              onClick={handleRestablecerPlano}
              className={`p-2 rounded-xl text-xs font-bold border ${t.border} ${t.textSecondary} hover:text-red-400 hover:bg-red-500/10 transition-colors`}
              title="Quitar imagen y usar plano esquemático base"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete_forever</span>
            </button>
          )}

          {/* Toggle Modo Editor */}
          <button
            onClick={() => {
              setModoEditor(!modoEditor);
              setSectorCalibrando(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black border transition-all flex items-center gap-2 shadow-lg ${
              modoEditor
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/30 scale-105"
                : "bg-purple-600 text-white border-purple-400 hover:bg-purple-500 shadow-purple-500/30"
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {modoEditor ? "edit_off" : "tune"}
            </span>
            <span>{modoEditor ? "Salir del Editor" : "Calibrar / Editar Pasillos"}</span>
          </button>

        </div>

      </div>

      {/* Banner de Calibración Activa */}
      {modoEditor && sectorCalibrando && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/50 flex items-center justify-between gap-3 text-xs animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm">
              🎯
            </span>
            <div>
              <span className="font-extrabold text-amber-300 block">
                Haz clic sobre el plano donde está "{sectorCalibrando.nombre}" ({sectorCalibrando.seccion})
              </span>
              <span className="text-[11px] text-slate-300">
                Al hacer clic se colocará el pin y se guardará la coordenada automáticamente.
              </span>
            </div>
          </div>
          <button
            onClick={() => setSectorCalibrando(null)}
            className="px-3 py-1.5 rounded-xl bg-slate-900/80 text-slate-300 hover:text-white text-xs font-bold border border-white/10"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Filtros de Secciones */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <span className={`text-xs font-bold ${t.textSecondary} shrink-0`}>Sección:</span>
        {["Todas", ...categorias.map(c => c.nombre)].map(sec => (
          <button
            key={sec}
            onClick={() => setSeccionFiltro(sec)}
            className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              seccionFiltro === sec
                ? "bg-purple-600 text-white border-purple-400 shadow-md scale-105"
                : `${t.bgCard} ${t.textSecondary} ${t.border} hover:text-white hover:border-purple-500/40`
            }`}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* Layout Principal: Mapa y Panel Lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Visor de Mapa Leaflet */}
        <div className={modoEditor ? "lg:col-span-3" : "lg:col-span-3"}>
          <div 
            className={`rounded-3xl border ${t.border} overflow-hidden shadow-2xl relative bg-slate-950`}
            style={{ height: "620px" }}
          >
            <div 
              ref={mapContainerRef} 
              className={`w-full h-full z-10 ${sectorCalibrando ? "cursor-crosshair" : ""}`}
              style={{ background: "#070b14" }}
            />

            {/* Botón flotante para restablecer zoom */}
            <div className="absolute top-4 right-4 z-20 flex gap-2">
              <button
                onClick={() => {
                  mapInstanceRef.current?.fitBounds(mapBounds);
                  setSectorSeleccionado(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold border border-white/10 shadow-lg backdrop-blur-md flex items-center gap-1.5"
                title="Ver plano completo"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>crop_free</span>
                <span>Centrar Plano</span>
              </button>
            </div>
          </div>
        </div>

        {/* Panel Lateral: Lista de Pasillos para Calibrar o Inspeccionar */}
        <div className="lg:col-span-1 space-y-4">
          <div className={`p-4 rounded-3xl border ${t.border} ${t.bgCard} shadow-lg flex flex-col justify-between`} style={{ height: "620px" }}>
            
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400" style={{ fontSize: 20 }}>
                    {modoEditor ? "tune" : "list"}
                  </span>
                  <h3 className={`font-black text-sm ${t.text}`}>
                    {modoEditor ? "Calibrar Pasillos" : "Pasillos del Local"}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-purple-400">
                  {totalUbicados}/{sectores.length}
                </span>
              </div>

              {/* Buscador de pasillo en la lista */}
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Filtrar pasillo..."
                  value={busquedaSector}
                  onChange={(e) => setBusquedaSector(e.target.value)}
                  className={`w-full px-3 py-1.5 pl-8 rounded-xl ${t.bgInput} border ${t.border} ${t.text} text-xs focus:outline-none focus:border-purple-500`}
                />
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" style={{ fontSize: 16 }}>
                  search
                </span>
              </div>

              {/* Lista scrolleable de sectores */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {sectoresFiltrados.length === 0 ? (
                  <p className={`text-xs ${t.textSecondary} text-center py-8 italic`}>
                    No hay pasillos en esta sección.
                  </p>
                ) : (
                  sectoresFiltrados.map(sec => {
                    const isUbicado = Boolean(sec.mapCoords?.x !== undefined);
                    const isCalibrandoEste = sectorCalibrando?.id === sec.id;
                    const isSelected = sectorSeleccionado?.id === sec.id;
                    const color = getSeccionColor(sec.seccion);

                    return (
                      <div
                        key={sec.id}
                        className={`p-2.5 rounded-2xl border transition-all ${
                          isCalibrandoEste
                            ? "bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/30"
                            : isSelected
                            ? "bg-purple-600/20 border-purple-500"
                            : `${t.bgInput} ${t.border} hover:border-purple-500/40`
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span 
                                className="w-2 h-2 rounded-full flex-shrink-0" 
                                style={{ background: color }}
                              />
                              <h4 className={`text-xs font-bold ${t.text} truncate`}>{sec.nombre}</h4>
                            </div>
                            <span className={`text-[10px] ${t.textSecondary} block mt-0.5`}>
                              {sec.seccion} &bull; {sec.tipo || "Pasillo"}
                            </span>
                          </div>

                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                            isUbicado 
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}>
                            {isUbicado ? "Ubicado" : "Pendiente"}
                          </span>
                        </div>

                        {/* Botones de acción del pasillo */}
                        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                          {isUbicado ? (
                            <button
                              onClick={() => enfocarSector(sec)}
                              className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>visibility</span>
                              <span>Enfocar</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Sin fijar</span>
                          )}

                          {modoEditor && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setSectorCalibrando(sec)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                  isCalibrandoEste
                                    ? "bg-amber-500 text-slate-950 border-amber-400"
                                    : "bg-purple-600/30 text-purple-300 border-purple-500/40 hover:bg-purple-600 hover:text-white"
                                }`}
                              >
                                {isCalibrandoEste ? "Haz clic en plano..." : (isUbicado ? "Mover" : "Ubicar")}
                              </button>

                              {isUbicado && (
                                <button
                                  onClick={() => handleQuitarUbicacion(sec.id, sec.nombre)}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                  title="Quitar ubicación del plano"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pie de ayuda */}
              <div className="pt-3 border-t border-white/5 text-[10px] text-slate-400">
                {modoEditor ? (
                  <p>💡 <em>Tip: Al ubicar un pasillo, también puedes arrastrar su pin sobre el plano para moverlo con precisión.</em></p>
                ) : (
                  <p>💡 <em>Activa "Calibrar / Editar Pasillos" para subir la foto de tu plano o fijar nuevos puntos.</em></p>
                )}
              </div>

            </div>

          </div>
        </div>

      </div>

    </div>
  );
}