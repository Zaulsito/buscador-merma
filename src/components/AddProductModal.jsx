import { useState, useEffect } from "react";
import { db, auth } from "../firebase/config";
import { collection, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";

export default function AddProductModal({ onClose, onAdded }) {
  const { t } = useTheme();
  const [codigo, setCodigo] = useState("");
  const [barcode, setBarcode] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [unidadMedida, setUnidadMedida] = useState("");
  const [categoriasDocs, setCategoriasDocs] = useState([]);
  const [imagen, setImagen] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categorias"), (snap) => {
      const docs = snap.docs
        .map((d) => ({ id: d.id, nombre: d.data().nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      setCategoriasDocs(docs);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async () => {
    if (!codigo || !nombre) { setError("Código y nombre son obligatorios"); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, "merma"), {
        codigo,
        ean: barcode,
        nombre,
        categoria,
        unidadMedida,
        imagen: imagen.trim() || "",
        creadoPor: auth.currentUser?.uid,
        fechaCreacion: serverTimestamp(),
      });
      onAdded();
      onClose();
    } catch (err) {
      setError("Error al guardar el producto");
    }
    setLoading(false);
  };

  const inputClass = `w-full ${t.bgInput} ${t.text} px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500`;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-2 md:p-4">
      <div className={`${t.bgCard} rounded-3xl overflow-hidden w-full max-w-4xl shadow-2xl flex flex-col md:flex-row max-h-[95vh] md:max-h-[90vh] overflow-y-auto md:overflow-visible border ${t.border}`}>
        
        {/* Panel Izquierdo: Vista Previa */}
        <div className="w-full md:w-1/2 bg-gray-900/50 flex flex-col items-center justify-center p-6 md:p-10 border-b md:border-b-0 md:border-r border-gray-700/50 relative min-h-[300px] md:min-h-0">
          <div className="absolute top-4 left-4 md:top-6 md:left-6 flex items-center gap-2 z-10 bg-gray-900/40 backdrop-blur-sm px-2 py-1 rounded-full border border-white/5">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Vista Previa</span>
          </div>

          <div className="relative w-full aspect-square max-w-[240px] md:max-w-[280px] rounded-2xl overflow-hidden shadow-2xl group">
            {imagen ? (
              <img 
                src={imagen} 
                alt="Preview" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  e.target.src = "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=800&auto=format&fit=crop";
                }}
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-xl">
                  <span className="material-symbols-outlined text-blue-500/40" style={{ fontSize: 48 }}>restaurant</span>
                </div>
                <p className="text-gray-500 text-[10px] font-medium text-center px-6">Pega una URL de imagen para verla aquí</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="mt-6 text-center">
             <h3 className="text-white font-bold text-base md:text-xl mb-1">{nombre || "Nombre del Producto"}</h3>
             <p className="text-blue-400 text-[10px] font-mono tracking-widest uppercase">{codigo ? `SAP: ${codigo}` : "CÓDIGO SAP"}</p>
          </div>
        </div>

        {/* Panel Derecho: Formulario */}
        <div className="flex-1 p-6 md:p-10 flex flex-col overflow-y-auto md:overflow-visible">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div>
              <h2 className={`${t.text} text-xl md:text-2xl font-black tracking-tight`}>Nuevo Producto</h2>
              <p className={`${t.textSecondary} text-[10px] mt-1`}>Completa los datos para el inventario de merma.</p>
            </div>
            <button onClick={onClose} className={`w-10 h-10 flex items-center justify-center rounded-xl ${t.bgInput} ${t.textSecondary} hover:text-red-400 transition-colors`}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-red-500" style={{ fontSize: 18 }}>error</span>
                <p className="text-red-400 text-xs font-medium">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className={`${t.textSecondary} text-[10px] font-bold uppercase tracking-wider ml-1`}>Identificación</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Código SAP *"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Código de Barra"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`${t.textSecondary} text-[10px] font-bold uppercase tracking-wider ml-1`}>Información General</label>
                <input
                  type="text"
                  placeholder="Nombre del producto *"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-1.5">
                   <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Selecciona Categoría</option>
                    {categoriasDocs.map((c) => (
                      <option key={c.id} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <select
                    value={unidadMedida}
                    onChange={(e) => setUnidadMedida(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Unidad de Medida</option>
                    <option value="UNIDADES">UNIDADES</option>
                    <option value="KILOGRAMOS">KILOGRAMOS</option>
                    <option value="PORCIONES">PORCIONES</option>
                    <option value="LITROS">LITROS</option>
                    <option value="GRAMOS">GRAMOS</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`${t.textSecondary} text-[10px] font-bold uppercase tracking-wider ml-1`}>Recurso Visual</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" style={{ fontSize: 18 }}>link</span>
                  <input
                    type="text"
                    placeholder="URL de la imagen del producto..."
                    value={imagen}
                    onChange={(e) => setImagen(e.target.value)}
                    className={`${inputClass} pl-12 text-sm`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-8 md:mt-10">
            <button
              onClick={onClose}
              className={`flex-1 ${t.bgInput} ${t.hover} ${t.text} font-bold py-3 md:py-4 rounded-xl transition-all tracking-wide text-xs md:text-sm`}
            >
              CANCELAR
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-[2] bg-gradient-to-r from-blue-600 to-blue-500 hover:brightness-110 text-white font-bold py-3 md:py-4 rounded-xl transition-all shadow-xl shadow-blue-500/25 tracking-wide text-xs md:text-sm disabled:opacity-50"
            >
              {loading ? "..." : "CREAR PRODUCTO"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
