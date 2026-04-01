import { useState, useEffect, useRef } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, doc, setDoc, getDoc } from "firebase/firestore";
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

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DIAS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// ── Helpers de fecha ──
function getLunes(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function toKey(date) {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}
function formatFecha(date) {
  return `${date.getDate()} ${MESES[date.getMonth()].slice(0, 3).toUpperCase()}`;
}
function getPrimerDiaMes(year, month) {
  return new Date(year, month, 1);
}
function getDiasEnMes(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

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
  const inputRef = useRef(null);

  // ── Cargar fichas técnicas para el selector ──
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "fichas"), snap => {
      setFichas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

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
      keys = Array.from({ length: dias }, (_, i) => toKey(new Date(year, month, i + 1)));
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
      await setDoc(ref, { ...prev, [catId]: lineas, fecha: key });
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

  // ── Render celda ──
  const renderCelda = (key, catId, compact = false) => {
    const platos = datos[key]?.[catId] || [];
    return (
      <div
        onClick={() => abrirEditar(key, catId)}
        className={`cursor-pointer min-h-[56px] rounded-lg p-2 transition-all group hover:bg-blue-500/10 hover:border-blue-500/30 border ${
          platos.length > 0 ? `border-transparent ${t.isDark ? "bg-white/3" : "bg-slate-50"}` : `border-dashed ${t.border} opacity-50 hover:opacity-100`
        }`}
      >
        {platos.length > 0 ? (
          <ul className="space-y-0.5">
            {platos.map((p, i) => (
              <li key={i} className={`${t.text} text-xs leading-snug`}>
                {compact ? p : `• ${p}`}
              </li>
            ))}
          </ul>
        ) : (
          <p className={`${t.textSecondary} text-xs italic flex items-center gap-1`}>
            <span className="material-symbols-outlined opacity-40" style={{ fontSize: 14 }}>add</span>
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
  const hoy = toKey(new Date());

  return (
    <div className={`${t.bg} flex h-screen overflow-hidden`}>
      <Toaster />
      <div className="hidden md:block flex-shrink-0">
        <AppSidebar user={user} rol={rol} moduloActivo="planificador" onNavegar={onNavegar} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="hidden md:block flex-shrink-0"><Navbar user={user} rol={rol} /></div>

        {/* Header móvil */}
        <header className={`md:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 ${t.bgNav} border-b ${t.border}`}>
          <button onClick={onBack} className={`w-10 h-10 flex items-center justify-center rounded-full ${t.hover} ${t.text}`}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className={`${t.text} text-base font-bold`}>Planograma</h2>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 md:px-8 py-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <button onClick={onBack} className={`hidden md:flex items-center gap-1.5 ${t.textSecondary} hover:text-blue-400 text-xs mb-2 transition-colors`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>
                  Planificador
                </button>
                <h1 className={`${t.text} text-2xl md:text-3xl font-extrabold tracking-tight`}>Planograma Semanal</h1>
                <p className={`${t.textSecondary} text-sm mt-0.5 flex items-center gap-1.5`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_today</span>
                  {getTitulo()}
                </p>
              </div>

              {/* Controles */}
              <div className="flex items-center gap-3">
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
                  <button onClick={() => setFechaBase(new Date())}
                    className={`px-3 h-9 rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary} text-xs font-bold hover:text-blue-400 transition`}>
                    Hoy
                  </button>
                  <button onClick={() => navegar(1)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-blue-400 transition`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
                  </button>
                </div>
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
                      {CATEGORIAS.map((cat, ci) => (
                        <tr key={cat.id} className={`${ci % 2 === 0 ? "" : t.isDark ? "bg-white/[0.02]" : "bg-slate-50/50"}`}>
                          <td className={`px-4 py-2 border-r ${t.border}`}>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>{cat.icon}</span>
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
                {CATEGORIAS.map(cat => {
                  const key = toKey(fechaBase);
                  const platos = datos[key]?.[cat.id] || [];
                  return (
                    <div key={cat.id} className={`${t.bgCard} border ${t.border} rounded-2xl overflow-hidden`}>
                      <div className={`px-5 py-3 border-b ${t.border} flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>{cat.icon}</span>
                          <h3 className={`${t.text} font-bold text-sm`}>{cat.label}</h3>
                        </div>
                        <button onClick={() => abrirEditar(key, cat.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                        </button>
                      </div>
                      <div className="p-4">
                        {platos.length > 0 ? (
                          <ul className="space-y-1.5">
                            {platos.map((p, i) => (
                              <li key={i} className={`flex items-center gap-2 ${t.text} text-sm`}>
                                <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                                {p}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <button onClick={() => abrirEditar(key, cat.id)}
                            className={`w-full py-4 border border-dashed ${t.border} rounded-xl ${t.textSecondary} text-xs hover:border-blue-500/50 hover:text-blue-400 transition flex items-center justify-center gap-1.5`}>
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
                        const key = toKey(new Date(year, month, dia));
                        const esHoy = key === hoy;
                        const totalPlatos = CATEGORIAS.reduce((acc, cat) => acc + (datos[key]?.[cat.id]?.length || 0), 0);
                        return (
                          <div key={di} className={`min-h-[100px] border-r ${t.border} last:border-0 p-2 cursor-pointer hover:bg-blue-500/5 transition-colors ${esHoy ? "bg-blue-500/8" : ""}`}
                            onClick={() => { setFechaBase(new Date(year, month, dia)); setVista("diaria"); }}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${esHoy ? "bg-blue-600 text-white" : t.text}`}>{dia}</span>
                              {totalPlatos > 0 && (
                                <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full">{totalPlatos}</span>
                              )}
                            </div>
                            <div className="space-y-0.5">
                              {CATEGORIAS.slice(0, 3).map(cat => {
                                const platos = datos[key]?.[cat.id] || [];
                                if (!platos[0]) return null;
                                return (
                                  <div key={cat.id} className={`text-[9px] ${t.textSecondary} truncate`}>
                                    <span className="text-blue-400 font-bold">{cat.label.slice(0, 3)}.</span> {platos[0]}
                                  </div>
                                );
                              })}
                              {totalPlatos > 3 && <p className="text-[9px] text-blue-400 font-bold">+{totalPlatos - 3} más</p>}
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
      {modalOpen && editando && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-lg shadow-2xl`}>
            {/* Header modal */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${t.border}`}>
              <div>
                <h3 className={`${t.text} font-bold`}>
                  {CATEGORIAS.find(c => c.id === editando.catId)?.label}
                </h3>
                <p className={`${t.textSecondary} text-xs mt-0.5`}>
                  {editando.key} — un plato por línea
                </p>
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
      )}
      <BottomNav moduloActivo="planograma" onNavegar={onNavegar} />
    </div>
  );
}
