import { useState, useEffect } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { db } from "../firebase/config";
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, onSnapshot, setDoc, query, where } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import toast, { Toaster } from "react-hot-toast";
import TablaIngredientes from "./TablaIngredientes";
import { useCodigos, useSubcategorias } from "../hooks/useIngredientes";
// fichaExcel: exportar/importar disponible si se reactiva el botón en UI
import RichTextEditor from "./RichTextEditor";

const TABS = [
  { label: "General",      icon: "info"            },
  { label: "Ingredientes", icon: "restaurant_menu"  },
  { label: "Proceso",      icon: "skillet"          },
  { label: "Envases",      icon: "inventory_2"      },
  { label: "Fotos",        icon: "photo_camera"     },
  { label: "Revisiones",   icon: "history_edu"      },
];

const G = "bg-slate-800/60 backdrop-blur-sm border border-white/8 rounded-2xl";

const UNIDADES_META = [
  { id: "UN",    label: "UN",    desc: "Unidad simple",        icon: "deployed_code",   esEntero: true,  esFraccion: false },
  { id: "KG",    label: "KG",    desc: "Kilogramos",           icon: "weight",          esEntero: false, esFraccion: false },
  { id: "UN/KG", label: "UN/KG", desc: "Unidad por kilogramo", icon: "weight",          esEntero: false, esFraccion: true  },
  { id: "L",     label: "L",     desc: "Litro",                icon: "water_drop",      esEntero: false, esFraccion: false },
  { id: "L/KG",  label: "L/KG",  desc: "Litro por kilogramo",  icon: "water",           esEntero: false, esFraccion: true  },
];
const UNIDADES = UNIDADES_META.map(u => u.id);
const defaultCantidad = (u) => {
  const meta = UNIDADES_META.find(m => m.id === u);
  if (meta?.esEntero) return "0";
  if (meta?.esFraccion) return "0/0.000";
  return "0.000";
};

// ── Componentes sortables ──
function SortableTr({ id, children, esSeparador }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    background: isDragging ? "rgba(59,130,246,0.05)" : undefined,
  };
  return (
    <tr ref={setNodeRef} style={style} className={`group ${esSeparador ? "" : "hover:bg-white/[0.02]"} transition-colors`}>
      <td className="px-3 py-3">
        <button {...attributes} {...listeners} className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>drag_indicator</span>
        </button>
      </td>
      {children}
    </tr>
  );
}

function SortableCard({ id, children, className = "" }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className={`relative ${className}`}>
      <button
        {...attributes} {...listeners}
        className="absolute top-3 left-3 z-10 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none"
        style={{ lineHeight: 1 }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>drag_indicator</span>
      </button>
      {children}
    </div>
  );
}

export default function FichaModal({ ficha, seccionInicial, onClose, user }) {
  const { t } = useTheme();
  const [loading, setLoading] = useState(false);
  const [tabActiva, setTabActiva] = useState(0);
  const [unidadDropdownIdx, setUnidadDropdownIdx] = useState(null);
  const [seccionDropdownOpen, setSeccionDropdownOpen] = useState(false);
  const [unidadDropdownPos, setUnidadDropdownPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!unidadDropdownIdx) return;
    const handler = (e) => {
      if (!e.target.closest("[data-unidad-dropdown]")) setUnidadDropdownIdx(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [unidadDropdownIdx]);

  useEffect(() => {
    if (!seccionDropdownOpen) return;
    const handler = (e) => {
      if (!e.target.closest("[data-seccion-dropdown]")) setSeccionDropdownOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [seccionDropdownOpen]);

  // ── DnD helpers ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDndEnd = (lista) => (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const items = form[lista];
    const oldIdx = items.findIndex((_, i) => `${lista}-${i}` === active.id);
    const newIdx = items.findIndex((_, i) => `${lista}-${i}` === over.id);
    if (oldIdx !== -1 && newIdx !== -1) update(lista, arrayMove(items, oldIdx, newIdx));
  };

  // Componente selector de unidad estilo card
  const SelectorUnidad = ({ valor, lista, idx, color = "blue" }) => {
    const meta = UNIDADES_META.find(m => m.id === valor) || UNIDADES_META[0];
    const isOpen = unidadDropdownIdx?.lista === lista && unidadDropdownIdx?.idx === idx;
    const colorMap = {
      blue:  { btn: "text-blue-400 bg-blue-500/10 border-blue-500/20", item: "text-blue-400", check: "text-blue-400" },
      amber: { btn: "text-amber-400 bg-amber-500/10 border-amber-500/20", item: "text-amber-400", check: "text-amber-400" },
    };
    const c = colorMap[color];
    const handleSelect = (u) => {
      const n = [...(lista === "materiasPrimas" ? form.materiasPrimas : form.elementosDecorativos)];
      n[idx].unidad = u.id;
      if (!n[idx].cantidadBruta || n[idx].cantidadBruta === "0.000" || n[idx].cantidadBruta === "0") n[idx].cantidadBruta = defaultCantidad(u.id);
      if (!n[idx].cantidadNeta || n[idx].cantidadNeta === "0.000" || n[idx].cantidadNeta === "0") n[idx].cantidadNeta = defaultCantidad(u.id);
      update(lista, n);
      setUnidadDropdownIdx(null);
    };
    return (
      <div className="relative inline-block">
        <button type="button"
          onClick={(e) => { e.stopPropagation(); setUnidadDropdownIdx(isOpen ? null : { lista, idx }); }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-bold transition-all ${c.btn}`}>
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{meta.icon}</span>
          {meta.label}
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{isOpen ? "expand_less" : "expand_more"}</span>
        </button>
        {isOpen && (
          <div className="absolute z-[9999] top-full mt-1 left-0 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-52"
            onClick={e => e.stopPropagation()}>
            <div className="px-4 py-2 border-b border-white/5">
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Configuración de Medida</p>
            </div>
            {UNIDADES_META.map(u => (
              <button key={u.id} type="button" onClick={() => handleSelect(u)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${valor === u.id ? "bg-blue-500/10" : ""}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${valor === u.id ? "bg-blue-500/20" : "bg-white/5"}`}>
                  <span className={`material-symbols-outlined ${valor === u.id ? c.check : "text-slate-500"}`} style={{ fontSize: 18 }}>{u.icon}</span>
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-bold ${valor === u.id ? c.item : "text-white"}`}>{u.label}</p>
                  <p className="text-[10px] text-slate-500">{u.desc}</p>
                </div>
                {valor === u.id && <span className={`material-symbols-outlined text-sm ${c.check}`} style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
              </button>
            ))}
            <div className="px-4 py-2 border-t border-white/5">
              <p className="text-[9px] text-slate-600 uppercase tracking-widest text-center">Seleccione la métrica de inventario</p>
            </div>
          </div>
        )}
      </div>
    );
  };
  const [productosFaltantes, setProductosFaltantes] = useState([]);
  const [showMermaModal, setShowMermaModal] = useState(false);
  const [secciones, setSecciones] = useState([]);
  const codigos = useCodigos();
  const subcategorias = useSubcategorias();
  const [sugerenciasCodigo, setSugerenciasCodigo] = useState([]);
  const [sugerenciasSubcat, setSugerenciasSubcat] = useState([]);
  const [leyendoImagen, setLeyendoImagen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "secciones"), (snap) => {
      const data = snap.docs.map(d => d.data().nombre).sort();
      setSecciones(data);
    });
    return () => unsub();
  }, []);

  const [form, setForm] = useState({
    nombre: ficha?.nombre || "",
    codigo: ficha?.codigo || "J502-D-RJ-",
    subcategoria: ficha?.subcategoria || "",
    seccion: ficha?.seccion || seccionInicial,
    porciones: ficha?.porciones || "",
    tiempoPreparacion: ficha?.tiempoPreparacion || "",
    foto: ficha?.foto || "",
    descripcionProceso: ficha?.descripcionProceso || "",
    tempCoccion: ficha?.tempCoccion || "NA",
    tempEnfriado: ficha?.tempEnfriado || "NA",
    tempAlmacenamiento: ficha?.tempAlmacenamiento || "NA",
    vidaUtilGrado: ficha?.vidaUtilGrado || "NA",
    vidaUtilVacio: ficha?.vidaUtilVacio || "NA",
    vidaUtilAnaquel: ficha?.vidaUtilAnaquel || "NA",
    esAlergeno: ficha?.esAlergeno || false,
    descripcionAlergeno: ficha?.descripcionAlergeno || "",
    tienePropiedadesFQ: ficha?.tienePropiedadesFQ || false,
    propiedadesFQ: ficha?.propiedadesFQ || "",
    materiasPrimas: ficha?.materiasPrimas || [{ nombre: "", unidad: "UN", cantidadBruta: "0", cantidadNeta: "0", codSap: "" }],
    elementosDecorativos: ficha?.elementosDecorativos || [{ nombre: "", cantidadBruta: "0", cantidadNeta: "0", unidad: "UN", codSap: "" }],
    envases: ficha?.envases || [{ descripcion: "", codigoSap: "", cantidad: "", pesoEnvase: "" }],
    formatosVenta: ficha?.formatosVenta || [{ codSap: "", descripcion: "", numEnvase: "", pesoProducto: "", codBarra: "" }],
    fotosExtra: ficha?.fotosExtra || [""],
    revisiones: ficha?.revisiones || [{ numero: "000", fecha: "", descripcion: "Versión inicial" }],
    estado: ficha?.estado || "activa",
    precio: ficha?.precio ?? "",
  });

  // ── IA ──
  const leerImagenConIA = async (file) => {
    if (!file) return;
    setLeyendoImagen(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/analizar-ficha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: file.type || "image/jpeg" }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || "Error al procesar la imagen", { duration: 6000 }); return; }
      if (data.descripcionProceso) { update("descripcionProceso", data.descripcionProceso); toast.success("✅ Proceso extraído"); }
    } catch (err) { toast.error(`Error: ${err.message}`, { duration: 6000 }); }
    setLeyendoImagen(false);
  };

  const leerFichaCompleta = async (file) => {
    if (!file) return;
    setLeyendoImagen(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/analizar-ficha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: file.type || "image/jpeg", tipo: "completa" }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || "Error al procesar", { duration: 6000 }); return; }
      setForm(prev => ({
        ...prev,
        ...(data.nombre             && { nombre:             data.nombre             }),
        ...(data.codigo             && { codigo:             data.codigo             }),
        ...(data.seccion            && { seccion:            data.seccion            }),
        ...(data.porciones          && { porciones:          data.porciones          }),
        ...(data.tiempoPreparacion  && { tiempoPreparacion:  data.tiempoPreparacion  }),
        ...(data.descripcionProceso && { descripcionProceso: data.descripcionProceso }),
        ...(data.tempCoccion        && { tempCoccion:        data.tempCoccion        }),
        ...(data.tempEnfriado       && { tempEnfriado:       data.tempEnfriado       }),
        ...(data.tempAlmacenamiento && { tempAlmacenamiento: data.tempAlmacenamiento }),
        ...(data.vidaUtilGrado      && { vidaUtilGrado:      data.vidaUtilGrado      }),
        ...(data.vidaUtilVacio      && { vidaUtilVacio:      data.vidaUtilVacio      }),
        ...(data.vidaUtilAnaquel    && { vidaUtilAnaquel:    data.vidaUtilAnaquel    }),
        ...(data.materiasPrimas?.length     && { materiasPrimas:       data.materiasPrimas.map(i => ({ ...i, nombre: i.nombre?.toUpperCase() || "", codSap: i.codSap || "" })) }),
        ...(data.elementosDecorativos?.length && { elementosDecorativos: data.elementosDecorativos.map(i => ({ ...i, nombre: i.nombre?.toUpperCase() || "" })) }),
        ...(data.envases?.length    && { envases:      data.envases     }),
        ...(data.formatosVenta?.length && { formatosVenta: data.formatosVenta }),
        ...(data.revisiones?.length && { revisiones:   data.revisiones  }),
      }));
      toast.success("✅ Ficha rellenada — revisa y ajusta los datos", { duration: 5000 });
    } catch (err) { toast.error(`Error: ${err.message}`, { duration: 6000 }); }
    setLeyendoImagen(false);
  };

  const leerIngredientesIA = async (file) => {
    if (!file) return;
    setLeyendoImagen(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/analizar-ficha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: file.type || "image/jpeg", tipo: "ingredientes" }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || "Error al procesar"); return; }
      if (data.ingredientes?.length) {
        update("materiasPrimas", data.ingredientes.map(i => ({
          nombre: i.nombre?.toUpperCase() || "", cantidadBruta: i.cantidadBruta || "0.000",
          cantidadNeta: i.cantidadNeta || "0.000", unidad: i.unidad || "UN", codSap: i.codSap || "",
        })));
        toast.success(`✅ ${data.ingredientes.length} ingredientes extraídos`);
      } else { toast.error("No se encontraron ingredientes"); }
    } catch (err) { toast.error(`Error: ${err.message}`); }
    setLeyendoImagen(false);
  };

  // ── Helpers ──
  const update = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const updateLista = (lista, idx, campo, valor) => { const n = [...form[lista]]; n[idx][campo] = valor; update(lista, n); };
  const agregarFila = (lista, modelo) => update(lista, [...form[lista], { ...modelo }]);
  const eliminarFila = (lista, idx) => update(lista, form[lista].filter((_, i) => i !== idx));
  const agregarVariasFila = (lista, cantidad, modelo) => update(lista, [...form[lista], ...Array.from({ length: cantidad }, () => ({ ...modelo }))]);
  const formatearCantidad = (valor, unidad = "KG") => {
    const meta = UNIDADES_META.find(m => m.id === unidad);
    if (meta?.esFraccion) {
      // formato UN/KG o L/KG → "entero/0.000"
      const partes = valor.split("/");
      const p1 = partes[0]?.replace(/\D/g, "") || "0";
      const raw2 = (partes[1] ?? "").replace(/\D/g, "").slice(0, 6);
      if (!raw2) return (parseInt(p1) || 0) + "/0.000";
      const pad = raw2.padStart(4, "0");
      const dec = parseFloat(pad.slice(0, -3) + "." + pad.slice(-3)).toFixed(3);
      return (parseInt(p1) || 0) + "/" + dec;
    }
    const esEntero = meta?.esEntero;
    const soloNumeros = valor.replace(/\D/g, "").slice(0, 6);
    if (!soloNumeros) return esEntero ? "0" : "0.000";
    if (esEntero) return String(parseInt(soloNumeros, 10));
    const p = soloNumeros.padStart(4, "0");
    return parseFloat(p.slice(0, -3) + "." + p.slice(-3)).toFixed(3).toString();
  };

  const handleAgregarAMerma = async (producto) => {
    try {
      await addDoc(collection(db, "merma"), { codigo: producto.codSap, nombre: producto.descripcion, categoria: form.seccion, unidadMedida: "", creadoPor: user?.email || "", fechaCreacion: serverTimestamp() });
      toast.success(`${producto.descripcion} agregado a Merma ✅`);
      const restantes = productosFaltantes.filter(p => p.codSap !== producto.codSap);
      setProductosFaltantes(restantes);
      if (restantes.length === 0) { setShowMermaModal(false); setTimeout(() => onClose(), 500); }
    } catch { toast.error("Error al agregar a Merma"); }
  };

  const handleGuardar = async () => {
    if (!form.nombre) { toast.error("El nombre es obligatorio"); return; }
    setLoading(true);
    try {
      if (ficha) { await updateDoc(doc(db, "fichas", ficha.id), { ...form }); toast.success("Ficha actualizada ✅"); }
      else { await addDoc(collection(db, "fichas"), { ...form, fechaCreacion: serverTimestamp() }); toast.success("Ficha creada ✅"); }
      // ── Sync precio en lista_precios ──
      const precioNum = form.precio !== "" ? parseFloat(form.precio) : null;
      const fichaId = ficha?.id || null;
      // Buscar si ya existe un producto en lista_precios vinculado a esta ficha
      if (fichaId) {
        const snapLP = await getDocs(query(collection(db, "lista_precios"), where("fichaId", "==", fichaId)));
        if (!snapLP.empty) {
          // Actualizar el precio en el documento existente
          for (const docLP of snapLP.docs) {
            await setDoc(doc(db, "lista_precios", docLP.id), {
              precio: precioNum,
              nombre: form.nombre,
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }
        } else if (precioNum !== null) {
          // Crear nuevo registro en lista_precios vinculado a la ficha
          const sap = form.formatosVenta?.find(fv => fv.codSap?.trim())?.codSap || null;
          await addDoc(collection(db, "lista_precios"), {
            nombre: form.nombre,
            precio: precioNum,
            fichaId,
            codSap: sap,
            tipo: "ficha",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      const formatosConSap = [
        ...(form.formatosVenta || []).filter(f => f.codSap?.trim()),
        ...(form.materiasPrimas || []).filter(f => f.codSap?.trim()).map(f => ({ codSap: f.codSap, descripcion: f.nombre })),
        ...(form.elementosDecorativos || []).filter(f => f.codSap?.trim()).map(f => ({ codSap: f.codSap, descripcion: f.nombre })),
        ...(form.envases || []).filter(e => e.codigoSap?.trim()).map(e => ({ codSap: e.codigoSap, descripcion: e.descripcion })),
      ];
      if (formatosConSap.length > 0) {
        const mermaSnap = await getDocs(collection(db, "merma"));
        const codigosEnMerma = new Set(mermaSnap.docs.map(d => d.data().codigo?.trim()));
        const faltantes = formatosConSap.filter(f => !codigosEnMerma.has(f.codSap.trim()));
        if (faltantes.length > 0) { setProductosFaltantes(faltantes); setShowMermaModal(true); setLoading(false); return; }
      }
      setTimeout(() => onClose(), 1000);
    } catch { toast.error("Error al guardar"); }
    setLoading(false);
  };

  // ── Clases ──
  const inp = "w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all";
  const inpSm = "w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all";
  const lbl = "text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2";

  // ── Spinner ──
  const Spin = () => (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 overflow-hidden">
      <Toaster />

      {/* ══ TOP HEADER ══ */}
      <header className="bg-slate-950/90 backdrop-blur-xl border-b border-white/10 shadow-xl flex-shrink-0 flex items-center justify-between px-4 md:px-6 h-16 z-50">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors active:scale-95">
            <span className="material-symbols-outlined text-blue-400">arrow_back</span>
          </button>
          <h1 className="text-base md:text-lg font-bold text-white tracking-tight">
            {ficha ? "Editar Ficha Técnica" : "Nueva Ficha Técnica"}
          </h1>
        </div>

        {/* Tabs en header — solo desktop */}
        <nav className="hidden md:flex items-center gap-1 h-full">
          {TABS.map((tab, i) => (
            <button key={i} onClick={() => setTabActiva(i)}
              className={`px-4 h-full text-sm font-semibold tracking-wide transition-all border-b-2 ${
                tabActiva === i
                  ? "text-blue-400 border-blue-500 bg-gradient-to-b from-blue-600/10 to-transparent"
                  : "text-slate-400 border-transparent hover:text-white hover:bg-white/5"
              }`}>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Botón IA + more — desktop */}
        <div className="flex items-center gap-2">
          <label className={`hidden md:flex items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-full transition-all shadow-lg shadow-blue-500/20 active:scale-95 ${leyendoImagen ? "opacity-60 pointer-events-none" : ""}`}>
            {leyendoImagen ? <Spin /> : <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>}
            {leyendoImagen ? "Analizando..." : "Rellenar con IA"}
            <input type="file" accept="image/*" className="hidden" disabled={leyendoImagen}
              onChange={e => { const f = e.target.files?.[0]; if (f) leerFichaCompleta(f); e.target.value = ""; }} />
          </label>
          <button className="p-2 rounded-full hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-slate-400">more_vert</span>
          </button>
        </div>
      </header>

      {/* ══ TABS MÓVIL (solo mobile) ══ */}
      <nav className="md:hidden bg-slate-900/90 backdrop-blur-2xl border-b border-white/5 flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <div className="flex whitespace-nowrap px-2">
          {TABS.map((tab, i) => (
            <button key={i} onClick={() => setTabActiva(i)}
              className={`px-4 py-3.5 text-sm font-semibold tracking-wide transition-all flex items-center gap-1.5 border-b-2 ${
                tabActiva === i ? "text-blue-400 border-blue-500 bg-gradient-to-b from-blue-600/10 to-transparent"
                  : "text-slate-500 border-transparent"
              }`}>
              <span className="material-symbols-outlined" style={{ fontSize: 15, fontVariationSettings: tabActiva === i ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ══ BODY ══ */}
      <div className="flex flex-1 min-h-0">

        {/* ── Sidebar desktop ── */}
        <aside className="hidden md:flex h-full w-64 flex-col bg-slate-900/90 backdrop-blur-2xl border-r border-white/5 flex-shrink-0">
          <div className="px-6 py-5 border-b border-white/5">
            <span className="text-amber-500 font-black text-xs uppercase tracking-widest">R.info Management</span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {TABS.map((tab, i) => (
              <button key={i} onClick={() => setTabActiva(i)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold tracking-wide transition-all rounded-xl text-left ${
                  tabActiva === i
                    ? "bg-gradient-to-r from-blue-600/20 to-transparent text-blue-400 border-l-4 border-blue-500 rounded-l-none"
                    : "text-slate-500 hover:text-white hover:bg-white/5"
                }`}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: tabActiva === i ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Contenido principal ── */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 pb-32 md:pb-24">

            {/* ════ TAB 0 — GENERAL ════ */}
            {tabActiva === 0 && (
              <>
                {/* Banner IA — solo móvil */}
                <label className={`md:hidden flex items-center justify-center gap-3 w-full py-4 rounded-2xl mb-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 cursor-pointer shadow-lg active:scale-[0.98] transition-transform ${leyendoImagen ? "opacity-60 pointer-events-none" : ""}`}>
                  {leyendoImagen ? <Spin /> : <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>}
                  <span className="text-white font-bold">{leyendoImagen ? "Analizando..." : "Rellenar ficha completa con IA"}</span>
                  <input type="file" accept="image/*" className="hidden" disabled={leyendoImagen}
                    onChange={e => { const f = e.target.files?.[0]; if (f) leerFichaCompleta(f); e.target.value = ""; }} />
                </label>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Columna principal */}
                  <section className="lg:col-span-2 space-y-5">
                    {/* Datos generales */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-visible">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-r-full" />
                      <h2 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 20 }}>description</span>
                        Datos Generales del Plato
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                          <label className={lbl}>Nombre del plato *</label>
                          <input value={form.nombre}
                            onChange={(e) => {
                              update("nombre", e.target.value);
                              const nf = [...form.formatosVenta];
                              if (!nf[0]?.descripcion || nf[0]?.descripcion === form.nombre) { nf[0] = { ...nf[0], descripcion: e.target.value }; update("formatosVenta", nf); }
                            }}
                            className={inp} placeholder="Ej: QUICHE MINI VARIEDAD" />
                        </div>
                        <div className="relative">
                          <label className={lbl}>Código</label>
                          <input value={form.codigo}
                            onChange={(e) => { update("codigo", e.target.value); if (e.target.value.length >= 1) { setSugerenciasCodigo(codigos.filter(c => c.toLowerCase().includes(e.target.value.toLowerCase()) && c !== e.target.value).slice(0, 5)); } else setSugerenciasCodigo([]); }}
                            onBlur={() => setTimeout(() => setSugerenciasCodigo([]), 150)}
                            className={inp} placeholder="J502-D-RJ-" />
                          {sugerenciasCodigo.length > 0 && (
                            <div className="absolute z-10 w-full top-full mt-1 bg-slate-800 border border-white/10 rounded-xl shadow-xl overflow-hidden">
                              {sugerenciasCodigo.map((c, i) => <button key={i} onMouseDown={() => { update("codigo", c); setSugerenciasCodigo([]); }} className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/5">{c}</button>)}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className={lbl}>Sección</label>
                          <div data-seccion-dropdown className="relative">
                            <button type="button" data-seccion-dropdown
                              onClick={(e) => { e.stopPropagation(); setSeccionDropdownOpen(o => !o); }}
                              className={`${inp} flex items-center justify-between text-left`}>
                              <span className={form.seccion ? "text-cyan-400 font-semibold" : "text-slate-500"}>
                                {form.seccion || "Seleccionar sección..."}
                              </span>
                              <span className="material-symbols-outlined text-cyan-400 flex-shrink-0" style={{ fontSize: 18 }}>
                                {seccionDropdownOpen ? "expand_less" : "expand_more"}
                              </span>
                            </button>
                            {seccionDropdownOpen && (
                              <div data-seccion-dropdown
                                className="absolute z-[9999] top-full mt-1 left-0 right-0 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-y-auto"
                                style={{ maxHeight: "220px" }}
                                onClick={e => e.stopPropagation()}>
                                {secciones.map(s => (
                                  <button key={s} type="button" data-seccion-dropdown
                                    onClick={() => { update("seccion", s); setSeccionDropdownOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left ${form.seccion === s ? "bg-cyan-500/10" : ""}`}>
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${form.seccion === s ? "bg-cyan-500/20" : "bg-white/5"}`}>
                                      <span className={`material-symbols-outlined ${form.seccion === s ? "text-cyan-400" : "text-slate-500"}`} style={{ fontSize: 16 }}>domain</span>
                                    </div>
                                    <span className={`text-sm font-semibold ${form.seccion === s ? "text-cyan-400" : "text-white"}`}>{s}</span>
                                    {form.seccion === s && <span className="material-symbols-outlined text-cyan-400 text-sm ml-auto" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="relative">
                          <label className={lbl}>Subcategoría</label>
                          <input value={form.subcategoria}
                            onChange={(e) => { update("subcategoria", e.target.value); if (e.target.value.length >= 1) { setSugerenciasSubcat(subcategorias.filter(s => s.toLowerCase().includes(e.target.value.toLowerCase()) && s !== e.target.value).slice(0, 5)); } else setSugerenciasSubcat([]); }}
                            onBlur={() => setTimeout(() => setSugerenciasSubcat([]), 150)}
                            className={inp} placeholder="Ej: Fríos..." />
                          {sugerenciasSubcat.length > 0 && (
                            <div className="absolute z-10 w-full top-full mt-1 bg-slate-800 border border-white/10 rounded-xl shadow-xl overflow-hidden">
                              {sugerenciasSubcat.map((s, i) => <button key={i} onMouseDown={() => { update("subcategoria", s); setSugerenciasSubcat([]); }} className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/5">{s}</button>)}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className={lbl}>Porciones</label>
                          <input value={form.porciones} onChange={e => update("porciones", e.target.value)} className={inp} placeholder="Ej: 12 porciones" />
                        </div>
                        <div>
                          <label className={lbl}>Tiempo de preparación</label>
                          <div className="relative">
                            <input value={form.tiempoPreparacion} onChange={e => update("tiempoPreparacion", e.target.value)} className={inp} placeholder="Ej: 45 min" />
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" style={{ fontSize: 18 }}>schedule</span>
                          </div>
                        </div>
                        <div>
                          <label className={lbl}>Precio de venta ($)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                            <input
                              type="number" min="0"
                              value={form.precio}
                              onChange={e => update("precio", e.target.value)}
                              className={inp + " pl-8"}
                              placeholder="0"
                            />
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-amber-400" style={{ fontSize: 18 }}>sell</span>
                          </div>
                          {form.precio !== "" && (
                            <p className="text-[10px] text-amber-400/70 mt-1 font-medium">
                              Se sincronizará con Lista de Precios al guardar
                            </p>
                          )}
                        </div>
                        <div className="md:col-span-2">
                          <label className={lbl}>URL Foto Principal</label>
                          <input value={form.foto} onChange={e => update("foto", e.target.value)} className={inp} placeholder="https://..." />
                        </div>
                      </div>
                    </div>

                    {/* Formatos de Venta */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 md:p-8">
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                          <span className="material-symbols-outlined text-amber-400" style={{ fontSize: 20 }}>shopping_cart</span>
                          Formatos de Venta
                        </h2>
                        <button onClick={() => agregarFila("formatosVenta", { codSap: "", descripcion: "", numEnvase: "", pesoProducto: "", codBarra: "" })}
                          className="text-blue-400 hover:text-blue-300 text-sm font-bold flex items-center gap-1 transition-colors">
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span> Añadir
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="border-b border-white/5">
                            <tr>
                              {["SAP", "Descripción", "N° Envase", "Peso (kg)", "Cod. Barra", ""].map((h, i) => (
                                <th key={i} className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest pr-3">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {form.formatosVenta.map((fv, i) => (
                              <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                                <td className="py-3 pr-3"><input value={fv.codSap} onChange={ev => updateLista("formatosVenta", i, "codSap", ev.target.value)} className={inpSm} placeholder="SAP" /></td>
                                <td className="py-3 pr-3"><input value={fv.descripcion} onChange={ev => updateLista("formatosVenta", i, "descripcion", ev.target.value)} className={inpSm} placeholder="Descripción" /></td>
                                <td className="py-3 pr-3"><input value={fv.numEnvase} onChange={ev => updateLista("formatosVenta", i, "numEnvase", ev.target.value)} className={`${inpSm} w-20`} placeholder="1" /></td>
                                <td className="py-3 pr-3"><input value={fv.pesoProducto} onChange={ev => updateLista("formatosVenta", i, "pesoProducto", formatearCantidad(ev.target.value))} onFocus={e => setTimeout(() => e.target.select(), 0)} className={`${inpSm} w-24`} placeholder="0.000" /></td>
                                <td className="py-3 pr-3"><input value={fv.codBarra} onChange={ev => updateLista("formatosVenta", i, "codBarra", ev.target.value)} className={inpSm} placeholder="Barra/Marcación" /></td>
                                <td className="py-3"><button onClick={() => eliminarFila("formatosVenta", i)} className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>

                  {/* Sidebar derecha */}
                  <aside className="space-y-5">
                    {/* Estado */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 border-l-4 border-amber-500">
                      <label className={lbl}>Estado de la Ficha</label>
                      <div className="space-y-3 mt-2">
                        {[
                          { valor: "activa",    label: "Activa",    color: "text-emerald-400", dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" },
                          { valor: "pendiente", label: "Pendiente", color: "text-amber-400",   dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" },
                          { valor: "inactiva",  label: "Inactiva",  color: "text-red-400",     dot: "bg-red-500", activeCls: "bg-red-500/20 border-red-500/50 text-red-400", inactiveCls: "bg-white/5 border-white/5 text-red-400/50" },
                        ].map(({ valor, label, color, dot }) => (
                          <label key={valor} className={`flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border cursor-pointer transition-all ${form.estado === valor ? "border-blue-500/40 bg-blue-500/5" : "border-white/5 hover:border-white/10"}`}>
                            <input type="radio" name="estado" checked={form.estado === valor} onChange={() => update("estado", valor)} className="w-4 h-4 text-blue-600 bg-slate-800 border-white/20 focus:ring-blue-500" />
                            <span className={`text-sm font-semibold flex items-center gap-2 ${color}`}>
                              <span className={`w-2 h-2 rounded-full ${dot}`} />{label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Config especial */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 space-y-5">
                      <h3 className={lbl}>Configuraciones Especiales</h3>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <input type="checkbox" id="alergeno" checked={form.esAlergeno} onChange={e => update("esAlergeno", e.target.checked)}
                            className="h-5 w-5 mt-0.5 rounded bg-slate-900 border-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-950" />
                          <label htmlFor="alergeno" className="cursor-pointer flex flex-col">
                            <span className="text-sm font-bold text-white">Insumo Alergeno</span>
                            <span className="text-[10px] text-slate-500">Contiene gluten, lácteos o frutos secos</span>
                          </label>
                        </div>
                        {form.esAlergeno && <input value={form.descripcionAlergeno} onChange={e => update("descripcionAlergeno", e.target.value)} className={inpSm} placeholder="Ej: Contiene gluten, lácteos..." />}
                        <div className="flex items-start gap-3">
                          <input type="checkbox" id="fisicoquim" checked={form.tienePropiedadesFQ} onChange={e => update("tienePropiedadesFQ", e.target.checked)}
                            className="h-5 w-5 mt-0.5 rounded bg-slate-900 border-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-950" />
                          <label htmlFor="fisicoquim" className="cursor-pointer flex flex-col">
                            <span className="text-sm font-bold text-white">Propiedades Fisicoquímicas</span>
                            <span className="text-[10px] text-slate-500">Requiere control de pH, humedad o brix</span>
                          </label>
                        </div>
                        {form.tienePropiedadesFQ && <textarea value={form.propiedadesFQ} onChange={e => update("propiedadesFQ", e.target.value)} className={`${inpSm} resize-none h-20`} placeholder="pH: 6.5, Humedad: 12%..." />}
                      </div>
                      <div className="pt-4 border-t border-white/5">
                        <div className="rounded-2xl bg-blue-500/10 p-4">
                          <div className="flex items-center gap-2 text-blue-400 mb-1">
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Ayuda</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">Complete todos los campos obligatorios para habilitar el proceso de costeo dinámico.</p>
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              </>
            )}

            {/* ════ TAB 1 — INGREDIENTES ════ */}
            {tabActiva === 1 && (
              <>
                {/* Stats desktop */}
                <div className="hidden md:grid grid-cols-3 gap-5 mb-8">
                  {[
                    { icon: "inventory_2", color: "text-blue-400 bg-blue-500/10", label: "Total Ingredientes", val: `${form.materiasPrimas.filter(m => m.nombre).length + form.elementosDecorativos.filter(e => e.nombre).length} Elementos` },
                    { icon: "payments", color: "text-amber-400 bg-amber-500/10", label: "Costo Estimado", val: "—" },
                    { icon: "check_circle", color: "text-emerald-400 bg-emerald-500/10", label: "Estado Ficha", val: form.estado.charAt(0).toUpperCase() + form.estado.slice(1) },
                  ].map((s, i) => (
                    <div key={i} className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{s.icon}</span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">{s.label}</p>
                        <p className="text-xl font-black text-white">{s.val}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Banner IA */}
                <label className={`flex items-center justify-center gap-3 w-full py-4 rounded-2xl mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 cursor-pointer shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform ${leyendoImagen ? "opacity-60 pointer-events-none" : ""}`}>
                  {leyendoImagen ? <Spin /> : <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>}
                  <span className="text-white font-bold">{leyendoImagen ? "Analizando..." : "Leer ingredientes con IA"}</span>
                  <input type="file" accept="image/*" className="hidden" disabled={leyendoImagen}
                    onChange={async e => { const f = e.target.files?.[0]; if (f) await leerIngredientesIA(f); e.target.value = ""; }} />
                </label>

                {/* MATERIA PRIMA — tabla desktop, cards móvil */}
                <section className="mb-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-8 w-1.5 bg-blue-500 rounded-full" />
                    <h2 className="text-lg font-bold tracking-tight text-white uppercase">Materia Prima</h2>
                  </div>
                  {/* Tabla desktop */}
                  <div className="hidden md:block bg-slate-900/40 border border-white/5 rounded-2xl shadow-xl overflow-visible">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-white/10">
                          <th className="px-3 py-4 w-6"></th>
                          <th className="px-4 py-4">Nombre del Ingrediente</th>
                          <th className="px-4 py-4 text-center">Cant. Bruta</th>
                          <th className="px-4 py-4 text-center">Cant. Neta</th>
                          <th className="px-4 py-4 text-center">Unidad</th>
                          <th className="px-4 py-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDndEnd("materiasPrimas")}>
                        <SortableContext items={form.materiasPrimas.map((_, i) => `materiasPrimas-${i}`)} strategy={verticalListSortingStrategy}>
                          <tbody className="divide-y divide-white/5">
                            {form.materiasPrimas.map((mp, i) => {
                              const id = `materiasPrimas-${i}`;
                              const esSeparador = mp._tipo === "separador";
                              const meta = UNIDADES_META.find(m => m.id === mp.unidad);
                              const esFraccion = meta?.esFraccion;
                              const esEntero = meta?.esEntero;
                              return (
                                <SortableTr key={id} id={id} esSeparador={esSeparador}>
                                  {esSeparador ? (
                                    <>
                                      <td colSpan={4} className="px-4 py-2">
                                        <div className="flex items-center gap-3 bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2">
                                          <span className="material-symbols-outlined text-teal-400" style={{ fontSize: 16 }}>format_list_bulleted</span>
                                          <input value={mp.nombre} onChange={e => updateLista("materiasPrimas", i, "nombre", e.target.value.toUpperCase())} className="bg-transparent border-none p-0 text-teal-300 font-bold text-sm focus:ring-0 outline-none flex-1" placeholder="NOMBRE DE SECCIÓN / PASO..." />
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        <button onClick={() => eliminarFila("materiasPrimas", i)} className="text-slate-500 hover:text-red-400 transition-colors p-1">
                                          <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-4 py-3"><input value={mp.nombre} onChange={e => updateLista("materiasPrimas", i, "nombre", e.target.value.toUpperCase())} className="bg-transparent border-none p-0 text-white font-medium text-sm focus:ring-0 outline-none w-full" placeholder="NOMBRE INGREDIENTE" /></td>
                                      <td className="px-4 py-3"><input value={mp.cantidadBruta} onChange={e => updateLista("materiasPrimas", i, "cantidadBruta", formatearCantidad(e.target.value, mp.unidad))} onFocus={e => setTimeout(() => e.target.select(), 0)} className="bg-transparent border-none p-0 text-center text-white text-sm focus:ring-0 outline-none w-full" placeholder={esFraccion ? "0/0.000" : esEntero ? "0" : "0.000"} /></td>
                                      <td className="px-4 py-3"><input value={mp.cantidadNeta} onChange={e => updateLista("materiasPrimas", i, "cantidadNeta", formatearCantidad(e.target.value, mp.unidad))} onFocus={e => setTimeout(() => e.target.select(), 0)} className="bg-transparent border-none p-0 text-center text-white text-sm focus:ring-0 outline-none w-full" placeholder={esFraccion ? "0/0.000" : esEntero ? "0" : "0.000"} /></td>
                                      <td className="px-4 py-3 text-center"><SelectorUnidad valor={mp.unidad} lista="materiasPrimas" idx={i} color="blue" /></td>
                                      <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <input value={mp.codSap || ""} onChange={e => updateLista("materiasPrimas", i, "codSap", e.target.value)} className="bg-slate-800/80 border border-white/10 rounded-lg px-2 py-1.5 text-slate-400 font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none w-24 opacity-0 group-hover:opacity-100 transition-opacity" placeholder="SAP (opc.)" />
                                          <button onClick={() => eliminarFila("materiasPrimas", i)} className="text-slate-500 hover:text-red-400 transition-colors p-1">
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                          </button>
                                        </div>
                                      </td>
                                    </>
                                  )}
                                </SortableTr>
                              );
                            })}
                          </tbody>
                        </SortableContext>
                      </DndContext>
                    </table>
                    <div className="p-4 flex gap-3">
                      <button onClick={() => agregarFila("materiasPrimas", { nombre: "", unidad: "UN", cantidadBruta: "0", cantidadNeta: "0", codSap: "" })}
                        className="flex-1 py-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 hover:border-blue-500 hover:text-blue-400 transition-all flex items-center justify-center gap-2 font-bold group">
                        <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_circle</span>+ Agregar ingrediente
                      </button>
                      <button onClick={() => agregarFila("materiasPrimas", { nombre: "", _tipo: "separador" })}
                        className="px-5 py-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 hover:border-teal-500 hover:text-teal-400 transition-all flex items-center justify-center gap-2 font-bold group"
                        title="Agregar separador de sección">
                        <span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontSize: 18 }}>format_list_bulleted</span>— Sección
                      </button>
                    </div>
                  </div>
                  {/* Cards móvil */}
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDndEnd("materiasPrimas")}>
                    <SortableContext items={form.materiasPrimas.map((_, i) => `mp-mob-${i}`)} strategy={verticalListSortingStrategy}>
                      <div className="md:hidden space-y-3">
                        {form.materiasPrimas.map((mp, i) => {
                          const id = `mp-mob-${i}`;
                          const esSeparador = mp._tipo === "separador";
                          const meta = UNIDADES_META.find(m => m.id === mp.unidad);
                          const esFraccion = meta?.esFraccion;
                          const esEntero = meta?.esEntero;
                          return (
                            <SortableCard key={id} id={id}>
                              {esSeparador ? (
                                <div className="flex items-center gap-3 bg-slate-800/60 border border-teal-500/30 rounded-xl px-4 py-3">
                                  <span className="material-symbols-outlined text-slate-500 cursor-grab active:cursor-grabbing" style={{ fontSize: 18 }}>drag_indicator</span>
                                  <span className="material-symbols-outlined text-teal-400" style={{ fontSize: 16 }}>format_list_bulleted</span>
                                  <input value={mp.nombre} onChange={e => updateLista("materiasPrimas", i, "nombre", e.target.value.toUpperCase())} className="bg-transparent border-none p-0 text-teal-300 font-bold text-sm focus:ring-0 outline-none flex-1" placeholder="NOMBRE DE SECCIÓN / PASO..." />
                                  <button onClick={() => eliminarFila("materiasPrimas", i)} className="text-slate-500 hover:text-red-400 transition-colors"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span></button>
                                </div>
                              ) : (
                                <div className={`${G} p-4 relative`}>
                                  <div className="absolute top-3 right-3 flex items-center gap-1">
                                    <button onClick={() => eliminarFila("materiasPrimas", i)} className="text-slate-500 hover:text-red-400 transition-colors"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span></button>
                                  </div>
                                  <div className="mb-3">
                                    {mp.codSap && <span className="text-[10px] text-blue-400 font-bold tracking-widest uppercase block mb-1">SAP: {mp.codSap}</span>}
                                    <input value={mp.nombre} onChange={e => updateLista("materiasPrimas", i, "nombre", e.target.value.toUpperCase())} className="bg-transparent border-none p-0 text-white font-bold text-base focus:ring-0 outline-none w-full pr-8" placeholder="NOMBRE INGREDIENTE" />
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    {[["cantidadBruta","Bruta"],["cantidadNeta","Neta"]].map(([c, l]) => (
                                      <div key={c} className="bg-white/5 p-2 rounded-lg">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">{l}</p>
                                        <input value={mp[c] || ""} onChange={e => updateLista("materiasPrimas", i, c, formatearCantidad(e.target.value, mp.unidad))} onFocus={e => setTimeout(() => e.target.select(), 0)} className="bg-transparent border-none p-0 text-blue-300 font-mono text-xs focus:ring-0 outline-none w-full" placeholder={esFraccion ? "0/0.000" : esEntero ? "0" : "0.000"} />
                                      </div>
                                    ))}
                                    <div className="bg-white/5 p-2 rounded-lg">
                                      <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Unidad</p>
                                      <SelectorUnidad valor={mp.unidad} lista="materiasPrimas" idx={i} color="blue" />
                                    </div>
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-white/5">
                                    <p className="text-[9px] text-slate-600 uppercase font-bold mb-1">Código SAP (opcional)</p>
                                    <input value={mp.codSap || ""} onChange={e => updateLista("materiasPrimas", i, "codSap", e.target.value)} className="bg-transparent border-none p-0 text-slate-500 font-mono text-xs focus:ring-0 outline-none w-full" placeholder="Sin código SAP" />
                                  </div>
                                </div>
                              )}
                            </SortableCard>
                          );
                        })}
                        <div className="flex gap-2">
                          <button onClick={() => agregarFila("materiasPrimas", { nombre: "", unidad: "UN", cantidadBruta: "0", cantidadNeta: "0", codSap: "" })}
                            className="flex-1 py-3 rounded-xl border-2 border-dashed border-slate-700 hover:border-blue-500 text-slate-500 hover:text-blue-400 transition-all flex items-center justify-center gap-2 text-sm font-bold">
                            <span className="material-symbols-outlined text-sm">add</span>+ Agregar ingrediente
                          </button>
                          <button onClick={() => agregarFila("materiasPrimas", { nombre: "", _tipo: "separador" })}
                            className="px-4 py-3 rounded-xl border-2 border-dashed border-slate-700 hover:border-teal-500 text-slate-500 hover:text-teal-400 transition-all flex items-center justify-center gap-2 text-sm font-bold"
                            title="Agregar separador">
                            <span className="material-symbols-outlined text-sm">format_list_bulleted</span>—
                          </button>
                        </div>
                      </div>
                    </SortableContext>
                  </DndContext>
                </section>

                {/* ELEMENTOS DECORATIVOS */}
                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-8 w-1.5 bg-amber-500 rounded-full" />
                    <h2 className="text-lg font-bold tracking-tight text-white uppercase">Elementos Decorativos / Montaje</h2>
                  </div>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDndEnd("elementosDecorativos")}>
                    <SortableContext items={form.elementosDecorativos.map((_, i) => `el-${i}`)} strategy={verticalListSortingStrategy}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {form.elementosDecorativos.map((el, i) => {
                          const id = `el-${i}`;
                          const esSeparador = el._tipo === "separador";
                          const meta = UNIDADES_META.find(m => m.id === el.unidad);
                          const esFraccion = meta?.esFraccion;
                          const esEntero = meta?.esEntero;
                          return (
                            <SortableCard key={id} id={id} className={esSeparador ? "md:col-span-2" : ""}>
                              {esSeparador ? (
                                <div className="flex items-center gap-3 bg-slate-800/60 border border-teal-500/30 rounded-xl px-4 py-3">
                                  <span className="material-symbols-outlined text-slate-500 cursor-grab active:cursor-grabbing" style={{ fontSize: 18 }}>drag_indicator</span>
                                  <span className="material-symbols-outlined text-teal-400" style={{ fontSize: 16 }}>format_list_bulleted</span>
                                  <input value={el.nombre} onChange={e => updateLista("elementosDecorativos", i, "nombre", e.target.value.toUpperCase())} className="bg-transparent border-none p-0 text-teal-300 font-bold text-sm focus:ring-0 outline-none flex-1" placeholder="NOMBRE DE SECCIÓN / PASO..." />
                                  <button onClick={() => eliminarFila("elementosDecorativos", i)} className="text-slate-500 hover:text-red-400 transition-colors"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span></button>
                                </div>
                              ) : (
                                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 border-l-4 border-amber-500 relative">
                                  <div className="flex justify-between items-start mb-4">
                                    <div>
                                      {el.codSap && <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded block mb-1">SAP: {el.codSap}</span>}
                                      <input value={el.nombre} onChange={e => updateLista("elementosDecorativos", i, "nombre", e.target.value.toUpperCase())} className="bg-transparent border-none p-0 text-white font-bold text-base focus:ring-0 outline-none" placeholder="NOMBRE ELEMENTO" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => eliminarFila("elementosDecorativos", i)} className="text-slate-500 hover:text-red-400 transition-colors"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span></button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-4">
                                    {[["cantidadBruta","C. Bruta"],["cantidadNeta","Neta"]].map(([c, l]) => (
                                      <div key={c}>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">{l}</p>
                                        <input value={el[c] || ""} onChange={e => updateLista("elementosDecorativos", i, c, formatearCantidad(e.target.value, el.unidad))} onFocus={e => setTimeout(() => e.target.select(), 0)} className="bg-transparent border-none p-0 text-lg font-bold text-amber-400 focus:ring-0 outline-none w-full" placeholder={esFraccion ? "0/0.000" : esEntero ? "0" : "—"} />
                                      </div>
                                    ))}
                                    <div>
                                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Unidad</p>
                                      <SelectorUnidad valor={el.unidad} lista="elementosDecorativos" idx={i} color="amber" />
                                    </div>
                                  </div>
                                  <div className="mt-3 pt-3 border-t border-white/5">
                                    <p className="text-[9px] text-slate-600 uppercase font-bold mb-1">Código SAP (opcional)</p>
                                    <input value={el.codSap || ""} onChange={e => updateLista("elementosDecorativos", i, "codSap", e.target.value)} className="bg-transparent border-none p-0 text-slate-500 font-mono text-xs focus:ring-0 outline-none w-full" placeholder="Sin código SAP" />
                                  </div>
                                </div>
                              )}
                            </SortableCard>
                          );
                        })}
                        <div className="md:col-span-2 flex gap-3">
                          <button onClick={() => agregarFila("elementosDecorativos", { nombre: "", cantidadBruta: "0", cantidadNeta: "0", unidad: "UN", codSap: "" })}
                            className="flex-1 py-6 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 hover:border-amber-500 hover:text-amber-400 transition-all flex items-center justify-center gap-3 font-bold group bg-white/[0.01]">
                            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_circle</span>+ Agregar elemento decorativo
                          </button>
                          <button onClick={() => agregarFila("elementosDecorativos", { nombre: "", _tipo: "separador" })}
                            className="px-6 py-6 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 hover:border-teal-500 hover:text-teal-400 transition-all flex items-center justify-center gap-2 font-bold group bg-white/[0.01]"
                            title="Agregar separador de sección">
                            <span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontSize: 18 }}>format_list_bulleted</span>— Sección
                          </button>
                        </div>
                      </div>
                    </SortableContext>
                  </DndContext>
                </section>
              </>
            )}

            {/* ════ TAB 2 — PROCESO ════ */}
            {tabActiva === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Editor */}
                <section className="lg:col-span-8 bg-slate-900/40 border border-white/5 rounded-3xl p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-1 bg-blue-500 rounded-full" />
                      <h3 className="text-lg font-bold text-white tracking-tight">Descripción del proceso</h3>
                    </div>
                    <label className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black text-xs rounded-full shadow-lg cursor-pointer active:scale-95 transition-transform ${leyendoImagen ? "opacity-60 pointer-events-none" : ""}`}>
                      {leyendoImagen ? <Spin /> : <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>}
                      LECTURA AI
                      <input type="file" accept="image/*" className="hidden" disabled={leyendoImagen}
                        onChange={e => { const f = e.target.files?.[0]; if (f) leerImagenConIA(f); e.target.value = ""; }} />
                    </label>
                  </div>
                  <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden">
                    <RichTextEditor value={form.descripcionProceso} onChange={val => update("descripcionProceso", val)} />
                  </div>
                </section>

                {/* Panel derecho */}
                <section className="lg:col-span-4 space-y-5">
                  <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 20 }}>analytics</span>
                      <h3 className="text-base font-bold text-white">Datos de Proceso</h3>
                    </div>
                    <div className="space-y-4">
                      {[["tempCoccion","Temp. Cocción","°C"],["tempEnfriado","Temp. Enfriado","°C"],["tempAlmacenamiento","Temp. Almacenamiento","°C"]].map(([c, l, s]) => (
                        <div key={c}>
                          <label className={lbl}>{l}</label>
                          <div className="relative">
                            <input value={form[c]} onChange={e => update(c, e.target.value)} className={`${inp} pr-10`} placeholder="NA" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm">{s}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-900/60 to-blue-900/10 border border-white/5 rounded-3xl p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <span className="material-symbols-outlined text-amber-400" style={{ fontSize: 20 }}>timer</span>
                      <h3 className="text-base font-bold text-white">Vida Útil</h3>
                    </div>
                    <div className="space-y-3">
                      {[["vidaUtilGrado","Granel"],["vidaUtilVacio","Vacío"],["vidaUtilAnaquel","Anaquel"]].map(([c, l]) => (
                        <div key={c} className="flex justify-between items-center p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                          <span className="text-xs font-semibold text-slate-400">{l}</span>
                          <div className="flex items-center gap-2">
                            <input value={form[c]} onChange={e => update(c, e.target.value)} className="w-16 bg-transparent text-right font-bold text-amber-400 border-none p-0 focus:ring-0 outline-none text-sm" placeholder="NA" />
                            
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ════ TAB 3 — ENVASES ════ */}
            {tabActiva === 3 && (
              <>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                  <div>
                    <span className="text-blue-500 font-bold tracking-[0.2em] text-xs uppercase mb-2 block">Gestión de Materiales</span>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">ENVASES</h2>
                  </div>
                  <button onClick={() => agregarFila("envases", { descripcion: "", codigoSap: "", cantidad: "", pesoEnvase: "" })}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/40 active:scale-95 text-sm">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>+ Agregar envase
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    {form.envases.map((e, i) => (
                      <div key={i} className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="md:col-span-2">
                            <label className={lbl}>Descripción del Envase</label>
                            <input value={e.descripcion} onChange={ev => updateLista("envases", i, "descripcion", ev.target.value)} className={inp} placeholder="Ej: Botella PET 500ml Reforzada" />
                          </div>
                          <div>
                            <label className={lbl}>Código SAP</label>
                            <div className="relative">
                              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" style={{ fontSize: 20 }}>barcode</span>
                              <input value={e.codigoSap} onChange={ev => updateLista("envases", i, "codigoSap", ev.target.value)} className={`${inp} pl-12`} placeholder="10004562" />
                            </div>
                          </div>
                          <div>
                            <label className={lbl}>Cant. Batch / UN</label>
                            <div className="relative">
                              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" style={{ fontSize: 20 }}>production_quantity_limits</span>
                              <input value={e.cantidad} onChange={ev => updateLista("envases", i, "cantidad", ev.target.value)} className={`${inp} pl-12`} placeholder="2400" type="number" />
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className={lbl}>Peso Envase (KG)</label>
                            <div className="relative">
                              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" style={{ fontSize: 20 }}>weight</span>
                              <input value={e.pesoEnvase || ""} onChange={ev => updateLista("envases", i, "pesoEnvase", ev.target.value)} className={`${inp} pl-12`} placeholder="0.045" />
                            </div>
                          </div>
                        </div>
                        <button onClick={() => eliminarFila("envases", i)} className="mt-4 text-xs font-bold text-red-400/70 hover:text-red-400 flex items-center gap-1 ml-auto transition-colors">
                          <span className="material-symbols-outlined text-sm">delete</span>Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Resumen */}
                  <div className="space-y-5">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-3xl p-7 shadow-2xl shadow-blue-500/20 relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 opacity-10">
                        <span className="material-symbols-outlined" style={{ fontSize: 120, fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                      </div>
                      <h3 className="text-white/80 font-bold uppercase tracking-widest text-xs mb-6">Resumen de Empaque</h3>
                      <div className="relative z-10">
                        <p className="text-white/60 text-sm font-medium">Peso Total Envases</p>
                        <div className="flex items-baseline gap-2 mb-6">
                          <span className="text-4xl font-black text-white tracking-tighter">
                            {form.envases.reduce((acc, e) => acc + (parseFloat(e.pesoEnvase) || 0), 0).toFixed(2)}
                          </span>
                          <span className="text-lg font-bold text-white/50">kg</span>
                        </div>
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                          <div className="text-white">
                            <p className="text-[10px] uppercase font-bold text-white/40">Total Envases</p>
                            <p className="font-bold">{form.envases.length} tipos</p>
                          </div>
                          <div className="text-right text-white">
                            <p className="text-[10px] uppercase font-bold text-white/40">SAP Registrados</p>
                            <p className="font-bold">{form.envases.filter(e => e.codigoSap).length} códigos</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-5">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-amber-400" style={{ fontSize: 20 }}>warning</span>
                        <div>
                          <p className="text-white font-bold text-sm">Validación de Stock</p>
                          <p className="text-slate-400 text-xs mt-1 leading-relaxed">El código SAP ingresado debe coincidir con el maestro de materiales para habilitar la orden de producción.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ════ TAB 4 — FOTOS ════ */}
            {tabActiva === 4 && (
              <>
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-5">
                  <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 20 }}>photo_library</span>Fotos del Proceso
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {form.fotosExtra.map((url, i) => (
                    <div key={i} className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-xl bg-slate-800/50 overflow-hidden flex-shrink-0 border border-white/5">
                        {url ? <img src={url} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display = "none"} />
                          : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-slate-600" style={{ fontSize: 24 }}>image</span></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className={lbl}>URL foto {i + 1}</label>
                        <input value={url} onChange={e => { const f = [...form.fotosExtra]; f[i] = e.target.value; update("fotosExtra", f); }} className={inpSm} placeholder="https://..." />
                      </div>
                      <button onClick={() => update("fotosExtra", form.fotosExtra.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                      </button>
                    </div>
                  ))}
                  <button onClick={() => update("fotosExtra", [...form.fotosExtra, ""])}
                    className="md:col-span-2 py-5 border-2 border-dashed border-blue-500/30 text-blue-400 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-500/5 transition-all">
                    <span className="material-symbols-outlined">add_photo_alternate</span>+ Agregar foto
                  </button>
                </div>
              </>
            )}

            {/* ════ TAB 5 — REVISIONES ════ */}
            {tabActiva === 5 && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                        {ficha ? "Editar Ficha Técnica" : "Nueva Ficha Técnica"}
                      </h1>
                      <p className="text-slate-400 text-sm font-medium mt-1">Control de versiones y cambios del producto</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-white/8 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden mb-6">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>description</span>
                      </div>
                      <h2 className="text-xl font-bold text-white">Tabla de Revisiones</h2>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.02]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                          <th className="px-6 py-4 font-bold">N° Revisión</th>
                          <th className="px-6 py-4 font-bold">Fecha</th>
                          <th className="px-6 py-4 font-bold">Descripción del cambio</th>
                          <th className="px-6 py-4 text-right font-bold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {form.revisiones.map((r, i) => (
                          <tr key={i} className="group hover:bg-white/[0.03] transition-colors">
                            <td className="px-6 py-4">
                              <input value={r.numero} onChange={e => { const rev = [...form.revisiones]; rev[i].numero = e.target.value; update("revisiones", rev); }}
                                className="bg-slate-800 text-slate-300 rounded-lg px-3 py-1 text-sm font-mono font-bold border-none focus:ring-1 focus:ring-blue-500 outline-none w-20" />
                            </td>
                            <td className="px-6 py-4">
                              <input type="date" value={r.fecha} onChange={e => { const rev = [...form.revisiones]; rev[i].fecha = e.target.value; update("revisiones", rev); }}
                                className="bg-transparent border-none p-0 text-slate-300 text-sm focus:ring-0 outline-none" />
                            </td>
                            <td className="px-6 py-4">
                              <input value={r.descripcion} onChange={e => { const rev = [...form.revisiones]; rev[i].descripcion = e.target.value; update("revisiones", rev); }}
                                className="bg-transparent border-none p-0 text-slate-300 text-sm font-medium focus:ring-0 outline-none w-full" placeholder="Descripción del cambio" />
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => update("revisiones", form.revisiones.filter((_, j) => j !== i))}
                                className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                <span className="material-symbols-outlined">delete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-white/[0.01]">
                          <td colSpan={4} className="px-6 py-4">
                            <button onClick={() => update("revisiones", [...form.revisiones, { numero: String(form.revisiones.length).padStart(3, "0"), fecha: "", descripcion: "" }])}
                              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm font-bold group">
                              <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">add_circle</span>+ Agregar revisión
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Stats revisiones */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    { color: "border-amber-500/50", label: "Última actualización", val: (() => { const f = form.revisiones.filter(r => r.fecha).sort().at(-1)?.fecha; if (!f) return "No registrado"; const [y,m,d] = f.split("-"); return `${parseInt(d)}/${parseInt(m)}/${y}`; })() },
                    { color: "border-blue-500/50",  label: "Total de cambios",    val: `${form.revisiones.length} revisión${form.revisiones.length !== 1 ? "es" : ""}` },
                    { color: "border-emerald-500/50", label: "Estado de ficha",   val: form.estado.charAt(0).toUpperCase() + form.estado.slice(1), dot: true },
                  ].map((s, i) => (
                    <div key={i} className={`bg-white/[0.02] border border-white/5 rounded-2xl p-6 border-l-4 ${s.color}`}>
                      <p className="text-xs text-slate-500 uppercase font-bold mb-1">{s.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {s.dot && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                        <p className="text-lg font-semibold text-white">{s.val}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

          </div>
        </main>
      </div>

      {/* ══ BOTONES FIJOS ══ */}
      {/* Móvil */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 flex gap-3 p-4 bg-slate-950/90 backdrop-blur-xl border-t border-white/10">
        <button onClick={onClose} className="flex-1 py-4 px-6 rounded-2xl border border-white/10 text-slate-400 font-bold hover:bg-white/5 transition-colors active:scale-95">
          Cancelar
        </button>
        <button onClick={handleGuardar} disabled={loading}
          className="flex-[1.5] py-4 px-6 rounded-2xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50">
          {loading ? "Guardando..." : ficha ? "Actualizar" : "Crear ficha"}
          {!loading && <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>}
        </button>
      </div>
      {/* Desktop — esquina inferior derecha */}
      <div className="hidden md:flex fixed bottom-8 right-8 items-center gap-3 z-40 bg-slate-950/70 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl">
        <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-white/5 transition-all active:scale-95">
          Cancelar
        </button>
        <button onClick={handleGuardar} disabled={loading}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50">
          {loading ? "Guardando..." : ficha ? "Actualizar ficha" : "Crear ficha"}
          {!loading && <span className="material-symbols-outlined text-sm">rocket_launch</span>}
        </button>
      </div>

      {/* ══ MODAL MERMA ══ */}
      {showMermaModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] px-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">⚠️ Productos no encontrados en Merma</h3>
            <p className="text-slate-400 text-sm mb-4">Los siguientes productos no están en el Buscador de Merma. ¿Quieres agregarlos?</p>
            <div className="flex flex-col gap-3 mb-5">
              {productosFaltantes.map((p, i) => (
                <div key={i} className="bg-slate-800/60 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-semibold">{p.descripcion || "Sin nombre"}</p>
                    <p className="text-slate-400 text-xs">COD. SAP: {p.codSap}</p>
                  </div>
                  <button onClick={() => handleAgregarAMerma(p)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition active:scale-95">
                    + Agregar
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => { setShowMermaModal(false); setTimeout(() => onClose(), 300); }} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl transition">
              Omitir y cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
