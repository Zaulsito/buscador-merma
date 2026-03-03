import { useState } from "react";
import { auth } from "../firebase/config";
import { signOut } from "firebase/auth";

export default function Navbar({ user, rol, onPerfil }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const nombre = user?.displayName || user?.email;

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <nav className="bg-gray-800 px-6 py-4 flex items-center justify-between shadow-lg">
      <h1 className="text-white font-bold text-xl">🍽️ Rincón Informaciones</h1>
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
        >
          <span className="text-white text-sm font-semibold">{nombre}</span>
          <span className="text-gray-400 text-xs">▼</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
            {onPerfil && (
              <button
                onClick={() => { onPerfil(); setMenuOpen(false); }}
                className="w-full text-left px-4 py-3 text-white hover:bg-gray-600 transition text-sm"
              >
                👤 Mi Perfil
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 text-red-400 hover:bg-gray-600 transition text-sm"
            >
              🚪 Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}