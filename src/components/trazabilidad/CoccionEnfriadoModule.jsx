import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const CUARTOS = ["Frío (Postre)", "Caliente", "Sizzling", "Bollería"];

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

export default function CoccionEnfriadoModule({ rol, cuarto }) {
  const { t } = useTheme();
  const { user } = useAuth();
  const isRed = cuarto?.toLowerCase().includes('caliente');
  const accent = isRed ? 'red' : 'pink';
  
  // Clases dinámicas basadas en el acento
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
  const accentRing = isRed ? 'ring-red-500/20' : 'ring-pink-500/20';

  const esAdmin = rol === 'admin' || rol === 'unico';
  
  const [fechaBase, setFechaBase] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState([]);
  const [showTooltip, setShowTooltip] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [cuartoActivo, setCuartoActivo] = useState(cuarto || CUARTOS[0]);
  const [vista, setVista] = useState('diaria'); 
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    producto: '', coccion_inicio: '', coccion_fin_hora: '', coccion_fin_temp: '',
    coccion_ac: '', coccion_ac_res: '', enfrio_inicio_hora: '', enfrio_inicio_temp: '',
    enfrio_t1_hora: '', enfrio_t1_temp: '', enfrio_t2_hora: '', enfrio_t2_temp: '',
    enfrio_ac: '', enfrio_ac_res: ''
  });

  const toKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const currentKey = toKey(fechaBase);

  useEffect(() => {
    setLoading(true);
    let unsub;
    if (vista === 'diaria') {
      const docPath = `${currentKey}_${cuartoActivo.replace(/\s/g, '_')}`;
      unsub = onSnapshot(doc(db, 'trazabilidad_coccion', docPath), (snap) => {
        setEntries(snap.exists() ? snap.data().entries || [] : []);
        setLoading(false);
      });
    } else {
      const start = toKey(vista === 'semanal' ? getLunes(fechaBase) : new Date(fechaBase.getFullYear(), fechaBase.getMonth(), 1));
      const end = toKey(vista === 'semanal' ? addDays(getLunes(fechaBase), 6) : new Date(fechaBase.getFullYear(), fechaBase.getMonth() + 1, 0));
      const q = query(collection(db, 'trazabilidad_coccion'), where('cuarto', '==', cuartoActivo), where('fecha', '>=', start), where('fecha', '<=', end), orderBy('fecha', 'asc'));
      unsub = onSnapshot(q, (snap) => {
        const all = [];
        snap.forEach(d => (d.data().entries || []).forEach(e => all.push({ ...e, fechaStr: d.data().fecha })));
        setEntries(all);
        setLoading(false);
      });
    }
    return () => unsub && unsub();
  }, [currentKey, cuartoActivo, vista]);

  const handleSave = async (updatedEntries) => {
    setSaving(true);
    const docPath = `${currentKey}_${cuartoActivo.replace(/\s/g, '_')}`;
    try {
      await setDoc(doc(db, 'trazabilidad_coccion', docPath), {
        entries: updatedEntries || entries,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email,
        fecha: currentKey,
        cuarto: cuartoActivo
      });
      if (!updatedEntries) toast.success("Registros sincronizados ✅");
    } catch (err) { console.error(err); toast.error("Error al guardar"); }
    setSaving(false);
  };

  const handleAddEntry = async () => {
    if (!formData.producto) return toast.error("El producto es obligatorio");
    let newEntries;
    if (editingId) {
      newEntries = entries.map(e => e.id === editingId ? { ...formData, id: editingId } : e);
      setEditingId(null);
      setEntries(newEntries);
      await handleSave(newEntries);
      setShowAddModal(false);
      toast.success("Registro actualizado");
    } else {
      newEntries = [...entries, { ...formData, id: Date.now() }];
      setEntries(newEntries);
      await handleSave(newEntries);
      toast.success("Registro guardado ✅");
      
      const continuar = window.confirm("¿Deseas añadir otro producto a este proceso de cocción?");
      if (continuar) {
        setFormData(prev => ({
          ...prev,
          producto: '',
          coccion_fin_temp: '',
          coccion_ac: '',
          coccion_ac_res: '',
          enfrio_inicio_temp: '',
          enfrio_t1_temp: '',
          enfrio_t2_temp: '',
          enfrio_ac: '',
          enfrio_ac_res: ''
        }));
        setTimeout(() => document.getElementById('input-producto-coccion')?.focus(), 100);
      } else {
        setShowAddModal(false);
      }
    }
  };

  const navegar = (dir) => {
    const d = new Date(fechaBase);
    if (vista === 'diaria') d.setDate(d.getDate() + dir);
    else if (vista === 'semanal') d.setDate(d.getDate() + (dir * 7));
    else d.setMonth(d.getMonth() + dir);
    setFechaBase(d);
  };

  const getTitulo = () => {
    if (vista === "semanal") {
      const lunes = getLunes(fechaBase);
      const domingo = addDays(lunes, 6);
      return `Semana del ${formatFechaShort(lunes)} al ${formatFechaShort(domingo)}`;
    }
    if (vista === "diaria") return `${DIAS[fechaBase.getDay()]}, ${fechaBase.getDate()} de ${MESES[fechaBase.getMonth()]}`;
    return `${MESES[fechaBase.getMonth()]} ${fechaBase.getFullYear()}`;
  };

  const confirmExport = async () => {
    setShowAuditModal(false);
    const printId = `PCC-${Date.now().toString(36).toUpperCase()}`;
    try {
      await addDoc(collection(db, 'log_impresiones'), { printId, usuario: user?.email, modulo: 'PCC Cocción y Enfriado', cuarto: cuartoActivo, fechaReporte: currentKey, fechaImpresion: serverTimestamp(), displayName: user?.displayName });
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const verdeJumbo = [0, 85, 44];
      doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(verdeJumbo[0], verdeJumbo[1], verdeJumbo[2]);
      doc.text("REGISTRO PCC COCCIÓN Y ENFRIADO", 32, 16);
      doc.setFontSize(8); doc.text(`CUARTO: ${cuartoActivo.toUpperCase()}`, 32, 25);
      const head = [[{ content: 'Producto', rowSpan: 2 }, { content: 'Cocción', colSpan: 1 }, { content: 'Acción Correctiva (Cocción)', colSpan: 2 }, { content: 'Enfriamiento', colSpan: 3 }, { content: 'Acción Correctiva (Enfriamiento)', colSpan: 2 }], ['Inicio / Fin / Temperatura', 'AC Cocción', 'T/H', 'Inicio (H/T)', 'T1 (H/T)', 'T2 (H/T)', 'Detalle AC', 'Temp/Hora']];
      const body = entries.map(e => [e.producto, `${e.coccion_inicio}\n${e.coccion_fin_hora} / ${e.coccion_fin_temp}°C`, e.coccion_ac, e.coccion_ac_res, `${e.enfrio_inicio_hora}\n${e.enfrio_inicio_temp}°C`, `${e.enfrio_t1_hora}\n${e.enfrio_t1_temp}°C`, `${e.enfrio_t2_hora}\n${e.enfrio_t2_temp}°C`, e.enfrio_ac, e.enfrio_ac_res]);
      autoTable(doc, { startY: 35, head, body, theme: 'grid', styles: { fontSize: 7, halign: 'center', valign: 'middle' }, headStyles: { fillColor: verdeJumbo, textColor: 255 } });
      doc.save(`PCC_${cuartoActivo}_${currentKey}.pdf`);
      toast.success("PDF generado 📄");
    } catch (err) { console.error(err); toast.error("Error al generar PDF"); }
  };

  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${accentBg} ${accentText} flex items-center justify-center shadow-lg ${accentShadow} border ${accentBorder}`}><span className="material-symbols-outlined" style={{ fontSize: 32 }}>thermostat</span></div>
            <div>
              <h1 className="text-white text-2xl font-black tracking-tight leading-none mb-1 uppercase">PCC Cocción y Enfriado</h1>
              <p className="text-white/60 text-[10px] uppercase font-black tracking-[0.2em] opacity-60">Control Crítico de Temperaturas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!cuarto && (
              <div className={`flex p-1 rounded-xl ${t.bgInput} border ${t.border} shadow-inner`}>
                {CUARTOS.map(c => (
                  <button key={c} onClick={() => setCuartoActivo(c)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${cuartoActivo === c ? `${accentBtn} text-white shadow-lg ${accentBtnShadow}` : `text-white/60 hover:text-white`}`}>{c}</button>
                ))}
              </div>
            )}
            <button onClick={() => setShowInfo(!showInfo)} className={`w-10 h-10 rounded-xl border ${showInfo ? `${accentBg} border-${accent}-500 ${accentText} shadow-[0_0_15px_rgba(236,72,153,0.2)]` : `${t.bgCard} ${t.border} text-white/60 ${accentHover}`} transition-all flex items-center justify-center`}><span className="material-symbols-outlined" style={{ fontSize: 22 }}>info</span></button>
          </div>
        </div>

        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl ${t.bgCard} border ${t.border} shadow-sm`}>
          <div className={`flex p-1 rounded-xl ${t.bgInput} border ${t.border} w-fit shadow-inner`}>
            {['diaria', 'semanal', 'mensual'].map(v => (
              <button key={v} onClick={() => setVista(v)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${vista === v ? `${accentBtn} text-white shadow-lg ${accentBtnShadow}` : `text-white/60 hover:text-white`}`}>{v}</button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <h2 className="text-white text-base font-bold tracking-tight">{getTitulo()}</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => navegar(-1)} className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} text-white/60 ${accentHover} transition-all shadow-sm active:scale-90`}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span></button>
              <button onClick={() => document.getElementById('date-picker-pcc').showPicker()} className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} text-white/60 ${accentHover} transition shadow-sm active:scale-90`}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>calendar_month</span></button>
              <input id="date-picker-pcc" type="date" className="absolute inset-0 opacity-0 pointer-events-none" value={fechaBase.toISOString().split('T')[0]} onChange={(e) => { if (e.target.value) setFechaBase(new Date(e.target.value + 'T12:00:00')); }} />
              <button onClick={() => navegar(1)} className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} text-white/60 ${accentHover} transition`}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span></button>
            </div>
          </div>
        </div>
      </div>

      <div className={`${t.bgCard} border ${t.border} rounded-3xl p-6 shadow-xl overflow-visible`}>
        <div className="relative flex items-center justify-center mb-10">
          <h2 className="text-white font-black uppercase tracking-[0.3em] text-xs opacity-40">Registros del Día</h2>
          <div className="absolute right-0">
            {showTooltip && (
              <div className="absolute -top-14 right-0 animate-bounce pointer-events-none z-50">
                <div className={`relative ${accentBtn500} text-white text-[11px] font-black uppercase tracking-tight px-4 py-2.5 rounded-2xl ${accentGlow} whitespace-nowrap`}>Agregar registro<div className={`absolute -bottom-1 right-6 w-3 h-3 ${accentBtn500} rotate-45 rounded-sm`}></div></div>
              </div>
            )}
            <button onClick={() => { setShowAddModal(true); setShowTooltip(false); }} className={`group flex items-center gap-0 hover:gap-3 px-3 py-3 hover:px-6 rounded-2xl ${accentBtn500} text-white font-black text-xs uppercase tracking-widest ${accentGlow} hover:scale-105 active:scale-95 transition-all duration-500 ease-in-out overflow-hidden animate-glow-pulse`}><span className="material-symbols-outlined text-xl transition-transform duration-500 group-hover:rotate-90">add</span><span className="max-w-0 group-hover:max-w-[200px] opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out whitespace-nowrap">Nuevo Registro</span></button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-2 min-w-[1000px]">
            <thead>
              <tr>
                <th className={`p-5 bg-slate-900/40 backdrop-blur-sm rounded-tl-2xl border-b border-white/5 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-sm`}>Producto</th>
                <th className={`p-5 bg-slate-900/40 backdrop-blur-sm border-b border-white/5 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-sm text-center`}>Cocción</th>
                <th className={`p-5 bg-slate-900/40 backdrop-blur-sm border-b border-white/5 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-sm text-center`}>Enfriamiento</th>
                <th className={`p-5 bg-slate-900/40 backdrop-blur-sm border-b border-white/5 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-sm text-center`}>Acciones AC</th>
                <th className={`p-5 bg-slate-900/40 backdrop-blur-sm rounded-tr-2xl border-b border-white/5 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-sm text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y-0">
              {loading ? (
                <tr><td colSpan={5} className="p-10 text-center animate-pulse"><span className={`w-8 h-8 border-4 ${accentText}/30 border-t-${accent}-500 rounded-full animate-spin inline-block`}></span></td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-white/40 italic border-2 border-dashed border-gray-800 rounded-3xl uppercase font-bold text-[10px] tracking-widest">No hay registros para este día</td></tr>
              ) : (
                entries.map((e, idx) => (
                  <tr key={e.id || idx} className={`${t.bgInput} hover:bg-white/10 transition-all duration-300 group`}>
                    <td className="p-5 rounded-l-2xl border-y border-l border-white/5"><div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${accentBtn500} ${accentGlow}`}></div><span className="text-base font-black text-white tracking-tight">{e.producto}</span></div></td>
                    <td className="p-5 border-y border-white/5">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-1 bg-emerald-500/5 px-2 py-1 rounded-xl border border-emerald-500/10"><span className="text-[10px] text-emerald-400 font-mono font-bold">{e.coccion_inicio || '--:--'}</span><span className="text-emerald-500/30 text-[10px] mx-0.5">➔</span><span className="text-[10px] text-emerald-400 font-mono font-bold">{e.coccion_fin_hora || '--:--'}</span></div>
                        <div className="flex items-center gap-1.5"><span className={`material-symbols-outlined ${accentText} text-sm`}>local_fire_department</span><span className="text-lg font-black text-white tracking-tighter italic drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{e.coccion_fin_temp || '--'}°C</span></div>
                      </div>
                    </td>
                    <td className="p-5 border-y border-white/5">
                      <div className="flex justify-center gap-6">
                        <div className="flex flex-col items-center group/item"><span className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">Inicio</span><span className="text-sm font-black text-white">{e.enfrio_inicio_temp || '--'}°C</span><span className="text-[9px] text-blue-400 font-mono font-bold">{e.enfrio_inicio_hora || '--:--'}</span></div>
                        <div className="w-px h-8 bg-white/5 self-center"></div>
                        <div className="flex flex-col items-center group/item"><span className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">T1 (2h)</span><span className="text-sm font-black text-white">{e.enfrio_t1_temp || '--'}°C</span><span className="text-[9px] text-blue-400 font-mono font-bold">{e.enfrio_t1_hora || '--:--'}</span></div>
                        <div className="w-px h-8 bg-white/5 self-center"></div>
                        <div className="flex flex-col items-center group/item"><span className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">T2 (4h)</span><span className="text-sm font-black text-white">{e.enfrio_t2_temp || '--'}°C</span><span className="text-[9px] text-blue-400 font-mono font-bold">{e.enfrio_t2_hora || '--:--'}</span></div>
                      </div>
                    </td>
                    <td className="p-5 border-y border-white/5 text-center">
                      {e.coccion_ac || e.enfrio_ac ? (
                        <div className="flex flex-col gap-1 items-center"><p className="text-[10px] text-rose-400 font-bold leading-tight italic line-clamp-1 group-hover:line-clamp-none">"{e.coccion_ac || e.enfrio_ac}"</p><span className="text-[8px] text-rose-500/50 font-black uppercase tracking-widest">{e.coccion_ac_res || e.enfrio_ac_res}</span></div>
                      ) : <span className="text-[10px] text-white opacity-40 font-bold uppercase tracking-widest italic">Sin incidencias</span>}
                    </td>
                    <td className="p-5 rounded-r-2xl border-y border-r border-white/5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                        <button onClick={() => { setFormData({...e}); setEditingId(e.id); setShowAddModal(true); }} className={`w-9 h-9 rounded-xl ${accentBg} ${accentText} border ${accentBorder} ${accentHoverSolid} hover:text-white transition-all flex items-center justify-center shadow-lg`}><span className="material-symbols-outlined text-sm">edit</span></button>
                        {esAdmin && <button onClick={() => { if(window.confirm("¿Eliminar?")) { const n = entries.filter(i => i.id !== e.id); setEntries(n); handleSave(n); } }} className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-sm">delete</span></button>}
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
        <button onClick={() => setShowAuditModal(true)} className={`w-14 h-14 md:w-auto md:h-auto md:px-7 md:py-4 rounded-full md:rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 ${accentText} font-bold text-[15px] tracking-tight shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 group`} title="Exportar PDF"><span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontSize: 24 }}>picture_as_pdf</span><span className="hidden md:inline">PDF</span></button>
        <button onClick={() => handleSave()} disabled={saving} className={`w-14 h-14 md:w-auto md:h-auto md:px-7 md:py-4 rounded-full md:rounded-2xl ${accentBtn} text-white font-bold text-[15px] tracking-tight shadow-2xl shadow-black/40 hover:brightness-110 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 group`} title="Guardar Registros">{saving ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontSize: 24 }}>cloud_upload</span>}<span className="hidden md:inline">{saving ? 'Guardando...' : 'Guardar'}</span></button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className={`${t.bgCard} border ${t.border} rounded-[2.5rem] p-8 max-w-4xl w-full shadow-2xl my-8 animate-in zoom-in duration-300`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${accentBg} ${accentText} flex items-center justify-center shadow-lg border ${accentBorder}`}><span className="material-symbols-outlined" style={{ fontSize: 28 }}>thermostat</span></div>
                <div><h3 className="text-white text-xl font-black tracking-tight">{editingId ? 'Editar Control PCC' : 'Nuevo Control PCC'}</h3><p className="text-white/50 text-[10px] font-bold uppercase opacity-50 tracking-widest">Cocción y Enfriamiento</p></div>
              </div>
              <button onClick={() => { setShowAddModal(false); setEditingId(null); }} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-all text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-3">
                <label className="text-[9px] font-black uppercase text-gray-500 mb-2 block tracking-widest">Nombre del Producto</label>
                <input id="input-producto-coccion" type="text" value={formData.producto} onChange={e => setFormData({...formData, producto: e.target.value})} className={`w-full ${t.bgInput} text-white p-5 rounded-2xl border ${t.border} ${accentFocus} font-bold text-lg shadow-inner`} placeholder="Ej: Piña Trozada" />
              </div>
              <div className="space-y-4 p-5 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10">
                <h4 className="text-emerald-400 font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-sm">local_fire_department</span> Fase Cocción</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Inicio</label><input type="time" value={formData.coccion_inicio} onChange={e => setFormData({...formData, coccion_inicio: e.target.value})} className={`w-full ${t.bgInput} text-white p-3 rounded-xl border ${t.border}`} /></div>
                  <div><label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Fin</label><input type="time" value={formData.coccion_fin_hora} onChange={e => setFormData({...formData, coccion_fin_hora: e.target.value})} className={`w-full ${t.bgInput} text-white p-3 rounded-xl border ${t.border}`} /></div>
                  <div><label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Temp °C</label><input type="number" value={formData.coccion_fin_temp} onChange={e => setFormData({...formData, coccion_fin_temp: e.target.value})} className={`w-full ${t.bgInput} p-3 rounded-xl border ${t.border} text-center font-black text-emerald-400`} /></div>
                </div>
              </div>
              <div className="md:col-span-2 space-y-4 p-5 rounded-[2rem] bg-blue-500/5 border border-blue-500/10">
                <h4 className="text-blue-400 font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-sm">ac_unit</span> Fase Enfriamiento</h4>
                <div className="grid grid-cols-3 gap-4">
                  {['inicio', 't1', 't2'].map(f => (
                    <div key={f}><label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">{f === 'inicio' ? 'Inicio' : f === 't1' ? 'T1 (2h)' : 'T2 (4h)'}</label><div className="flex flex-col gap-2"><input type="time" value={formData[`enfrio_${f}_hora`]} onChange={e => setFormData({...formData, [`enfrio_${f}_hora`]: e.target.value})} className={`w-full ${t.bgInput} text-white p-2 rounded-lg border ${t.border} text-[11px]`} /><input type="number" placeholder="°C" value={formData[`enfrio_${f}_temp`]} onChange={e => setFormData({...formData, [`enfrio_${f}_temp`]: e.target.value})} className={`w-full ${t.bgInput} p-2 rounded-lg border ${t.border} text-center font-bold text-blue-400 text-[11px]`} /></div></div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-3 grid grid-cols-2 gap-4">
                <div><label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Acción Correctiva</label><input type="text" value={formData.coccion_ac || formData.enfrio_ac} onChange={e => setFormData({...formData, coccion_ac: e.target.value, enfrio_ac: e.target.value})} className={`w-full ${t.bgInput} text-white p-3 rounded-xl border ${t.border} text-xs`} placeholder="Opcional..." /></div>
                <div><label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Responsable AC</label><input type="text" value={formData.coccion_ac_res || formData.enfrio_ac_res} onChange={e => setFormData({...formData, coccion_ac_res: e.target.value, enfrio_ac_res: e.target.value})} className={`w-full ${t.bgInput} text-white p-3 rounded-xl border ${t.border} text-xs`} placeholder="Quien resuelve..." /></div>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowAddModal(false)} className={`flex-1 py-4 rounded-2xl ${t.bgInput} text-white font-bold hover:bg-white/5 transition-all`}>Cancelar</button>
              <button onClick={handleAddEntry} className={`flex-[2] py-4 rounded-2xl ${accentBtn} text-white font-black shadow-xl ${accentBtnShadow} hover:scale-[1.02] active:scale-95 transition-all`}>Guardar Control</button>
            </div>
          </div>
        </div>
      )}

      {showAuditModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className={`${t.bgCard} border ${t.border} rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center`}>
            <div className={`w-16 h-16 rounded-2xl ${accentBg} ${accentText} flex items-center justify-center mx-auto mb-6`}><span className="material-symbols-outlined" style={{ fontSize: 32 }}>shield_person</span></div>
            <h3 className="text-white text-xl font-bold mb-2">Registro de Seguridad</h3>
            <p className="text-white/60 text-sm mb-8">Esta exportación PCC quedará vinculada a tu usuario.</p>
            <div className="flex gap-3"><button onClick={() => setShowAuditModal(false)} className={`flex-1 py-3 rounded-xl ${t.bgInput} text-white font-bold`}>Cerrar</button><button onClick={confirmExport} className={`flex-1 py-3 rounded-xl ${accentBtn} text-white font-bold`}>Generar PDF</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
