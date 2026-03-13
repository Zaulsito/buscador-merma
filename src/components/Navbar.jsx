import { useState } from "react";
import { auth } from "../firebase/config";
import { signOut } from "firebase/auth";
import { useTheme } from "../context/ThemeContext";

const temasInfo = {
  oscuro: { label: "Oscuro", emoji: "🌑" },
  gris:   { label: "Gris",   emoji: "🌫️" },
  claro:  { label: "Claro",  emoji: "☀️" },
  verde:  { label: "Verde",  emoji: "🌿" },
};

export default function Navbar({ user, rol, onPerfil, onConfig }) {
  const [menuOpen, setMenuOpen]   = useState(false);
  const [temaOpen, setTemaOpen]   = useState(false);
  const { tema, setTema, t, temas } = useTheme();

  const nombre   = user?.displayName || user?.email || "Usuario";
  const iniciales = nombre
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const rolLabel = rol === "admin" || rol === "unico" ? "Admin" : rol || "Usuario";

  const handleLogout = async () => {
    await signOut(auth);
  };

  const cerrarMenus = () => {
    setMenuOpen(false);
    setTemaOpen(false);
  };

  return (
    <nav
      className={`${t.bgNav} sticky top-0 z-40 border-b border-white/5`}
      style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", backgroundColor: "var(--bg-nav, #0f1923)" }}
    >
      <div className="w-full px-6 lg:px-10 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer flex-shrink-0"
          onClick={() => { window.location.hash = ""; window.location.reload(); }}
        >
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <img src="/icon-192.png" className="w-6 h-6 rounded" alt="logo" />
          </div>
          <h1 className={`${t.text} font-black text-lg tracking-tight italic hidden sm:block`}>
            R.info
          </h1>
        </div>

        {/* Búsqueda global (desktop) */}
        <div className="hidden md:flex flex-1 max-w-xs relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            className="w-full bg-black/30 border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
            placeholder="Global search..."
            type="text"
          />
        </div>

        {/* Acciones derecha */}
        <div className="flex items-center gap-3 sm:gap-4">

          {/* Campana */}
          <button className="relative p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {/* Punto rojo de notificación */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--bg-nav,#101922)]" />
          </button>

          {/* Avatar + menú */}
          <div className="relative">
            <button
              onClick={() => { setMenuOpen(!menuOpen); setTemaOpen(false); }}
              className="flex items-center gap-2.5 hover:bg-white/5 px-2 py-1.5 rounded-xl transition"
            >
              {/* Nombre y rol (desktop) */}
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-100 leading-tight">{nombre.split(" ")[0]}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-tight">{rolLabel}</p>
              </div>
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-blue-600/30 border-2 border-blue-500/40 flex items-center justify-center flex-shrink-0">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={nombre} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-blue-300 text-xs font-black">{iniciales}</span>
                )}
              </div>
              {/* Chevron */}
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 text-slate-500 transition-transform ${menuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <>
                {/* Overlay invisible para cerrar */}
                <div className="fixed inset-0 z-40" onClick={cerrarMenus} />

                <div
                  className={`absolute right-0 mt-2 w-60 ${t.bgCard} rounded-2xl shadow-2xl z-50 overflow-hidden border ${t.border}`}
                  style={{ backdropFilter: "blur(16px)" }}
                >
                  {/* Info usuario */}
                  <div className={`px-4 py-4 border-b ${t.border} flex items-center gap-3`}>
                    <div className="w-10 h-10 rounded-full bg-blue-600/30 border-2 border-blue-500/40 flex items-center justify-center flex-shrink-0">
                      {user?.photoURL ? (
                        <img src={user.photoURL} alt={nombre} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span className="text-blue-300 text-sm font-black">{iniciales}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`${t.text} text-sm font-bold truncate`}>{nombre}</p>
                      <p className={`${t.textSecondary} text-xs truncate`}>{user?.email}</p>
                    </div>
                  </div>

                  {/* Perfil */}
                  {onPerfil && (
                    <button
                      onClick={() => { onPerfil(); cerrarMenus(); }}
                      className={`w-full text-left px-4 py-3 ${t.text} ${t.hover} transition text-sm flex items-center gap-3`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Mi Perfil
                    </button>
                  )}

                  {/* Configuración */}
                  {onConfig && (
                    <button
                      onClick={() => { onConfig(); cerrarMenus(); }}
                      className={`w-full text-left px-4 py-3 ${t.text} ${t.hover} transition text-sm flex items-center gap-3`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configuración
                    </button>
                  )}

                  {/* Tema */}
                  <button
                    onClick={() => setTemaOpen(!temaOpen)}
                    className={`w-full text-left px-4 py-3 ${t.text} ${t.hover} transition text-sm flex items-center justify-between gap-3`}
                  >
                    <span className="flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                      Tema: {temasInfo[tema].emoji} {temasInfo[tema].label}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 text-slate-500 transition-transform ${temaOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {temaOpen && (
                    <div className={`border-t ${t.border} bg-black/10`}>
                      {temas.map((t2) => (
                        <button
                          key={t2}
                          onClick={() => { setTema(t2); cerrarMenus(); }}
                          className={`w-full text-left px-6 py-2.5 ${t.text} ${t.hover} transition text-sm flex items-center gap-2 ${tema === t2 ? "font-bold" : "opacity-70"}`}
                        >
                          <span>{temasInfo[t2].emoji}</span>
                          <span>{temasInfo[t2].label}</span>
                          {tema === t2 && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 ml-auto text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Cerrar sesión */}
                  <div className={`border-t ${t.border}`}>
                    <button
                      onClick={handleLogout}
                      className={`w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/10 transition text-sm flex items-center gap-3`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
