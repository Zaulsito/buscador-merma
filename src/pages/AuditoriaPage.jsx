import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import DecorativeBackground from "../components/DecorativeBackground";
import { useTheme } from "../context/ThemeContext";
import { db, storage } from "../firebase/config";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import ManageCategoriasAuditoria from "../components/ManageCategoriasAuditoria";

const DEFAULT_CATEGORIAS = [
  "Abarrotes", 
  "Botillería", 
  "Lácteos", 
  "Fiambrería", 
  "Carnicería", 
  "Pescadería", 
  "Verdulería", 
  "Panadería", 
  "Pastelería",
  "Aseo y Limpieza",
  "Perfumería"
];

const sortCategorias = (list) => [...list].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" }));

const getCategoriaEstilo = (catNombre) => {
  const key = normalizeText(catNombre);
  switch (key) {
    case "pescaderia":
      return {
        bg: "bg-sky-400 text-sky-950 border-sky-300",
        badge: "bg-sky-950/20 text-sky-950",
        shadow: "shadow-sky-400/40"
      };
    case "panaderia":
      return {
        bg: "bg-orange-500 text-white border-orange-400",
        badge: "bg-black/25 text-white",
        shadow: "shadow-orange-500/40"
      };
    case "aseo y limpieza":
      return {
        bg: "bg-purple-600 text-white border-purple-400",
        badge: "bg-black/25 text-white",
        shadow: "shadow-purple-500/40"
      };
    case "carniceria":
      return {
        bg: "bg-red-600 text-white border-red-400",
        badge: "bg-black/25 text-white",
        shadow: "shadow-red-500/40"
      };
    case "lacteos":
      return {
        bg: "bg-white text-slate-900 border-slate-300",
        badge: "bg-slate-200 text-slate-900",
        shadow: "shadow-white/30"
      };
    case "verduleria":
      return {
        bg: "bg-emerald-900 text-emerald-100 border-emerald-700",
        badge: "bg-black/35 text-emerald-100",
        shadow: "shadow-emerald-950/50"
      };
    case "botilleria":
      return {
        bg: "bg-blue-600 text-white border-blue-400",
        badge: "bg-black/25 text-white",
        shadow: "shadow-blue-500/40"
      };
    case "textil":
      return {
        bg: "bg-[#6F4E37] text-[#FAF0E6] border-[#553b2a]",
        badge: "bg-black/30 text-[#FAF0E6]",
        shadow: "shadow-[#6F4E37]/40"
      };
    case "importado":
      return {
        bg: "bg-gradient-to-r from-red-600 to-orange-500 text-white border-orange-400",
        badge: "bg-black/25 text-white",
        shadow: "shadow-red-500/40"
      };
    case "fiambreria":
      return {
        bg: "bg-yellow-400 text-yellow-950 border-yellow-300",
        badge: "bg-yellow-950/20 text-yellow-950",
        shadow: "shadow-yellow-400/40"
      };
    case "menaje":
      return {
        bg: "bg-slate-500 text-white border-slate-400",
        badge: "bg-black/25 text-white",
        shadow: "shadow-slate-500/40"
      };
    case "perfumeria":
      return {
        bg: "bg-rose-600 text-white border-rose-400",
        badge: "bg-black/25 text-white",
        shadow: "shadow-rose-500/40"
      };
    case "mundo bio":
      return {
        bg: "bg-teal-400 text-teal-950 border-teal-300",
        badge: "bg-teal-950/20 text-teal-950",
        shadow: "shadow-teal-400/40"
      };
    case "pasteleria":
      return {
        bg: "bg-pink-300 text-pink-950 border-pink-200",
        badge: "bg-pink-950/20 text-pink-950",
        shadow: "shadow-pink-300/40"
      };
    case "abarrotes":
      return {
        bg: "bg-black text-white border-slate-700",
        badge: "bg-white/20 text-white",
        shadow: "shadow-black/60"
      };
    case "platos preparados":
      return {
        bg: "bg-lime-400 text-lime-950 border-lime-300",
        badge: "bg-lime-950/20 text-lime-950",
        shadow: "shadow-lime-400/40"
      };
    case "masivo":
      return {
        bg: "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-amber-950 border-yellow-200",
        badge: "bg-amber-950/20 text-amber-950",
        shadow: "shadow-amber-400/40"
      };
    default:
      return {
        bg: "bg-slate-700 text-white border-slate-600",
        badge: "bg-black/25 text-white",
        shadow: "shadow-slate-700/40"
      };
  }
};

const normalizeText = (text) => 
  text ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

export default function AuditoriaPage({ onBackToSelector }) {
  const { user, logout, rol } = useAuth();
  const { t } = useTheme();

  const [productos, setProductos] = useState([]);
  const [categoriasList, setCategoriasList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [manageCatOpen, setManageCatOpen] = useState(false);
  
  const [editando, setEditando] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [nombre, setNombre] = useState("");
  const [ean, setEan] = useState("");
  const [sku, setSku] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  
  const categoriesRef = useRef(null);

  const scrollCategories = (dir) => {
    if (categoriesRef.current) {
      const scrollAmount = categoriesRef.current.clientWidth * 0.7 || 250;
      categoriesRef.current.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const mapProducts = (docs) => {
    return docs.map(d => {
      const data = d.data();
      let finalEan = data.ean || "";
      let finalSku = data.sku || "";
      // Migración on-the-fly: si no hay ean pero sí sku (formato antiguo)
      if (data.ean === undefined && data.sku) {
        finalEan = data.sku;
        finalSku = "";
      }
      return { id: d.id, ...data, ean: finalEan, sku: finalSku };
    });
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      // Cargar productos
      const pSnap = await getDocs(collection(db, "auditoria_productos"));
      setProductos(mapProducts(pSnap.docs));

      // Cargar categorias
      const cSnap = await getDocs(collection(db, "auditoria_categorias"));
      if (cSnap.empty) {
        // Inicializar
        for (const cat of DEFAULT_CATEGORIAS) {
          await addDoc(collection(db, "auditoria_categorias"), { nombre: cat });
        }
        const cSnapNew = await getDocs(collection(db, "auditoria_categorias"));
        setCategoriasList(sortCategorias(cSnapNew.docs.map(d => ({ id: d.id, ...d.data() }))));
      } else {
        setCategoriasList(sortCategorias(cSnap.docs.map(d => ({ id: d.id, ...d.data() }))));
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const recargarCategorias = async () => {
    const cSnap = await getDocs(collection(db, "auditoria_categorias"));
    setCategoriasList(sortCategorias(cSnap.docs.map(d => ({ id: d.id, ...d.data() }))));
  };

  const cargarProductos = async () => {
    try {
      const pSnap = await getDocs(collection(db, "auditoria_productos"));
      setProductos(mapProducts(pSnap.docs));
    } catch (error) {
      console.error("Error al cargar productos:", error);
    }
  };

  const resetForm = () => {
    setNombre("");
    setEan("");
    setSku("");
    setUbicacion("");
    setCategoria(categoriasList.length > 0 ? categoriasList[0].nombre : "");
    setImagenUrl("");
    setImageFile(null);
    setEditando(null);
  };

  const abrirNuevo = () => {
    resetForm();
    setModalOpen(true);
  };

  const abrirEditar = (prod) => {
    resetForm();
    setEditando(prod);
    setNombre(prod.nombre || "");
    setEan(prod.ean || "");
    setSku(prod.sku || "");
    setUbicacion(prod.ubicacion || "");
    setCategoria(prod.categoria || (categoriasList.length > 0 ? categoriasList[0].nombre : ""));
    setImagenUrl(prod.imagen || "");
    setModalOpen(true);
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      // Preview
      const reader = new FileReader();
      reader.onload = (ev) => setImagenUrl(ev.target.result);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setImagenUrl(ev.target.result);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  useEffect(() => {
    const handlePaste = (e) => {
      if (!modalOpen) return;
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const base64Data = ev.target.result.split(",")[1];
              ejecutarAnalisisIA(base64Data, file.type);
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [modalOpen, categoriasList]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const aiFileInputRef = useRef(null);

  const ejecutarAnalisisIA = async (base64Data, mimeType) => {
    setIsAnalyzing(true);
    const toastId = toast.loading("Analizando etiqueta con IA...");
    
    try {
      const res = await fetch("/api/analizar-ficha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Data,
          mimeType,
          tipo: "auditoria_producto"
        })
      });
      
      const data = await res.json();
      
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error al analizar");
      }
      
      let resultStr = data.text || data.descripcionProceso || "";
      const jsonMatch = resultStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resultStr = jsonMatch[0];
      } else {
        resultStr = resultStr.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
      }
      
      const parsed = JSON.parse(resultStr);
      console.log("IA respuesta procesada:", parsed);

      const nombreExtraido = (parsed.nombre || parsed.Nombre || parsed.NOMBRE || parsed.producto || "").trim();
      const eanExtraido = String(parsed.ean || parsed.EAN || parsed.codigo_ean || parsed.codigo_barra || parsed.codBarra || "").trim();
      const skuExtraido = String(parsed.sku || parsed.SKU || parsed.codigo_sku || parsed.codigo || "").trim();
      const categoriaExtraida = (parsed.categoria || parsed.Categoria || parsed.CATEGORIA || "").trim();

      if (!nombreExtraido && !eanExtraido && !skuExtraido) {
        toast.error("La IA no detectó nombre, EAN ni SKU en esta foto. Asegúrate de enfocar la etiqueta.", { id: toastId, duration: 6000 });
        return;
      }
      
      // Validación inmediata: Verificar si EAN o SKU ya existen
      const pId = editando?.id;
      const eanExiste = eanExtraido ? productos.find(p => p.ean === eanExtraido && p.id !== pId) : null;
      const skuExiste = skuExtraido ? productos.find(p => p.sku === skuExtraido && p.id !== pId) : null;
      const productoExistente = eanExiste || skuExiste;
      
      if (productoExistente) {
        const leFaltaEan = !productoExistente.ean && eanExtraido;
        const leFaltaSku = !productoExistente.sku && skuExtraido;
        
        if (leFaltaEan || leFaltaSku) {
          const mensaje = `El producto "${productoExistente.nombre}" ya existe en la base de datos, pero le falta ${leFaltaEan ? 'el EAN' : ''}${leFaltaEan && leFaltaSku ? ' y ' : ''}${leFaltaSku ? 'el SKU' : ''}.\n\n¿Deseas editar el producto existente y rellenar estos datos faltantes automáticamente?`;
          if (window.confirm(mensaje)) {
            abrirEditar(productoExistente);
            if (leFaltaEan) setEan(eanExtraido);
            if (leFaltaSku) setSku(skuExtraido);
            toast.success("¡Datos rellenados! Revisa y haz clic en Guardar.", { id: toastId });
            return;
          }
        }
        
        toast.error(`⚠️ Etiqueta descartada. El producto ya existe: ${productoExistente.nombre}`, { duration: 5000, id: toastId });
        return;
      }
      
      if (nombreExtraido) setNombre(nombreExtraido);
      if (eanExtraido) setEan(eanExtraido);
      if (skuExtraido) setSku(skuExtraido);
      // Detección automática para Perfumería (higiene, cuidado personal y belleza)
      const terminosPerfumeria = [
        "shampoo", "champu", "jabon", "balsamo", "acondicionador", 
        "tintura", "toalla higienica", "toallas higienicas", "toallitas higienicas", 
        "desodorante", "antitranspirante", "crema corporal", "crema facial", 
        "pasta dental", "dentifrico", "cepillo dental", "enjuague bucal",
        "bloqueador", "protector solar", "tampon", "protectores diarios"
      ];
      const nombreNorm = normalizeText(nombreExtraido);
      let catFinal = categoriaExtraida;
      if (terminosPerfumeria.some(t => nombreNorm.includes(normalizeText(t)))) {
        catFinal = "Perfumería";
      }

      if (catFinal && catFinal !== "Todas") {
        const catExists = categoriasList.find(c => c.nombre.toLowerCase() === catFinal.toLowerCase());
        if (catExists) {
          setCategoria(catExists.nombre);
        } else {
          toast.success(`Sugerencia IA: "${catFinal}" (no existe)`, { duration: 4000 });
        }
      }
      
      toast.success("¡Datos extraídos con éxito!", { id: toastId });
      
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error al analizar la imagen", { id: toastId });
    } finally {
      setIsAnalyzing(false);
      if (aiFileInputRef.current) aiFileInputRef.current.value = "";
    }
  };

  const handleAiFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64Data = ev.target.result.split(",")[1];
        ejecutarAnalisisIA(base64Data, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !ean.trim() || !sku.trim()) {
      toast.error("El nombre, el EAN y el SKU son obligatorios");
      return;
    }

    // Verificar EAN y SKU duplicados
    const eanDuplicado = productos.find(p => p.ean === ean.trim() && p.id !== editando?.id);
    if (eanDuplicado) {
      toast.error("Ya existe un producto con este EAN");
      return;
    }
    const skuDuplicado = productos.find(p => p.sku === sku.trim() && p.id !== editando?.id);
    if (skuDuplicado) {
      toast.error("Ya existe un producto con este SKU");
      return;
    }

    setIsSubmitting(true);
    let finalImageUrl = imagenUrl;

    try {
      if (imageFile) {
        const fileRef = ref(storage, `auditoria/${Date.now()}_${imageFile.name}`);
        await uploadBytes(fileRef, imageFile);
        finalImageUrl = await getDownloadURL(fileRef);
      }

      const datos = {
        nombre: nombre.trim(),
        ean: ean.trim(),
        sku: sku.trim(),
        ubicacion: ubicacion.trim(),
        categoria,
        imagen: finalImageUrl,
        updatedAt: serverTimestamp()
      };

      if (editando) {
        await updateDoc(doc(db, "auditoria_productos", editando.id), datos);
        toast.success("Producto actualizado");
        setModalOpen(false);
        resetForm();
      } else {
        datos.createdAt = serverTimestamp();
        await addDoc(collection(db, "auditoria_productos"), datos);
        toast.success("¡Producto agregado! Puedes continuar agregando.");
        resetForm();
      }

      cargarProductos();
    } catch (error) {
      console.error("Error guardando:", error);
      toast.error("Hubo un error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const eliminarProducto = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este producto?")) {
      try {
        await deleteDoc(doc(db, "auditoria_productos", id));
        toast.success("Producto eliminado");
        cargarProductos();
      } catch (error) {
        console.error("Error al eliminar:", error);
        toast.error("No se pudo eliminar");
      }
    }
  };

  const toggleStock = async (prod) => {
    const nuevoEstado = prod.enStock === false ? true : false;
    const updateData = { enStock: nuevoEstado };
    
    if (!nuevoEstado) {
      updateData.fechaSinStock = serverTimestamp();
    }

    try {
      // Actualización optimista local
      setProductos(prev => prev.map(p => {
        if (p.id === prod.id) {
          return { ...p, enStock: nuevoEstado, fechaSinStock: !nuevoEstado ? new Date() : p.fechaSinStock };
        }
        return p;
      }));

      await updateDoc(doc(db, "auditoria_productos", prod.id), updateData);
      toast.success(nuevoEstado ? "Marcado con stock" : "Marcado sin stock");
    } catch (error) {
      toast.error("Error al actualizar stock");
      cargarProductos(); // revertir si falla
    }
  };

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoriaFiltro]);

    const totalPorCategoria = useMemo(() => {
    const counts = {};
    for (const p of productos) {
      if (p.categoria) {
        const norm = normalizeText(p.categoria);
        counts[norm] = (counts[norm] || 0) + 1;
      }
    }
    return counts;
  }, [productos]);

const productosFiltrados = productos.filter(p => {
    const nNombre = normalizeText(p.nombre);
    const nSku = normalizeText(p.sku);
    const nEan = normalizeText(p.ean);
    const nBusqueda = normalizeText(searchQuery);

    const matchSearch = nNombre.includes(nBusqueda) || nSku.includes(nBusqueda) || nEan.includes(nBusqueda);
    const matchCat = categoriaFiltro === "Todas" || p.categoria === categoriaFiltro;

    return matchSearch && matchCat;
  });

  const totalPages = Math.ceil(productosFiltrados.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProductos = productosFiltrados.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Calcular ventana de 5 páginas
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  const uniqueCategorias = sortCategorias(Array.from(new Map(categoriasList.map(c => [c.nombre, c])).values()));

  return (
    <div className={`min-h-screen ${t.bg} flex flex-col relative overflow-hidden font-sans`}>
      <DecorativeBackground color1="purple-600" color2="indigo-600" />
      
      {/* Header */}
      <header className={`relative z-10 px-6 py-4 flex items-center justify-between border-b ${t.border} ${t.bgNav}`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={onBackToSelector}
            className={`w-10 h-10 flex items-center justify-center rounded-xl ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-blue-400 transition-colors shadow-sm mr-2`}
            title="Volver al Selector"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="material-symbols-outlined text-white" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>
              fact_check
            </span>
          </div>
          <div>
            <h1 className={`text-xl font-black ${t.text}`}>Auditoría Jumbo</h1>
            <p className={`text-xs ${t.textSecondary}`}>Inventario y Control</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className={`text-sm font-bold ${t.text}`}>{user?.nombre || user?.email}</p>
            <p className={`text-xs ${t.textSecondary} uppercase tracking-wider`}>{rol}</p>
          </div>
          <button 
            onClick={logout}
            className={`w-10 h-10 flex items-center justify-center rounded-xl ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-red-400 transition-colors shadow-sm`}
            title="Cerrar Sesión"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col p-6 overflow-y-auto">
        <div className="max-w-6xl w-full mx-auto space-y-6">
          
          {/* Categorías (Filtros Rápidos) */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => scrollCategories('left')}
              className={`hidden sm:flex shrink-0 w-9 h-9 items-center justify-center rounded-xl ${t.bgCard} ${t.textSecondary} border ${t.border} hover:text-purple-400 transition-colors shadow-sm`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_left</span>
            </button>

            <div 
              ref={categoriesRef}
              className="flex-1 flex gap-2.5 overflow-x-auto pb-2 pt-2 px-8 items-center no-scrollbar scroll-smooth snap-x snap-mandatory" 
              style={{ 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none',
                maskImage: 'linear-gradient(to right, transparent 0%, black 36px, black calc(100% - 36px), transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 36px, black calc(100% - 36px), transparent 100%)'
              }}
            >
              <button
                onClick={() => setCategoriaFiltro("Todas")}
                className={`shrink-0 snap-start px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
                  categoriaFiltro === "Todas" 
                    ? "bg-purple-600 text-white border-purple-400 ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105 shadow-lg shadow-purple-500/30 opacity-100 z-10"
                    : `${t.bgCard} ${t.textSecondary} ${t.border} hover:text-purple-400 opacity-80 hover:opacity-100 hover:scale-[1.02]`
                }`}
              >
                <span>Todas</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                  categoriaFiltro === "Todas" ? "bg-black/25 text-white" : "bg-white/10 text-slate-300"
                }`}>
                  {productos.length}
                </span>
              </button>
              {uniqueCategorias.map(cat => {
                const estilo = getCategoriaEstilo(cat.nombre);
                const count = totalPorCategoria[normalizeText(cat.nombre)] || 0;
                const isSelected = categoriaFiltro === cat.nombre;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaFiltro(cat.nombre)}
                    className={`shrink-0 snap-start px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${estilo.bg} ${
                      isSelected 
                        ? `ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105 shadow-lg ${estilo.shadow} opacity-100 z-10`
                        : "opacity-80 hover:opacity-100 hover:scale-[1.02]"
                    }`}
                  >
                    <span>{cat.nombre}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-black ${estilo.badge}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => scrollCategories('right')}
              className={`hidden sm:flex shrink-0 w-9 h-9 items-center justify-center rounded-xl ${t.bgCard} ${t.textSecondary} border ${t.border} hover:text-purple-400 transition-colors shadow-sm`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_right</span>
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:max-w-md">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>search</span>
                </span>
                <input 
                  type="text" 
                  placeholder="Buscar por nombre, EAN o SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-xl ${t.bgInput} border ${t.border} ${t.text} focus:outline-none focus:border-purple-500 transition-colors`}
                />
              </div>
              <button
                onClick={() => setManageCatOpen(true)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl border border-dashed border-purple-500/50 text-purple-400 hover:bg-purple-500/10 transition-colors shrink-0`}
                title="Editar Categorías"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span>
              </button>
            </div>

            <button 
              onClick={abrirNuevo}
              className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
              Agregar Producto
            </button>
          </div>

          {/* Grid de Productos */}
          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className={`py-20 flex flex-col justify-center items-center ${t.bgCard} rounded-2xl border ${t.border}`}>
              <span className="material-symbols-outlined text-slate-500 mb-4" style={{ fontSize: 48 }}>inventory_2</span>
              <p className={`${t.textSecondary} text-center`}>No hay productos registrados o no coinciden con la búsqueda.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedProductos.map(prod => (
                <div 
                  key={prod.id} 
                  onClick={() => abrirEditar(prod)}
                  className={`${t.bgCard} rounded-2xl border ${t.border} overflow-hidden flex flex-col hover:shadow-xl transition-shadow group cursor-pointer`}
                >
                  <div className="relative aspect-square bg-black/10 flex items-center justify-center overflow-hidden">
                    {prod.imagen ? (
                      <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 48 }}>image</span>
                    )}
                    {/* Badge Categoría */}
                    {(() => {
                      const catEstilo = getCategoriaEstilo(prod.categoria);
                      return (
                        <div className={`absolute top-2 right-2 backdrop-blur-md text-[10px] font-extrabold px-2 py-1 rounded border uppercase tracking-wider shadow-sm ${catEstilo.bg}`}>
                          {prod.categoria}
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h3 className={`font-bold ${t.text} line-clamp-2 leading-tight`}>{prod.nombre}</h3>
                    </div>
                    
                    <div className="flex flex-col gap-1 mb-3 self-start">
                      <p className={`text-[11px] ${t.textSecondary} font-mono bg-black/10 px-2 py-0.5 rounded border ${t.border}`}>EAN: {prod.ean}</p>
                      <p className={`text-[11px] ${t.textSecondary} font-mono bg-black/10 px-2 py-0.5 rounded border ${t.border}`}>SKU: {prod.sku}</p>
                    </div>
                    
                    <div className="mt-auto flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sm text-purple-400">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
                        <span className="truncate">{prod.ubicacion || "Sin ubicación"}</span>
                      </div>
                      
                      
                    </div>
                  </div>
                </div>
              ))}
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl border ${t.border} ${t.bgCard} ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:text-purple-400'}`}
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  
                  {pageNumbers.map(num => (
                    <button
                      key={num}
                      onClick={() => setCurrentPage(num)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold transition-all ${
                        currentPage === num 
                          ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30" 
                          : `${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-purple-400`
                      }`}
                    >
                      {num}
                    </button>
                  ))}

                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl border ${t.border} ${t.bgCard} ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:text-purple-400'}`}
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* Modal Agregar/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`${t.bgCard} w-full max-w-lg rounded-3xl shadow-2xl border ${t.border} overflow-hidden flex flex-col max-h-[90vh]`}>
            <div className={`px-6 py-4 border-b ${t.border} flex justify-between items-center`}>
              <h2 className={`text-xl font-bold ${t.text}`}>
                {editando ? "Editar Producto" : "Nuevo Producto Jumbo"}
              </h2>
              <button 
                onClick={() => setModalOpen(false)}
                className={`w-8 h-8 flex items-center justify-center rounded-full ${t.bgInput} ${t.textSecondary} hover:text-white transition-colors`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form id="prodForm" onSubmit={guardarProducto} className="space-y-4">
                
                {/* Imagen */}
                <div className="flex flex-col items-center gap-3">
                  <div 
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="relative w-32 h-32 rounded-2xl bg-black/20 border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden group"
                  >
                    {imagenUrl ? (
                      <img src={imagenUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 32 }}>add_a_photo</span>
                    )}
                    
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-center p-2">
                      <span className="text-white text-xs font-bold uppercase tracking-widest leading-tight">Subir Portada</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAiFileChange}
                    className="hidden"
                    ref={aiFileInputRef}
                  />
                  <button
                    type="button"
                    onClick={() => aiFileInputRef.current?.click()}
                    disabled={isAnalyzing}
                    className="mt-2 text-xs font-bold px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      {isAnalyzing ? "hourglass_empty" : "auto_awesome"}
                    </span>
                    {isAnalyzing ? "Analizando..." : "Extraer Datos con IA (Ctrl+V)"}
                  </button>
                </div>

                {/* Campos */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider ${t.textSecondary} mb-1`}>Nombre del Producto *</label>
                  <input 
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl ${t.bgInput} border ${t.border} ${t.text} focus:outline-none focus:border-purple-500 transition-colors`}
                    placeholder="Ej: Galletas Tritón"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${t.textSecondary} mb-1`}>EAN *</label>
                    <input 
                      type="text"
                      required
                      value={ean}
                      onChange={(e) => setEan(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl ${t.bgInput} border ${
                        ean.trim() 
                          ? (productos.find(p => p.ean === ean.trim() && p.id !== editando?.id) 
                              ? 'border-red-500 focus:border-red-500 bg-red-500/5' 
                              : 'border-green-500 focus:border-green-500 bg-green-500/5')
                          : `${t.border} focus:border-purple-500`
                      } ${t.text} focus:outline-none transition-colors`}
                      placeholder="Ej: 7791234..."
                    />
                    {ean.trim() && productos.find(p => p.ean === ean.trim() && p.id !== editando?.id) && (
                      <p className="text-red-500 text-xs mt-1.5 font-bold animate-pulse">
                        ⚠️ Ya existe: {productos.find(p => p.ean === ean.trim() && p.id !== editando?.id).nombre}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${t.textSecondary} mb-1`}>SKU *</label>
                    <input 
                      type="text"
                      required
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl ${t.bgInput} border ${
                        sku.trim() 
                          ? (productos.find(p => p.sku === sku.trim() && p.id !== editando?.id) 
                              ? 'border-red-500 focus:border-red-500 bg-red-500/5' 
                              : 'border-green-500 focus:border-green-500 bg-green-500/5')
                          : `${t.border} focus:border-purple-500`
                      } ${t.text} focus:outline-none transition-colors`}
                      placeholder="Ej: 102938"
                    />
                    {sku.trim() && productos.find(p => p.sku === sku.trim() && p.id !== editando?.id) && (
                      <p className="text-red-500 text-xs mt-1.5 font-bold animate-pulse">
                        ⚠️ Ya existe: {productos.find(p => p.sku === sku.trim() && p.id !== editando?.id).nombre}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${t.textSecondary} mb-1`}>Categoría</label>
                    <div className="relative">
                      <select 
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl ${t.bgInput} border ${t.border} ${t.text} focus:outline-none focus:border-purple-500 transition-colors appearance-none`}
                      >
                        <option value="">Selecciona...</option>
                        {uniqueCategorias.map(cat => (
                          <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        expand_more
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${t.textSecondary} mb-1`}>Ubicación</label>
                    <input 
                      type="text"
                      value={ubicacion}
                      onChange={(e) => setUbicacion(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl ${t.bgInput} border ${t.border} ${t.text} focus:outline-none focus:border-purple-500 transition-colors`}
                      placeholder="Ej: Pasillo 4, Gondola 2"
                    />
                  </div>
                </div>

              </form>
            </div>

            <div className={`px-6 py-4 border-t ${t.border} flex justify-between items-center gap-3`}>
              {editando ? (
                <button 
                  type="button"
                  onClick={() => {
                    eliminarProducto(editando.id);
                    setModalOpen(false);
                  }}
                  className={`px-4 py-2.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors font-bold flex items-center gap-2`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                  <span className="hidden sm:inline">Eliminar</span>
                </button>
              ) : (
                <div />
              )}
              
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className={`px-5 py-2.5 rounded-xl font-semibold ${t.textSecondary} hover:text-white transition-colors`}
                >
                  Cancelar
                </button>
                <button 
                  form="prodForm"
                  type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: 20 }}>refresh</span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>save</span>
                    Guardar Producto
                  </>
                )}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {manageCatOpen && (
        <ManageCategoriasAuditoria
          categorias={categoriasList}
          onClose={() => setManageCatOpen(false)}
          onUpdate={recargarCategorias}
        />
      )}
    </div>
  );
}
