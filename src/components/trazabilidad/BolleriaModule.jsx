import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { normalizeText } from '../../utils/searchUtils';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PRODUCTOS_BOLLERIA_DEFAULT = [
  { id: "insumos", nombre: "Insumos y Bases", icon: "inventory_2", color: "text-amber-400", bg: "bg-amber-500/10", items: ["*Azúcar flor", "Brillo", "**Chocolate Granulado"] },
  { id: "bolleria_masas", nombre: "Bollería y Masas", icon: "bakery_dining", color: "text-orange-400", bg: "bg-orange-500/10", items: ["Bretzel Chocolate", "Bretzel Crema", "Caña Chocolate", "Caña Crema", "Croissant media luna select D'Or", "Medialuna Dulce", "Medialuna Rellena Manjar", "Mini Chic Chocolate", "Mini Croissant Blanco", "Mini Croissant Cacao", "Mini Croissant Crema", "Mini Super Margarina"] },
  { id: "donuts", nombre: "Donuts", icon: "donut_large", color: "text-pink-400", bg: "bg-pink-500/10", items: ["Donuts Colores", "Donuts Chocolate", "Donuts decorada rellena chocolate/avellana", "Donuts Mini Patic Choc", "Donuts Rellena Chocolate", "Donuts Rellena Crema", "Donuts Rellena Fresa", "Donuts Rellena Limón", "Donuts Rayada Blanco", "Donuts Rayada Negrita", "Donuts Sucre"] },
  { id: "muffins", nombre: "Muffins", icon: "potted_plant", color: "text-emerald-400", bg: "bg-emerald-500/10", items: ["Muffin Americano Frambuesa", "Muffin Americano Zanahoria", "Muffin Arándano", "Muffin Banana Nuez", "Muffin Cheesecake Arándano", "Muffin Cheesecake Frambuesa", "Muffin Chip Chocolate", "Muffin Doble Chocolate", "Muffin Relleno Manjar", "Muffin Relleno 3 Chocolate"] },
  { id: "especialidades", nombre: "Tulipes y Especialidades", icon: "cake", color: "text-purple-400", bg: "bg-purple-500/10", items: ["*Napolitana Crema", "**Napolitana Chocolate", "Napolitana Paris", "Pastel de Nata", "Rollo de Canela", "Rolito de Frambuesa", "Roulet Cheesecake", "Top Frambuesa", "Top Manjar", "Triángulo Chocolate", "**Tronquito Chocolate", "*Tronquito Crema", "Tulipe Cheesecake", "Tulipe Chocolate Extréme", "Tulipe Cranberry", "Tulipe Red Velvet", "Tulipe Yogurt Arándano"] }
];

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getLunes(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatFechaShort(d) {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function BolleriaModule({ rol }) {
  const { t } = useTheme();
  const { user } = useAuth();
  const esAdmin = rol === 'admin' || rol === 'unico';
  
  const [subVista, setSubVista] = useState('bolleria'); 
  const [fechaBase, setFechaBase] = useState(new Date());
  const [dataBolleria, setDataBolleria] = useState({});
  const [dataTrasvasijes, setDataTrasvasijes] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [bolleriaConfig, setBolleriaConfig] = useState(PRODUCTOS_BOLLERIA_DEFAULT);
  const [trasvasijesCatalog, setTrasvasijesCatalog] = useState([]);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const [newItemName, setNewItemName] = useState('');
  const [newItemProvider, setNewItemProvider] = useState('');

  const dateInputRef = useRef(null);

  useEffect(() => {
    const unsubBolleriaConfig = onSnapshot(doc(db, 'trazabilidad_config', 'bolleria'), (snap) => {
      if (snap.exists() && snap.data().categorias) setBolleriaConfig(snap.data().categorias);
    });
    const unsubBolleriaData = onSnapshot(doc(db, 'trazabilidad_materias', 'bolleria'), (snap) => {
      if (snap.exists()) setDataBolleria(snap.data());
      setLoading(false);
    });
    const unsubTrasvasijesData = onSnapshot(doc(db, 'trazabilidad_materias', 'trasvasijes_log'), (snap) => {
      if (snap.exists()) setDataTrasvasijes(snap.data());
    });
    const unsubTrasCatalog = onSnapshot(doc(db, 'trazabilidad_config', 'trasvasijes_catalog'), (snap) => {
      if (snap.exists()) {
        const raw = snap.data().productos || [];
        const normalized = raw.map(x => typeof x === 'string' ? { nombre: x, proveedor: 'JUMBO' } : x);
        setTrasvasijesCatalog(normalized);
      }
    });
    return () => { unsubBolleriaConfig(); unsubBolleriaData(); unsubTrasvasijesData(); unsubTrasCatalog(); };
  }, []);

  const saveTrasvasijesCatalog = async (list) => {
    try {
      await setDoc(doc(db, 'trazabilidad_config', 'trasvasijes_catalog'), { productos: list, updatedAt: new Date(), updatedBy: user?.displayName });
      setTrasvasijesCatalog(list);
    } catch (err) { toast.error("Error al guardar catálogo"); }
  };

  const handleInputChangeBolleria = (itemId, column, value, specificDate = null) => {
    const targetDate = specificDate || toKey(fechaBase);
    const itemKey = `${itemId}_${targetDate}`;
    let processedValue = value;
    if (column === 'cantidad') {
      processedValue = value.replace(/[^0-9]/g, '');
    } else if (['ingreso', 'descongelado', 'horneo'].includes(column)) {
      processedValue = value.replace(/[^0-9:]/g, '');
      if (processedValue.length === 2 && !processedValue.includes(':') && value.length > 2) {
        processedValue = processedValue + ':';
      }
      if (processedValue.length > 5) processedValue = processedValue.substring(0, 5);
    }
    setDataBolleria(prev => ({ ...prev, [itemKey]: { ...(prev[itemKey] || {}), [column]: processedValue } }));
  };

  const handleInputChangeTrasvasijes = (index, column, value) => {
    const curK = toKey(fechaBase);
    const dayData = [...(dataTrasvasijes[curK] || [])];
    if (!dayData[index]) return;
    let processedValue = value;
    if (['cant', 'porcionadas', 'pverde'].includes(column)) processedValue = value.replace(/[^0-9]/g, '');
    dayData[index] = { ...dayData[index], [column]: processedValue };
    setDataTrasvasijes(prev => ({ ...prev, [curK]: dayData }));
  };

  const addRowTrasvasijes = (itemObj = null) => {
    const curK = toKey(fechaBase);
    const newRow = { 
      id: Date.now().toString(36), 
      producto: itemObj ? itemObj.nombre : '', 
      fingreso: '', 
      cant: '', 
      proveedor: itemObj ? itemObj.proveedor : 'JUMBO', 
      fporcionado: '', 
      porcionadas: '', 
      pverde: '' 
    };
    setDataTrasvasijes(prev => ({ ...prev, [curK]: [...(prev[curK] || []), newRow] }));
  };

  const deleteRowTrasvasijes = (index) => {
    const curK = toKey(fechaBase);
    const dayData = (dataTrasvasijes[curK] || []).filter((_, i) => i !== index);
    setDataTrasvasijes(prev => ({ ...prev, [curK]: dayData }));
  };

  const handleGuardarDatos = async () => {
    setSaving(true);
    try {
      if (subVista === 'bolleria') await setDoc(doc(db, 'trazabilidad_materias', 'bolleria'), { ...dataBolleria, updatedAt: new Date() });
      else await setDoc(doc(db, 'trazabilidad_materias', 'trasvasijes_log'), { ...dataTrasvasijes, updatedAt: new Date() });
      toast.success("Registros guardados ✅");
    } catch (err) { toast.error("Error al guardar"); }
    setSaving(false);
  };

  const confirmExport = async () => {
    setShowAuditModal(false);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const verdeJumbo = [0, 85, 44];
    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(verdeJumbo[0], verdeJumbo[1], verdeJumbo[2]);
    doc.text(subVista === 'bolleria' ? `REPORTE BOLLERÍA - DIARIO` : `REPORTE TRASVASIJES - DIARIO`, 15, 20);
    doc.setFontSize(8); doc.setTextColor(80, 80, 80); doc.text("SECCIÓN: RINCON", 15, 26); doc.text(`CUARTO: ${subVista === 'bolleria' ? 'BOLLERÍA' : 'TRASVASIJES'}`, 15, 30);
    doc.setFontSize(9); doc.setTextColor(60, 60, 60); doc.text("FECHA:", doc.internal.pageSize.getWidth() - 80, 20); doc.setFont("helvetica", "bold"); doc.text(getTitulo(), doc.internal.pageSize.getWidth() - 65, 20);
    
    let head = [], body = [];
    if (subVista === 'bolleria') {
      head = [["Producto", "Ingreso", "Descongelado", "Horneo", "Cantidad"]];
      bolleriaConfig.forEach(cat => cat.items.forEach(item => {
        const r = dataBolleria[`${item}_${toKey(fechaBase)}`] || {};
        body.push([item, r.ingreso || "-", r.descongelado || "-", r.horneo || "-", r.cantidad || "-"]);
      }));
    } else {
      head = [["Producto", "F. Ingreso", "Cant.", "Proveedor", "F/H Trasvas.", "Porcion.", "P. Verde"]];
      const rows = dataTrasvasijes[toKey(fechaBase)] || [];
      rows.forEach(r => body.push([r.producto || "-", r.fingreso || "-", r.cant || "-", r.proveedor || "-", r.fporcionado || "-", r.porcionadas || "-", r.pverde || "-"]));
    }

    autoTable(doc, { startY: 35, head, body, theme: 'grid', styles: { fontSize: 6, cellPadding: 1, halign: 'center' }, headStyles: { fillColor: verdeJumbo, textColor: [255, 255, 255] }, columnStyles: { 0: { halign: 'left', cellWidth: 35 } } });
    const finalY = doc.lastAutoTable.finalY || 150;
    doc.setFontSize(8); doc.setTextColor(40, 40, 40); doc.text("__________________________", 15, finalY + 15); doc.setFont("helvetica", "bold"); doc.text(`RESPONSABLE: ${user?.displayName || 'USUARIO AUTORIZADO'}`, 15, finalY + 20); doc.setFont("helvetica", "normal"); doc.text("Firma Digital Certificada", 15, finalY + 24);
    doc.save(`${subVista.toUpperCase()}_${toKey(fechaBase)}.pdf`);
  };

  const getTitulo = () => {
    return `${DIAS[(fechaBase.getDay() + 6) % 7]} ${fechaBase.getDate()} de ${MESES[fechaBase.getMonth()]}`;
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-amber-500 font-black tracking-widest uppercase text-2xl">Diseño Luxe Bollería...</div>;

  const GRID_COLS_TRASVASIJES = "grid-cols-[2.4fr_1fr_0.7fr_1.1fr_1.4fr_0.8fr_0.8fr_0.5fr]";

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Sub-Tabs */}
      <div className={`flex p-1.5 rounded-full ${t.bgCard} border ${t.border} self-center shadow-2xl backdrop-blur-md`}>
        <button onClick={() => setSubVista('bolleria')} className={`px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${subVista === 'bolleria' ? 'bg-amber-600 text-white shadow-lg' : `${t.textSecondary} hover:${t.text}`}`}>Bollería</button>
        <button onClick={() => setSubVista('trasvasijes')} className={`px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${subVista === 'trasvasijes' ? 'bg-blue-600 text-white shadow-lg' : `${t.textSecondary} hover:${t.text}`}`}>Trasvasijes</button>
        <button onClick={() => setSubVista('config')} className={`px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${subVista === 'config' ? 'bg-purple-600 text-white shadow-lg' : `${t.textSecondary} hover:${t.text}`}`}>Configuración</button>
      </div>

      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 px-2">
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 ${subVista === 'bolleria' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : subVista === 'trasvasijes' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-purple-500/30 bg-purple-500/10 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]'}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 40 }}>{subVista === 'bolleria' ? 'bakery_dining' : subVista === 'trasvasijes' ? 'science' : 'settings_suggest'}</span>
          </div>
          <div>
            <h1 className={`${t.text} text-4xl font-black uppercase tracking-tighter mb-1`}>{subVista === 'bolleria' ? 'Producción Bollería' : subVista === 'trasvasijes' ? 'Venta y Trasvasijes' : 'Configuración'}</h1>
            <p className={`${t.textSecondary} text-[10px] font-black uppercase tracking-[0.4em] opacity-40`}>{subVista === 'config' ? 'Control de Maestro' : 'Trazabilidad Luxe'}</p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      {subVista !== 'config' && (
        <div className={`flex flex-col md:flex-row items-stretch gap-3 p-3 rounded-[2rem] ${t.bgCard} border ${t.border} shadow-2xl backdrop-blur-xl`}>
          <div className={`flex items-center bg-black/20 rounded-[1.5rem] p-1.5 border ${t.border} shadow-inner`}>
            <button onClick={() => { const d = new Date(fechaBase); d.setDate(d.getDate() - 1); setFechaBase(d); }} className={`w-11 h-11 flex items-center justify-center rounded-xl hover:bg-white/5 ${t.textSecondary}`}><span className="material-symbols-outlined">chevron_left</span></button>
            <button onClick={() => dateInputRef.current?.showPicker()} className={`px-6 py-2 flex items-center gap-3 ${t.text} font-black text-[11px] uppercase tracking-widest`}>
              <span className={`material-symbols-outlined ${subVista === 'bolleria' ? 'text-amber-500' : 'text-blue-500'}`} style={{ fontSize: 20 }}>calendar_month</span>
              {getTitulo()}
            </button>
            <input ref={dateInputRef} type="date" value={toKey(fechaBase)} onChange={(e) => setFechaBase(new Date(e.target.value))} className="absolute opacity-0 pointer-events-none" />
            <button onClick={() => { const d = new Date(fechaBase); d.setDate(d.getDate() + 1); setFechaBase(d); }} className={`w-11 h-11 flex items-center justify-center rounded-xl hover:bg-white/5 ${t.textSecondary}`}><span className="material-symbols-outlined">chevron_right</span></button>
          </div>
          <div className="relative flex-1 group">
            <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input type="text" placeholder={`Filtrar productos...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full h-full min-h-[56px] ${t.bgInput} ${t.text} text-sm font-bold pl-14 pr-6 rounded-[1.5rem] border ${t.border} focus:border-blue-500/40 outline-none bg-black/10 shadow-inner`} />
          </div>
          {subVista === 'trasvasijes' && (
            <div className="flex gap-2">
              <button onClick={() => addRowTrasvasijes(null)} className="flex items-center justify-center gap-3 px-8 py-4 rounded-[1.5rem] bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black text-xs uppercase tracking-widest shadow-lg">Nueva Fila</button>
              <div className="relative group">
                <button className="flex items-center justify-center gap-3 px-8 py-4 rounded-[1.5rem] bg-white/5 text-white font-black text-xs uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all">
                  + Catálogo
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>expand_more</span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-2 z-[100] hidden group-hover:block animate-fadeIn">
                  <div className="p-3 border-b border-white/5 mb-2"><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Productos Guardados</p></div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {trasvasijesCatalog.map(p => (
                      <button key={p.nombre} onClick={() => addRowTrasvasijes(p)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-all group/item">
                        <div className="text-xs font-bold text-gray-300 group-hover/item:text-white">{p.nombre}</div>
                        <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest opacity-60">{p.proveedor}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col gap-10">
        {subVista === 'bolleria' ? (
          bolleriaConfig.map(cat => {
            const items = searchTerm ? cat.items.filter(i => normalizeText(i).includes(normalizeText(searchTerm))) : cat.items;
            if (items.length === 0) return null;
            
            return (
              <div key={cat.id} className="flex flex-col gap-5">
                <div className="flex items-center gap-4 px-4">
                  <div className={`p-3.5 rounded-2xl ${cat.bg} border border-white/5 shadow-lg shadow-black/20`}><span className={`material-symbols-outlined ${cat.color}`} style={{ fontSize: 24 }}>{cat.icon}</span></div>
                  <div>
                    <h3 className={`${t.text} font-black uppercase text-xl tracking-tighter`}>{cat.nombre}</h3>
                  </div>
                </div>

                <div className={`overflow-x-auto rounded-[2.5rem] border ${t.border} bg-white/[0.01] shadow-2xl`}>
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className={`${t.isDark ? 'bg-white/5' : 'bg-slate-50'} border-b ${t.border}`}>
                        <th className={`px-10 py-6 text-[10px] font-black uppercase tracking-widest ${t.textSecondary} w-[280px]`}>Producto</th>
                        <th className={`px-4 py-6 text-[10px] font-black uppercase text-center ${t.textSecondary}`}>Ingreso (HH:MM)</th>
                        <th className={`px-4 py-6 text-[10px] font-black uppercase text-center ${t.textSecondary}`}>Descong. (HH:MM)</th>
                        <th className={`px-4 py-6 text-[10px] font-black uppercase text-center ${t.textSecondary}`}>Horneo (HH:MM)</th>
                        <th className={`px-4 py-6 text-[10px] font-black uppercase text-center ${t.textSecondary}`}>Cant. (Ent.)</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${t.border}`}>
                      {items.map(item => {
                        const rowD = dataBolleria[`${item}_${toKey(fechaBase)}`] || {}, isNA = item.startsWith('*') || item === 'Brillo';
                        return (
                          <tr key={item} className={`hover:${t.isDark ? 'bg-white/[0.02]' : 'bg-slate-50'} transition-all`}>
                            <td className={`px-10 py-4 text-sm font-bold ${t.isDark ? 'text-white/90' : 'text-gray-800'}`}>{item}</td>
                            <td className="px-2 py-4 text-center"><input type="text" placeholder="--:--" value={rowD.ingreso || ''} onChange={(e) => handleInputChangeBolleria(item, 'ingreso', e.target.value)} className={`w-28 ${t.bgInput} ${t.text} text-center text-xs p-3 rounded-xl border ${t.border} outline-none focus:border-amber-500/30 bg-black/20`} /></td>
                            <td className="px-2 py-4 text-center">{isNA ? <span className="opacity-10 text-[10px] font-black tracking-widest">N/A</span> : <input type="text" placeholder="--:--" value={rowD.descongelado || ''} onChange={(e) => handleInputChangeBolleria(item, 'descongelado', e.target.value)} className={`w-28 ${t.bgInput} ${t.text} text-center text-xs p-3 rounded-xl border ${t.border} outline-none focus:border-amber-500/30 bg-black/20`} />}</td>
                            <td className="px-2 py-4 text-center">{isNA ? <span className="opacity-10 text-[10px] font-black tracking-widest">N/A</span> : <input type="text" placeholder="--:--" value={rowD.horneo || ''} onChange={(e) => handleInputChangeBolleria(item, 'horneo', e.target.value)} className={`w-28 ${t.bgInput} ${t.text} text-center text-xs p-3 rounded-xl border ${t.border} outline-none focus:border-amber-500/30 bg-black/20`} />}</td>
                            <td className="px-2 py-4 text-center">{isNA ? <span className="opacity-10 text-[10px] font-black tracking-widest">N/A</span> : <input type="text" placeholder="0" value={rowD.cantidad || ''} onChange={(e) => handleInputChangeBolleria(item, 'cantidad', e.target.value)} className={`w-24 ${t.bgInput} ${t.text} text-center text-xs font-black p-3 rounded-xl border ${t.border} outline-none text-emerald-500 bg-emerald-500/5 focus:border-emerald-500`} />}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        ) : subVista === 'trasvasijes' ? (
          <div className={`overflow-hidden rounded-[2.5rem] border ${t.border} bg-white/[0.01] shadow-2xl`}>
            <div className={`grid ${GRID_COLS_TRASVASIJES} ${t.isDark ? 'bg-slate-900/80' : 'bg-slate-100'} p-6 items-center border-b ${t.border}`}>
              <div className={`text-[10px] font-black uppercase tracking-widest ${t.textSecondary} px-6`}>Producto</div>
              <div className={`text-[10px] font-black uppercase tracking-widest ${t.textSecondary} text-center`}>F. Ingreso</div>
              <div className={`text-[10px] font-black uppercase tracking-widest ${t.textSecondary} text-center`}>Cant.</div>
              <div className={`text-[10px] font-black uppercase tracking-widest ${t.textSecondary} text-center`}>Proveedor</div>
              <div className={`text-[10px] font-black uppercase tracking-widest ${t.textSecondary} text-center`}>F/H Trasvas.</div>
              <div className={`text-[10px] font-black uppercase tracking-widest ${t.textSecondary} text-center`}>Porcion.</div>
              <div className={`text-[10px] font-black uppercase tracking-widest ${t.textSecondary} text-center`}>P. Verde</div>
              <div className="text-center"></div>
            </div>
            <div className="flex flex-col bg-black/10 min-h-[400px]">
              {(dataTrasvasijes[toKey(fechaBase)] || []).map((row, idx) => (
                <div key={row.id} className={`grid ${GRID_COLS_TRASVASIJES} p-4 items-center hover:bg-white/[0.03] transition-all border-b border-white/5 group`}>
                  <div className="px-6"><input type="text" placeholder="Producto..." value={row.producto} onChange={(e) => handleInputChangeTrasvasijes(idx, 'producto', e.target.value)} className={`w-full ${t.bgInput} ${t.text} text-sm font-bold p-4 rounded-2xl border ${t.border} focus:border-blue-500/50 outline-none bg-black/30 shadow-inner`} /></div>
                  <div className="text-center"><input type="text" placeholder="DD/MM" value={row.fingreso} onChange={(e) => handleInputChangeTrasvasijes(idx, 'fingreso', e.target.value)} className={`w-[85%] ${t.bgInput} ${t.text} text-center text-xs p-3.5 rounded-xl border ${t.border} outline-none mx-auto bg-black/10`} /></div>
                  <div className="text-center"><input type="text" placeholder="0" value={row.cant} onChange={(e) => handleInputChangeTrasvasijes(idx, 'cant', e.target.value)} className={`w-[85%] ${t.bgInput} ${t.text} text-center text-xs font-black p-3.5 rounded-xl border ${t.border} outline-none mx-auto bg-black/10`} /></div>
                  <div className="text-center"><input type="text" placeholder="Proveedor..." value={row.proveedor} onChange={(e) => handleInputChangeTrasvasijes(idx, 'proveedor', e.target.value)} className={`w-[90%] ${t.bgInput} ${t.text} text-center text-[10px] font-black p-3.5 rounded-xl border ${t.border} outline-none mx-auto uppercase bg-black/10`} /></div>
                  <div className="text-center"><input type="text" placeholder="HH:MM" value={row.fporcionado} onChange={(e) => handleInputChangeTrasvasijes(idx, 'fporcionado', e.target.value)} className={`w-[90%] ${t.bgInput} ${t.text} text-center text-xs p-3.5 rounded-xl border ${t.border} outline-none mx-auto bg-black/10`} /></div>
                  <div className="text-center"><input type="text" placeholder="0" value={row.porcionadas} onChange={(e) => handleInputChangeTrasvasijes(idx, 'porcionadas', e.target.value)} className={`w-[85%] ${t.bgInput} ${t.text} text-center text-xs font-black p-3.5 rounded-xl border ${t.border} outline-none mx-auto text-blue-400 bg-blue-500/5`} /></div>
                  <div className="text-center"><input type="text" placeholder="0" value={row.pverde} onChange={(e) => handleInputChangeTrasvasijes(idx, 'pverde', e.target.value)} className={`w-[85%] ${t.bgInput} ${t.text} text-center text-xs font-black p-3.5 rounded-xl border ${t.border} outline-none mx-auto text-emerald-400 bg-emerald-500/5`} /></div>
                  <div className="text-center"><button onClick={() => deleteRowTrasvasijes(idx)} className="text-red-500/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><span className="material-symbols-outlined">delete</span></button></div>
                </div>
              ))}
              {(!dataTrasvasijes[toKey(fechaBase)] || dataTrasvasijes[toKey(fechaBase)].length === 0) && <div className="flex-1 flex items-center justify-center text-xs font-black uppercase tracking-widest opacity-20">Sin registros para hoy</div>}
            </div>
          </div>
        ) : (
          /* CONFIGURACIÓN */
          <div className="flex flex-col gap-8 animate-fadeIn">
            <div className={`p-10 rounded-[3rem] ${t.bgCard} border ${t.border} shadow-3xl`}>
              <h2 className={`${t.text} text-3xl font-black mb-8 uppercase tracking-tighter`}>Maestro de Automatización</h2>
              <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_auto] gap-4 mb-10">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-2">Nombre del Producto</label>
                  <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Ej: Torta Cecilia Panqueque" className={`w-full ${t.bgInput} ${t.text} p-5 rounded-2xl border ${t.border} outline-none focus:border-purple-500 font-bold shadow-inner`} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-2">Proveedor Predeterminado</label>
                  <input type="text" value={newItemProvider} onChange={(e) => setNewItemProvider(e.target.value)} placeholder="Ej: JUMBO / PROPIO" className={`w-full ${t.bgInput} ${t.text} p-5 rounded-2xl border ${t.border} outline-none focus:border-purple-500 font-bold shadow-inner`} />
                </div>
                <div className="flex items-end">
                  <button onClick={() => { if (!newItemName.trim() || !newItemProvider.trim()) return; const newList = [...trasvasijesCatalog, { nombre: newItemName.trim(), proveedor: newItemProvider.trim().toUpperCase() }]; saveTrasvasijesCatalog(newList); setNewItemName(''); setNewItemProvider(''); }} className="h-[64px] px-12 rounded-2xl bg-purple-600 text-white font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all">Guardar</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {trasvasijesCatalog.map(p => (
                  <div key={p.nombre} className={`group flex items-center justify-between p-5 rounded-2xl ${t.bgInput} border ${t.border} bg-black/20 hover:border-purple-500/50 transition-all shadow-lg`}>
                    <div className="truncate pr-4">
                      <div className={`${t.text} font-bold text-sm truncate`}>{p.nombre}</div>
                      <div className="text-[9px] font-black text-purple-400 uppercase tracking-widest opacity-60">{p.proveedor}</div>
                    </div>
                    <button onClick={() => saveTrasvasijesCatalog(trasvasijesCatalog.filter(x => x.nombre !== p.nombre))} className="w-10 h-10 rounded-xl flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 bg-red-500/10 hover:bg-red-500 hover:text-white transition-all"><span className="material-symbols-outlined">delete</span></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botones Flotantes de Acción — ARQUITECTURA LUXE */}
      {subVista !== 'config' && (
        <div className="fixed bottom-24 right-6 md:bottom-10 md:right-10 flex flex-col gap-3 z-50">
          <button 
            onClick={() => setShowAuditModal(true)}
            className="w-14 h-14 md:w-auto md:h-auto md:px-7 md:py-4 rounded-full md:rounded-2xl bg-amber-950/40 backdrop-blur-md text-amber-200 font-bold text-[15px] tracking-tight shadow-2xl hover:bg-amber-900/60 transition-all flex items-center justify-center gap-3 border border-amber-500/20 group"
            title="Exportar PDF"
          >
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontSize: 24 }}>picture_as_pdf</span>
            <span className="hidden md:inline">PDF</span>
          </button>

          <button 
            onClick={handleGuardarDatos}
            disabled={saving}
            className="w-14 h-14 md:w-auto md:h-auto md:px-7 md:py-4 rounded-full md:rounded-2xl bg-amber-600 text-white font-bold text-[15px] tracking-tight shadow-2xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 group"
            title="Guardar Registros"
          >
            {saving ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontSize: 24 }}>cloud_upload</span>
            )}
            <span className="hidden md:inline">{saving ? 'Guardando...' : 'Guardar'}</span>
          </button>
        </div>
      )}

      {showAuditModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className={`${t.bgCard} border ${t.border} w-full max-w-sm rounded-[3rem] p-10 text-center shadow-3xl`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${subVista === 'bolleria' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'}`}><span className="material-symbols-outlined" style={{ fontSize: 32 }}>picture_as_pdf</span></div>
            <h3 className={`${t.text} text-xl font-black mb-2`}>Generar PDF</h3>
            <p className={`${t.textSecondary} text-sm opacity-60 mb-8`}>Se registrará la trazabilidad diaria en formato oficial.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowAuditModal(false)} className="flex-1 py-4 rounded-2xl bg-white/5 font-black text-xs uppercase tracking-widest transition-colors hover:bg-white/10">Cerrar</button>
              <button onClick={confirmExport} className={`flex-1 py-4 rounded-2xl ${subVista === 'bolleria' ? 'bg-amber-600' : 'bg-blue-600'} text-white font-black text-xs uppercase tracking-widest shadow-lg hover:brightness-110`}>Descargar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
