import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import BuscadorMerma from "./BuscadorMerma";
import GestionUsuarios from "./GestionUsuarios";
import PerfilPage from "./PerfilPage";
import FichasTecnicas from "./FichasTecnicas";
import Planificador from "./Planificador";
import { useTheme } from "../context/ThemeContext";

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

  return (
    <div className={`min-h-screen ${t.bg}`}>
      <Navbar user={user} rol={rol} onPerfil={() => navegarA("perfil")} />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h2 className={`${t.text} text-2xl font-bold mb-2`}>
          Bienvenido, {user?.displayName?.split(" ")[0] || "👋"}
        </h2>
        <p className={`${t.textSecondary} mb-8`}>Selecciona un módulo para comenzar</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => navegarA("merma")}
            className={`${t.bgCard} ${t.hoverCard} rounded-2xl p-6 text-left transition shadow`}
          >
            <span className="text-4xl">🔍</span>
            <h3 className={`${t.text} font-bold text-lg mt-3`}>Buscador de Merma</h3>
            <p className={`${t.textSecondary} text-sm mt-1`}>Busca productos por código, nombre o categoría</p>
          </button>

          <button
            onClick={() => navegarA("fichas")}
            className={`${t.bgCard} ${t.hoverCard} rounded-2xl p-6 text-left transition shadow`}
          >
            <span className="text-4xl">📋</span>
            <h3 className={`${t.text} font-bold text-lg mt-3`}>Fichas Técnicas</h3>
            <p className={`${t.textSecondary} text-sm mt-1`}>Consulta las fichas técnicas por sección</p>
          </button>
          <button
            onClick={() => navegarA("planificador")}
            className={`${t.bgCard} ${t.hoverCard} rounded-2xl p-6 text-left transition shadow`}
          >
            <span className="text-4xl">📊</span>
            <h3 className={`${t.text} font-bold text-lg mt-3`}>Planificador</h3>
            <p className={`${t.textSecondary} text-sm mt-1`}>Genera listas de ingredientes por producción</p>
          </button>

          {rol === "admin" && (
            <button
              onClick={() => navegarA("usuarios")}
              className={`${t.bgCard} ${t.hoverCard} rounded-2xl p-6 text-left transition shadow`}
            >
              <span className="text-4xl">👥</span>
              <h3 className={`${t.text} font-bold text-lg mt-3`}>Gestión de Usuarios</h3>
              <p className={`${t.textSecondary} text-sm mt-1`}>Administra roles y accesos</p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}