import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import Navbar from "../components/Navbar";

export default function GestionUsuarios({ user, rol, onBack }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "usuarios"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsuarios(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const cambiarRol = async (uid, nuevoRol) => {
    await updateDoc(doc(db, "usuarios", uid), { rol: nuevoRol });
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar user={user} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-2 transition"
        >
          ← Volver al inicio
        </button>

        <h2 className="text-white text-2xl font-bold mb-6">👥 Gestión de Usuarios</h2>

        {loading ? (
          <p className="text-gray-400 text-center">Cargando usuarios...</p>
        ) : (
          <div className="flex flex-col gap-4">
            {usuarios.map((u) => (
              <div key={u.id} className="bg-gray-800 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-white font-semibold">{u.email}</p>
                  <p className="text-gray-400 text-sm">{u.nombre || "Sin nombre"}</p>
                </div>
                <select
                  value={u.rol}
                  onChange={(e) => cambiarRol(u.id, e.target.value)}
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="usuario">Usuario</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}