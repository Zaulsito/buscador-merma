import { useTheme } from "../context/ThemeContext";

const COLORES = ["#ffffff", "#000000", "#f87171", "#fb923c", "#facc15", "#4ade80", "#60a5fa", "#c084fc"];

export default function RichTextEditor({ value, onChange }) {
  const { t } = useTheme();

  const ejecutar = (comando, valor = null) => {
    document.execCommand(comando, false, valor);
  };

  return (
    <div className={`${t.bgInput} rounded-lg overflow-hidden border ${t.border}`}>
      {/* Toolbar */}
      <div className={`flex items-center gap-1 px-3 py-2 border-b ${t.border} flex-wrap`}>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); ejecutar("bold"); }} className={`${t.text} font-bold px-2 py-1 rounded hover:bg-black/20 text-sm`}>B</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); ejecutar("italic"); }} className={`${t.text} italic px-2 py-1 rounded hover:bg-black/20 text-sm`}>I</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); ejecutar("underline"); }} className={`${t.text} underline px-2 py-1 rounded hover:bg-black/20 text-sm`}>U</button>
        <div className={`w-px h-5 ${t.border} bg-current opacity-30 mx-1`} />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); ejecutar("insertOrderedList"); }} className={`${t.text} px-2 py-1 rounded hover:bg-black/20 text-sm`}>1.</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); ejecutar("insertUnorderedList"); }} className={`${t.text} px-2 py-1 rounded hover:bg-black/20 text-sm`}>•</button>
        <div className={`w-px h-5 ${t.border} bg-current opacity-30 mx-1`} />
        {COLORES.map((color) => (
          <button
            key={color}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); ejecutar("foreColor", color); }}
            className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0"
            style={{ backgroundColor: color }}
          />
        ))}
        <div className={`w-px h-5 ${t.border} bg-current opacity-30 mx-1`} />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); ejecutar("removeFormat"); }} className={`${t.textSecondary} px-2 py-1 rounded hover:bg-black/20 text-xs`}>✕ Limpiar</button>
      </div>

      {/* Editor */}
      <div
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        dangerouslySetInnerHTML={{ __html: value }}
        className={`${t.text} px-3 py-3 min-h-40 outline-none text-sm leading-relaxed`}
        style={{ whiteSpace: "pre-wrap" }}
      />
    </div>
  );
}