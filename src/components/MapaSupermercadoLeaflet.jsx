import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "../context/ThemeContext";

// Definición de Pasillos y Góndolas del Local (Maqueta de Ejemplo)
const SECTORES_MAPA = [
  // --- BOTILLERÍA ---
  {
    id: "botilleria-pared",
    nombre: "Pared Botillería",
    seccion: "Botillería",
    tipo: "Pared",
    bounds: [[300, 60], [700, 110]],
    color: "#8b5cf6", // purple
    gondolas: [
      { id: "BP-1", nombre: "Góndola 1 (Whisky & Tequila)", center: [650, 85] },
      { id: "BP-2", nombre: "Góndola 2 (Vodka & Ron)", center: [500, 85] },
      { id: "BP-3", nombre: "Góndola 3 (Licores & Aperitivos)", center: [350, 85] },
    ]
  },
  {
    id: "pasillo-13d",
    nombre: "Pasillo 13-D",
    seccion: "Botillería",
    tipo: "Pasillo",
    bounds: [[320, 160], [680, 210]],
    color: "#8b5cf6",
    gondolas: [
      { id: "13D-G1", nombre: "Góndola 1 (Rose & Late Harvest)", center: [620, 185] },
      { id: "13D-G2", nombre: "Góndola 2 (Vinos Tintos Reserva)", center: [500, 185] },
      { id: "13D-G3", nombre: "Góndola 3 (Agua Tónica & Mixers)", center: [380, 185] },
    ]
  },
  {
    id: "pasillo-14d",
    nombre: "Pasillo 14-D",
    seccion: "Botillería",
    tipo: "Pasillo",
    bounds: [[320, 260], [680, 310]],
    color: "#8b5cf6",
    gondolas: [
      { id: "14D-G1", nombre: "Góndola 1 (Espumantes & Sidras)", center: [620, 285] },
      { id: "14D-G2", nombre: "Góndola 2 (Vinos Blancos & Cepas)", center: [500, 285] },
      { id: "14D-G3", nombre: "Góndola 3 (Licores Dulces & Bailey)", center: [380, 285] },
    ]
  },
  {
    id: "pasillo-15d",
    nombre: "Pasillo 15-D",
    seccion: "Botillería",
    tipo: "Pasillo",
    bounds: [[320, 360], [680, 410]],
    color: "#8b5cf6",
    gondolas: [
      { id: "15D-G1", nombre: "Góndola 1 (Piscos Especiales)", center: [620, 385] },
      { id: "15D-G2", nombre: "Góndola 2 (Piscos Tradicionales)", center: [500, 385] },
      { id: "15D-G3", nombre: "Góndola 3 (Cocktails & Sour)", center: [380, 385] },
    ]
  },
  {
    id: "pasillo-16d",
    nombre: "Pasillo 16-D",
    seccion: "Botillería",
    tipo: "Pasillo",
    bounds: [[320, 460], [680, 510]],
    color: "#8b5cf6",
    gondolas: [
      { id: "16D-G1", nombre: "Góndola 1 (Cervezas Artesanales)", center: [620, 485] },
      { id: "16D-G2", nombre: "Góndola 2 (Cervezas Importadas)", center: [500, 485] },
      { id: "16D-G3", nombre: "Góndola 3 (Cervezas Sin Alcohol)", center: [380, 485] },
    ]
  },

  // --- ABARROTES ---
  {
    id: "pasillo-5d",
    nombre: "Pasillo 5-D",
    seccion: "Abarrotes",
    tipo: "Pasillo",
    bounds: [[320, 600], [680, 650]],
    color: "#3b82f6", // blue
    gondolas: [
      { id: "5D-G1", nombre: "Góndola 1 (Arroz & Legumbres)", center: [620, 625] },
      { id: "5D-G2", nombre: "Góndola 2 (Pastas & Salsas)", center: [500, 625] },
      { id: "5D-G3", nombre: "Góndola 3 (Aceites & Vinagres)", center: [380, 625] },
    ]
  },
  {
    id: "pasillo-6d",
    nombre: "Pasillo 6-D",
    seccion: "Abarrotes",
    tipo: "Pasillo",
    bounds: [[320, 700], [680, 750]],
    color: "#3b82f6",
    gondolas: [
      { id: "6D-G1", nombre: "Góndola 1 (Harinas & Polvos)", center: [620, 725] },
      { id: "6D-G2", nombre: "Góndola 2 (Conservas & Pescados)", center: [500, 725] },
      { id: "6D-G3", nombre: "Góndola 3 (Sopas & Caldos)", center: [380, 725] },
    ]
  },
  {
    id: "pasillo-7d",
    nombre: "Pasillo 7-D",
    seccion: "Abarrotes",
    tipo: "Pasillo",
    bounds: [[320, 800], [680, 850]],
    color: "#3b82f6",
    gondolas: [
      { id: "7D-G1", nombre: "Góndola 1 (Galletas Dulces)", center: [620, 825] },
      { id: "7D-G2", nombre: "Góndola 2 (Chocolates & Golosinas)", center: [500, 825] },
      { id: "7D-G3", nombre: "Góndola 3 (Snacks & Papas Fritas)", center: [380, 825] },
    ]
  },
  {
    id: "pasillo-8d",
    nombre: "Pasillo 8-D",
    seccion: "Abarrotes",
    tipo: "Pasillo",
    bounds: [[320, 900], [680, 950]],
    color: "#3b82f6",
    gondolas: [
      { id: "8D-G1", nombre: "Góndola 1 (Café & Té)", center: [620, 925] },
      { id: "8D-G2", nombre: "Góndola 2 (Cereales & Avenas)", center: [500, 925] },
      { id: "8D-G3", nombre: "Góndola 3 (Mermeladas & Miel)", center: [380, 925] },
    ]
  },

  // --- ASEO Y LIMPIEZA ---
  {
    id: "pasillo-1d",
    nombre: "Pasillo 1-D",
    seccion: "Aseo y Limpieza",
    tipo: "Pasillo",
    bounds: [[320, 1050], [680, 1100]],
    color: "#06b6d4", // cyan
    gondolas: [
      { id: "1D-G1", nombre: "Góndola 1 (Detergentes Ropa)", center: [620, 1075] },
      { id: "1D-G2", nombre: "Góndola 2 (Suavizantes)", center: [500, 1075] },
      { id: "1D-G3", nombre: "Góndola 3 (Cloro & Desinfectantes)", center: [380, 1075] },
    ]
  },
  {
    id: "pasillo-2d",
    nombre: "Pasillo 2-D",
    seccion: "Aseo y Limpieza",
    tipo: "Pasillo",
    bounds: [[320, 1150], [680, 1200]],
    color: "#06b6d4",
    gondolas: [
      { id: "2D-G1", nombre: "Góndola 1 (Lavalozas & Esponjas)", center: [620, 1175] },
      { id: "2D-G2", nombre: "Góndola 2 (Papel Higiénico)", center: [500, 1175] },
      { id: "2D-G3", nombre: "Góndola 3 (Toallas de Papel)", center: [380, 1175] },
    ]
  },

  // --- SECCIONES DE FONDO / PERÍMETRO ---
  {
    id: "carniceria",
    nombre: "Carnicería y Pollos",
    seccion: "Carnicería",
    tipo: "Pared",
    bounds: [[780, 100], [880, 500]],
    color: "#ef4444", // red
    gondolas: [
      { id: "CARN-1", nombre: "Vitrina Vacuno", center: [830, 200] },
      { id: "CARN-2", nombre: "Vitrina Pollo & Cerdo", center: [830, 350] },
      { id: "CARN-3", nombre: "Cortes Envasados", center: [830, 450] },
    ]
  },
  {
    id: "fiambreria",
    nombre: "Fiambrería y Quesos",
    seccion: "Fiambrería",
    tipo: "Pared",
    bounds: [[780, 550], [880, 950]],
    color: "#eab308", // yellow
    gondolas: [
      { id: "FIAM-1", nombre: "Cecinas & Jamones", center: [830, 650] },
      { id: "FIAM-2", nombre: "Quesos Granel", center: [830, 780] },
      { id: "FIAM-3", nombre: "Rotisería Preparados", center: [830, 880] },
    ]
  },
  {
    id: "lacteos",
    nombre: "Lácteos y Refrigerados",
    seccion: "Lácteos",
    tipo: "Pared",
    bounds: [[780, 1000], [880, 1450]],
    color: "#10b981", // emerald
    gondolas: [
      { id: "LAC-1", nombre: "Leches & Bebidas Lácteas", center: [830, 1100] },
      { id: "LAC-2", nombre: "Yogures & Postres", center: [830, 1250] },
      { id: "LAC-3", nombre: "Mantequillas & Margarinas", center: [830, 1380] },
    ]
  },
];

export default function MapaSupermercadoLeaflet({ productos = [], sectores = [] }) {
  const { t } = useTheme();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const markerRef = useRef(null);

  const [sectorSeleccionado, setSectorSeleccionado] = useState(null);
  const [gondolaSeleccionada, setGondolaSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [seccionFiltro, setSeccionFiltro] = useState("Todas");

  // Dimensiones del plano (coordenadas CRS.Simple)
  const MAP_HEIGHT = 950;
  const MAP_WIDTH = 1550;
  const mapBounds = [[0, 0], [MAP_HEIGHT, MAP_WIDTH]];

  // Inicializar Leaflet con CRS.Simple
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Ya inicializado

    const map = L.map(mapContainerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -1.2,
      maxZoom: 1.5,
      zoomSnap: 0.1,
      attributionControl: false,
      zoomControl: true,
    });

    map.fitBounds(mapBounds);
    map.setMaxBounds([[-100, -100], [MAP_HEIGHT + 100, MAP_WIDTH + 100]]);

    // Fondo del plano del supermercado
    const bgPolygon = L.rectangle(mapBounds, {
      color: "#334155",
      weight: 2,
      fillColor: "#0f172a",
      fillOpacity: 0.95,
      interactive: false,
    }).addTo(map);

    // Dibujar Zona de Entrada y Cajas
    const cajasBounds = [[80, 160], [160, 1400]];
    L.rectangle(cajasBounds, {
      color: "#475569",
      weight: 1,
      dashArray: "4, 4",
      fillColor: "#1e293b",
      fillOpacity: 0.7,
      interactive: false,
    }).addTo(map);

    // Texto de Entrada y Cajas
    const cajasLabel = L.divIcon({
      className: "custom-leaflet-label",
      html: `
        <div style="color: #94a3b8; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; text-align: center; width: 300px;">
          🛒 LINEA DE CAJAS & ENTRADA PRINCIPAL
        </div>
      `,
      iconSize: [300, 20],
      iconAnchor: [150, 10]
    });
    L.marker([120, 780], { icon: cajasLabel, interactive: false }).addTo(map);

    // Pasillo Central Ancho
    const pasilloCentralBounds = [[220, 100], [280, 1450]];
    L.rectangle(pasilloCentralBounds, {
      color: "#6366f1",
      weight: 1,
      dashArray: "2, 6",
      fillColor: "#6366f1",
      fillOpacity: 0.08,
      interactive: false,
    }).addTo(map);

    const centralLabel = L.divIcon({
      className: "custom-leaflet-label",
      html: `<div style="color: #818cf8; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-align: center; width: 250px;">⚡ PASILLO CENTRAL TRANSVERSAL</div>`,
      iconSize: [250, 15],
      iconAnchor: [125, 7]
    });
    L.marker([250, 780], { icon: centralLabel, interactive: false }).addTo(map);

    const layersGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Renderizar sectores y góndolas en el mapa según el filtro
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    const group = layerGroupRef.current;
    group.clearLayers();

    SECTORES_MAPA.forEach(sec => {
      const matchSeccion = seccionFiltro === "Todas" || sec.seccion === seccionFiltro;
      const isSelected = sectorSeleccionado?.id === sec.id;

      // Dibujar rectángulo del pasillo / sector
      const rect = L.rectangle(sec.bounds, {
        color: isSelected ? "#ec4899" : (matchSeccion ? sec.color : "#475569"),
        weight: isSelected ? 3 : 2,
        fillColor: isSelected ? "#ec4899" : (matchSeccion ? sec.color : "#334155"),
        fillOpacity: isSelected ? 0.45 : (matchSeccion ? 0.25 : 0.08),
        className: "transition-all cursor-pointer",
      });

      // Tooltip al pasar el mouse
      rect.bindTooltip(
        `<strong>${sec.nombre}</strong><br/><span style="font-size: 11px; opacity: 0.8">${sec.seccion}</span>`,
        { sticky: true, className: "leaflet-dark-tooltip" }
      );

      rect.on("click", () => {
        setSectorSeleccionado(sec);
        setGondolaSeleccionada(null);
      });

      group.addLayer(rect);

      // Etiqueta del pasillo
      const centerLat = (sec.bounds[0][0] + sec.bounds[1][0]) / 2;
      const centerLng = (sec.bounds[0][1] + sec.bounds[1][1]) / 2;

      const labelIcon = L.divIcon({
        className: "custom-leaflet-label",
        html: `
          <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid ${sec.color}; color: #f8fafc; font-size: 10px; font-weight: 800; border-radius: 6px; padding: 2px 6px; white-space: nowrap; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.5);">
            ${sec.nombre}
          </div>
        `,
        iconSize: [80, 20],
        iconAnchor: [40, 10]
      });

      const labelMarker = L.marker([centerLat, centerLng], { icon: labelIcon });
      labelMarker.on("click", () => {
        setSectorSeleccionado(sec);
        setGondolaSeleccionada(null);
      });
      group.addLayer(labelMarker);

      // Dibujar puntos de góndolas individuales dentro del pasillo
      sec.gondolas.forEach(g => {
        const isGondolaSelected = gondolaSeleccionada?.id === g.id;
        const gDot = L.circleMarker(g.center, {
          radius: isGondolaSelected ? 8 : 4.5,
          color: isGondolaSelected ? "#ffffff" : sec.color,
          weight: isGondolaSelected ? 3 : 1.5,
          fillColor: isGondolaSelected ? "#a855f7" : "#0f172a",
          fillOpacity: 1,
        });

        gDot.bindTooltip(`Góndola: ${g.nombre}`, { direction: "top", offset: [0, -6] });
        gDot.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          enfocarGondola(sec, g);
        });

        group.addLayer(gDot);
      });
    });
  }, [seccionFiltro, sectorSeleccionado, gondolaSeleccionada]);

  // Enfocar suavemente en una góndola (La magia de flyTo)
  const enfocarGondola = (sec, g, productoEjemplo = null) => {
    setSectorSeleccionado(sec);
    setGondolaSeleccionada(g);

    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Animación suave hacia la coordenada
    map.flyTo(g.center, 0.6, { duration: 1.2 });

    // Quitar marcador anterior si existe
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    // Crear Pin animado
    const pinHtml = `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; animation: bounce 1s infinite alternate;">
        <div style="background: linear-gradient(135deg, #a855f7, #6366f1); color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px #a855f7; border: 2px solid white;">
          <span style="font-size: 18px;">📍</span>
        </div>
        <div style="width: 8px; height: 8px; background: #a855f7; transform: rotate(45deg); margin-top: -4px;"></div>
      </div>
    `;

    const pinIcon = L.divIcon({
      className: "custom-leaflet-pin",
      html: pinHtml,
      iconSize: [36, 44],
      iconAnchor: [18, 44]
    });

    const newMarker = L.marker(g.center, { icon: pinIcon }).addTo(map);

    const popupContent = `
      <div style="padding: 6px; font-family: sans-serif; min-width: 180px;">
        <div style="font-size: 10px; color: #a855f7; font-weight: bold; text-transform: uppercase;">Ubicación Exacta</div>
        <div style="font-size: 13px; font-weight: 800; color: #1e293b; margin-top: 2px;">${sec.nombre}</div>
        <div style="font-size: 11px; color: #64748b; font-weight: 600;">${g.nombre}</div>
        ${productoEjemplo ? `
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 18px;">📦</span>
            <div>
              <div style="font-size: 11px; font-weight: bold; color: #0f172a;">${productoEjemplo.nombre}</div>
              <div style="font-size: 9px; color: #64748b;">SKU: ${productoEjemplo.sku}</div>
            </div>
          </div>
        ` : ""}
      </div>
    `;

    newMarker.bindPopup(popupContent).openPopup();
    markerRef.current = newMarker;
  };

  // Simular la acción automática al guardar un producto
  const simularGuardadoProducto = (item) => {
    // Buscar el sector y góndola destino
    const sec = SECTORES_MAPA.find(s => s.id === item.sectorId);
    if (!sec) return;
    const g = sec.gondolas[item.gondolaIdx] || sec.gondolas[0];
    enfocarGondola(sec, g, item);
  };

  const seccionesDisponibles = ["Todas", "Botillería", "Abarrotes", "Carnicería", "Fiambrería", "Lácteos", "Aseo y Limpieza"];

  return (
    <div className="space-y-4 animate-fadeIn">
      
      {/* Barra de Controles y Demostración */}
      <div className={`p-4 sm:p-5 rounded-3xl border ${t.border} ${t.bgCard} shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4`}>
        
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <h2 className={`text-base sm:text-lg font-black ${t.text} flex items-center gap-2`}>
              <span>Mapa Interactivo de Góndolas (Modo Prueba Leaflet)</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                L.CRS.Simple
              </span>
            </h2>
          </div>
          <p className={`text-xs ${t.textSecondary} mt-0.5`}>
            Haz zoom, arrastra el mapa o prueba los botones para ver cómo la app enfoca e ilumina automáticamente la góndola al guardar.
          </p>
        </div>

        {/* Simulador rápido de guardado */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-bold ${t.textSecondary} hidden sm:inline`}>Simular guardado:</span>
          
          <button
            onClick={() => simularGuardadoProducto({
              nombre: "Pisco Mistral 35° 1L",
              sku: "2064723",
              sectorId: "pasillo-15d",
              gondolaIdx: 1
            })}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600/20 text-purple-300 hover:bg-purple-600 hover:text-white border border-purple-500/40 transition-all flex items-center gap-1.5"
          >
            <span>🍾 Pisco en Pasillo 15-D</span>
          </button>

          <button
            onClick={() => simularGuardadoProducto({
              nombre: "Galletas Tritón Vainilla 126g",
              sku: "1098234",
              sectorId: "pasillo-7d",
              gondolaIdx: 0
            })}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white border border-blue-500/40 transition-all flex items-center gap-1.5"
          >
            <span>🍪 Galletas en Pasillo 7-D</span>
          </button>

          <button
            onClick={() => simularGuardadoProducto({
              nombre: "Tiras de Pollo Asado 800g",
              sku: "1645136",
              sectorId: "carniceria",
              gondolaIdx: 1
            })}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600/20 text-red-300 hover:bg-red-600 hover:text-white border border-red-500/40 transition-all flex items-center gap-1.5"
          >
            <span>🍗 Pollo en Carnicería</span>
          </button>
        </div>

      </div>

      {/* Filtros de Secciones del Plano */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <span className={`text-xs font-bold ${t.textSecondary} shrink-0`}>Ver zona:</span>
        {seccionesDisponibles.map(sec => (
          <button
            key={sec}
            onClick={() => {
              setSeccionFiltro(sec);
              if (sec === "Todas") {
                mapInstanceRef.current?.fitBounds(mapBounds);
              } else {
                const primerSector = SECTORES_MAPA.find(s => s.seccion === sec);
                if (primerSector && mapInstanceRef.current) {
                  mapInstanceRef.current.flyToBounds(primerSector.bounds, { padding: [80, 80] });
                }
              }
            }}
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

      {/* Contenedor del Mapa Leaflet */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Visor de Mapa */}
        <div className="lg:col-span-3">
          <div 
            className={`rounded-3xl border ${t.border} overflow-hidden shadow-2xl relative bg-slate-950`}
            style={{ height: "580px" }}
          >
            <div 
              ref={mapContainerRef} 
              className="w-full h-full z-10"
              style={{ background: "#090d16" }}
            />

            {/* Controles de vista rápida en esquina */}
            <div className="absolute top-4 right-4 z-20 flex gap-2">
              <button
                onClick={() => {
                  mapInstanceRef.current?.fitBounds(mapBounds);
                  setSectorSeleccionado(null);
                  setGondolaSeleccionada(null);
                  if (markerRef.current) {
                    mapInstanceRef.current?.removeLayer(markerRef.current);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold border border-white/10 shadow-lg backdrop-blur-md flex items-center gap-1.5"
                title="Ver todo el supermercado"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>crop_free</span>
                <span>Restablecer Vista</span>
              </button>
            </div>
          </div>
        </div>

        {/* Panel Lateral de Información de la Góndola */}
        <div className="lg:col-span-1 space-y-4">
          <div className={`p-5 rounded-3xl border ${t.border} ${t.bgCard} shadow-lg h-full flex flex-col justify-between`}>
            <div>
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
                <span className="material-symbols-outlined text-purple-400" style={{ fontSize: 22 }}>shelves</span>
                <h3 className={`font-black text-sm ${t.text}`}>Detalle de la Ubicación</h3>
              </div>

              {sectorSeleccionado ? (
                <div className="space-y-3 animate-fadeIn">
                  <div>
                    <span className="text-[10px] font-extrabold text-purple-400 uppercase tracking-wider">
                      {sectorSeleccionado.seccion} &bull; {sectorSeleccionado.tipo}
                    </span>
                    <h4 className={`text-lg font-black ${t.text}`}>{sectorSeleccionado.nombre}</h4>
                  </div>

                  {gondolaSeleccionada ? (
                    <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1.5">
                      <div className="text-[10px] font-bold text-purple-300 uppercase">Góndola Seleccionada</div>
                      <div className={`text-sm font-black ${t.text}`}>{gondolaSeleccionada.nombre}</div>
                      <p className={`text-[11px] ${t.textSecondary}`}>
                        Coordenadas del plano: X: {gondolaSeleccionada.center[1]}, Y: {gondolaSeleccionada.center[0]}
                      </p>
                    </div>
                  ) : (
                    <p className={`text-xs ${t.textSecondary}`}>
                      Toca un punto de góndola en el mapa para ver la posición exacta.
                    </p>
                  )}

                  <div className="pt-2">
                    <span className={`text-[11px] font-bold ${t.textSecondary} block mb-1.5`}>
                      Góndolas en este pasillo:
                    </span>
                    <div className="space-y-1">
                      {sectorSeleccionado.gondolas.map(g => (
                        <button
                          key={g.id}
                          onClick={() => enfocarGondola(sectorSeleccionado, g)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-between ${
                            gondolaSeleccionada?.id === g.id
                              ? "bg-purple-600 text-white border-purple-400 font-bold shadow-md"
                              : `${t.bgInput} ${t.text} ${t.border} hover:border-purple-500/40`
                          }`}
                        >
                          <span className="truncate">{g.nombre}</span>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-2">
                  <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 40 }}>touch_app</span>
                  <p className={`text-xs ${t.textSecondary}`}>
                    Toca cualquier pasillo o góndola en el mapa interactivo para ver su información y productos asociados.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/5 text-[11px] text-slate-400 space-y-1">
              <p>💡 <strong>¿Cómo se vincula?</strong></p>
              <p>Al guardar un producto con <em>"Pasillo 15-D Góndola 2"</em>, el sistema llama directamente a <code>map.flyTo()</code> enfocando el estante en milisegundos.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}