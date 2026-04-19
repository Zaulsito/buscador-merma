import { useState, useEffect, useRef } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, doc, setDoc, getDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import BottomNav from "../components/BottomNav";
import AppSidebar from "../components/AppSidebar";
import Navbar from "../components/Navbar";
import toast, { Toaster } from "react-hot-toast";

const CATEGORIAS = [
  { id: "entradas",       label: "Entradas",        icon: "restaurant" },
  { id: "principal",      label: "Principal",        icon: "lunch_dining" },
  { id: "parrilla",       label: "Parrilla",         icon: "outdoor_grill" },
  { id: "sopa",           label: "Sopa",             icon: "soup_kitchen" },
  { id: "acompanamiento", label: "Acompañamiento",   icon: "rice_bowl" },
  { id: "ensaladas",      label: "Ensaladas",        icon: "eco" },
  { id: "postres",        label: "Postres",          icon: "icecream" },
];

const BADGE_COLORS = {
  todas: {
    badge: "bg-blue-500/10 text-blue-400",
    active: "bg-blue-600 border-blue-500 shadow-blue-500/40",
    soft: "bg-blue-500/5",
    border: "border-blue-500/20",
    text: "text-blue-400"
  },
  entradas: {
    badge: "bg-emerald-500/10 text-emerald-400",
    active: "bg-emerald-600 border-emerald-500 shadow-emerald-500/40",
    soft: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    text: "text-emerald-400"
  },
  principal: {
    badge: "bg-red-500/10 text-red-400",
    active: "bg-red-600 border-red-500 shadow-red-500/40",
    soft: "bg-red-500/5",
    border: "border-red-500/20",
    text: "text-red-400"
  },
  parrilla: {
    badge: "bg-orange-500/10 text-orange-400",
    active: "bg-orange-600 border-orange-500 shadow-orange-500/40",
    soft: "bg-orange-500/5",
    border: "border-orange-500/20",
    text: "text-orange-400"
  },
  sopa: {
    badge: "bg-sky-500/10 text-sky-400",
    active: "bg-sky-600 border-sky-500 shadow-sky-500/40",
    soft: "bg-sky-500/5",
    border: "border-sky-500/20",
    text: "text-sky-400"
  },
  acompanamiento: {
    badge: "bg-amber-500/10 text-amber-400",
    active: "bg-amber-600 border-amber-500 shadow-amber-500/40",
    soft: "bg-amber-500/5",
    border: "border-amber-500/20",
    text: "text-amber-400"
  },
  ensaladas: {
    badge: "bg-pink-500/10 text-pink-400",
    active: "bg-pink-600 border-pink-500 shadow-pink-500/40",
    soft: "bg-pink-500/5",
    border: "border-pink-500/20",
    text: "text-pink-400"
  },
  postres: {
    badge: "bg-purple-500/10 text-purple-400",
    active: "bg-purple-600 border-purple-500 shadow-purple-500/40",
    soft: "bg-purple-500/5",
    border: "border-purple-500/20",
    text: "text-purple-400"
  },
};

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DIAS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// ── Helpers de fecha ──
// ── Todas las fechas usan NOON local (12:00) para evitar desfase por timezone ──
function fechaLocal(year, month, day) {
  // month es 0-indexed. Usamos noon para evitar cambios de día por DST/UTC
  return new Date(year, month, day, 12, 0, 0, 0);
}
function getLunes(date) {
  const y = date.getFullYear(), mo = date.getMonth(), d = date.getDate();
  const base = fechaLocal(y, mo, d);
  const day = base.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
  const diff = day === 0 ? -6 : 1 - day; // retroceder hasta el Lunes
  return fechaLocal(y, mo, d + diff);
}
function addDays(date, n) {
  return fechaLocal(date.getFullYear(), date.getMonth(), date.getDate() + n);
}
function toKey(date) {
  // Siempre usar componentes locales — nunca toISOString()
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function formatFecha(date) {
  return `${date.getDate()} ${MESES[date.getMonth()].slice(0, 3).toUpperCase()}`;
}
function getPrimerDiaMes(year, month) {
  return fechaLocal(year, month, 1);
}
function getDiasEnMes(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

import DecorativeBackground from "../components/DecorativeBackground";

export default function PlanogramaPage({ user, rol, onBack, onNavegar }) {
  const { t } = useTheme();
  const [vista, setVista] = useState("semanal"); // semanal | diaria | mensual
  const [fechaBase, setFechaBase] = useState(new Date());
  const [datos, setDatos] = useState({}); // { "2024-05-22": { entradas: [...], ... } }
  const [fichas, setFichas] = useState([]);
  const [editando, setEditando] = useState(null); // { key, catId }
  const [modalOpen, setModalOpen] = useState(false);
  const [modalValor, setModalValor] = useState("");
  const [busquedaFicha, setBusquedaFicha] = useState("");
  const [saving, setSaving] = useState(false);
  const [leyendoIA, setLeyendoIA] = useState(false);

  // Ctrl+V global — pegar imagen directamente
  const [modalIAOpen, setModalIAOpen] = useState(false);
  const [previewIA, setPreviewIA] = useState(null); // { mes, anio, dias: [...] }
  const [guardandoIA, setGuardandoIA] = useState(false);

  // ── Eliminación ──
  const [modalDiaOpen, setModalDiaOpen] = useState(false);
  const [modalDiaKey, setModalDiaKey] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [diasSeleccionados, setDiasSeleccionados] = useState(new Set());
  const [categoriaActiva, setCategoriaActiva] = useState("todas");
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tabsRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (modalIAOpen || modalOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) leerPlanogramaConIA(file);
          break;
        }
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [modalIAOpen, modalOpen]);
  const inputRef = useRef(null);

  // ── Cargar fichas técnicas para el selector ──
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "fichas"), snap => {
      setFichas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // ── Lógica de scroll para categorías ──
  const checkScroll = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  const scrollTabs = (dir) => {
    if (tabsRef.current) {
      const amount = dir === "left" ? -200 : 200;
      tabsRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const el = tabsRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
      // Chequeo inicial discreto
      setTimeout(checkScroll, 500);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [datos, categoriaActiva, vista]); // Re-chequear al cambiar datos o vista

  // ── Lógica de conteo para los chips de categoría ──
  const conteos = (() => {
    const res = { todas: 0 };
    CATEGORIAS.forEach(c => res[c.id] = 0);

    let rango = [];
    if (vista === "diaria") {
      rango = [toKey(fechaBase)];
    } else if (vista === "semanal") {
      const lunes = getLunes(fechaBase);
      for (let i = 0; i < 7; i++) rango.push(toKey(addDays(lunes, i)));
    } else if (vista === "mensual") {
      const y = fechaBase.getFullYear(), m = fechaBase.getMonth();
      const total = getDiasEnMes(y, m);
      for (let i = 1; i <= total; i++) rango.push(toKey(fechaLocal(y, m, i)));
    }

    rango.forEach(key => {
      const diaData = datos[key];
      if (diaData) {
        Object.entries(diaData).forEach(([catId, platos]) => {
          if (res[catId] !== undefined && platos.length > 0) {
            res[catId] += platos.length;
            res.todas += platos.length;
          }
        });
      }
    });
    return res;
  })();

  // ── Cargar datos del rango actual ──
  useEffect(() => {
    let keys = [];
    if (vista === "semanal") {
      const lunes = getLunes(fechaBase);
      keys = Array.from({ length: 7 }, (_, i) => toKey(addDays(lunes, i)));
    } else if (vista === "diaria") {
      keys = [toKey(fechaBase)];
    } else {
      const year = fechaBase.getFullYear();
      const month = fechaBase.getMonth();
      const dias = getDiasEnMes(year, month);
      keys = Array.from({ length: dias }, (_, i) => toKey(fechaLocal(year, month, i + 1)));
    }

    const unsubs = keys.map(key => {
      const ref = doc(db, "planograma", key);
      return onSnapshot(ref, snap => {
        if (snap.exists()) {
          setDatos(prev => ({ ...prev, [key]: snap.data() }));
        } else {
          setDatos(prev => ({ ...prev, [key]: {} }));
        }
      });
    });
    return () => unsubs.forEach(u => u());
  }, [vista, fechaBase]);

  // ── Navegar ──
  const navegar = (dir) => {
    const d = new Date(fechaBase);
    if (vista === "semanal") d.setDate(d.getDate() + dir * 7);
    else if (vista === "diaria") d.setDate(d.getDate() + dir);
    else d.setMonth(d.getMonth() + dir);
    setFechaBase(d);
  };

  // ── Abrir modal de edición ──
  const abrirEditar = (key, catId) => {
    const valor = (datos[key]?.[catId] || []).join("\n");
    setEditando({ key, catId });
    setModalValor(valor);
    setBusquedaFicha("");
    setModalOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── Guardar celda ──
  const guardarCelda = async () => {
    if (!editando) return;
    setSaving(true);
    try {
      const { key, catId } = editando;
      const lineas = modalValor.split("\n").map(l => l.trim()).filter(Boolean);
      const ref = doc(db, "planograma", key);
      const snap = await getDoc(ref);
      const prev = snap.exists() ? snap.data() : {};
      await setDoc(ref, { ...prev, [catId]: lineas, fecha: key, _modifiedAt: serverTimestamp(), _modifiedBy: user?.displayName || user?.email || "Usuario" });
      toast.success("Guardado ✅");
      setModalOpen(false);
      setEditando(null);
    } catch {
      toast.error("Error al guardar");
    }
    setSaving(false);
  };

  const agregarFicha = (nombre) => {
    const lineas = modalValor.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lineas.includes(nombre)) {
      setModalValor(prev => prev ? prev + "\n" + nombre : nombre);
    }
  };

  const fichasFiltradas = fichas.filter(f =>
    !busquedaFicha || f.nombre?.toLowerCase().includes(busquedaFicha.toLowerCase())
  );

  // ── Leer planograma con IA ──
  const leerPlanogramaConIA = async (file) => {
    if (!file) return;
    setLeyendoIA(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/analizar-ficha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: file.type, tipo: "planograma" }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || "Error al procesar"); return; }
      if (!data.planograma?.dias?.length) { toast.error("No se detectaron días en la imagen"); return; }
      // Sanitizar año: si la IA devuelve null, 0 o un año inválido (<2000), usar el actual
      const anioActual = new Date().getFullYear();
      const planograma = {
        ...data.planograma,
        anio: (data.planograma.anio && data.planograma.anio >= 2000) ? data.planograma.anio : anioActual,
      };
      setPreviewIA(planograma);
      setModalIAOpen(true);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLeyendoIA(false);
    }
  };

  // ── Guardar planograma leído por IA ──
  const guardarPlanogramaIA = async () => {
    if (!previewIA) return;
    setGuardandoIA(true);
    try {
      const { mes, anio, dias } = previewIA;
      for (const diaData of dias) {
        const { dia, ...categorias } = diaData;
        // Validar que el día sea un número válido (1-31)
        const diaNum = parseInt(dia);
        if (!diaNum || diaNum < 1 || diaNum > 31) continue;
        const fecha = fechaLocal(anio, mes - 1, diaNum);
        const key = toKey(fecha);
        const ref = doc(db, "planograma", key);
        const snap = await getDoc(ref);
        const prev = snap.exists() ? snap.data() : {};
        // Mapear categorías de la IA a las ids del sistema
        const mapeo = {
          entradas:      categorias.entradas      || [],
          principal:     categorias.principal     || [],
          parrilla:      categorias.parrilla      || [],
          sopa:          categorias.sopa          || [],
          acompanamiento:categorias.acompanamiento|| [],
          ensaladas:     categorias.ensaladas     || [],
          postres:       categorias.postres       || [],
        };
        // Solo guardar días con al menos un plato
        const tieneAlgo = Object.values(mapeo).some(arr => arr.length > 0);
        if (tieneAlgo) {
          await setDoc(ref, { ...prev, ...mapeo, fecha: key, _modifiedAt: serverTimestamp(), _modifiedBy: user?.displayName || user?.email || "Usuario" });
        }
      }
      toast.success(`Planograma de ${MESES[previewIA.mes - 1]} ${previewIA.anio} cargado ✅`);
      setModalIAOpen(false);
      setPreviewIA(null);
      // Navegar al mes importado
      setFechaBase(new Date(previewIA.anio, previewIA.mes - 1, 1));
      setVista("mensual");
    } catch (err) {
      toast.error("Error al guardar: " + err.message);
    }
    setGuardandoIA(false);
  };

  // ── Abrir modal de detalle del día ──
  const abrirModalDia = (key, e) => {
    e.stopPropagation();
    setModalDiaKey(key);
    setModalDiaOpen(true);
  };

  // ── Eliminar categoría individual de un día ──
  const eliminarCategoria = async (key, catId) => {
    setEliminando(true);
    try {
      const ref = doc(db, "planograma", key);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const prev = snap.data();
      await setDoc(ref, { ...prev, [catId]: [] });
      // Si el día queda sin platos, eliminarlo
      const updated = { ...prev, [catId]: [] };
      const tieneAlgo = CATEGORIAS.some(c => (updated[c.id] || []).length > 0);
      if (!tieneAlgo) await deleteDoc(ref);
      toast.success("Categoría eliminada");
    } catch { toast.error("Error al eliminar"); }
    setEliminando(false);
  };

  // ── Eliminar día completo ──
  const eliminarDia = async (key) => {
    setEliminando(true);
    try {
      await deleteDoc(doc(db, "planograma", key));
      toast.success("Día eliminado");
      setModalDiaOpen(false);
      setModalDiaKey(null);
    } catch { toast.error("Error al eliminar"); }
    setEliminando(false);
  };

  // ── Eliminar días seleccionados ──
  const eliminarDiasSeleccionados = async () => {
    if (!diasSeleccionados.size) return;
    setEliminando(true);
    try {
      await Promise.all([...diasSeleccionados].map(key => deleteDoc(doc(db, "planograma", key))));
      toast.success(`${diasSeleccionados.size} día(s) eliminado(s)`);
      setDiasSeleccionados(new Set());
      setModoSeleccion(false);
    } catch { toast.error("Error al eliminar"); }
    setEliminando(false);
  };

  const toggleSeleccion = (key) => {
    setDiasSeleccionados(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // ── Render celda ──
  const renderCelda = (key, catId, compact = false) => {
    const platos = datos[key]?.[catId] || [];
    const color = BADGE_COLORS[catId] || BADGE_COLORS.todas;
    
    return (
      <div
        onClick={() => abrirEditar(key, catId)}
        className={`cursor-pointer min-h-[56px] rounded-lg p-2 transition-all group border ${
          platos.length > 0 
            ? `border-transparent ${t.isDark ? "bg-white/3" : "bg-slate-50"} hover:${color.soft} hover:${color.border}` 
            : `border-dashed ${t.border} opacity-50 hover:opacity-100 hover:${color.border} hover:${color.soft}`
        }`}
      >
        {platos.length > 0 ? (
          <ul className="space-y-1">
            {platos.map((p, i) => (
              <li key={i} className={`flex items-start gap-2 ${t.text} text-[11px] leading-tight font-medium`}>
                <span className={`w-3.5 h-3.5 rounded-full ${color.badge} text-[8px] font-black flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm border border-white/5`}>
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0 break-words">{p}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`${t.textSecondary} text-xs italic flex items-center gap-1`}>
            <span className={`material-symbols-outlined opacity-40 group-hover:opacity-100 transition-opacity ${color.text}`} style={{ fontSize: 14 }}>add</span>
            {compact ? "" : "Agregar platos"}
          </p>
        )}
      </div>
    );
  };

  // ── Títulos de navegación ──
  const getTitulo = () => {
    if (vista === "semanal") {
      const lunes = getLunes(fechaBase);
      const domingo = addDays(lunes, 6);
      return `Semana del ${formatFecha(lunes)} al ${formatFecha(domingo)}, ${lunes.getFullYear()}`;
    }
    if (vista === "diaria") {
      return `${DIAS[(fechaBase.getDay() + 6) % 7]} ${fechaBase.getDate()} de ${MESES[fechaBase.getMonth()]} ${fechaBase.getFullYear()}`;
    }
    return `${MESES[fechaBase.getMonth()]} ${fechaBase.getFullYear()}`;
  };

  // ── VISTA SEMANAL ──
  const lunes = getLunes(fechaBase);
  const diasSemana = Array.from({ length: 7 }, (_, i) => ({
    label: DIAS[i],
    short: DIAS_SHORT[i],
    key: toKey(addDays(lunes, i)),
    date: addDays(lunes, i),
  }));
  const hoyDate = new Date();
  const hoy = toKey(fechaLocal(hoyDate.getFullYear(), hoyDate.getMonth(), hoyDate.getDate()));

  return (
    <div className={`${t.bg} flex h-screen overflow-hidden`}>
      <Toaster />
      <div className="hidden md:block flex-shrink-0">
        <AppSidebar user={user} rol={rol} moduloActivo="planificador" onNavegar={onNavegar} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="hidden md:block flex-shrink-0">
          <Navbar 
            user={user} 
            rol={rol} 
            onNavegar={onNavegar} 
            onPerfil={() => onNavegar("perfil")}
            onTutorial={() => { sessionStorage.setItem("trigger_tutorial", "true"); onNavegar(null); }}
            titulo="Planograma" 
          />
        </div>

        {/* Header móvil */}
        <header className={`md:hidden sticky top-0 z-40 ${t.bgNav} border-b ${t.border}`}>
          {/* Fila 1: título + navegación */}
          <div className="flex items-center gap-2 px-3 py-2">
            <button onClick={onBack} className={`w-9 h-9 flex items-center justify-center rounded-full ${t.hover} ${t.text} flex-shrink-0`}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back</span>
            </button>
            <div className="flex-1 min-w-0">
              <h2 className={`${t.text} text-sm font-bold truncate`}>Planograma</h2>
              <p className={`${t.textSecondary} text-[10px] truncate`}>{getTitulo()}</p>
            </div>
            {/* Navegación temporal */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => navegar(-1)} className={`w-8 h-8 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
              </button>
              <button onClick={() => navegar(1)} className={`w-8 h-8 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
              </button>
            </div>
          </div>
          {/* Fila 2: selector de vista + IA */}
          <div className="flex items-center gap-2 px-3 pb-2">
            {/* Selector vista */}
            <div className={`flex ${t.bgCard} border ${t.border} rounded-xl overflow-hidden flex-1`}>
              {["semanal", "diaria", "mensual"].map(v => (
                <button key={v} onClick={() => setVista(v)}
                  className={`flex-1 py-1.5 text-[11px] font-bold transition-colors ${
                    vista === v ? "bg-blue-600 text-white" : `${t.textSecondary}`
                  }`}>
                  {v === "semanal" ? "Semana" : v === "diaria" ? "Día" : "Mes"}
                </button>
              ))}
            </div>
            {/* Botón IA — solo admins */}
            {(rol === "admin" || rol === "unico") && (
              <label className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-xl font-bold text-xs transition flex-shrink-0 ${leyendoIA ? "bg-purple-700 opacity-60 pointer-events-none" : "bg-gradient-to-r from-purple-600 to-indigo-600"} text-white`}>
                {leyendoIA
                  ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  : <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                }
                IA
                <input type="file" accept="image/*" className="hidden" disabled={leyendoIA}
                  onChange={e => { const f = e.target.files?.[0]; if (f) leerPlanogramaConIA(f); e.target.value = ""; }} />
              </label>
            )}
            {/* Botón seleccionar — solo en mensual */}
            {vista === "mensual" && (
              <button onClick={() => { setModoSeleccion(m => !m); setDiasSeleccionados(new Set()); }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition flex-shrink-0 ${
                  modoSeleccion ? "bg-red-500/10 border-red-500/40 text-red-400" : `${t.bgCard} ${t.border} ${t.textSecondary}`
                }`}>
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{modoSeleccion ? "close" : "checklist"}</span>
                {modoSeleccion ? "Cancelar" : "Sel."}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative">
          <DecorativeBackground color1="purple-600" color2="indigo-500" />
          <div className="px-4 md:px-8 py-6">

            {/* Header */}

            <div className="hidden md:flex md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <button 
                  onClick={onBack} 
                  className={`w-11 h-11 flex items-center justify-center rounded-2xl ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-blue-500 hover:border-blue-500/50 transition-all shadow-sm`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
                </button>
                <div className="flex flex-col">
                  <h2 className={`${t.text} text-xl font-black tracking-tight leading-none`}>{getTitulo()}</h2>
                  <p className={`${t.textSecondary} text-[11px] font-bold uppercase tracking-wider mt-1.5`}>Vista {vista}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Botón leer con IA — solo admins */}
                {(rol === "admin" || rol === "unico") && (
                  <div className="flex items-center gap-2">
                    <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl font-bold text-sm transition shadow-lg ${leyendoIA ? "bg-purple-700 opacity-60 pointer-events-none" : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 shadow-purple-500/20"} text-white`}>
                      {leyendoIA
                        ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Leyendo...</>
                        : <><span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span> Leer con IA</>
                      }
                      <input type="file" accept="image/*" className="hidden" disabled={leyendoIA}
                        onChange={e => { const f = e.target.files?.[0]; if (f) leerPlanogramaConIA(f); e.target.value = ""; }} />
                    </label>
                    <span className={`${t.textSecondary} text-xs flex items-center gap-1`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>content_paste</span>
                      <kbd className={`px-1.5 py-0.5 rounded ${t.bgCard} border ${t.border} font-mono text-[10px]`}>Ctrl+V</kbd>
                    </span>
                  </div>
                )}

              {/* Botón seleccionar — solo vista mensual */}
              {vista === "mensual" && (
                <button
                  onClick={() => { setModoSeleccion(m => !m); setDiasSeleccionados(new Set()); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    modoSeleccion
                      ? "bg-red-500/10 border-red-500/40 text-red-400"
                      : `${t.bgCard} ${t.border} ${t.textSecondary} hover:text-blue-400`
                  }`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                    {modoSeleccion ? "close" : "checklist"}
                  </span>
                  {modoSeleccion ? "Cancelar" : "Seleccionar"}
                </button>
              )}

              {/* Selector vista */}
                <div className={`flex ${t.bgCard} border ${t.border} rounded-xl overflow-hidden`}>
                  {["semanal", "diaria", "mensual"].map(v => (
                    <button key={v} onClick={() => setVista(v)}
                      className={`px-3 py-2 text-xs font-bold capitalize transition-colors ${
                        vista === v ? "bg-blue-600 text-white" : `${t.textSecondary} hover:${t.text}`
                      }`}>
                      {v === "semanal" ? "Semana" : v === "diaria" ? "Día" : "Mes"}
                    </button>
                  ))}
                </div>

                {/* Navegación */}
                <div className="flex items-center gap-1">
                  <button onClick={() => navegar(-1)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-blue-400 transition`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
                  </button>
                  <button onClick={() => navegar(1)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-blue-400 transition`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Chips de Categorías */}
            <div className="sticky top-0 z-30 bg-[#0f1923]/95 backdrop-blur-md border-b border-white/10 -mx-4 md:-mx-8 px-4 md:px-8 mb-4 group/filters transition-all">
              
              {/* Flecha Izquierda (Solo Desktop) */}
              <div className={`absolute left-0 top-0 bottom-0 z-10 w-16 pointer-events-none hidden md:flex items-center justify-start pl-4 md:pl-8 transition-opacity duration-300 ${canScrollLeft ? "opacity-100" : "opacity-0"}`}>
                <div className={`absolute inset-0 bg-gradient-to-r from-[rgba(15,25,35,0.9)] via-[rgba(15,25,35,0.5)] to-transparent`} />
                <button 
                  onClick={() => scrollTabs("left")}
                  className={`pointer-events-auto w-8 h-8 rounded-full border ${t.border} ${t.bgCard} ${t.text} flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all z-20`}>
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
              </div>

              {/* Contenedor Scrollable */}
              <div 
                ref={tabsRef}
                className="overflow-x-auto no-scrollbar py-3 scroll-smooth"
              >
                <div className="flex gap-3 min-w-max px-2">
                  <button
                    onClick={() => setCategoriaActiva("todas")}
                    className={`group flex items-center gap-2.5 px-5 py-2 rounded-full text-[11px] font-black tracking-wide uppercase transition-all duration-300 border ${
                      categoriaActiva === "todas"
                        ? `${BADGE_COLORS.todas.active} text-white shadow-lg scale-105`
                        : `${t.bgCard} ${t.border} ${t.textSecondary} hover:border-blue-500/50 hover:text-blue-400 hover:scale-105`
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">apps</span>
                    <span>Todas</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      categoriaActiva === "todas" ? "bg-white/20 text-white" : BADGE_COLORS.todas.badge
                    }`}>
                      {conteos.todas}
                    </span>
                  </button>
                  {CATEGORIAS.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoriaActiva(cat.id)}
                      className={`group flex items-center gap-2.5 px-5 py-2 rounded-full text-[11px] font-black tracking-wide uppercase transition-all duration-300 border ${
                        categoriaActiva === cat.id
                          ? `${(BADGE_COLORS[cat.id]?.active || BADGE_COLORS.todas.active)} text-white shadow-lg scale-105`
                          : `${t.bgCard} ${t.border} ${t.textSecondary} hover:border-blue-500/50 hover:text-blue-400 hover:scale-105`
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {cat.icon}
                      </span>
                      <span>{cat.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        categoriaActiva === cat.id ? "bg-white/20 text-white" : (BADGE_COLORS[cat.id]?.badge || BADGE_COLORS.todas.badge)
                      }`}>
                        {conteos[cat.id]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Flecha Derecha (Solo Desktop) */}
              <div className={`absolute right-0 top-0 bottom-0 z-10 w-16 pointer-events-none hidden md:flex items-center justify-end pr-4 md:pr-8 transition-opacity duration-300 ${canScrollRight ? "opacity-100" : "opacity-0"}`}>
                <div className={`absolute inset-0 bg-gradient-to-l from-[rgba(15,25,35,0.9)] via-[rgba(15,25,35,0.5)] to-transparent`} />
                <button 
                  onClick={() => scrollTabs("right")}
                  className={`pointer-events-auto w-8 h-8 rounded-full border ${t.border} ${t.bgCard} ${t.text} flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all z-20`}>
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>

            </div>

            {/* ══════════════ VISTA SEMANAL ══════════════ */}
            {vista === "semanal" && (
              <div className={`${t.bgCard} border ${t.border} rounded-2xl overflow-hidden shadow-sm`}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    {/* Header días */}
                    <thead>
                      <tr className={`${t.isDark ? "bg-white/5" : "bg-slate-50"} border-b ${t.border}`}>
                        <th className={`w-32 px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest ${t.textSecondary}`}>
                          Categoría
                        </th>
                        {diasSemana.map(dia => (
                          <th key={dia.key} className={`px-3 py-3 text-center min-w-[110px] ${dia.key === hoy ? "bg-blue-500/10" : ""}`}>
                            <p className={`text-xs font-black uppercase ${dia.key === hoy ? "text-blue-400" : t.textSecondary}`}>{dia.short}</p>
                            <p className={`text-lg font-black leading-none mt-0.5 ${dia.key === hoy ? "text-blue-400" : t.text}`}>
                              {dia.date.getDate()}
                            </p>
                          </th>
                        ))}
                      </tr>
                    </thead>
                     <tbody className={`divide-y ${t.border}`}>
                      {CATEGORIAS.filter(cat => categoriaActiva === "todas" || cat.id === categoriaActiva).map((cat, ci) => (
                        <tr key={cat.id} className={`${ci % 2 === 0 ? "" : t.isDark ? "bg-white/[0.02]" : "bg-slate-50/50"}`}>
                          <td className={`px-4 py-2 border-r ${t.border}`}>
                            <div className="flex items-center gap-2">
                              <span className={`material-symbols-outlined ${(BADGE_COLORS[cat.id] || BADGE_COLORS.todas).text}`} style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>{cat.icon}</span>
                              <span className={`${t.textSecondary} text-[10px] font-black uppercase tracking-wider`}>{cat.label}</span>
                            </div>
                          </td>
                          {diasSemana.map(dia => (
                            <td key={dia.key} className={`px-2 py-1.5 ${dia.key === hoy ? "bg-blue-500/5" : ""}`}>
                              {renderCelda(dia.key, cat.id)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

             {/* ══════════════ VISTA DIARIA ══════════════ */}
            {vista === "diaria" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CATEGORIAS.filter(cat => categoriaActiva === "todas" || cat.id === categoriaActiva).map(cat => {
                  const key = toKey(fechaBase);
                  const platos = datos[key]?.[cat.id] || [];
                  const color = BADGE_COLORS[cat.id] || BADGE_COLORS.todas;
                  return (
                    <div key={cat.id} className={`${t.bgCard} border ${platos.length > 0 ? color.border : t.border} rounded-2xl overflow-hidden transition-all duration-300`}>
                      <div className={`px-5 py-3 border-b ${platos.length > 0 ? color.border : t.border} flex items-center justify-between ${platos.length > 0 ? color.soft : ""}`}>
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined ${color.text}`} style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>{cat.icon}</span>
                          <h3 className={`${t.text} font-bold text-sm`}>{cat.label}</h3>
                        </div>
                        <button onClick={() => abrirEditar(key, cat.id)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg ${color.badge} hover:brightness-110 transition shadow-sm`}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                        </button>
                      </div>
                      <div className="p-4">
                        {platos.length > 0 ? (
                          <ul className="space-y-1.5">
                            {platos.map((p, i) => (
                              <li key={i} className={`flex items-center gap-2 ${t.text} text-sm`}>
                                <span className={`w-5 h-5 rounded-full ${color.badge} text-[10px] font-black flex items-center justify-center flex-shrink-0 shadow-sm`}>{i + 1}</span>
                                {p}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <button onClick={() => abrirEditar(key, cat.id)}
                            className={`w-full py-4 border border-dashed ${t.border} rounded-xl ${t.textSecondary} text-xs hover:border-current hover:${color.text} hover:${color.soft} transition flex items-center justify-center gap-1.5`}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>
                            Agregar platos
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ══════════════ VISTA MENSUAL ══════════════ */}
            {vista === "mensual" && (() => {
              const year = fechaBase.getFullYear();
              const month = fechaBase.getMonth();
              const totalDias = getDiasEnMes(year, month);
              const primerDia = getPrimerDiaMes(year, month);
              const offset = (primerDia.getDay() + 6) % 7; // lunes = 0
              const celdas = [];
              for (let i = 0; i < offset; i++) celdas.push(null);
              for (let i = 1; i <= totalDias; i++) celdas.push(i);
              while (celdas.length % 7 !== 0) celdas.push(null);

              return (
                <div className={`${t.bgCard} border ${t.border} rounded-2xl overflow-hidden`}>
                  {/* Header días semana */}
                  <div className={`grid grid-cols-7 border-b ${t.border} ${t.isDark ? "bg-white/5" : "bg-slate-50"}`}>
                    {DIAS_SHORT.map(d => (
                      <div key={d} className={`py-3 text-center text-[10px] font-black uppercase tracking-widest ${t.textSecondary}`}>{d}</div>
                    ))}
                  </div>
                  {/* Semanas */}
                  {Array.from({ length: celdas.length / 7 }, (_, w) => (
                    <div key={w} className={`grid grid-cols-7 border-b ${t.border} last:border-0`}>
                      {celdas.slice(w * 7, w * 7 + 7).map((dia, di) => {
                        if (!dia) return <div key={di} className={`min-h-[100px] border-r ${t.border} last:border-0 ${t.isDark ? "bg-white/[0.02]" : "bg-slate-50/50"}`} />;
                         const key = toKey(fechaLocal(year, month, dia));
                        const esHoy = key === hoy;
                        const catsFiltradas = CATEGORIAS.filter(cat => categoriaActiva === "todas" || cat.id === categoriaActiva);
                        const totalPlatos = catsFiltradas.reduce((acc, cat) => acc + (datos[key]?.[cat.id]?.length || 0), 0);
                        const seleccionado = diasSeleccionados.has(key);
                        return (
                          <div key={di}
                            className={`min-h-[100px] border-r ${t.border} last:border-0 p-2 cursor-pointer transition-colors relative group ${
                              esHoy ? "bg-blue-500/8" : ""
                            } ${seleccionado ? "bg-red-500/10 ring-2 ring-inset ring-red-500/40" : "hover:bg-blue-500/5"}`}
                            onClick={() => {
                              if (modoSeleccion) {
                                if (totalPlatos > 0) toggleSeleccion(key);
                              } else if (totalPlatos > 0) {
                                abrirModalDia(key, { stopPropagation: () => {} });
                              } else {
                                setFechaBase(fechaLocal(year, month, dia)); setVista("diaria");
                              }
                            }}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                                esHoy ? "bg-blue-600 text-white" : t.text
                              } ${seleccionado ? "!bg-red-500 !text-white" : ""}`}>{dia}</span>
                              {modoSeleccion && totalPlatos > 0 && (
                                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                                  seleccionado ? "bg-red-500 border-red-500" : `${t.border} border-current ${t.textSecondary}`
                                }`}>
                                  {seleccionado && <span className="material-symbols-outlined text-white" style={{ fontSize: 11 }}>check</span>}
                                </span>
                              )}
                              {!modoSeleccion && totalPlatos > 0 && (
                              <div className="flex items-center gap-1">
                                <span className={`text-[9px] font-bold ${BADGE_COLORS.todas.badge} px-1.5 py-0.5 rounded-full`}>{totalPlatos}</span>
                                <button
                                  onClick={e => abrirModalDia(key, e)}
                                  className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-red-400 hover:bg-red-500/10 transition"
                                  title="Eliminar día">
                                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            {catsFiltradas.slice(0, 3).map(cat => {
                              const platos = datos[key]?.[cat.id] || [];
                              if (!platos[0]) return null;
                              const color = BADGE_COLORS[cat.id] || BADGE_COLORS.todas;
                              return (
                                <div key={cat.id} className={`text-[9px] ${t.textSecondary} truncate`}>
                                  <span className={`${color.text} font-bold`}>{cat.label.slice(0, 3)}.</span> {platos[0]}
                                </div>
                              );
                            })}
                            {totalPlatos > 3 && <p className={`text-[9px] ${BADGE_COLORS.todas.text} font-bold`}>+{totalPlatos - 3} más</p>}
                          </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })()}

          </div>
        </main>
      </div>

      {/* ══════════════ MODAL EDICIÓN ══════════════ */}
    {modalOpen && editando && (() => {
      const cat = CATEGORIAS.find(c => c.id === editando.catId);
      const color = BADGE_COLORS[editando.catId] || BADGE_COLORS.todas;
      return (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden`}>
            {/* Header modal */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${t.border} ${color.soft}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${color.badge} flex items-center justify-center`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{cat?.icon}</span>
                </div>
                <div>
                  <h3 className={`${t.text} font-bold`}>{cat?.label}</h3>
                  <p className={`${t.textSecondary} text-xs mt-0.5`}>
                    {editando.key} — un plato por línea
                  </p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className={`w-8 h-8 flex items-center justify-center rounded-full ${t.hover} ${t.textSecondary}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Textarea */}
              <div>
                <label className={`${t.textSecondary} text-xs font-bold uppercase tracking-wider mb-2 block`}>Platos (un plato por línea)</label>
                <textarea
                  ref={inputRef}
                  value={modalValor}
                  onChange={e => setModalValor(e.target.value)}
                  rows={4}
                  className={`w-full ${t.bgInput} border ${t.border} ${t.text} px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
                  placeholder={"Plato 1\nPlato 2\nPlato 3..."}
                />
              </div>

              {/* Selector fichas */}
              <div>
                <label className={`${t.textSecondary} text-xs font-bold uppercase tracking-wider mb-2 block`}>O selecciona desde Fichas Técnicas</label>
                <div className="relative mb-2">
                  <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 ${t.textSecondary}`} style={{ fontSize: 16 }}>search</span>
                  <input value={busquedaFicha} onChange={e => setBusquedaFicha(e.target.value)}
                    className={`w-full ${t.bgInput} border ${t.border} ${t.text} pl-9 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Buscar ficha..." />
                </div>
                <div className="max-h-40 overflow-y-auto rounded-xl border ${t.border} divide-y ${t.border}">
                  {fichasFiltradas.slice(0, 20).map(f => {
                    const yaAgregado = modalValor.split("\n").map(l => l.trim()).includes(f.nombre);
                    return (
                      <button key={f.id}
                        onClick={() => agregarFicha(f.nombre)}
                        disabled={yaAgregado}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between gap-2 ${
                          yaAgregado ? `${t.textSecondary} opacity-50` : `${t.text} ${t.hover}`
                        }`}>
                        <span className="truncate">{f.nombre}</span>
                        {yaAgregado
                          ? <span className="material-symbols-outlined text-emerald-400 flex-shrink-0" style={{ fontSize: 14 }}>check_circle</span>
                          : <span className="material-symbols-outlined text-blue-400 flex-shrink-0" style={{ fontSize: 14 }}>add_circle</span>
                        }
                      </button>
                    );
                  })}
                  {fichasFiltradas.length === 0 && (
                    <p className={`${t.textSecondary} text-xs text-center py-4`}>Sin resultados</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`flex gap-3 px-5 pb-5`}>
              <button onClick={() => setModalOpen(false)}
                className={`flex-1 ${t.bgInput} ${t.text} font-semibold py-2.5 rounded-xl text-sm transition`}>
                Cancelar
              </button>
              <button onClick={guardarCelda} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-sm transition disabled:opacity-50">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      );
    })()}
      {/* ══ BARRA SELECCIÓN MÚLTIPLE ══ */}
      {modoSeleccion && (
        <div className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border ${t.border} ${t.bgCard}`}
          style={{ minWidth: 280 }}>
          <span className="material-symbols-outlined text-red-400" style={{ fontSize: 20 }}>checklist</span>
          <span className={`${t.text} text-sm font-bold flex-1`}>
            {diasSeleccionados.size === 0 ? "Toca un día para seleccionar" : `${diasSeleccionados.size} día(s) seleccionado(s)`}
          </span>
          <button
            onClick={eliminarDiasSeleccionados}
            disabled={diasSeleccionados.size === 0 || eliminando}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold px-3 py-2 rounded-xl transition">
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
            Eliminar
          </button>
        </div>
      )}

      {/* ══ MODAL DETALLE DÍA ══ */}
      {modalDiaOpen && modalDiaKey && (() => {
        const diaLabel = (() => {
          const d = new Date(modalDiaKey + "T12:00:00");
          return `${DIAS[(d.getDay() + 6) % 7]} ${d.getDate()} de ${MESES[d.getMonth()]} ${d.getFullYear()}`;
        })();
        const catsConDatos = CATEGORIAS.filter(cat => (datos[modalDiaKey]?.[cat.id] || []).length > 0);
        return (
          <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
            <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-md shadow-2xl`}>
              {/* Header */}
              <div className={`flex items-center justify-between px-6 py-4 border-b ${t.border}`}>
                <div>
                  <p className={`${t.text} font-bold`}>{diaLabel}</p>
                  <p className={`${t.textSecondary} text-xs mt-0.5`}>{catsConDatos.length} categoría(s) con platos</p>
                </div>
                <button onClick={() => { setModalDiaOpen(false); setModalDiaKey(null); }}
                  className={`w-8 h-8 flex items-center justify-center rounded-full ${t.hover} ${t.textSecondary}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              {/* Lista de categorías */}
              <div className="px-4 py-3 space-y-2 max-h-80 overflow-y-auto">
                {catsConDatos.length === 0 ? (
                  <p className={`${t.textSecondary} text-sm text-center py-4`}>Este día no tiene platos.</p>
                ) : catsConDatos.map(cat => {
                  const platos = datos[modalDiaKey]?.[cat.id] || [];
                  return (
                    <div key={cat.id} className={`flex items-start gap-3 p-3 rounded-xl ${t.bgInput} border ${t.border}`}>
                      <span className="material-symbols-outlined text-blue-400 mt-0.5 flex-shrink-0" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`${t.textSecondary} text-[10px] font-black uppercase tracking-wider mb-0.5`}>{cat.label}</p>
                        <p className={`${t.text} text-xs`}>{platos.join(", ")}</p>
                      </div>
                      <button
                        onClick={() => eliminarCategoria(modalDiaKey, cat.id)}
                        disabled={eliminando}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 transition flex-shrink-0 disabled:opacity-40"
                        title={`Eliminar ${cat.label}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className={`flex gap-3 px-5 pb-5 pt-2 border-t ${t.border} mt-2`}>
                <button
                  onClick={() => { setModalDiaOpen(false); setFechaBase(new Date(modalDiaKey + "T12:00:00")); setVista("diaria"); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 ${t.bgInput} ${t.text} font-semibold py-2.5 rounded-xl text-sm transition`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_full</span>
                  Ver día
                </button>
                <button
                  onClick={() => eliminarDia(modalDiaKey)}
                  disabled={eliminando || catsConDatos.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition">
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete_forever</span>
                  {eliminando ? "Eliminando..." : "Eliminar día"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <BottomNav moduloActivo="planograma" onNavegar={onNavegar} />

      {/* ══ MODAL IA — previsualización planograma ══ */}
      {modalIAOpen && previewIA && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[88vh]`}>

            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${t.border} flex-shrink-0`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-400" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>
                <div>
                  <p className={`${t.text} font-bold`}>Planograma leído con IA</p>
                  <p className={`${t.textSecondary} text-xs`}>{MESES[previewIA.mes - 1]} {previewIA.anio} · {previewIA.dias.filter(d => Object.values(d).some(v => Array.isArray(v) && v.length > 0)).length} días con platos</p>
                </div>
              </div>
              <button onClick={() => { setModalIAOpen(false); setPreviewIA(null); }}
                className={`w-8 h-8 flex items-center justify-center rounded-full ${t.hover} ${t.textSecondary}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            {/* Preview días — compacto */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {previewIA.dias.filter(d => {
                const { dia, diaSemana, ...cats } = d;
                return Object.values(cats).some(v => Array.isArray(v) && v.length > 0);
              }).map((diaData, i) => {
                const { dia, diaSemana, ...cats } = diaData;
                const labelDia = diaSemana || DIAS[(new Date(previewIA.anio, previewIA.mes - 1, dia).getDay() + 6) % 7];
                return (
                  <div key={i} className={`${t.bgInput} border ${t.border} rounded-xl overflow-hidden`}>
                    {/* Header día */}
                    <div className={`flex items-center gap-2 px-3 py-2 border-b ${t.border} ${t.isDark ? "bg-white/5" : "bg-slate-50"}`}>
                      <span className="text-blue-400 font-black text-xs">{labelDia}</span>
                      <span className={`${t.textSecondary} text-[10px]`}>·</span>
                      <span className={`${t.textSecondary} text-[10px]`}>{dia} de {MESES[previewIA.mes - 1]}</span>
                      <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400`}>
                        {CATEGORIAS.filter(cat => (cats[cat.id] || []).length > 0).length} cat.
                      </span>
                    </div>
                    {/* Filas de categorías — una línea cada una */}
                    <div className="divide-y divide-white/5">
                      {CATEGORIAS.map(cat => {
                        const platos = cats[cat.id] || [];
                        if (!platos.length) return null;
                        return (
                          <div key={cat.id} className="flex items-start gap-2 px-3 py-1.5">
                            <span className={`${t.textSecondary} text-[9px] font-black uppercase tracking-wide w-20 flex-shrink-0 pt-0.5`}>{cat.label}</span>
                            <span className={`${t.text} text-[10px] leading-snug flex-1 min-w-0`}>
                              {platos.join(" · ")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className={`flex gap-3 px-6 py-4 border-t ${t.border} flex-shrink-0`}>
              <button onClick={() => { setModalIAOpen(false); setPreviewIA(null); }}
                className={`flex-1 ${t.bgInput} ${t.text} font-semibold py-2.5 rounded-xl text-sm transition`}>
                Cancelar
              </button>
              <button onClick={guardarPlanogramaIA} disabled={guardandoIA}
                className="flex-[2] bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-bold py-2.5 rounded-xl text-sm transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20">
                {guardandoIA
                  ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Guardando...</>
                  : <><span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>upload</span> Guardar planograma de {MESES[previewIA.mes - 1]}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
