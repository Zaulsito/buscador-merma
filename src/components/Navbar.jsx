import { useState } from "react";
import { auth } from "../firebase/config";
import { signOut } from "firebase/auth";
import { useTheme } from "../context/ThemeContext";

const temasInfo = {
  oscuro: { label: "Oscuro", emoji: "🌑" },
  gris: { label: "Gris", emoji: "🌫️" },
  claro: { label: "Claro", emoji: "☀️" },
  verde: { label: "Verde", emoji: "🌿" },
};

export default function Navbar({ user, rol, onPerfil }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [temaOpen, setTemaOpen] = useState(false);
  const { tema, setTema, t, temas } = useTheme();

  const nombre = user?.displayName || user?.email;
  const iniciales = nombre
    ? nombre.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <nav className={`${t.bgNav} px-6 py-4 flex items-center justify-between shadow-lg`}>
      <div className="flex items-center gap-3">
        <img src="/icon-192.png" className="w-8 h-8 rounded-lg" />
        <h1 className={`${t.text} font-bold text-xl`}>RInfo</h1>
      </div>

      <div className="relative">
        <button
          onClick={() => { setMenuOpen(!menuOpen); setTemaOpen(false); }}
          className={`flex items-center gap-3 ${t.bgInput} ${t.hover} px-4 py-2 rounded-xl transition`}
        >
          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">{iniciales}</span>
          </div>
          <span className={`${t.text} text-sm font-semibold hidden sm:block`}>{nombre}</span>
          <span className={`${t.textSecondary} text-xs`}>▼</span>
        </button>

        {menuOpen && (
          <div className={`absolute right-0 mt-2 w-56 ${t.bgCard} rounded-2xl shadow-xl z-50 overflow-hidden border ${t.border}`}>
            <div className={`px-4 py-3 border-b ${t.border}`}>
              <p className={`${t.text} text-sm font-semibold`}>{nombre}</p>
              <p className={`${t.textSecondary} text-xs`}>{user?.email}</p>
            </div>

            {onPerfil && (
              <button
                onClick={() => { onPerfil(); setMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 ${t.text} ${t.hover} transition text-sm flex items-center gap-2`}
              >
                👤 Mi Perfil
              </button>
            )}

            <button
              onClick={() => { setTemaOpen(!temaOpen); }}
              className={`w-full text-left px-4 py-3 ${t.text} ${t.hover} transition text-sm flex items-center justify-between`}
            >
              <span>🎨 Tema: {temasInfo[tema].emoji} {temasInfo[tema].label}</span>
              <span className={t.textSecondary}>▶</span>
            </button>

            {temaOpen && (
              <div className={`border-t ${t.border}`}>
                {temas.map((t2) => (
                  <button
                    key={t2}
                    onClick={() => { setTema(t2); setTemaOpen(false); setMenuOpen(false); }}
                    className={`w-full text-left px-6 py-2 ${t.text} ${t.hover} transition text-sm flex items-center gap-2 ${tema === t2 ? "opacity-100 font-bold" : "opacity-70"}`}
                  >
                    {temasInfo[t2].emoji} {temasInfo[t2].label}
                    {tema === t2 && <span className="ml-auto">✓</span>}
                  </button>
                ))}
              </div>
            )}

            <div className={`border-t ${t.border}`}>
              <button
                onClick={handleLogout}
                className={`w-full text-left px-4 py-3 text-red-400 ${t.hover} transition text-sm flex items-center gap-2`}
              >
                🚪 Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}