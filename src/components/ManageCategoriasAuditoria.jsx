import React, { useState } from "react";
import { db } from "../firebase/config";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import toast from "react-hot-toast";

export default function ManageCategoriasAuditoria({ categorias, onClose, onUpdate }) {
  const { t } = useTheme();
  const [nuevaCat, setNuevaCat] = useState("");
  const [editando, setEditando] = useState(null);
  const [editNombre, setEditNombre] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!nuevaCat.trim()) return;
    try {
      await addDoc(collection(db, "auditoria_categorias"), { nombre: nuevaCat.trim() });
      toast.success("Categoría agregada");
      setNuevaCat("");
      onUpdate();
    } catch (error) {
      toast.error("Error al agregar categoría");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar esta categoría? No se borrarán los productos que ya la tienen.")) {
      try {
        await deleteDoc(doc(db, "auditoria_categorias", id));
        toast.success("Categoría eliminada");
        onUpdate();
      } catch (error) {
        toast.error("Error al eliminar categoría");
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editNombre.trim()) return;
    try {
      await updateDoc(doc(db, "auditoria_categorias", editando), { nombre: editNombre.trim() });
      toast.success("Categoría actualizada");
      setEditando(null);
      setEditNombre("");
      onUpdate();
    } catch (error) {
      toast.error("Error al actualizar");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] px-4 backdrop-blur-sm">
      <div className={`${t.bgCard} rounded-3xl p-6 w-full max-w-lg shadow-xl border ${t.border} flex flex-col max-h-[90vh]`}>
        <div className={`flex justify-between items-center mb-4 pb-4 border-b ${t.border}`}>
          <h2 className={`${t.text} text-xl font-bold`}>Gestionar Categorías</h2>
          <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-full ${t.bgInput} ${t.textSecondary} hover:text-white`}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-2 mb-4">
          {categorias.map(cat => (
            <div key={cat.id} className={`flex items-center justify-between p-3 rounded-xl border ${t.border} ${t.bgInput}`}>
              {editando === cat.id ? (
                <form onSubmit={handleUpdate} className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className={`flex-1 px-3 py-1 rounded-lg ${t.bgCard} border ${t.border} ${t.text} focus:outline-none`}
                    autoFocus
                  />
                  <button type="submit" className="px-3 bg-blue-600 text-white rounded-lg text-sm font-bold">Guardar</button>
                  <button type="button" onClick={() => setEditando(null)} className="px-3 bg-red-500/20 text-red-400 rounded-lg text-sm font-bold">Cancelar</button>
                </form>
              ) : (
                <>
                  <span className={`${t.text} font-semibold`}>{cat.nombre}</span>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditando(cat.id); setEditNombre(cat.nombre); }} className={`w-8 h-8 flex items-center justify-center rounded-lg text-blue-400 hover:bg-blue-400/10`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                    </button>
                    <button onClick={() => handleDelete(cat.id)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-400/10`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {categorias.length === 0 && (
            <p className={`${t.textSecondary} text-center py-4 text-sm`}>No hay categorías creadas.</p>
          )}
        </div>

        <form onSubmit={handleAdd} className={`flex gap-2 pt-4 border-t ${t.border}`}>
          <input
            type="text"
            placeholder="Nueva categoría..."
            value={nuevaCat}
            onChange={(e) => setNuevaCat(e.target.value)}
            className={`flex-1 px-4 py-2.5 rounded-xl ${t.bgInput} border ${t.border} ${t.text} focus:outline-none focus:border-purple-500`}
          />
          <button type="submit" disabled={!nuevaCat.trim()} className="px-6 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-2 transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
            Agregar
          </button>
        </form>
      </div>
    </div>
  );
}
