import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { doc, deleteDoc, updateDoc, collection, onSnapshot } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";

const COLOR_MAP = {
  red: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/20" },
  orange: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/20" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/20" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20" },
  cyan: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/20" },
  blue: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/20" },
  purple: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/20" },
  pink: { bg: "bg-pink-500/15", text: "text-pink-400", border: "border-pink-500/20" },
  slate: { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/20" },
};

export default function ProductCard({ product, rol }) {
  const { t } = useTheme();
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(product.nombre);
  const [codigo, setCodigo] = useState(product.codigo || "");
  const [barcode, setBarcode] = useState(product.ean || "");
  const [categoria, setCategoria] = useState(product.categoria || "");
  const [unidadMedida, setUnidadMedida] = useState(product.unidadMedida || "");
  const [imagen, setImagen] = useState(product.imagen || "");
  const [saving, setSaving] = useState(false);
  const [categoriasDocs, setCategoriasDocs] = useState([]);
  const [showZoom, setShowZoom] = useState(false);

  const placeholderImg = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop";

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categorias"), (snap) => {
      const docs = snap.docs
        .map((d) => ({ id: d.id, nombre: d.data().nombre, color: d.data().color || "blue" }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      setCategoriasDocs(docs);
    });
    return () => unsub();
  }, []);

  const getCatStyle = () => {
    const found = categoriasDocs.find(c => c.nombre === product.categoria);
    return COLOR_MAP[found?.color] || COLOR_MAP.blue;
  };

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este producto?")) return;
    await deleteDoc(doc(db, "merma", product.id));
  };

  const handleSave = async () => {
    setSaving(true);
    await updateDoc(doc(db, "merma", product.id), { 
      nombre, 
      codigo,
      ean: barcode,
      categoria, 
      unidadMedida,
      imagen: imagen.trim() || "" 
    });
    setSaving(false);
    setEditing(false);
  };

  const esPrivilegiado = rol === "admin" || rol === "unico";
  const cat = getCatStyle();

  // ── MODO EDICIÓN ──
  if (editing) {
    return (
      <div className={`${t.bgCard} border ${t.border} rounded-2xl p-6 shadow-xl space-y-4`}>
        <div className="flex items-center justify-between mb-2">
           <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Editando Producto</p>
           <span className="material-symbols-outlined text-gray-500" style={{ fontSize: 16 }}>edit</span>
        </div>

        <div className="space-y-3">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={`w-full ${t.bgInput} ${t.text} px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm border ${t.border}`}
            placeholder="Nombre del producto"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className={`w-full ${t.bgInput} ${t.text} px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs border ${t.border}`}
              placeholder="SAP"
            />
            <input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className={`w-full ${t.bgInput} ${t.text} px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs border ${t.border}`}
              placeholder="Código de barra"
            />
          </div>

          <input
            value={imagen}
            onChange={(e) => setImagen(e.target.value)}
            className={`w-full ${t.bgInput} ${t.text} px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm border ${t.border}`}
            placeholder="URL de imagen"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className={`w-full ${t.bgInput} ${t.text} px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs border ${t.border}`}
            >
              <option value="">Categoría</option>
              {categoriasDocs.map((c) => (
                <option key={c.id} value={c.nombre}>{c.nombre}</option>
              ))}
            </select>

            <select
              value={unidadMedida}
              onChange={(e) => setUnidadMedida(e.target.value)}
              className={`w-full ${t.bgInput} ${t.text} px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs border ${t.border}`}
            >
              <option value="">Medida</option>
              <option value="UNIDADES">UNIDADES</option>
              <option value="KILOGRAMOS">KILOGRAMOS</option>
              <option value="PORCIONES">PORCIONES</option>
              <option value="LITROS">LITROS</option>
              <option value="GRAMOS">GRAMOS</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={() => setEditing(false)} className={`flex-1 ${t.bgInput} ${t.hover} ${t.textSecondary} text-xs font-bold py-3 rounded-xl transition-all`}>
            CANCELAR
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20">
            {saving ? "..." : "GUARDAR"}
          </button>
        </div>
      </div>
    );
  }

  // ── MODO VISTA (PREMIUM) ──
  return (
    <>
      <div className={`${t.bgCard} border ${t.border} rounded-[2rem] overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 h-full`}>
        
        {/* Imagen & Overlay */}
        <div 
          className="relative aspect-[4/3] overflow-hidden bg-gray-900 flex items-center justify-center cursor-zoom-in"
          onClick={() => product.imagen && setShowZoom(true)}
        >
              {product.imagen ? (
                <img 
                  src={product.imagen} 
                  alt={product.nombre}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
                     <span className="material-symbols-outlined text-blue-500/30" style={{ fontSize: 40 }}>restaurant</span>
                  </div>
                </div>
              )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent" />
          
          {/* Lupa overlay al hacer hover */}
          {product.imagen && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <span className="material-symbols-outlined text-white text-base">zoom_in</span>
              </div>
            </div>
          )}

          {/* Chip Categoría Overlay */}
          <div className="absolute top-4 left-4">
            <span className={`px-3 py-1.5 rounded-lg ${cat.bg} ${cat.text} text-[9px] font-black uppercase tracking-widest backdrop-blur-md border ${cat.border} border-white/10 shadow-xl`}>
              {product.categoria || "GÉNERICO"}
            </span>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 flex flex-col flex-1">
          
          {/* SAP & Barcode & Medida Row */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex flex-col gap-1">
              <span className="text-gray-500 text-[10px] font-mono tracking-wider leading-none">
                SAP: <span className="text-gray-300">{product.codigo}</span>
              </span>
              {product.ean && (
                <span className="text-gray-500 text-[10px] font-mono tracking-wider leading-none">
                  EAN: <span className="text-gray-300">{product.ean}</span>
                </span>
              )}
            </div>
            {product.unidadMedida && (
              <span className="text-amber-500/90 text-[10px] font-black uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                {product.unidadMedida}
              </span>
            )}
          </div>

          {/* Nombre Producto */}
          <h3 className="text-white font-extrabold text-lg leading-tight tracking-tight text-center mb-6 h-14 flex items-center justify-center line-clamp-2 uppercase">
            {product.nombre}
          </h3>

          <div className="mt-auto">
            {esPrivilegiado ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditing(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-800/50 hover:bg-blue-600 text-gray-400 hover:text-white text-[11px] font-bold transition-all border border-gray-700/50 hover:border-blue-500 group/btn"
                >
                  <span className="material-symbols-outlined text-[18px] group-hover/btn:rotate-12 transition-transform">edit</span>
                  EDITAR
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-800/50 hover:bg-red-500/20 text-gray-500 hover:text-red-500 transition-all border border-gray-700/50 hover:border-red-500/30"
                  title="Eliminar producto"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            ) : (
              <div className="w-full py-3 rounded-2xl bg-gray-800/30 border border-gray-700/30 text-center">
                 <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Vista de Lectura</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visor de Imagen (Pop-up Zoom) */}
      {showZoom && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            onClick={() => setShowZoom(false)}
          />
          <div className="relative w-full max-w-4xl aspect-[4/3] max-h-[80vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <img 
              src={product.imagen} 
              alt={product.nombre}
              className="w-full h-full object-contain"
            />
            
            {/* Botón Cerrar */}
            <button 
              onClick={() => setShowZoom(false)}
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {/* Info inferior */}
            <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black via-black/40 to-transparent">
               <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Visualización Detallada</p>
               <h2 className="text-white text-2xl font-black uppercase tracking-tight">{product.nombre}</h2>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
