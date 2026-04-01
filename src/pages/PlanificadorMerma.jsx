import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import BottomNav from "../components/BottomNav";
import AppSidebar from "../components/AppSidebar";
import Navbar from "../components/Navbar";

export default function PlanificadorMerma({ user, rol, onBack, onNavegar }) {
  const [products, setProducts] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [catActiva, setCatActiva] = useState("");
  const [seleccionados, setSeleccionados] = useState([]);
  const [cantidades, setCantidades] = useState({});
  const [listaGenerada, setListaGenerada] = useState(null);
  const [modalLista, setModalLista] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [flotanteVisible, setFlotanteVisible] = useState(true);
  const { t } = useTheme();

  // Ocultar botón flotante después de 3s de inactividad
  useEffect(() => {
    setFlotanteVisible(true);
    const timer = setTimeout(() => setFlotanteVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [seleccionados, busqueda, catActiva]);

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

  const filtered = products.filter(p => {
    const matchCat = catActiva === "" || p.categoria === catActiva;
    const matchBusqueda = !busqueda || 
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(busqueda.toLowerCase());
    return matchCat && matchBusqueda;
  });

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
    setModalLista(true);
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

            {/* Buscador */}
            <div className="relative mb-5">
              <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 ${t.textSecondary}`} style={{ fontSize: 18 }}>search</span>
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o código SAP..."
                className={`w-full ${t.bgCard} border ${t.border} ${t.text} pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {busqueda && (
                <button onClick={() => setBusqueda("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textSecondary} hover:text-white transition`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              )}
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

            {/* Modal lista generada */}
            {modalLista && listaGenerada && (
              <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => setModalLista(false)}>
                <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]`} onClick={e => e.stopPropagation()}>
                  {/* Header */}
                  <div className={`flex items-center justify-between px-5 py-4 border-b ${t.border} flex-shrink-0`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 20 }}>checklist</span>
                      </div>
                      <div>
                        <p className={`${t.text} font-bold text-sm`}>Lista de Pedido</p>
                        <p className={`${t.textSecondary} text-xs`}>{listaGenerada.length} productos seleccionados</p>
                      </div>
                    </div>
                    <button onClick={() => setModalLista(false)} className={`w-8 h-8 flex items-center justify-center rounded-full ${t.hover} ${t.textSecondary}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                    </button>
                  </div>
                  {/* Lista */}
                  <div className="flex-1 overflow-y-auto">
                    {listaGenerada.map((item, i) => (
                      <div key={i} className={`flex items-center justify-between px-5 py-3 border-b ${t.border} last:border-0 ${t.hover} transition-colors`}>
                        <div className="min-w-0">
                          <p className={`${t.text} text-sm font-medium truncate`}>{item.nombre}</p>
                          {item.codigo !== "—" && <p className="text-blue-400 font-mono text-xs">{item.codigo}</p>}
                        </div>
                        {item.cantidad !== "—" && (
                          <span className="bg-blue-500/15 text-blue-400 text-xs font-black px-2.5 py-1 rounded-full border border-blue-500/20 flex-shrink-0 ml-3">
                            {item.cantidad} {item.unidad !== "—" ? item.unidad : ""}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Footer */}
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
        {seleccionados.length > 0 && (
          <button
            onClick={() => { generarLista(); document.querySelector("main")?.scrollTo({ top: 99999, behavior: "smooth" }); }}
            onMouseEnter={() => setFlotanteVisible(true)}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-2xl shadow-2xl shadow-blue-500/40 transition-all duration-300 ${flotanteVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>checklist</span>
            <span>Generar lista</span>
            <span className="bg-white/20 text-white text-xs font-black px-2 py-0.5 rounded-full">{seleccionados.length}</span>
          </button>
        )}
      </div>
      <BottomNav moduloActivo="merma" onNavegar={onNavegar} />
    </div>
  );
}
