import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import BottomNav from "../components/BottomNav";
import AppSidebar from "../components/AppSidebar";
import Navbar from "../components/Navbar";

export default function PlanificadorFichas({ user, rol, onBack, onNavegar }) {
  const [fichas, setFichas] = useState([]);
  const [secciones, setSecciones] = useState([]);
  const [seccionActiva, setSeccionActiva] = useState("todas");
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [porciones, setPorciones] = useState({}); // { id: número de veces }
  const [listaGenerada, setListaGenerada] = useState(null);
  const [modalLista, setModalLista] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 25;
  const [flotanteVisible, setFlotanteVisible] = useState(true);
  const { t } = useTheme();

  useEffect(() => {
    setFlotanteVisible(true);
    const timer = setTimeout(() => setFlotanteVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [seleccionadas, busqueda, seccionActiva]);

  // Resetear página al cambiar filtros
  useEffect(() => { setPagina(1); }, [busqueda, seccionActiva]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "fichas"), (snap) => {
      setFichas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "secciones"), (snap) => {
      const data = snap.docs.map(d => d.data().nombre).sort();
      setSecciones(data);
      // No sobreescribir si ya hay selección
    });
    return () => unsub();
  }, []);

  const fichasFiltradas = fichas.filter((f) => {
    const matchSec = seccionActiva === "todas" || f.seccion === seccionActiva;
    const matchBusqueda = !busqueda ||
      f.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      f.codigo?.toLowerCase().includes(busqueda.toLowerCase());
    return matchSec && matchBusqueda;
  });

  const totalPaginas = Math.ceil(fichasFiltradas.length / POR_PAGINA);
  const fichasPaginadas = fichasFiltradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const toggleSeleccion = (ficha) => {
    setListaGenerada(null);
    const yaEsta = seleccionadas.some((f) => f.id === ficha.id);
    if (yaEsta) {
      setSeleccionadas(prev => prev.filter((f) => f.id !== ficha.id));
      setPorciones(prev => { const n = { ...prev }; delete n[ficha.id]; return n; });
    } else {
      setSeleccionadas(prev => [...prev, ficha]);
      setPorciones(prev => ({ ...prev, [ficha.id]: 1 }));
    }
  };

  const setPorcion = (id, valor) => {
    const n = parseInt(valor) || 1;
    setPorciones(prev => ({ ...prev, [id]: Math.max(1, n) }));
  };

  const estaSeleccionada = (id) => seleccionadas.some((f) => f.id === id);

  const generarLista = () => {
    const mapa = {};
    seleccionadas.forEach((ficha) => {
      const mult = porciones[ficha.id] || 1;
      (ficha.materiasPrimas || []).forEach((mp) => {
        if (!mp.nombre?.trim()) return;
        const key = mp.nombre.trim().toUpperCase();
        const cantNeta = parseFloat(mp.cantidadNeta) || 0;
        const unidad = mp.unidad || "";
        if (mapa[key]) {
          mapa[key].total += cantNeta * mult;
        } else {
          mapa[key] = { nombre: key, total: cantNeta * mult, unidad };
        }
      });
    });
    const lista = Object.values(mapa)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    setListaGenerada(lista);
    setModalLista(true);
  };

  return (
    <div className={`${t.bg} flex h-screen overflow-hidden`}>
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
            titulo="Planificador de Fichas" 
          />
        </div>

        {/* Header móvil */}
        <header className={`md:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 ${t.bgNav} border-b ${t.border}`}>
          <button onClick={onBack} className={`w-10 h-10 flex items-center justify-center rounded-full ${t.hover} ${t.text}`}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className={`${t.text} text-base font-bold`}>Planificador de Fichas</h2>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 md:px-8 py-8">

            {/* Header desktop */}
            <div className="hidden md:flex items-center gap-3 mb-8">
              <button onClick={onBack} className={`flex items-center gap-2 ${t.textSecondary} hover:text-blue-400 text-sm font-medium transition-colors group`}>
                <span className="material-symbols-outlined group-hover:-translate-x-0.5 transition-transform" style={{ fontSize: 18 }}>arrow_back</span>
                Planificador
              </button>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className={`${t.text} text-2xl font-bold flex items-center gap-2`}>
                  <span className="material-symbols-outlined text-blue-400">description</span>
                  Planificador de Fichas
                </h2>
                <p className={`${t.textSecondary} text-sm mt-1`}>Selecciona fichas para generar una lista de ingredientes consolidada.</p>
              </div>
              {seleccionadas.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {seleccionadas.length} ficha{seleccionadas.length !== 1 ? "s" : ""}
                  </span>
                  <button onClick={() => { setSeleccionadas([]); setListaGenerada(null); }} className="text-red-400 text-xs hover:underline">
                    Limpiar
                  </button>
                </div>
              )}
            </div>

            {/* Fichas seleccionadas */}
            {seleccionadas.length > 0 && (
              <div className={`${t.bgCard} border ${t.border} rounded-2xl p-4 mb-6`}>
                <p className={`${t.textSecondary} text-xs mb-2`}>Fichas seleccionadas:</p>
                <div className="flex flex-wrap gap-2">
                  {seleccionadas.map((f) => (
                    <span key={f.id} className="bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs px-3 py-1 rounded-full flex items-center gap-2">
                      {f.nombre}
                      <button onClick={() => toggleSeleccion(f)} className="hover:text-white">✕</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Chips secciones */}
            <div className="flex gap-2 flex-wrap mb-6">
              <button
                onClick={() => setSeccionActiva("todas")}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  seccionActiva === "todas"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                    : `${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-blue-400`
                }`}
              >
                <span className="flex items-center gap-1.5">
                  Todos
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${seccionActiva === "todas" ? "bg-white/20 text-white" : `${t.bgInput} ${t.textSecondary}`}`}>
                    {fichas.length}
                  </span>
                </span>
              </button>
              {secciones.map((s) => {
                const count = fichas.filter(f => f.seccion === s).length;
                return (
                  <button
                    key={s}
                    onClick={() => setSeccionActiva(s)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition flex items-center gap-1.5 ${
                      seccionActiva === s
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                        : `${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-blue-400`
                    }`}
                  >
                    {s}
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${seccionActiva === s ? "bg-white/20 text-white" : `${t.bgInput} ${t.textSecondary}`}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Grid fichas */}
            {/* Buscador */}
            <div className="relative mb-5">
              <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 ${t.textSecondary}`} style={{ fontSize: 18 }}>search</span>
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar ficha por nombre o código..."
                className={`w-full ${t.bgCard} border ${t.border} ${t.text} pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {busqueda && (
                <button onClick={() => setBusqueda("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textSecondary} hover:text-white transition`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <p className={`${t.textSecondary} text-sm`}>Cargando fichas...</p>
              </div>
            ) : fichasFiltradas.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <p className={`${t.textSecondary} text-sm`}>No hay fichas en esta sección</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {fichasPaginadas.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => toggleSeleccion(f)}
                    className={`${t.bgCard} rounded-2xl overflow-hidden cursor-pointer transition-all border-2 shadow-sm hover:shadow-md ${
                      estaSeleccionada(f.id) ? "border-blue-500 shadow-blue-500/20" : `${t.border} hover:border-blue-400/50`
                    }`}
                  >
                    {f.foto ? (
                      <img src={f.foto} alt={f.nombre} className="w-full h-32 object-cover" />
                    ) : (
                      <div className={`w-full h-32 bg-gradient-to-br ${t.cardImage} flex items-center justify-center`}>
                        <span className="material-symbols-outlined text-4xl opacity-20">description</span>
                      </div>
                    )}
                    <div className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`${t.text} font-semibold text-sm truncate`}>{f.nombre}</p>
                        <p className={`${t.textSecondary} text-xs`}>{f.seccion}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
                        estaSeleccionada(f.id) ? "bg-blue-500 border-blue-500" : "border-gray-500"
                      }`}>
                        {estaSeleccionada(f.id) && <span className="material-symbols-outlined text-white" style={{ fontSize: 14 }}>check</span>}
                      </div>
                    </div>
                    {estaSeleccionada(f.id) && (
                      <div className={`px-3 pb-3 border-t ${t.border} pt-2`} onClick={e => e.stopPropagation()}>
                        <label className={`${t.textSecondary} text-[10px] font-bold uppercase tracking-wider mb-1 block`}>Cantidad de veces</label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPorcion(f.id, (porciones[f.id] || 1) - 1)}
                            className={`w-7 h-7 rounded-lg ${t.bgInput} border ${t.border} ${t.textSecondary} hover:text-white flex items-center justify-center transition flex-shrink-0`}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>remove</span>
                          </button>
                          <input
                            type="number" min="1"
                            value={porciones[f.id] || 1}
                            onChange={e => setPorcion(f.id, e.target.value)}
                            className={`flex-1 ${t.bgInput} border ${t.border} ${t.text} px-2 py-1 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-blue-500`}
                          />
                          <button
                            onClick={() => setPorcion(f.id, (porciones[f.id] || 1) + 1)}
                            className={`w-7 h-7 rounded-lg ${t.bgInput} border ${t.border} ${t.textSecondary} hover:text-white flex items-center justify-center transition flex-shrink-0`}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-2 mb-6">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl border transition ${pagina === 1 ? `${t.border} ${t.textSecondary} opacity-30` : `${t.bgCard} ${t.border} ${t.textSecondary} hover:text-blue-400`}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
                </button>

                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPaginas || Math.abs(p - pagina) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) => p === "..." ? (
                    <span key={`ellipsis-${i}`} className={`${t.textSecondary} text-xs px-1`}>···</span>
                  ) : (
                    <button key={`page-${p}`} onClick={() => setPagina(p)}
                      className={`w-9 h-9 rounded-xl text-sm font-bold border transition ${pagina === p ? "bg-blue-600 border-blue-600 text-white" : `${t.bgCard} ${t.border} ${t.textSecondary} hover:text-blue-400`}`}>
                      {p}
                    </button>
                  ))
                }

                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl border transition ${pagina === totalPaginas ? `${t.border} ${t.textSecondary} opacity-30` : `${t.bgCard} ${t.border} ${t.textSecondary} hover:text-blue-400`}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
                </button>

                <span className={`${t.textSecondary} text-xs ml-2`}>
                  {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, fichasFiltradas.length)} de {fichasFiltradas.length}
                </span>
              </div>
            )}

            {/* Botón generar */}
            {seleccionadas.length > 0 && (
              <div className="flex justify-center mb-8">
                <button
                  onClick={generarLista}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition shadow-lg shadow-blue-500/25"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>checklist</span>
                  Generar lista de ingredientes
                </button>
              </div>
            )}

            {/* Modal lista generada */}
            {modalLista && listaGenerada && (
              <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => setModalLista(false)}>
                <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]`} onClick={e => e.stopPropagation()}>
                  <div className={`flex items-center justify-between px-5 py-4 border-b ${t.border} flex-shrink-0`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 20 }}>receipt_long</span>
                      </div>
                      <div>
                        <p className={`${t.text} font-bold text-sm`}>Lista de Pedido</p>
                        <p className={`${t.textSecondary} text-xs`}>{listaGenerada.length} ingredientes · {seleccionadas.map(f => porciones[f.id] || 1).reduce((a,b)=>a+b,0)} porciones</p>
                      </div>
                    </div>
                    <button onClick={() => setModalLista(false)} className={`w-8 h-8 flex items-center justify-center rounded-full ${t.hover} ${t.textSecondary}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {listaGenerada.map((item, i) => (
                      <div key={i} className={`flex items-center justify-between px-5 py-3 border-b ${t.border} last:border-0 ${t.hover} transition-colors`}>
                        <span className={`${t.text} text-sm font-medium`}>{item.nombre}</span>
                        <span className="bg-blue-500/15 text-blue-400 text-xs font-black px-2.5 py-1 rounded-full border border-blue-500/20 flex-shrink-0 ml-3">
                          {item.total % 1 === 0 ? item.total : item.total.toFixed(3)} {item.unidad || ""}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className={`px-5 py-3 border-t ${t.border} flex-shrink-0`}>
                    <button onClick={() => setModalLista(false)} className={`w-full ${t.bgInput} ${t.text} font-semibold py-2.5 rounded-xl text-sm transition`}>
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Botón flotante generar lista */}
        {seleccionadas.length > 0 && (
          <button
            onClick={() => generarLista()}
            onMouseEnter={() => setFlotanteVisible(true)}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-2xl shadow-2xl shadow-blue-500/40 transition-all duration-300 ${flotanteVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>checklist</span>
            <span>Generar lista</span>
            <span className="bg-white/20 text-white text-xs font-black px-2 py-0.5 rounded-full">{seleccionadas.length}</span>
          </button>
        )}
      </div>
      <BottomNav moduloActivo="planificador" onNavegar={onNavegar} />
    </div>
  );
}
