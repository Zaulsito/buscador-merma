import { useState } from "react";
import { db } from "../firebase/config";
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import toast, { Toaster } from "react-hot-toast";
import TablaIngredientes from "./TablaIngredientes";
import { useCodigos, useSubcategorias } from "../hooks/useIngredientes";
import { exportarFichaExcel, importarFichaExcel } from "../utils/fichaExcel";

const SECCIONES = ["Snack y Desayuno", "Acompañamientos", "Carnes", "Cuarto Frío", "Postres", "Sizzling"];
const TABS = ["📋 General", "🥩 Ingredientes", "📝 Proceso", "📦 Envases", "📸 Fotos", "🔄 Revisiones"];

export default function FichaModal({ ficha, seccionInicial, onClose, user }) {
  const { t } = useTheme();
  const [loading, setLoading] = useState(false);
  const [tabActiva, setTabActiva] = useState(0);
  const [productosFaltantes, setProductosFaltantes] = useState([]);
  const [showMermaModal, setShowMermaModal] = useState(false);
  const codigos = useCodigos();
  const subcategorias = useSubcategorias();
  const [sugerenciasCodigo, setSugerenciasCodigo] = useState([]);
  const [sugerenciasSubcat, setSugerenciasSubcat] = useState([]);

  const [form, setForm] = useState({
    nombre: ficha?.nombre || "",
    codigo: ficha?.codigo || "J502-D-RJ-",
    subcategoria: ficha?.subcategoria || "",
    seccion: ficha?.seccion || seccionInicial,
    porciones: ficha?.porciones || "",
    tiempoPreparacion: ficha?.tiempoPreparacion || "",
    foto: ficha?.foto || "",
    descripcionProceso: ficha?.descripcionProceso || "",
    tempCoccion: ficha?.tempCoccion || "NA",
    tempEnfriado: ficha?.tempEnfriado || "NA",
    tempAlmacenamiento: ficha?.tempAlmacenamiento || "NA",
    vidaUtilGrado: ficha?.vidaUtilGrado || "NA",
    vidaUtilVacio: ficha?.vidaUtilVacio || "NA",
    vidaUtilAnaquel: ficha?.vidaUtilAnaquel || "NA",
    materiasPrimas: ficha?.materiasPrimas || [{ nombre: "", unidad: "KG", cantidadBruta: "0.000", cantidadNeta: "0.000" }],
elementosDecorativos: ficha?.elementosDecorativos || [{ nombre: "", cantidadBruta: "0.000", cantidadNeta: "0.000", unidad: "KG" }],
    envases: ficha?.envases || [{ descripcion: "", codigoSap: "", cantidad: "", pesoEnvase: "" }],
    formatosVenta: ficha?.formatosVenta || [{ codSap: "", descripcion: "", numEnvase: "", pesoProducto: "", codBarra: "" }],
    fotosExtra: ficha?.fotosExtra || [""],
    revisiones: ficha?.revisiones || [{ numero: "000", fecha: "", descripcion: "Versión inicial" }],
  });

  const update = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const updateLista = (lista, idx, campo, valor) => {
    const nueva = [...form[lista]];
    nueva[idx][campo] = valor;
    update(lista, nueva);
  };

  const agregarFila = (lista, modelo) => update(lista, [...form[lista], { ...modelo }]);
  const eliminarFila = (lista, idx) => update(lista, form[lista].filter((_, i) => i !== idx));

  const handleAgregarAMerma = async (producto) => {
    try {
      await addDoc(collection(db, "merma"), {
        codigo: producto.codSap,
        nombre: producto.descripcion,
        categoria: form.seccion,
        unidadMedida: "",
        creadoPor: user?.email || "",
        fechaCreacion: serverTimestamp(),
      });
      toast.success(`${producto.descripcion} agregado a Merma ✅`);
      const restantes = productosFaltantes.filter(p => p.codSap !== producto.codSap);
      setProductosFaltantes(restantes);
      if (restantes.length === 0) {
        setShowMermaModal(false);
        setTimeout(() => onClose(), 500);
      }
    } catch (err) {
      toast.error("Error al agregar a Merma");
    }
  };

  const handleGuardar = async () => {
    if (!form.nombre) { toast.error("El nombre es obligatorio"); return; }
    setLoading(true);
    try {
      if (ficha) {
        await updateDoc(doc(db, "fichas", ficha.id), { ...form });
        toast.success("Ficha actualizada ✅");
      } else {
        await addDoc(collection(db, "fichas"), { ...form, fechaCreacion: serverTimestamp() });
        toast.success("Ficha creada ✅");
      }

      const formatosConSap = (form.formatosVenta || []).filter(f => f.codSap?.trim());
      if (formatosConSap.length > 0) {
        const mermaSnap = await getDocs(collection(db, "merma"));
        const codigosEnMerma = new Set(mermaSnap.docs.map(d => d.data().codigo?.trim()));
        const faltantes = formatosConSap.filter(f => !codigosEnMerma.has(f.codSap.trim()));
        if (faltantes.length > 0) {
          setProductosFaltantes(faltantes);
          setShowMermaModal(true);
          setLoading(false);
          return;
        }
      }

      setTimeout(() => onClose(), 1000);
    } catch (err) {
      toast.error("Error al guardar");
    }
    setLoading(false);
  };
  const formatearCantidad = (valor) => {
    const soloNumeros = valor.replace(/\D/g, "").slice(0, 6);
    if (!soloNumeros) return "0.000";
    const padded = soloNumeros.padStart(4, "0");
    const resultado = padded.slice(0, -3) + "." + padded.slice(-3);
    return parseFloat(resultado).toFixed(3).toString();
  };
  const inputClass = `w-full ${t.bgInput} ${t.text} px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm`;
  const labelClass = `${t.textSecondary} text-xs mb-1 block`;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 px-4 py-6 overflow-y-auto">
      <Toaster />
      <div className={`${t.bgCard} rounded-2xl p-6 w-full max-w-3xl shadow-xl`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className={`${t.text} text-xl font-bold`}>{ficha ? "Editar ficha" : "Nueva ficha técnica"}</h2>
          <div className="flex items-center gap-2 hidden">
            <button
              onClick={() => exportarFichaExcel({
                nombre: "FICHA TECNICA EJEMPLO",
                codigo: "2012-01-67-000",
                seccion: "Postres",
                porciones: "4 porciones",
                tiempoPreparacion: "30 min",
                foto: "https://...",
                descripcionProceso: "1- Paso uno\n2- Paso dos\n3- Paso tres",
                tempCoccion: "180",
                tempEnfriado: "NA",
                tempAlmacenamiento: "65",
                vidaUtilGrado: "el día",
                vidaUtilVacio: "NA",
                vidaUtilAnaquel: "NA",
                materiasPrimas: [{ nombre: "Ingrediente 1", cantidadBruta: "0.500", cantidadNeta: "0.450", unidad: "KG" }],
                elementosDecorativos: [{ nombre: "Elemento 1", cantidadBruta: "0.010", cantidadNeta: "0.010", unidad: "UN" }],
                envases: [{ descripcion: "Envase ejemplo", codigoSap: "10000000", cantidad: "1", pesoEnvase: "0.050" }],
                formatosVenta: [{ codSap: "2000000", descripcion: "Producto Ejemplo UN", numEnvase: "1", pesoProducto: "0.500", codBarra: "NA" }],
                revisiones: [{ numero: "000", fecha: "2025-01-01", descripcion: "Versión inicial" }],
                fotosExtra: [],
              })}
              className="text-teal-400 text-xs underline whitespace-nowrap"
            >
              📄 Descargar ejemplo
            </button>
            <label className={`cursor-pointer ${t.bgInput} ${t.hover} ${t.text} text-xs font-semibold px-3 py-2 rounded-lg transition`}>
              📤 Importar Excel
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  try {
                    const data = await importarFichaExcel(file);
                    setForm((f) => ({ ...f, ...data }));
                    toast.success("Excel importado ✅ Revisa los datos");
                  } catch (err) {
                    toast.error("Error al importar Excel");
                  }
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <button onClick={onClose} className={`${t.textSecondary} hover:${t.text} text-xl`}>✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 flex-wrap mb-6">
          {TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setTabActiva(i)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                tabActiva === i ? "bg-teal-600 text-white" : `${t.bgInput} ${t.text} ${t.hover}`
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab 0 - General */}
        {tabActiva === 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="col-span-2 sm:col-span-3">
              <label className={labelClass}>Nombre del plato *</label>
              <input value={form.nombre} onChange={(e) => update("nombre", e.target.value)} className={inputClass} placeholder="Ej: FICHA TECNICA QUICHE MINI VARIEDAD" />
            </div>
            <div>
              <label className={labelClass}>Código</label>
              <div className="relative">
                <input
                  value={form.codigo}
                  onChange={(e) => {
                    update("codigo", e.target.value);
                    if (e.target.value.trim().length >= 1) {
                      const filtrados = codigos.filter((c) => c.toLowerCase().includes(e.target.value.toLowerCase()) && c !== e.target.value);
                      setSugerenciasCodigo(filtrados.slice(0, 5));
                    } else {
                      setSugerenciasCodigo([]);
                    }
                  }}
                  onBlur={() => setTimeout(() => setSugerenciasCodigo([]), 150)}
                  className={inputClass}
                  placeholder="Ej: 2012-01-67-213"
                />
                {sugerenciasCodigo.length > 0 && (
                  <div className={`absolute z-10 w-full mt-1 ${t.bgCard} border ${t.border} rounded-lg shadow-lg overflow-hidden`}>
                    {sugerenciasCodigo.map((c, i) => (
                      <button key={i} onMouseDown={() => { update("codigo", c); setSugerenciasCodigo([]); }} className={`w-full text-left px-3 py-2 text-sm ${t.text} ${t.hover} transition`}>{c}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className={labelClass}>Sección</label>
              <select value={form.seccion} onChange={(e) => update("seccion", e.target.value)} className={inputClass}>
                {SECCIONES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Subcategoría</label>
              <div className="relative">
                <input
                  value={form.subcategoria}
                  onChange={(e) => {
                    update("subcategoria", e.target.value);
                    if (e.target.value.trim().length >= 1) {
                      const filtradas = subcategorias.filter((s) => s.toLowerCase().includes(e.target.value.toLowerCase()) && s !== e.target.value);
                      setSugerenciasSubcat(filtradas.slice(0, 5));
                    } else {
                      setSugerenciasSubcat([]);
                    }
                  }}
                  onBlur={() => setTimeout(() => setSugerenciasSubcat([]), 150)}
                  className={inputClass}
                  placeholder="Ej: Calientes, Fríos..."
                />
                {sugerenciasSubcat.length > 0 && (
                  <div className={`absolute z-10 w-full mt-1 ${t.bgCard} border ${t.border} rounded-lg shadow-lg overflow-hidden`}>
                    {sugerenciasSubcat.map((s, i) => (
                      <button key={i} onMouseDown={() => { update("subcategoria", s); setSugerenciasSubcat([]); }} className={`w-full text-left px-3 py-2 text-sm ${t.text} ${t.hover} transition`}>{s}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className={labelClass}>Porciones</label>
              <input value={form.porciones} onChange={(e) => update("porciones", e.target.value)} className={inputClass} placeholder="Ej: 4 porciones" />
            </div>
            <div>
              <label className={labelClass}>Tiempo preparación</label>
              <input value={form.tiempoPreparacion} onChange={(e) => update("tiempoPreparacion", e.target.value)} className={inputClass} placeholder="Ej: 30 min" />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <label className={labelClass}>URL foto principal</label>
              <input value={form.foto} onChange={(e) => update("foto", e.target.value)} className={inputClass} placeholder="https://..." />
            </div>

            {/* Formatos de Venta */}
            <div className="col-span-2 sm:col-span-3 mt-2">
              <h3 className={`${t.text} font-semibold mb-3`}>🏷️ Formatos de Venta</h3>
              <div className="grid grid-cols-5 gap-2 mb-2">
                <span className={`${t.textSecondary} text-xs`}>Cod. SAP</span>
                <span className={`${t.textSecondary} text-xs`}>Descripción</span>
                <span className={`${t.textSecondary} text-xs`}>N° Envase</span>
                <span className={`${t.textSecondary} text-xs`}>Peso (kg)</span>
                <span className={`${t.textSecondary} text-xs`}>Cod. Barra / Marcación</span>
              </div>
              {form.formatosVenta.map((fv, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-center">
                  <input value={fv.codSap} onChange={(ev) => updateLista("formatosVenta", i, "codSap", ev.target.value)} className={inputClass} placeholder="SAP" />
                  <input value={fv.descripcion} onChange={(ev) => updateLista("formatosVenta", i, "descripcion", ev.target.value)} className={inputClass} placeholder="Descripción" />
                  <input value={fv.numEnvase} onChange={(ev) => updateLista("formatosVenta", i, "numEnvase", ev.target.value)} className={inputClass} placeholder="1" />
                  <input value={fv.pesoProducto} onChange={(ev) => updateLista("formatosVenta", i, "pesoProducto", formatearCantidad(ev.target.value))} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className={inputClass} placeholder="0.000" />
                  <div className="flex gap-1">
                    <input value={fv.codBarra} onChange={(ev) => updateLista("formatosVenta", i, "codBarra", ev.target.value)} className={inputClass} placeholder="Barra/Marcación" />
                    <button onClick={() => eliminarFila("formatosVenta", i)} className="text-red-400 text-xs px-2">✕</button>
                  </div>
                </div>
              ))}
              <button onClick={() => agregarFila("formatosVenta", { codSap: "", descripcion: "", numEnvase: "", pesoProducto: "", codBarra: "" })} className="text-teal-400 text-sm hover:underline">
                + Agregar formato
              </button>
            </div>
          </div>
        )}

        {/* Tab 1 - Ingredientes */}
        {tabActiva === 1 && (
          <>
            <TablaIngredientes
              titulo="🥩 Materia Prima"
              lista={form.materiasPrimas}
              campo="materiasPrimas"
              onUpdate={updateLista}
              onAgregar={agregarFila}
              onEliminar={eliminarFila}
              placeholder="Ingrediente"
              conUnidad={true}
            />
            <TablaIngredientes
              titulo="🎨 Elementos Decorativos / Montaje"
              lista={form.elementosDecorativos}
              campo="elementosDecorativos"
              onUpdate={updateLista}
              onAgregar={agregarFila}
              onEliminar={eliminarFila}
              placeholder="Elemento"
              conUnidad={true}
            />
          </>
        )}

        {/* Tab 2 - Proceso */}
        {tabActiva === 2 && (
          <>
            <div className="mb-6">
              <label className={labelClass}>Descripción del proceso</label>
              <textarea
                value={form.descripcionProceso}
                onChange={(e) => update("descripcionProceso", e.target.value)}
                className={`${inputClass} h-40 resize-none`}
                placeholder="Escribe los pasos de preparación aquí..."
              />
            </div>
            <div>
              <h3 className={`${t.text} font-semibold mb-3`}>🌡️ Datos de Proceso</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ["tempCoccion", "Temp. Cocción", true],
                  ["tempEnfriado", "Temp. Enfriado", true],
                  ["tempAlmacenamiento", "Temp. Almacenamiento", true],
                  ["vidaUtilGrado", "Vida Útil Granel", false],
                  ["vidaUtilVacio", "Vida Útil Vacío", false],
                  ["vidaUtilAnaquel", "Vida Útil Anaquel", false],
                ].map(([campo, label, esCelsius]) => (
                  <div key={campo}>
                    <label className={labelClass}>{label}</label>
                    <div className="flex items-center gap-1">
                      <input value={form[campo]} onChange={(e) => update(campo, e.target.value)} className={inputClass} placeholder="NA" />
                      {esCelsius && <span className={`${t.textSecondary} text-xs whitespace-nowrap`}>°C</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Tab 3 - Envases */}
        {tabActiva === 3 && (
          <div>
            <h3 className={`${t.text} font-semibold mb-3`}>📦 Envases, Material de Embalaje y Etiquetas</h3>
            <div className="grid grid-cols-4 gap-2 mb-2">
              <span className={`${t.textSecondary} text-xs`}>Descripción</span>
              <span className={`${t.textSecondary} text-xs`}>Código SAP</span>
              <span className={`${t.textSecondary} text-xs`}>Cant. Batch/UN</span>
              <span className={`${t.textSecondary} text-xs`}>Peso Envase (kg)</span>
            </div>
            {form.envases.map((e, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 mb-2 items-center">
                <input value={e.descripcion} onChange={(ev) => updateLista("envases", i, "descripcion", ev.target.value)} className={inputClass} placeholder="Descripción" />
                <input value={e.codigoSap} onChange={(ev) => updateLista("envases", i, "codigoSap", ev.target.value)} className={inputClass} placeholder="SAP" />
                <input value={e.cantidad} onChange={(ev) => updateLista("envases", i, "cantidad", ev.target.value)} className={inputClass} placeholder="0" />
                <div className="flex gap-1">
                  <input value={e.pesoEnvase || ""} onChange={(ev) => updateLista("envases", i, "pesoEnvase", ev.target.value)} className={inputClass} placeholder="0.000" />
                  <button onClick={() => eliminarFila("envases", i)} className="text-red-400 text-xs px-2">✕</button>
                </div>
              </div>
            ))}
            <button onClick={() => agregarFila("envases", { descripcion: "", codigoSap: "", cantidad: "", pesoEnvase: "" })} className="text-teal-400 text-sm hover:underline">
              + Agregar envase
            </button>
          </div>
        )}

        {/* Tab 4 - Fotos */}
        {tabActiva === 4 && (
          <div>
            <h3 className={`${t.text} font-semibold mb-3`}>📸 Fotos del proceso</h3>
            {form.fotosExtra.map((url, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={url} onChange={(e) => { const f = [...form.fotosExtra]; f[i] = e.target.value; update("fotosExtra", f); }} className={inputClass} placeholder={`URL foto ${i + 1}`} />
                <button onClick={() => update("fotosExtra", form.fotosExtra.filter((_, j) => j !== i))} className="text-red-400 text-xs px-2">✕</button>
              </div>
            ))}
            <button onClick={() => update("fotosExtra", [...form.fotosExtra, ""])} className="text-teal-400 text-sm hover:underline">
              + Agregar foto
            </button>
          </div>
        )}

        {/* Tab 5 - Revisiones */}
        {tabActiva === 5 && (
          <div>
            <h3 className={`${t.text} font-semibold mb-3`}>🔄 Tabla de Revisiones</h3>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <span className={`${t.textSecondary} text-xs`}>N° Revisión</span>
              <span className={`${t.textSecondary} text-xs`}>Fecha</span>
              <span className={`${t.textSecondary} text-xs`}>Descripción del cambio</span>
            </div>
            {form.revisiones.map((r, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2 items-center">
                <input value={r.numero} onChange={(e) => { const rev = [...form.revisiones]; rev[i].numero = e.target.value; update("revisiones", rev); }} className={inputClass} placeholder="000" />
                <input type="date" value={r.fecha} onChange={(e) => { const rev = [...form.revisiones]; rev[i].fecha = e.target.value; update("revisiones", rev); }} className={inputClass} />
                <div className="flex gap-1">
                  <input value={r.descripcion} onChange={(e) => { const rev = [...form.revisiones]; rev[i].descripcion = e.target.value; update("revisiones", rev); }} className={inputClass} placeholder="Descripción del cambio" />
                  <button onClick={() => update("revisiones", form.revisiones.filter((_, j) => j !== i))} className="text-red-400 text-xs px-2">✕</button>
                </div>
              </div>
            ))}
            <button onClick={() => update("revisiones", [...form.revisiones, { numero: String(form.revisiones.length).padStart(3, "0"), fecha: "", descripcion: "" }])} className="text-teal-400 text-sm hover:underline">
              + Agregar revisión
            </button>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className={`flex-1 ${t.bgInput} ${t.hover} ${t.text} font-semibold py-3 rounded-lg transition`}>
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={loading} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50">
            {loading ? "Guardando..." : ficha ? "Actualizar ficha" : "Crear ficha"}
          </button>
        </div>
      </div>

      {/* Modal productos faltantes en Merma */}
      {showMermaModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className={`${t.bgCard} rounded-2xl p-6 w-full max-w-md shadow-xl`}>
            <h3 className={`${t.text} font-bold text-lg mb-2`}>⚠️ Productos no encontrados en Merma</h3>
            <p className={`${t.textSecondary} text-sm mb-4`}>Los siguientes productos no están en el Buscador de Merma. ¿Quieres agregarlos?</p>
            <div className="flex flex-col gap-3 mb-6">
              {productosFaltantes.map((p, i) => (
                <div key={i} className={`${t.bgInput} rounded-xl p-3 flex items-center justify-between`}>
                  <div>
                    <p className={`${t.text} text-sm font-semibold`}>{p.descripcion || "Sin nombre"}</p>
                    <p className={`${t.textSecondary} text-xs`}>COD. SAP: {p.codSap}</p>
                  </div>
                  <button
                    onClick={() => handleAgregarAMerma(p)}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
                  >
                    + Agregar
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setShowMermaModal(false); setTimeout(() => onClose(), 300); }}
              className={`w-full ${t.bgInput} ${t.hover} ${t.text} font-semibold py-3 rounded-lg transition`}
            >
              Omitir y cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}