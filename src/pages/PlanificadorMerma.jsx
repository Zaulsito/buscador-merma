import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import AppSidebar from "../components/AppSidebar";
import Navbar from "../components/Navbar";

export default function PlanificadorMerma({ user, rol, onBack, onNavegar }) {
  const [products, setProducts] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [catActiva, setCatActiva] = useState("");
  const [seleccionados, setSeleccionados] = useState([]);
  const [cantidades, setCantidades] = useState({});
  const [listaGenerada, setListaGenerada] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTheme();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "merma"), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categorias"), (snap) => {
      const data = snap.docs.map(d => d.data().nombre).sort();
      setCategorias(data);
    });
    return () => unsub();
  }, []);

  const filtered = products.filter(p => catActiva === "" || p.categoria === catActiva);

  const toggleSeleccion = (producto) => {
    setListaGenerada(null);
    setSeleccionados((prev) =>
      prev.find((p) => p.id === producto.id)
        ? prev.filter((p) => p.id !== producto.id)
        : [...prev, producto]
    );
  };

  const estaSeleccionado = (id) => seleccionados.some((p) => p.id === id);

  const setCantidad = (id, valor) => {
    setCantidades((prev) => ({ ...prev, [id]: valor }));
  };

  const generarLista = () => {
    const lista = seleccionados.map((p) => ({
      codigo: p.codigo || "—",
      nombre: p.nombre,
      categoria: p.categoria || "—",
      cantidad: cantidades[p.id] || "—",
      unidad: p.unidadMedida || "—",
    }));
    setListaGenerada(lista);
  };

  return (
    <div className={`${t.bg} flex h-screen overflow-hidden`}>
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
          <h2 className={`${t.text} text-base font-bold`}>Planificador de Merma</h2>
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
                  <span className="material-symbols-outlined text-blue-400">search</span>
                  Planificador de Merma
                </h2>
                <p className={`${t.textSecondary} text-sm mt-1`}>Selecciona productos y define cantidades para planificar tu pedido.</p>
              </div>
              {seleccionados.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {seleccionados.length} producto{seleccionados.length !== 1 ? "s" : ""}
                  </span>
                  <button onClick={() => { setSeleccionados([]); setCantidades({}); setListaGenerada(null); }} className="text-red-400 text-xs hover:underline">
                    Limpiar
                  </button>
                </div>
              )}
            </div>

            {/* Chips categorías */}
            <div className="flex gap-2 flex-wrap mb-6">
              <button
                onClick={() => setCatActiva("")}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  catActiva === "" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25" : `${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-blue-400`
                }`}
              >
                Todas
              </button>
              {categorias.map((c) => (
                <button
                  key={c}
                  onClick={() => setCatActiva(c)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    catActiva === c ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25" : `${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-blue-400`
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Grid productos */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <p className={`${t.textSecondary} text-sm`}>Cargando productos...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <p className={`${t.textSecondary} text-sm`}>No hay productos en esta categoría</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {filtered.map((p) => (
                  <div
                    key={p.id}
                    className={`${t.bgCard} rounded-2xl border-2 transition-all shadow-sm ${
                      estaSeleccionado(p.id) ? "border-blue-500 shadow-blue-500/20" : `${t.border} hover:border-blue-400/50`
                    }`}
                  >
                    {/* Card header clickeable */}
                    <div className="p-4 flex items-center justify-between gap-2 cursor-pointer" onClick={() => toggleSeleccion(p)}>
                      <div className="min-w-0">
                        <p className={`${t.text} font-semibold text-sm truncate`}>{p.nombre}</p>
                        <p className={`${t.textSecondary} text-xs`}>{p.categoria || "Sin categoría"}</p>
                        {p.codigo && <p className="text-blue-400 font-mono text-xs mt-0.5">{p.codigo}</p>}
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
                        estaSeleccionado(p.id) ? "bg-blue-500 border-blue-500" : "border-gray-500"
                      }`}>
                        {estaSeleccionado(p.id) && <span className="material-symbols-outlined text-white" style={{ fontSize: 14 }}>check</span>}
                      </div>
                    </div>

                    {/* Input cantidad si está seleccionado */}
                    {estaSeleccionado(p.id) && (
                      <div className={`px-4 pb-4 border-t ${t.border} pt-3`}>
                        <label className={`${t.textSecondary} text-xs mb-1 block`}>Cantidad a pedir</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={cantidades[p.id] || ""}
                            onChange={(e) => setCantidad(p.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="0"
                            className={`flex-1 ${t.bgInput} ${t.text} px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500`}
                          />
                          <span className={`${t.textSecondary} text-xs`}>{p.unidadMedida || "—"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Botón generar */}
            {seleccionados.length > 0 && (
              <div className="flex justify-center mb-8">
                <button
                  onClick={generarLista}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition shadow-lg shadow-blue-500/25"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>checklist</span>
                  Generar lista de pedido
                </button>
              </div>
            )}

            {/* Lista generada */}
            {listaGenerada && (
              <div className={`${t.bgCard} border ${t.border} rounded-2xl overflow-hidden shadow-sm`}>
                <div className={`px-6 py-4 border-b ${t.border} flex items-center justify-between`}>
                  <h3 className={`${t.text} font-bold text-lg flex items-center gap-2`}>
                    <span className="material-symbols-outlined text-blue-400">receipt_long</span>
                    Lista de Pedido
                  </h3>
                  <span className={`${t.textSecondary} text-xs`}>{listaGenerada.length} productos</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={`${t.isDark ? "bg-white/5" : "bg-slate-50"} border-b ${t.border}`}>
                      <tr>
                        <th className={`text-left px-6 py-3 text-xs font-bold uppercase tracking-wider ${t.textSecondary}`}>Código</th>
                        <th className={`text-left px-6 py-3 text-xs font-bold uppercase tracking-wider ${t.textSecondary}`}>Producto</th>
                        <th className={`text-left px-6 py-3 text-xs font-bold uppercase tracking-wider ${t.textSecondary}`}>Categoría</th>
                        <th className={`text-left px-6 py-3 text-xs font-bold uppercase tracking-wider ${t.textSecondary}`}>Cantidad</th>
                        <th className={`text-left px-6 py-3 text-xs font-bold uppercase tracking-wider ${t.textSecondary}`}>Unidad</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${t.border}`}>
                      {listaGenerada.map((item, i) => (
                        <tr key={i} className={`${t.hover} transition-colors`}>
                          <td className="px-6 py-3 font-mono text-xs text-blue-400">{item.codigo}</td>
                          <td className={`${t.text} px-6 py-3 font-medium`}>{item.nombre}</td>
                          <td className={`${t.textSecondary} px-6 py-3`}>{item.categoria}</td>
                          <td className="px-6 py-3 text-blue-400 font-bold">{item.cantidad}</td>
                          <td className={`${t.textSecondary} px-6 py-3`}>{item.unidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
