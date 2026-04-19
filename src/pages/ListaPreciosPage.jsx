import { useState, useEffect, useRef } from "react";
import { db } from "../firebase/config";
import {
  collection, onSnapshot, doc, setDoc, addDoc,
  deleteDoc, serverTimestamp, query, orderBy
} from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import AppSidebar from "../components/AppSidebar";
import BottomNav from "../components/BottomNav";
import Navbar from "../components/Navbar";
import toast, { Toaster } from "react-hot-toast";

const COLORES_CAT = [
  { id: "blue",   bg: "bg-blue-500/15",   text: "text-blue-400",   dot: "bg-blue-400"   },
  { id: "emerald",bg: "bg-emerald-500/15", text: "text-emerald-400",dot: "bg-emerald-400"},
  { id: "orange", bg: "bg-orange-500/15",  text: "text-orange-400", dot: "bg-orange-400" },
  { id: "purple", bg: "bg-purple-500/15",  text: "text-purple-400", dot: "bg-purple-400" },
  { id: "red",    bg: "bg-red-500/15",     text: "text-red-400",    dot: "bg-red-400"    },
  { id: "yellow", bg: "bg-yellow-500/15",  text: "text-yellow-400", dot: "bg-yellow-400" },
  { id: "pink",   bg: "bg-pink-500/15",    text: "text-pink-400",   dot: "bg-pink-400"   },
  { id: "cyan",   bg: "bg-cyan-500/15",    text: "text-cyan-400",   dot: "bg-cyan-400"   },
];

function colorClasses(colorId) {
  return COLORES_CAT.find(c => c.id === colorId) || COLORES_CAT[0];
}

function formatPrecio(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return "—";
  return `$${num.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function ListaPreciosPage({ user, rol, onBack, onNavegar }) {
  const { t } = useTheme();
  const esAdmin = rol === "admin" || rol === "unico";

  // ── Datos ──────────────────────────────────────────────────────────────────
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [fichas, setFichas] = useState([]);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [catActiva, setCatActiva] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [tab, setTab] = useState("productos"); // "productos" | "categorias"

  // ── Modales ────────────────────────────────────────────────────────────────
  const [modalProd, setModalProd] = useState(false);   // nuevo / editar producto
  const [editProd, setEditProd] = useState(null);       // null = nuevo
  const [formProd, setFormProd] = useState({ nombre: "", precio: "", categoriaId: "", codSap: "", codBarra: "", tipo: "manual", fichaId: "" });
  const [savingProd, setSavingProd] = useState(false);
  const [busqFicha, setBusqFicha] = useState("");

  const [modalCat, setModalCat] = useState(false);     // nueva / editar categoría
  const [editCat, setEditCat] = useState(null);
  const [formCat, setFormCat] = useState({ nombre: "", color: "blue" });
  const [savingCat, setSavingCat] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null); // { tipo: "producto"|"categoria", id, nombre }
  const [leyendoPrecio, setLeyendoPrecio] = useState(false);
  const camPrecioRef = useRef(null);
  const camListaRef = useRef(null);

  // ── Estados para flujo IA lista completa ──
  const [leyendoLista, setLeyendoLista] = useState(false);
  const [colaIA, setColaIA] = useState([]); // productos detectados pendientes de procesar
  const [modalSimilitud, setModalSimilitud] = useState(null); // { detectedProd, fichasSimilares }
  const [modalColaIA, setModalColaIA] = useState(false); // revisar lista detectada

  const inputRef = useRef(null);
  const chipsRef = useRef(null);
  
  const scrollChips = (dir) => {
    if (chipsRef.current) {
      chipsRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
    }
  };

  // ── Firestore listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "precios_categorias"), orderBy("nombre")),
      snap => setCategorias(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "lista_precios"),
      snap => setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "fichas"), snap => {
      setFichas(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(f => f.estado !== "baja" && f.formatosVenta?.some(fv => fv.codSap))
      );
    });
    return () => unsub();
  }, []);

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const productosFiltrados = productos
    .filter(p => catActiva === "todas" || p.categoriaId === catActiva)
    .filter(p => !busqueda || p.nombre?.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

  const fichasFiltradas = fichas.filter(f =>
    !busqFicha || f.nombre?.toLowerCase().includes(busqFicha.toLowerCase())
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  const catDeProducto = (p) => categorias.find(c => c.id === p.categoriaId);

  const abrirNuevoProd = () => {
    setEditProd(null);
    setFormProd({ nombre: "", precio: "", categoriaId: categorias[0]?.id || "", codSap: "", codBarra: "", tipo: "manual", fichaId: "" });
    setBusqFicha("");
    setModalProd(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const abrirEditarProd = (p) => {
    setEditProd(p);
    setFormProd({ nombre: p.nombre, precio: String(p.precio ?? ""), categoriaId: p.categoriaId || "", codSap: p.codSap || "", codBarra: p.codBarra || "", tipo: p.tipo || "manual", fichaId: p.fichaId || "" });
    setBusqFicha("");
    setModalProd(true);
  };

  const seleccionarFicha = (ficha) => {
    const sap = ficha.formatosVenta?.find(fv => fv.codSap)?.codSap || "";
    setFormProd(prev => ({
      ...prev,
      nombre: ficha.nombre,
      codSap: sap,
      tipo: "ficha",
      fichaId: ficha.id,
    }));
    setBusqFicha(ficha.nombre);
  };

  const guardarProducto = async () => {
    if (!formProd.nombre.trim()) return toast.error("El nombre es obligatorio");
    setSavingProd(true);
    try {
      const data = {
        nombre: formProd.nombre.trim().toUpperCase(),
        precio: formProd.precio !== "" ? parseFloat(formProd.precio) : null,
        categoriaId: formProd.categoriaId || null,
        codSap: formProd.codSap?.trim() || null,
        codBarra: formProd.codBarra?.trim() || null,
        tipo: formProd.tipo,
        fichaId: formProd.fichaId || null,
        updatedAt: serverTimestamp(),
        updatedBy: user?.displayName || user?.email || "Usuario",
      };
      if (editProd) {
        await setDoc(doc(db, "lista_precios", editProd.id), { ...data }, { merge: true });
        toast.success("Producto actualizado ✅");
      } else {
        await addDoc(collection(db, "lista_precios"), { ...data, createdAt: serverTimestamp() });
        toast.success("Producto agregado ✅");
      }
      setModalProd(false);
    } catch { toast.error("Error al guardar"); }
    setSavingProd(false);
  };

  // ── Similitud de nombre entre dos strings (distancia simple) ──
  const calcSimilitud = (a, b) => {
    if (!a || !b) return 0;
    const an = a.toLowerCase().trim();
    const bn = b.toLowerCase().trim();
    if (an === bn) return 1;
    // Overlap de palabras
    const wa = new Set(an.split(/\s+/).filter(w => w.length > 2));
    const wb = new Set(bn.split(/\s+/).filter(w => w.length > 2));
    let matches = 0;
    wa.forEach(w => { if (bn.includes(w)) matches++; });
    wb.forEach(w => { if (an.includes(w)) matches++; });
    return matches / (wa.size + wb.size || 1);
  };

  // ── Buscar fichas similares al nombre detectado ──
  const buscarFichasSimilares = (nombreDetectado) => {
    return fichas
      .map(f => ({ ...f, sim: calcSimilitud(nombreDetectado, f.nombre) }))
      .filter(f => f.sim > 0.35)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 3);
  };

  // ── Leer lista completa de precios desde imagen ──
  const leerListaConIA = async (file) => {
    if (!file) return;
    setLeyendoLista(true);
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
        body: JSON.stringify({ image: base64, mimeType: file.type || "image/jpeg", tipo: "precio" }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || "Error al procesar"); return; }
      const resultado = data.resultado;

      // Construir cola de productos detectados
      let detectados = [];
      if (resultado?.precios?.length > 0) {
        detectados = resultado.precios;
      } else if (resultado?.precio !== null && resultado?.precio !== undefined) {
        detectados = [{ precio: resultado.precio, nombre: resultado.nombre || "", codBarra: resultado.codBarra || null }];
      }

      if (detectados.length === 0) { toast.error("No se detectaron precios en la imagen"); return; }

      // Enriquecer con similitudes de fichas
      const enriched = detectados.map(d => ({
        ...d,
        fichasSimilares: buscarFichasSimilares(d.nombre || ""),
      }));

      setColaIA(enriched);
      setModalColaIA(true);
      toast.success(`${detectados.length} producto(s) detectados`);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLeyendoLista(false);
      if (camListaRef.current) camListaRef.current.value = "";
    }
  };

  // ── Confirmar producto de la cola IA ──
  const confirmarDesdeCola = async (itemCola, usarFicha = null) => {
    setSavingProd(true);
    try {
      const data = {
        nombre: (usarFicha ? usarFicha.nombre : itemCola.nombre || "SIN NOMBRE").toUpperCase(),
        precio: itemCola.precio ?? null,
        categoriaId: null,
        codSap: usarFicha ? (usarFicha.formatosVenta?.find(fv => fv.codSap)?.codSap || null) : null,
        codBarra: itemCola.codBarra || null,
        tipo: usarFicha ? "ficha" : "manual",
        fichaId: usarFicha ? usarFicha.id : null,
        updatedAt: serverTimestamp(),
        updatedBy: user?.displayName || user?.email || "Usuario",
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "lista_precios"), data);
      toast.success(`${data.nombre} agregado ✅`);

      // Avanzar en la cola
      const newCola = colaIA.filter(i => i !== itemCola);
      setColaIA(newCola);
      if (newCola.length === 0) setModalColaIA(false);
      setModalSimilitud(null);
    } catch { toast.error("Error al guardar"); }
    setSavingProd(false);
  };

  // ── Leer precio desde cámara/imagen con IA ──
  const leerPrecioConIA = async (file) => {
    if (!file) return;
    setLeyendoPrecio(true);
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
        body: JSON.stringify({ image: base64, mimeType: file.type || "image/jpeg", tipo: "precio" }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || "Error al procesar imagen"); return; }
      const resultado = data.resultado;
      if (!resultado || resultado.precio === null || resultado.precio === undefined) {
        toast.error("No se detectó ningún precio en la imagen");
        return;
      }
      setFormProd(p => ({
        ...p,
        precio: String(resultado.precio),
        ...(resultado.nombre && !p.nombre ? { nombre: resultado.nombre.toUpperCase() } : {}),
      }));
      toast.success(`Precio detectado: $${Number(resultado.precio).toLocaleString("es-CL")} ✅`);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLeyendoPrecio(false);
      if (camPrecioRef.current) camPrecioRef.current.value = "";
    }
  };

  const eliminarProducto = async (id) => {
    try {
      await deleteDoc(doc(db, "lista_precios", id));
      toast.success("Producto eliminado");
      setConfirmDelete(null);
    } catch { toast.error("Error al eliminar"); }
  };

  // ── Categorías ─────────────────────────────────────────────────────────────
  const abrirNuevaCat = () => {
    setEditCat(null);
    setFormCat({ nombre: "", color: "blue" });
    setModalCat(true);
  };

  const abrirEditarCat = (c) => {
    setEditCat(c);
    setFormCat({ nombre: c.nombre, color: c.color || "blue" });
    setModalCat(true);
  };

  const guardarCat = async () => {
    if (!formCat.nombre.trim()) return toast.error("El nombre es obligatorio");
    setSavingCat(true);
    try {
      if (editCat) {
        await setDoc(doc(db, "precios_categorias", editCat.id), formCat, { merge: true });
        toast.success("Categoría actualizada ✅");
      } else {
        await addDoc(collection(db, "precios_categorias"), { nombre: formCat.nombre.trim(), color: formCat.color });
        toast.success("Categoría creada ✅");
      }
      setModalCat(false);
    } catch { toast.error("Error al guardar"); }
    setSavingCat(false);
  };

  const eliminarCat = async (id) => {
    try {
      await deleteDoc(doc(db, "precios_categorias", id));
      toast.success("Categoría eliminada");
      setConfirmDelete(null);
      if (catActiva === id) setCatActiva("todas");
    } catch { toast.error("Error al eliminar"); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`${t.bg} flex h-screen overflow-hidden`}>
      <Toaster />
      <div className="hidden md:block flex-shrink-0">
        <AppSidebar user={user} rol={rol} moduloActivo="precios" onNavegar={onNavegar} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="hidden md:block flex-shrink-0"><Navbar user={user} rol={rol} onNavegar={onNavegar} titulo="Lista de Precios" /></div>

        {/* Header móvil */}
        <header className={`md:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 ${t.bgNav} border-b ${t.border}`}>
          <button onClick={onBack} className={`w-10 h-10 flex items-center justify-center rounded-full ${t.hover} ${t.text}`}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className={`${t.text} text-base font-bold`}>Lista de Precios</h2>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 md:px-8 py-6">

            {/* ── Encabezado ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <button onClick={onBack} className={`hidden md:flex items-center gap-1.5 ${t.textSecondary} hover:text-blue-400 text-xs mb-2 transition-colors`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>
                  Inicio
                </button>
                <h1 className={`${t.text} text-2xl md:text-3xl font-extrabold tracking-tight`}>Lista de Precios</h1>
                <p className={`${t.textSecondary} text-sm mt-0.5`}>
                  {productos.length} productos · {categorias.length} categorías
                </p>
              </div>

              {/* Tabs + acciones */}
              <div className="flex items-center gap-3">
                {/* Tabs */}
                <div className={`flex ${t.bgCard} border ${t.border} rounded-xl overflow-hidden`}>
                  {[
                    { id: "productos", label: "Productos", icon: "sell" },
                    { id: "categorias", label: "Categorías", icon: "label" },
                  ].map(v => (
                    <button key={v.id} onClick={() => setTab(v.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors ${tab === v.id ? "bg-blue-600 text-white" : `${t.textSecondary}`}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: tab === v.id ? "'FILL' 1" : "'FILL' 0" }}>{v.icon}</span>
                      {v.label}
                    </button>
                  ))}
                </div>

                {esAdmin && (
                  <div className="flex items-center gap-2">
                    {tab === "productos" && (
                      <label title="Escanear lista de precios con IA"
                        className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl font-bold text-sm transition shadow-lg ${leyendoLista ? "bg-amber-700 opacity-60 pointer-events-none" : "bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 shadow-amber-500/20"} text-white`}>
                        {leyendoLista
                          ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Leyendo...</>
                          : <><span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>photo_camera</span> Escanear lista</>
                        }
                        <input ref={camListaRef} type="file" accept="image/*" capture="environment" className="hidden" disabled={leyendoLista}
                          onChange={e => { const f = e.target.files?.[0]; if (f) leerListaConIA(f); }} />
                      </label>
                    )}
                    <button
                      onClick={tab === "productos" ? abrirNuevoProd : abrirNuevaCat}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-4 py-2 rounded-xl transition shadow-lg shadow-blue-500/20">
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                      {tab === "productos" ? "Nuevo producto" : "Nueva categoría"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ══════════ TAB PRODUCTOS ══════════ */}
            {tab === "productos" && (
              <>
                {/* Barra búsqueda + filtro categoría */}
                <div className="flex flex-col sm:flex-row gap-3 mb-5">
                  <div className="relative flex-1">
                    <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 ${t.textSecondary}`} style={{ fontSize: 18 }}>search</span>
                    <input
                      value={busqueda} onChange={e => setBusqueda(e.target.value)}
                      placeholder="Buscar producto..."
                      className={`w-full ${t.bgCard} border ${t.border} ${t.text} pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>

                  {/* Filtro categorías Premium */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      onClick={() => scrollChips(-1)}
                      className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${t.bgInput} ${t.textSecondary} hover:text-blue-400 transition-colors border ${t.border}`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
                    </button>

                    <div
                      ref={chipsRef}
                      className="flex gap-2 overflow-x-auto items-center flex-1 px-4"
                      style={{ 
                        scrollbarWidth: "none", 
                        msOverflowStyle: "none",
                        WebkitMaskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)',
                        maskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)'
                      }}
                    >
                      <button
                        onClick={() => setCatActiva("todas")}
                        className={`px-4 py-2 rounded-full text-[10px] font-black whitespace-nowrap border transition-all shrink-0 uppercase tracking-widest ${
                          catActiva === "todas"
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-transparent shadow-lg shadow-blue-500/25"
                            : `${t.bgCard} ${t.border} ${t.textSecondary} hover:text-blue-400`
                        }`}
                      >
                        TODAS
                      </button>
                      {categorias.map(c => {
                        const cc = colorClasses(c.color);
                        const activa = catActiva === c.id;
                        return (
                          <button key={c.id}
                            onClick={() => setCatActiva(c.id)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-bold border transition-all shrink-0 uppercase tracking-widest ${
                              activa 
                                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-transparent shadow-lg shadow-blue-500/25" 
                                : `${t.bgCard} ${t.border} ${t.textSecondary} hover:text-blue-400`
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${activa ? "bg-white" : cc.dot}`} />
                            {c.nombre}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => scrollChips(1)}
                      className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${t.bgInput} ${t.textSecondary} hover:text-blue-400 transition-colors border ${t.border}`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
                    </button>
                  </div>
                </div>

                {/* Tabla de productos */}
                {productosFiltrados.length === 0 ? (
                  <div className={`${t.bgCard} border ${t.border} rounded-2xl flex flex-col items-center justify-center py-16 gap-3`}>
                    <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 40, fontVariationSettings: "'FILL' 1" }}>sell</span>
                    <p className={`${t.text} font-bold`}>Sin productos</p>
                    <p className={`${t.textSecondary} text-sm`}>{busqueda ? "No hay resultados para esta búsqueda" : "Agrega el primer producto"}</p>
                    {esAdmin && !busqueda && (
                      <button onClick={abrirNuevoProd}
                        className="mt-2 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-4 py-2 rounded-xl transition">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                        Nuevo producto
                      </button>
                    )}
                  </div>
                ) : (
                  <div className={`${t.bgCard} border ${t.border} rounded-2xl overflow-hidden`}>
                    {/* Header tabla */}
                    <div className={`hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b ${t.border} ${t.isDark ? "bg-white/5" : "bg-slate-50"}`}>
                      {["", "Nombre", "SAP", "Categoría", "Precio", ""].map((h, i) => (
                        <div key={i} className={`${t.textSecondary} text-[10px] font-black uppercase tracking-widest ${
                          i === 0 ? "col-span-1" :
                          i === 1 ? "col-span-4" :
                          i === 2 ? "col-span-2" :
                          i === 3 ? "col-span-2" :
                          i === 4 ? "col-span-2" : "col-span-1"
                        }`}>{h}</div>
                      ))}
                    </div>

                    {/* Filas */}
                    <div className={`divide-y ${t.border}`}>
                      {productosFiltrados.map(p => {
                        const cat = catDeProducto(p);
                        const cc = cat ? colorClasses(cat.color) : null;
                        return (
                          <div key={p.id}
                            className={`flex md:grid md:grid-cols-12 gap-3 md:gap-4 px-4 md:px-5 py-3.5 items-center transition-colors ${t.isDark ? "hover:bg-white/3" : "hover:bg-slate-50"}`}>

                            {/* Ícono tipo */}
                            <div className="hidden md:flex col-span-1 items-center">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${p.tipo === "ficha" ? "bg-orange-500/15 text-orange-400" : "bg-blue-500/15 text-blue-400"}`}>
                                <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>
                                  {p.tipo === "ficha" ? "description" : "sell"}
                                </span>
                              </div>
                            </div>

                            {/* Nombre */}
                            <div className="col-span-4 flex-1 min-w-0">
                              <p className={`${t.text} font-semibold text-sm truncate`}>{p.nombre}</p>
                              {/* Móvil: mostrar sap y cat inline */}
                              <div className="md:hidden flex items-center gap-2 mt-0.5 flex-wrap">
                                {p.codSap && <span className={`${t.textSecondary} text-[10px] font-mono`}>SAP {p.codSap}</span>}
                                {cat && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cc.bg} ${cc.text}`}>{cat.nombre}</span>}
                              </div>
                            </div>

                            {/* SAP */}
                            <div className="hidden md:flex col-span-2 items-center">
                              {p.codSap
                                ? <span className={`${t.textSecondary} text-xs font-mono`}>{p.codSap}</span>
                                : <span className={`${t.textSecondary} text-xs opacity-40`}>—</span>
                              }
                            </div>

                            {/* Categoría */}
                            <div className="hidden md:flex col-span-2 items-center">
                              {cat
                                ? <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${cc.bg} ${cc.text}`}>{cat.nombre}</span>
                                : <span className={`${t.textSecondary} text-xs opacity-40`}>Sin categoría</span>
                              }
                            </div>

                            {/* Precio */}
                            <div className="col-span-2 flex items-center">
                              {p.precio != null
                                ? <span className="text-emerald-400 font-black text-sm">{formatPrecio(p.precio)}</span>
                                : <span className={`${t.textSecondary} text-xs italic opacity-60`}>Sin precio</span>
                              }
                            </div>

                            {/* Acciones */}
                            {esAdmin && (
                              <div className="col-span-1 flex items-center justify-end gap-1">
                                <button onClick={() => abrirEditarProd(p)}
                                  className={`w-7 h-7 flex items-center justify-center rounded-lg ${t.hover} text-blue-400 transition`}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit</span>
                                </button>
                                <button onClick={() => setConfirmDelete({ tipo: "producto", id: p.id, nombre: p.nombre })}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-red-400 transition">
                                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ══════════ TAB CATEGORÍAS ══════════ */}
            {tab === "categorias" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categorias.length === 0 && (
                  <div className={`sm:col-span-2 lg:col-span-3 ${t.bgCard} border ${t.border} rounded-2xl flex flex-col items-center justify-center py-16 gap-3`}>
                    <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 40, fontVariationSettings: "'FILL' 1" }}>label</span>
                    <p className={`${t.text} font-bold`}>Sin categorías</p>
                    {esAdmin && (
                      <button onClick={abrirNuevaCat}
                        className="mt-2 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-4 py-2 rounded-xl transition">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                        Nueva categoría
                      </button>
                    )}
                  </div>
                )}
                {categorias.map(c => {
                  const cc = colorClasses(c.color);
                  const count = productos.filter(p => p.categoriaId === c.id).length;
                  return (
                    <div key={c.id} className={`${t.bgCard} border ${t.border} rounded-2xl p-5 flex items-center gap-4`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cc.bg}`}>
                        <span className={`material-symbols-outlined ${cc.text}`} style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>label</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`${t.text} font-bold truncate`}>{c.nombre}</p>
                        <p className={`${t.textSecondary} text-xs mt-0.5`}>{count} producto{count !== 1 ? "s" : ""}</p>
                      </div>
                      {esAdmin && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => abrirEditarCat(c)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg ${t.hover} text-blue-400 transition`}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                          </button>
                          <button onClick={() => setConfirmDelete({ tipo: "categoria", id: c.id, nombre: c.nombre })}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-red-400 transition">
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ══════════ MODAL PRODUCTO ══════════ */}
      {modalProd && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${t.border} flex-shrink-0`}>
              <div>
                <h3 className={`${t.text} font-bold`}>{editProd ? "Editar producto" : "Nuevo producto"}</h3>
                <p className={`${t.textSecondary} text-xs mt-0.5`}>
                  {editProd ? "Modifica los datos del producto" : "Agrega manualmente o vincula desde Fichas"}
                </p>
              </div>
              <button onClick={() => setModalProd(false)} className={`w-8 h-8 flex items-center justify-center rounded-full ${t.hover} ${t.textSecondary}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Tipo: manual o desde ficha */}
              <div className={`flex ${t.bgInput} rounded-xl overflow-hidden border ${t.border}`}>
                {[
                  { id: "manual", label: "Manual", icon: "sell" },
                  { id: "ficha", label: "Desde Ficha", icon: "description" },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setFormProd(p => ({ ...p, tipo: opt.id, nombre: "", codSap: "", fichaId: "" }))}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition ${formProd.tipo === opt.id ? "bg-blue-600 text-white" : t.textSecondary}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Selector de ficha — solo si tipo = ficha */}
              {formProd.tipo === "ficha" && (
                <div>
                  <label className={`${t.textSecondary} text-xs font-bold uppercase tracking-wider mb-1.5 block`}>Ficha Técnica (SAP vigente)</label>
                  <div className="relative mb-2">
                    <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 ${t.textSecondary}`} style={{ fontSize: 16 }}>search</span>
                    <input value={busqFicha} onChange={e => setBusqFicha(e.target.value)}
                      placeholder="Buscar ficha..."
                      className={`w-full ${t.bgInput} border ${t.border} ${t.text} pl-9 pr-4 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`} />
                  </div>
                  <div className={`max-h-40 overflow-y-auto rounded-xl border ${t.border} divide-y ${t.border}`}>
                    {fichasFiltradas.slice(0, 30).map(f => {
                      const sap = f.formatosVenta?.find(fv => fv.codSap)?.codSap;
                      const sel = formProd.fichaId === f.id;
                      return (
                        <button key={f.id} onClick={() => seleccionarFicha(f)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${sel ? "bg-blue-600 text-white" : `${t.text} ${t.hover}`}`}>
                          <span className="truncate text-left">{f.nombre}</span>
                          <span className={`font-mono flex-shrink-0 ml-2 ${sel ? "text-blue-200" : t.textSecondary}`}>SAP {sap}</span>
                        </button>
                      );
                    })}
                    {fichasFiltradas.length === 0 && (
                      <p className={`${t.textSecondary} text-xs text-center py-4`}>Sin fichas con SAP vigente</p>
                    )}
                  </div>
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className={`${t.textSecondary} text-xs font-bold uppercase tracking-wider mb-1.5 block`}>Nombre *</label>
                <input
                  ref={inputRef}
                  value={formProd.nombre}
                  onChange={e => setFormProd(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Nombre del producto"
                  className={`w-full ${t.bgInput} border ${t.border} ${t.text} px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Precio */}
                <div>
                  <label className={`${t.textSecondary} text-xs font-bold uppercase tracking-wider mb-1.5 block`}>Precio ($)</label>
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textSecondary} text-sm font-bold`}>$</span>
                      <input
                        type="number" min="0"
                        value={formProd.precio}
                        onChange={e => setFormProd(p => ({ ...p, precio: e.target.value }))}
                        placeholder="0"
                        className={`w-full ${t.bgInput} border ${t.border} ${t.text} pl-7 pr-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                    </div>
                    {/* Botón leer precio con cámara */}
                    <label
                      title="Leer precio con cámara"
                      className={`flex items-center justify-center w-11 h-11 rounded-xl border transition cursor-pointer flex-shrink-0 ${
                        leyendoPrecio
                          ? "bg-amber-500/20 border-amber-500/40 pointer-events-none"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                      }`}>
                      {leyendoPrecio
                        ? <svg className="w-4 h-4 animate-spin text-amber-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                        : <span className="material-symbols-outlined text-amber-400" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
                      }
                      <input
                        ref={camPrecioRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        disabled={leyendoPrecio}
                        onChange={e => { const f = e.target.files?.[0]; if (f) leerPrecioConIA(f); }}
                      />
                    </label>
                  </div>
                  {leyendoPrecio && (
                    <p className="text-[10px] text-amber-400 mt-1 font-medium animate-pulse">Analizando imagen con IA...</p>
                  )}
                </div>

                {/* Código SAP */}
                <div>
                  <label className={`${t.textSecondary} text-xs font-bold uppercase tracking-wider mb-1.5 block`}>Código SAP</label>
                  <input
                    value={formProd.codSap}
                    onChange={e => setFormProd(p => ({ ...p, codSap: e.target.value }))}
                    placeholder="Ej: 123456"
                    className={`w-full ${t.bgInput} border ${t.border} ${t.text} px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
              </div>

              {/* Código de Barras */}
              <div>
                <label className={`${t.textSecondary} text-xs font-bold uppercase tracking-wider mb-1.5 block`}>
                  Código de Barras
                  <span className={`ml-2 font-normal normal-case text-[10px] ${t.textSecondary}`}>EAN/UPC — opcional</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" style={{ fontSize: 16 }}>barcode</span>
                  <input
                    value={formProd.codBarra || ""}
                    onChange={e => setFormProd(p => ({ ...p, codBarra: e.target.value.replace(/[^0-9]/g, "") }))}
                    placeholder="Ej: 7802300012345"
                    maxLength={14}
                    className={`w-full ${t.bgInput} border ${t.border} ${t.text} pl-9 pr-4 py-2.5 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
                {formProd.codBarra?.length > 0 && (
                  <p className={`${t.textSecondary} text-[10px] mt-1`}>
                    {formProd.codBarra.length} dígitos ·{" "}
                    {formProd.codBarra.length === 13 ? "EAN-13 ✓" : formProd.codBarra.length === 12 ? "UPC-A ✓" : formProd.codBarra.length === 8 ? "EAN-8 ✓" : "verificar longitud"}
                  </p>
                )}
              </div>

              {/* Categoría */}
              <div>
                <label className={`${t.textSecondary} text-xs font-bold uppercase tracking-wider mb-1.5 block`}>Categoría</label>
                {categorias.length === 0 ? (
                  <p className={`${t.textSecondary} text-xs italic py-2`}>
                    Aún no hay categorías. Créalas desde la pestaña Categorías.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFormProd(p => ({ ...p, categoriaId: "" }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${!formProd.categoriaId ? "bg-blue-600 border-blue-600 text-white" : `${t.bgInput} ${t.border} ${t.textSecondary}`}`}>
                      Sin categoría
                    </button>
                    {categorias.map(c => {
                      const cc = colorClasses(c.color);
                      const sel = formProd.categoriaId === c.id;
                      return (
                        <button key={c.id}
                          onClick={() => setFormProd(p => ({ ...p, categoriaId: c.id }))}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${sel ? `${cc.bg} ${cc.text} border-current` : `${t.bgInput} ${t.border} ${t.textSecondary}`}`}>
                          <span className={`w-2 h-2 rounded-full ${cc.dot}`} />
                          {c.nombre}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className={`flex gap-3 px-5 pb-5 pt-3 border-t ${t.border} flex-shrink-0`}>
              <button onClick={() => setModalProd(false)}
                className={`flex-1 ${t.bgInput} ${t.text} font-semibold py-2.5 rounded-xl text-sm transition`}>
                Cancelar
              </button>
              <button onClick={guardarProducto} disabled={savingProd}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-sm transition disabled:opacity-50">
                {savingProd ? "Guardando..." : editProd ? "Guardar cambios" : "Agregar producto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL CATEGORÍA ══════════ */}
      {modalCat && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-sm shadow-2xl`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${t.border}`}>
              <h3 className={`${t.text} font-bold`}>{editCat ? "Editar categoría" : "Nueva categoría"}</h3>
              <button onClick={() => setModalCat(false)} className={`w-8 h-8 flex items-center justify-center rounded-full ${t.hover} ${t.textSecondary}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={`${t.textSecondary} text-xs font-bold uppercase tracking-wider mb-1.5 block`}>Nombre *</label>
                <input
                  autoFocus
                  value={formCat.nombre}
                  onChange={e => setFormCat(p => ({ ...p, nombre: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && guardarCat()}
                  placeholder="Nombre de la categoría"
                  className={`w-full ${t.bgInput} border ${t.border} ${t.text} px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <div>
                <label className={`${t.textSecondary} text-xs font-bold uppercase tracking-wider mb-2 block`}>Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORES_CAT.map(c => (
                    <button key={c.id} onClick={() => setFormCat(p => ({ ...p, color: c.id }))}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition border-2 ${formCat.color === c.id ? "border-white scale-110" : "border-transparent"} ${c.bg}`}>
                      <span className={`w-3 h-3 rounded-full ${c.dot}`} />
                    </button>
                  ))}
                </div>
                {/* Preview */}
                <div className="mt-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${colorClasses(formCat.color).bg} ${colorClasses(formCat.color).text}`}>
                    <span className={`w-2 h-2 rounded-full ${colorClasses(formCat.color).dot}`} />
                    {formCat.nombre || "Vista previa"}
                  </span>
                </div>
              </div>
            </div>
            <div className={`flex gap-3 px-5 pb-5 border-t ${t.border} pt-3`}>
              <button onClick={() => setModalCat(false)}
                className={`flex-1 ${t.bgInput} ${t.text} font-semibold py-2.5 rounded-xl text-sm transition`}>
                Cancelar
              </button>
              <button onClick={guardarCat} disabled={savingCat}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-sm transition disabled:opacity-50">
                {savingCat ? "Guardando..." : editCat ? "Guardar" : "Crear categoría"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL CONFIRMAR ELIMINAR ══════════ */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/75 z-[60] flex items-center justify-center p-4">
          <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center`}>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-red-400" style={{ fontSize: 24 }}>delete_forever</span>
            </div>
            <p className={`${t.text} font-bold mb-1`}>¿Eliminar {confirmDelete.tipo}?</p>
            <p className={`${t.textSecondary} text-sm mb-5`}>
              <span className="font-semibold">{confirmDelete.nombre}</span> será eliminado permanentemente.
              {confirmDelete.tipo === "categoria" && " Los productos de esta categoría quedarán sin categoría."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className={`flex-1 ${t.bgInput} ${t.text} font-semibold py-2.5 rounded-xl text-sm transition`}>
                Cancelar
              </button>
              <button
                onClick={() => confirmDelete.tipo === "producto" ? eliminarProducto(confirmDelete.id) : eliminarCat(confirmDelete.id)}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm transition">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL COLA IA — revisar productos detectados ══ */}
      {modalColaIA && colaIA.length > 0 && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${t.border} flex-shrink-0`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-400" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
                </div>
                <div>
                  <p className={`${t.text} font-bold`}>Productos detectados</p>
                  <p className={`${t.textSecondary} text-xs`}>{colaIA.length} producto(s) pendientes de confirmar</p>
                </div>
              </div>
              <button onClick={() => { setModalColaIA(false); setColaIA([]); }}
                className={`w-8 h-8 flex items-center justify-center rounded-full ${t.hover} ${t.textSecondary}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {colaIA.map((item, i) => {
                const esPrimero = i === 0;
                return (
                  <div key={i} className={`${t.bgInput} border ${t.border} rounded-xl p-4 ${esPrimero ? "ring-2 ring-blue-500/40" : "opacity-60"}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        {esPrimero && <p className={`text-blue-400 text-[9px] font-black uppercase tracking-wider mb-0.5`}>Procesando ahora</p>}
                        <p className={`${t.text} font-bold text-sm truncate`}>{item.nombre || "Sin nombre"}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {item.precio != null && <span className="text-emerald-400 font-black text-sm">${Number(item.precio).toLocaleString("es-CL")}</span>}
                          {item.codBarra && <span className={`${t.textSecondary} text-[10px] font-mono`}>{item.codBarra}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Fichas similares */}
                    {esPrimero && item.fichasSimilares?.length > 0 && (
                      <div className={`mt-2 pt-3 border-t ${t.border}`}>
                        <p className={`${t.textSecondary} text-[10px] font-black uppercase tracking-wider mb-2`}>
                          ⚠ Fichas técnicas similares encontradas — ¿cuál deseas usar?
                        </p>
                        <div className="space-y-2">
                          {item.fichasSimilares.map(ficha => (
                            <button key={ficha.id}
                              onClick={() => confirmarDesdeCola(item, ficha)}
                              disabled={savingProd}
                              className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition text-left ${t.bgCard} ${t.border} hover:border-blue-400/50 hover:bg-blue-500/5`}>
                              <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-orange-400" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>description</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`${t.text} text-xs font-bold truncate`}>{ficha.nombre}</p>
                                <p className={`${t.textSecondary} text-[10px]`}>
                                  {ficha.seccion} · SAP {ficha.formatosVenta?.find(fv => fv.codSap)?.codSap || "—"}
                                  · {Math.round(ficha.sim * 100)}% similitud
                                </p>
                              </div>
                              <span className="material-symbols-outlined text-blue-400 flex-shrink-0" style={{ fontSize: 16 }}>add_circle</span>
                            </button>
                          ))}
                        </div>
                        <p className={`${t.textSecondary} text-[10px] mt-2`}>O bien, agrega el producto tal como viene de la foto:</p>
                      </div>
                    )}

                    {esPrimero && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => confirmarDesdeCola(item, null)} disabled={savingProd}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs transition disabled:opacity-50">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                          Agregar tal cual
                        </button>
                        <button onClick={() => {
                          setColaIA(prev => prev.filter((_, idx) => idx !== 0));
                          if (colaIA.length === 1) setModalColaIA(false);
                        }}
                          className={`px-3 py-2 rounded-lg text-xs font-bold border ${t.bgInput} ${t.border} ${t.textSecondary} hover:text-red-400 transition`}>
                          Omitir
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className={`px-6 py-3 border-t ${t.border} flex-shrink-0`}>
              <p className={`${t.textSecondary} text-xs text-center`}>
                Confirma o descarta cada producto. Los cambios se guardan automáticamente en Lista de Precios.
              </p>
            </div>
          </div>
        </div>
      )}

      <BottomNav moduloActivo="precios" onNavegar={onNavegar} />
    </div>
  );
}
