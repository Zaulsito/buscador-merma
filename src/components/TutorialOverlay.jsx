import { useState, useEffect } from "react";

const STEPS_BASE = [
  {
    id: "bienvenida",
    icon: "waving_hand",
    color: "blue",
    titulo: "¡Bienvenido a R.info!",
    subtitulo: "Tu plataforma de gestión para Rincón Jumbo",
    descripcion: "Este tutorial te guiará por cada módulo de la aplicación para que puedas sacarle el máximo provecho desde el primer día. Puedes saltar o repetirlo cuando quieras.",
    tip: null,
  },
  {
    id: "inicio",
    icon: "home",
    color: "blue",
    titulo: "Inicio",
    subtitulo: "Tu centro de control",
    descripcion: "Desde aquí tienes acceso rápido a todos los módulos. Verás un resumen del estado general de la app y podrás navegar usando la barra lateral izquierda.",
    tip: "Haz clic en cualquier módulo de la barra lateral para acceder directamente.",
  },
  {
    id: "merma",
    icon: "search",
    color: "orange",
    titulo: "Buscador de Merma",
    subtitulo: "Control de desperdicios e inventario",
    descripcion: "Aquí puedes buscar productos por nombre o código, filtrar por categoría y gestionar el inventario de mermas. Cada producto muestra su código SAP, categoría y unidad de medida.",
    tip: "Usa los chips de categoría para filtrar rápidamente y las flechas ‹ › para navegar entre ellas.",
  },
  {
    id: "fichas",
    icon: "description",
    color: "indigo",
    titulo: "Fichas Técnicas",
    subtitulo: "Recetas y procedimientos detallados",
    descripcion: "Gestiona todas las fichas técnicas del restaurante. Cada ficha incluye ingredientes, proceso de elaboración, temperaturas, envases y fotos. Los estados Activa, Pendiente e Inactiva te ayudan a controlar qué fichas están listas.",
    tip: "Haz clic en una ficha para ver todos sus detalles. Los admins pueden crear, editar y eliminar fichas.",
  },
  {
    id: "planificador",
    icon: "account_tree",
    color: "purple",
    titulo: "Planificador",
    subtitulo: "Organiza tu producción",
    descripcion: "Tiene dos submódulos: el Planificador de Fichas te permite seleccionar recetas y generar automáticamente una lista consolidada de ingredientes. El Control de Merma te ayuda a planificar pedidos definiendo cantidades por producto.",
    tip: "Selecciona varias fichas a la vez para sumar sus ingredientes automáticamente.",
  },
  {
    id: "gestionamiento",
    icon: "manage_accounts",
    color: "emerald",
    titulo: "Gestionamiento",
    subtitulo: "Administración del sistema",
    descripcion: "Módulo exclusivo para administradores. Desde aquí puedes gestionar usuarios (roles y accesos), secciones del restaurante, categorías de productos y funciones del sistema.",
    tip: "Solo los usuarios con rol Admin o Único tienen acceso a este módulo.",
    soloAdmin: true,
  },
  {
    id: "fin",
    icon: "check_circle",
    color: "emerald",
    titulo: "¡Todo listo!",
    subtitulo: "Ya conoces R.info",
    descripcion: "Tienes todo lo que necesitas para comenzar. Recuerda que puedes repetir este tutorial en cualquier momento desde el Inicio. ¡Mucho éxito!",
    tip: null,
  },
];

const COLOR_STYLES = {
  blue:    { bg: "bg-blue-500/15",    border: "border-blue-500/30",    text: "text-blue-400",    btn: "bg-blue-600 hover:bg-blue-500 shadow-blue-500/25"    },
  orange:  { bg: "bg-orange-500/15",  border: "border-orange-500/30",  text: "text-orange-400",  btn: "bg-orange-600 hover:bg-orange-500 shadow-orange-500/25"  },
  indigo:  { bg: "bg-indigo-500/15",  border: "border-indigo-500/30",  text: "text-indigo-400",  btn: "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25"  },
  purple:  { bg: "bg-purple-500/15",  border: "border-purple-500/30",  text: "text-purple-400",  btn: "bg-purple-600 hover:bg-purple-500 shadow-purple-500/25"  },
  emerald: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400", btn: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25" },
};

export default function TutorialOverlay({ rol, onClose }) {
  const steps = STEPS_BASE.filter(s => !s.soloAdmin || rol === "admin" || rol === "unico");
  const [paso, setPaso] = useState(0);
  const [animando, setAnimando] = useState(false);

  const step = steps[paso];
  const c = COLOR_STYLES[step.color];
  const esUltimo = paso === steps.length - 1;
  const esPrimero = paso === 0;

  const ir = (idx) => {
    if (animando) return;
    setAnimando(true);
    setTimeout(() => {
      setPaso(idx);
      setAnimando(false);
    }, 200);
  };

  const siguiente = () => !esUltimo && ir(paso + 1);
  const anterior  = () => !esPrimero && ir(paso - 1);

  const cerrar = () => {
    localStorage.setItem("rinfo_tutorial_visto", "true");
    onClose();
  };

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") cerrar(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={cerrar}
      />

      {/* Card */}
      <div
        className={`relative w-full max-w-lg bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
          animando ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        {/* Barra de progreso top */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-800">
          <div
            className={`h-full ${c.btn.split(" ")[0]} transition-all duration-500`}
            style={{ width: `${((paso + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Glow decorativo */}
        <div className={`absolute -top-20 -right-20 w-48 h-48 ${c.bg} rounded-full blur-3xl opacity-60 pointer-events-none`} />

        <div className="p-7 pt-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className={`w-14 h-14 ${c.bg} border ${c.border} rounded-2xl flex items-center justify-center`}>
              <span className={`material-symbols-outlined ${c.text}`} style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>
                {step.icon}
              </span>
            </div>
            <button
              onClick={cerrar}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>

          {/* Contenido */}
          <div className="mb-6">
            <p className={`${c.text} text-xs font-bold uppercase tracking-widest mb-1`}>{step.subtitulo}</p>
            <h2 className="text-white text-2xl font-extrabold tracking-tight mb-3">{step.titulo}</h2>
            <p className="text-gray-400 text-sm leading-relaxed">{step.descripcion}</p>
          </div>

          {/* Tip */}
          {step.tip && (
            <div className={`${c.bg} border ${c.border} rounded-xl px-4 py-3 mb-6 flex items-start gap-2.5`}>
              <span className={`material-symbols-outlined ${c.text} flex-shrink-0 mt-0.5`} style={{ fontSize: 16 }}>lightbulb</span>
              <p className={`${c.text} text-xs leading-relaxed`}>{step.tip}</p>
            </div>
          )}

          {/* Indicadores de paso */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => ir(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === paso
                    ? `w-6 h-2 ${c.btn.split(" ")[0]}`
                    : "w-2 h-2 bg-gray-700 hover:bg-gray-600"
                }`}
              />
            ))}
          </div>

          {/* Botones */}
          <div className="flex items-center gap-3">
            {!esPrimero && (
              <button
                onClick={anterior}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                Anterior
              </button>
            )}

            <div className="flex-1" />

            {!esUltimo && (
              <button
                onClick={cerrar}
                className="px-4 py-2.5 text-gray-500 hover:text-gray-300 text-sm font-medium transition-colors"
              >
                Saltar tutorial
              </button>
            )}

            <button
              onClick={esUltimo ? cerrar : siguiente}
              className={`px-5 py-2.5 ${c.btn} text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-1.5`}
            >
              {esUltimo ? (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                  ¡Comenzar!
                </>
              ) : (
                <>
                  Siguiente
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
