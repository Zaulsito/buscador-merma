import { useRef } from "react";
import { useTheme } from "../context/ThemeContext";

const COLORES = ["#ffffff", "#000000", "#f87171", "#fb923c", "#facc15", "#4ade80", "#60a5fa", "#c084fc"];

export default function RichTextEditor({ value, onChange }) {
  const { t } = useTheme();
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);

  // Guardar selección antes de que el botón la robe
  const guardarSeleccion = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  // Restaurar selección guardada
  const restaurarSeleccion = () => {
    const sel = window.getSelection();
    if (savedRangeRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const ejecutar = (comando, valor = null) => {
    editorRef.current?.focus();
    restaurarSeleccion();
    document.execCommand(comando, false, valor);
    onChange(editorRef.current?.innerHTML || "");
  };

  const insertarLista = (tipo) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    restaurarSeleccion();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const textoSeleccionado = range.toString();

    if (textoSeleccionado) {
      // Hay texto seleccionado → convertir cada línea en un <li>
      const lineas = textoSeleccionado.split("\n").filter(l => l.trim());
      const tag = tipo === "ol" ? "ol" : "ul";
      const lista = document.createElement(tag);
      lista.style.paddingLeft = "1.5rem";
      lista.style.marginBottom = "0.5rem";

      lineas.forEach((linea, i) => {
        const li = document.createElement("li");
        li.textContent = linea.trim();
        lista.appendChild(li);
      });

      range.deleteContents();
      range.insertNode(lista);

      // Mover cursor al final
      const newRange = document.createRange();
      newRange.setStartAfter(lista);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } else {
      // Sin selección → insertar lista nueva con un ítem vacío
      const tag = tipo === "ol" ? "ol" : "ul";
      const lista = document.createElement(tag);
      lista.style.paddingLeft = "1.5rem";
      lista.style.marginBottom = "0.5rem";
      const li = document.createElement("li");
      li.innerHTML = "\u200B"; // zero-width space para que sea editable
      lista.appendChild(li);

      range.insertNode(lista);
      const newRange = document.createRange();
      newRange.setStart(li, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    onChange(editor.innerHTML);
  };

  return (
    <div className={`${t.bgInput} rounded-lg overflow-hidden border ${t.border}`}>
      {/* Toolbar */}
      <div className={`flex items-center gap-1 px-3 py-2 border-b ${t.border} flex-wrap`}>
        <button type="button"
          onMouseDown={(e) => { e.preventDefault(); guardarSeleccion(); }}
          onClick={() => ejecutar("bold")}
          className={`${t.text} font-bold px-2 py-1 rounded hover:bg-black/20 text-sm`}>B</button>

        <button type="button"
          onMouseDown={(e) => { e.preventDefault(); guardarSeleccion(); }}
          onClick={() => ejecutar("italic")}
          className={`${t.text} italic px-2 py-1 rounded hover:bg-black/20 text-sm`}>I</button>

        <button type="button"
          onMouseDown={(e) => { e.preventDefault(); guardarSeleccion(); }}
          onClick={() => ejecutar("underline")}
          className={`${t.text} underline px-2 py-1 rounded hover:bg-black/20 text-sm`}>U</button>

        <div className={`w-px h-5 bg-current opacity-30 mx-1`} />

        <button type="button"
          onMouseDown={(e) => { e.preventDefault(); guardarSeleccion(); }}
          onClick={() => insertarLista("ol")}
          title="Lista numerada"
          className={`${t.text} px-2 py-1 rounded hover:bg-black/20 text-sm font-mono`}>1.</button>

        <button type="button"
          onMouseDown={(e) => { e.preventDefault(); guardarSeleccion(); }}
          onClick={() => insertarLista("ul")}
          title="Lista con viñetas"
          className={`${t.text} px-2 py-1 rounded hover:bg-black/20 text-sm`}>•</button>

        <div className={`w-px h-5 bg-current opacity-30 mx-1`} />

        {COLORES.map((color) => (
          <button
            key={color}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); guardarSeleccion(); }}
            onClick={() => ejecutar("foreColor", color)}
            className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0"
            style={{ backgroundColor: color }}
          />
        ))}

        <div className={`w-px h-5 bg-current opacity-30 mx-1`} />

        <button type="button"
          onMouseDown={(e) => { e.preventDefault(); guardarSeleccion(); }}
          onClick={() => { ejecutar("removeFormat"); onChange(editorRef.current?.innerHTML || ""); }}
          className={`${t.textSecondary} px-2 py-1 rounded hover:bg-black/20 text-xs`}>✕ Limpiar</button>
      </div>

      {/* Editor */}
      <div
        ref={(el) => {
          editorRef.current = el;
          if (el && el.innerHTML === "" && value) {
            el.innerHTML = value;
          }
        }}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onSelect={guardarSeleccion}
        onKeyUp={guardarSeleccion}
        onMouseUp={guardarSeleccion}
        className={`${t.text} px-3 py-3 min-h-40 outline-none text-sm leading-relaxed`}
        style={{ whiteSpace: "pre-wrap" }}
      />
      <style>{`
        [contenteditable] ol { list-style-type: decimal !important; padding-left: 1.5rem !important; margin: 0.25rem 0 !important; }
        [contenteditable] ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin: 0.25rem 0 !important; }
        [contenteditable] li { display: list-item !important; }
      `}</style>
    </div>
  );
}
