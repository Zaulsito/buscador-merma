import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import BuscadorMerma from "./BuscadorMerma";
import GestionUsuarios from "./GestionUsuarios";
import PerfilPage from "./PerfilPage";
import FichasTecnicas from "./FichasTecnicas";
import Planificador from "./Planificador";
import { useTheme } from "../context/ThemeContext";

const modulos = [
  {
    id: "merma",
    nombre: "Buscador de Merma",
    descripcion: "Localiza y analiza pérdidas operativas eficientemente.",
    icon: "search",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.12)",
    hoverBg: "#3B82F6",
  },
  {
    id: "fichas",
    nombre: "Fichas Técnicas",
    descripcion: "Consulta especificaciones y documentación detallada.",
    icon: "description",
    color: "#F97316",
    bg: "rgba(249,115,22,0.12)",
    hoverBg: "#F97316",
  },
  {
    id: "planificador",
    nombre: "Planificador",
    descripcion: "Organiza tareas y cronogramas de producción.",
    icon: "calendar_today",
    color: "#10B981",
    bg: "rgba(16,185,129,0.12)",
    hoverBg: "#10B981",
  },
];

const moduloAdmin = {
  id: "usuarios",
  nombre: "Gestionamiento",
  descripcion: "Administra usuarios, permisos y configuraciones.",
  icon: "manage_accounts",
  color: "#A855F7",
  bg: "rgba(168,85,247,0.12)",
  hoverBg: "#A855F7",
};

export default function DashboardPage({ user, rol }) {
  const [modulo, setModulo] = useState(window.location.hash.replace("#", "") || null);
  const { t } = useTheme();

  useEffect(() => {
    const handleHash = () => {
      setModulo(window.location.hash.replace("#", "") || null);
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const navegarA = (m) => {
    if (m) {
      window.location.hash = m;
    } else {
      history.pushState("", document.title, window.location.pathname);
      setModulo(null);
    }
  };

  if (modulo === "merma") return <BuscadorMerma user={user} rol={rol} onBack={() => navegarA(null)} />;
  if (modulo === "usuarios") return <GestionUsuarios user={user} rol={rol} onBack={() => navegarA(null)} />;
  if (modulo === "perfil") return <PerfilPage user={user} rol={rol} onBack={() => navegarA(null)} />;
  if (modulo === "fichas") return <FichasTecnicas user={user} rol={rol} onBack={() => navegarA(null)} />;
  if (modulo === "planificador") return <Planificador user={user} rol={rol} onBack={() => navegarA(null)} />;

  const nombre = user?.displayName?.split(" ")[0] || "Usuario";
  const todosModulos = (rol === "admin" || rol === "unico") ? [...modulos, moduloAdmin] : modulos;

  return (
    <div className={`min-h-screen ${t.bg} flex flex-col`}>
      <Navbar user={user} rol={rol} onPerfil={() => navegarA("perfil")} />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-28 pt-4">

        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-2xl p-6 mb-8 shadow-lg"
          style={{ background: "linear-gradient(135deg, #258cf4 0%, #1d4ed8 100%)" }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)", filter: "blur(40px)", transform: "translate(30%,-30%)" }} />
          <div className="absolute bottom-0 right-12 w-32 h-32 rounded-full"
            style={{ background: "rgba(255,255,255,0.05)", filter: "blur(20px)", transform: "translateY(30%)" }} />
          <div className="relative z-10">
            <p className="text-blue-100 text-xs font-semibold uppercase tracking-widest mb-1">Panel de Control</p>
            <h1 className="text-white text-3xl font-bold mb-2">Bienvenido, {nombre}</h1>
            <p className="text-blue-100 text-sm leading-relaxed max-w-xs">
              Gestiona tus procesos, accede a fichas técnicas y planifica tus operaciones desde un solo lugar.
            </p>
          </div>
        </div>

        {/* Título sección */}
        <div className="flex items-center justify-between mb-5">
          <h3 className={`${t.text} font-bold text-base flex items-center gap-2`}>
            <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 20 }}>grid_view</span>
            Módulos principales
          </h3>
        </div>

        {/* Cards de módulos */}
        <div className="flex flex-col gap-4 mb-8">
          {todosModulos.map((m) => (
            <button
              key={m.id}
              onClick={() => navegarA(m.id)}
              className={`${t.bgCard} border ${t.border} rounded-2xl p-5 flex flex-col gap-4 text-left w-full transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] group`}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: m.bg, color: m.color }}
              >
                <span
                  className="material-symbols-outlined transition-colors"
                  style={{ fontSize: 28, color: m.color }}
                >
                  {m.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`${t.text} font-bold text-base`}>{m.nombre}</h4>
                <p className={`${t.textSecondary} text-sm mt-1 leading-snug`}>{m.descripcion}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: m.color }}>
                ACCEDER
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <p className={`${t.textSecondary} text-xs text-center`}>
          © 2024 R.info · Sistema de Información Operativa. Todos los derechos reservados.
        </p>
      </main>

      {/* Bottom nav */}
      <nav className={`fixed bottom-0 left-0 right-0 ${t.bgNav} border-t ${t.border} flex justify-around items-center z-40`}
        style={{ paddingTop: 8, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
      >
        <button onClick={() => navegarA(null)} className="flex flex-col items-center gap-0.5 px-4 py-1">
          <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 22 }}>home</span>
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider" style={{ fontSize: 10 }}>Inicio</span>
        </button>
        <button onClick={() => navegarA("merma")} className="flex flex-col items-center gap-0.5 px-4 py-1">
          <span className={`material-symbols-outlined ${t.textSecondary}`} style={{ fontSize: 22 }}>search</span>
          <span className={`${t.textSecondary} font-bold uppercase tracking-wider`} style={{ fontSize: 10 }}>Buscar</span>
        </button>
        <button onClick={() => navegarA("fichas")} className="flex flex-col items-center gap-0.5 px-4 py-1">
          <span className={`material-symbols-outlined ${t.textSecondary}`} style={{ fontSize: 22 }}>description</span>
          <span className={`${t.textSecondary} font-bold uppercase tracking-wider`} style={{ fontSize: 10 }}>Fichas</span>
        </button>
        <button onClick={() => navegarA("perfil")} className="flex flex-col items-center gap-0.5 px-4 py-1">
          <span className={`material-symbols-outlined ${t.textSecondary}`} style={{ fontSize: 22 }}>person</span>
          <span className={`${t.textSecondary} font-bold uppercase tracking-wider`} style={{ fontSize: 10 }}>Perfil</span>
        </button>
      </nav>
    </div>
  );
}
