import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import AppSidebar from "../components/AppSidebar";
import Navbar from "../components/Navbar";
import toast, { Toaster } from "react-hot-toast";

const MODOS = ["Fresco y seco", "Refrigerado", "Congelado", "N/A"];

const MODO_BADGE = {
  "Refrigerado":  { cls: "bg-blue-500/10 text-blue-400 border-blue-500/20"     },
  "Fresco y seco":{ cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  "Congelado":    { cls: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"      },
  "N/A":          { cls: "bg-slate-500/10 text-slate-400 border-slate-500/20"   },
};

const FILA_VACIA = {
  insumo: "",
  cerrado_modo: "Fresco y seco",
  cerrado_retiro: "",
  cerrado_duracion: "",
  abierto_modo: "Refrigerado",
  abierto_duracion: "",
  modo_final: "Refrigerado",
};

export default function InformacionPage({ user, rol, onBack, onNavegar }) {
  const { t } = useTheme();
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroModo, setFiltroModo] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null); // null = nuevo
  const [form, setForm] = useState({ ...FILA_VACIA });
  const [saving, setSaving] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const POR_PAGINA = 15;

  const esAdmin = rol === "admin" || rol === "unico";

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "vida_util_insumos"), snap => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.insumo?.localeCompare(b.insumo));
      setInsumos(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtrados = insumos.filter(i => {
    const matchBusqueda = !busqueda || i.insumo?.toLowerCase().includes(busqueda.toLowerCase());
    const matchModo = filtroModo === "Todos" || i.modo_final === filtroModo;
    return matchBusqueda && matchModo;
  });

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  useEffect(() => { setPaginaActual(1); }, [busqueda, filtroModo]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ ...FILA_VACIA });
    setModalOpen(true);
  };

  const abrirEditar = (item) => {
    setEditando(item);
    setForm({ ...item });
    setModalOpen(true);
  };

  const guardar = async () => {
    if (!form.insumo.trim()) { toast.error("El nombre del insumo es obligatorio"); return; }
    setSaving(true);
    try {
      if (editando) {
        await updateDoc(doc(db, "vida_util_insumos", editando.id), { ...form });
        toast.success("Insumo actualizado ✅");
      } else {
        await addDoc(collection(db, "vida_util_insumos"), { ...form, fechaCreacion: serverTimestamp() });
        toast.success("Insumo agregado ✅");
      }
      setModalOpen(false);
    } catch { toast.error("Error al guardar"); }
    setSaving(false);
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este insumo?")) return;
    await deleteDoc(doc(db, "vida_util_insumos", id));
    toast.success("Eliminado ✅");
  };

  const upd = (campo, valor) => setForm(p => ({ ...p, [campo]: valor }));

  const inputCls = `w-full ${t.bgInput} border ${t.border} ${t.text} px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500`;
  const selectCls = `w-full ${t.bgInput} border ${t.border} ${t.text} px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500`;

  // Stats
  const totalRefrig  = insumos.filter(i => i.modo_final === "Refrigerado").length;
  const totalFresco  = insumos.filter(i => i.modo_final === "Fresco y seco").length;
  const totalCongelado = insumos.filter(i => i.modo_final === "Congelado").length;

  return (
    <div className={`${t.bg} flex h-screen overflow-hidden`}>
      <Toaster />
      <div className="hidden md:block flex-shrink-0">
        <AppSidebar user={user} rol={rol} moduloActivo="informacion" onNavegar={onNavegar} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="hidden md:block flex-shrink-0"><Navbar user={user} rol={rol} /></div>

        {/* Header móvil */}
        <header className={`md:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 ${t.bgNav} border-b ${t.border}`}>
          <button onClick={onBack} className={`w-10 h-10 flex items-center justify-center rounded-full ${t.hover} ${t.text}`}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className={`${t.text} text-base font-bold flex-1 truncate`}>Manual Vida Útil</h2>
          {esAdmin && (
            <button onClick={abrirNuevo} className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 md:px-8 py-6">

            {/* Título */}
            <div className="hidden md:flex items-start justify-between mb-6">
              <div>
                <button onClick={onBack} className={`flex items-center gap-1.5 ${t.textSecondary} hover:text-blue-400 text-xs mb-2 transition-colors`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>
                  Información Útil
                </button>
                <h1 className={`${t.text} text-3xl font-extrabold tracking-tight`}>Manual de Vida Útil de Insumos</h1>
                <p className={`${t.textSecondary} text-sm mt-1`}>Anexo I — Insumos y Semielaborados en Secciones Productivas</p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`text-right ${t.textSecondary} text-xs`}>
                  <p>Revisión: 027</p>
                  <p>Fecha: 22/07/2025</p>
                </div>
                {esAdmin && (
                  <button onClick={abrirNuevo}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition shadow-lg shadow-blue-500/20">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                    Agregar Insumo
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Total Insumos",         valor: insumos.length, color: "border-blue-500",    icon: "inventory_2"  },
                { label: "Requiere Refrigeración", valor: totalRefrig,    color: "border-amber-500",   icon: "kitchen"      },
                { label: "Fresco y Seco",           valor: totalFresco,    color: "border-emerald-500", icon: "eco"          },
                { label: "Congelado",              valor: totalCongelado,  color: "border-cyan-500",    icon: "ac_unit"      },
              ].map((s, i) => (
                <div key={i} className={`${t.bgCard} border-l-4 ${s.color} border border-l-[4px] ${t.border} rounded-xl p-4`}
                  style={{ borderLeftColor: s.color.replace("border-", "").replace("-500", "") }}>
                  <p className={`${t.textSecondary} text-[10px] font-bold uppercase tracking-widest mb-1`}>{s.label}</p>
                  <p className={`${t.text} text-2xl font-black`}>{loading ? "—" : s.valor}</p>
                </div>
              ))}
            </div>

            {/* Tabla container */}
            <div className={`${t.bgCard} border ${t.border} rounded-2xl overflow-hidden shadow-sm`}>

              {/* Header tabla */}
              <div className={`px-5 py-3 border-b ${t.border} flex flex-col md:flex-row md:items-center justify-between gap-3 ${t.isDark ? "bg-white/5" : "bg-slate-50"}`}>
                <h3 className="text-amber-400 font-black uppercase text-xs tracking-widest">
                  Registro de Control de Almacenamiento
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Buscador */}
                  <div className="relative">
                    <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 ${t.textSecondary}`} style={{ fontSize: 16 }}>search</span>
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                      className={`${t.bgInput} border ${t.border} ${t.text} pl-9 pr-4 py-1.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 w-56`}
                      placeholder="Buscar insumo..." />
                  </div>
                  {/* Filtro modo */}
                  {["Todos", "Refrigerado", "Fresco y seco", "Congelado"].map(m => (
                    <button key={m} onClick={() => setFiltroModo(m)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition font-medium ${
                        filtroModo === m
                          ? "bg-blue-600 text-white border-transparent"
                          : `${t.bgInput} border ${t.border} ${t.textSecondary} hover:text-blue-400`
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabla desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className={`${t.isDark ? "bg-slate-800/80" : "bg-slate-100"} text-xs font-black uppercase tracking-wider ${t.textSecondary}`}>
                      <th className={`p-4 border-b border-r ${t.border} min-w-[220px]`} rowSpan={2}>Insumos</th>
                      <th className={`p-3 border-b border-r ${t.border} text-center bg-indigo-500/10 text-indigo-400`} colSpan={3}>Cerrado</th>
                      <th className={`p-3 border-b border-r ${t.border} text-center bg-amber-500/10 text-amber-400`} colSpan={2}>Abierto</th>
                      <th className={`p-4 border-b ${t.border} text-center min-w-[130px]`} rowSpan={2}>Modo de<br/>Almacenamiento</th>
                      {esAdmin && <th className={`p-4 border-b border-l ${t.border} text-center w-20`} rowSpan={2}>Acciones</th>}
                    </tr>
                    <tr className={`${t.isDark ? "bg-slate-800/50" : "bg-slate-50"} text-[10px] font-bold uppercase ${t.textSecondary}`}>
                      <th className={`p-3 border-b border-r ${t.border}`}>Modo de Almacenamiento</th>
                      <th className={`p-3 border-b border-r ${t.border}`}>Retiro Antes del Vencimiento</th>
                      <th className={`p-3 border-b border-r ${t.border}`}>Duración</th>
                      <th className={`p-3 border-b border-r ${t.border}`}>Modo de Almacenamiento</th>
                      <th className={`p-3 border-b border-r ${t.border}`}>Duración</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${t.border}`}>
                    {loading ? (
                      <tr><td colSpan={esAdmin ? 8 : 7} className={`p-8 text-center ${t.textSecondary} text-sm`}>Cargando...</td></tr>
                    ) : paginados.length === 0 ? (
                      <tr><td colSpan={esAdmin ? 8 : 7} className={`p-8 text-center ${t.textSecondary} text-sm`}>Sin resultados</td></tr>
                    ) : paginados.map((item, idx) => {
                      const badge = MODO_BADGE[item.modo_final] || MODO_BADGE["N/A"];
                      return (
                        <tr key={item.id} className={`group transition-colors hover:bg-blue-500/5 ${idx % 2 === 1 ? (t.isDark ? "bg-white/[0.02]" : "bg-slate-50/50") : ""}`}>
                          <td className={`p-4 border-r ${t.border} font-medium ${t.text}`}>{item.insumo}</td>
                          <td className={`p-4 border-r ${t.border} ${t.textSecondary} text-xs`}>{item.cerrado_modo}</td>
                          <td className={`p-4 border-r ${t.border} ${t.textSecondary} text-xs`}>{item.cerrado_retiro || "N/A"}</td>
                          <td className={`p-4 border-r ${t.border} ${t.textSecondary} text-xs`}>{item.cerrado_duracion || "N/A"}</td>
                          <td className={`p-4 border-r ${t.border} ${t.textSecondary} text-xs`}>{item.abierto_modo}</td>
                          <td className={`p-4 border-r ${t.border} ${t.textSecondary} text-xs`}>{item.abierto_duracion || "N/A"}</td>
                          <td className={`p-4 text-center border-r ${t.border}`}>
                            <span className={`px-2 py-1 rounded text-xs font-semibold border ${badge.cls}`}>
                              {item.modo_final}
                            </span>
                          </td>
                          {esAdmin && (
                            <td className={`p-3 text-center border-l ${t.border}`}>
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => abrirEditar(item)}
                                  className={`w-7 h-7 flex items-center justify-center rounded-lg ${t.bgInput} ${t.textSecondary} hover:text-blue-400 transition`}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                                </button>
                                <button onClick={() => eliminar(item.id)}
                                  className={`w-7 h-7 flex items-center justify-center rounded-lg ${t.bgInput} ${t.textSecondary} hover:text-red-400 transition`}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cards móvil */}
              <div className="md:hidden divide-y" style={{ borderColor: "inherit" }}>
                {loading ? (
                  <p className={`${t.textSecondary} text-sm text-center p-8`}>Cargando...</p>
                ) : paginados.map(item => {
                  const badge = MODO_BADGE[item.modo_final] || MODO_BADGE["N/A"];
                  return (
                    <div key={item.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className={`${t.text} font-bold text-sm flex-1 pr-2`}>{item.insumo}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 ${badge.cls}`}>{item.modo_final}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <div>
                          <p className={`${t.textSecondary} font-bold uppercase text-[9px] tracking-wider`}>Cerrado — Modo</p>
                          <p className={t.text}>{item.cerrado_modo}</p>
                        </div>
                        <div>
                          <p className={`${t.textSecondary} font-bold uppercase text-[9px] tracking-wider`}>Cerrado — Duración</p>
                          <p className={t.text}>{item.cerrado_duracion || "N/A"}</p>
                        </div>
                        <div>
                          <p className={`${t.textSecondary} font-bold uppercase text-[9px] tracking-wider`}>Abierto — Modo</p>
                          <p className={t.text}>{item.abierto_modo}</p>
                        </div>
                        <div>
                          <p className={`${t.textSecondary} font-bold uppercase text-[9px] tracking-wider`}>Abierto — Duración</p>
                          <p className={t.text}>{item.abierto_duracion || "N/A"}</p>
                        </div>
                      </div>
                      {esAdmin && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => abrirEditar(item)}
                            className={`flex-1 flex items-center justify-center gap-1 ${t.bgInput} border ${t.border} ${t.textSecondary} text-xs py-2 rounded-lg hover:text-blue-400 transition`}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span> Editar
                          </button>
                          <button onClick={() => eliminar(item.id)}
                            className={`flex-1 flex items-center justify-center gap-1 ${t.bgInput} border ${t.border} ${t.textSecondary} text-xs py-2 rounded-lg hover:text-red-400 transition`}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer paginación */}
              <div className={`px-5 py-3 border-t ${t.border} flex flex-col md:flex-row items-center justify-between gap-3 ${t.isDark ? "bg-white/[0.02]" : "bg-slate-50/50"}`}>
                <div className="flex items-center gap-4 text-xs">
                  {[
                    { color: "bg-blue-400",    label: "Refrigerado"  },
                    { color: "bg-emerald-400", label: "Fresco y Seco" },
                    { color: "bg-cyan-400",    label: "Congelado"    },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${l.color}`} />
                      <span className={t.textSecondary}>{l.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}
                    className={`w-8 h-8 rounded border ${t.border} flex items-center justify-center ${t.textSecondary} hover:text-blue-400 transition disabled:opacity-30`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
                  </button>
                  <span className={`${t.textSecondary} text-xs px-2`}>Página {paginaActual} de {totalPaginas || 1}</span>
                  <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual >= totalPaginas}
                    className={`w-8 h-8 rounded border ${t.border} flex items-center justify-center ${t.textSecondary} hover:text-blue-400 transition disabled:opacity-30`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sello documento controlado */}
            <div className="fixed bottom-6 right-6 pointer-events-none opacity-30 rotate-[-12deg]">
              <div className="border-2 border-red-500 px-4 py-2 rounded-lg">
                <p className="text-red-500 font-black text-lg uppercase tracking-tighter text-center leading-tight">Documento<br/>Controlado</p>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* ── MODAL agregar/editar ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-lg shadow-2xl`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${t.border}`}>
              <h3 className={`${t.text} font-bold`}>{editando ? "Editar Insumo" : "Nuevo Insumo"}</h3>
              <button onClick={() => setModalOpen(false)} className={`w-8 h-8 flex items-center justify-center rounded-full ${t.hover} ${t.textSecondary}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Nombre */}
              <div>
                <label className={`${t.textSecondary} text-xs font-bold uppercase tracking-wider mb-1.5 block`}>Nombre del Insumo *</label>
                <input value={form.insumo} onChange={e => upd("insumo", e.target.value)}
                  className={inputCls} placeholder="Ej: Leche líquida larga vida" autoFocus />
              </div>

              {/* CERRADO */}
              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
                <p className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-3">Cerrado</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={`${t.textSecondary} text-[10px] font-bold mb-1 block`}>Modo Almacenamiento</label>
                    <select value={form.cerrado_modo} onChange={e => upd("cerrado_modo", e.target.value)} className={selectCls}>
                      {MODOS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`${t.textSecondary} text-[10px] font-bold mb-1 block`}>Retiro Antes Venc.</label>
                    <input value={form.cerrado_retiro} onChange={e => upd("cerrado_retiro", e.target.value)}
                      className={inputCls} placeholder="Ej: 10 días" />
                  </div>
                  <div>
                    <label className={`${t.textSecondary} text-[10px] font-bold mb-1 block`}>Duración</label>
                    <input value={form.cerrado_duracion} onChange={e => upd("cerrado_duracion", e.target.value)}
                      className={inputCls} placeholder="Ej: 2 días" />
                  </div>
                </div>
              </div>

              {/* ABIERTO */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <p className="text-amber-400 text-xs font-black uppercase tracking-widest mb-3">Abierto</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`${t.textSecondary} text-[10px] font-bold mb-1 block`}>Modo Almacenamiento</label>
                    <select value={form.abierto_modo} onChange={e => upd("abierto_modo", e.target.value)} className={selectCls}>
                      {MODOS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`${t.textSecondary} text-[10px] font-bold mb-1 block`}>Duración</label>
                    <input value={form.abierto_duracion} onChange={e => upd("abierto_duracion", e.target.value)}
                      className={inputCls} placeholder="Ej: 3 días" />
                  </div>
                </div>
              </div>

              {/* Modo final */}
              <div>
                <label className={`${t.textSecondary} text-xs font-bold uppercase tracking-wider mb-1.5 block`}>Modo de Almacenamiento Final</label>
                <select value={form.modo_final} onChange={e => upd("modo_final", e.target.value)} className={selectCls}>
                  {MODOS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className={`flex gap-3 px-5 pb-5`}>
              <button onClick={() => setModalOpen(false)}
                className={`flex-1 ${t.bgInput} ${t.text} font-semibold py-2.5 rounded-xl text-sm transition`}>
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-sm transition disabled:opacity-50">
                {saving ? "Guardando..." : editando ? "Actualizar" : "Agregar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
