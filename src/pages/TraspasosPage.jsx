import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase/config";
import {
  collection, doc, onSnapshot, getDoc, getDocs,
  setDoc, addDoc, updateDoc, serverTimestamp, query, orderBy, where, limit
} from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import AppSidebar from "../components/AppSidebar";
import BottomNav from "../components/BottomNav";
import Navbar from "../components/Navbar";
import toast, { Toaster } from "react-hot-toast";

// ── Helpers ───────────────────────────────────────────────────────────────
function formatFecha(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function generarCorrelativo() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `TRP-${yy}${mm}${dd}-${rand}`;
}

// ── Vista impresión ───────────────────────────────────────────────────────
function VistaImpresion({ traspaso, onClose }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(traspaso.correlativo)}`;

  return (
    <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4">
      <div className="bg-white text-black w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-800 text-white">
          <span className="font-bold text-sm">Documento de Traspaso — {traspaso.correlativo}</span>
          <div className="flex gap-2">
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-lg text-xs font-bold transition">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>print</span>
              Imprimir
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Documento */}
        <div className="p-8 print:p-6" id="print-area">
          {/* Header */}
          <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-slate-200">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Traspaso Interno</h1>
              <p className="text-slate-500 text-sm mt-0.5">Rincon Belloto Informaciones</p>
            </div>
            <img src={qrUrl} alt="QR" className="w-20 h-20" />
          </div>

          {/* Datos del documento */}
          <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">N° Correlativo</p>
              <p className="font-black text-base mt-0.5">{traspaso.correlativo}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Origen → Destino</p>
              <p className="font-bold mt-0.5">{traspaso.origen} → {traspaso.destino}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Responsable</p>
              <p className="font-bold mt-0.5">{traspaso.responsable}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Fecha</p>
              <p className="font-bold mt-0.5">{formatFecha(traspaso.creadoEn)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 col-span-2">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Estado</p>
              <p className="font-bold mt-0.5 uppercase text-blue-600">{traspaso.estado}</p>
            </div>
          </div>

          {/* Tabla de productos */}
          <table className="w-full text-sm border-collapse mb-6">
            <thead>
              <tr className="bg-slate-800 text-white">
                {["#", "Código", "Producto", "Lote", "F. Elab.", "F. Venc.", "Cant."].map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {traspaso.items?.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-3 py-2 text-slate-500 text-[10px]">{i + 1}</td>
                  <td className="px-3 py-2 font-mono text-xs">{item.codigo}</td>
                  <td className="px-3 py-2 font-semibold">{item.nombre}</td>
                  <td className="px-3 py-2 text-xs">{item.lote || "—"}</td>
                  <td className="px-3 py-2 text-xs">{item.fechaElab || "—"}</td>
                  <td className="px-3 py-2 text-xs font-bold text-red-600">{item.fechaVenc || "—"}</td>
                  <td className="px-3 py-2 font-black">{item.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Firmas */}
          <div className="grid grid-cols-2 gap-8 mt-8 pt-4 border-t border-slate-200">
            {["Entrega", "Recibe"].map(r => (
              <div key={r} className="text-center">
                <div className="border-b border-slate-400 mb-2 h-12" />
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{r}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal completar datos de ítem ─────────────────────────────────────────
function ModalItem({ producto, onConfirm, onClose, t }) {
  const [form, setForm] = useState({
    cantidad: "1",
    lote: "",
    fechaElab: "",
    fechaVenc: "",
  });

  const handleSubmit = () => {
    if (!form.cantidad || parseInt(form.cantidad) < 1) return toast.error("Cantidad inválida");
    onConfirm({
      codigo: producto.codigo,
      nombre: producto.nombre,
      categoria: producto.categoria || "",
      cantidad: parseInt(form.cantidad),
      lote: form.lote.trim(),
      fechaElab: form.fechaElab,
      fechaVenc: form.fechaVenc,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-[60] flex items-center justify-center p-4">
      <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-sm shadow-2xl`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${t.border}`}>
          <div>
            <p className={`${t.text} font-bold`}>{producto.nombre}</p>
            <p className={`${t.textSecondary} text-xs font-mono`}>Código: {producto.codigo}</p>
          </div>
          <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-full ${t.hover} ${t.textSecondary}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
        <div className="p-5 space-y-3">
          {/* Cantidad */}
          <div>
            <label className={`${t.textSecondary} text-[10px] font-black uppercase tracking-wider block mb-1`}>Cantidad *</label>
            <input type="number" min="1" autoFocus value={form.cantidad}
              onChange={e => setForm(p => ({ ...p, cantidad: e.target.value }))}
              className={`w-full ${t.bgInput} border ${t.border} ${t.text} px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`} />
          </div>
          {/* Lote */}
          <div>
            <label className={`${t.textSecondary} text-[10px] font-black uppercase tracking-wider block mb-1`}>Lote</label>
            <input value={form.lote} onChange={e => setForm(p => ({ ...p, lote: e.target.value }))}
              placeholder="Ej: L2024-001"
              className={`w-full ${t.bgInput} border ${t.border} ${t.text} px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`} />
          </div>
          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`${t.textSecondary} text-[10px] font-black uppercase tracking-wider block mb-1`}>F. Elaboración</label>
              <input type="date" value={form.fechaElab}
                onChange={e => setForm(p => ({ ...p, fechaElab: e.target.value }))}
                className={`w-full ${t.bgInput} border ${t.border} ${t.text} px-3 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`} />
            </div>
            <div>
              <label className={`${t.textSecondary} text-[10px] font-black uppercase tracking-wider block mb-1`}>F. Vencimiento</label>
              <input type="date" value={form.fechaVenc}
                onChange={e => setForm(p => ({ ...p, fechaVenc: e.target.value }))}
                className={`w-full ${t.bgInput} border ${t.border} ${t.text} px-3 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`} />
            </div>
          </div>
        </div>
        <div className={`flex gap-3 px-5 pb-5 border-t ${t.border} pt-3`}>
          <button onClick={onClose} className={`flex-1 ${t.bgInput} ${t.text} font-semibold py-2.5 rounded-xl text-sm`}>Cancelar</button>
          <button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-sm transition">
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────
export default function TraspasosPage({ user, rol, onBack, onNavegar }) {
  const { t } = useTheme();
  const esAdmin = rol === "admin" || rol === "unico";
  const userId = user?.uid || "anon";
  const nombreUsuario = user?.displayName || user?.email || "Usuario";

  // ── Estados ─────────────────────────────────────────────────────────────
  const [codigoInput, setCodigoInput] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [items, setItems] = useState([]);           // lista actual del traspaso
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [secciones, setSecciones] = useState([]);
  const [modalItem, setModalItem] = useState(null);  // producto a completar
  const [modalProductoDesconocido, setModalProductoDesconocido] = useState(null);
  const [vistaImpresion, setVistaImpresion] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [tab, setTab] = useState("nuevo"); // "nuevo" | "historial"
  const [enviando, setEnviando] = useState(false);
  const [scanMode, setScanMode] = useState(false); // modo scanner por cámara
  const inputRef = useRef(null);

  // ── Cargar secciones ────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "secciones"), snap => {
      const data = snap.docs.map(d => d.data().nombre).sort();
      setSecciones(data);
    });
    return () => unsub();
  }, []);

  // ── Cargar lista persistida del usuario ─────────────────────────────────
  useEffect(() => {
    const ref = doc(db, "traspaso_activo", userId);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = snap.data();
        setItems(data.items || []);
        setOrigen(data.origen || "");
        setDestino(data.destino || "");
      }
    });
    return () => unsub();
  }, [userId]);

  // ── Guardar lista en Firestore al cambiar ────────────────────────────────
  const persistir = useCallback(async (newItems, newOrigen, newDestino) => {
    await setDoc(doc(db, "traspaso_activo", userId), {
      items: newItems,
      origen: newOrigen ?? origen,
      destino: newDestino ?? destino,
      updatedAt: serverTimestamp(),
      responsable: nombreUsuario,
    }, { merge: true });
  }, [userId, origen, destino, nombreUsuario]);

  // ── Cargar historial ─────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "historial") return;
    const q = query(collection(db, "traspasos"), orderBy("creadoEn", "desc"), limit(20));
    const unsub = onSnapshot(q, snap => {
      setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [tab]);

  // ── Buscar producto por código ────────────────────────────────────────────
  const buscarProducto = async (codigo) => {
    const cod = codigo.trim();
    if (!cod) return;
    setBuscando(true);
    try {
      // Buscar en colección merma por código
      const snap = await getDocs(query(collection(db, "merma"), where("codigo", "==", cod)));
      if (!snap.empty) {
        const prod = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setModalItem(prod);
      } else {
        // No existe → notificar a admins y mostrar modal de producto desconocido
        setModalProductoDesconocido(cod);
        await addDoc(collection(db, "notificaciones"), {
          tipo: "producto_desconocido",
          codigo: cod,
          reportadoPor: nombreUsuario,
          reportadoPorUid: userId,
          leido: false,
          creadoEn: serverTimestamp(),
          mensaje: `El código "${cod}" no existe en el sistema. Escaneado por ${nombreUsuario}.`,
        });
        toast(`Código "${cod}" no encontrado. Se notificó al administrador.`, { icon: "⚠️" });
      }
    } catch (err) {
      toast.error("Error al buscar: " + err.message);
    }
    setBuscando(false);
    setCodigoInput("");
  };

  // ── Agregar ítem a la lista ───────────────────────────────────────────────
  const agregarItem = async (itemData) => {
    const newItems = [...items, { ...itemData, agregadoEn: new Date().toISOString() }];
    setItems(newItems);
    await persistir(newItems, origen, destino);
    setModalItem(null);
    toast.success(`${itemData.nombre} agregado ✅`);
  };

  // ── Quitar ítem ───────────────────────────────────────────────────────────
  const quitarItem = async (idx) => {
    const newItems = items.filter((_, i) => i !== idx);
    setItems(newItems);
    await persistir(newItems, origen, destino);
  };

  // ── Actualizar origen/destino ─────────────────────────────────────────────
  const actualizarOrigen = (val) => { setOrigen(val); persistir(items, val, destino); };
  const actualizarDestino = (val) => { setDestino(val); persistir(items, val, origen); };

  // ── Enviar traspaso ───────────────────────────────────────────────────────
  const enviarTraspaso = async () => {
    if (items.length === 0) return toast.error("Agrega al menos un producto");
    if (!origen) return toast.error("Selecciona la sección de origen");
    if (!destino) return toast.error("Selecciona la sección de destino");
    if (origen === destino) return toast.error("Origen y destino no pueden ser iguales");

    setEnviando(true);
    try {
      const correlativo = generarCorrelativo();
      const traspasoData = {
        correlativo,
        origen,
        destino,
        responsable: nombreUsuario,
        responsableUid: userId,
        items,
        estado: "pendiente_impresion",
        creadoEn: serverTimestamp(),
      };

      // Guardar traspaso
      const ref = await addDoc(collection(db, "traspasos"), traspasoData);

      // Notificación a admins para imprimir
      await addDoc(collection(db, "notificaciones"), {
        tipo: "solicitud_impresion",
        traspasoId: ref.id,
        correlativo,
        origen,
        destino,
        responsable: nombreUsuario,
        leido: false,
        creadoEn: serverTimestamp(),
        mensaje: `${nombreUsuario} solicita impresión del traspaso ${correlativo} (${items.length} productos).`,
      });

      // Limpiar lista activa
      await setDoc(doc(db, "traspaso_activo", userId), { items: [], origen: "", destino: "", updatedAt: serverTimestamp() });
      setItems([]);
      setOrigen("");
      setDestino("");

      // Mostrar vista de impresión
      setVistaImpresion({ ...traspasoData, id: ref.id, creadoEn: new Date() });
      toast.success(`Traspaso ${correlativo} enviado ✅`);
    } catch (err) {
      toast.error("Error al enviar: " + err.message);
    }
    setEnviando(false);
  };

  // ── Limpiar lista ─────────────────────────────────────────────────────────
  const limpiarLista = async () => {
    if (!confirm("¿Limpiar la lista actual? Se perderán los productos sin enviar.")) return;
    setItems([]);
    setOrigen("");
    setDestino("");
    await setDoc(doc(db, "traspaso_activo", userId), { items: [], origen: "", destino: "", updatedAt: serverTimestamp() });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`${t.bg} flex h-screen overflow-hidden`}>
      <Toaster />
      <div className="hidden md:block flex-shrink-0">
        <AppSidebar user={user} rol={rol} moduloActivo="traspasos" onNavegar={onNavegar} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="hidden md:block flex-shrink-0"><Navbar user={user} rol={rol} onNavegar={onNavegar} /></div>

        {/* Header móvil */}
        <header className={`md:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 ${t.bgNav} border-b ${t.border}`}>
          <button onClick={onBack} className={`w-10 h-10 flex items-center justify-center rounded-full ${t.hover} ${t.text}`}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className={`${t.text} text-base font-bold flex-1`}>Traspasos</h2>
          {items.length > 0 && (
            <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded-full">{items.length}</span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* Encabezado desktop */}
            <div className="hidden md:flex items-center justify-between mb-6">
              <div>
                <button onClick={onBack} className={`flex items-center gap-1.5 ${t.textSecondary} hover:text-blue-400 text-xs mb-2 transition-colors`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>
                  Inicio
                </button>
                <h1 className={`${t.text} text-3xl font-extrabold tracking-tight`}>Traspasos</h1>
                <p className={`${t.textSecondary} text-sm mt-0.5`}>Escanea productos y genera documentos de traspaso entre secciones</p>
              </div>
            </div>

            {/* Tabs */}
            <div className={`flex gap-1 p-1 ${t.bgCard} border ${t.border} rounded-xl mb-6 w-fit`}>
              {[
                { id: "nuevo", label: "Nuevo traspaso", icon: "swap_horiz" },
                { id: "historial", label: "Historial", icon: "history" },
              ].map(tb => (
                <button key={tb.id} onClick={() => setTab(tb.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${
                    tab === tb.id ? "bg-blue-600 text-white shadow" : `${t.textSecondary} hover:${t.text}`
                  }`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15, fontVariationSettings: tab === tb.id ? "'FILL' 1" : "'FILL' 0" }}>{tb.icon}</span>
                  {tb.label}
                  {tb.id === "nuevo" && items.length > 0 && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === "nuevo" ? "bg-white/20" : "bg-blue-500/20 text-blue-400"}`}>{items.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ══ TAB NUEVO TRASPASO ══ */}
            {tab === "nuevo" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Columna izquierda — Scanner + configuración */}
                <div className="lg:col-span-1 space-y-4">

                  {/* Scanner */}
                  <div className={`${t.bgCard} border ${t.border} rounded-2xl p-5`}>
                    <h3 className={`${t.text} font-bold mb-3 flex items-center gap-2`}>
                      <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>barcode_scanner</span>
                      Escanear producto
                    </h3>
                    <div className="relative mb-3">
                      <input
                        ref={inputRef}
                        value={codigoInput}
                        onChange={e => setCodigoInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") buscarProducto(codigoInput); }}
                        placeholder="Código de barras o SAP..."
                        autoFocus
                        className={`w-full ${t.bgInput} border ${t.border} ${t.text} px-4 py-3 pr-12 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                      <button onClick={() => buscarProducto(codigoInput)} disabled={buscando}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-500 disabled:opacity-50">
                        {buscando
                          ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                          : <span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span>
                        }
                      </button>
                    </div>
                    <p className={`${t.textSecondary} text-[10px]`}>Escanea con pistola lectora o escribe el código y presiona Enter</p>
                  </div>

                  {/* Secciones */}
                  <div className={`${t.bgCard} border ${t.border} rounded-2xl p-5 space-y-3`}>
                    <h3 className={`${t.text} font-bold mb-1 flex items-center gap-2`}>
                      <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>route</span>
                      Secciones
                    </h3>
                    <div>
                      <label className={`${t.textSecondary} text-[10px] font-black uppercase tracking-wider block mb-1`}>Origen</label>
                      <select value={origen} onChange={e => actualizarOrigen(e.target.value)}
                        className={`w-full ${t.bgInput} border ${t.border} ${t.text} px-3 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`}>
                        <option value="">Selecciona origen</option>
                        {secciones.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 20 }}>arrow_downward</span>
                    </div>
                    <div>
                      <label className={`${t.textSecondary} text-[10px] font-black uppercase tracking-wider block mb-1`}>Destino</label>
                      <select value={destino} onChange={e => actualizarDestino(e.target.value)}
                        className={`w-full ${t.bgInput} border ${t.border} ${t.text} px-3 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`}>
                        <option value="">Selecciona destino</option>
                        {secciones.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="space-y-2">
                    <button onClick={enviarTraspaso} disabled={enviando || items.length === 0}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition shadow-lg ${
                        items.length > 0
                          ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                          : `${t.bgInput} ${t.textSecondary} opacity-50 cursor-not-allowed border ${t.border}`
                      }`}>
                      {enviando
                        ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Enviando...</>
                        : <><span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>send</span> Enviar y solicitar impresión</>
                      }
                    </button>
                    {items.length > 0 && (
                      <button onClick={limpiarLista}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 transition">
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete_sweep</span>
                        Limpiar lista
                      </button>
                    )}
                  </div>
                </div>

                {/* Columna derecha — Lista de productos */}
                <div className="lg:col-span-2">
                  <div className={`${t.bgCard} border ${t.border} rounded-2xl overflow-hidden`}>
                    <div className={`flex items-center justify-between px-5 py-3 border-b ${t.border} ${t.isDark ? "bg-white/5" : "bg-slate-50"}`}>
                      <h3 className={`${t.text} font-bold text-sm`}>
                        Lista de productos
                        {items.length > 0 && <span className="ml-2 bg-blue-500/20 text-blue-400 text-[10px] font-black px-2 py-0.5 rounded-full">{items.length}</span>}
                      </h3>
                      {origen && destino && (
                        <span className={`${t.textSecondary} text-xs`}>{origen} → {destino}</span>
                      )}
                    </div>

                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 40, fontVariationSettings: "'FILL' 1" }}>barcode_scanner</span>
                        <p className={`${t.text} font-bold`}>Sin productos aún</p>
                        <p className={`${t.textSecondary} text-sm`}>Escanea un código de barras para comenzar</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {/* Header tabla */}
                        <div className={`hidden md:grid grid-cols-12 gap-3 px-5 py-2 ${t.isDark ? "bg-white/[0.02]" : "bg-slate-50"}`}>
                          {["Código", "Producto", "Lote", "F. Elab", "F. Venc", "Cant.", ""].map((h, i) => (
                            <div key={i} className={`${t.textSecondary} text-[9px] font-black uppercase tracking-wider ${
                              i === 0 ? "col-span-2" : i === 1 ? "col-span-3" : i === 2 ? "col-span-2" : i === 3 ? "col-span-2" : i === 4 ? "col-span-1" : i === 5 ? "col-span-1" : "col-span-1"
                            }`}>{h}</div>
                          ))}
                        </div>
                        {items.map((item, idx) => (
                          <div key={idx} className={`flex md:grid md:grid-cols-12 gap-2 md:gap-3 px-5 py-3 items-center transition-colors ${t.isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50"}`}>
                            <div className="md:col-span-2">
                              <span className={`${t.textSecondary} text-[10px] font-mono`}>{item.codigo}</span>
                            </div>
                            <div className="md:col-span-3 flex-1 min-w-0">
                              <p className={`${t.text} text-sm font-semibold truncate`}>{item.nombre}</p>
                              <p className={`${t.textSecondary} text-[10px] md:hidden`}>{item.codigo} · {item.fechaVenc || "sin venc."}</p>
                            </div>
                            <div className="hidden md:block md:col-span-2">
                              <span className={`${t.textSecondary} text-xs`}>{item.lote || "—"}</span>
                            </div>
                            <div className="hidden md:block md:col-span-2">
                              <span className={`${t.textSecondary} text-xs`}>{item.fechaElab || "—"}</span>
                            </div>
                            <div className="hidden md:block md:col-span-1">
                              <span className={`${t.textSecondary} text-xs font-bold ${item.fechaVenc ? "text-red-400" : ""}`}>{item.fechaVenc || "—"}</span>
                            </div>
                            <div className="md:col-span-1">
                              <span className="text-blue-400 font-black text-sm">{item.cantidad}</span>
                            </div>
                            <div className="md:col-span-1 flex justify-end">
                              <button onClick={() => quitarItem(idx)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 transition">
                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══ TAB HISTORIAL ══ */}
            {tab === "historial" && (
              <div className={`${t.bgCard} border ${t.border} rounded-2xl overflow-hidden`}>
                <div className={`px-5 py-3 border-b ${t.border} ${t.isDark ? "bg-white/5" : "bg-slate-50"}`}>
                  <h3 className={`${t.text} font-bold text-sm`}>Últimos 20 traspasos</h3>
                </div>
                {historial.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2">
                    <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 36 }}>history</span>
                    <p className={`${t.textSecondary} text-sm`}>Sin traspasos registrados</p>
                  </div>
                ) : (
                  <div className={`divide-y ${t.border}`}>
                    {historial.map(tr => (
                      <div key={tr.id} className={`flex items-center gap-4 px-5 py-4 transition-colors ${t.isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50"}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-blue-400 font-black text-sm">{tr.correlativo}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              tr.estado === "pendiente_impresion" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                            }`}>{tr.estado?.replace("_", " ")}</span>
                          </div>
                          <p className={`${t.textSecondary} text-xs`}>
                            {tr.origen} → {tr.destino} · {tr.items?.length || 0} producto(s) · {tr.responsable}
                          </p>
                          <p className={`${t.textSecondary} text-[10px] mt-0.5`}>{formatFecha(tr.creadoEn)}</p>
                        </div>
                        <button onClick={() => setVistaImpresion(tr)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${t.bgInput} ${t.border} ${t.textSecondary} hover:text-blue-400`}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>print</span>
                          Imprimir
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal completar datos del producto */}
      {modalItem && (
        <ModalItem producto={modalItem} onConfirm={agregarItem} onClose={() => setModalItem(null)} t={t} />
      )}

      {/* Modal producto desconocido */}
      {modalProductoDesconocido && (
        <div className="fixed inset-0 bg-black/75 z-[60] flex items-center justify-center p-4">
          <div className={`${t.bgCard} border border-amber-500/30 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center`}>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-amber-400" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>warning</span>
            </div>
            <p className={`${t.text} font-bold mb-1`}>Código no encontrado</p>
            <p className={`${t.textSecondary} text-sm mb-2`}>
              El código <span className="font-mono font-bold text-amber-400">{modalProductoDesconocido}</span> no existe en el sistema.
            </p>
            <p className={`${t.textSecondary} text-xs mb-5`}>Se ha notificado al administrador para que lo agregue.</p>
            <button onClick={() => setModalProductoDesconocido(null)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-2.5 rounded-xl text-sm transition">
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Vista impresión */}
      {vistaImpresion && <VistaImpresion traspaso={vistaImpresion} onClose={() => setVistaImpresion(null)} />}

      <BottomNav moduloActivo="traspasos" onNavegar={onNavegar} />
    </div>
  );
}
