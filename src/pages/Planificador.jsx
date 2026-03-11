import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot } from "firebase/firestore";
import Navbar from "../components/Navbar";
import { useTheme } from "../context/ThemeContext";

export default function Planificador({ user, rol, onBack }) {
  const [fichas, setFichas] = useState([]);
  const [secciones, setSecciones] = useState([]);
  const [seccionActiva, setSeccionActiva] = useState(null);
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [listaGenerada, setListaGenerada] = useState(null);
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

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "secciones"), (snap) => {
      const data = snap.docs.map(d => d.data().nombre).sort();
      setSecciones(data);
      if (!seccionActiva && data.length > 0) setSeccionActiva(data[0]);
    });
    return () => unsub();
  }, []);

  const fichasFiltradas = fichas.filter((f) => f.seccion === seccionActiva);

  const toggleSeleccion = (ficha) => {
    setListaGenerada(null);
    setSeleccionadas((prev) =>
      prev.find((f) => f.id === ficha.id)
        ? prev.filter((f) => f.id !== ficha.id)
        : [...prev, ficha]
    );
  };

  const estaSeleccionada = (id) => seleccionadas.some((f) => f.id === id);

  const generarLista = () => {
    const mapa = {};
    seleccionadas.forEach((ficha) => {
      (ficha.materiasPrimas || []).forEach((mp) => {
        if (!mp.nombre?.trim()) return;
        const key = mp.nombre.trim().toLowerCase();
        if (mapa[key]) {
          mapa[key].cantidad += parseFloat(mp.cantidadNeta) || 0;
        } else {
          mapa[key] = {
            nombre: mp.nombre.trim(),
            cantidad: parseFloat(mp.cantidadNeta) || 0,
            unidad: mp.unidad || "",
          };
        }
      });
    });
    setListaGenerada(Object.values(mapa).sort((a, b) => a.nombre.localeCompare(b.nombre)));
  };

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
          <div>
            <h2 className={`${t.text} text-2xl font-bold`}>📊 Planificador</h2>
            <p className={`${t.textSecondary} text-sm mt-1`}>Selecciona fichas para generar una lista de ingredientes</p>
          </div>
          {seleccionadas.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                {seleccionadas.length} ficha{seleccionadas.length !== 1 ? "s" : ""} seleccionada{seleccionadas.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => { setSeleccionadas([]); setListaGenerada(null); }}
                className="text-red-400 text-xs hover:underline"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>

        {/* Fichas seleccionadas */}
        {seleccionadas.length > 0 && (
          <div className={`${t.bgCard} rounded-2xl p-4 mb-6`}>
            <p className={`${t.textSecondary} text-xs mb-2`}>Fichas seleccionadas:</p>
            <div className="flex flex-wrap gap-2">
              {seleccionadas.map((f) => (
                <span
                  key={f.id}
                  className="bg-teal-600/20 border border-teal-600 text-teal-400 text-xs px-3 py-1 rounded-full flex items-center gap-2"
                >
                  {f.nombre}
                  <button onClick={() => toggleSeleccion(f)} className="hover:text-white">✕</button>
                </span>
              ))}
            </div>
          </div>
        )}

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

        {/* Lista de fichas */}
        {loading ? (
          <p className={`${t.textSecondary} text-center`}>Cargando fichas...</p>
        ) : fichasFiltradas.length === 0 ? (
          <p className={`${t.textSecondary} text-center`}>No hay fichas en esta sección</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {fichasFiltradas.map((f) => (
              <div
                key={f.id}
                onClick={() => toggleSeleccion(f)}
                className={`${t.bgCard} rounded-2xl overflow-hidden shadow cursor-pointer transition border-2 ${
                  estaSeleccionada(f.id) ? "border-teal-500" : "border-transparent"
                }`}
              >
                {f.foto ? (
                  <img src={f.foto} alt={f.nombre} className="w-full h-32 object-cover" />
                ) : (
                  <div className={`w-full h-32 ${t.bgInput} flex items-center justify-center`}>
                    <span className="text-3xl">📋</span>
                  </div>
                )}
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <p className={`${t.text} font-semibold text-sm`}>{f.nombre}</p>
                    <p className={`${t.textSecondary} text-xs`}>{f.seccion}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                    estaSeleccionada(f.id) ? "bg-teal-500 border-teal-500" : `border-gray-500`
                  }`}>
                    {estaSeleccionada(f.id) && <span className="text-white text-xs">✓</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botón generar */}
        {seleccionadas.length > 0 && (
          <div className="flex justify-center mb-8">
            <button
              onClick={generarLista}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-8 py-3 rounded-2xl transition"
            >
              ✅ Generar lista de ingredientes
            </button>
          </div>
        )}

        {/* Lista generada */}
        {listaGenerada && (
          <div className={`${t.bgCard} rounded-2xl p-6`}>
            <h3 className={`${t.text} font-bold text-lg mb-4`}>🧾 Lista de Ingredientes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`${t.textSecondary} text-xs border-b ${t.border}`}>
                    <th className="text-left pb-3">Ingrediente</th>
                    <th className="text-left pb-3">Cantidad Total</th>
                    <th className="text-left pb-3">Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {listaGenerada.map((ing, i) => (
                    <tr key={i} className={`border-b ${t.border}`}>
                      <td className={`${t.text} py-3 font-medium`}>{ing.nombre}</td>
                      <td className={`${t.text} py-3`}>{ing.cantidad > 0 ? ing.cantidad.toFixed(3) : "—"}</td>
                      <td className={`${t.textSecondary} py-3`}>{ing.unidad || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
