import { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";

const ITEMS = [
  { id: "inicio",       label: "INICIO",  icon: "home",         fill: true  },
  { id: "merma",        label: "MERMA",   icon: "search",       fill: false },
  { id: "fichas",       label: "FICHAS",  icon: "description",  fill: false },
  {
    id: "planificador", label: "PLAN.",   icon: "account_tree", fill: false,
    sub: [
      { id: "planificador", label: "Planificador de Fichas", icon: "description"    },
      { id: "planograma",   label: "Planograma",             icon: "calendar_month" },
    ],
  },
  { id: "precios",      label: "PRECIOS", icon: "sell",         fill: false },
  { id: "traspasos",    label: "TRASP.",  icon: "swap_horiz",  fill: false },
  { id: "perfil",       label: "PERFIL",  icon: "person",       fill: false },
];

// Módulos donde el nav se oculta automáticamente
const MODULOS_AUTO_HIDE = ["planificador", "planograma", "merma", "fichas", "fichaDetalle", "precios", "informacion", "usuarios", "perfil", "planificadorFichas", "planificadorMerma", "traspasos"];

export default function BottomNav({ moduloActivo, onNavegar }) {
  const { t } = useTheme();
  const [subMenuOpen, setSubMenuOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(true);

  const autoHide = MODULOS_AUTO_HIDE.includes(moduloActivo);
  const hideTimerRef = useRef(null);
  const touchStartYRef = useRef(null);

  // ── Mostrar nav y reiniciar timer ─────────────────────────────────────────
  const showNav = () => {
    setNavVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setNavVisible(false), 3000);
  };

  // Al cambiar de módulo: mostrar nav y arrancar timer si aplica
  useEffect(() => {
    clearTimeout(hideTimerRef.current);
    if (autoHide) {
      setNavVisible(true);
      hideTimerRef.current = setTimeout(() => setNavVisible(false), 3000);
    } else {
      setNavVisible(true);
    }
    return () => clearTimeout(hideTimerRef.current);
  }, [moduloActivo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detectar swipe hacia arriba en toda la pantalla para mostrar nav
  useEffect(() => {
    if (!autoHide) return;

    const handleTouchStart = (e) => {
      touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      if (touchStartYRef.current === null) return;
      const deltaY = touchStartYRef.current - e.changedTouches[0].clientY;
      if (deltaY > 40) showNav(); // swipe arriba ≥ 40px
      touchStartYRef.current = null;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [autoHide]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────
  const esPlanActivo = moduloActivo === "planificador" || moduloActivo === "planograma";
  const activo = (id) => moduloActivo === id || (id === "planificador" && esPlanActivo);

  const handleClick = (item) => {
    if (autoHide) showNav(); // tap en el nav reinicia el timer
    if (item.sub) {
      setSubMenuOpen(o => !o);
    } else {
      setSubMenuOpen(false);
      onNavegar(item.id === "inicio" ? null : item.id);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Overlay submenú */}
      {subMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setSubMenuOpen(false)} />
      )}

      {/* Submenú planificador */}
      {subMenuOpen && (
        <div className={`fixed bottom-[68px] left-1/2 -translate-x-1/2 z-50 ${t.bgCard} border ${t.border} rounded-2xl shadow-2xl overflow-hidden w-60`}>
          <p className={`${t.textSecondary} text-[9px] font-black uppercase tracking-widest px-4 pt-3 pb-1`}>
            Planificador
          </p>
          {ITEMS.find(i => i.id === "planificador").sub.map(s => (
            <button key={s.id}
              onClick={() => { setSubMenuOpen(false); onNavegar(s.id); }}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${t.hover} ${moduloActivo === s.id ? "text-blue-400" : t.text}`}
            >
              <span className={`material-symbols-outlined ${moduloActivo === s.id ? "text-blue-400" : t.textSecondary}`} style={{ fontSize: 18 }}>{s.icon}</span>
              <span className="text-sm font-semibold">{s.label}</span>
              {moduloActivo === s.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
            </button>
          ))}
          <div className={`border-t ${t.border} mx-4 my-1`} />
          <button
            onClick={() => { setSubMenuOpen(false); onNavegar("informacion"); }}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${t.hover} ${moduloActivo === "informacion" ? "text-blue-400" : t.text}`}
          >
            <span className={`material-symbols-outlined ${moduloActivo === "informacion" ? "text-blue-400" : t.textSecondary}`} style={{ fontSize: 18 }}>menu_book</span>
            <span className="text-sm font-semibold">Información Útil</span>
            {moduloActivo === "informacion" && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
          </button>
          <div className={`border-t ${t.border} mx-4 my-1`} />
          <button
            onClick={() => { setSubMenuOpen(false); onNavegar("usuarios"); }}
            className={`w-full flex items-center gap-3 px-4 py-3 mb-1 transition-colors ${t.hover} ${moduloActivo === "usuarios" ? "text-blue-400" : t.text}`}
          >
            <span className={`material-symbols-outlined ${moduloActivo === "usuarios" ? "text-blue-400" : t.textSecondary}`} style={{ fontSize: 18 }}>manage_accounts</span>
            <span className="text-sm font-semibold">Gestionamiento</span>
            {moduloActivo === "usuarios" && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
          </button>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-50 ${t.bgNav} border-t ${t.border} flex justify-around items-center px-2 py-1`}
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6px)",
          transform: navVisible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {ITEMS.map(item => {
          const isActive = item.sub ? (subMenuOpen || esPlanActivo) : activo(item.id);
          return (
            <button key={item.id} onClick={() => handleClick(item)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all relative ${
                isActive ? "text-blue-400" : t.textSecondary
              }`}
            >
              {/* Punto activo */}
              {isActive && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
              )}
              <span className="material-symbols-outlined"
                style={{ fontSize: 22, fontVariationSettings: isActive && item.fill ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              <span className={`font-${isActive ? "bold" : "medium"} flex items-center gap-0.5`} style={{ fontSize: 9 }}>
                {item.label}
                {item.sub && (
                  <span className="material-symbols-outlined" style={{ fontSize: 10, transform: subMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                    expand_less
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Espacio para que el contenido no quede bajo el nav */}
      <div className="md:hidden h-16 flex-shrink-0" />
    </>
  );
}
