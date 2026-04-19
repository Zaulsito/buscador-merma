import React from "react";

/**
 * Mapa de colores a valores RGB reales.
 * Necesario porque Tailwind no puede generar clases con nombres dinámicos.
 */
const COLOR_RGB = {
  "blue-600":    "37, 99, 235",
  "indigo-500":  "99, 102, 241",
  "indigo-600":  "79, 70, 229",
  "purple-600":  "147, 51, 234",
  "purple-500":  "168, 85, 247",
  "orange-600":  "234, 88, 12",
  "amber-500":   "245, 158, 11",
  "amber-600":   "217, 119, 6",
  "yellow-500":  "234, 179, 8",
  "cyan-600":    "8, 145, 178",
  "cyan-500":    "6, 182, 212",
  "emerald-600": "5, 150, 105",
  "rose-600":    "225, 29, 72",
  "pink-500":    "236, 72, 153",
  "slate-600":   "71, 85, 105",
  "teal-600":    "13, 148, 136",
};

/**
 * Componente que renderiza un fondo decorativo con resplandores degradados (glows).
 * Visible solo en escritorio (hidden md:block).
 *
 * @param {string} color1 - Color principal (ej: "blue-600")
 * @param {string} color2 - Color secundario (ej: "indigo-500")
 */
export default function DecorativeBackground({
  color1 = "blue-600",
  color2 = "indigo-500",
}) {
  const rgb1 = COLOR_RGB[color1] || COLOR_RGB["blue-600"];
  const rgb2 = COLOR_RGB[color2] || COLOR_RGB["indigo-500"];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block" aria-hidden="true">
      {/* Resplandor Superior Izquierdo */}
      <div
        style={{
          position: "absolute",
          top: "-8rem",
          left: "-8rem",
          width: "24rem",
          height: "24rem",
          borderRadius: "9999px",
          background: `rgba(${rgb1}, 0.12)`,
          filter: "blur(80px)",
        }}
      />

      {/* Resplandor Inferior Derecho */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: "-8rem",
          width: "20rem",
          height: "20rem",
          borderRadius: "9999px",
          background: `rgba(${rgb2}, 0.10)`,
          filter: "blur(80px)",
        }}
      />

      {/* Resplandor Central sutil */}
      <div
        style={{
          position: "absolute",
          top: "25%",
          left: "33%",
          width: "16rem",
          height: "16rem",
          borderRadius: "9999px",
          background: `rgba(${rgb1}, 0.06)`,
          filter: "blur(80px)",
        }}
      />
    </div>
  );
}
