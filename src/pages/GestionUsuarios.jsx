import { useState, useEffect } from "react";
import BottomNav from "../components/BottomNav";
import { db, auth } from "../firebase/config";
import { collection, onSnapshot, doc, updateDoc, getDocs, deleteDoc, setDoc, addDoc, writeBatch, query, where } from "firebase/firestore";
import { createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { useTheme } from "../context/ThemeContext";
import toast, { Toaster } from "react-hot-toast";
import AppSidebar from "../components/AppSidebar";
import Navbar from "../components/Navbar";

const ROL_BADGE = {
  unico:   { label: "Único",   cls: "bg-blue-500/15 text-blue-400 border border-blue-500/30"     },
  admin:   { label: "Admin",   cls: "bg-amber-500/15 text-amber-400 border border-amber-500/30"   },
  usuario: { label: "Usuario", cls: "bg-slate-500/15 text-slate-400 border border-slate-500/30"   },
};

const TABS = [
  { label: "Usuarios",    icon: "group"       },
  { label: "Secciones",   icon: "domain"      },
  { label: "Categorías",  icon: "category"    },
  { label: "Funciones",   icon: "shield_person"},
];

const COLORES = [
  { id: "red",     preview: "bg-red-400",     bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/20"     },
  { id: "orange",  preview: "bg-orange-400",  bg: "bg-orange-500/15",  text: "text-orange-400",  border: "border-orange-500/20"  },
  { id: "amber",   preview: "bg-amber-400",   bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-500/20"   },
  { id: "emerald", preview: "bg-emerald-400", bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20" },
  { id: "cyan",    preview: "bg-cyan-400",    bg: "bg-cyan-500/15",    text: "text-cyan-400",    border: "border-cyan-500/20"    },
  { id: "blue",    preview: "bg-blue-400",    bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/20"    },
  { id: "purple",  preview: "bg-purple-400",  bg: "bg-purple-500/15",  text: "text-purple-400",  border: "border-purple-500/20"  },
  { id: "pink",    preview: "bg-pink-400",    bg: "bg-pink-500/15",    text: "text-pink-400",    border: "border-pink-500/20"    },
  { id: "slate",   preview: "bg-slate-400",   bg: "bg-slate-500/15",   text: "text-slate-400",   border: "border-slate-500/20"   },
];

export default function GestionUsuarios({ user, rol, onBack, onNavegar }) {
  const { t } = useTheme();
  const [tabActiva, setTabActiva] = useState(0);
  const [busqueda, setBusqueda] = useState("");

  // Usuarios
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCrearUsuario, setShowCrearUsuario] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: "", apellido: "", email: "", username: "" });
  const [creando, setCreando] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState(null);
  const [formEditar, setFormEditar] = useState({ nombre: "", username: "", telefono: "", rol: "" });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // Secciones
  const [secciones, setSecciones] = useState([]);
  const [nuevaSeccion, setNuevaSeccion] = useState("");
  const [editandoSeccion, setEditandoSeccion] = useState(null);
  const [nombreEditadoSeccion, setNombreEditadoSeccion] = useState("");

  // Categorías
  const [categorias, setCategorias] = useState([]);
  const [nuevaCat, setNuevaCat] = useState({ nombre: "", color: "blue" });
  const [editandoCat, setEditandoCat] = useState(null);
  const [guardandoCat, setGuardandoCat] = useState(false);

  // Funciones
  const [limpiando, setLimpiando] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "usuarios"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => ({ unico: 0, admin: 1, usuario: 2 }[a.rol] ?? 3) - ({ unico: 0, admin: 1, usuario: 2 }[b.rol] ?? 3));
      setUsuarios(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "secciones"), (snap) => {
      setSecciones(snap.docs.map(d => ({ id: d.id, nombre: d.data().nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categorias"), (snap) => {
      setCategorias(snap.docs.map(d => ({ id: d.id, nombre: d.data().nombre, color: d.data().color || "blue" })).sort((a, b) => a.nombre.localeCompare(b.nombre)));
    });
    return () => unsub();
  }, []);

  // ── Lógica Usuarios ──
  const puedeGestionar = (u) => {
    if (u.rol === "unico") return false;
    if (rol === "unico") return true;
    if (rol === "admin") return u.rol !== "admin";
    return false;
  };
  const opcionesRol = () => rol === "unico" ? ["usuario", "admin"] : ["usuario"];

  const abrirEditar = (u) => {
    setEditandoUsuario(u);
    setFormEditar({ nombre: u.nombre || "", username: u.username || "", telefono: u.telefono || "", rol: u.rol || "usuario" });
  };

  const handleGuardarEdicion = async () => {
    if (!formEditar.nombre || !formEditar.username) { toast.error("Nombre y username son obligatorios"); return; }
    if (usuarios.some(u => u.username?.toLowerCase() === formEditar.username.toLowerCase() && u.id !== editandoUsuario.id)) { toast.error("Ese username ya está en uso"); return; }
    setGuardandoEdicion(true);
    try {
      await updateDoc(doc(db, "usuarios", editandoUsuario.id), { nombre: formEditar.nombre.trim(), username: formEditar.username.trim().toLowerCase(), telefono: formEditar.telefono.trim(), rol: formEditar.rol });
      toast.success("Usuario actualizado ✅");
      setEditandoUsuario(null);
    } catch { toast.error("Error al actualizar"); }
    setGuardandoEdicion(false);
  };

  const handleEliminarUsuario = async (u) => {
    if (!confirm(`¿Eliminar a ${u.nombre || u.email}?`)) return;
    try { await deleteDoc(doc(db, "usuarios", u.id)); toast.success("Usuario eliminado ✅"); }
    catch { toast.error("Error al eliminar"); }
  };

  const handleCrearUsuario = async () => {
    const { nombre, apellido, email, username } = nuevoUsuario;
    if (!nombre || !apellido || !email || !username) { toast.error("Completa todos los campos"); return; }
    if (usuarios.some(u => u.username?.toLowerCase() === username.toLowerCase())) { toast.error("Username ya en uso"); return; }
    setCreando(true);
    try {
      const pass = Math.random().toString(36).slice(-10) + "A1!";
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: `${nombre} ${apellido}` });
      await setDoc(doc(db, "usuarios", cred.user.uid), { email, nombre: `${nombre} ${apellido}`, username: username.trim(), rol: "usuario", fechaRegistro: new Date() });
      await sendPasswordResetEmail(auth, email);
      toast.success(`Usuario creado. Correo enviado a ${email}`);
      setNuevoUsuario({ nombre: "", apellido: "", email: "", username: "" });
      setShowCrearUsuario(false);
    } catch (err) {
      toast.error(err.code === "auth/email-already-in-use" ? "Correo ya registrado" : "Error al crear usuario");
    }
    setCreando(false);
  };

  // ── Lógica Secciones ──
  const handleAgregarSeccion = async () => {
    if (!nuevaSeccion.trim()) return;
    if (secciones.some(s => s.nombre.toLowerCase() === nuevaSeccion.toLowerCase())) { toast.error("Sección ya existe"); return; }
    await addDoc(collection(db, "secciones"), { nombre: nuevaSeccion.trim() });
    toast.success("Sección agregada ✅");
    setNuevaSeccion("");
  };

  const handleEliminarSeccion = async (id) => {
    if (!confirm("¿Eliminar esta sección?")) return;
    await deleteDoc(doc(db, "secciones", id));
    toast.success("Sección eliminada ✅");
  };

  const handleEditarSeccion = async (id) => {
    if (!nombreEditadoSeccion.trim()) return;
    await updateDoc(doc(db, "secciones", id), { nombre: nombreEditadoSeccion.trim() });
    toast.success("Sección actualizada ✅");
    setEditandoSeccion(null);
  };

  // ── Lógica Categorías ──
  const handleAgregarCategoria = async () => {
    if (!nuevaCat.nombre.trim()) { toast.error("Escribe un nombre"); return; }
    if (categorias.some(c => c.nombre.toLowerCase() === nuevaCat.nombre.toLowerCase())) { toast.error("Categoría ya existe"); return; }
    await addDoc(collection(db, "categorias"), { nombre: nuevaCat.nombre.trim(), color: nuevaCat.color });
    toast.success("Categoría agregada ✅");
    setNuevaCat({ nombre: "", color: "blue" });
  };

  const handleEliminarCategoria = async (id) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    await deleteDoc(doc(db, "categorias", id));
    toast.success("Categoría eliminada ✅");
  };

  const handleGuardarCategoria = async () => {
    if (!editandoCat.nombre.trim()) { toast.error("El nombre no puede estar vacío"); return; }
    setGuardandoCat(true);
    try {
      const nombreAnterior = categorias.find(c => c.id === editandoCat.id)?.nombre;
      const nombreNuevo = editandoCat.nombre.trim();

      // 1. Actualizar la categoría
      await updateDoc(doc(db, "categorias", editandoCat.id), { nombre: nombreNuevo, color: editandoCat.color });

      // 2. Si cambió el nombre, actualizar todos los productos de merma con esa categoría
      if (nombreAnterior && nombreAnterior !== nombreNuevo) {
        const snap = await getDocs(query(collection(db, "merma"), where("categoria", "==", nombreAnterior)));
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach(d => batch.update(d.ref, { categoria: nombreNuevo }));
          await batch.commit();
          toast.success(`Categoría actualizada y ${snap.size} producto(s) en merma sincronizados ✅`);
        } else {
          toast.success("Categoría actualizada ✅");
        }
      } else {
        toast.success("Categoría actualizada ✅");
      }
      setEditandoCat(null);
    } catch { toast.error("Error al actualizar"); }
    setGuardandoCat(false);
  };

  // ── Funciones ──
  const eliminarDuplicados = async () => {
    if (!confirm("¿Eliminar duplicados en Merma? No se puede deshacer.")) return;
    setLimpiando(true);
    try {
      const snap = await getDocs(collection(db, "merma"));
      const vistos = {}, aEliminar = [];
      snap.docs.forEach(d => {
        const codigo = d.data().codigo?.trim().toLowerCase();
        if (!codigo) return;
        if (vistos[codigo]) aEliminar.push(d.id);
        else vistos[codigo] = true;
      });
      for (const id of aEliminar) await deleteDoc(doc(db, "merma", id));
      toast.success(`${aEliminar.length} duplicado(s) eliminado(s)`);
    } catch { toast.error("Error al limpiar duplicados"); }
    setLimpiando(false);
  };

  // ── Helpers UI ──
  const iniciales = (nombre) => (nombre || "?").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  const getColor = (id) => COLORES.find(c => c.id === id) || COLORES[5];
  const inputCls = `w-full ${t.bgInput} ${t.text} px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm border ${t.border} placeholder:text-slate-500`;

  const usuariosFiltrados = usuarios.filter(u =>
    !busqueda || u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || u.email?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className={`${t.bg} flex h-screen overflow-hidden`}>
      <Toaster />

      {/* Sidebar desktop */}
      <div className="hidden md:block flex-shrink-0">
        <AppSidebar user={user} rol={rol} moduloActivo="usuarios" onNavegar={onNavegar} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="hidden md:block flex-shrink-0"><Navbar user={user} rol={rol} onNavegar={onNavegar} /></div>

        {/* ════════════ MOBILE ════════════ */}
        <div className="md:hidden flex flex-col flex-1 overflow-hidden">

          {/* Header móvil */}
          <header className={`${t.bgNav} border-b ${t.border} px-4 pt-5 pb-0 flex-shrink-0`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button onClick={onBack} className={`w-9 h-9 flex items-center justify-center rounded-full ${t.hover} ${t.text}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
                </button>
                <h2 className={`${t.text} text-xl font-bold`}>Gestionamiento</h2>
              </div>
              {tabActiva === 0 && (rol === "admin" || rol === "unico") && (
                <button onClick={() => setShowCrearUsuario(true)} className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/25">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person_add</span>
                </button>
              )}
            </div>

            {/* Buscador (solo usuarios) */}
            {tabActiva === 0 && (
              <div className="relative mb-4">
                <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 ${t.textSecondary}`} style={{ fontSize: 18 }}>search</span>
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  className={`w-full ${t.bgInput} ${t.text} pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Buscar usuarios por nombre o cargo..." />
              </div>
            )}

            {/* Tabs móvil */}
            <div className="flex gap-5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {TABS.map((tab, i) => (
                <button key={i} onClick={() => setTabActiva(i)}
                  className={`pb-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    tabActiva === i ? "border-blue-500 text-blue-400" : `border-transparent ${t.textSecondary}`
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

            {/* ── USUARIOS móvil ── */}
            {tabActiva === 0 && (
              <>
                {(rol === "admin" || rol === "unico") && (
                  <button onClick={() => setShowCrearUsuario(true)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person_add</span>
                    Crear nuevo usuario
                  </button>
                )}
                <div className="flex items-center justify-between py-1">
                  <span className={`${t.textSecondary} text-xs font-bold uppercase tracking-widest`}>Listado de Personal</span>
                  <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">{usuariosFiltrados.length} Usuarios</span>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-12"><p className={`${t.textSecondary} text-sm`}>Cargando...</p></div>
                ) : (
                  usuariosFiltrados.map(u => {
                    const badge = ROL_BADGE[u.rol] || ROL_BADGE.usuario;
                    return (
                      <div key={u.id} className={`${t.bgCard} border ${t.border} p-4 rounded-xl flex items-start gap-3`}
                        style={{ background: "rgba(37,140,244,0.04)", backdropFilter: "blur(12px)" }}>
                        <div className="relative flex-shrink-0">
                          {u.photoURL
                            ? <img src={u.photoURL} className="w-14 h-14 rounded-full object-cover border-2 border-blue-500/30" alt={u.nombre} />
                            : <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg border-2 ${badge.cls}`}>
                                {iniciales(u.nombre || u.email)}
                              </div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className={`${t.text} font-bold truncate`}>{u.nombre || "Sin nombre"}</h3>
                              <p className={`${t.textSecondary} text-xs truncate`}>{u.email}</p>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase flex-shrink-0 ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </div>
                          {puedeGestionar(u) && (
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => abrirEditar(u)}
                                className={`flex-1 flex items-center justify-center gap-1 ${t.bgInput} border ${t.border} ${t.textSecondary} text-xs font-medium py-2 rounded-lg transition-colors hover:text-blue-400`}>
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span> Editar
                              </button>
                              {rol === "unico" && (
                                <button onClick={() => handleEliminarUsuario(u)}
                                  className={`flex-1 flex items-center justify-center gap-1 ${t.bgInput} border ${t.border} ${t.textSecondary} text-xs font-medium py-2 rounded-lg transition-colors hover:text-red-400`}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span> Eliminar
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* ── SECCIONES móvil ── */}
            {tabActiva === 1 && (
              <>
                <div className={`${t.bgCard} border ${t.border} rounded-xl p-4`}>
                  <p className={`${t.textSecondary} text-xs font-bold uppercase tracking-widest mb-3`}>Nueva sección</p>
                  <div className="flex gap-2">
                    <input value={nuevaSeccion} onChange={e => setNuevaSeccion(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleAgregarSeccion()}
                      className={inputCls} placeholder="Nombre de la sección..." />
                    <button onClick={handleAgregarSeccion} className="flex-shrink-0 bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl font-bold text-sm transition">
                      + Añadir
                    </button>
                  </div>
                </div>
                <p className={`${t.textSecondary} text-xs font-bold uppercase tracking-widest px-1`}>Secciones de Fichas Técnicas</p>
                {secciones.map(s => (
                  <div key={s.id} className={`${t.bgCard} border ${t.border} rounded-xl p-4`}>
                    {editandoSeccion === s.id ? (
                      <div className="flex gap-2">
                        <input value={nombreEditadoSeccion} onChange={e => setNombreEditadoSeccion(e.target.value)}
                          className={`flex-1 ${t.bgInput} ${t.text} px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500`} autoFocus />
                        <button onClick={() => handleEditarSeccion(s.id)} className="bg-blue-600 text-white text-xs font-bold px-3 rounded-lg">✓</button>
                        <button onClick={() => setEditandoSeccion(null)} className={`${t.bgInput} ${t.textSecondary} text-xs px-3 rounded-lg`}>✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 bg-blue-500 rounded-full" />
                          <div>
                            <p className={`${t.text} font-semibold text-sm`}>{s.nombre}</p>
                            <p className={`${t.textSecondary} text-xs`}>Sección de fichas técnicas</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditandoSeccion(s.id); setNombreEditadoSeccion(s.nombre); }}
                            className={`${t.bgInput} border ${t.border} ${t.textSecondary} text-xs px-3 py-1.5 rounded-lg hover:text-blue-400 transition`}>
                            Editar
                          </button>
                          <button onClick={() => handleEliminarSeccion(s.id)}
                            className={`${t.bgInput} border ${t.border} ${t.textSecondary} text-xs px-3 py-1.5 rounded-lg hover:text-red-400 transition`}>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* ── CATEGORÍAS móvil ── */}
            {tabActiva === 2 && (
              <>
                <div className={`${t.bgCard} border ${t.border} rounded-xl p-4`}>
                  <p className={`${t.textSecondary} text-xs font-bold uppercase tracking-widest mb-3`}>Nueva categoría</p>
                  <input value={nuevaCat.nombre} onChange={e => setNuevaCat(p => ({ ...p, nombre: e.target.value }))}
                    className={`${inputCls} mb-3`} placeholder="Ej: Congelados" />
                  <p className={`${t.textSecondary} text-xs mb-2`}>Color distintivo</p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {COLORES.map(c => (
                      <button key={c.id} onClick={() => setNuevaCat(p => ({ ...p, color: c.id }))}
                        className={`w-7 h-7 rounded-full ${c.preview} transition-all ${nuevaCat.color === c.id ? "ring-2 ring-offset-2 ring-offset-transparent ring-white scale-110" : "opacity-70 hover:opacity-100"}`} />
                    ))}
                  </div>
                  <button onClick={handleAgregarCategoria} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-sm transition">
                    Guardar Categoría
                  </button>
                </div>
                <p className={`${t.textSecondary} text-xs font-bold uppercase tracking-widest px-1`}>Listado de Categorías — {categorias.length} registradas</p>
                {categorias.map(cat => {
                  const col = getColor(cat.color);
                  return (
                    <div key={cat.id} className={`${t.bgCard} border ${t.border} rounded-xl p-4`}>
                      {editandoCat?.id === cat.id ? (
                        <div>
                          <input value={editandoCat.nombre} onChange={e => setEditandoCat(p => ({ ...p, nombre: e.target.value }))}
                            className={`${inputCls} mb-3`} autoFocus />
                          <div className="flex gap-2 flex-wrap mb-3">
                            {COLORES.map(c => (
                              <button key={c.id} onClick={() => setEditandoCat(p => ({ ...p, color: c.id }))}
                                className={`w-7 h-7 rounded-full ${c.preview} transition-all ${editandoCat.color === c.id ? "ring-2 ring-offset-2 ring-white scale-110" : "opacity-70"}`} />
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditandoCat(null)} className={`flex-1 ${t.bgInput} ${t.textSecondary} text-xs py-2 rounded-lg`}>Cancelar</button>
                            <button onClick={handleGuardarCategoria} disabled={guardandoCat} className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-lg">
                              {guardandoCat ? "Guardando..." : "Guardar"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-1 h-8 ${col.preview} rounded-full`} />
                            <div>
                              <p className={`${t.text} font-bold text-sm`}>{cat.nombre}</p>
                              <p className={`${t.textSecondary} text-xs`}>Categoría de productos</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditandoCat({ ...cat })}
                              className={`${t.bgInput} border ${t.border} ${t.textSecondary} text-xs px-3 py-1.5 rounded-lg hover:text-blue-400 transition`}>Editar</button>
                            <button onClick={() => handleEliminarCategoria(cat.id)}
                              className={`${t.bgInput} border ${t.border} ${t.textSecondary} text-xs px-3 py-1.5 rounded-lg hover:text-red-400 transition`}>Eliminar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* ── FUNCIONES móvil ── */}
            {tabActiva === 3 && (
              <>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-start gap-3">
                  <span className="material-symbols-outlined text-orange-400 flex-shrink-0" style={{ fontSize: 20 }}>warning</span>
                  <div>
                    <p className="text-orange-400 font-bold text-sm">Funciones del Sistema</p>
                    <p className={`${t.textSecondary} text-xs mt-0.5`}>Herramientas avanzadas de mantenimiento. Úsalas con cuidado.</p>
                  </div>
                </div>
                <div className={`${t.bgCard} border ${t.border} rounded-xl p-5`}>
                  <h4 className={`${t.text} font-bold mb-1`}>Eliminar duplicados en Merma</h4>
                  <p className={`${t.textSecondary} text-xs leading-relaxed mb-4`}>
                    Busca y elimina registros duplicados en el inventario de merma por código SAP. Esta acción no se puede deshacer.
                  </p>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-4">
                    <p className="text-amber-400 text-xs">⚠ Esta acción es irreversible y afecta la base de datos.</p>
                  </div>
                  <button onClick={eliminarDuplicados} disabled={limpiando}
                    className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition disabled:opacity-50">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_arrow</span>
                    {limpiando ? "Ejecutando..." : "Ejecutar"}
                  </button>
                </div>
                <div className={`${t.bgCard} border ${t.border} rounded-xl p-5 opacity-40`}>
                  <h4 className={`${t.text} font-bold mb-1`}>Más funciones próximamente...</h4>
                  <p className={`${t.textSecondary} text-xs`}>Nuevas herramientas de administración en camino.</p>
                </div>
              </>
            )}
          </main>
        </div>

        {/* ════════════ DESKTOP ════════════ */}
        <main className="hidden md:flex flex-col flex-1 min-h-0 overflow-hidden">

          {/* Header desktop */}
          <header className={`px-8 pt-8 pb-0 flex-shrink-0 border-b ${t.border}`}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className={`${t.text} text-4xl font-black tracking-tight`}>Módulo Gestionamiento</h2>
                <p className={`${t.textSecondary} mt-2 max-w-2xl text-sm`}>
                  Administre usuarios, defina secciones operativas, organice categorías de productos y configure funciones del sistema.
                </p>
              </div>
              {tabActiva === 0 && (rol === "admin" || rol === "unico") && (
                <button onClick={() => setShowCrearUsuario(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-bold text-sm transition shadow-xl shadow-blue-500/25 flex-shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
                  Crear usuario
                </button>
              )}
            </div>

            {/* Tabs desktop */}
            <div className="flex gap-6">
              {TABS.map((tab, i) => (
                <button key={i} onClick={() => setTabActiva(i)}
                  className={`pb-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
                    tabActiva === i ? "border-blue-500 text-blue-400" : `border-transparent ${t.textSecondary} hover:${t.text}`
                  }`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8">

            {/* ── USUARIOS desktop ── */}
            {tabActiva === 0 && (
              <div>
                {/* Search bar */}
                <div className={`${t.bgCard} border ${t.border} rounded-2xl p-4 flex gap-4 items-center mb-6`}
                  style={{ background: "rgba(37,140,244,0.04)", backdropFilter: "blur(12px)" }}>
                  <div className="relative flex-1">
                    <span className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 ${t.textSecondary}`} style={{ fontSize: 18 }}>search</span>
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                      className={`w-full ${t.bgInput} border ${t.border} ${t.text} pl-11 pr-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="Buscar por nombre, correo o rol..." />
                  </div>
                </div>

                {/* Tabla */}
                <div className={`${t.bgCard} border ${t.border} rounded-2xl overflow-hidden`}
                  style={{ background: "rgba(37,140,244,0.04)", backdropFilter: "blur(12px)" }}>
                  <table className="w-full text-left">
                    <thead className={`${t.isDark ? "bg-white/5" : "bg-slate-50"} border-b ${t.border}`}>
                      <tr>
                        {["Usuario", "Correo electrónico", "Rol", "Acciones"].map(h => (
                          <th key={h} className={`px-6 py-4 text-xs uppercase tracking-widest ${t.textSecondary} font-bold`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${t.border}`}>
                      {loading ? (
                        <tr><td colSpan={4} className={`px-6 py-12 text-center ${t.textSecondary} text-sm`}>Cargando usuarios...</td></tr>
                      ) : usuariosFiltrados.map(u => {
                        const badge = ROL_BADGE[u.rol] || ROL_BADGE.usuario;
                        return (
                          <tr key={u.id} className={`group hover:bg-blue-500/5 transition-colors`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                {u.photoURL
                                  ? <img src={u.photoURL} className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/20" alt={u.nombre} />
                                  : <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ring-2 ring-blue-500/20 ${badge.cls}`}>
                                      {iniciales(u.nombre || u.email)}
                                    </div>
                                }
                                <div>
                                  <p className={`${t.text} font-bold text-sm`}>{u.nombre || "Sin nombre"}</p>
                                  {u.username && <p className={`${t.textSecondary} text-xs`}>@{u.username}</p>}
                                </div>
                              </div>
                            </td>
                            <td className={`px-6 py-4 ${t.textSecondary} text-sm`}>{u.email}</td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${badge.cls}`}>{badge.label}</span>
                            </td>
                            <td className="px-6 py-4">
                              {puedeGestionar(u) ? (
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => abrirEditar(u)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg ${t.bgInput} ${t.textSecondary} hover:text-blue-400 hover:bg-blue-500/10 transition`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                                  </button>
                                  {rol === "unico" && (
                                    <button onClick={() => handleEliminarUsuario(u)}
                                      className={`w-8 h-8 flex items-center justify-center rounded-lg ${t.bgInput} ${t.textSecondary} hover:text-red-400 hover:bg-red-500/10 transition`}>
                                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className={`${t.textSecondary} text-xs`}>{u.rol === "unico" ? "🔒 Protegido" : "—"}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {/* Footer tabla */}
                  <div className={`px-6 py-3 border-t ${t.border} flex items-center justify-between ${t.isDark ? "bg-white/3" : "bg-slate-50/50"}`}>
                    <p className={`${t.textSecondary} text-sm`}>
                      Mostrando <span className={`${t.text} font-bold`}>{usuariosFiltrados.length}</span> de <span className={`${t.text} font-bold`}>{usuarios.length}</span> usuarios
                    </p>
                  </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-3 gap-5 mt-6">
                  {[
                    { icon: "person_outline", color: "blue",    label: "Usuarios Totales",   valor: usuarios.length },
                    { icon: "how_to_reg",     color: "emerald", label: "Admins Activos",      valor: usuarios.filter(u => u.rol === "admin" || u.rol === "unico").length },
                    { icon: "verified_user",  color: "amber",   label: "Roles Definidos",     valor: 3 },
                  ].map((stat, i) => {
                    const colors = { blue: "bg-blue-500/15 text-blue-400", emerald: "bg-emerald-500/15 text-emerald-400", amber: "bg-amber-500/15 text-amber-400" };
                    return (
                      <div key={i} className={`${t.bgCard} border ${t.border} rounded-2xl p-6 flex items-center gap-5`}
                        style={{ background: "rgba(37,140,244,0.04)", backdropFilter: "blur(12px)" }}>
                        <div className={`w-12 h-12 rounded-xl ${colors[stat.color]} flex items-center justify-center`}>
                          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{stat.icon}</span>
                        </div>
                        <div>
                          <p className={`${t.textSecondary} text-xs font-bold uppercase tracking-widest`}>{stat.label}</p>
                          <p className={`${t.text} text-2xl font-black`}>{stat.valor}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── SECCIONES desktop ── */}
            {tabActiva === 1 && (
              <div>
                <div className={`${t.bgCard} border ${t.border} rounded-2xl p-5 mb-6`}>
                  <p className={`${t.textSecondary} text-xs font-bold uppercase tracking-widest mb-3`}>Nueva sección</p>
                  <div className="flex gap-3">
                    <input value={nuevaSeccion} onChange={e => setNuevaSeccion(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleAgregarSeccion()}
                      className={`flex-1 ${t.bgInput} border ${t.border} ${t.text} px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="Nombre de la nueva sección..." />
                    <button onClick={handleAgregarSeccion} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-bold text-sm transition">
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Agregar
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h3 className={`${t.text} font-bold text-lg`}>Listado de Secciones</h3>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {secciones.map(s => (
                    <div key={s.id} className={`${t.bgCard} border ${t.border} rounded-xl overflow-hidden group`}>
                      <div className="h-24 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center relative">
                        <span className="material-symbols-outlined text-slate-600" style={{ fontSize: 40 }}>domain</span>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button onClick={() => { setEditandoSeccion(s.id); setNombreEditadoSeccion(s.nombre); }}
                            className="w-7 h-7 bg-black/50 rounded-lg flex items-center justify-center text-white hover:bg-blue-600 transition">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                          </button>
                          <button onClick={() => handleEliminarSeccion(s.id)}
                            className="w-7 h-7 bg-black/50 rounded-lg flex items-center justify-center text-white hover:bg-red-600 transition">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        {editandoSeccion === s.id ? (
                          <div className="flex gap-2">
                            <input value={nombreEditadoSeccion} onChange={e => setNombreEditadoSeccion(e.target.value)}
                              className={`flex-1 ${t.bgInput} ${t.text} px-2 py-1.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500`} autoFocus />
                            <button onClick={() => handleEditarSeccion(s.id)} className="bg-blue-600 text-white text-xs px-2 rounded-lg">✓</button>
                            <button onClick={() => setEditandoSeccion(null)} className={`${t.bgInput} text-xs px-2 rounded-lg ${t.textSecondary}`}>✕</button>
                          </div>
                        ) : (
                          <>
                            <h4 className={`${t.text} font-bold text-sm mb-1`}>{s.nombre}</h4>
                            <p className={`${t.textSecondary} text-xs`}>Sección de fichas técnicas</p>
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => { setEditandoSeccion(s.id); setNombreEditadoSeccion(s.nombre); }}
                                className={`flex-1 flex items-center justify-center gap-1 ${t.bgInput} border ${t.border} ${t.textSecondary} text-xs py-2 rounded-lg hover:text-blue-400 transition`}>
                                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit</span> Editar
                              </button>
                              <button onClick={() => handleEliminarSeccion(s.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition">
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── CATEGORÍAS desktop ── */}
            {tabActiva === 2 && (
              <div>
                {/* Form nueva categoría — glass card del mockup */}
                <div className="rounded-2xl p-8 mb-8 shadow-2xl"
                  style={{ background: "rgba(34,54,73,0.4)", backdropFilter: "blur(12px)", border: "1px solid rgba(49,77,104,0.5)" }}>
                  <div className="flex items-center gap-3 mb-7">
                    <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 28 }}>add_circle</span>
                    <h3 className={`${t.text} text-2xl font-bold tracking-tight`}>Nueva categoría</h3>
                  </div>
                  <div className="grid grid-cols-12 gap-6 items-end">
                    <div className="col-span-5">
                      <label className={`${t.textSecondary} text-sm font-semibold mb-2 block`}>Nombre de la categoría</label>
                      <input value={nuevaCat.nombre} onChange={e => setNuevaCat(p => ({ ...p, nombre: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && handleAgregarCategoria()}
                        className={`w-full ${t.bgInput} border ${t.border} ${t.text} px-5 py-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm placeholder:text-slate-500`}
                        placeholder="Ej. CUARTO CALIENTE" />
                    </div>
                    <div className="col-span-5">
                      <label className={`${t.textSecondary} text-sm font-semibold mb-2 block`}>Color de etiqueta</label>
                      <div className="flex gap-3 flex-wrap p-1">
                        {COLORES.map(c => (
                          <button key={c.id} onClick={() => setNuevaCat(p => ({ ...p, color: c.id }))}
                            className={`w-8 h-8 rounded-full ${c.preview} transition-all ${
                              nuevaCat.color === c.id
                                ? "ring-2 ring-offset-2 ring-white scale-110 shadow-lg"
                                : "opacity-70 hover:opacity-100 hover:scale-110"
                            }`} />
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <button onClick={handleAgregarCategoria}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-4 rounded-xl transition shadow-lg shadow-blue-500/20 group">
                        <span className="material-symbols-outlined group-hover:rotate-90 transition-transform" style={{ fontSize: 20 }}>add</span>
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Header lista */}
                <div className="flex items-center justify-between px-2 mb-5">
                  <h3 className={`${t.text} text-lg font-bold flex items-center gap-2`}>
                    <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 20 }}>list_alt</span>
                    Categorías Registradas
                  </h3>
                  <span className={`${t.textSecondary} text-sm`}>{categorias.length} Categorías encontradas</span>
                </div>

                {/* Grid categorías */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                  {categorias.map(cat => {
                    const col = getColor(cat.color);
                    // Mapa de íconos según color
                    const iconMap = {
                      red: "local_fire_department", orange: "whatshot", amber: "wb_sunny",
                      emerald: "eco", cyan: "restaurant", blue: "opacity",
                      purple: "palette", pink: "icecream", slate: "category",
                    };
                    const catIcon = iconMap[cat.color] || "label";
                    return (
                      <div key={cat.id} className="rounded-xl overflow-hidden group relative flex flex-col hover:bg-blue-500/5 transition-colors"
                        style={{ background: "rgba(34,54,73,0.4)", backdropFilter: "blur(12px)", border: "1px solid rgba(49,77,104,0.5)" }}>

                        {/* Borde lateral de color */}
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${col.preview} rounded-l-xl`} />

                        <div className="p-5 pl-6 flex flex-col h-full">
                          {editandoCat?.id === cat.id ? (
                            <div>
                              <input value={editandoCat.nombre} onChange={e => setEditandoCat(p => ({ ...p, nombre: e.target.value }))}
                                className={`${inputCls} mb-3 text-sm`} autoFocus />
                              <div className="flex gap-2 flex-wrap mb-3">
                                {COLORES.map(c => (
                                  <button key={c.id} onClick={() => setEditandoCat(p => ({ ...p, color: c.id }))}
                                    className={`w-6 h-6 rounded-full ${c.preview} ${editandoCat.color === c.id ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"}`} />
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => setEditandoCat(null)} className={`flex-1 ${t.bgInput} text-xs py-2 rounded-lg ${t.textSecondary} transition`}>Cancelar</button>
                                <button onClick={handleGuardarCategoria} disabled={guardandoCat}
                                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded-lg transition">
                                  {guardandoCat ? "Guardando..." : "Guardar"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Header card */}
                              <div className="flex items-start justify-between mb-4">
                                <div className={`w-10 h-10 ${col.bg} rounded-lg flex items-center justify-center`}>
                                  <span className={`material-symbols-outlined ${col.text}`} style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
                                    {catIcon}
                                  </span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setEditandoCat({ ...cat })}
                                    className={`p-2 rounded-lg ${t.textSecondary} hover:text-white hover:bg-white/10 transition`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                                  </button>
                                  <button onClick={() => handleEliminarCategoria(cat.id)}
                                    className={`p-2 rounded-lg ${t.textSecondary} hover:text-red-400 hover:bg-red-500/10 transition`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                                  </button>
                                </div>
                              </div>

                              {/* Nombre */}
                              <h4 className={`${t.text} text-base font-bold uppercase tracking-wide mb-1`}>{cat.nombre}</h4>
                              <p className={`${t.textSecondary} text-xs mb-5`}>Categoría de productos</p>

                              {/* Footer */}
                              <div className="mt-auto flex items-center gap-1.5 text-blue-400 text-sm font-semibold cursor-pointer hover:underline">
                                Ver productos
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── FUNCIONES desktop ── */}
            {tabActiva === 3 && (
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <h3 className={`${t.text} text-2xl font-black`}>Funciones del Sistema</h3>
                  <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                    <span className="material-symbols-outlined text-amber-400" style={{ fontSize: 14 }}>warning</span>
                    <span className="text-amber-400 text-xs font-bold">Usar con cuidado</span>
                  </div>
                </div>
                <div className={`${t.bgCard} border ${t.border} rounded-2xl p-6 mb-4`}>
                  <h4 className={`${t.text} font-bold text-base mb-1`}>Eliminar duplicados en Merma</h4>
                  <p className={`${t.textSecondary} text-sm leading-relaxed mb-4`}>
                    Busca y elimina registros duplicados en el inventario de merma comparando por código SAP. Ayuda a optimizar la base de datos y corregir errores de sincronización.
                  </p>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400" style={{ fontSize: 16 }}>warning</span>
                    <p className="text-amber-400 text-xs">Esta acción es irreversible y afecta los registros de la base de datos.</p>
                  </div>
                  <button onClick={eliminarDuplicados} disabled={limpiando}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-xl transition disabled:opacity-50 shadow-lg shadow-red-500/20">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_arrow</span>
                    {limpiando ? "Ejecutando..." : "Ejecutar"}
                  </button>
                </div>
                <div className={`${t.bgCard} border ${t.border} rounded-2xl p-6 opacity-40`}>
                  <h4 className={`${t.text} font-bold mb-1`}>Más funciones próximamente...</h4>
                  <p className={`${t.textSecondary} text-sm`}>Nuevas herramientas de administración en camino.</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Modal Editar Usuario ── */}
      {editandoUsuario && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4">
          <div className={`${t.bgCard} border ${t.border} rounded-2xl p-6 w-full max-w-md shadow-2xl`}>
            <h3 className={`${t.text} font-bold text-lg mb-1`}>Editar usuario</h3>
            <p className={`${t.textSecondary} text-xs mb-5`}>{editandoUsuario.email}</p>
            <div className="space-y-3 mb-5">
              <div><label className={`${t.textSecondary} text-xs mb-1 block`}>Nombre completo *</label>
                <input value={formEditar.nombre} onChange={e => setFormEditar(p => ({ ...p, nombre: e.target.value }))} className={inputCls} /></div>
              <div><label className={`${t.textSecondary} text-xs mb-1 block`}>Username *</label>
                <input value={formEditar.username} onChange={e => setFormEditar(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, "") }))} className={inputCls} /></div>
              <div><label className={`${t.textSecondary} text-xs mb-1 block`}>Teléfono</label>
                <input value={formEditar.telefono} onChange={e => setFormEditar(p => ({ ...p, telefono: e.target.value }))} className={inputCls} /></div>
              <div><label className={`${t.textSecondary} text-xs mb-1 block`}>Rol</label>
                <select value={formEditar.rol} onChange={e => setFormEditar(p => ({ ...p, rol: e.target.value }))} className={inputCls}>
                  {opcionesRol().map(r => <option key={r} value={r}>{ROL_BADGE[r]?.label || r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditandoUsuario(null)} className={`flex-1 ${t.bgInput} ${t.text} font-semibold py-3 rounded-xl transition`}>Cancelar</button>
              <button onClick={handleGuardarEdicion} disabled={guardandoEdicion} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition disabled:opacity-50">
                {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Crear Usuario ── */}
      {showCrearUsuario && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4">
          <div className={`${t.bgCard} border ${t.border} rounded-2xl p-6 w-full max-w-md shadow-2xl`}>
            <h3 className={`${t.text} font-bold text-lg mb-5`}>Crear nuevo usuario</h3>
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={`${t.textSecondary} text-xs mb-1 block`}>Nombre *</label>
                  <input value={nuevoUsuario.nombre} onChange={e => setNuevoUsuario(p => ({ ...p, nombre: e.target.value }))} className={inputCls} placeholder="Nombre" /></div>
                <div><label className={`${t.textSecondary} text-xs mb-1 block`}>Apellido *</label>
                  <input value={nuevoUsuario.apellido} onChange={e => setNuevoUsuario(p => ({ ...p, apellido: e.target.value }))} className={inputCls} placeholder="Apellido" /></div>
              </div>
              <div><label className={`${t.textSecondary} text-xs mb-1 block`}>Correo electrónico *</label>
                <input type="email" value={nuevoUsuario.email} onChange={e => setNuevoUsuario(p => ({ ...p, email: e.target.value }))} className={inputCls} placeholder="correo@ejemplo.com" /></div>
              <div><label className={`${t.textSecondary} text-xs mb-1 block`}>Username único *</label>
                <input value={nuevoUsuario.username} onChange={e => setNuevoUsuario(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, "") }))} className={inputCls} placeholder="ej: juan.perez" /></div>
            </div>
            <p className={`${t.textSecondary} text-xs mb-5`}>📧 El usuario recibirá un correo para establecer su contraseña.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowCrearUsuario(false); setNuevoUsuario({ nombre: "", apellido: "", email: "", username: "" }); }}
                className={`flex-1 ${t.bgInput} ${t.text} font-semibold py-3 rounded-xl transition`}>Cancelar</button>
              <button onClick={handleCrearUsuario} disabled={creando} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition disabled:opacity-50">
                {creando ? "Creando..." : "Crear usuario"}
              </button>
            </div>
          </div>
        </div>
      )}
    
      <BottomNav moduloActivo="usuarios" onNavegar={onNavegar} />
    </div>
  );
}
