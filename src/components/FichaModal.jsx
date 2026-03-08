import { useState, useRef } from "react";
import { db } from "../firebase/config";
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import toast, { Toaster } from "react-hot-toast";
import TablaIngredientes from "./TablaIngredientes";

const SECCIONES = ["Snack y Desayuno", "Acompañamientos", "Carnes", "Cuarto Frío", "Postres", "Sizzling"];
const TABS = ["📋 General", "🥩 Ingredientes", "📝 Proceso", "📦 Envases", "📸 Fotos"];

export default function FichaModal({ ficha, seccionInicial, onClose }) {
  const { t } = useTheme();
  const [loading, setLoading] = useState(false);
  const [tabActiva, setTabActiva] = useState(0);

  const [form, setForm] = useState({
    nombre: ficha?.nombre || "",
    codigo: ficha?.codigo || "",
    seccion: ficha?.seccion || seccionInicial,
    version: ficha?.version || "1",
    fecha: ficha?.fecha || "",
    porciones: ficha?.porciones || "",
    tiempoPreparacion: ficha?.tiempoPreparacion || "",
    foto: ficha?.foto || "",
    descripcionProceso: ficha?.descripcionProceso || "",
    tempCoccion: ficha?.tempCoccion || "",
    tempEmpanizado: ficha?.tempEmpanizado || "",
    tempAlmacenamiento: ficha?.tempAlmacenamiento || "",
    vidaUtilGrado: ficha?.vidaUtilGrado || "",
    vidaUtilVacio: ficha?.vidaUtilVacio || "",
    vidaUtilAnaquel: ficha?.vidaUtilAnaquel || "",
    materiasPrimas: ficha?.materiasPrimas || [{ nombre: "", cantidadBruta: "", cantidadNeta: "" }],
    elementosDecorativos: ficha?.elementosDecorativos || [{ nombre: "", cantidadBruta: "", cantidadNeta: "" }],
    envases: ficha?.envases || [{ descripcion: "", codigoSap: "", cantidad: "" }],
    fotosExtra: ficha?.fotosExtra || [""],
  });

  const update = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const updateLista = (lista, idx, campo, valor) => {
    const nueva = [...form[lista]];
    nueva[idx][campo] = valor;
    update(lista, nueva);
  };

  const agregarFila = (lista, modelo) => update(lista, [...form[lista], { ...modelo }]);
  const eliminarFila = (lista, idx) => update(lista, form[lista].filter((_, i) => i !== idx));

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
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      toast.error("Error al guardar");
    }
    setLoading(false);
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
              <input value={form.nombre} onChange={(e) => update("nombre", e.target.value)} className={inputClass} placeholder="Ej: Müesli Avena" />
            </div>
            <div>
              <label className={labelClass}>Código</label>
              <input value={form.codigo} onChange={(e) => update("codigo", e.target.value)} className={inputClass} placeholder="Ej: 2012-01-67-213" />
            </div>
            <div>
              <label className={labelClass}>Sección</label>
              <select value={form.seccion} onChange={(e) => update("seccion", e.target.value)} className={inputClass}>
                {SECCIONES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Versión</label>
              <input value={form.version} onChange={(e) => update("version", e.target.value)} className={inputClass} placeholder="Ej: 1" />
            </div>
            <div>
              <label className={labelClass}>Fecha</label>
              <input type="date" value={form.fecha} onChange={(e) => update("fecha", e.target.value)} className={inputClass} />
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
            />
            <TablaIngredientes
              titulo="🎨 Elementos Decorativos"
              lista={form.elementosDecorativos}
              campo="elementosDecorativos"
              onUpdate={updateLista}
              onAgregar={agregarFila}
              onEliminar={eliminarFila}
              placeholder="Elemento"
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
                  ["tempCoccion", "Temp. Cocción"],
                  ["tempEmpanizado", "Temp. Empanizado"],
                  ["tempAlmacenamiento", "Temp. Almacenamiento"],
                  ["vidaUtilGrado", "Vida Útil (°)"],
                  ["vidaUtilVacio", "Vida Útil Vacío"],
                  ["vidaUtilAnaquel", "Vida Útil Anaquel"],
                ].map(([campo, label]) => (
                  <div key={campo}>
                    <label className={labelClass}>{label}</label>
                    <input value={form[campo]} onChange={(e) => update(campo, e.target.value)} className={inputClass} placeholder="NA" />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Tab 3 - Envases */}
        {tabActiva === 3 && (
          <div>
            <h3 className={`${t.text} font-semibold mb-3`}>📦 Envases y Material de Embalaje</h3>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <span className={`${t.textSecondary} text-xs`}>Descripción</span>
              <span className={`${t.textSecondary} text-xs`}>Código SAP</span>
              <span className={`${t.textSecondary} text-xs`}>Cantidad</span>
            </div>
            {form.envases.map((e, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2 items-center">
                <input value={e.descripcion} onChange={(ev) => updateLista("envases", i, "descripcion", ev.target.value)} className={inputClass} placeholder="Descripción" />
                <input value={e.codigoSap} onChange={(ev) => updateLista("envases", i, "codigoSap", ev.target.value)} className={inputClass} placeholder="SAP" />
                <div className="flex gap-1">
                  <input value={e.cantidad} onChange={(ev) => updateLista("envases", i, "cantidad", ev.target.value)} className={inputClass} placeholder="0" />
                  <button onClick={() => eliminarFila("envases", i)} className="text-red-400 text-xs px-2">✕</button>
                </div>
              </div>
            ))}
            <button onClick={() => agregarFila("envases", { descripcion: "", codigoSap: "", cantidad: "" })} className="text-teal-400 text-sm hover:underline">+ Agregar envase</button>
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
            <button onClick={() => update("fotosExtra", [...form.fotosExtra, ""])} className="text-teal-400 text-sm hover:underline">+ Agregar foto</button>
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
    </div>
  );
}