import React, { useState, useEffect, useRef } from "react";
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
  const [sku, setSku] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  
  const categoriesRef = useRef(null);

  const scrollCategories = (dir) => {
    if (categoriesRef.current) {
      const scrollAmount = 200;
      categoriesRef.current.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      // Cargar productos
      const pSnap = await getDocs(collection(db, "auditoria_productos"));
      setProductos(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Cargar categorias
      const cSnap = await getDocs(collection(db, "auditoria_categorias"));
      if (cSnap.empty) {
        // Inicializar
        for (const cat of DEFAULT_CATEGORIAS) {
          await addDoc(collection(db, "auditoria_categorias"), { nombre: cat });
        }
        const cSnapNew = await getDocs(collection(db, "auditoria_categorias"));
        setCategoriasList(cSnapNew.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        setCategoriasList(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
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
    setCategoriasList(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const cargarProductos = async () => {
    try {
      const pSnap = await getDocs(collection(db, "auditoria_productos"));
      setProductos(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error al cargar productos:", error);
    }
  };

  const resetForm = () => {
    setNombre("");
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

  const guardarProducto = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !sku.trim()) {
      toast.error("El nombre y el SKU son obligatorios");
      return;
    }

    // Verificar SKU duplicado
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
        sku: sku.trim(),
        ubicacion: ubicacion.trim(),
        categoria,
        imagen: finalImageUrl,
        updatedAt: serverTimestamp()
      };

      if (editando) {
        await updateDoc(doc(db, "auditoria_productos", editando.id), datos);
        toast.success("Producto actualizado");
      } else {
        datos.createdAt = serverTimestamp();
        datos.enStock = true; // Por defecto con stock
        await addDoc(collection(db, "auditoria_productos"), datos);
        toast.success("Producto creado");
      }

      setModalOpen(false);
      resetForm();
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

  const productosFiltrados = productos.filter(p => {
    const nNombre = normalizeText(p.nombre);
    const nSku = normalizeText(p.sku);
    const nBusqueda = normalizeText(searchQuery);

    const matchSearch = nNombre.includes(nBusqueda) || nSku.includes(nBusqueda);
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

  const uniqueCategorias = Array.from(new Map(categoriasList.map(c => [c.nombre, c])).values());

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
              className="flex-1 flex gap-2 overflow-x-auto pb-2 pt-2 items-center no-scrollbar scroll-smooth" 
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <button
                onClick={() => setCategoriaFiltro("Todas")}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                  categoriaFiltro === "Todas" 
                    ? "bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/30"
                    : `${t.bgCard} ${t.textSecondary} ${t.border} hover:text-purple-400`
                }`}
              >
                Todas
              </button>
              {uniqueCategorias.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaFiltro(cat.nombre)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                    categoriaFiltro === cat.nombre 
                      ? "bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/30"
                      : `${t.bgCard} ${t.textSecondary} ${t.border} hover:text-purple-400`
                  }`}
                >
                  {cat.nombre}
                </button>
              ))}
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
                  placeholder="Buscar por nombre o SKU..."
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
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded border border-white/10 uppercase tracking-wider">
                      {prod.categoria}
                    </div>
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h3 className={`font-bold ${t.text} line-clamp-2 leading-tight`}>{prod.nombre}</h3>
                    </div>
                    
                    <p className={`text-xs ${t.textSecondary} mb-3 font-mono bg-black/10 self-start px-2 py-0.5 rounded border ${t.border}`}>SKU: {prod.sku}</p>
                    
                    <div className="mt-auto flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sm text-purple-400">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
                        <span className="truncate">{prod.ubicacion || "Sin ubicación"}</span>
                      </div>
                      
                      <div className={`flex items-center justify-between pt-2 border-t ${t.border}`}>
                        <div>
                          <span className={`text-xs font-bold ${prod.enStock !== false ? "text-emerald-400" : "text-red-400"}`}>
                            {prod.enStock !== false ? "Stock: ON" : "Stock: OFF"}
                          </span>
                          {prod.fechaSinStock && prod.enStock === false && (
                            <p className="text-[10px] text-slate-500 leading-none mt-0.5">
                              Desde: {prod.fechaSinStock.toDate ? prod.fechaSinStock.toDate().toLocaleDateString() : new Date(prod.fechaSinStock).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStock(prod);
                          }}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${prod.enStock !== false ? 'bg-emerald-500' : 'bg-slate-600'}`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${prod.enStock !== false ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
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
                      <span className="text-white text-xs font-bold uppercase tracking-widest leading-tight">Subir Foto o Arrastrar</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
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
                    <label className={`block text-xs font-bold uppercase tracking-wider ${t.textSecondary} mb-1`}>SKU *</label>
                    <input 
                      type="text"
                      required
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl ${t.bgInput} border ${t.border} ${t.text} focus:outline-none focus:border-purple-500 transition-colors`}
                      placeholder="Ej: 102938"
                    />
                  </div>

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
