import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function fechaLocal(year, month, day) { return new Date(year, month, day, 12, 0, 0, 0); }
function getLunes(date) {
  const y = date.getFullYear(), mo = date.getMonth(), d = date.getDate();
  const base = fechaLocal(y, mo, d);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return fechaLocal(y, mo, d + diff);
}
function addDays(date, n) { return fechaLocal(date.getFullYear(), date.getMonth(), date.getDate() + n); }
function formatFechaShort(date) { return `${date.getDate()} ${MESES[date.getMonth()].slice(0, 3).toUpperCase()}`; }

// Helpers de formato
const formatDateOnly = (date) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
};

const formatTimeOnly = (date) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

const formatFechaTitulo = (date, vista) => {
  if (vista === 'semanal') {
    const lunes = getLunes(date);
    const domingo = addDays(lunes, 6);
    return `Semana del ${formatFechaShort(lunes)} al ${formatFechaShort(domingo)}`;
  }
  if (vista === 'diaria') return `${DIAS[date.getDay()]}, ${date.getDate()} de ${MESES[date.getMonth()]}`;
  return `${MESES[date.getMonth()]} ${date.getFullYear()}`;
};

const SanitizacionModule = ({ rol, cuarto = 'postres' }) => {
  const { t } = useTheme();
  const isRed = cuarto?.toLowerCase().includes('caliente');
  const accent = isRed ? 'red' : 'pink';

  // Clases dinámicas
  const accentBg = isRed ? 'bg-red-500/20' : 'bg-pink-500/20';
  const accentText = isRed ? 'text-red-500' : 'text-pink-500';
  const accentText400 = isRed ? 'text-red-400' : 'text-pink-400';
  const accentBorder = isRed ? 'border-red-500/20' : 'border-pink-500/20';
  const accentShadow = isRed ? 'shadow-red-500/10' : 'shadow-pink-500/10';
  const accentGlow = isRed ? 'shadow-red-500/20' : 'shadow-pink-500/20';
  const accentBtn = isRed ? 'bg-red-600' : 'bg-pink-600';
  const accentBtn500 = isRed ? 'bg-red-500' : 'bg-pink-500';
  const accentBtnShadow = isRed ? 'shadow-red-500/30' : 'shadow-pink-500/30';
  const accentHover = isRed ? 'hover:border-red-500/50 hover:text-red-500' : 'hover:border-pink-500/50 hover:text-pink-500';
  const accentHoverSolid = isRed ? 'hover:bg-red-500' : 'hover:bg-pink-500';
  const accentFocus = isRed ? 'focus:border-red-500' : 'focus:border-pink-500';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [vista, setVista] = useState('diaria');
  const [fechaBase, setFechaBase] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  
  const [formData, setFormData] = useState({
    producto: '', proveedor: '', cantidad: '', concentracion: '', tiempo: '', accionCorrectiva: '',
    fecha: '', hora: '', monitor: ''
  });

  const [listaProveedores, setListaProveedores] = useState([]);
  const esAdmin = rol === 'admin' || rol === 'superadmin' || rol === 'unico';
  const [showAuditModal, setShowAuditModal] = useState(false);

  const getRango = () => {
    const inicio = new Date(fechaBase);
    const fin = new Date(fechaBase);
    if (vista === 'diaria') { inicio.setHours(0,0,0,0); fin.setHours(23,59,59,999); } 
    else if (vista === 'semanal') {
      const lunes = getLunes(fechaBase);
      inicio.setTime(lunes.getTime()); inicio.setHours(0,0,0,0);
      fin.setTime(lunes.getTime()); fin.setDate(inicio.getDate() + 6); fin.setHours(23,59,59,999);
    } else {
      inicio.setDate(1); inicio.setHours(0,0,0,0);
      fin.setMonth(inicio.getMonth() + 1); fin.setDate(0); fin.setHours(23,59,59,999);
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
    }, (err) => {
      console.error("Error en Sanitizacion:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [vista, fechaBase]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "proveedores"), (snap) => {
      setListaProveedores(snap.docs.filter(d => d.data().activo !== false).map(d => d.data().nombre).sort());
    });
    return () => unsub();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const combinedDate = new Date(`${formData.fecha}T${formData.hora}`);
      const data = {
        ...formData,
        cuarto,
        fecha: combinedDate,
        updatedAt: serverTimestamp()
      };

      if (editId) {
        await updateDoc(doc(db, 'trazabilidad_sanitizacion', editId), data);
        toast.success("Registro actualizado");
        setModalOpen(false);
      } else {
        await addDoc(collection(db, 'trazabilidad_sanitizacion'), data);
        toast.success("Registro guardado ✅");
        
        const continuar = window.confirm("¿Deseas añadir otro producto a este proceso de sanitización?");
        if (continuar) {
          setFormData(prev => ({
            ...prev,
            producto: '',
            cantidad: '',
            accionCorrectiva: ''
          }));
          setTimeout(() => document.getElementById('input-producto-sanitizacion')?.focus(), 100);
        } else {
          setModalOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar");
    } finally { setSaving(false); }
  };

  const openNewModal = () => {
    const now = new Date();
    const d = new Date(fechaBase);
    setEditId(null);
    setFormData({
      producto: '', proveedor: '', cantidad: '', concentracion: '', tiempo: '', accionCorrectiva: '',
      fecha: d.toISOString().slice(0, 10),
      hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }),
      monitor: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || ''
    });
    setModalOpen(true);
    setShowTooltip(false);
  };

  const openEdit = (reg) => {
    setEditId(reg.id);
    const f = reg.fecha.toDate ? reg.fecha.toDate() : new Date(reg.fecha);
    setFormData({
      producto: reg.producto, proveedor: reg.proveedor, cantidad: reg.cantidad,
      concentracion: reg.concentracion, tiempo: reg.tiempo, accionCorrectiva: reg.accionCorrectiva || '',
      fecha: f.toISOString().slice(0, 10),
      hora: f.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }),
      monitor: reg.monitor
    });
    setModalOpen(true);
  };

  const handleExportPDF = () => setShowAuditModal(true);
  const confirmExport = async () => {
    setShowAuditModal(false);
    const printId = `SAN-${Date.now().toString(36).toUpperCase()}`;
    const { inicio } = getRango();
    try {
      await addDoc(collection(db, 'log_impresiones'), {
        printId, usuario: auth.currentUser?.email, displayName: auth.currentUser?.displayName,
        modulo: 'PCC Sanitización', cuarto, fechaReporte: inicio.toLocaleDateString('es-ES'),
        fechaImpresion: serverTimestamp()
      });
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const verdeJumbo = [0, 85, 44];
      doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(verdeJumbo[0], verdeJumbo[1], verdeJumbo[2]);
      doc.text("REGISTRO PCC SANITIZACIÓN FRUTAS, HORTALIZAS Y HUEVOS", 32, 16);
      const head = [['Fecha/Hora', 'Materia Prima', 'Proveedor', 'Cant.', 'Conc. (ppm)', 'Tiempo (min)', 'Acción Correctiva', 'Monitor']];
      const body = registros.map(r => {
        const f = r.fecha.toDate ? r.fecha.toDate() : new Date(r.fecha);
        return [f.toLocaleDateString('es-ES') + ' ' + f.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), r.producto, r.proveedor, r.cantidad, r.concentracion, r.tiempo, r.accionCorrectiva || '-', r.monitor];
      });
      autoTable(doc, { startY: 36, head, body, theme: 'grid', headStyles: { fillColor: verdeJumbo, textColor: 255, fontSize: 7, fontStyle: 'bold' }, bodyStyles: { fontSize: 7 } });
      doc.save(`Sanitizacion_${cuarto}_${new Date().toLocaleDateString('es-ES').replace(/\//g, '')}.pdf`);
      toast.success("PDF generado 📄");
    } catch (err) { console.error(err); toast.error("Fallo al generar el PDF"); }
  };

  const navegar = (n) => {
    const d = new Date(fechaBase);
    if (vista === 'diaria') d.setDate(d.getDate() + n);
    else if (vista === 'semanal') d.setDate(d.getDate() + (n * 7));
    else d.setMonth(d.getMonth() + n);
    setFechaBase(d);
  };

  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${accentBg} ${accentText} flex items-center justify-center shadow-lg ${accentShadow} border ${accentBorder}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 32 }}>clean_hands</span>
            </div>
            <div>
              <h1 className="text-white text-2xl font-black tracking-tight leading-none mb-1 uppercase">PCC Sanitización</h1>
              <p className="text-white/60 text-[10px] uppercase font-black tracking-[0.2em] opacity-60">Frutas, Hortalizas y Huevos</p>
            </div>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className={`w-10 h-10 rounded-xl border ${showInfo ? `${accentBg} border-${accent}-500 ${accentText} shadow-[0_0_15px_rgba(236,72,153,0.2)]` : `${t.bgCard} ${t.border} text-white/60 ${accentHover}`} transition-all flex items-center justify-center`}><span className="material-symbols-outlined" style={{ fontSize: 22 }}>info</span></button>
        </div>

        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl ${t.bgCard} border ${t.border} shadow-sm`}>
          <div className={`flex p-1 rounded-xl ${t.bgInput} border ${t.border} w-fit shadow-inner`}>
            {['diaria', 'semanal', 'mensual'].map(v => (
              <button key={v} onClick={() => setVista(v)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${vista === v ? `${accentBtn} text-white shadow-lg ${accentBtnShadow}` : `text-white/60 hover:text-white`}`}>{v}</button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <h2 className="text-white text-base font-bold tracking-tight">{formatFechaTitulo(fechaBase, vista)}</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => navegar(-1)} className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} text-white/60 ${accentHover} transition-all shadow-sm active:scale-90`}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span></button>
              <button onClick={() => document.getElementById('date-picker-sanitizacion').showPicker()} className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} text-white/60 ${accentHover} transition-all shadow-sm active:scale-90`}><span className="material-symbols-outlined" style={{ fontSize: 20 }}>calendar_month</span></button>
              <input id="date-picker-sanitizacion" type="date" className="absolute inset-0 opacity-0 pointer-events-none" value={fechaBase.toISOString().split('T')[0]} onChange={(e) => { if (e.target.value) setFechaBase(new Date(e.target.value + 'T12:00:00')); }} />
              <button onClick={() => navegar(1)} className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} text-white/60 ${accentHover} transition-all shadow-sm active:scale-90`}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span></button>
            </div>
          </div>
        </div>
      </div>

      <div className={`${t.bgCard} border ${t.border} rounded-3xl p-6 shadow-xl overflow-visible`}>
        <div className="relative flex items-center justify-center mb-10">
          <h2 className="text-white font-black uppercase tracking-[0.3em] text-xs opacity-40">Registros de Sanitización</h2>
          <div className="absolute right-0">
            {showTooltip && (
              <div className="absolute -top-14 right-0 animate-bounce pointer-events-none z-50">
                <div className={`relative ${accentBtn500} text-white text-[11px] font-black uppercase tracking-tight px-4 py-2.5 rounded-2xl ${accentGlow} whitespace-nowrap`}>Agregar registro<div className={`absolute -bottom-1 right-6 w-3 h-3 ${accentBtn500} rotate-45 rounded-sm`}></div></div>
              </div>
            )}
            <button onClick={openNewModal} className={`group flex items-center gap-0 hover:gap-3 px-3 py-3 hover:px-6 rounded-2xl ${accentBtn500} text-white font-black text-xs uppercase tracking-widest ${accentGlow} hover:scale-105 active:scale-95 transition-all duration-500 ease-in-out overflow-hidden animate-glow-pulse`}><span className="material-symbols-outlined text-xl transition-transform duration-500 group-hover:rotate-90">add</span><span className="max-w-0 group-hover:max-w-[200px] opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out whitespace-nowrap">Nuevo Registro</span></button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-2 min-w-[1000px]">
            <thead>
              <tr>
                <th className={`p-5 bg-slate-900/40 backdrop-blur-sm rounded-tl-2xl border-b border-white/5 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-sm`}>Fecha / Hora</th>
                <th className={`p-5 bg-slate-900/40 backdrop-blur-sm border-b border-white/5 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-sm`}>Materia Prima</th>
                <th className={`p-5 bg-slate-900/40 backdrop-blur-sm border-b border-white/5 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-sm`}>Proveedor</th>
                <th className={`p-5 bg-slate-900/40 backdrop-blur-sm border-b border-white/5 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-sm text-center`}>Cant.</th>
                <th className={`p-5 bg-slate-900/40 backdrop-blur-sm border-b border-white/5 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-sm text-center`}>Conc. (PPM)</th>
                <th className={`p-5 bg-slate-900/40 backdrop-blur-sm border-b border-white/5 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-sm text-center`}>Tiempo</th>
                <th className={`p-5 bg-slate-900/40 backdrop-blur-sm border-b border-white/5 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-sm`}>Acción Correctiva</th>
                <th className={`p-5 bg-slate-900/40 backdrop-blur-sm rounded-tr-2xl border-b border-white/5 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-sm text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y-0">
              {loading ? (
                <tr><td colSpan={8} className="p-10 text-center animate-pulse"><span className={`w-8 h-8 border-4 ${accentText}/30 border-t-${accent}-500 rounded-full animate-spin inline-block`}></span></td></tr>
              ) : registros.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-white/40 italic border-2 border-dashed border-gray-800 rounded-3xl uppercase font-bold text-[10px] tracking-widest">No hay registros para este periodo</td></tr>
              ) : (
                registros.map(r => (
                  <tr key={r.id} className={`${t.bgInput} hover:bg-white/10 transition-all duration-300 group`}>
                    <td className="p-4 rounded-l-2xl border-y border-l border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white">{formatDateOnly(r.fecha)}</span>
                        <span className={`text-[10px] ${accentText400}/80 font-mono font-bold`}>{formatTimeOnly(r.fecha)}</span>
                      </div>
                    </td>
                    <td className="p-4 border-y border-white/5">
                      <span className="text-sm font-black tracking-tight text-white drop-shadow-sm">{r.producto}</span>
                    </td>
                    <td className="p-4 border-y border-white/5">
                      <span className="text-white/60 text-xs font-bold opacity-80 uppercase tracking-tighter">{r.proveedor}</span>
                    </td>
                    <td className="p-4 border-y border-white/5 text-center">
                      <span className="text-white text-xs font-black bg-white/5 px-2 py-1 rounded-lg">{r.cantidad}</span>
                    </td>
                    <td className="p-4 border-y border-white/5 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-sm font-black ${accentText} drop-shadow-[0_0_8px_rgba(236,72,153,0.3)]`}>{r.concentracion}</span>
                        <span className={`text-[8px] font-black uppercase ${accentText}/60 tracking-widest -mt-1`}>PPM</span>
                      </div>
                    </td>
                    <td className="p-4 border-y border-white/5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">{r.tiempo}</span>
                        <span className="text-[8px] font-black uppercase text-amber-500/60 tracking-widest -mt-1">MIN</span>
                      </div>
                    </td>
                    <td className="p-4 border-y border-white/5">
                      {r.accionCorrectiva ? (
                        <div className={`flex items-center gap-2 ${accentText400}`}>
                          <span className="material-symbols-outlined text-xs">warning</span>
                          <span className="text-[10px] font-bold italic line-clamp-1 group-hover:line-clamp-none transition-all text-white/80">"{r.accionCorrectiva}"</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-500 font-bold opacity-30 uppercase tracking-widest italic">Sin incidencias</span>
                      )}
                    </td>
                    <td className="p-4 rounded-r-2xl border-y border-r border-white/5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                        <button onClick={() => openEdit(r)} className={`w-9 h-9 rounded-xl ${accentBg} ${accentText} border ${accentBorder} ${accentHoverSolid} hover:text-white transition-all flex items-center justify-center shadow-lg`}><span className="material-symbols-outlined text-sm">edit</span></button>
                        {esAdmin && <button onClick={async () => { if(window.confirm("¿Eliminar registro?")) await deleteDoc(doc(db, 'trazabilidad_sanitizacion', r.id)); }} className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-sm">delete</span></button>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fixed bottom-10 right-10 flex flex-col gap-3 z-[100]">
        <button onClick={handleExportPDF} className={`w-14 h-14 md:w-auto md:h-auto md:px-7 md:py-4 rounded-full md:rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 ${accentText400} font-bold text-[15px] tracking-tight shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 group`} title="Exportar PDF"><span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontSize: 24 }}>picture_as_pdf</span><span className="hidden md:inline">PDF</span></button>
        <button onClick={() => toast.success("Registros al día ✅")} className={`w-14 h-14 md:w-auto md:h-auto md:px-7 md:py-4 rounded-full md:rounded-2xl ${accentBtn} text-white font-bold text-[15px] tracking-tight shadow-2xl shadow-black/40 hover:brightness-110 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 group`} title="Guardar Registros"><span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontSize: 24 }}>cloud_upload</span><span className="hidden md:inline">Guardar</span></button>
      </div>

      {/* Modal Iterativo */}
      {modalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`${t.bgCard} border ${t.border} rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl relative animate-in zoom-in duration-300`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${accentBg} ${accentText} flex items-center justify-center shadow-lg border ${accentBorder}`}><span className="material-symbols-outlined" style={{ fontSize: 28 }}>clean_hands</span></div>
                <div>
                  <h3 className="text-white text-xl font-black tracking-tight">{editId ? 'Editar Registro' : 'Nueva Sanitización'}</h3>
                  <p className="text-white/50 text-[10px] font-bold uppercase opacity-50 tracking-widest">PCC Frutas y Verduras</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-all text-white"><span className="material-symbols-outlined">close</span></button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[9px] font-black uppercase text-gray-500 mb-1.5 block tracking-widest">Materia Prima</label>
                  <input id="input-producto-sanitizacion" required type="text" value={formData.producto} onChange={e => setFormData({...formData, producto: e.target.value})} className={`w-full ${t.bgInput} text-white p-4 rounded-2xl border ${t.border} ${accentFocus} font-bold text-base shadow-inner`} placeholder="Ej: Lechuga" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500 mb-1.5 block tracking-widest">Proveedor</label>
                  <input 
                    required 
                    type="text"
                    list="proveedores-list-sanitizacion"
                    value={formData.proveedor} 
                    onChange={e => setFormData({...formData, proveedor: e.target.value})} 
                    className={`w-full ${t.bgInput} text-white p-4 rounded-2xl border ${t.border} ${accentFocus} text-sm`} 
                    placeholder="Escribir o seleccionar..."
                  />
                  <datalist id="proveedores-list-sanitizacion">
                    {listaProveedores.map(p => <option key={p} value={p} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500 mb-1.5 block tracking-widest">Cantidad</label>
                  <input type="text" value={formData.cantidad} onChange={e => setFormData({...formData, cantidad: e.target.value})} className={`w-full ${t.bgInput} text-white p-4 rounded-2xl border ${t.border} text-sm`} placeholder="Ej: 5 kg" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500 mb-1.5 block tracking-widest">Conc. (ppm)</label>
                  <input required type="number" value={formData.concentracion} onChange={e => setFormData({...formData, concentracion: e.target.value})} className={`w-full ${t.bgInput} p-4 rounded-2xl border ${t.border} text-base font-bold ${accentText400} text-center`} />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500 mb-1.5 block tracking-widest">Tiempo (min)</label>
                  <input required type="number" value={formData.tiempo} onChange={e => setFormData({...formData, tiempo: e.target.value})} className={`w-full ${t.bgInput} p-4 rounded-2xl border ${t.border} text-base font-bold text-amber-500 text-center`} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[9px] font-black uppercase text-gray-500 mb-1.5 block tracking-widest">Acción Correctiva</label>
                  <input type="text" value={formData.accionCorrectiva} onChange={e => setFormData({...formData, accionCorrectiva: e.target.value})} className={`w-full ${t.bgInput} text-white p-4 rounded-2xl border ${t.border} text-xs`} placeholder="Opcional..." />
                </div>
                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                  <div><label className="text-[9px] font-black uppercase text-gray-500 mb-1.5 block tracking-widest">Fecha</label><input type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} className={`w-full ${t.bgInput} text-white p-3 rounded-xl border ${t.border} text-xs`} /></div>
                  <div><label className="text-[9px] font-black uppercase text-gray-500 mb-1.5 block tracking-widest">Hora</label><input type="time" value={formData.hora} onChange={e => setFormData({...formData, hora: e.target.value})} className={`w-full ${t.bgInput} text-white p-3 rounded-xl border ${t.border} text-xs`} /></div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className={`flex-1 py-4 rounded-2xl ${t.bgInput} text-white font-bold hover:bg-white/5 transition-all`}>Cancelar</button>
                <button type="submit" disabled={saving} className={`flex-[2] py-4 rounded-2xl ${accentBtn} text-white font-black shadow-xl ${accentBtnShadow} hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3`}>
                  {saving ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <span className="material-symbols-outlined">check_circle</span>}
                  {editId ? 'Guardar Cambios' : 'Guardar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAuditModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className={`${t.bgCard} border ${t.border} rounded-3xl p-8 max-sm w-full shadow-2xl text-center`}>
            <div className={`w-16 h-16 rounded-2xl ${accentBg} ${accentText} flex items-center justify-center mx-auto mb-6`}><span className="material-symbols-outlined" style={{ fontSize: 32 }}>shield_person</span></div>
            <h3 className="text-white text-xl font-bold mb-2">Registro de Seguridad</h3>
            <p className="text-white/60 text-sm mb-8">Esta exportación quedará vinculada a tu usuario.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowAuditModal(false)} className={`flex-1 py-3 rounded-xl ${t.bgInput} text-white font-bold`}>Cerrar</button>
              <button onClick={confirmExport} className={`flex-1 py-3 rounded-xl ${accentBtn} text-white font-bold`}>Generar PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SanitizacionModule;
