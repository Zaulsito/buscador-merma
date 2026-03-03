import { useState } from "react";
import Navbar from "../components/Navbar";
import BuscadorMerma from "./BuscadorMerma";

export default function DashboardPage({ user }) {
  const [modulo, setModulo] = useState(null);

  if (modulo === "merma") return <BuscadorMerma user={user} onBack={() => setModulo(null)} />;

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar user={user} />
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
        </div>
      </div>
    </div>
  );
}