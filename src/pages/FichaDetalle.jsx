import { useTheme } from "../context/ThemeContext";
import Navbar from "../components/Navbar";
import { useState } from "react";

export default function FichaDetalle({ ficha, user, rol, onBack, onEditar }) {
  const { t } = useTheme();
  const [fotoAmpliada, setFotoAmpliada] = useState(null);

  const Seccion = ({ titulo, children }) => (
    <div className={`${t.bgCard} rounded-2xl p-5 mb-4`}>
      <h3 className={`${t.text} font-bold text-lg mb-4 border-b ${t.border} pb-2`}>{titulo}</h3>
      {children}
    </div>
  );

  const Campo = ({ label, valor }) =>
    valor ? (
      <div className="mb-2">
        <span className={`${t.textSecondary} text-xs`}>{label}</span>
        <p className={`${t.text} text-sm font-medium`}>{valor}</p>
      </div>
    ) : null;

  return (
    <div className={`min-h-screen ${t.bg}`}>
      <Navbar user={user} />
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className={`${t.textSecondary} text-sm flex items-center gap-2`}>
            ← Volver
          </button>
          {rol === "admin" || rol === "unico" && (
            <button
              onClick={onEditar}
              className={`${t.bgCard} ${t.hover} ${t.text} text-sm font-semibold px-4 py-2 rounded-xl transition`}
            >
              ✏️ Editar ficha
            </button>
          )}
        </div>

        {/* Foto principal */}
        {ficha.foto && (
          <div
            className="mb-6 rounded-2xl overflow-hidden h-64 cursor-zoom-in"
            onClick={() => setFotoAmpliada(ficha.foto)}
          >
            <img src={ficha.foto} alt={ficha.nombre} className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
          </div>
        )}

        {/* Título */}
        <div className="mb-6">
          <span className="text-teal-400 text-sm font-semibold uppercase">
            {ficha.seccion}{ficha.subcategoria ? ` › ${ficha.subcategoria}` : ""}
          </span>
          <h1 className={`${t.text} text-3xl font-bold mt-1`}>{ficha.nombre}</h1>
          <div className="flex gap-4 mt-2 flex-wrap">
            {ficha.codigo && <span className={`${t.textSecondary} text-sm`}>Código: {ficha.codigo}</span>}
            {ficha.porciones && <span className={`${t.textSecondary} text-sm`}>🍽 {ficha.porciones}</span>}
            {ficha.tiempoPreparacion && <span className={`${t.textSecondary} text-sm`}>⏱ {ficha.tiempoPreparacion}</span>}
          </div>
        </div>

        {/* Formatos de Venta */}
        {ficha.formatosVenta?.some(f => f.codSap) && (
          <Seccion titulo="🏷️ Formatos de Venta">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`${t.textSecondary} text-xs`}>
                    <th className="text-left pb-2">Cod. SAP</th>
                    <th className="text-left pb-2">Descripción</th>
                    <th className="text-left pb-2">N° Envase</th>
                    <th className="text-left pb-2">Peso (kg)</th>
                    <th className="text-left pb-2">Cod. Barra</th>
                  </tr>
                </thead>
                <tbody>
                  {ficha.formatosVenta.map((f, i) => (
                    <tr key={i} className={`border-t ${t.border}`}>
                      <td className={`${t.text} py-2`}>{f.codSap}</td>
                      <td className={`${t.text} py-2`}>{f.descripcion}</td>
                      <td className={`${t.text} py-2`}>{f.numEnvase}</td>
                      <td className={`${t.text} py-2`}>{f.pesoProducto}</td>
                      <td className={`${t.text} py-2`}>{f.codBarra}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Seccion>
        )}

        {/* Materia Prima */}
        {ficha.materiasPrimas?.some(m => m.nombre) && (
          <Seccion titulo="🥩 Materia Prima">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`${t.textSecondary} text-xs`}>
                    <th className="text-left pb-2">Ingrediente</th>
                    <th className="text-left pb-2">Cant. Bruta</th>
                    <th className="text-left pb-2">Cant. Neta</th>
                    <th className="text-left pb-2">Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {ficha.materiasPrimas.map((m, i) => (
                    <tr key={i} className={`border-t ${t.border}`}>
                      <td className={`${t.text} py-2`}>{m.nombre}</td>
                      <td className={`${t.text} py-2`}>{m.cantidadBruta}</td>
                      <td className={`${t.text} py-2`}>{m.cantidadNeta}</td>
                      <td className={`${t.text} py-2`}>{m.unidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Seccion>
        )}

        {/* Elementos Decorativos */}
        {ficha.elementosDecorativos?.some(e => e.nombre) && (
          <Seccion titulo="🎨 Elementos Decorativos">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`${t.textSecondary} text-xs`}>
                    <th className="text-left pb-2">Elemento</th>
                    <th className="text-left pb-2">Cant. Bruta</th>
                    <th className="text-left pb-2">Cant. Neta</th>
                  </tr>
                </thead>
                <tbody>
                  {ficha.elementosDecorativos.map((e, i) => (
                    <tr key={i} className={`border-t ${t.border}`}>
                      <td className={`${t.text} py-2`}>{e.nombre}</td>
                      <td className={`${t.text} py-2`}>{e.cantidadBruta}</td>
                      <td className={`${t.text} py-2`}>{e.cantidadNeta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Seccion>
        )}

        {/* Descripción del Proceso */}
        {ficha.descripcionProceso && (
          <Seccion titulo="📝 Descripción del Proceso">
            <p className={`${t.text} text-sm whitespace-pre-line leading-relaxed`}>{ficha.descripcionProceso}</p>
          </Seccion>
        )}

        {/* Datos de Proceso */}
        {(ficha.tempCoccion || ficha.tempEnfriado || ficha.tempAlmacenamiento) && (
          <Seccion titulo="🌡️ Datos de Proceso">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Campo label="Temp. Cocción" valor={ficha.tempCoccion && ficha.tempCoccion !== "NA" ? `${ficha.tempCoccion} °C` : ficha.tempCoccion} />
              <Campo label="Temp. Enfriado" valor={ficha.tempEnfriado && ficha.tempEnfriado !== "NA" ? `${ficha.tempEnfriado} °C` : ficha.tempEnfriado} />
              <Campo label="Temp. Almacenamiento" valor={ficha.tempAlmacenamiento && ficha.tempAlmacenamiento !== "NA" ? `${ficha.tempAlmacenamiento} °C` : ficha.tempAlmacenamiento} />
              <Campo label="Vida Útil Granel" valor={ficha.vidaUtilGrado} />
              <Campo label="Vida Útil Vacío" valor={ficha.vidaUtilVacio} />
              <Campo label="Vida Útil Anaquel" valor={ficha.vidaUtilAnaquel} />
            </div>
          </Seccion>
        )}

        {/* Envases */}
        {ficha.envases?.some(e => e.descripcion) && (
          <Seccion titulo="📦 Envases y Material de Embalaje">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`${t.textSecondary} text-xs`}>
                    <th className="text-left pb-2">Descripción</th>
                    <th className="text-left pb-2">Código SAP</th>
                    <th className="text-left pb-2">Cant. Batch/UN</th>
                    <th className="text-left pb-2">Peso Envase (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {ficha.envases.map((e, i) => (
                    <tr key={i} className={`border-t ${t.border}`}>
                      <td className={`${t.text} py-2`}>{e.descripcion}</td>
                      <td className={`${t.text} py-2`}>{e.codigoSap}</td>
                      <td className={`${t.text} py-2`}>{e.cantidad}</td>
                      <td className={`${t.text} py-2`}>{e.pesoEnvase}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Seccion>
        )}

        {/* Fotos del proceso */}
        {ficha.fotosExtra?.some(f => f) && (
          <Seccion titulo="📸 Fotos del Proceso">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ficha.fotosExtra.filter(f => f).map((url, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden h-40 cursor-zoom-in"
                  onClick={() => setFotoAmpliada(url)}
                >
                  <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                </div>
              ))}
            </div>
          </Seccion>
        )}

        {/* Foto ampliada */}
        {fotoAmpliada && (
          <div
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 cursor-zoom-out p-4"
            onClick={() => setFotoAmpliada(null)}
          >
            <img src={fotoAmpliada} alt="Foto ampliada" className="max-w-full max-h-full rounded-2xl object-contain" />
            <button
              onClick={() => setFotoAmpliada(null)}
              className="absolute top-4 right-4 text-white text-3xl font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Revisiones */}
        {ficha.revisiones?.some(r => r.numero) && (
          <Seccion titulo="🔄 Tabla de Revisiones">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`${t.textSecondary} text-xs`}>
                    <th className="text-left pb-2">N° Revisión</th>
                    <th className="text-left pb-2">Fecha</th>
                    <th className="text-left pb-2">Descripción del Cambio</th>
                  </tr>
                </thead>
                <tbody>
                  {ficha.revisiones.map((r, i) => (
                    <tr key={i} className={`border-t ${t.border}`}>
                      <td className={`${t.text} py-2`}>{r.numero}</td>
                      <td className={`${t.text} py-2`}>{r.fecha}</td>
                      <td className={`${t.text} py-2`}>{r.descripcion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Seccion>
        )}

      </div>
    </div>
  );
}