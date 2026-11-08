import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import { db } from "../firebase/config";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import defaultLayoutData from "../data/supermercado_exact_layout.json";

// Colores oficiales por sección
const SECCION_COLORES = {
  "Abarrotes": "#3b82f6",
  "Botillería": "#a855f7",
  "Carnicería": "#ef4444",
  "Fiambrería": "#eab308",
  "Pescadería": "#0284c7",
  "Lácteos": "#06b6d4",
  "Aseo y Limpieza": "#8b5cf6",
  "Panadería": "#f97316",
  "Pastelería": "#ec4899",
  "Verdulería": "#22c55e",
  "Mundo Bio": "#84cc16",
  "Mascotas": "#14b8a6",
  "Menaje y Hogar": "#f97316",
  "Perfumería": "#ec4899",
  "Cajas": "#10b981",
  "Pasillo Central": "#22c55e",
  "Servicios": "#06b6d4",
  "General": "#64748b"
};

const SECCIONES_LISTA = Object.keys(SECCION_COLORES);

const getSeccionColor = (seccion) => {
  if (!seccion) return SECCION_COLORES.General;
  return SECCION_COLORES[seccion] || SECCION_COLORES.General;
};

// Normalizar código de pasillo (ej: "Pasillo 14-A" -> "14A", "16C" -> "16C", "5-D" -> "5D")
const extraerCodigoPasillo = (texto) => {
  if (!texto) return null;
  const match = String(texto).match(/(\d+)[\s-_]*([A-Da-d])/);
  if (match) return (match[1] + match[2]).toUpperCase();
  const matchSingle = String(texto).match(/(\d+[A-Da-d])/);
  if (matchSingle) return matchSingle[1].toUpperCase();
  return null;
};

export default function MapaSupermercadoLeaflet({
  productos = [],
  sectores = [],
  categorias = [],
  productoEnfocado = null,
  onVerProducto = null
}) {
  const { t } = useTheme();
  const containerRef = useRef(null);

  // Modos: "interactivo" (vista cliente/personal con búsqueda y radar) o "editor" (constructor visual)
  const [modo, setModo] = useState("editor");

  // Elementos del plano (Góndolas, Zonas, Corredores)
  const [elementos, setElementos] = useState([]);
  const [cargandoPlano, setCargandoPlano] = useState(true);
  const [guardandoPlano, setGuardandoPlano] = useState(false);

  // Configuración del Lienzo (Canvas)
  const [canvasWidth, setCanvasWidth] = useState(2400);
  const [canvasHeight, setCanvasHeight] = useState(1200);
  const [snapGrid, setSnapGrid] = useState(20); // 10, 20, 40 o 0 (desactivado)
  const [mostrarGrid, setMostrarGrid] = useState(true);

  // Navegación en el Lienzo (Pan y Zoom)
  const [zoom, setZoom] = useState(0.55);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const canvasWidthRef = useRef(canvasWidth);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    canvasWidthRef.current = canvasWidth;
  }, [canvasWidth]);

  // Selección y Manipulación en el Editor (soporta Selección Múltiple)
  const [seleccionIds, setSeleccionIds] = useState([]);
  const seleccionId = seleccionIds.length === 1 ? seleccionIds[0] : (seleccionIds[0] || null);
  const setSeleccionId = useCallback((id) => {
    setSeleccionIds(id ? [id] : []);
  }, []);
  const [draggingAction, setDraggingAction] = useState(null); // 'move' | 'resize-se' | 'resize-nw' | 'resize-e' | 'resize-s' | etc.
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, targetElemId: null, elemX: 0, elemY: 0, elemW: 0, elemH: 0, initialElements: [] });
  const [marqueeBox, setMarqueeBox] = useState(null); // { startX, startY, currentX, currentY }

  // Portapapeles (Copiar y Pegar)
  const [portapapeles, setPortapapeles] = useState(null);
  const pasteCountRef = useRef(0);

  // Historial de cambios (Undo / Redo)
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const historyIdxRef = useRef(-1);

  useEffect(() => {
    historyIdxRef.current = historyIdx;
  }, [historyIdx]);

  // Función robusta para registrar estado en historial (Undo/Redo)
  const pushHistory = useCallback((newElems) => {
    if (!newElems || !Array.isArray(newElems)) return;
    setHistory(prev => {
      const currentIdx = historyIdxRef.current;
      const validIdx = Math.max(-1, Math.min(currentIdx, prev.length - 1));
      const cut = validIdx >= 0 ? prev.slice(0, validIdx + 1) : [];
      const updated = [...cut, JSON.stringify(newElems)];
      
      // Limitar historial a un máximo de 40 estados
      while (updated.length > 40) {
        updated.shift();
      }

      const newIdx = updated.length - 1;
      historyIdxRef.current = newIdx;
      setHistoryIdx(newIdx);
      return updated;
    });
  }, []);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (!prev || prev.length === 0) return prev;
      const currentIdx = Math.min(historyIdxRef.current, prev.length - 1);
      if (currentIdx > 0) {
        const targetIdx = currentIdx - 1;
        const entry = prev[targetIdx];
        if (entry) {
          try {
            const targetState = JSON.parse(entry);
            if (Array.isArray(targetState)) {
              setElementos(targetState);
              setSeleccionIds([]); // Limpiar selección para evitar IDs inexistentes
              historyIdxRef.current = targetIdx;
              setHistoryIdx(targetIdx);
              toast("Deshecho", { icon: "↩️", duration: 1200 });
            }
          } catch (err) {
            console.warn("Error en undo parse:", err);
          }
        }
      }
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(prev => {
      if (!prev || prev.length === 0) return prev;
      const currentIdx = Math.max(0, Math.min(historyIdxRef.current, prev.length - 1));
      if (currentIdx < prev.length - 1) {
        const targetIdx = currentIdx + 1;
        const entry = prev[targetIdx];
        if (entry) {
          try {
            const targetState = JSON.parse(entry);
            if (Array.isArray(targetState)) {
              setElementos(targetState);
              setSeleccionIds([]);
              historyIdxRef.current = targetIdx;
              setHistoryIdx(targetIdx);
              toast("Rehecho", { icon: "↪️", duration: 1200 });
            }
          } catch (err) {
            console.warn("Error en redo parse:", err);
          }
        }
      }
      return prev;
    });
  }, []);

  // Búsqueda y Spotlight en Modo Interactivo
  const [busqueda, setBusqueda] = useState("");
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [spotlightActivo, setSpotlightActivo] = useState(null);
  const [pasilloDetalle, setPasilloDetalle] = useState(null);

  // Modo Pantalla Completa
  const [pantallaCompleta, setPantallaCompleta] = useState(false);

  // Cargar plano guardado de Firebase Firestore (o LocalStorage / inicial)
  useEffect(() => {
    const cargarPlano = async () => {
      setCargandoPlano(true);
      try {
        const CURRENT_RESET_KEY = "mapa_v_sector_c_and_b_113_v1";
        const targetList = defaultLayoutData.elementos || [];
        const targetWidth = defaultLayoutData.width || 1950;
        const targetHeight = defaultLayoutData.height || 1350;

        // Si es la primera vez con la nueva versión unificada (113 elementos)
        if (localStorage.getItem(CURRENT_RESET_KEY) !== "done") {
          localStorage.removeItem("mapa_supermercado_diseno_local");
          localStorage.setItem(CURRENT_RESET_KEY, "done");
          setElementos(targetList);
          setCanvasWidth(targetWidth);
          setCanvasHeight(targetHeight);
          pushHistory(targetList);

          // Sincronizar inmediatamente a Firestore para que persista en la nube
          try {
            await setDoc(doc(db, "auditoria_sectores", "_diseno_mapa_"), {
              elementos: targetList,
              width: targetWidth,
              height: targetHeight,
              updatedAt: serverTimestamp()
            }, { merge: true });
          } catch (e) {
            console.warn("Error guardando layout unificado inicial en Firestore:", e);
          }
          return;
        }

        // 1. Intentar cargar desde Firestore
        const snap = await getDoc(doc(db, "auditoria_sectores", "_diseno_mapa_"));
        if (snap.exists() && snap.data()?.elementos && snap.data().elementos.length > 0) {
          const data = snap.data();
          // Si los elementos en Firestore son menores que el layout completo (p. ej. quedaron los 66 anteriores)
          // actualizamos automáticamente a los 113 elementos completos
          if (data.elementos.length < targetList.length) {
            setElementos(targetList);
            setCanvasWidth(targetWidth);
            setCanvasHeight(targetHeight);
            pushHistory(targetList);
            try {
              await setDoc(doc(db, "auditoria_sectores", "_diseno_mapa_"), {
                elementos: targetList,
                width: targetWidth,
                height: targetHeight,
                updatedAt: serverTimestamp()
              }, { merge: true });
            } catch (e) {
              console.warn(e);
            }
            return;
          }

          setElementos(data.elementos || []);
          if (data.width) setCanvasWidth(data.width);
          if (data.height) setCanvasHeight(data.height);
          pushHistory(data.elementos || []);
          return;
        }

        // 2. Intentar cargar desde LocalStorage
        const local = localStorage.getItem("mapa_supermercado_diseno_local");
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length >= targetList.length) {
              setElementos(parsed);
              pushHistory(parsed);
              return;
            }
          } catch (e) {
            console.warn("Error leyendo localstorage", e);
          }
        }

        // 3. Fallback: cargar plano unificado completo
        setElementos(targetList);
        setCanvasWidth(targetWidth);
        setCanvasHeight(targetHeight);
        pushHistory(targetList);
      } catch (err) {
        console.warn("Plano inicializado:", err);
        const fallback = defaultLayoutData.elementos || [];
        setElementos(fallback);
      } finally {
        setCargandoPlano(false);
      }
    };

    cargarPlano();
  }, [pushHistory]);

  // Convertir layout por defecto a elementos editables
  const cargarPlantillaInicial = async () => {
    const list = defaultLayoutData.elementos || [];
    const w = defaultLayoutData.width || 1950;
    const h = defaultLayoutData.height || 1350;
    setElementos(list);
    setCanvasWidth(w);
    setCanvasHeight(h);
    pushHistory(list);
    try {
      await setDoc(doc(db, "auditoria_sectores", "_diseno_mapa_"), {
        elementos: list,
        width: w,
        height: h,
        updatedAt: serverTimestamp()
      }, { merge: true });
      localStorage.setItem("mapa_supermercado_diseno_local", JSON.stringify(list));
    } catch (e) {
      console.warn("Error sync plantilla:", e);
    }
    toast.success("Plano unificado del supermercado cargado");
  };

  // Guardar plano en Firebase Firestore
  const guardarPlanoEnFirestore = async () => {
    setGuardandoPlano(true);
    const toastId = toast.loading("Guardando plano del supermercado...");
    try {
      await setDoc(doc(db, "auditoria_sectores", "_diseno_mapa_"), {
        width: canvasWidth,
        height: canvasHeight,
        elementos,
        updatedAt: serverTimestamp()
      }, { merge: true });

      localStorage.setItem("mapa_supermercado_diseno_local", JSON.stringify(elementos));
      toast.success("¡Plano guardado exitosamente en el servidor!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar el plano en la nube", { id: toastId });
    } finally {
      setGuardandoPlano(false);
    }
  };

  // Vaciar lienzo para empezar de 0
  const vaciarLienzo = async () => {
    if (!window.confirm("¿Estás seguro de que deseas vaciar el lienzo y empezar desde cero?")) return;
    setElementos([]);
    setSeleccionId(null);
    setPasilloDetalle(null);
    setSpotlightActivo(null);
    pushHistory([]);
    try {
      await setDoc(doc(db, "auditoria_sectores", "_diseno_mapa_"), {
        elementos: [],
        width: canvasWidth,
        height: canvasHeight,
        updatedAt: serverTimestamp()
      }, { merge: true });
      localStorage.removeItem("mapa_supermercado_diseno_local");
    } catch (e) {
      console.warn(e);
    }
    toast("Lienzo vaciado por completo", { icon: "✨" });
  };

  // Aplicar ajuste de imán (Snap to Grid)
  const snap = useCallback((val) => {
    if (!snapGrid || snapGrid <= 0) return Math.round(val);
    return Math.round(val / snapGrid) * snapGrid;
  }, [snapGrid]);

  // Agregar nuevo elemento al centro de la vista
  const agregarElemento = (tipo = "gondola_h") => {
    const centerViewX = snap((-pan.x + 400) / zoom);
    const centerViewY = snap((-pan.y + 300) / zoom);

    let nuevo = null;
    const nuevoId = `elem_${Date.now()}`;

    if (tipo === "gondola_h") {
      nuevo = {
        id: nuevoId,
        tipo: "gondola",
        nombre: `Pasillo Nuevo`,
        codigo: "",
        seccion: "Abarrotes",
        desc: "Descripción de productos",
        x: centerViewX,
        y: centerViewY,
        w: snap(320),
        h: snap(36),
        color: SECCION_COLORES.Abarrotes,
        borde: "#1e293b"
      };
    } else if (tipo === "gondola_v") {
      nuevo = {
        id: nuevoId,
        tipo: "gondola",
        nombre: `Pasillo Nuevo`,
        codigo: "",
        seccion: "Abarrotes",
        desc: "Descripción de productos",
        x: centerViewX,
        y: centerViewY,
        w: snap(36),
        h: snap(320),
        color: SECCION_COLORES.Abarrotes,
        borde: "#1e293b"
      };
    } else if (tipo === "zona") {
      nuevo = {
        id: nuevoId,
        tipo: "zona",
        nombre: `Nueva Sección`,
        codigo: "",
        seccion: "General",
        desc: "Área especial del local",
        x: centerViewX,
        y: centerViewY,
        w: snap(240),
        h: snap(160),
        color: "#1e293b",
        borde: "#3b82f6"
      };
    } else if (tipo === "pasillo") {
      nuevo = {
        id: nuevoId,
        tipo: "pasillo",
        nombre: `Pasillo Peatonal`,
        codigo: "",
        seccion: "Pasillo Central",
        desc: "Corredor de tránsito libre",
        x: centerViewX,
        y: centerViewY,
        w: snap(600),
        h: snap(60),
        color: "#dcfce7",
        borde: "#22c55e"
      };
    }

    if (nuevo) {
      const next = [...elementos, nuevo];
      setElementos(next);
      setSeleccionId(nuevoId);
      pushHistory(next);
      toast.success(`+ ${nuevo.nombre} agregado`);
    }
  };

  // Copiar elemento(s) seleccionado(s) al portapapeles
  const copiarSeleccionado = useCallback(() => {
    if (seleccionIds.length === 0) return;
    const seleccionados = elementos.filter(e => seleccionIds.includes(e.id));
    if (seleccionados.length === 0) return;
    setPortapapeles(JSON.parse(JSON.stringify(seleccionados)));
    pasteCountRef.current = 0;
    toast.success(
      seleccionados.length === 1
        ? `Copiado: ${seleccionados[0].nombre || seleccionados[0].id}`
        : `Copiados ${seleccionados.length} módulos seleccionados`,
      { icon: "📋", duration: 1500 }
    );
  }, [seleccionIds, elementos]);

  // Pegar elemento(s) desde el portapapeles
  const pegarElemento = useCallback(() => {
    if (!portapapeles || (Array.isArray(portapapeles) && portapapeles.length === 0)) {
      toast("El portapapeles está vacío. Selecciona uno o varios módulos y cópialos con Ctrl+C.", { icon: "ℹ️", duration: 2000 });
      return;
    }
    const lista = Array.isArray(portapapeles) ? portapapeles : [portapapeles];
    pasteCountRef.current += 1;
    const offset = snap(24 * pasteCountRef.current);

    const nuevosElementos = lista.map((elem, idx) => {
      const nuevoId = `elem_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
      return {
        ...JSON.parse(JSON.stringify(elem)),
        id: nuevoId,
        x: Math.min(canvasWidth - (elem.w || 40), Math.max(0, snap(elem.x + offset))),
        y: Math.min(canvasHeight - (elem.h || 40), Math.max(0, snap(elem.y + offset)))
      };
    });

    const next = [...elementos, ...nuevosElementos];
    setElementos(next);
    setSeleccionIds(nuevosElementos.map(n => n.id));
    pushHistory(next);
    toast.success(
      nuevosElementos.length === 1
        ? `Pegado: ${nuevosElementos[0].nombre || nuevosElementos[0].id}`
        : `Pegados ${nuevosElementos.length} módulos en bloque`,
      { icon: "📋" }
    );
  }, [portapapeles, canvasWidth, canvasHeight, elementos, pushHistory, snap]);

  // Duplicar elemento(s) seleccionado(s) en cualquiera de las 4 direcciones
  const duplicarSeleccionado = useCallback((direccion = "abajo") => {
    if (seleccionIds.length === 0) return;
    const seleccionados = elementos.filter(e => seleccionIds.includes(e.id));
    if (seleccionados.length === 0) return;

    // Bounding box global del grupo seleccionado para calcular desplazamiento en bloque
    const minX = Math.min(...seleccionados.map(e => e.x));
    const maxX = Math.max(...seleccionados.map(e => e.x + e.w));
    const minY = Math.min(...seleccionados.map(e => e.y));
    const maxY = Math.max(...seleccionados.map(e => e.y + e.h));
    const totalW = maxX - minX;
    const totalH = maxY - minY;

    let deltaX = 0;
    let deltaY = 0;
    if (direccion === "abajo") deltaY = snap(totalH + 10);
    else if (direccion === "arriba") deltaY = -snap(totalH + 10);
    else if (direccion === "derecha") deltaX = snap(totalW + 10);
    else if (direccion === "izquierda") deltaX = -snap(totalW + 10);

    const nuevos = seleccionados.map((elem, idx) => ({
      ...JSON.parse(JSON.stringify(elem)),
      id: `elem_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      x: Math.min(canvasWidth - elem.w, Math.max(0, snap(elem.x + deltaX))),
      y: Math.min(canvasHeight - elem.h, Math.max(0, snap(elem.y + deltaY)))
    }));

    const next = [...elementos, ...nuevos];
    setElementos(next);
    setSeleccionIds(nuevos.map(n => n.id));
    pushHistory(next);
    toast.success(
      nuevos.length === 1
        ? `Duplicado: ${nuevos[0].nombre || nuevos[0].id}`
        : `Duplicados ${nuevos.length} módulos hacia ${direccion}`
    );
  }, [seleccionIds, elementos, canvasWidth, canvasHeight, pushHistory, snap]);

  // Eliminar elemento(s) seleccionado(s)
  const eliminarSeleccionado = useCallback(() => {
    if (seleccionIds.length === 0) return;
    const count = seleccionIds.length;
    const next = elementos.filter(e => !seleccionIds.includes(e.id));
    setElementos(next);
    setSeleccionIds([]);
    pushHistory(next);
    toast(count === 1 ? "Elemento eliminado" : `${count} elementos eliminados`, { icon: "🗑️" });
  }, [seleccionIds, elementos, pushHistory]);

  // Atajos de teclado (Supr, Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+D, Ctrl+Z, Ctrl+Y, Alt+Flechas)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorar si el usuario está escribiendo en un input
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

      if (e.key === "Escape" && pantallaCompleta) {
        e.preventDefault();
        setPantallaCompleta(false);
        return;
      }

      const isModifier = e.ctrlKey || e.metaKey;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (seleccionIds.length > 0 && modo === "editor") {
          e.preventDefault();
          eliminarSeleccionado();
        }
      } else if (isModifier && e.key.toLowerCase() === "a") {
        if (modo === "editor") {
          e.preventDefault();
          setSeleccionIds(elementos.map(el => el.id));
          toast(`Seleccionados ${elementos.length} elementos del plano`, { icon: "📦", duration: 1500 });
        }
      } else if (isModifier && e.key.toLowerCase() === "c") {
        if (seleccionIds.length > 0 && modo === "editor") {
          e.preventDefault();
          copiarSeleccionado();
        }
      } else if (isModifier && e.key.toLowerCase() === "v") {
        if (modo === "editor") {
          e.preventDefault();
          pegarElemento();
        }
      } else if (isModifier && e.key.toLowerCase() === "d") {
        if (seleccionIds.length > 0 && modo === "editor") {
          e.preventDefault();
          if (e.shiftKey) {
            duplicarSeleccionado("arriba");
          } else {
            duplicarSeleccionado("abajo");
          }
        }
      } else if (e.altKey && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        if (seleccionIds.length > 0 && modo === "editor") {
          e.preventDefault();
          const dirMap = {
            ArrowUp: "arriba",
            ArrowDown: "abajo",
            ArrowLeft: "izquierda",
            ArrowRight: "derecha"
          };
          duplicarSeleccionado(dirMap[e.key]);
        }
      } else if (isModifier && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (isModifier && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [seleccionIds, modo, elementos, historyIdx, portapapeles, copiarSeleccionado, pegarElemento, duplicarSeleccionado, eliminarSeleccionado, pantallaCompleta, redo, undo]);

  // Manejo de Drag & Drop y Resize en el Canvas (con soporte de arrastre en grupo)
  const handleMouseDownElement = (e, elemId, action = "move") => {
    if (modo !== "editor") return;
    e.stopPropagation();

    const isMultiKey = e.shiftKey || e.ctrlKey || e.metaKey;
    let nextSelection = [...seleccionIds];

    if (isMultiKey) {
      if (nextSelection.includes(elemId)) {
        nextSelection = nextSelection.filter(id => id !== elemId);
      } else {
        nextSelection.push(elemId);
      }
      setSeleccionIds(nextSelection);
    } else {
      if (!nextSelection.includes(elemId)) {
        nextSelection = [elemId];
        setSeleccionIds([elemId]);
      }
    }

    setDraggingAction(action);

    const targetElem = elementos.find(el => el.id === elemId);
    if (!targetElem) return;

    const selectedList = elementos.filter(el => nextSelection.includes(el.id));
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      targetElemId: elemId,
      elemX: targetElem.x,
      elemY: targetElem.y,
      elemW: targetElem.w,
      elemH: targetElem.h,
      initialElements: selectedList.map(el => ({
        id: el.id,
        x: el.x,
        y: el.y,
        w: el.w,
        h: el.h
      }))
    };
  };

  const handleMouseMove = (e) => {
    // Si estamos haciendo Panning (mover el lienzo con el mouse)
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
      return;
    }

    // Si estamos haciendo Selección por Caja (Marquee drag con Shift)
    if (marqueeBox) {
      const rect = containerRef.current?.getBoundingClientRect();
      const mouseCanvasX = (e.clientX - (rect?.left || 0) - pan.x) / zoom;
      const mouseCanvasY = (e.clientY - (rect?.top || 0) - pan.y) / zoom;
      setMarqueeBox(prev => prev ? { ...prev, currentX: mouseCanvasX, currentY: mouseCanvasY } : null);

      const x1 = Math.min(marqueeBox.startX, mouseCanvasX);
      const x2 = Math.max(marqueeBox.startX, mouseCanvasX);
      const y1 = Math.min(marqueeBox.startY, mouseCanvasY);
      const y2 = Math.max(marqueeBox.startY, mouseCanvasY);

      const intersectados = elementos.filter(elem => {
        return elem.x < x2 && (elem.x + elem.w) > x1 && elem.y < y2 && (elem.y + elem.h) > y1;
      }).map(elem => elem.id);

      setSeleccionIds(intersectados);
      return;
    }

    // Si estamos moviendo o redimensionando elemento(s)
    if (draggingAction && seleccionIds.length > 0) {
      const dx = (e.clientX - dragStartRef.current.mouseX) / zoom;
      const dy = (e.clientY - dragStartRef.current.mouseY) / zoom;

      // Movimiento en bloque de todos los módulos seleccionados
      if (draggingAction === "move") {
        const initList = dragStartRef.current.initialElements || [];
        setElementos(prev => prev.map(el => {
          const init = initList.find(i => i.id === el.id);
          if (!init) return el;
          return {
            ...el,
            x: Math.min(canvasWidth - init.w, Math.max(0, snap(init.x + dx))),
            y: Math.min(canvasHeight - init.h, Math.max(0, snap(init.y + dy)))
          };
        }));
        return;
      }

      // Redimensionamiento individual
      const targetId = dragStartRef.current.targetElemId || seleccionIds[0];
      setElementos(prev => prev.map(el => {
        if (el.id !== targetId) return el;

        if (draggingAction === "resize-se") {
          return {
            ...el,
            w: Math.max(snapGrid || 10, snap(dragStartRef.current.elemW + dx)),
            h: Math.max(snapGrid || 10, snap(dragStartRef.current.elemH + dy))
          };
        } else if (draggingAction === "resize-e") {
          return {
            ...el,
            w: Math.max(snapGrid || 10, snap(dragStartRef.current.elemW + dx))
          };
        } else if (draggingAction === "resize-s") {
          return {
            ...el,
            h: Math.max(snapGrid || 10, snap(dragStartRef.current.elemH + dy))
          };
        } else if (draggingAction === "resize-w") {
          const newW = Math.max(snapGrid || 10, snap(dragStartRef.current.elemW - dx));
          const newX = snap(dragStartRef.current.elemX + (dragStartRef.current.elemW - newW));
          return { ...el, x: newX, w: newW };
        } else if (draggingAction === "resize-n") {
          const newH = Math.max(snapGrid || 10, snap(dragStartRef.current.elemH - dy));
          const newY = snap(dragStartRef.current.elemY + (dragStartRef.current.elemH - newH));
          return { ...el, y: newY, h: newH };
        } else if (draggingAction === "resize-nw") {
          const newW = Math.max(snapGrid || 10, snap(dragStartRef.current.elemW - dx));
          const newX = snap(dragStartRef.current.elemX + (dragStartRef.current.elemW - newW));
          const newH = Math.max(snapGrid || 10, snap(dragStartRef.current.elemH - dy));
          const newY = snap(dragStartRef.current.elemY + (dragStartRef.current.elemH - newH));
          return { ...el, x: newX, y: newY, w: newW, h: newH };
        } else if (draggingAction === "resize-ne") {
          const newW = Math.max(snapGrid || 10, snap(dragStartRef.current.elemW + dx));
          const newH = Math.max(snapGrid || 10, snap(dragStartRef.current.elemH - dy));
          const newY = snap(dragStartRef.current.elemY + (dragStartRef.current.elemH - newH));
          return { ...el, y: newY, w: newW, h: newH };
        } else if (draggingAction === "resize-sw") {
          const newW = Math.max(snapGrid || 10, snap(dragStartRef.current.elemW - dx));
          const newX = snap(dragStartRef.current.elemX + (dragStartRef.current.elemW - newW));
          const newH = Math.max(snapGrid || 10, snap(dragStartRef.current.elemH + dy));
          return { ...el, x: newX, w: newW, h: newH };
        }
        return el;
      }));
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (marqueeBox) {
      setMarqueeBox(null);
    }
    if (draggingAction) {
      setDraggingAction(null);
      setElementos(current => {
        pushHistory(current);
        return current;
      });
    }
  };

  // Manejo de clic en fondo del lienzo (Deselección y Selección Marquee con Shift)
  const handleMouseDownCanvas = (e) => {
    // Si presiona Shift en modo editor al hacer clic en fondo, inicia Marquee selection
    if (modo === "editor" && e.shiftKey) {
      const rect = containerRef.current?.getBoundingClientRect();
      const mouseCanvasX = (e.clientX - (rect?.left || 0) - pan.x) / zoom;
      const mouseCanvasY = (e.clientY - (rect?.top || 0) - pan.y) / zoom;
      setMarqueeBox({
        startX: mouseCanvasX,
        startY: mouseCanvasY,
        currentX: mouseCanvasX,
        currentY: mouseCanvasY
      });
      return;
    }

    // Clic en el fondo deselecciona si no se presiona Shift o Ctrl
    if (e.target.tagName === "svg" || e.target.id === "canvas-bg") {
      if (!e.shiftKey && !e.ctrlKey) {
        setSeleccionIds([]);
        setPasilloDetalle(null);
      }
    }

    // Panning con clic primario en fondo o botón del medio
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y
      };
    }
  };

  // Zoom con rueda del ratón y gestos táctiles (Pinch to Zoom & Pan con 1 o 2 dedos en móvil)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Zoom con rueda del ratón en escritorio
    const onWheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom(prev => Math.min(2.5, Math.max(0.2, prev * zoomFactor)));
    };

    // Gestos Touch en dispositivos móviles / tabletas
    let touchStartDist = 0;
    let touchStartZoom = 1;
    let touchStartPan = { x: 0, y: 0 };
    let isTouchingMap = false;

    const onTouchStart = (e) => {
      // 2 dedos: Pinch to Zoom
      if (e.touches.length === 2) {
        e.preventDefault();
        isTouchingMap = true;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        touchStartZoom = zoomRef.current;
        return;
      }

      // 1 dedo: Mover el mapa (Pan)
      if (e.touches.length === 1) {
        const target = e.target;
        const isMapSurface = target.tagName === "svg" || 
                             target.id === "canvas-bg" || 
                             target.getAttribute("id") === "canvas-bg" ||
                             target.tagName === "pattern" ||
                             (target.tagName === "rect" && !target.classList.contains("cursor-pointer"));
        
        if (isMapSurface) {
          e.preventDefault();
          isTouchingMap = true;
          const t1 = e.touches[0];
          touchStartPan = {
            x: t1.clientX - panRef.current.x,
            y: t1.clientY - panRef.current.y
          };
        }
      }
    };

    const onTouchMove = (e) => {
      if (!isTouchingMap) return;

      // 2 dedos: Pellizcar para hacer zoom (Pinch to zoom)
      if (e.touches.length === 2 && touchStartDist > 0) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const factor = currentDist / touchStartDist;
        const newZoom = Math.min(2.5, Math.max(0.2, touchStartZoom * factor));
        setZoom(newZoom);
        return;
      }

      // 1 dedo: Desplazamiento del plano (Pan)
      if (e.touches.length === 1) {
        e.preventDefault();
        const t1 = e.touches[0];
        setPan({
          x: t1.clientX - touchStartPan.x,
          y: t1.clientY - touchStartPan.y
        });
      }
    };

    const onTouchEnd = (e) => {
      if (e.touches.length === 0) {
        isTouchingMap = false;
        touchStartDist = 0;
      } else if (e.touches.length === 1) {
        const t1 = e.touches[0];
        touchStartPan = {
          x: t1.clientX - panRef.current.x,
          y: t1.clientY - panRef.current.y
        };
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  // Actualizar propiedades del elemento seleccionado desde el Inspector
  const updateElemento = (field, value) => {
    if (!seleccionId) return;
    setElementos(prev => {
      const next = prev.map(el => {
        if (el.id !== seleccionId) return el;
        const updated = { ...el, [field]: value };
        // Si cambia la sección, sugerir su color oficial si no se ha cambiado a mano
        if (field === "seccion" && SECCION_COLORES[value]) {
          updated.color = SECCION_COLORES[value];
        }
        // Si cambia el nombre, extraer código si aplica
        if (field === "nombre") {
          const cod = extraerCodigoPasillo(value);
          if (cod) updated.codigo = cod;
        }
        return updated;
      });
      pushHistory(next);
      return next;
    });
  };

  const elementoSeleccionado = useMemo(() => {
    return seleccionIds.length === 1 ? elementos.find(e => e.id === seleccionIds[0]) : null;
  }, [elementos, seleccionIds]);

  const elementosSeleccionados = useMemo(() => {
    return elementos.filter(e => seleccionIds.includes(e.id));
  }, [elementos, seleccionIds]);

  // Renderizar asideros de redimensión interactivos para elemento seleccionado (cuando solo hay 1 seleccionado)
  const renderResizeHandles = (elem) => {
    if (modo !== "editor" || seleccionIds.length !== 1 || seleccionIds[0] !== elem.id) return null;
    return (
      <g pointerEvents="all">
        {/* Marco de selección punteado */}
        <rect
          x={elem.x - 3}
          y={elem.y - 3}
          width={elem.w + 6}
          height={elem.h + 6}
          fill="none"
          stroke="#ec4899"
          strokeWidth="2"
          strokeDasharray="4, 4"
          pointerEvents="none"
        />

        {/* Esquinas (NW, NE, SW, SE) */}
        <rect
          x={elem.x - 5}
          y={elem.y - 5}
          width="10"
          height="10"
          fill="#ec4899"
          stroke="#ffffff"
          strokeWidth="1.5"
          className="cursor-nw-resize"
          onMouseDown={(e) => handleMouseDownElement(e, elem.id, "resize-nw")}
        />
        <rect
          x={elem.x + elem.w - 5}
          y={elem.y - 5}
          width="10"
          height="10"
          fill="#ec4899"
          stroke="#ffffff"
          strokeWidth="1.5"
          className="cursor-ne-resize"
          onMouseDown={(e) => handleMouseDownElement(e, elem.id, "resize-ne")}
        />
        <rect
          x={elem.x - 5}
          y={elem.y + elem.h - 5}
          width="10"
          height="10"
          fill="#ec4899"
          stroke="#ffffff"
          strokeWidth="1.5"
          className="cursor-sw-resize"
          onMouseDown={(e) => handleMouseDownElement(e, elem.id, "resize-sw")}
        />
        <rect
          x={elem.x + elem.w - 5}
          y={elem.y + elem.h - 5}
          width="10"
          height="10"
          fill="#ec4899"
          stroke="#ffffff"
          strokeWidth="1.5"
          className="cursor-se-resize"
          onMouseDown={(e) => handleMouseDownElement(e, elem.id, "resize-se")}
        />

        {/* Bordes laterales (N, S, W, E) */}
        <rect
          x={elem.x + elem.w / 2 - 5}
          y={elem.y - 5}
          width="10"
          height="8"
          fill="#ec4899"
          stroke="#ffffff"
          strokeWidth="1.5"
          className="cursor-n-resize"
          onMouseDown={(e) => handleMouseDownElement(e, elem.id, "resize-n")}
        />
        <rect
          x={elem.x + elem.w / 2 - 5}
          y={elem.y + elem.h - 3}
          width="10"
          height="8"
          fill="#ec4899"
          stroke="#ffffff"
          strokeWidth="1.5"
          className="cursor-s-resize"
          onMouseDown={(e) => handleMouseDownElement(e, elem.id, "resize-s")}
        />
        <rect
          x={elem.x - 5}
          y={elem.y + elem.h / 2 - 5}
          width="8"
          height="10"
          fill="#ec4899"
          stroke="#ffffff"
          strokeWidth="1.5"
          className="cursor-w-resize"
          onMouseDown={(e) => handleMouseDownElement(e, elem.id, "resize-w")}
        />
        <rect
          x={elem.x + elem.w - 3}
          y={elem.y + elem.h / 2 - 5}
          width="8"
          height="10"
          fill="#ec4899"
          stroke="#ffffff"
          strokeWidth="1.5"
          className="cursor-e-resize"
          onMouseDown={(e) => handleMouseDownElement(e, elem.id, "resize-e")}
        />
      </g>
    );
  };

  // Si viene un producto enfocado desde afuera (ej: clic en "Ver en mapa")
  useEffect(() => {
    if (!productoEnfocado) return;
    const cod = extraerCodigoPasillo(productoEnfocado.ubicacion || productoEnfocado.sector);
    
    let target = null;
    if (cod) {
      target = elementos.find(e => (e.codigo && e.codigo === cod) || e.nombre?.toUpperCase().includes(cod));
    }
    if (!target && productoEnfocado.seccion) {
      target = elementos.find(e => e.seccion?.toLowerCase() === productoEnfocado.seccion?.toLowerCase());
    }

    if (target) {
      setModo("interactivo");
      iluminarSector(target, productoEnfocado.nombre);
    }
  }, [productoEnfocado, elementos]);

  // Iluminar un sector en Modo Interactivo
  const iluminarSector = (target, nombreItem = "") => {
    setSpotlightActivo(target);
    setPasilloDetalle(target);

    // Centrar vista en el elemento iluminado
    const targetCenterX = target.x + target.w / 2;
    const targetCenterY = target.y + target.h / 2;
    setPan({
      x: 450 - targetCenterX * zoom,
      y: 300 - targetCenterY * zoom
    });
  };

  // Búsqueda en tiempo real
  const resultadosBusqueda = useMemo(() => {
    if (!busqueda.trim()) return [];
    const q = busqueda.toLowerCase().trim();

    const matchPasillos = elementos.filter(e => 
      e.nombre?.toLowerCase().includes(q) ||
      e.codigo?.toLowerCase().includes(q) ||
      e.seccion?.toLowerCase().includes(q) ||
      e.desc?.toLowerCase().includes(q)
    ).slice(0, 5).map(e => ({
      tipo: "pasillo",
      titulo: `${e.nombre} &bull; ${e.seccion}`,
      subtitulo: e.desc || "Zona del local",
      target: e
    }));

    const matchProds = productos.filter(p => 
      p.nombre?.toLowerCase().includes(q) ||
      p.ean?.toLowerCase().includes(q) ||
      p.ubicacion?.toLowerCase().includes(q)
    ).slice(0, 8).map(p => {
      const cod = extraerCodigoPasillo(p.ubicacion);
      const target = elementos.find(e => e.codigo === cod || e.nombre?.includes(p.ubicacion));
      return {
        tipo: "producto",
        titulo: p.nombre,
        subtitulo: `Ubicación: ${p.ubicacion || 'Sin asignar'}`,
        producto: p,
        target
      };
    });

    return [...matchProds, ...matchPasillos];
  }, [busqueda, elementos, productos]);

  // Productos ubicados en el pasillo seleccionado
  const productosEnPasillo = useMemo(() => {
    if (!pasilloDetalle) return [];
    const nombreMatch = pasilloDetalle.nombre?.toLowerCase();
    return productos.filter(p => {
      const cod = extraerCodigoPasillo(p.ubicacion || p.sector);
      return (pasilloDetalle.codigo && cod === pasilloDetalle.codigo) ||
        (p.ubicacion && nombreMatch && p.ubicacion.toLowerCase().includes(nombreMatch)) ||
        (p.sector && nombreMatch && p.sector.toLowerCase().includes(nombreMatch));
    });
  }, [pasilloDetalle, productos]);

  return (
    <div className={
      pantallaCompleta
        ? "fixed inset-0 z-50 bg-[#070b14] w-screen h-screen flex flex-col p-3 sm:p-5 overflow-hidden animate-fadeIn select-none"
        : "space-y-4 select-none"
    }>
      {/* Estilos para animación de Radar Neón */}
      <style>{`
        @keyframes neonPulse {
          0%, 100% {
            filter: drop-shadow(0 0 12px rgba(236, 72, 153, 0.9)) drop-shadow(0 0 25px rgba(168, 85, 247, 0.8));
            stroke-width: 4px;
          }
          50% {
            filter: drop-shadow(0 0 25px rgba(236, 72, 153, 1)) drop-shadow(0 0 45px rgba(236, 72, 153, 1));
            stroke-width: 6px;
          }
        }
        .elem-spotlight-pulse {
          animation: neonPulse 1.2s infinite ease-in-out !important;
          stroke: #ec4899 !important;
        }
      `}</style>

      {/* Barra de Control Principal (Modo, Herramientas, Guardar) */}
      <div className={`p-3 sm:p-5 rounded-2xl sm:rounded-3xl border ${t.border} ${t.bgCard} shadow-xl flex flex-col gap-3 sm:gap-4`}>
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
          
          {/* Título & Toggle Modo */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl ${modo === 'editor' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'}`}>
              <span className="material-symbols-outlined text-[20px] sm:text-[24px]">
                {modo === 'editor' ? 'design_services' : 'map'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-sm sm:text-lg font-black ${t.text}`}>
                  {modo === 'editor' ? 'Estudio de Plano' : 'Mapa Interactivo'}
                </h2>
                <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  modo === 'editor' 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {modo === 'editor' ? 'CONSTRUCTOR' : 'NAVEGACIÓN'}
                </span>
              </div>
              <p className={`text-xs ${t.textSecondary} hidden sm:block`}>
                {modo === 'editor' 
                  ? 'Dibuja, arrastra y alinea góndolas y zonas con cuadrícula magnética.' 
                  : 'Busca productos o toca un pasillo para ver su ubicación en tiempo real.'}
              </p>
            </div>
          </div>

          {/* Selector de Modo & Acciones */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            
            {/* Toggle de Modo */}
            <div className={`p-1 rounded-xl sm:rounded-2xl ${t.bgInput} border ${t.border} flex items-center`}>
              <button
                onClick={() => setModo("interactivo")}
                className={`px-3 py-1.5 rounded-lg sm:rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  modo === "interactivo"
                    ? "bg-purple-600 text-white shadow-md"
                    : `${t.textSecondary} hover:text-white`
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                <span>Ver Mapa</span>
              </button>
              <button
                onClick={() => setModo("editor")}
                className={`px-3 py-1.5 rounded-lg sm:rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  modo === "editor"
                    ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                    : `${t.textSecondary} hover:text-white`
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                <span>Diseñar</span>
              </button>
            </div>

            {/* Acciones en Modo Editor */}
            {modo === "editor" && (
              <>
                <button
                  onClick={undo}
                  disabled={historyIdx <= 0}
                  className={`p-2 rounded-xl text-xs font-bold border ${t.border} ${t.bgInput} ${historyIdx <= 0 ? 'opacity-40 cursor-not-allowed' : 'hover:text-white'} transition-all`}
                  title="Deshacer (Ctrl+Z)"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>undo</span>
                </button>
                <button
                  onClick={redo}
                  disabled={historyIdx >= history.length - 1}
                  className={`p-2 rounded-xl text-xs font-bold border ${t.border} ${t.bgInput} ${historyIdx >= history.length - 1 ? 'opacity-40 cursor-not-allowed' : 'hover:text-white'} transition-all`}
                  title="Rehacer (Ctrl+Y)"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>redo</span>
                </button>

                {/* Copiar y Pegar en Barra Superior */}
                <button
                  onClick={copiarSeleccionado}
                  disabled={seleccionIds.length === 0}
                  className={`p-2 rounded-xl text-xs font-bold border ${t.border} ${t.bgInput} ${seleccionIds.length === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:text-white hover:border-blue-500/40 text-blue-300'} transition-all`}
                  title={seleccionIds.length > 0 ? `Copiar ${seleccionIds.length} módulo(s) seleccionado(s) (Ctrl+C)` : "Selecciona uno o más módulos para copiar"}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>content_copy</span>
                </button>
                <button
                  onClick={pegarElemento}
                  disabled={!portapapeles || (Array.isArray(portapapeles) && portapapeles.length === 0)}
                  className={`p-2 rounded-xl text-xs font-bold border ${t.border} ${t.bgInput} ${!portapapeles ? 'opacity-40 cursor-not-allowed' : 'text-purple-300 border-purple-500/40 hover:text-white hover:bg-purple-600/20'} transition-all`}
                  title={portapapeles ? "Pegar módulos del portapapeles (Ctrl+V)" : "Portapapeles vacío (copia con Ctrl+C)"}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>content_paste</span>
                </button>

                {/* Botón Guardar en Nube */}
                <button
                  onClick={guardarPlanoEnFirestore}
                  disabled={guardandoPlano}
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all hover:scale-105"
                  title="Guardar plano en la nube para que todos los usuarios lo vean"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>save</span>
                  <span>{guardandoPlano ? "..." : "Guardar"}</span>
                </button>
              </>
            )}

            {/* Zoom / Reset */}
            <div className={`p-1 rounded-xl sm:rounded-2xl ${t.bgInput} border ${t.border} flex items-center gap-1 text-xs`}>
              <button
                onClick={() => setZoom(prev => Math.max(0.2, prev - 0.1))}
                className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-300 text-xs"
                title="Alejar"
              >
                -
              </button>
              <span className="px-1.5 sm:px-2 font-mono text-[10px] sm:text-[11px] font-bold text-slate-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(prev => Math.min(2.5, prev + 0.1))}
                className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-300 text-xs"
                title="Acercar"
              >
                +
              </button>
              <button
                onClick={() => {
                  setZoom(0.55);
                  setPan({ x: 20, y: 20 });
                }}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg hover:bg-white/10 text-[10px] font-bold text-purple-300"
                title="Restablecer Vista"
              >
                Centrar
              </button>
            </div>

            {/* Botón Pantalla Completa */}
            <button
              onClick={() => setPantallaCompleta(!pantallaCompleta)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-2xl text-xs font-bold border transition-all flex items-center gap-1 sm:gap-1.5 shadow-md ${
                pantallaCompleta
                  ? "bg-purple-600 text-white border-purple-400 ring-2 ring-purple-500/40"
                  : `${t.bgInput} ${t.textSecondary} ${t.border} hover:text-white hover:border-purple-500/40`
              }`}
              title={pantallaCompleta ? "Salir de Pantalla Completa (Esc)" : "Abrir Estudio en Pantalla Completa"}
            >
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">
                {pantallaCompleta ? "fullscreen_exit" : "fullscreen"}
              </span>
              <span className="hidden sm:inline">{pantallaCompleta ? "Salir" : "Pantalla Completa"}</span>
            </button>

          </div>
        </div>

        {/* Barra de Herramientas de Creación (Solo en Modo Editor) */}
        {modo === "editor" ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 sm:pt-3 border-t border-white/5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className={`text-[10px] sm:text-xs font-bold ${t.textSecondary} shrink-0 mr-0.5`}>+ Agregar:</span>
              <button
                onClick={() => agregarElemento("gondola_h")}
                className="shrink-0 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-bold bg-blue-600/20 text-blue-300 border border-blue-500/40 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1 shadow-sm"
              >
                <span className="material-symbols-outlined text-[15px]">table_rows</span>
                <span>Góndola H</span>
              </button>
              <button
                onClick={() => agregarElemento("gondola_v")}
                className="shrink-0 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-bold bg-purple-600/20 text-purple-300 border border-purple-500/40 hover:bg-purple-600 hover:text-white transition-all flex items-center gap-1 shadow-sm"
              >
                <span className="material-symbols-outlined text-[15px]">view_column</span>
                <span>Góndola V</span>
              </button>
              <button
                onClick={() => agregarElemento("zona")}
                className="shrink-0 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-bold bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600 hover:text-white transition-all flex items-center gap-1 shadow-sm"
              >
                <span className="material-symbols-outlined text-[15px]">crop_square</span>
                <span>Sección</span>
              </button>
              <button
                onClick={() => agregarElemento("pasillo")}
                className="shrink-0 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1 shadow-sm"
              >
                <span className="material-symbols-outlined text-[15px]">directions_walk</span>
                <span>Pasillo</span>
              </button>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto no-scrollbar py-0.5">
              {/* Selector de Imán (Snap to Grid) */}
              <div className="flex items-center gap-1 text-xs shrink-0">
                <span className={`text-[10px] sm:text-[11px] font-bold ${t.textSecondary}`}>Imán:</span>
                {[0, 10, 20, 40].map(sz => (
                  <button
                    key={sz}
                    onClick={() => setSnapGrid(sz)}
                    className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg text-[10px] font-black border transition-all ${
                      snapGrid === sz
                        ? "bg-purple-600 text-white border-purple-400"
                        : `${t.bgInput} ${t.textSecondary} ${t.border} hover:text-white`
                    }`}
                  >
                    {sz === 0 ? "Off" : `${sz}px`}
                  </button>
                ))}
              </div>

              {/* Botón Plantilla y Vaciar */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={cargarPlantillaInicial}
                  className={`px-2 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold border ${t.border} ${t.bgInput} ${t.textSecondary} hover:text-white`}
                  title="Cargar plantilla base del supermercado"
                >
                  Plantilla Base
                </button>
                <button
                  onClick={vaciarLienzo}
                  className="p-1 rounded-lg sm:rounded-xl text-xs font-bold border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                  title="Limpiar todo el lienzo para empezar de cero"
                >
                  <span className="material-symbols-outlined text-[15px] sm:text-[17px]">delete_sweep</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Barra de Búsqueda Interactiva (Solo en Modo Interactivo) */
          <div className="relative pt-2 border-t border-white/5">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-purple-400 pointer-events-none" style={{ fontSize: 20 }}>
                search
              </span>
              <input
                type="text"
                placeholder="🔍 Busca cualquier producto o pasillo para iluminarlo en el mapa (ej: Arroz, Pisco, Pan, 14-A, Carnicería)..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setMostrarSugerencias(true);
                }}
                onFocus={() => setMostrarSugerencias(true)}
                className={`w-full py-3 pl-11 pr-24 rounded-2xl ${t.bgInput} border border-purple-500/40 text-sm font-semibold ${t.text} placeholder:text-slate-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 shadow-inner`}
              />
              {busqueda && (
                <button
                  onClick={() => {
                    setBusqueda("");
                    setMostrarSugerencias(false);
                  }}
                  className="absolute right-3 px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800/60"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Sugerencias flotantes */}
            {mostrarSugerencias && resultadosBusqueda.length > 0 && (
              <div className={`absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl ${t.bgCard} border border-purple-500/40 shadow-2xl overflow-hidden max-h-80 overflow-y-auto animate-fadeIn backdrop-blur-xl`}>
                <div className="p-2 space-y-1">
                  {resultadosBusqueda.map((res, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (res.target) {
                          iluminarSector(res.target, res.producto?.nombre || res.target.nombre);
                        }
                        setMostrarSugerencias(false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between hover:bg-purple-600/20 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          res.tipo === 'producto' 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                            {res.tipo === 'producto' ? 'shopping_bag' : 'shelves'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className={`text-xs font-bold ${t.text} truncate group-hover:text-purple-300`}>
                            {res.titulo}
                          </div>
                          <div className={`text-[11px] ${t.textSecondary} truncate`}>
                            {res.subtitulo}
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-pink-500/20 text-pink-300 border border-pink-500/40 shrink-0">
                        🎯 Iluminar
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Área de Trabajo: Lienzo (Canvas) + Panel Lateral */}
      <div className={`grid grid-cols-1 lg:grid-cols-4 gap-4 ${pantallaCompleta ? "flex-1 min-h-0 mt-3" : ""}`}>
        
        {/* LIENZO DE DIBUJO Y NAVEGACIÓN */}
        <div className={`lg:col-span-3 ${pantallaCompleta ? "h-full min-h-0 flex flex-col" : ""}`}>
          <div
            ref={containerRef}
            id="canvas-bg"
            onMouseDown={handleMouseDownCanvas}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className={`rounded-2xl sm:rounded-3xl border ${t.border} overflow-hidden shadow-2xl relative bg-[#070b14] select-none touch-none ${
              isPanning ? 'cursor-grab' : (modo === 'editor' ? 'cursor-default' : 'cursor-default')
            } ${pantallaCompleta ? "flex-1 h-full min-h-0" : ""}`}
            style={{ 
              height: pantallaCompleta ? "100%" : "680px",
              touchAction: "none"
            }}
          >
            {/* SVG del Lienzo */}
            <svg
              width="100%"
              height="100%"
              className="w-full h-full"
            >
              <defs>
                {/* Cuadrícula milimétrica */}
                <pattern id="studioGridSmall" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#172554" strokeWidth="0.5" opacity="0.3" />
                </pattern>
                <pattern id="studioGridLarge" width="100" height="100" patternUnits="userSpaceOnUse">
                  <rect width="100" height="100" fill="url(#studioGridSmall)" />
                  <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#3b82f6" strokeWidth="0.8" opacity="0.4" />
                </pattern>
              </defs>

              {/* Fondo transformable con Pan y Zoom */}
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                
                {/* Fondo del área del supermercado con cuadrícula */}
                <rect
                  x="0"
                  y="0"
                  width={canvasWidth}
                  height={canvasHeight}
                  fill="#0b0f19"
                  stroke="#1e293b"
                  strokeWidth="3"
                />
                {mostrarGrid && (
                  <rect
                    x="0"
                    y="0"
                    width={canvasWidth}
                    height={canvasHeight}
                    fill="url(#studioGridLarge)"
                    pointerEvents="none"
                  />
                )}

                {/* Mensaje de Lienzo en Blanco cuando no hay elementos */}
                {elementos.length === 0 && (
                  <g pointerEvents="none">
                    <rect
                      x={canvasWidth / 2 - 280}
                      y={canvasHeight / 2 - 110}
                      width="560"
                      height="220"
                      rx="24"
                      fill="#0f172a"
                      fillOpacity="0.95"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeDasharray="6, 6"
                    />
                    <text x={canvasWidth / 2} y={canvasHeight / 2 - 45} textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="900">
                      ✨ Plano en blanco listo para diseñar
                    </text>
                    <text x={canvasWidth / 2} y={canvasHeight / 2 - 10} textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="500">
                      Todo lo anterior ha sido eliminado. Puedes empezar de cero:
                    </text>
                    <text x={canvasWidth / 2} y={canvasHeight / 2 + 25} textAnchor="middle" fill="#60a5fa" fontSize="14" fontWeight="800">
                      + Góndola Horizontal • + Góndola Vertical • + Sección
                    </text>
                    <text x={canvasWidth / 2} y={canvasHeight / 2 + 60} textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="500">
                      Usa el botón "Pantalla Completa" para diseñar cómodamente con cuadrícula imán
                    </text>
                  </g>
                )}

                {/* 1. Capa de Pasillos Peatonales (Fondo) */}
                {elementos.filter(e => e.tipo === "pasillo").map(elem => {
                  const isSelected = seleccionIds.includes(elem.id);
                  const isSpotlight = spotlightActivo?.id === elem.id;
                  return (
                    <g
                      key={elem.id}
                      onMouseDown={(e) => handleMouseDownElement(e, elem.id, "move")}
                      onClick={() => {
                        if (modo === "interactivo") {
                          setPasilloDetalle(elem);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <rect
                        x={elem.x}
                        y={elem.y}
                        width={elem.w}
                        height={elem.h}
                        rx="4"
                        ry="4"
                        fill={elem.color || "#dcfce7"}
                        fillOpacity={0.85}
                        stroke={isSelected ? "#ec4899" : (elem.borde || "#22c55e")}
                        strokeWidth={isSelected ? 3 : 1.5}
                        className={isSpotlight ? "elem-spotlight-pulse" : ""}
                      />
                      {elem.h > elem.w * 2 ? (
                        <text
                          x={elem.x + elem.w / 2}
                          y={elem.y + elem.h / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(-90, ${elem.x + elem.w / 2}, ${elem.y + elem.h / 2})`}
                          fill="#065f46"
                          fontSize="15"
                          fontWeight="900"
                          letterSpacing="4"
                          pointerEvents="none"
                        >
                          {elem.nombre}
                        </text>
                      ) : (
                        <text
                          x={elem.x + elem.w / 2}
                          y={elem.y + elem.h / 2 + 4}
                          textAnchor="middle"
                          fill="#065f46"
                          fontSize={Math.max(10, Math.min(13, elem.h * 0.45))}
                          fontWeight="800"
                          letterSpacing="1"
                          pointerEvents="none"
                        >
                          {elem.nombre}
                        </text>
                      )}
                      {renderResizeHandles(elem)}
                    </g>
                  );
                })}

                {/* 2. Capa de Zonas Grandes (Carnicería, Verdulería, Paredes, etc.) */}
                {elementos.filter(e => e.tipo === "zona").map(elem => {
                  const isSelected = seleccionIds.includes(elem.id);
                  const isSpotlight = spotlightActivo?.id === elem.id;
                  const isLightBg = elem.color === "#84cc16" || elem.color === "#99FF33" || elem.color === "#86efac" || elem.color === "#CCFF99";
                  return (
                    <g
                      key={elem.id}
                      onMouseDown={(e) => handleMouseDownElement(e, elem.id, "move")}
                      onClick={() => {
                        if (modo === "interactivo") {
                          setPasilloDetalle(elem);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <rect
                        x={elem.x}
                        y={elem.y}
                        width={elem.w}
                        height={elem.h}
                        rx="4"
                        ry="4"
                        fill={elem.color || "#1e293b"}
                        stroke={isSelected ? "#ec4899" : (elem.borde || "#3b82f6")}
                        strokeWidth={isSelected ? 3.5 : 1.2}
                        className={isSpotlight ? "elem-spotlight-pulse" : ""}
                      />
                      {elem.h > elem.w * 1.5 ? (
                        <text
                          x={elem.x + elem.w / 2}
                          y={elem.y + elem.h / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(-90, ${elem.x + elem.w / 2}, ${elem.y + elem.h / 2})`}
                          fill={isLightBg ? "#0f172a" : "#ffffff"}
                          fontSize={Math.max(9, Math.min(12, elem.w * 0.35))}
                          fontWeight="900"
                          letterSpacing="1"
                          pointerEvents="none"
                        >
                          {elem.nombre}
                        </text>
                      ) : (
                        <text
                          x={elem.x + elem.w / 2}
                          y={elem.y + elem.h / 2 + 4}
                          textAnchor="middle"
                          fill={isLightBg ? "#0f172a" : "#ffffff"}
                          fontSize={Math.max(9, Math.min(12, elem.h * 0.48))}
                          fontWeight="900"
                          pointerEvents="none"
                        >
                          {elem.nombre}
                        </text>
                      )}
                      {elem.desc && elem.h > 50 && (
                        <text
                          x={elem.x + elem.w / 2}
                          y={elem.y + elem.h / 2 + 20}
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="9"
                          fontWeight="600"
                          pointerEvents="none"
                        >
                          {elem.desc}
                        </text>
                      )}
                      {renderResizeHandles(elem)}
                    </g>
                  );
                })}

                {/* 3. Capa de Góndolas / Pasillos Principales */}
                {elementos.filter(e => e.tipo === "gondola").map(elem => {
                  const isSelected = seleccionIds.includes(elem.id);
                  const isSpotlight = spotlightActivo?.id === elem.id;
                  const isVertical = elem.h > elem.w;

                  return (
                    <g
                      key={elem.id}
                      onMouseDown={(e) => handleMouseDownElement(e, elem.id, "move")}
                      onClick={() => {
                        if (modo === "interactivo") {
                          iluminarSector(elem);
                        }
                      }}
                      className="cursor-pointer group"
                    >
                      <rect
                        x={elem.x}
                        y={elem.y}
                        width={elem.w}
                        height={elem.h}
                        rx="3"
                        ry="3"
                        fill={elem.color || "#38bdf8"}
                        stroke={isSelected ? "#ec4899" : (elem.borde || "#1e293b")}
                        strokeWidth={isSelected ? 3.5 : 1.2}
                        className={isSpotlight ? "elem-spotlight-pulse" : "transition-colors"}
                      />

                      {/* Texto del elemento */}
                      {isVertical ? (
                        <text
                          x={elem.x + elem.w / 2}
                          y={elem.y + elem.h / 2}
                          transform={`rotate(-90, ${elem.x + elem.w / 2}, ${elem.y + elem.h / 2})`}
                          textAnchor="middle"
                          fill="#090d16"
                          fontSize={Math.min(11, Math.max(7.5, elem.w * 0.65))}
                          fontWeight="900"
                          pointerEvents="none"
                        >
                          {elem.nombre}
                        </text>
                      ) : (
                        <text
                          x={elem.x + elem.w / 2}
                          y={elem.y + elem.h / 2 + 4}
                          textAnchor="middle"
                          fill="#090d16"
                          fontSize={Math.min(11, Math.max(8.5, elem.h * 0.52))}
                          fontWeight="900"
                          letterSpacing="0.4"
                          pointerEvents="none"
                        >
                          {elem.nombre}
                        </text>
                      )}

                      {/* Asideros de Redimensión en Modo Editor cuando está seleccionado */}
                      {renderResizeHandles(elem)}
                    </g>
                  );
                })}

                {/* Caja de Selección Marquee (Arrastre con Shift sobre el lienzo) */}
                {marqueeBox && (
                  <rect
                    x={Math.min(marqueeBox.startX, marqueeBox.currentX)}
                    y={Math.min(marqueeBox.startY, marqueeBox.currentY)}
                    width={Math.abs(marqueeBox.currentX - marqueeBox.startX)}
                    height={Math.abs(marqueeBox.currentY - marqueeBox.startY)}
                    fill="#3b82f6"
                    fillOpacity="0.25"
                    stroke="#60a5fa"
                    strokeWidth="1.5"
                    strokeDasharray="4, 4"
                    pointerEvents="none"
                  />
                )}

              </g>
            </svg>

            {/* Banner flotante de sector iluminado */}
            {spotlightActivo && modo === "interactivo" && (
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2.5 bg-slate-900/95 border border-pink-500/50 rounded-2xl px-4 py-2.5 shadow-2xl backdrop-blur-md animate-fadeIn">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-ping"></span>
                <div className="text-left">
                  <div className="text-[10px] font-bold text-pink-300 uppercase tracking-wider">Sector Iluminado</div>
                  <div className="text-xs font-black text-white">{spotlightActivo.nombre}</div>
                </div>
                <button
                  onClick={() => setSpotlightActivo(null)}
                  className="ml-2 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>close</span>
                </button>
              </div>
            )}

            {/* Controles flotantes en esquina inferior derecha */}
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-slate-900/90 border border-white/10 rounded-2xl p-1.5 shadow-xl backdrop-blur-md text-xs">
              <span className="text-[10px] font-mono text-slate-400 px-2">
                Objetos: <strong>{elementos.length}</strong>
              </span>
              <button
                onClick={() => setMostrarGrid(!mostrarGrid)}
                className={`p-1.5 rounded-xl transition-all ${mostrarGrid ? 'bg-purple-600/30 text-purple-300' : 'text-slate-400 hover:text-white'}`}
                title="Mostrar u ocultar cuadrícula"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>grid_4x4</span>
              </button>
            </div>

          </div>
        </div>

        {/* PANEL LATERAL: INSPECTOR DE PROPIEDADES (EDITOR) O DETALLE DE PASILLO (INTERACTIVO) */}
        <div className={`lg:col-span-1 ${pantallaCompleta ? "h-full min-h-0 flex flex-col" : ""}`}>
          {modo === "editor" ? (
            /* INSPECTOR DE PROPIEDADES (MODO EDITOR) */
            <div 
              className={`p-5 rounded-3xl border ${t.border} ${t.bgCard} shadow-lg h-full flex flex-col justify-between overflow-y-auto ${
                pantallaCompleta ? "max-h-full" : ""
              }`} 
              style={{ minHeight: pantallaCompleta ? "100%" : "680px" }}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400" style={{ fontSize: 20 }}>tune</span>
                    <h3 className={`font-black text-sm ${t.text}`}>Propiedades</h3>
                  </div>
                  {seleccionIds.length > 0 && (
                    <button
                      onClick={eliminarSeleccionado}
                      className="text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-red-500/10 flex items-center gap-1 text-xs"
                      title={seleccionIds.length > 1 ? `Eliminar ${seleccionIds.length} elementos (Supr)` : "Eliminar elemento (Supr)"}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                      {seleccionIds.length > 1 && <span className="font-bold">{seleccionIds.length}</span>}
                    </button>
                  )}
                </div>

                {seleccionIds.length > 1 ? (
                  /* PANEL DE SELECCIÓN MÚLTIPLE */
                  <div className="space-y-4 animate-fadeIn">
                    <div className="p-4 rounded-2xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-purple-400" style={{ fontSize: 24 }}>layers</span>
                        <div>
                          <h4 className="text-sm font-black text-white">Selección Múltiple</h4>
                          <p className="text-[11px] text-purple-300 font-semibold">{seleccionIds.length} módulos seleccionados</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSeleccionIds([])}
                        className="text-[11px] font-bold text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        Limpiar
                      </button>
                    </div>

                    {/* Copiar y Pegar en Grupo */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={copiarSeleccionado}
                        className="py-2.5 px-2 rounded-xl text-xs font-bold border border-blue-500/30 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 flex items-center justify-center gap-1.5 transition-all shadow-md"
                        title="Copiar todos los módulos seleccionados (Ctrl+C)"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                        <span>Copiar ({seleccionIds.length})</span>
                      </button>
                      <button
                        onClick={pegarElemento}
                        disabled={!portapapeles || (Array.isArray(portapapeles) && portapapeles.length === 0)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 shadow-md ${
                          portapapeles
                            ? "border-purple-500/40 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 cursor-pointer"
                            : "border-white/5 bg-white/5 opacity-40 cursor-not-allowed text-slate-400"
                        }`}
                        title="Pegar elementos del portapapeles (Ctrl+V)"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_paste</span>
                        <span>Pegar (Ctrl+V)</span>
                      </button>
                    </div>

                    {/* Duplicar Grupo */}
                    <div className="space-y-1 pt-1">
                      <span className={`text-[10px] font-bold ${t.textSecondary} uppercase tracking-wider block`}>
                        Duplicar grupo completo:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => duplicarSeleccionado("arriba")}
                          className="py-1.5 px-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm hover:scale-[1.02]"
                          title="Duplicar hacia arriba (Ctrl+Shift+D)"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>north</span>
                          <span>Arriba</span>
                        </button>
                        <button
                          onClick={() => duplicarSeleccionado("abajo")}
                          className="py-1.5 px-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm hover:scale-[1.02]"
                          title="Duplicar hacia abajo (Ctrl+D)"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>south</span>
                          <span>Abajo</span>
                        </button>
                        <button
                          onClick={() => duplicarSeleccionado("izquierda")}
                          className="py-1.5 px-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm hover:scale-[1.02]"
                          title="Duplicar hacia la izquierda (Alt+←)"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>west</span>
                          <span>Izquierda</span>
                        </button>
                        <button
                          onClick={() => duplicarSeleccionado("derecha")}
                          className="py-1.5 px-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm hover:scale-[1.02]"
                          title="Duplicar hacia la derecha (Alt+→)"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>east</span>
                          <span>Derecha</span>
                        </button>
                      </div>
                    </div>

                    {/* Asignar Sección a Todo el Grupo */}
                    <div className="p-3 rounded-2xl border border-white/10 bg-white/5 space-y-1.5">
                      <label className={`text-[10px] font-bold ${t.textSecondary} uppercase tracking-wider block`}>
                        Cambiar sección en lote:
                      </label>
                      <select
                        onChange={(e) => {
                          const sec = e.target.value;
                          if (!sec) return;
                          setElementos(prev => {
                            const next = prev.map(el => {
                              if (!seleccionIds.includes(el.id)) return el;
                              return {
                                ...el,
                                seccion: sec,
                                color: SECCION_COLORES[sec] || el.color
                              };
                            });
                            pushHistory(next);
                            return next;
                          });
                          toast.success(`Sección cambiada a "${sec}" en ${seleccionIds.length} módulos`);
                        }}
                        defaultValue=""
                        className={`w-full p-2 rounded-xl ${t.bgInput} border ${t.border} text-xs font-bold ${t.text} focus:outline-none`}
                      >
                        <option value="" disabled>Seleccionar sección para todos...</option>
                        {SECCIONES_LISTA.map(sec => (
                          <option key={sec} value={sec}>{sec}</option>
                        ))}
                      </select>
                    </div>

                    {/* Eliminar Grupo */}
                    <button
                      onClick={eliminarSeleccionado}
                      className="w-full py-2.5 rounded-xl text-xs font-bold border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-200 flex items-center justify-center gap-1.5 transition-all mt-3"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                      <span>Eliminar {seleccionIds.length} módulos (Supr)</span>
                    </button>
                  </div>
                ) : elementoSeleccionado ? (
                  <div className="space-y-3.5 animate-fadeIn">
                    
                    {/* Nombre */}
                    <div>
                      <label className={`text-[11px] font-bold ${t.textSecondary} block mb-1`}>Nombre / Etiqueta:</label>
                      <input
                        type="text"
                        value={elementoSeleccionado.nombre || ""}
                        onChange={(e) => updateElemento("nombre", e.target.value)}
                        placeholder="Ej: Pasillo 14-A"
                        className={`w-full p-2.5 rounded-xl ${t.bgInput} border ${t.border} text-xs font-bold ${t.text} focus:border-amber-400 focus:outline-none`}
                      />
                    </div>

                    {/* Código normalizado */}
                    <div>
                      <label className={`text-[11px] font-bold ${t.textSecondary} block mb-1`}>Código de Pasillo (opcional):</label>
                      <input
                        type="text"
                        value={elementoSeleccionado.codigo || ""}
                        onChange={(e) => updateElemento("codigo", e.target.value.toUpperCase())}
                        placeholder="Ej: 14A, 15D, 1C"
                        className={`w-full p-2.5 rounded-xl ${t.bgInput} border ${t.border} text-xs font-mono font-bold ${t.text} focus:border-amber-400 focus:outline-none`}
                      />
                    </div>

                    {/* Sección */}
                    <div>
                      <label className={`text-[11px] font-bold ${t.textSecondary} block mb-1`}>Sección / Categoría:</label>
                      <select
                        value={elementoSeleccionado.seccion || "Abarrotes"}
                        onChange={(e) => updateElemento("seccion", e.target.value)}
                        className={`w-full p-2.5 rounded-xl ${t.bgInput} border ${t.border} text-xs font-bold ${t.text} focus:border-amber-400 focus:outline-none`}
                      >
                        {SECCIONES_LISTA.map(sec => (
                          <option key={sec} value={sec}>{sec}</option>
                        ))}
                      </select>
                    </div>

                    {/* Descripción / Contenido */}
                    <div>
                      <label className={`text-[11px] font-bold ${t.textSecondary} block mb-1`}>Artículos / Contenido:</label>
                      <input
                        type="text"
                        value={elementoSeleccionado.desc || ""}
                        onChange={(e) => updateElemento("desc", e.target.value)}
                        placeholder="Ej: Arroz, Fideos, Salsas"
                        className={`w-full p-2.5 rounded-xl ${t.bgInput} border ${t.border} text-xs ${t.text} focus:border-amber-400 focus:outline-none`}
                      />
                    </div>

                    {/* Color */}
                    <div>
                      <label className={`text-[11px] font-bold ${t.textSecondary} block mb-1.5`}>Color de la góndola:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={elementoSeleccionado.color || "#3b82f6"}
                          onChange={(e) => updateElemento("color", e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-white/20 bg-transparent p-0"
                        />
                        <div className="flex flex-wrap gap-1">
                          {["#3b82f6", "#a855f7", "#ef4444", "#eab308", "#22c55e", "#f97316", "#06b6d4"].map(c => (
                            <button
                              key={c}
                              onClick={() => updateElemento("color", c)}
                              style={{ backgroundColor: c }}
                              className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform"
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Posición & Tamaño Exactos */}
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <div className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">Dimensiones Milimétricas</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className={`text-[10px] ${t.textSecondary}`}>X:</span>
                          <input
                            type="number"
                            value={elementoSeleccionado.x}
                            onChange={(e) => updateElemento("x", parseInt(e.target.value) || 0)}
                            className={`w-full p-1.5 rounded-lg ${t.bgInput} border ${t.border} text-xs font-mono font-bold ${t.text}`}
                          />
                        </div>
                        <div>
                          <span className={`text-[10px] ${t.textSecondary}`}>Y:</span>
                          <input
                            type="number"
                            value={elementoSeleccionado.y}
                            onChange={(e) => updateElemento("y", parseInt(e.target.value) || 0)}
                            className={`w-full p-1.5 rounded-lg ${t.bgInput} border ${t.border} text-xs font-mono font-bold ${t.text}`}
                          />
                        </div>
                        <div>
                          <span className={`text-[10px] ${t.textSecondary}`}>Ancho (W):</span>
                          <input
                            type="number"
                            value={elementoSeleccionado.w}
                            onChange={(e) => updateElemento("w", parseInt(e.target.value) || 20)}
                            className={`w-full p-1.5 rounded-lg ${t.bgInput} border ${t.border} text-xs font-mono font-bold ${t.text}`}
                          />
                        </div>
                        <div>
                          <span className={`text-[10px] ${t.textSecondary}`}>Alto (H):</span>
                          <input
                            type="number"
                            value={elementoSeleccionado.h}
                            onChange={(e) => updateElemento("h", parseInt(e.target.value) || 20)}
                            className={`w-full p-1.5 rounded-lg ${t.bgInput} border ${t.border} text-xs font-mono font-bold ${t.text}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Botones de Acción Rápida: Copiar, Pegar, Duplicar */}
                    <div className="pt-2 space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={copiarSeleccionado}
                          className="py-2 px-2 rounded-xl text-xs font-bold border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-200 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                          title="Copiar elemento seleccionado (Ctrl+C)"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                          <span>Copiar (Ctrl+C)</span>
                        </button>
                        <button
                          onClick={pegarElemento}
                          disabled={!portapapeles}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                            portapapeles
                              ? "border-purple-500/40 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 cursor-pointer"
                              : "border-white/5 bg-white/5 opacity-40 cursor-not-allowed text-slate-400"
                          }`}
                          title={portapapeles ? `Pegar "${portapapeles.nombre || portapapeles.id}" (Ctrl+V)` : "Portapapeles vacío"}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_paste</span>
                          <span>Pegar (Ctrl+V)</span>
                        </button>
                      </div>

                      {/* Duplicar Direccional */}
                      <div className="pt-1 space-y-1">
                        <span className={`text-[10px] font-bold ${t.textSecondary} uppercase tracking-wider block`}>
                          Duplicar en dirección:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => duplicarSeleccionado("arriba")}
                            className="py-1.5 px-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm hover:scale-[1.02]"
                            title="Duplicar hacia arriba (Ctrl+Shift+D o Alt+↑)"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>north</span>
                            <span>Arriba</span>
                          </button>
                          <button
                            onClick={() => duplicarSeleccionado("abajo")}
                            className="py-1.5 px-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm hover:scale-[1.02]"
                            title="Duplicar hacia abajo (Ctrl+D o Alt+↓)"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>south</span>
                            <span>Abajo</span>
                          </button>
                          <button
                            onClick={() => duplicarSeleccionado("izquierda")}
                            className="py-1.5 px-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm hover:scale-[1.02]"
                            title="Duplicar hacia la izquierda (Alt+←)"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>west</span>
                            <span>Izquierda</span>
                          </button>
                          <button
                            onClick={() => duplicarSeleccionado("derecha")}
                            className="py-1.5 px-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm hover:scale-[1.02]"
                            title="Duplicar hacia la derecha (Alt+→)"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>east</span>
                            <span>Derecha</span>
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="py-14 text-center space-y-3">
                    <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 36 }}>ads_click</span>
                    <p className={`text-xs ${t.textSecondary}`}>
                      Toca cualquier góndola o zona en el lienzo para ver y editar sus propiedades.
                    </p>
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-left text-[11px] text-slate-300 space-y-1.5">
                      <p className="font-bold text-amber-300 flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>layers</span>
                        <span>Selección Múltiple:</span>
                      </p>
                      <p>• Mantén <strong>Shift + Clic</strong> en varios módulos para sumarlos a la selección.</p>
                      <p>• O arrastra con <strong>Shift</strong> sobre el lienzo para trazar una caja de selección.</p>
                      <p>• Presiona <strong>Ctrl + A</strong> para seleccionar todos los módulos.</p>
                    </div>
                    {portapapeles && (
                      <button
                        onClick={pegarElemento}
                        className="mx-auto px-4 py-2 rounded-xl text-xs font-bold bg-purple-600/30 text-purple-200 border border-purple-500/40 hover:bg-purple-600/50 flex items-center gap-2 transition-all shadow-md"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_paste</span>
                        <span>Pegar módulos del portapapeles (Ctrl+V)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/5 text-[11px] text-slate-400 space-y-1">
                <p>💡 <strong>Atajos del teclado:</strong></p>
                <p>• <code>Shift + Clic / Arrastre</code>: Selección múltiple</p>
                <p>• <code>Ctrl + A</code>: Seleccionar todo el plano</p>
                <p>• <code>Ctrl + C / Ctrl + V</code>: Copiar / Pegar</p>
                <p>• <code>Ctrl + D</code>: Duplicar abajo (<code>+Shift</code>: arriba)</p>
                <p>• <code>Alt + Flechas</code>: Duplicar en cualquier dirección</p>
                <p>• <code>Supr / Backspace</code>: Eliminar seleccionados</p>
                <p>• <code>Ctrl + Z / Ctrl + Y</code>: Deshacer / Rehacer</p>
              </div>
            </div>
          ) : (
            /* DETALLE DE PASILLO Y PRODUCTOS (MODO INTERACTIVO) */
            <div 
              className={`p-5 rounded-3xl border ${t.border} ${t.bgCard} shadow-lg h-full flex flex-col justify-between overflow-y-auto ${
                pantallaCompleta ? "max-h-full" : ""
              }`} 
              style={{ minHeight: pantallaCompleta ? "100%" : "680px" }}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                  <span className="material-symbols-outlined text-purple-400" style={{ fontSize: 22 }}>shelves</span>
                  <h3 className={`font-black text-sm ${t.text}`}>Detalle de la Ubicación</h3>
                </div>

                {pasilloDetalle ? (
                  <div className="space-y-3 animate-fadeIn">
                    <div>
                      <span 
                        className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border inline-block mb-1"
                        style={{ 
                          color: getSeccionColor(pasilloDetalle.seccion),
                          borderColor: `${getSeccionColor(pasilloDetalle.seccion)}40`,
                          background: `${getSeccionColor(pasilloDetalle.seccion)}15`
                        }}
                      >
                        {pasilloDetalle.seccion || "Supermercado"}
                      </span>
                      <h4 className={`text-lg font-black ${t.text}`}>{pasilloDetalle.nombre}</h4>
                      {pasilloDetalle.desc && (
                        <p className={`text-xs ${t.textSecondary} mt-0.5`}>{pasilloDetalle.desc}</p>
                      )}
                    </div>

                    {/* Lista de productos registrados en este pasillo */}
                    <div className="pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[11px] font-black ${t.textSecondary} uppercase tracking-wider`}>
                          Productos aquí ({productosEnPasillo.length})
                        </span>
                      </div>

                      {productosEnPasillo.length > 0 ? (
                        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                          {productosEnPasillo.map(prod => (
                            <div
                              key={prod.id}
                              className={`p-2.5 rounded-xl border ${t.border} ${t.bgInput} hover:border-purple-500/40 transition-all flex items-center justify-between gap-2`}
                            >
                              <div className="min-w-0">
                                <div className={`text-xs font-bold ${t.text} truncate`}>{prod.nombre}</div>
                                <div className={`text-[10px] ${t.textSecondary} flex items-center gap-2`}>
                                  <span>Stock: <strong>{prod.stock || 0}</strong></span>
                                  {prod.precio && <span>&bull; ${prod.precio}</span>}
                                </div>
                              </div>
                              {onVerProducto && (
                                <button
                                  onClick={() => onVerProducto(prod)}
                                  className="w-7 h-7 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white flex items-center justify-center shrink-0 transition-all"
                                  title="Ver detalles del producto"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-white/5 rounded-2xl">
                          No hay productos registrados aún con esta ubicación.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <span className="material-symbols-outlined" style={{ fontSize: 32 }}>touch_app</span>
                    </div>
                    <h4 className={`text-sm font-bold ${t.text}`}>Toca cualquier pasillo</h4>
                    <p className={`text-xs ${t.textSecondary} max-w-xs mx-auto`}>
                      Haz clic en un pasillo o busca un producto arriba para ver su ubicación en tiempo real.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-white/5 text-[11px] text-slate-400 space-y-1">
                <p>💡 <strong>Total libertad:</strong></p>
                <p>Puedes cambiar al <strong>Modo Constructor</strong> en cualquier momento para agregar o mover pasillos.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
