import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
// Usaremos métodos nativos de JS para evitar la dependencia de date-fns que no está instalada
const formatFecha = (date) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const formatFechaTitulo = (date, vista, inicio, fin) => {
  if (vista === 'diaria') {
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  if (vista === 'semanal') {
    return `Semana del ${inicio.getDate()} ${inicio.toLocaleString('es-ES', {month: 'short'})} al ${fin.getDate()} ${fin.toLocaleString('es-ES', {month: 'short'})}`;
  }
  return date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
};
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const SanitizacionModule = ({ rol, cuarto = 'postres' }) => {
  const { t } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [vista, setVista] = useState('diaria');
  const [fechaBase, setFechaBase] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [errorIndex, setErrorIndex] = useState(false);
  
  const [formData, setFormData] = useState({
    producto: '',
    proveedor: '',
    cantidad: '',
    concentracion: '',
    tiempo: '',
    accionCorrectiva: '',
    monitor: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || ''
  });

  const esAdmin = rol === 'admin' || rol === 'superadmin' || rol === 'unico';
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Obtener rango de fechas según la vista
  const getRango = () => {
    const inicio = new Date(fechaBase);
    const fin = new Date(fechaBase);
    
    if (vista === 'diaria') {
      inicio.setHours(0,0,0,0);
      fin.setHours(23,59,59,999);
    } else if (vista === 'semanal') {
      const day = inicio.getDay();
      const diff = inicio.getDate() - day + (day === 0 ? -6 : 1);
      inicio.setDate(diff);
      inicio.setHours(0,0,0,0);
      fin.setDate(inicio.getDate() + 6);
      fin.setHours(23,59,59,999);
    } else {
      inicio.setDate(1);
      inicio.setHours(0,0,0,0);
      fin.setMonth(inicio.getMonth() + 1);
      fin.setDate(0);
      fin.setHours(23,59,59,999);
    }
    return { inicio, fin };
  };

  useEffect(() => {
    const { inicio, fin } = getRango();
    const q = query(
      collection(db, 'trazabilidad_sanitizacion'),
      where('cuarto', '==', cuarto),
      where('fecha', '>=', inicio),
      where('fecha', '<=', fin),
      orderBy('fecha', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setRegistros(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
      setErrorIndex(false);
    }, (err) => {
      console.error("Error en Sanitizacion:", err);
      setLoading(false);
      if (err.code === 'failed-precondition') {
        setErrorIndex(true);
      }
    });

    return () => unsub();
  }, [vista, fechaBase]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...formData,
        cuarto,
        fecha: editId ? registros.find(r => r.id === editId).fecha : serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (editId) {
        await updateDoc(doc(db, 'trazabilidad_sanitizacion', editId), data);
      } else {
        await addDoc(collection(db, 'trazabilidad_sanitizacion'), {
          ...data,
          fecha: new Date() // Usar fecha actual para el registro nuevo
        });
      }
      toast.success(editId ? "Registro actualizado" : "Nuevo registro creado");
      
      setModalOpen(false);
      setEditId(null);
      setFormData({
        producto: '', proveedor: '', cantidad: '', concentracion: '', tiempo: '', accionCorrectiva: '',
        monitor: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || ''
      });
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar los datos");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (reg) => {
    setEditId(reg.id);
    setFormData({
      producto: reg.producto,
      proveedor: reg.proveedor,
      cantidad: reg.cantidad,
      concentracion: reg.concentracion,
      tiempo: reg.tiempo,
      accionCorrectiva: reg.accionCorrectiva || '',
      monitor: reg.monitor
    });
    setModalOpen(true);
  };

  const exportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const { inicio, fin } = getRango();
    
    // Header
    doc.setFontSize(10);
    doc.text("REGISTRO PCC SANITIZACIÓN FRUTAS, HORTALIZAS Y HUEVOS", 148, 15, { align: 'center' });
    doc.setFontSize(8);
    const inicioStr = inicio.toLocaleDateString('es-ES');
    const finStr = fin.toLocaleDateString('es-ES');
    doc.text(`LOCAL: Bellavista | SECCIÓN: Postres | PERIODO: ${inicioStr} - ${finStr}`, 15, 25);

    const tableData = registros.map(r => {
      const f = r.fecha.toDate ? r.fecha.toDate() : new Date(r.fecha);
      const fStr = f.toLocaleDateString('es-ES') + ' ' + f.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      return [
        fStr,
        r.producto,
        r.proveedor,
        r.cantidad,
        r.concentracion,
        r.tiempo,
        r.accionCorrectiva || '-',
        r.monitor
      ];
    });

    doc.autoTable({
      startY: 30,
      head: [['Fecha/Hora', 'Materia Prima', 'Proveedor', 'Cantidad', 'Conc. (ppm)', 'Tiempo (min)', 'Acción Correctiva', 'Monitor']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [225, 29, 72], textColor: 255, fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 40 },
        6: { cellWidth: 40 }
      }
    });

    doc.save(`Sanitizacion_${cuarto}_${new Date().toLocaleDateString('es-ES').replace(/\//g, '')}.pdf`);
  };

  const navegar = (n) => {
    const d = new Date(fechaBase);
    if (vista === 'diaria') d.setDate(d.getDate() + n);
    else if (vista === 'semanal') d.setDate(d.getDate() + (n * 7));
    else d.setMonth(d.getMonth() + n);
    setFechaBase(d);
  };

  const getTitulo = () => {
    const { inicio, fin } = getRango();
    return formatFechaTitulo(fechaBase, vista, inicio, fin);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Controles de Vista y Fecha */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex p-1 rounded-xl ${t.bgInput} border ${t.border} w-fit`}>
            {['diaria', 'semanal', 'mensual'].map(v => (
              <button key={v} onClick={() => setVista(v)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${vista === v ? 'bg-rose-600 text-white shadow-lg' : `${t.textSecondary} hover:text-white`}`}>{v}</button>
            ))}
          </div>
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className={`w-9 h-9 rounded-xl border ${showInfo ? 'bg-amber-500/20 border-amber-500 text-amber-500' : `${t.bgCard} ${t.border} ${t.textSecondary} hover:border-amber-500/50 hover:text-amber-500`} transition-all flex items-center justify-center`}
            title="Ver Límites y Procedimientos"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>info</span>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <h2 className={`${t.text} text-sm font-bold opacity-80 capitalize`}>{getTitulo()}</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => navegar(-1)} className={`w-8 h-8 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-rose-500 transition`}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span></button>
            <button onClick={() => navegar(1)} className={`w-8 h-8 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-rose-500 transition`}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span></button>
          </div>
        </div>
      </div>

      {/* Banner de Información y Límites (Toggleable) */}
      {showInfo && (
        <div className={`${t.bgCard} border border-amber-500/20 rounded-2xl p-4 flex gap-4 items-start animate-in fade-in zoom-in duration-300 relative overflow-hidden`}>
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined">info</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className={`${t.text} text-xs font-black uppercase tracking-widest flex items-center gap-2`}>
                Límites Críticos y Procedimientos
              </h4>
              <button onClick={() => setShowInfo(false)} className={`${t.textSecondary} hover:text-white transition`}><span className="material-symbols-outlined text-sm">close</span></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className={`${t.textSecondary} text-[10px] font-bold uppercase tracking-tight opacity-50`}>Tiempo de Contacto / Límite Crítico</p>
                <p className={`${t.text} text-[11px] leading-relaxed`}>
                  <span className="font-bold text-rose-400">AFVT (Ecolab):</span> 1:102 - 1:85 por 3 min (1746 a 2095 ppm)<br/>
                  <span className="font-bold text-rose-400">MG Quat:</span> 200 ppm por 3 minutos.
                </p>
              </div>
              <div className="space-y-1">
                <p className={`${t.textSecondary} text-[10px] font-bold uppercase tracking-tight opacity-50`}>Acción Correctiva (Dilución Manual)</p>
                <p className={`${t.text} text-[11px] leading-relaxed`}>
                  <span className="font-bold text-rose-400">AFVT:</span> 11 ml por 1 litro de agua<br/>
                  <span className="font-bold text-rose-400">MG Quat:</span> 2 ml por 1 litro de agua
                </p>
              </div>
            </div>
            <p className={`${t.textSecondary} text-[10px] mt-3 italic`}>* Si ocurre desviación, realizar dilución manual, volver a sanitizar y dar aviso al tecnólogo de turno.</p>
          </div>
        </div>
      )}

      {/* Error de Índice */}
      {errorIndex && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4 flex items-center gap-3 animate-bounce">
          <span className="material-symbols-outlined text-red-500">warning</span>
          <p className="text-red-500 text-xs font-bold">Falta configurar el índice en la consola de Firebase para esta vista.</p>
        </div>
      )}

      {/* Tabla de Registros */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-rose-500/10">
              <th className={`p-4 text-[10px] font-black uppercase tracking-widest ${t.textSecondary}`}>Fecha/Hora</th>
              <th className={`p-4 text-[10px] font-black uppercase tracking-widest ${t.textSecondary}`}>Materia Prima</th>
              <th className={`p-4 text-[10px] font-black uppercase tracking-widest ${t.textSecondary}`}>Proveedor</th>
              <th className={`p-4 text-[10px] font-black uppercase tracking-widest ${t.textSecondary}`}>Cantidad</th>
              <th className={`p-4 text-[10px] font-black uppercase tracking-widest ${t.textSecondary}`}>Conc. (ppm)</th>
              <th className={`p-4 text-[10px] font-black uppercase tracking-widest ${t.textSecondary}`}>Tiempo</th>
              <th className={`p-4 text-[10px] font-black uppercase tracking-widest ${t.textSecondary}`}>Acción Correctiva</th>
              <th className={`p-4 text-[10px] font-black uppercase tracking-widest ${t.textSecondary}`}>Monitor</th>
              <th className={`p-4 text-[10px] font-black uppercase tracking-widest ${t.textSecondary}`}>Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={9} className="p-10 text-center"><span className="w-8 h-8 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin inline-block"></span></td></tr>
            ) : registros.length === 0 ? (
              <tr><td colSpan={9} className={`p-10 text-center ${t.textSecondary} italic`}>No hay registros para este periodo</td></tr>
            ) : registros.map(r => (
              <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                <td className={`p-4 text-xs font-bold ${t.text}`}>{formatFecha(r.fecha)}</td>
                <td className={`p-4 text-xs font-bold ${t.text}`}>{r.producto}</td>
                <td className={`p-4 text-xs ${t.textSecondary}`}>{r.proveedor}</td>
                <td className={`p-4 text-xs ${t.textSecondary}`}>{r.cantidad}</td>
                <td className={`p-4 text-xs font-mono font-bold text-rose-400`}>{r.concentracion} ppm</td>
                <td className={`p-4 text-xs ${t.textSecondary}`}>{r.tiempo} min</td>
                <td className={`p-4 text-xs ${r.accionCorrectiva ? 'text-rose-400' : t.textSecondary}`}>{r.accionCorrectiva || '-'}</td>
                <td className={`p-4 text-xs ${t.textSecondary}`}>{r.monitor}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(r)} className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center"><span className="material-symbols-outlined text-sm">edit</span></button>
                      {esAdmin && (
                        <div className="flex items-center">
                          {confirmDeleteId === r.id ? (
                            <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-300">
                              <button 
                                type="button"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  try {
                                    await deleteDoc(doc(db, 'trazabilidad_sanitizacion', r.id));
                                    toast.success("Eliminado");
                                    setConfirmDeleteId(null);
                                  } catch (err) {
                                    console.error(err);
                                    toast.error("Error al borrar");
                                  }
                                }}
                                className="px-2 py-1 rounded-md bg-red-600 text-[10px] font-black text-white uppercase tracking-wider hover:bg-red-700 transition-colors"
                              >
                                Confirmar
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                className="p-1 rounded-md bg-white/10 text-white/50 hover:text-white transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm">close</span>
                              </button>
                            </div>
                          ) : (
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(r.id); }} 
                              className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center relative z-10"
                              title="Eliminar registro"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                        </div>
                      )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Botones Flotantes */}
      <div className="fixed bottom-10 right-10 flex flex-col gap-3 z-50">
        <button onClick={exportPDF} className="w-14 h-14 md:w-auto md:h-auto md:px-6 md:py-3 rounded-full md:rounded-xl bg-rose-950/40 backdrop-blur-md text-rose-200 font-bold shadow-2xl hover:bg-rose-900/60 transition-all flex items-center justify-center gap-2 border border-rose-500/20 group"><span className="material-symbols-outlined">picture_as_pdf</span><span className="hidden md:inline">PDF</span></button>
        <button onClick={() => { setEditId(null); setFormData({ producto: '', proveedor: '', cantidad: '', concentracion: '', tiempo: '', accionCorrectiva: '', monitor: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || '' }); setModalOpen(true); }} className="w-14 h-14 md:w-auto md:h-auto md:px-6 md:py-3 rounded-full md:rounded-xl bg-rose-600 text-white font-bold shadow-2xl shadow-rose-500/20 hover:scale-110 active:scale-95 transition-all flex items-center justify-center gap-2 group"><span className="material-symbols-outlined">add</span><span className="hidden md:inline">Nuevo Registro</span></button>
      </div>

      {/* Modal de Formulario */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`${t.bgCard} border ${t.border} rounded-3xl p-6 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center">
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>clean_hands</span>
                </div>
                <h3 className={`${t.text} text-xl font-bold`}>{editId ? 'Editar Sanitización' : 'Nueva Sanitización'}</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className={`${t.textSecondary} hover:text-white transition`}><span className="material-symbols-outlined">close</span></button>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={`text-[10px] font-black uppercase tracking-widest ${t.textSecondary} mb-1 block`}>Materia Prima / Producto</label>
                <input required type="text" value={formData.producto} onChange={e => setFormData({...formData, producto: e.target.value})} className={`w-full ${t.bgInput} ${t.text} p-3 rounded-xl border ${t.border} focus:outline-none focus:border-rose-500`} placeholder="Ej: Lechuga, Frutillas..." />
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest ${t.textSecondary} mb-1 block`}>Proveedor</label>
                <input required type="text" value={formData.proveedor} onChange={e => setFormData({...formData, proveedor: e.target.value})} className={`w-full ${t.bgInput} ${t.text} p-3 rounded-xl border ${t.border} focus:outline-none focus:border-rose-500`} placeholder="Ej: Natfruit" />
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest ${t.textSecondary} mb-1 block`}>Cantidad</label>
                <input required type="text" value={formData.cantidad} onChange={e => setFormData({...formData, cantidad: e.target.value})} className={`w-full ${t.bgInput} ${t.text} p-3 rounded-xl border ${t.border} focus:outline-none focus:border-rose-500`} placeholder="Ej: 2 kg, 10 ud" />
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest ${t.textSecondary} mb-1 block`}>Concentración (ppm)</label>
                <input required type="text" value={formData.concentracion} onChange={e => setFormData({...formData, concentracion: e.target.value})} className={`w-full ${t.bgInput} ${t.text} p-3 rounded-xl border ${t.border} focus:outline-none focus:border-rose-500`} placeholder="Ej: 1:102 - 1:85" />
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest ${t.textSecondary} mb-1 block`}>Tiempo (min)</label>
                <input required type="text" value={formData.tiempo} onChange={e => setFormData({...formData, tiempo: e.target.value})} className={`w-full ${t.bgInput} ${t.text} p-3 rounded-xl border ${t.border} focus:outline-none focus:border-rose-500`} placeholder="Ej: 5" />
              </div>
              <div className="md:col-span-2">
                <label className={`text-[10px] font-black uppercase tracking-widest ${t.textSecondary} mb-1 block`}>Acción Correctiva (opcional)</label>
                <textarea value={formData.accionCorrectiva} onChange={e => setFormData({...formData, accionCorrectiva: e.target.value})} className={`w-full ${t.bgInput} ${t.text} p-3 rounded-xl border ${t.border} focus:outline-none focus:border-rose-500 h-20 resize-none`} placeholder="Si la concentración es baja..." />
              </div>
              <div className="md:col-span-2">
                <label className={`text-[10px] font-black uppercase tracking-widest ${t.textSecondary} mb-1 block`}>Monitor (Automático)</label>
                <input disabled type="text" value={formData.monitor} className={`w-full ${t.bgInput} ${t.text} p-3 rounded-xl border ${t.border} opacity-60 cursor-not-allowed`} />
              </div>

              <div className="md:col-span-2 mt-4 flex gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className={`flex-1 py-4 rounded-2xl ${t.bgInput} ${t.text} font-bold hover:bg-white/5 transition-all`}>Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-4 rounded-2xl bg-rose-600 text-white font-bold shadow-xl shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                  {saving ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : (editId ? 'Guardar Cambios' : 'Registrar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SanitizacionModule;
