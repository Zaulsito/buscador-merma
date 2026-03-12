import { useState, useEffect } from "react";
import { db, auth } from "../firebase/config";
import { collection, onSnapshot, doc, updateDoc, getDocs, deleteDoc, setDoc, addDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from "firebase/auth";
import Navbar from "../components/Navbar";
import { useTheme } from "../context/ThemeContext";
import toast, { Toaster } from "react-hot-toast";

const BADGE = {
  unico: "👑 Único",
  admin: "🔧 Admin",
  usuario: "👤 Usuario",
};

const BADGE_COLOR = {
  unico: "bg-yellow-500/20 text-yellow-400",
  admin: "bg-blue-500/20 text-blue-400",
  usuario: "bg-gray-500/20 text-gray-400",
};

const TABS = ["👥 Usuarios", "📂 Secciones", "🏷️ Categorías", "⚙️ Funciones"];

// Paleta de colores disponibles para categorías
const COLORES_DISPONIBLES = [
  { id: "red",     label: "Rojo",     bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/20",     preview: "bg-red-400" },
  { id: "orange",  label: "Naranja",  bg: "bg-orange-500/15",  text: "text-orange-400",  border: "border-orange-500/20",  preview: "bg-orange-400" },
  { id: "amber",   label: "Ámbar",    bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-500/20",   preview: "bg-amber-400" },
  { id: "emerald", label: "Verde",    bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20", preview: "bg-emerald-400" },
  { id: "cyan",    label: "Cyan",     bg: "bg-cyan-500/15",    text: "text-cyan-400",    border: "border-cyan-500/20",    preview: "bg-cyan-400" },
  { id: "blue",    label: "Azul",     bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/20",    preview: "bg-blue-400" },
  { id: "purple",  label: "Morado",   bg: "bg-purple-500/15",  text: "text-purple-400",  border: "border-purple-500/20",  preview: "bg-purple-400" },
  { id: "pink",    label: "Rosa",     bg: "bg-pink-500/15",    text: "text-pink-400",    border: "border-pink-500/20",    preview: "bg-pink-400" },
  { id: "slate",   label: "Gris",     bg: "bg-slate-500/15",   text: "text-slate-400",   border: "border-slate-500/20",   preview: "bg-slate-400" },
];

export default function GestionUsuarios({ user, rol, onBack }) {
  const [tabActiva, setTabActiva] = useState(0);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limpiando, setLimpiando] = useState(false);
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
  const [editandoCat, setEditandoCat] = useState(null); // { id, nombre, color }
  const [guardandoCat, setGuardandoCat] = useState(false);

  const { t } = useTheme();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "usuarios"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => {
        const orden = { unico: 0, admin: 1, usuario: 2 };
        return (orden[a.rol] ?? 3) - (orden[b.rol] ?? 3);
      });
      setUsuarios(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "secciones"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, nombre: d.data().nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
      setSecciones(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categorias"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, nombre: d.data().nombre, color: d.data().color || "blue" }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      setCategorias(data);
    });
    return () => unsub();
  }, []);

  // ── Usuarios ──
  const cambiarRol = async (uid, nuevoRol) => {
    await updateDoc(doc(db, "usuarios", uid), { rol: nuevoRol });
    toast.success("Rol actualizado ✅");
  };

  const puedeGestionarUsuario = (usuarioObjetivo) => {
    if (usuarioObjetivo.rol === "unico") return false;
    if (rol === "unico") return true;
    if (rol === "admin") return usuarioObjetivo.rol !== "admin";
    return false;
  };

  const opcionesRol = () => {
    if (rol === "unico") return ["usuario", "admin"];
    if (rol === "admin") return ["usuario"];
    return [];
  };

  const abrirEditar = (u) => {
    setEditandoUsuario(u);
    setFormEditar({ nombre: u.nombre || "", username: u.username || "", telefono: u.telefono || "", rol: u.rol || "usuario" });
  };

  const handleGuardarEdicion = async () => {
    if (!formEditar.nombre || !formEditar.username) { toast.error("Nombre y username son obligatorios"); return; }
    const usernameExiste = usuarios.some(u => u.username?.toLowerCase() === formEditar.username.toLowerCase() && u.id !== editandoUsuario.id);
    if (usernameExiste) { toast.error("Ese username ya está en uso"); return; }
    setGuardandoEdicion(true);
    try {
      await updateDoc(doc(db, "usuarios", editandoUsuario.id), {
        nombre: formEditar.nombre.trim(),
        username: formEditar.username.trim().toLowerCase(),
        telefono: formEditar.telefono.trim(),
        rol: formEditar.rol,
      });
      toast.success("Usuario actualizado ✅");
      setEditandoUsuario(null);
    } catch (err) {
      toast.error("Error al actualizar usuario");
    }
    setGuardandoEdicion(false);
  };

  const handleEliminarUsuario = async (u) => {
    if (!confirm(`¿Eliminar a ${u.nombre || u.email}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, "usuarios", u.id));
      toast.success("Usuario eliminado ✅");
    } catch (err) {
      toast.error("Error al eliminar usuario");
    }
  };

  const handleCrearUsuario = async () => {
    const { nombre, apellido, email, username } = nuevoUsuario;
    if (!nombre || !apellido || !email || !username) { toast.error("Completa todos los campos obligatorios"); return; }
    const usernameExiste = usuarios.some(u => u.username?.toLowerCase() === username.toLowerCase());
    if (usernameExiste) { toast.error("Ese nombre de usuario ya está en uso"); return; }
    setCreando(true);
    try {
      const passwordTemporal = Math.random().toString(36).slice(-10) + "A1!";
      const cred = await createUserWithEmailAndPassword(auth, email, passwordTemporal);
      await updateProfile(cred.user, { displayName: `${nombre} ${apellido}` });
      await setDoc(doc(db, "usuarios", cred.user.uid), {
        email, nombre: `${nombre} ${apellido}`, username: username.trim(), rol: "usuario", fechaRegistro: new Date(),
      });
      await sendPasswordResetEmail(auth, email);
      toast.success(`✅ Usuario creado. Se envió un correo a ${email} para establecer su contraseña.`);
      setNuevoUsuario({ nombre: "", apellido: "", email: "", username: "" });
      setShowCrearUsuario(false);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") toast.error("Este correo ya está registrado");
      else toast.error("Error al crear usuario");
    }
    setCreando(false);
  };

  // ── Secciones ──
  const handleAgregarSeccion = async () => {
    if (!nuevaSeccion.trim()) return;
    const existe = secciones.some(s => s.nombre.toLowerCase() === nuevaSeccion.toLowerCase());
    if (existe) { toast.error("Esa sección ya existe"); return; }
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

  // ── Categorías ──
  const handleAgregarCategoria = async () => {
    if (!nuevaCat.nombre.trim()) { toast.error("Escribe un nombre para la categoría"); return; }
    const existe = categorias.some(c => c.nombre.toLowerCase() === nuevaCat.nombre.toLowerCase());
    if (existe) { toast.error("Esa categoría ya existe"); return; }
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
    await updateDoc(doc(db, "categorias", editandoCat.id), { nombre: editandoCat.nombre.trim(), color: editandoCat.color });
    toast.success("Categoría actualizada ✅");
    setEditandoCat(null);
    setGuardandoCat(false);
  };

  // ── Funciones ──
  const eliminarDuplicados = async () => {
    if (!confirm("¿Eliminar productos duplicados en Merma? Esta acción no se puede deshacer.")) return;
    setLimpiando(true);
    try {
      const snap = await getDocs(collection(db, "merma"));
      const vistos = {};
      const aEliminar = [];
      snap.docs.forEach((d) => {
        const codigo = d.data().codigo?.trim().toLowerCase();
        if (!codigo) return;
        if (vistos[codigo]) aEliminar.push(d.id);
        else vistos[codigo] = true;
      });
      for (const id of aEliminar) await deleteDoc(doc(db, "merma", id));
      toast.success(`✅ ${aEliminar.length} duplicado${aEliminar.length !== 1 ? "s" : ""} eliminado${aEliminar.length !== 1 ? "s" : ""}`);
    } catch (err) {
      toast.error("Error al limpiar duplicados");
    }
    setLimpiando(false);
  };

  const inputClass = `w-full ${t.bgInput} ${t.text} px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm`;
  const labelClass = `${t.textSecondary} text-xs mb-1 block`;

  return (
    <div className={`min-h-screen ${t.bg}`}>
      <Toaster />
      <Navbar user={user} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-teal-600/20 hover:bg-teal-600/40 text-teal-300 text-sm font-semibold px-4 py-2 rounded-full transition border border-teal-500/30 mb-6"
        >
          ← Volver
        </button>

        <h2 className={`${t.text} text-2xl font-bold mb-6`}>🛠️ Gestionamiento</h2>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setTabActiva(i)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                tabActiva === i ? "bg-teal-600 text-white" : `${t.bgCard} ${t.text} ${t.hover}`
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Tab 0 - Usuarios ── */}
        {tabActiva === 0 && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className={`${t.text} text-lg font-semibold`}>👥 Usuarios</h3>
              {(rol === "unico" || rol === "admin") && (
                <button onClick={() => setShowCrearUsuario(true)} className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
                  + Crear usuario
                </button>
              )}
            </div>
            {loading ? (
              <p className={`${t.textSecondary} text-center`}>Cargando usuarios...</p>
            ) : (
              <div className="flex flex-col gap-4">
                {usuarios.map((u) => (
                  <div key={u.id} className={`${t.bgCard} rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${BADGE_COLOR[u.rol] || "bg-gray-500/20 text-gray-400"}`}>
                        {(u.nombre || u.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className={`${t.text} font-semibold`}>{u.email}</p>
                        <p className={`${t.textSecondary} text-sm`}>{u.nombre || "Sin nombre"}</p>
                        {u.username && <p className={`${t.textSecondary} text-xs`}>@{u.username}</p>}
                        {u.telefono && <p className={`${t.textSecondary} text-xs`}>📞 {u.telefono}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${BADGE_COLOR[u.rol] || "bg-gray-500/20 text-gray-400"}`}>
                        {BADGE[u.rol] || u.rol}
                      </span>
                      {puedeGestionarUsuario(u) ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => abrirEditar(u)} className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-semibold px-3 py-2 rounded-lg transition">✏️ Editar</button>
                          {rol === "unico" && (
                            <button onClick={() => handleEliminarUsuario(u)} className="bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs font-semibold px-3 py-2 rounded-lg transition">🗑️ Eliminar</button>
                          )}
                        </div>
                      ) : (
                        <span className={`${t.textSecondary} text-xs`}>{u.rol === "unico" ? "🔒 Protegido" : "Sin permisos"}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 1 - Secciones ── */}
        {tabActiva === 1 && (
          <div>
            <h3 className={`${t.text} text-lg font-semibold mb-1`}>📂 Secciones de Fichas Técnicas</h3>
            <p className={`${t.textSecondary} text-sm mb-4`}>Estas secciones aparecen como filtros en el módulo de Fichas Técnicas.</p>
            <div className="flex gap-2 mb-6">
              <input value={nuevaSeccion} onChange={(e) => setNuevaSeccion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAgregarSeccion()}
                className={`flex-1 ${t.bgInput} ${t.text} px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm`} placeholder="Nueva sección..." />
              <button onClick={handleAgregarSeccion} className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">+ Agregar</button>
            </div>
            <div className="flex flex-col gap-3">
              {secciones.map((s) => (
                <div key={s.id} className={`${t.bgCard} rounded-xl px-4 py-3 flex items-center justify-between gap-2`}>
                  {editandoSeccion === s.id ? (
                    <>
                      <input value={nombreEditadoSeccion} onChange={(e) => setNombreEditadoSeccion(e.target.value)}
                        className={`flex-1 ${t.bgInput} ${t.text} px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm`} autoFocus />
                      <button onClick={() => handleEditarSeccion(s.id)} className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition">✓ Guardar</button>
                      <button onClick={() => setEditandoSeccion(null)} className={`${t.bgInput} ${t.textSecondary} text-xs px-3 py-2 rounded-lg transition`}>✕</button>
                    </>
                  ) : (
                    <>
                      <span className={`${t.text} text-sm font-semibold flex-1`}>{s.nombre}</span>
                      <button onClick={() => { setEditandoSeccion(s.id); setNombreEditadoSeccion(s.nombre); }} className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-semibold px-3 py-2 rounded-lg transition">✏️ Editar</button>
                      <button onClick={() => handleEliminarSeccion(s.id)} className="bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs font-semibold px-3 py-2 rounded-lg transition">🗑️ Eliminar</button>
                    </>
                  )}
                </div>
              ))}
              {secciones.length === 0 && <p className={`${t.textSecondary} text-sm text-center`}>No hay secciones creadas.</p>}
            </div>
          </div>
        )}

        {/* ── Tab 2 - Categorías ── */}
        {tabActiva === 2 && (
          <div>
            <h3 className={`${t.text} text-lg font-semibold mb-1`}>🏷️ Categorías de Productos</h3>
            <p className={`${t.textSecondary} text-sm mb-5`}>Estas categorías aparecen en el Buscador de Merma. Puedes asignarle un color a cada una.</p>

            {/* Formulario nueva categoría */}
            <div className={`${t.bgCard} rounded-xl p-4 mb-6`}>
              <p className={`${t.text} text-sm font-semibold mb-3`}>+ Nueva categoría</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={nuevaCat.nombre}
                  onChange={(e) => setNuevaCat(p => ({ ...p, nombre: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleAgregarCategoria()}
                  className={`flex-1 ${t.bgInput} ${t.text} px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm`}
                  placeholder="Nombre de la categoría..."
                />
                <button onClick={handleAgregarCategoria} className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition whitespace-nowrap">
                  + Agregar
                </button>
              </div>

              {/* Selector de color */}
              <div className="mt-3">
                <p className={`${t.textSecondary} text-xs mb-2`}>Color del badge:</p>
                <div className="flex flex-wrap gap-2">
                  {COLORES_DISPONIBLES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setNuevaCat(p => ({ ...p, color: c.id }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        nuevaCat.color === c.id
                          ? `${c.bg} ${c.text} ${c.border} ring-2 ring-offset-1 ring-offset-transparent ring-current`
                          : `${t.bgInput} ${t.textSecondary} border-transparent hover:${c.text}`
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${c.preview}`}></span>
                      {c.label}
                    </button>
                  ))}
                </div>
                {/* Preview badge */}
                {nuevaCat.nombre && (
                  <div className="mt-3 flex items-center gap-2">
                    <p className={`${t.textSecondary} text-xs`}>Preview:</p>
                    {(() => {
                      const col = COLORES_DISPONIBLES.find(c => c.id === nuevaCat.color) || COLORES_DISPONIBLES[5];
                      return (
                        <span className={`px-3 py-1 rounded-full ${col.bg} ${col.text} text-[10px] font-black uppercase tracking-widest border ${col.border}`}>
                          {nuevaCat.nombre}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Lista de categorías */}
            <div className="flex flex-col gap-3">
              {categorias.map((cat) => {
                const col = COLORES_DISPONIBLES.find(c => c.id === cat.color) || COLORES_DISPONIBLES[5];
                return (
                  <div key={cat.id} className={`${t.bgCard} rounded-xl px-4 py-3`}>
                    {editandoCat?.id === cat.id ? (
                      <div>
                        <input
                          value={editandoCat.nombre}
                          onChange={(e) => setEditandoCat(p => ({ ...p, nombre: e.target.value }))}
                          className={`w-full ${t.bgInput} ${t.text} px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm mb-3`}
                          autoFocus
                        />
                        {/* Selector color en edición */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {COLORES_DISPONIBLES.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => setEditandoCat(p => ({ ...p, color: c.id }))}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                editandoCat.color === c.id
                                  ? `${c.bg} ${c.text} ${c.border} ring-2 ring-offset-1 ring-offset-transparent ring-current`
                                  : `${t.bgInput} ${t.textSecondary} border-transparent`
                              }`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${c.preview}`}></span>
                              {c.label}
                            </button>
                          ))}
                        </div>
                        {/* Preview edición */}
                        <div className="flex items-center gap-2 mb-3">
                          <p className={`${t.textSecondary} text-xs`}>Preview:</p>
                          {(() => {
                            const ec = COLORES_DISPONIBLES.find(c => c.id === editandoCat.color) || COLORES_DISPONIBLES[5];
                            return (
                              <span className={`px-3 py-1 rounded-full ${ec.bg} ${ec.text} text-[10px] font-black uppercase tracking-widest border ${ec.border}`}>
                                {editandoCat.nombre || "Categoría"}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditandoCat(null)} className={`flex-1 ${t.bgInput} ${t.textSecondary} text-xs py-2 rounded-lg transition`}>Cancelar</button>
                          <button onClick={handleGuardarCategoria} disabled={guardandoCat} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold py-2 rounded-lg transition">
                            {guardandoCat ? "Guardando..." : "✓ Guardar"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <span className={`px-3 py-1 rounded-full ${col.bg} ${col.text} text-[10px] font-black uppercase tracking-widest border ${col.border}`}>
                          {cat.nombre}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditandoCat({ id: cat.id, nombre: cat.nombre, color: cat.color })}
                            className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-semibold px-3 py-2 rounded-lg transition"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleEliminarCategoria(cat.id)}
                            className="bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs font-semibold px-3 py-2 rounded-lg transition"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {categorias.length === 0 && <p className={`${t.textSecondary} text-sm text-center py-6`}>No hay categorías creadas aún.</p>}
            </div>
          </div>
        )}

        {/* ── Tab 3 - Funciones ── */}
        {tabActiva === 3 && (
          <div>
            <h3 className={`${t.text} text-lg font-semibold mb-1`}>⚙️ Funciones del Sistema</h3>
            <p className={`${t.textSecondary} text-sm mb-6`}>Herramientas avanzadas de mantenimiento. Úsalas con cuidado.</p>
            <div className="flex flex-col gap-4">
              <div className={`${t.bgCard} rounded-xl p-5`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h4 className={`${t.text} font-semibold mb-1`}>🧹 Eliminar duplicados en Merma</h4>
                    <p className={`${t.textSecondary} text-sm`}>Busca y elimina productos con el mismo código SAP en el Buscador de Merma. Esta acción no se puede deshacer.</p>
                  </div>
                  <button onClick={eliminarDuplicados} disabled={limpiando} className="bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50 whitespace-nowrap">
                    {limpiando ? "Limpiando..." : "Ejecutar"}
                  </button>
                </div>
              </div>
              <div className={`${t.bgCard} rounded-xl p-5 opacity-40`}>
                <h4 className={`${t.text} font-semibold mb-1`}>🔧 Más funciones próximamente...</h4>
                <p className={`${t.textSecondary} text-sm`}>Aquí aparecerán nuevas herramientas de administración.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Editar Usuario ── */}
      {editandoUsuario && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className={`${t.bgCard} rounded-2xl p-6 w-full max-w-md shadow-xl`}>
            <h3 className={`${t.text} font-bold text-lg mb-4`}>✏️ Editar usuario</h3>
            <p className={`${t.textSecondary} text-xs mb-4`}>{editandoUsuario.email}</p>
            <div className="mb-3"><label className={labelClass}>Nombre completo *</label><input value={formEditar.nombre} onChange={(e) => setFormEditar(p => ({ ...p, nombre: e.target.value }))} className={inputClass} placeholder="Nombre completo" /></div>
            <div className="mb-3"><label className={labelClass}>Username *</label><input value={formEditar.username} onChange={(e) => setFormEditar(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, "") }))} className={inputClass} placeholder="ej: juan.perez" /></div>
            <div className="mb-3"><label className={labelClass}>Teléfono</label><input value={formEditar.telefono} onChange={(e) => setFormEditar(p => ({ ...p, telefono: e.target.value }))} className={inputClass} placeholder="+56 9 1234 5678" /></div>
            <div className="mb-6"><label className={labelClass}>Rol</label>
              <select value={formEditar.rol} onChange={(e) => setFormEditar(p => ({ ...p, rol: e.target.value }))} className={inputClass}>
                {opcionesRol().map((r) => <option key={r} value={r}>{BADGE[r]}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditandoUsuario(null)} className={`flex-1 ${t.bgInput} ${t.hover} ${t.text} font-semibold py-3 rounded-lg transition`}>Cancelar</button>
              <button onClick={handleGuardarEdicion} disabled={guardandoEdicion} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50">
                {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Crear Usuario ── */}
      {showCrearUsuario && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className={`${t.bgCard} rounded-2xl p-6 w-full max-w-md shadow-xl`}>
            <h3 className={`${t.text} font-bold text-lg mb-4`}>👤 Crear nuevo usuario</h3>
            <div className="flex gap-3 mb-3">
              <div className="flex-1"><label className={labelClass}>Nombre *</label><input value={nuevoUsuario.nombre} onChange={(e) => setNuevoUsuario(p => ({ ...p, nombre: e.target.value }))} className={inputClass} placeholder="Nombre" /></div>
              <div className="flex-1"><label className={labelClass}>Apellido *</label><input value={nuevoUsuario.apellido} onChange={(e) => setNuevoUsuario(p => ({ ...p, apellido: e.target.value }))} className={inputClass} placeholder="Apellido" /></div>
            </div>
            <div className="mb-3"><label className={labelClass}>Correo electrónico *</label><input type="email" value={nuevoUsuario.email} onChange={(e) => setNuevoUsuario(p => ({ ...p, email: e.target.value }))} className={inputClass} placeholder="correo@ejemplo.com" /></div>
            <div className="mb-4"><label className={labelClass}>Nombre de usuario único *</label>
              <input value={nuevoUsuario.username} onChange={(e) => setNuevoUsuario(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, "") }))} className={inputClass} placeholder="ej: juan.perez" />
              <p className={`${t.textSecondary} text-xs mt-1`}>Solo letras minúsculas, números y puntos. Sin espacios.</p>
            </div>
            <p className={`${t.textSecondary} text-xs mb-4`}>📧 El usuario recibirá un correo para establecer su propia contraseña.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowCrearUsuario(false); setNuevoUsuario({ nombre: "", apellido: "", email: "", username: "" }); }} className={`flex-1 ${t.bgInput} ${t.hover} ${t.text} font-semibold py-3 rounded-lg transition`}>Cancelar</button>
              <button onClick={handleCrearUsuario} disabled={creando} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50">
                {creando ? "Creando..." : "Crear usuario"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
