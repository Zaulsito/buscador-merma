import { useTheme } from "../context/ThemeContext";
import Navbar from "../components/Navbar";
import AppSidebar from "../components/AppSidebar";
import { useState, useEffect, useRef } from "react";

// Sección con acento azul lateral
function Seccion({ titulo, icon, children, t }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-7 w-1 bg-blue-500 rounded-full flex-shrink-0" />
        <h3 className={`${t.text} text-lg font-bold flex items-center gap-2`}>
          {icon && (
            <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 20 }}>
              {icon}
            </span>
          )}
          {titulo}
        </h3>
      </div>
      {children}
    </section>
  );
}

// Tabla genérica temática
function TablaDetalle({ headers, rows, t }) {
  return (
    <div className={`${t.bgCard} border ${t.border} rounded-xl overflow-hidden shadow-sm`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className={`${t.isDark ? "bg-white/5" : "bg-slate-50"} border-b ${t.border}`}>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider ${t.textSecondary}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${t.border}`}>
            {rows}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FichaDetalle({ ficha, user, rol, onBack, onEditar, onNavegar, fichasLista = [], fichaIdx = 0, onCambiarFicha }) {
  const { t } = useTheme();
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const touchStartX = useRef(null);
  const contenedorRef = useRef(null);

  const hasPrev = fichasLista.length > 1 && fichaIdx > 0;
  const hasNext = fichasLista.length > 1 && fichaIdx < fichasLista.length - 1;

  const irAnterior = () => { if (hasPrev) onCambiarFicha?.(fichaIdx - 1); };
  const irSiguiente = () => { if (hasNext) onCambiarFicha?.(fichaIdx + 1); };

  // Swipe horizontal
  useEffect(() => {
    const el = contenedorRef.current;
    if (!el || !fichasLista.length) return;
    const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
    const onTouchEnd = (e) => {
      if (touchStartX.current === null) return;
      const delta = touchStartX.current - e.changedTouches[0].clientX;
      if (delta > 60) irSiguiente();
      else if (delta < -60) irAnterior();
      touchStartX.current = null;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => { el.removeEventListener("touchstart", onTouchStart); el.removeEventListener("touchend", onTouchEnd); };
  }, [fichaIdx, fichasLista]);

  // Teclas ← → en desktop
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowLeft") irAnterior();
      if (e.key === "ArrowRight") irSiguiente();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fichaIdx, fichasLista]);

  const estadoBadge =
    ficha.estado === "inactiva"
      ? { label: "Inactiva",  cls: "bg-red-500/20 text-red-400 border border-red-500/30",             dot: "bg-red-400"     }
      : ficha.estado === "pendiente"
      ? { label: "Pendiente", cls: "bg-amber-500/20 text-amber-400 border border-amber-500/30",       dot: "bg-amber-400"   }
      : { label: "Activa",    cls: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30", dot: "bg-emerald-400" };

  // Contenido principal (compartido entre móvil y desktop)
  const Contenido = () => (
    <>
      {/* Hero image */}
      <div className="relative w-full h-72 md:h-96 overflow-hidden flex-shrink-0">
        {ficha.foto ? (
          <>
            <img
              src={ficha.foto}
              alt={ficha.nombre}
              className="w-full h-full object-cover cursor-zoom-in"
              onClick={() => setFotoAmpliada(ficha.foto)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${t.cardImage || "from-slate-800 to-slate-900"} flex items-center justify-center`}>
            <span className="text-7xl opacity-20">📋</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 w-full p-6">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider">
              {ficha.seccion}{ficha.subcategoria ? ` › ${ficha.subcategoria}` : ""}
            </span>
            <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1.5 ${estadoBadge.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${estadoBadge.dot}`} />
              {estadoBadge.label}
            </span>
            {ficha.esAlergeno && (
              <span className="px-3 py-1 bg-red-500/30 text-red-300 border border-red-500/40 text-[10px] font-black rounded-full uppercase tracking-wider">
                ⚠ Alérgeno
              </span>
            )}
          </div>
          <h1 className="text-white text-2xl md:text-3xl font-extrabold leading-tight mb-1 drop-shadow-lg">
            {ficha.nombre}
          </h1>
          <p className="text-slate-300 text-sm font-medium">
            {ficha.formatosVenta?.[0]?.codSap && (
              <>SAP: <span className="text-blue-400 font-bold">{ficha.formatosVenta[0].codSap}</span></>
            )}
            {ficha.codigo && <> · Código: <span className="text-blue-400">{ficha.codigo}</span></>}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto w-full px-4 md:px-8 py-8">

        {/* Botones desktop */}
        <div className="hidden md:flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className={`flex items-center gap-2 ${t.textSecondary} hover:text-blue-400 text-sm font-medium transition-colors group`}
            >
              <span className="material-symbols-outlined group-hover:-translate-x-0.5 transition-transform" style={{ fontSize: 18 }}>
                arrow_back
              </span>
              Volver a Fichas
            </button>
            {fichasLista.length > 1 && (
              <span className={`${t.textSecondary} text-xs`}>
                {fichaIdx + 1} de {fichasLista.length} · <kbd className="font-mono px-1 py-0.5 rounded bg-white/5 text-[10px]">←</kbd><kbd className="font-mono px-1 py-0.5 rounded bg-white/5 text-[10px]">→</kbd>
              </span>
            )}
          </div>
          {(rol === "admin" || rol === "unico") && (
            <button
              onClick={onEditar}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-lg shadow-blue-500/20"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
              Editar Ficha
            </button>
          )}
        </div>

        {/* Stats rápidos */}
        {(ficha.porciones || ficha.tiempoPreparacion || ficha.tempCoccion || ficha.vidaUtilGrado) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {ficha.porciones && (
              <div className={`${t.bgCard} border ${t.border} p-4 rounded-xl shadow-sm`}>
                <p className={`${t.textSecondary} text-xs mb-1`}>Porciones</p>
                <p className={`${t.text} text-lg font-black`}>{ficha.porciones}</p>
              </div>
            )}
            {ficha.tiempoPreparacion && (
              <div className={`${t.bgCard} border ${t.border} p-4 rounded-xl shadow-sm`}>
                <p className={`${t.textSecondary} text-xs mb-1`}>Tiempo Prep</p>
                <p className={`${t.text} text-lg font-black`}>{ficha.tiempoPreparacion}</p>
              </div>
            )}
            {ficha.tempCoccion && ficha.tempCoccion !== "NA" && (
              <div className={`${t.bgCard} border ${t.border} p-4 rounded-xl shadow-sm`}>
                <p className={`${t.textSecondary} text-xs mb-1`}>Temp. Cocción</p>
                <p className="text-orange-400 text-lg font-black">{ficha.tempCoccion}°C</p>
              </div>
            )}
            {ficha.vidaUtilGrado && (
              <div className={`${t.bgCard} border ${t.border} p-4 rounded-xl shadow-sm`}>
                <p className={`${t.textSecondary} text-xs mb-1`}>Vida Útil</p>
                <p className="text-emerald-400 text-lg font-black">{ficha.vidaUtilGrado}</p>
              </div>
            )}
          </div>
        )}

        {/* Alérgeno */}
        {ficha.esAlergeno && ficha.descripcionAlergeno && (
          <div className="mb-8 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-red-400 mt-0.5" style={{ fontSize: 20 }}>warning</span>
            <div>
              <p className="text-red-400 font-bold text-sm uppercase tracking-wide">Contiene Alérgenos</p>
              <p className="text-red-300 text-sm mt-0.5">{ficha.descripcionAlergeno}</p>
            </div>
          </div>
        )}

        {/* Formatos de Venta */}
        {ficha.formatosVenta?.some(f => f.codSap) && (
          <Seccion titulo="Formatos de Venta" icon="sell" t={t}>
            <TablaDetalle
              t={t}
              headers={["Cod. SAP", "Descripción", "N° Envase", "Peso (kg)", "Cod. Barra"]}
              rows={ficha.formatosVenta.map((f, i) => (
                <tr key={i} className={`${t.hover} transition-colors`}>
                  <td className="px-4 py-3 font-mono text-xs text-blue-400">{f.codSap}</td>
                  <td className={`px-4 py-3 font-medium ${t.text}`}>{f.descripcion}</td>
                  <td className={`px-4 py-3 ${t.textSecondary}`}>{f.numEnvase}</td>
                  <td className={`px-4 py-3 ${t.textSecondary}`}>{f.pesoProducto}</td>
                  <td className={`px-4 py-3 font-mono text-xs ${t.textSecondary}`}>{f.codBarra}</td>
                </tr>
              ))}
            />
          </Seccion>
        )}

        {/* Materia Prima */}
        {ficha.materiasPrimas?.some(m => m.nombre) && (
          <Seccion titulo="Materia Prima / Ingredientes" icon="shopping_basket" t={t}>
            <TablaDetalle
              t={t}
              headers={["Ingrediente", "Cant. Bruta", "Cant. Neta", "Unidad"]}
              rows={ficha.materiasPrimas.map((mp, i) =>
                !mp.unidad || mp.unidad === "" ? (
                  <tr key={i}>
                    <td colSpan={4} className="px-4 py-2 bg-blue-500/10 text-blue-400 font-bold text-xs uppercase tracking-wider">
                      {mp.nombre}
                    </td>
                  </tr>
                ) : (
                  <tr key={i} className={`${t.hover} transition-colors`}>
                    <td className={`px-4 py-3 font-medium ${t.text}`}>{mp.nombre}</td>
                    <td className={`px-4 py-3 ${t.textSecondary}`}>{mp.cantidadBruta}</td>
                    <td className="px-4 py-3 text-blue-400 font-bold">{mp.cantidadNeta}</td>
                    <td className={`px-4 py-3 ${t.textSecondary}`}>{mp.unidad}</td>
                  </tr>
                )
              )}
            />
          </Seccion>
        )}

        {/* Elementos Decorativos */}
        {ficha.elementosDecorativos?.some(e => e.nombre) && (
          <Seccion titulo="Elementos Decorativos" icon="palette" t={t}>
            <TablaDetalle
              t={t}
              headers={["Elemento", "Cant. Bruta", "Cant. Neta"]}
              rows={ficha.elementosDecorativos.map((e, i) => (
                <tr key={i} className={`${t.hover} transition-colors`}>
                  <td className={`px-4 py-3 font-medium ${t.text}`}>{e.nombre}</td>
                  <td className={`px-4 py-3 ${t.textSecondary}`}>{e.cantidadBruta}</td>
                  <td className="px-4 py-3 text-blue-400 font-bold">{e.cantidadNeta}</td>
                </tr>
              ))}
            />
          </Seccion>
        )}

        {/* Proceso + Datos de Control */}
        {(ficha.descripcionProceso || ficha.tempCoccion || ficha.tempEnfriado || ficha.tempAlmacenamiento) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {ficha.descripcionProceso && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-7 w-1 bg-blue-500 rounded-full" />
                  <h3 className={`${t.text} text-lg font-bold flex items-center gap-2`}>
                    <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 20 }}>restaurant</span>
                    Descripción del Proceso
                  </h3>
                </div>
                <div
                  className={`${t.text} text-sm leading-relaxed prose ${t.isDark ? "prose-invert" : ""} max-w-none`}
                  style={{ "--tw-prose-bullets": "currentColor" }}
                  dangerouslySetInnerHTML={{ __html: ficha.descripcionProceso }}
                />
                <style>{`
                  .prose ol { list-style-type: decimal !important; padding-left: 1.5rem !important; margin: 0.5rem 0 !important; }
                  .prose ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin: 0.5rem 0 !important; }
                  .prose li { display: list-item !important; margin: 0.15rem 0 !important; }
                `}</style>
              </section>
            )}
            {(ficha.tempCoccion || ficha.tempEnfriado || ficha.tempAlmacenamiento || ficha.vidaUtilVacio || ficha.vidaUtilAnaquel) && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-7 w-1 bg-blue-500 rounded-full" />
                  <h3 className={`${t.text} text-lg font-bold flex items-center gap-2`}>
                    <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 20 }}>thermostat</span>
                    Datos de Control
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {ficha.tempCoccion && ficha.tempCoccion !== "NA" && (
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                      <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>thermostat</span>
                        <span className="text-[10px] font-bold uppercase">Temp. Cocción</span>
                      </div>
                      <span className={`text-xl font-black ${t.text}`}>{ficha.tempCoccion}°C</span>
                    </div>
                  )}
                  {ficha.tempEnfriado && ficha.tempEnfriado !== "NA" && (
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                      <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>ac_unit</span>
                        <span className="text-[10px] font-bold uppercase">Temp. Enfriado</span>
                      </div>
                      <span className={`text-xl font-black ${t.text}`}>{ficha.tempEnfriado}°C</span>
                    </div>
                  )}
                  {ficha.tempAlmacenamiento && ficha.tempAlmacenamiento !== "NA" && (
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                      <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warehouse</span>
                        <span className="text-[10px] font-bold uppercase">Almacenamiento</span>
                      </div>
                      <span className={`text-xl font-black ${t.text}`}>{ficha.tempAlmacenamiento}°C</span>
                    </div>
                  )}
                  {ficha.vidaUtilGrado && (
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                      <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
                        <span className="text-[10px] font-bold uppercase">Vida Útil Granel</span>
                      </div>
                      <span className={`text-xl font-black ${t.text}`}>{ficha.vidaUtilGrado}</span>
                    </div>
                  )}
                  {ficha.vidaUtilVacio && (
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                      <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>timer</span>
                        <span className="text-[10px] font-bold uppercase">Vida Útil Vacío</span>
                      </div>
                      <span className={`text-xl font-black ${t.text}`}>{ficha.vidaUtilVacio}</span>
                    </div>
                  )}
                  {ficha.vidaUtilAnaquel && (
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                      <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>inventory</span>
                        <span className="text-[10px] font-bold uppercase">Vida Útil Anaquel</span>
                      </div>
                      <span className={`text-xl font-black ${t.text}`}>{ficha.vidaUtilAnaquel}</span>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Propiedades Fisicoquímicas */}
        {ficha.tienePropiedadesFQ && ficha.propiedadesFQ && (
          <Seccion titulo="Propiedades Fisicoquímicas" icon="science" t={t}>
            <div className={`${t.bgCard} border ${t.border} rounded-xl p-5 shadow-sm`}>
              <p className={`${t.text} text-sm whitespace-pre-line leading-relaxed`}>{ficha.propiedadesFQ}</p>
            </div>
          </Seccion>
        )}

        {/* Envases */}
        {ficha.envases?.some(e => e.descripcion) && (
          <Seccion titulo="Envases y Material de Embalaje" icon="inventory_2" t={t}>
            <TablaDetalle
              t={t}
              headers={["Descripción", "Código SAP", "Cant. Batch/UN", "Peso Envase (kg)"]}
              rows={ficha.envases.map((e, i) => (
                <tr key={i} className={`${t.hover} transition-colors`}>
                  <td className={`px-4 py-3 font-medium ${t.text}`}>{e.descripcion}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-400">{e.codigoSap}</td>
                  <td className={`px-4 py-3 ${t.textSecondary}`}>{e.cantidad}</td>
                  <td className={`px-4 py-3 ${t.textSecondary}`}>{e.pesoEnvase}</td>
                </tr>
              ))}
            />
          </Seccion>
        )}

        {/* Fotos */}
        {ficha.fotosExtra?.some(f => f) && (
          <Seccion titulo="Evidencia Visual" icon="photo_library" t={t}>
            <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto pb-2 md:overflow-visible md:pb-0">
              {ficha.fotosExtra.filter(f => f).map((url, i) => (
                <div
                  key={i}
                  className="flex-none w-40 h-40 md:w-auto md:h-48 rounded-xl overflow-hidden cursor-zoom-in relative group"
                  onClick={() => setFotoAmpliada(url)}
                >
                  <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 28 }}>zoom_in</span>
                  </div>
                </div>
              ))}
            </div>
          </Seccion>
        )}

        {/* Revisiones */}
        {ficha.revisiones?.some(r => r.numero) && (
          <Seccion titulo="Historial de Revisiones" icon="history" t={t}>
            <TablaDetalle
              t={t}
              headers={["Versión", "Fecha", "Descripción del Cambio"]}
              rows={ficha.revisiones.map((r, i) => (
                <tr key={i} className={`${t.hover} transition-colors`}>
                  <td className={`px-4 py-3 font-bold ${t.text}`}>{r.numero}</td>
                  <td className={`px-4 py-3 ${t.textSecondary} whitespace-nowrap`}>{r.fecha}</td>
                  <td className={`px-4 py-3 ${t.text} text-sm`}>{r.descripcion}</td>
                </tr>
              ))}
            />
          </Seccion>
        )}

        {/* Pie */}
        <div className={`${t.bgCard} border ${t.border} rounded-2xl overflow-hidden shadow-sm mb-8`}>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className={`p-5 md:border-r ${t.border}`}>
              <p className={`${t.textSecondary} text-[10px] font-black uppercase tracking-widest mb-3`}>Preparado por</p>
              <div className={`space-y-1 text-sm ${t.text}`}>
                <p>Chef Ejecutivo Cencosud</p>
                <p>Supervisores Rincón Jumbo</p>
                <p className={`${t.textSecondary} text-xs`}>Centro de Competencia Platos preparados, Rincón Jumbo, Casino de Personal y Cafetería.</p>
              </div>
            </div>
            <div className="p-5">
              <p className={`${t.textSecondary} text-[10px] font-black uppercase tracking-widest mb-3`}>Aprobado por</p>
              <div className={`space-y-1 text-sm ${t.text}`}>
                <p>Gerente Dto. Aseguramiento de Calidad</p>
                <p>Jefe de Área Sección</p>
                <p>Encargada de Producción y Envases</p>
                <p>Gerente Operación y Venta Jumbo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer acciones */}
        <div className={`flex justify-end gap-3 pt-2 border-t ${t.border}`}>
          <button className={`px-5 py-2.5 border ${t.border} ${t.text} ${t.hover} rounded-xl text-sm font-semibold transition-colors`}>
            Descargar PDF
          </button>
          <button className={`px-5 py-2.5 border ${t.border} ${t.text} ${t.hover} rounded-xl text-sm font-semibold transition-colors`}>
            Imprimir Etiqueta
          </button>
          {(rol === "admin" || rol === "unico") && (
            <button
              onClick={onEditar}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-blue-500/20"
            >
              Editar Ficha
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className={`${t.bg} flex h-screen overflow-hidden`}>

      {/* Sidebar — solo desktop */}
      <div className="hidden md:block flex-shrink-0">
        <AppSidebar
          user={user}
          rol={rol}
          moduloActivo="fichaDetalle"
          onNavegar={onNavegar}
        />
      </div>

      {/* Columna principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Header móvil sticky */}
        <header
          className={`md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 ${t.bgNav} border-b ${t.border}`}
          style={{ backdropFilter: "blur(12px)" }}
        >
          <button
            onClick={onBack}
            className={`w-10 h-10 flex items-center justify-center rounded-full ${t.hover} ${t.text} transition`}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex-1 flex flex-col items-center px-2">
            <h2 className={`${t.text} text-sm font-bold truncate max-w-full`}>Ficha Técnica</h2>
            {fichasLista.length > 1 && (
              <div className="flex items-center gap-2 mt-0.5">
                <button onClick={irAnterior} disabled={!hasPrev}
                  className={`transition ${hasPrev ? "text-blue-400" : "opacity-20 " + t.textSecondary}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
                </button>
                <span className={`${t.textSecondary} text-[10px] font-bold`}>{fichaIdx + 1} / {fichasLista.length}</span>
                <button onClick={irSiguiente} disabled={!hasNext}
                  className={`transition ${hasNext ? "text-blue-400" : "opacity-20 " + t.textSecondary}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                </button>
              </div>
            )}
          </div>
          {(rol === "admin" || rol === "unico") && (
            <button
              onClick={onEditar}
              className={`w-10 h-10 flex items-center justify-center rounded-full ${t.hover} ${t.text} transition`}
            >
              <span className="material-symbols-outlined">edit</span>
            </button>
          )}
        </header>

        {/* Navbar desktop */}
        <div className="hidden md:block flex-shrink-0">
          <Navbar 
            user={user} 
            rol={rol} 
            onNavegar={onNavegar} 
            onPerfil={() => onNavegar("perfil")}
            onTutorial={() => { sessionStorage.setItem("trigger_tutorial", "true"); onNavegar(null); }}
            titulo="Detalle de Ficha" 
          />
        </div>

        {/* Área scrolleable */}
        <main ref={contenedorRef} className="flex-1 overflow-y-auto relative">
          <Contenido />

          {/* Flechas desktop — flotantes sobre el contenido */}
          {fichasLista.length > 1 && (
            <>
              <button
                onClick={irAnterior}
                disabled={!hasPrev}
                className={`hidden md:flex fixed left-[280px] top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full shadow-xl items-center justify-center transition-all ${
                  hasPrev ? `${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-blue-400 hover:border-blue-400/50` : "opacity-0 pointer-events-none"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>chevron_left</span>
              </button>
              <button
                onClick={irSiguiente}
                disabled={!hasNext}
                className={`hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full shadow-xl items-center justify-center transition-all ${
                  hasNext ? `${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-blue-400 hover:border-blue-400/50` : "opacity-0 pointer-events-none"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>chevron_right</span>
              </button>
            </>
          )}
        </main>
      </div>

      {/* Modal foto ampliada */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 cursor-zoom-out p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <img
            src={fotoAmpliada}
            alt="Foto ampliada"
            className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
          />
          <button
            onClick={() => setFotoAmpliada(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Sello Documento Controlado */}
      <div className="fixed bottom-6 right-6 pointer-events-none opacity-25 rotate-[-12deg] z-40">
        <div className="border-2 border-red-500 px-4 py-2 rounded-lg">
          <p className="text-red-500 font-black text-lg uppercase tracking-tighter text-center leading-tight">Documento<br/>Controlado</p>
        </div>
      </div>

    </div>
  );
}
