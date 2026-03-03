import { createContext, useContext, useState, useEffect } from "react";

const temas = {
  oscuro: {
    bg: "bg-gray-900",
    bgCard: "bg-gray-800",
    bgInput: "bg-gray-700",
    bgNav: "bg-gray-800",
    text: "text-white",
    textSecondary: "text-gray-400",
    border: "border-gray-700",
    hover: "hover:bg-gray-700",
    hoverCard: "hover:bg-gray-700",
    accent: "bg-blue-600 hover:bg-blue-700",
    badge: "bg-gray-700 text-gray-300",
  },
  gris: {
    bg: "bg-slate-700",
    bgCard: "bg-slate-600",
    bgInput: "bg-slate-500",
    bgNav: "bg-slate-800",
    text: "text-white",
    textSecondary: "text-slate-300",
    border: "border-slate-500",
    hover: "hover:bg-slate-600",
    hoverCard: "hover:bg-slate-500",
    accent: "bg-blue-600 hover:bg-blue-700",
    badge: "bg-slate-500 text-slate-200",
  },
  claro: {
    bg: "bg-gray-100",
    bgCard: "bg-white",
    bgInput: "bg-gray-200",
    bgNav: "bg-white",
    text: "text-gray-900",
    textSecondary: "text-gray-500",
    border: "border-gray-200",
    hover: "hover:bg-gray-200",
    hoverCard: "hover:bg-gray-50",
    accent: "bg-blue-600 hover:bg-blue-700",
    badge: "bg-gray-200 text-gray-700",
  },
  verde: {
    bg: "bg-emerald-950",
    bgCard: "bg-emerald-900",
    bgInput: "bg-emerald-800",
    bgNav: "bg-emerald-900",
    text: "text-white",
    textSecondary: "text-emerald-300",
    border: "border-emerald-700",
    hover: "hover:bg-emerald-800",
    hoverCard: "hover:bg-emerald-800",
    accent: "bg-emerald-600 hover:bg-emerald-700",
    badge: "bg-emerald-800 text-emerald-200",
  },
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() => localStorage.getItem("tema") || "oscuro");

  useEffect(() => {
    localStorage.setItem("tema", tema);
  }, [tema]);

  return (
    <ThemeContext.Provider value={{ tema, setTema, t: temas[tema], temas: Object.keys(temas) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}