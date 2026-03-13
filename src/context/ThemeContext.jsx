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
    cardImage: "from-slate-800 to-slate-900",
    cardBtn: "bg-slate-800 hover:bg-slate-700 text-slate-300",
    cardBtnDelete: "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white",
    isDark: true,
  },
  claro: {
    bg: "bg-slate-100",
    bgCard: "bg-white",
    bgInput: "bg-slate-100",
    bgNav: "bg-white",
    text: "text-slate-900",
    textSecondary: "text-slate-500",
    border: "border-slate-200",
    hover: "hover:bg-slate-100",
    hoverCard: "hover:bg-slate-50",
    accent: "bg-blue-600 hover:bg-blue-700",
    badge: "bg-slate-100 text-slate-600 border border-slate-200",
    cardImage: "from-slate-200 to-slate-100",
    cardBtn: "bg-slate-100 hover:bg-slate-200 text-slate-700",
    cardBtnDelete: "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white",
    isDark: false,
  },
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() => { const saved = localStorage.getItem("tema"); return (saved === "oscuro" || saved === "claro") ? saved : "oscuro"; });

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
