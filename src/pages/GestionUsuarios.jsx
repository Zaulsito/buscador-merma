import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, doc, updateDoc, getDocs, deleteDoc } from "firebase/firestore";
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

export default function GestionUsuarios({ user, rol, onBack }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limpiando, setLimpiando] = useState(false);
  const { t } = useTheme();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "usuarios"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Ordenar: unico primero, luego admin, luego usuario
      data.sort((a, b) => {
        const orden = { unico: 0, admin: 1, usuario: 2 };
        return (orden[a.rol] ?? 3) - (orden[b.rol] ?? 3);
      });
      setUsuarios(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const cambiarRol = async (uid, nuevoRol) => {
    await updateDoc(doc(db, "usuarios", uid), { rol: nuevoRol });
    toast.success("Rol actualizado ✅");
  };

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
        if (vistos[codigo]) {
          aEliminar.push(d.id);
        } else {
          vistos[codigo] = true;
        }
      });

      for (const id of aEliminar) {
        await deleteDoc(doc(db, "merma", id));
      }

      toast.success(`✅ ${aEliminar.length} duplicado${aEliminar.length !== 1 ? "s" : ""} eliminado${aEliminar.length !== 1 ? "s" : ""}`);
    } catch (err) {
      toast.error("Error al limpiar duplicados");
    }
    setLimpiando(false);
  };

  // Lo que puede hacer cada rol
  const puedeGestionarUsuario = (usuarioObjetivo) => {
    if (usuarioObjetivo.rol === "unico") return false; // nadie puede tocar al único
    if (rol === "unico") return true; // único puede tocar a todos
    if (rol === "admin") return usuarioObjetivo.rol !== "admin"; // admin solo puede tocar usuarios
    return false;
  };

  const opcionesRol = (usuarioObjetivo) => {
    if (rol === "unico") return ["usuario", "admin"]; // único puede asignar admin o usuario
    if (rol === "admin") return ["usuario"]; // admin solo puede tener usuarios
    return [];
  };

  return (
    <div className={`min-h-screen ${t.bg}`}>
      <Toaster />
      <Navbar user={user} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className={`${t.textSecondary} text-sm mb-6 flex items-center gap-2 transition`}
        >
          ← Volver al inicio
        </button>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className={`${t.text} text-2xl font-bold`}>👥 Gestión de Usuarios</h2>
          {rol === "unico" && (
            <button
              onClick={eliminarDuplicados}
              disabled={limpiando}
              className="bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50"
            >
              {limpiando ? "Limpiando..." : "🧹 Eliminar duplicados en Merma"}
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
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${BADGE_COLOR[u.rol] || "bg-gray-500/20 text-gray-400"}`}>
                    {BADGE[u.rol] || u.rol}
                  </span>
                  {puedeGestionarUsuario(u) ? (
                    <select
                      value={u.rol}
                      onChange={(e) => cambiarRol(u.id, e.target.value)}
                      className={`${t.bgInput} ${t.text} px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                    >
                      {opcionesRol(u).map((r) => (
                        <option key={r} value={r}>{BADGE[r]}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`${t.textSecondary} text-xs`}>
                      {u.rol === "unico" ? "🔒 Protegido" : "Sin permisos"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}