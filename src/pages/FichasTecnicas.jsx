import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import Navbar from "../components/Navbar";
import FichaModal from "../components/FichaModal";
import FichaDetalle from "./FichaDetalle";
import { useTheme } from "../context/ThemeContext";
import { exportarFichaExcel } from "../utils/fichaExcel";

const POR_PAGINA = 25;

export default function FichasTecnicas({ user, rol, onBack }) {
  const [fichas, setFichas] = useState([]);
  const [secciones, setSecciones] = useState(["Todas"]);
  const [seccionActiva, setSeccionActiva] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [subcategoriaFiltro, setSubcategoriaFiltro] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [fichaEditar, setFichaEditar] = useState(null);
  const [fichaDetalle, setFichaDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const { t } = useTheme();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "fichas"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFichas(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "secciones"), (snap) => {
      const data = snap.docs.map(d => d.data().nombre).sort();
      setSecciones(["Todas", ...data]);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setPagina(1);
  }, [seccionActiva, busqueda, subcategoriaFiltro]);

  const subcategorias = [...new Set(fichas.filter(f => f.subcategoria).map(f => f.subcategoria))].sort();

  const fichasFiltradas = fichas.filter((f) => {
    const matchSeccion = seccionActiva === "Todas" || f.seccion === seccionActiva;
    const matchBusqueda = f.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    const matchSubcat = !subcategoriaFiltro || f.subcategoria === subcategoriaFiltro;
    return matchSeccion && matchBusqueda && matchSubcat;
  });

  const totalPaginas = Math.ceil(fichasFiltradas.length / POR_PAGINA);
  const fichasPaginadas = fichasFiltradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const cambiarPagina = (nueva) => {
    setPagina(nueva);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEliminar = async (id) => {
    if (!confirm("¿Eliminar esta ficha técnica?")) return;
    await deleteDoc(doc(db, "fichas", id));
  };

  if (fichaDetalle) return (
    <FichaDetalle
      ficha={fichaDetalle}
      user={user}
      rol={rol}
      onBack={() => setFichaDetalle(null)}
      onEditar={() => { setFichaEditar(fichaDetalle); setFichaDetalle(null); setShowModal(true); }}
    />
  );

  return (
    <div className={`min-h-screen ${t.bg}`}>
      <Navbar user={user} />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-teal-600/20 hover:bg-teal-600/40 text-teal-300 text-sm font-semibold px-4 py-2 rounded-full transition border border-teal-500/30 mb-6"
        >
          ← Volver
        </button>

        <div className="flex items-center justify-between mb-6">
          <h2 className={`${t.text} text-2xl font-bold`}>📋 Fichas Técnicas</h2>
          {(rol === "admin" || rol === "unico") && (
            <button
              onClick={() => { setFichaEditar(null); setShowModal(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl transition"
            >
              + Nueva ficha
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-3 mb-6">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={`w-full ${t.bgCard} ${t.text} px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500`}
            placeholder="🔍 Buscar ficha por nombre..."
          />
          <div className="flex gap-3 flex-wrap">
            {subcategorias.length > 0 && (
              <select
                value={subcategoriaFiltro}
                onChange={(e) => setSubcategoriaFiltro(e.target.value)}
                className={`${t.bgCard} ${t.text} px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm`}
              >
                <option value="">Todas las subcategorías</option>
                {subcategorias.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            {(busqueda || subcategoriaFiltro) && (
              <button
                onClick={() => { setBusqueda(""); setSubcategoriaFiltro(""); }}
                className="text-red-400 text-sm hover:underline"
              >
                ✕ Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Secciones */}
        <div className="flex gap-2 flex-wrap mb-6">
          {secciones.map((s) => (
            <button
              key={s}
              onClick={() => setSeccionActiva(s)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                seccionActiva === s ? "bg-teal-600 text-white" : `${t.bgCard} ${t.text} ${t.hover}`
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <p className={`${t.textSecondary} text-center`}>Cargando fichas...</p>
        ) : fichasFiltradas.length === 0 ? (
          <p className={`${t.textSecondary} text-center`}>No se encontraron fichas</p>
        ) : (
          <>
            <p className={`${t.textSecondary} text-sm mb-4`}>
              {fichasFiltradas.length} ficha{fichasFiltradas.length !== 1 ? "s" : ""} encontrada{fichasFiltradas.length !== 1 ? "s" : ""} · Página {pagina} de {totalPaginas}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {fichasPaginadas.map((f) => (
                <div
                  key={f.id}
                  className={`${t.bgCard} rounded-2xl overflow-hidden shadow cursor-pointer`}
                  onClick={() => setFichaDetalle(f)}
                >
                  {f.foto ? (
                    <img src={f.foto} alt={f.nombre} className="w-full h-40 object-cover" />
                  ) : (
                    <div className={`w-full h-40 ${t.bgInput} flex items-center justify-center`}>
                      <span className="text-4xl">📋</span>
                    </div>
                  )}
                  <div className="p-4">
                    <span className="text-xs text-teal-400 font-semibold uppercase">
                      {f.seccion}{f.subcategoria ? ` › ${f.subcategoria}` : ""}
                    </span>
                    <h3 className={`${t.text} font-bold text-sm mt-1`}>{f.nombre}</h3>
                    <p className={`${t.textSecondary} text-xs mt-1`}>COD. SAP: {f.formatosVenta?.[0]?.codSap || "—"}</p>
                    {f.esAlergeno && (
                      <div className="mt-2 bg-red-500/20 border border-red-500/40 rounded-lg px-2 py-1 flex items-center gap-1">
                        <span className="text-red-400 text-xs font-bold">⚠️ CONTIENE ALÉRGENOS</span>
                      </div>
                    )}
                    {(rol === "admin" || rol === "unico") && (
                      <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => exportarFichaExcel(f)}
                          className={`flex-1 ${t.bgInput} ${t.hover} ${t.text} text-xs py-2 rounded-lg transition hidden`}
                        >
                          📥 Exportar
                        </button>
                        <button
                          onClick={() => { setFichaEditar(f); setShowModal(true); }}
                          className={`flex-1 ${t.bgInput} ${t.hover} ${t.text} text-xs py-2 rounded-lg transition`}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleEliminar(f.id)}
                          className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs py-2 rounded-lg transition"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button onClick={() => cambiarPagina(1)} disabled={pagina === 1} className={`${t.bgCard} ${t.hover} ${t.text} px-3 py-2 rounded-lg transition disabled:opacity-40 text-sm`}>«</button>
                <button onClick={() => cambiarPagina(pagina - 1)} disabled={pagina === 1} className={`${t.bgCard} ${t.hover} ${t.text} px-3 py-2 rounded-lg transition disabled:opacity-40 text-sm`}>‹</button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 2)
                  .map((n) => (
                    <button
                      key={n}
                      onClick={() => cambiarPagina(n)}
                      className={`px-4 py-2 rounded-lg transition text-sm font-semibold ${n === pagina ? "bg-teal-600 text-white" : `${t.bgCard} ${t.hover} ${t.text}`}`}
                    >{n}</button>
                  ))}
                <button onClick={() => cambiarPagina(pagina + 1)} disabled={pagina === totalPaginas} className={`${t.bgCard} ${t.hover} ${t.text} px-3 py-2 rounded-lg transition disabled:opacity-40 text-sm`}>›</button>
                <button onClick={() => cambiarPagina(totalPaginas)} disabled={pagina === totalPaginas} className={`${t.bgCard} ${t.hover} ${t.text} px-3 py-2 rounded-lg transition disabled:opacity-40 text-sm`}>»</button>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <FichaModal
          ficha={fichaEditar}
          seccionInicial={seccionActiva === "Todas" ? secciones[1] || "Snack y Desayuno" : seccionActiva}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
