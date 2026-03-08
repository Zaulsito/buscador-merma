import { useTheme } from "../context/ThemeContext";

export default function TablaIngredientes({ titulo, lista, campo, onUpdate, onAgregar, onEliminar, placeholder = "Ingrediente" }) {
  const { t } = useTheme();
  const inputClass = `w-full ${t.bgInput} ${t.text} px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm`;

  return (
    <div className="mb-6">
      <h3 className={`${t.text} font-semibold mb-3`}>{titulo}</h3>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <span className={`${t.textSecondary} text-xs`}>{placeholder}</span>
        <span className={`${t.textSecondary} text-xs`}>Cant. Bruta</span>
        <span className={`${t.textSecondary} text-xs`}>Cant. Neta</span>
      </div>
      {lista.map((item, i) => (
        <div key={i} className="grid grid-cols-3 gap-2 mb-2 items-center">
          <input
            value={item.nombre}
            onChange={(e) => onUpdate(campo, i, "nombre", e.target.value)}
            className={inputClass}
            placeholder={placeholder}
          />
          <input
            value={item.cantidadBruta}
            onChange={(e) => onUpdate(campo, i, "cantidadBruta", e.target.value)}
            className={inputClass}
            placeholder="0.000"
          />
          <div className="flex gap-1">
            <input
              value={item.cantidadNeta}
              onChange={(e) => onUpdate(campo, i, "cantidadNeta", e.target.value)}
              className={inputClass}
              placeholder="0.000"
            />
            <button onClick={() => onEliminar(campo, i)} className="text-red-400 text-xs px-2">✕</button>
          </div>
        </div>
      ))}
      <button onClick={() => onAgregar(campo, { nombre: "", cantidadBruta: "", cantidadNeta: "" })} className="text-teal-400 text-sm hover:underline">
        + Agregar {placeholder.toLowerCase()}
      </button>
    </div>
  );
}