import { useState, useRef } from "react";
import { db } from "../firebase/config";
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import toast, { Toaster } from "react-hot-toast";

const SECCIONES = [
  "Snack y Desayuno",
  "Acompañamientos",
  "Carnes",
  "Cuarto Frío",
  "Postres",
  "Sizzling",
];

export default function FichaModal({ ficha, seccionInicial, onClose }) {
  const { t } = useTheme();
  const [loading, setLoading] = useState(false);
  const [loadingIA, setLoadingIA] = useState(false);
  const fileRef = useRef(null);

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

  const handleImportarFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoadingIA(true);
    toast.loading("Leyendo ficha con IA...", { id: "ia" });

    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const response = await fetch("/api/analizar-ficha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      });

      const parsed = await response.json();
      setForm((f) => ({ ...f, ...parsed }));
      toast.success("¡Ficha importada correctamente! Revisa los datos ✅", { id: "ia" });
    } catch (err) {
      console.error(err);
      toast.error("Error al leer la ficha", { id: "ia" });
    }

    setLoadingIA(false);
    if (fileRef.current) fileRef.current.value = "";
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
        <div className="flex items-center justify-between mb-4">
          <h2 className={`${t.text} text-xl font-bold`}>{ficha ? "Editar ficha" : "Nueva ficha técnica"}</h2>
          <button onClick={onClose} className={`${t.textSecondary} hover:${t.text} text-xl`}>✕</button>
        </div>

        {/* Importar con IA */}
        <div className="mb-6">
          <label className={`${t.textSecondary} text-sm mb-2 block`}>
            📷 Importar datos desde foto de ficha técnica
          </label>
          <label className={`w-full flex items-center justify-center gap-2 ${loadingIA ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} bg-teal-600/20 hover:bg-teal-600/30 border border-teal-600 text-teal-400 font-semibold py-3 rounded-xl transition`}>
            {loadingIA ? "⏳ Leyendo con IA..." : "📷 Subir foto para autocompletar"}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImportarFoto}
              disabled={loadingIA}
              className="hidden"
            />
          </label>
          <p className={`${t.textSecondary} text-xs mt-1 text-center`}>La IA leerá automáticamente todos los campos de la ficha</p>
        </div>

        {/* Encabezado */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="col-span-2 sm:col-span-1">
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

        {/* Materia Prima */}
        <div className="mb-6">
          <h3 className={`${t.text} font-semibold mb-3`}>🥩 Materia Prima</h3>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <span className={`${t.textSecondary} text-xs`}>Ingrediente</span>
            <span className={`${t.textSecondary} text-xs`}>Cant. Bruta</span>
            <span className={`${t.textSecondary} text-xs`}>Cant. Neta</span>
          </div>
          {form.materiasPrimas.map((mp, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 mb-2 items-center">
              <input value={mp.nombre} onChange={(e) => updateLista("materiasPrimas", i, "nombre", e.target.value)} className={inputClass} placeholder="Ingrediente" />
              <input value={mp.cantidadBruta} onChange={(e) => updateLista("materiasPrimas", i, "cantidadBruta", e.target.value)} className={inputClass} placeholder="0.000" />
              <div className="flex gap-1">
                <input value={mp.cantidadNeta} onChange={(e) => updateLista("materiasPrimas", i, "cantidadNeta", e.target.value)} className={inputClass} placeholder="0.000" />
                <button onClick={() => eliminarFila("materiasPrimas", i)} className="text-red-400 text-xs px-2">✕</button>
              </div>
            </div>
          ))}
          <button onClick={() => agregarFila("materiasPrimas", { nombre: "", cantidadBruta: "", cantidadNeta: "" })} className="text-teal-400 text-sm hover:underline">+ Agregar ingrediente</button>
        </div>

        {/* Elementos Decorativos */}
        <div className="mb-6">
          <h3 className={`${t.text} font-semibold mb-3`}>🎨 Elementos Decorativos</h3>
          {form.elementosDecorativos.map((ed, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 mb-2 items-center">
              <input value={ed.nombre} onChange={(e) => updateLista("elementosDecorativos", i, "nombre", e.target.value)} className={inputClass} placeholder="Elemento" />
              <input value={ed.cantidadBruta} onChange={(e) => updateLista("elementosDecorativos", i, "cantidadBruta", e.target.value)} className={inputClass} placeholder="0.000" />
              <div className="flex gap-1">
                <input value={ed.cantidadNeta} onChange={(e) => updateLista("elementosDecorativos", i, "cantidadNeta", e.target.value)} className={inputClass} placeholder="0.000" />
                <button onClick={() => eliminarFila("elementosDecorativos", i)} className="text-red-400 text-xs px-2">✕</button>
              </div>
            </div>
          ))}
          <button onClick={() => agregarFila("elementosDecorativos", { nombre: "", cantidadBruta: "", cantidadNeta: "" })} className="text-teal-400 text-sm hover:underline">+ Agregar elemento</button>
        </div>

        {/* Descripción del proceso */}
        <div className="mb-6">
          <h3 className={`${t.text} font-semibold mb-3`}>📝 Descripción del proceso</h3>
          <textarea
            value={form.descripcionProceso}
            onChange={(e) => update("descripcionProceso", e.target.value)}
            className={`${inputClass} h-40 resize-none`}
            placeholder="Escribe los pasos de preparación aquí..."
          />
        </div>

        {/* Envases */}
        <div className="mb-6">
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

        {/* Datos de proceso */}
        <div className="mb-6">
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

        {/* Fotos extra */}
        <div className="mb-6">
          <h3 className={`${t.text} font-semibold mb-3`}>📸 Fotos del proceso</h3>
          {form.fotosExtra.map((url, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input value={url} onChange={(e) => { const f = [...form.fotosExtra]; f[i] = e.target.value; update("fotosExtra", f); }} className={inputClass} placeholder={`URL foto ${i + 1}`} />
              <button onClick={() => update("fotosExtra", form.fotosExtra.filter((_, j) => j !== i))} className="text-red-400 text-xs px-2">✕</button>
            </div>
          ))}
          <button onClick={() => update("fotosExtra", [...form.fotosExtra, ""])} className="text-teal-400 text-sm hover:underline">+ Agregar foto</button>
        </div>

        {/* Botones */}
        <div className="flex gap-3">
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