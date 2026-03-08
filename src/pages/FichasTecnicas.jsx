import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import Navbar from "../components/Navbar";
import FichaModal from "../components/FichaModal";
import FichaDetalle from "./FichaDetalle";
import { useTheme } from "../context/ThemeContext";
import { exportarFichaExcel } from "../utils/fichaExcel";

const SECCIONES = [
  "Snack y Desayuno",
  "Acompañamientos",
  "Carnes",
  "Cuarto Frío",
  "Postres",
  "Sizzling",
];

export default function FichasTecnicas({ user, rol, onBack }) {
  const [fichas, setFichas] = useState([]);
  const [seccionActiva, setSeccionActiva] = useState(SECCIONES[0]);
  const [showModal, setShowModal] = useState(false);
  const [fichaEditar, setFichaEditar] = useState(null);
  const [fichaDetalle, setFichaDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTheme();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "fichas"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFichas(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const fichasFiltradas = fichas.filter((f) => f.seccion === seccionActiva);

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
          className={`${t.textSecondary} text-sm mb-6 flex items-center gap-2 transition`}
        >
          ← Volver al inicio
        </button>

        <div className="flex items-center justify-between mb-6">
          <h2 className={`${t.text} text-2xl font-bold`}>📋 Fichas Técnicas</h2>
          {rol === "admin" && (
            <button
              onClick={() => { setFichaEditar(null); setShowModal(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl transition"
            >
              + Nueva ficha
            </button>
          )}
        </div>

        {/* Secciones */}
        <div className="flex gap-2 flex-wrap mb-8">
          {SECCIONES.map((s) => (
            <button
              key={s}
              onClick={() => setSeccionActiva(s)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                seccionActiva === s
                  ? "bg-teal-600 text-white"
                  : `${t.bgCard} ${t.text} ${t.hover}`
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <p className={`${t.textSecondary} text-center`}>Cargando fichas...</p>
        ) : fichasFiltradas.length === 0 ? (
          <p className={`${t.textSecondary} text-center`}>No hay fichas en esta sección</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fichasFiltradas.map((f) => (
              <div
                key={f.id}
                className={`${t.bgCard} rounded-2xl overflow-hidden shadow cursor-pointer`}
                onClick={() => setFichaDetalle(f)}
              >
                {f.foto && (
                  <img src={f.foto} alt={f.nombre} className="w-full h-40 object-cover" />
                )}
                {!f.foto && (
                  <div className={`w-full h-40 ${t.bgInput} flex items-center justify-center`}>
                    <span className="text-4xl">📋</span>
                  </div>
                )}
                <div className="p-4">
                  <span className="text-xs text-teal-400 font-semibold uppercase">{f.seccion}</span>
                  <h3 className={`${t.text} font-bold text-lg mt-1`}>{f.nombre}</h3>
                  <p className={`${t.textSecondary} text-sm mt-1`}>COD. SAP: {f.formatosVenta?.[0]?.codSap || "—"}</p>
                  {f.tiempoPreparacion && (
                    <p className={`${t.textSecondary} text-sm`}>⏱ {f.tiempoPreparacion}</p>
                  )}
                  {rol === "admin" && (
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
        )}
      </div>

      {showModal && (
        <FichaModal
          ficha={fichaEditar}
          seccionInicial={seccionActiva}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}