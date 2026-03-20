import { useRef } from "react";
import { useTheme } from "../context/ThemeContext";

const COLORES = ["#ffffff", "#000000", "#f87171", "#fb923c", "#facc15", "#4ade80", "#60a5fa", "#c084fc"];

export default function RichTextEditor({ value, onChange }) {
  const { t } = useTheme();
  const editorRef = useRef(null);

  const ejecutar = (comando, valor = null) => {
    editorRef.current?.focus();
    document.execCommand(comando, false, valor);
    onChange(editorRef.current?.innerHTML || "");
  };

  // Numera las líneas seleccionadas (o todas si no hay selección) sin borrar el texto
  const numerarLineas = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const sel = window.getSelection();
    const haySeleccion = sel && !sel.isCollapsed;

    if (haySeleccion) {
      // Obtener texto seleccionado y numerarlo
      const range = sel.getRangeAt(0);
      const textoSeleccionado = range.toString();
      const lineas = textoSeleccionado.split("\n").filter(l => l.trim());
      if (lineas.length === 0) return;
      const numeradas = lineas.map((l, i) => `${i + 1}- ${l.trim()}`).join("\n");
      // Reemplazar selección con texto numerado
      range.deleteContents();
      const textNode = document.createTextNode(numeradas);
      range.insertNode(textNode);
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartAfter(textNode);
      newRange.collapse(true);
      sel.addRange(newRange);
    } else {
      // Sin selección: buscar párrafo o bloque actual y numerarlo
      const range = sel?.getRangeAt(0);
      if (!range) return;
      // Obtener todo el contenido del editor como texto y numerar bloques
      const lines = editor.innerText.split("\n").filter(l => l.trim());
      const numeradas = lines.map((l, i) => `${i + 1}- ${l.replace(/^\d+-?\s*/, "").trim()}`).join("\n");
      editor.innerText = numeradas;
    }

    onChange(editor.innerHTML || "");
  };

  const insertarLista = (tipo) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    const lista = document.createElement(tipo === "ol" ? "ol" : "ul");
    lista.style.paddingLeft = "1.5rem";
    lista.style.listStyleType = tipo === "ol" ? "decimal" : "disc";

    const li = document.createElement("li");
    li.innerHTML = "<br>";
    lista.appendChild(li);
    range.insertNode(lista);
    range.setStart(li, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    onChange(editor.innerHTML);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-950/50">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/10 bg-white/5 flex-wrap">
        <button type="button" onMouseDown={(e) => { e.preventDefault(); ejecutar("bold"); }}
          className="text-slate-300 font-bold px-2 py-1.5 rounded hover:bg-white/10 transition-colors text-sm">B</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); ejecutar("italic"); }}
          className="text-slate-300 italic px-2 py-1.5 rounded hover:bg-white/10 transition-colors text-sm">I</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); ejecutar("underline"); }}
          className="text-slate-300 underline px-2 py-1.5 rounded hover:bg-white/10 transition-colors text-sm">U</button>
        <div className="w-px h-4 bg-white/20 mx-1" />
        {/* Numeración inteligente — prefija sin borrar */}
        <button type="button" onMouseDown={(e) => { e.preventDefault(); numerarLineas(); }}
          className="text-slate-300 px-2 py-1.5 rounded hover:bg-white/10 transition-colors text-sm font-mono font-bold"
          title="Numerar líneas (1- 2- 3-)">1.</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); insertarLista("ul"); }}
          className="text-slate-300 px-2 py-1.5 rounded hover:bg-white/10 transition-colors text-sm">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>format_list_bulleted</span>
        </button>
        <div className="w-px h-4 bg-white/20 mx-1" />
        {COLORES.map((color) => (
          <button key={color} type="button"
            onMouseDown={(e) => { e.preventDefault(); ejecutar("foreColor", color); }}
            className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0 hover:scale-110 transition-transform"
            style={{ backgroundColor: color }} />
        ))}
        <div className="w-px h-4 bg-white/20 mx-1" />
        <button type="button"
          onMouseDown={(e) => { e.preventDefault(); ejecutar("removeFormat"); onChange(editorRef.current?.innerHTML || ""); }}
          className="text-slate-500 hover:text-slate-300 px-2 py-1 rounded hover:bg-white/10 transition-colors text-xs">
          ✕ Limpiar
        </button>
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
        className="text-white px-4 py-4 min-h-48 outline-none text-sm leading-relaxed"
        style={{ whiteSpace: "pre-wrap", color: "#ffffff" }}
      />
    </div>
  );
}
