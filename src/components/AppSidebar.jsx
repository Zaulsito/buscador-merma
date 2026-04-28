import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { auth } from "../firebase/config";
import { signOut } from "firebase/auth";

const navItems = [
  { id: "fichas",       label: "Fichas Técnicas",     icon: "description"    },
  { id: "merma",        label: "Gestión de Merma",    icon: "inventory_2"    },
  { id: "planificador", label: "Planificador",        icon: "account_tree"   },
  { id: "trazabilidad", label: "Trazabilidad",        icon: "receipt_long"   },
  { id: "precios",      label: "Lista de Precios",    icon: "sell"           },
  { id: "traspasos",    label: "Traspasos",           icon: "swap_horiz"     },
];

const adminItem = { id: "usuarios",     label: "Gestionamiento",    icon: "manage_accounts" };
const infoItem  = { id: "informacion",  label: "Información Útil",  icon: "info"            };

export default function AppSidebar({ user, rol, moduloActivo, onNavegar }) {
  const { t } = useTheme();

  const nombre   = user?.displayName || user?.email || "Usuario";
  const iniciales = nombre.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "true");

  const toggleSidebar = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    localStorage.setItem("sidebar_collapsed", String(newVal));
  };

  const items = [
    ...navItems,
    ...(rol === "admin" || rol === "unico" ? [adminItem] : []),
    infoItem,
  ];

  return (
    <aside className={`hidden md:flex ${isCollapsed ? 'w-20' : 'w-64'} flex-shrink-0 flex-col h-full ${t.bgCard} border-r ${t.border} transition-all duration-300 relative`}>

      {/* Botón para colapsar/expandir */}
      <button 
        onClick={toggleSidebar}
        className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md z-50 hover:scale-110 transition-transform cursor-pointer`}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{isCollapsed ? "chevron_right" : "chevron_left"}</span>
      </button>

      {/* Logo */}
      <div
        className={`p-6 flex items-center ${isCollapsed ? 'justify-center p-4' : 'gap-3'} cursor-pointer flex-shrink-0 overflow-hidden`}
        onClick={() => onNavegar(null)}
        title="Inicio"
      >
        <img
            src="/icon-192.png"
            className="w-10 h-10 rounded-xl object-contain flex-shrink-0"
            alt="logo"
            onError={e => { e.target.style.display = "none"; }}
          />
        {!isCollapsed && (
          <div className="whitespace-nowrap transition-opacity duration-300">
            <h1 className={`${t.text} font-bold text-sm tracking-tight leading-tight`}>Rincon Belloto<br/>Informaciones</h1>
            <p className={`${t.textSecondary} text-[10px] uppercase tracking-widest`}>
              {rol === "unico" ? "Programador" : rol === "admin" ? "Admin" : rol || "Usuario"}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {/* Home */}
        <button
          onClick={() => onNavegar(null)}
          title={isCollapsed ? "Inicio" : ""}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm font-medium transition-colors ${
            moduloActivo === null
              ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
              : `${t.textSecondary} ${t.hover}`
          }`}
        >
          <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 20 }}>home</span>
          {!isCollapsed && <span className="whitespace-nowrap">Inicio</span>}
        </button>

        {items.map(item => {
          const activo = moduloActivo === item.id ||
            (item.id === "fichas" && moduloActivo === "fichaDetalle");
          return (
            <button
              key={item.id}
              onClick={() => onNavegar(item.id)}
              title={isCollapsed ? item.label : ""}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3 text-left'} py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activo
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                  : `${t.textSecondary} ${t.hover}`
              }`}
            >
              <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 20, fontVariationSettings: activo ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User card */}
      <div className={`p-4 border-t ${t.border} flex-shrink-0`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center p-1 bg-transparent' : `gap-3 p-2 ${t.bgInput}`} rounded-xl`}>
          <div 
            className={`w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-xs flex-shrink-0 ${isCollapsed && 'cursor-pointer hover:bg-blue-500/30'}`}
            title={isCollapsed ? "Cerrar sesión" : ""}
            onClick={isCollapsed ? () => signOut(auth) : undefined}
          >
            {user?.photoURL
              ? <img src={user.photoURL} alt={nombre} className="w-full h-full object-cover rounded-full" />
              : iniciales}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className={`${t.text} text-sm font-bold truncate leading-tight`}>{nombre.split(" ")[0]}</p>
                <p className={`${t.textSecondary} text-[10px] truncate`}>{user?.email}</p>
              </div>
              <button
                onClick={() => signOut(auth)}
                className={`${t.textSecondary} hover:text-red-400 transition-colors flex-shrink-0`}
                title="Cerrar sesión"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
