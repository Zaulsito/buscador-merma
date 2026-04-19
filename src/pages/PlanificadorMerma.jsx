import { useState, useEffect, useRef } from "react";
import BottomNav from "../components/BottomNav";
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
  const [modalLista, setModalLista] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [flotanteVisible, setFlotanteVisible] = useState(true);
  const chipsRef = useRef(null);
  const { t } = useTheme();

  const scrollChips = (dir) => {
    if (chipsRef.current) {
      chipsRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
    }
  };

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
      ean: p.ean || "",
      nombre: p.nombre,
      categoria: p.categoria || "—",
      cantidad: cantidades[p.id] || "—",
      unidad: p.unidadMedida || "—",
    })).sort((a, b) => a.nombre.localeCompare(b.nombre));
    setListaGenerada(lista);
    setModalLista(true);
  };

  const CODE39_ENCODING = {
    '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000', '4': '000110001',
    '5': '100110000', '6': '001110000', '7': '000100101', '8': '100100100', '9': '001100100',
    'A': '100001001', 'B': '001001001', 'C': '101001000', 'D': '000011001', 'E': '100011000',
    'F': '001011000', 'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
    'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011', 'O': '100010010',
    'P': '001010010', 'Q': '000000111', 'R': '100000110', 'S': '001000110', 'T': '000010110',
    'U': '110000001', 'V': '011000001', 'W': '111000000', 'X': '010010001', 'Y': '110010000',
    'Z': '011010000', '-': '010000101', '.': '110000100', ' ': '011000100', '*': '010010100',
    '$': '010101000', '/': '010100010', '+': '010001010', '%': '000101010'
  };

  const Barcode = ({ value, className = "", size = "xl" }) => {
    if (!value) return null;

    const fullValue = `*${String(value).toUpperCase()}*`;
    const bars = [];
    let currentX = 0;
    const narrow = 1.5;
    const wide = narrow * 2.5;
    const gap = narrow;

    for (let i = 0; i < fullValue.length; i++) {
      const char = fullValue[i];
      const pattern = CODE39_ENCODING[char];
      if (!pattern) continue;

      // Cada patrón tiene 9 barras (5 negras, 4 blancas)
      for (let j = 0; j < pattern.length; j++) {
        const isBlack = j % 2 === 0;
        const isWide = pattern[j] === '1';
        const width = isWide ? wide : narrow;

        if (isBlack) {
          bars.push({ x: currentX, w: width });
        }
        currentX += width;
      }
      currentX += gap; // Espacio entre caracteres
    }

    const sizes = {
      sm: { scale: 0.5, h: 30 },
      md: { scale: 0.8, h: 40 },
      lg: { scale: 1, h: 50 },
      xl: { scale: 1.4, h: 60 }
    };
    const config = sizes[size] || sizes.xl;

    return (
      <div className={`flex flex-col items-center p-3 bg-white rounded-xl shadow-inner ${className}`}>
        <svg 
          width={currentX * config.scale} 
          height={config.h} 
          viewBox={`0 0 ${currentX} 60`}
          preserveAspectRatio="none"
        >
          {bars.map((b, i) => (
            <rect key={i} x={b.x} y="0" width={b.w} height="60" fill="black" />
          ))}
        </svg>
        <span className="text-[10px] font-mono text-gray-900 font-bold mt-2 tracking-[0.2em]">{value}</span>
      </div>
    );
  };

  return (
    <div className={`${t.bg} flex h-screen overflow-hidden`}>
      <div className="hidden md:block flex-shrink-0">
        <AppSidebar user={user} rol={rol} moduloActivo="planificador" onNavegar={onNavegar} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="hidden md:block flex-shrink-0"><Navbar user={user} rol={rol} onNavegar={onNavegar} titulo="Planificador" /></div>

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
                  <span className="material-symbols-outlined text-blue-400">inventory_2</span>
                  Planificador de Merma
                </h2>
                <p className={`${t.textSecondary} text-sm mt-1`}>Selecciona productos y define cantidades para planificar tu merma.</p>
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

            {/* Chips categorías Premium */}
            <div className="flex items-center gap-2 mb-8">
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
                  onClick={() => setCatActiva("")}
                  className={`px-5 py-2 rounded-full text-xs font-black whitespace-nowrap border transition-all shrink-0 uppercase tracking-widest ${
                    catActiva === ""
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-transparent shadow-lg shadow-blue-500/25"
                      : `${t.bgInput} ${t.textSecondary} border-transparent hover:text-blue-400`
                  }`}
                >
                  TODAS
                </button>
                {categorias.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCatActiva(c)}
                    className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all shrink-0 uppercase tracking-widest ${
                      catActiva === c
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-transparent shadow-lg shadow-blue-500/25"
                        : `${t.bgInput} ${t.textSecondary} border-transparent hover:text-blue-400`
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <button
                onClick={() => scrollChips(1)}
                className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${t.bgInput} ${t.textSecondary} hover:text-blue-400 transition-colors border ${t.border}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
              </button>
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
                      <div className="min-w-0 flex-1">
                        <p className={`${t.text} font-semibold text-sm truncate`}>{p.nombre}</p>
                        <p className={`${t.textSecondary} text-[10px]`}>{p.categoria || "Sin categoría"}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {p.codigo && <p className="text-blue-400 font-mono text-[10px]">{p.codigo}</p>}
                          {p.ean && (
                            <span className="text-gray-500 font-mono text-[9px] px-1.5 py-0.5 bg-gray-600/20 rounded border border-gray-500/10">
                              {p.ean}
                            </span>
                          )}
                        </div>
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
                        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                          <div className="flex-1">
                            <input
                              type="number"
                              min="0"
                              value={cantidades[p.id] || ""}
                              onChange={(e) => setCantidad(p.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="0"
                              className={`w-full ${t.bgInput} ${t.text} px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500`}
                            />
                            <div className="flex items-center justify-between mt-1">
                              <span className={`${t.textSecondary} text-[10px] uppercase font-bold tracking-wider`}>Cantidad a pedir</span>
                              <span className={`${t.textSecondary} text-[10px]`}>{p.unidadMedida || "—"}</span>
                            </div>
                          </div>
                          {p.ean && (
                            <div className="flex items-center justify-center min-w-[120px]">
                              <Barcode value={p.ean} size="md" />
                            </div>
                          )}
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
                  Generar lista de merma
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
                        <p className={`${t.text} font-bold text-sm`}>Lista de Merma</p>
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
                      <div key={i} className={`flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 border-b ${t.border} last:border-0 ${t.hover} transition-colors gap-4`}>
                        <div className="min-w-0 flex-1">
                          <p className={`${t.text} text-sm font-bold truncate`}>{item.nombre}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.codigo !== "—" && <span className="text-blue-400 font-mono text-[10px]">SAP: {item.codigo}</span>}
                            {item.cantidad !== "—" && (
                              <span className="text-amber-500 font-black text-[10px] uppercase border border-amber-500/30 px-1.5 rounded bg-amber-500/5">
                                {item.cantidad} {item.unidad !== "—" ? item.unidad : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        {item.ean && (
                           <Barcode value={item.ean} size="xl" className="shrink-0" />
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
            onClick={() => { generarLista(); }}
            onMouseEnter={() => setFlotanteVisible(true)}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-2xl shadow-2xl shadow-blue-500/40 transition-all duration-300 ${flotanteVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>checklist</span>
            <span>Generar lista</span>
            <span className="bg-white/20 text-white text-xs font-black px-2 py-0.5 rounded-full">{seleccionados.length}</span>
          </button>
        )}
      </div>
    
      <BottomNav moduloActivo="planificador" onNavegar={onNavegar} />
    </div>
  );
}
