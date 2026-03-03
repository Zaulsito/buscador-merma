import { useEffect } from "react";
import Navbar from "../components/Navbar";
import BuscadorMerma from "./BuscadorMerma";
import GestionUsuarios from "./GestionUsuarios";

export default function DashboardPage({ user, rol }) {
  const modulo = window.location.hash.replace("#", "") || null;

  const setModulo = (m) => {
    window.location.hash = m || "";
  };

  useEffect(() => {
    const handleHash = () => {
      // fuerza re-render al cambiar hash
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  if (modulo === "merma") return <BuscadorMerma user={user} rol={rol} onBack={() => setModulo("")} />;
  if (modulo === "usuarios") return <GestionUsuarios user={user} rol={rol} onBack={() => setModulo("")} />;

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar user={user} rol={rol} />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-white text-2xl font-bold mb-2">Bienvenido 👋</h2>
        <p className="text-gray-400 mb-8">Selecciona un módulo para comenzar</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setModulo("merma")}
            className="bg-gray-800 hover:bg-gray-700 rounded-2xl p-6 text-left transition shadow hover:shadow-blue-500/20"
          >
            <span className="text-4xl">🔍</span>
            <h3 className="text-white font-bold text-lg mt-3">Buscador de Merma</h3>
            <p className="text-gray-400 text-sm mt-1">Busca productos por código, nombre o categoría</p>
          </button>

          <div className="bg-gray-800/50 rounded-2xl p-6 text-left opacity-50 cursor-not-allowed">
            <span className="text-4xl">📋</span>
            <h3 className="text-white font-bold text-lg mt-3">Fichas Técnicas</h3>
            <p className="text-gray-400 text-sm mt-1">Próximamente...</p>
          </div>

          {rol === "admin" && (
            <button
              onClick={() => setModulo("usuarios")}
              className="bg-gray-800 hover:bg-gray-700 rounded-2xl p-6 text-left transition shadow hover:shadow-purple-500/20"
            >
              <span className="text-4xl">👥</span>
              <h3 className="text-white font-bold text-lg mt-3">Gestión de Usuarios</h3>
              <p className="text-gray-400 text-sm mt-1">Administra roles y accesos</p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}