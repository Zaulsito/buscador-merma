import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, serverTimestamp, query, orderBy, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const CUARTOS = ["Frío (Postre)", "Caliente", "Sizzling", "Bollería"];

export default function CoccionEnfriadoModule({ rol, cuarto }) {
  const { t } = useTheme();
  const { user } = useAuth();
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
  const [vista, setVista] = useState('diaria'); // diaria, semanal, mensual
  const [editingId, setEditingId] = useState(null); // ID del registro en edición

  // Formulario para nueva entrada
  const [formData, setFormData] = useState({
    producto: '',
    coccion_inicio: '',
    coccion_fin_hora: '',
    coccion_fin_temp: '',
    coccion_ac: '',
    coccion_ac_res: '',
    enfrio_inicio_hora: '',
    enfrio_inicio_temp: '',
    enfrio_t1_hora: '',
    enfrio_t1_temp: '',
    enfrio_t2_hora: '',
    enfrio_t2_temp: '',
    enfrio_ac: '',
    enfrio_ac_res: ''
  });

  const toKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const currentKey = toKey(fechaBase);

  // Helpers de fechas
  const getLunes = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const addDays = (d, days) => {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    return res;
  };

  const getStartEnd = () => {
    if (vista === 'diaria') return { start: currentKey, end: currentKey };
    if (vista === 'semanal') {
      const lunes = getLunes(fechaBase);
      const domingo = addDays(lunes, 6);
      return { start: toKey(lunes), end: toKey(domingo) };
    }
    // Mensual
    const firstDay = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), 1);
    const lastDay = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + 1, 0);
    return { start: toKey(firstDay), end: toKey(lastDay) };
  };

  // ── PERSISTENCIA ──
  useEffect(() => {
    setLoading(true);
    let unsub;

    if (vista === 'diaria') {
      const docPath = `${currentKey}_${cuartoActivo.replace(/\s/g, '_')}`;
      unsub = onSnapshot(doc(db, 'trazabilidad_coccion', docPath), (snap) => {
        if (snap.exists()) {
          setEntries(snap.data().entries || []);
        } else {
          setEntries([]);
        }
        setLoading(false);
      }, (err) => {
        console.error("Error en onSnapshot diaria:", err);
        setLoading(false);
        toast.error("Error al cargar datos");
      });
    } else {
      // Query por rango
      const { start, end } = getStartEnd();
      const q = query(
        collection(db, 'trazabilidad_coccion'),
        where('cuarto', '==', cuartoActivo),
        where('fecha', '>=', start),
        where('fecha', '<=', end),
        orderBy('fecha', 'asc')
      );

      unsub = onSnapshot(q, (snap) => {
        const allEntries = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          const dayEntries = data.entries || [];
          dayEntries.forEach(e => allEntries.push({ ...e, fechaStr: data.fecha }));
        });
        setEntries(allEntries);
        setLoading(false);
      }, (err) => {
        console.error("Error en onSnapshot rango:", err);
        setLoading(false);
        // Si es error de índice, Firestore suele dar un link en el console log
        toast.error("Error de conexión o índice faltante");
      });
    }

    return () => unsub && unsub();
  }, [currentKey, cuartoActivo, vista]);

  const navegar = (dir) => {
    const newDate = new Date(fechaBase);
    if (vista === 'diaria') newDate.setDate(newDate.getDate() + dir);
    else if (vista === 'semanal') newDate.setDate(newDate.getDate() + (dir * 7));
    else if (vista === 'mensual') newDate.setMonth(newDate.getMonth() + dir);
    setFechaBase(newDate);
  };

  const getPeriodoTitulo = () => {
    const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    if (vista === 'diaria') return `${DIAS[fechaBase.getDay()]} ${fechaBase.getDate()} de ${MESES[fechaBase.getMonth()]}`;
    if (vista === 'semanal') {
      const lunes = getLunes(fechaBase);
      const dom = addDays(lunes, 6);
      return `Semana del ${lunes.getDate()} al ${dom.getDate()} de ${MESES[lunes.getMonth()]}`;
    }
    return `${MESES[fechaBase.getMonth()]} ${fechaBase.getFullYear()}`;
  };

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
      toast.success("Registros actualizados ✅");
    } catch (err) {
      console.error("Error al guardar PCC:", err);
      toast.error("Error al guardar");
    }
    setSaving(false);
  };

  const handleAddEntry = () => {
    if (!formData.producto) return toast.error("El producto es obligatorio");
    
    let newEntries;
    if (editingId) {
      newEntries = entries.map(e => e.id === editingId ? { ...formData, id: editingId } : e);
      setEditingId(null);
    } else {
      newEntries = [...entries, { ...formData, id: Date.now() }];
    }

    setEntries(newEntries);
    handleSave(newEntries);
    setShowAddModal(false);
    setFormData({
      producto: '', coccion_inicio: '', coccion_fin_hora: '', coccion_fin_temp: '',
      coccion_ac: '', coccion_ac_res: '', enfrio_inicio_hora: '', enfrio_inicio_temp: '',
      enfrio_t1_hora: '', enfrio_t1_temp: '', enfrio_t2_hora: '', enfrio_t2_temp: '',
      enfrio_ac: '', enfrio_ac_res: ''
    });
  };

  const openEditModal = (entry) => {
    setFormData({ ...entry });
    setEditingId(entry.id);
    setShowAddModal(true);
  };

  const removeEntry = (id) => {
    if (!window.confirm("¿Eliminar este registro?")) return;
    const newEntries = entries.filter(e => e.id !== id);
    setEntries(newEntries);
    handleSave(newEntries);
  };

  const handleExportPDF = () => {
    setShowAuditModal(true);
  };

  const confirmExport = async () => {
    setShowAuditModal(false);
    const printId = `PCC-${Date.now().toString(36).toUpperCase()}`;

    try {
      const { start, end } = getStartEnd();
      await addDoc(collection(db, 'log_impresiones'), {
        printId, usuario: user?.email, modulo: 'PCC Cocción y Enfriado',
        cuarto: cuartoActivo, fechaReporte: currentKey, fechaImpresion: serverTimestamp(),
        displayName: user?.displayName
      });

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const verdeJumbo = [0, 85, 44]; // Verde oscuro
      const verdeClaro = [30, 115, 74]; // Verde un poco más claro

      // 1. Logo y Encabezado
      const logoUrl = "/jumbo_logo.png";
      try {
        const img = new Image();
        img.src = logoUrl;
        img.crossOrigin = "Anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        doc.addImage(img, 'PNG', 15, 10, 15, 15);
      } catch (e) {
        console.warn("Fallo al cargar logo en PCC");
      }

      // Título y Metadatos (Desplazados por el logo)
      doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(verdeJumbo[0], verdeJumbo[1], verdeJumbo[2]);
      doc.text("REGISTRO PCC COCCIÓN Y ENFRIADO", 32, 16);
      
      doc.setFontSize(8); doc.setTextColor(80, 80, 80); doc.setFont("helvetica", "bold");
      doc.text("SECCIÓN: RINCON", 32, 21);
      doc.text(`CUARTO: ${cuartoActivo.includes('Postre') ? 'POSTRE' : cuartoActivo.toUpperCase()}`, 32, 25);
      doc.setFont("helvetica", "normal");
      doc.text(`MONITOR: ${user?.displayName || 'Personal de Turno'}`, 32, 29);

      doc.setFontSize(8); doc.setTextColor(100, 100, 100);
      doc.text(`FECHA: ${currentKey}`, pageWidth - 15, 15, { align: 'right' });
      doc.text(`LOCAL: J781 - RINCON JUMBO`, pageWidth - 15, 20, { align: 'right' });

      const head = [[
        { content: 'Producto', rowSpan: 2 },
        { content: 'Cocción', colSpan: 1 },
        { content: 'Acción Correctiva (Cocción)', colSpan: 2 },
        { content: 'Enfriamiento', colSpan: 3 },
        { content: 'Acción Correctiva (Enfriamiento)', colSpan: 2 }
      ], [
        'Inicio / Fin / Temperatura',
        'AC Cocción', 'T/H', 
        'Inicio (H/T)', 'T1 (H/T)', 'T2 (H/T)',
        'Detalle AC', 'Temp/Hora'
      ]];

      const body = entries.map(e => [
        e.producto,
        `${e.coccion_inicio}\n${e.coccion_fin_hora} / ${e.coccion_fin_temp}°C`,
        e.coccion_ac, e.coccion_ac_res,
        `${e.enfrio_inicio_hora}\n${e.enfrio_inicio_temp}°C`,
        `${e.enfrio_t1_hora}\n${e.enfrio_t1_temp}°C`,
        `${e.enfrio_t2_hora}\n${e.enfrio_t2_temp}°C`,
        e.enfrio_ac, e.enfrio_ac_res
      ]);

      autoTable(doc, {
        startY: 35,
        head: head,
        body: body,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, halign: 'center', valign: 'middle' },
        headStyles: { fillColor: verdeJumbo, textColor: [255, 255, 255], fontStyle: 'bold', lineWidth: 0.2, lineColor: [255, 255, 255] },
        didParseCell: function(data) {
          if (data.section === 'head') {
            const colIdx = data.column.index;
            // Alternar colores por grupos funcionales
            if (colIdx === 0) { // Producto
              data.cell.styles.fillColor = verdeJumbo;
            } else if (colIdx === 1) { // Cocción
              data.cell.styles.fillColor = verdeClaro;
            } else if (colIdx >= 2 && colIdx <= 3) { // AC Cocción
              data.cell.styles.fillColor = verdeJumbo;
            } else if (colIdx >= 4 && colIdx <= 6) { // Enfriamiento
              data.cell.styles.fillColor = verdeClaro;
            } else if (colIdx >= 7 && colIdx <= 8) { // AC Enfriamiento
              data.cell.styles.fillColor = verdeJumbo;
            }
          }
        }
      });

      // 3. Firmas y Footer
      const finalY = doc.lastAutoTable.finalY + 20;
      
      // Línea de firma responsable
      doc.setDrawColor(150, 150, 150);
      doc.line(15, finalY + 10, 80, finalY + 10);
      
      // Firma "Digital" (Nombre del usuario en cursiva sobre la línea)
      doc.setFont("courier", "bolditalic");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(user?.displayName || "Monitor Responsable", 20, finalY + 8);
      
      // Texto debajo de la línea
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text("FIRMA RESPONSABLE", 30, finalY + 14);

      // Verificación AC
      doc.line(pageWidth - 95, finalY + 10, pageWidth - 15, finalY + 10);
      doc.text("VERIFICACIÓN ASEGURAMIENTO CALIDAD", pageWidth - 80, finalY + 14);

      // 4. Nota de Límites Críticos (Opcional en PDF si el usuario tiene el panel abierto o como pie de página fijo)
      const footerY = doc.internal.pageSize.getHeight() - 15;
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text("ESPECIFICACIONES PCC: Cocción ≥ 74°C x 15s | Enfriamiento: 74°C a 21°C (2h) y 21°C a 5°C (4h).", 15, footerY);
      doc.text("AC: Cocción: Re-cocer o mermar. Enfriado: Abatidor o recalentar a 74°C.", 15, footerY + 3);

      doc.save(`PCC_${cuartoActivo}_${currentKey}.pdf`);
      toast.success("PDF generado 📄");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar PDF");
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* 1. Encabezado Principal: Título y Categorías */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/10 border border-amber-500/20">
              <span className="material-symbols-outlined" style={{ fontSize: 32 }}>thermostat</span>
            </div>
            <div>
              <h1 className={`${t.text} text-2xl font-black tracking-tight leading-none mb-1`}>PCC COCCIÓN Y ENFRIADO</h1>
              <p className={`${t.textSecondary} text-[10px] uppercase font-black tracking-[0.2em] opacity-60`}>Control Crítico de Temperaturas</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!cuarto && (
              <div className={`flex p-1 rounded-xl ${t.bgInput} border ${t.border} shadow-inner`}>
                {CUARTOS.map(c => (
                  <button key={c} onClick={() => setCuartoActivo(c)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${cuartoActivo === c ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : `${t.textSecondary} hover:text-white`}`}>{c}</button>
                ))}
              </div>
            )}
            <button 
              onClick={() => setShowInfo(!showInfo)}
              className={`w-10 h-10 rounded-xl border ${showInfo ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : `${t.bgCard} ${t.border} ${t.textSecondary} hover:border-amber-500/50 hover:text-amber-500`} transition-all flex items-center justify-center`}
              title="Ver Límites y Procedimientos"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>info</span>
            </button>
          </div>
        </div>

        {/* 2. Barra de Control: Vista y Navegación de Fecha */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl ${t.bgCard} border ${t.border} shadow-sm`}>
          <div className={`flex p-1 rounded-xl ${t.bgInput} border ${t.border} w-fit`}>
            {['diaria', 'semanal', 'mensual'].map(v => (
              <button key={v} onClick={() => setVista(v)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${vista === v ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : `${t.textSecondary} hover:text-white`}`}>{v}</button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <h2 className={`${t.text} text-base font-bold tracking-tight`}>{getPeriodoTitulo()}</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => navegar(-1)} className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-amber-500 hover:border-amber-500/50 transition-all shadow-sm active:scale-90`}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span></button>
            
            {/* Selector de Fecha (Calendario) */}
            <div className="relative">
              <button 
                onClick={() => document.getElementById('date-picker-pcc').showPicker()}
                className={`w-8 h-8 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-amber-500 transition shadow-sm`}
                title="Elegir fecha"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>calendar_month</span>
              </button>
              <input 
                id="date-picker-pcc"
                type="date" 
                className="absolute inset-0 opacity-0 pointer-events-none"
                value={fechaBase.toISOString().split('T')[0]}
                onChange={(e) => {
                  if (e.target.value) {
                    setFechaBase(new Date(e.target.value + 'T12:00:00'));
                  }
                }}
              />
            </div>

            <button onClick={() => navegar(1)} className={`w-8 h-8 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-amber-500 transition`}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span></button>
          </div>
        </div>
      </div>
      
      {/* Banner de Información y Límites (PCC) */}
      {showInfo && (
        <div className={`${t.bgCard} border border-amber-500/20 rounded-2xl p-5 flex gap-5 items-start animate-in fade-in zoom-in duration-300 relative overflow-hidden mb-6`}>
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 shadow-inner">
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>verified_user</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <h4 className={`${t.text} text-xs font-black uppercase tracking-widest flex items-center gap-2`}>
                Límites Críticos y Acciones Correctivas
              </h4>
              <button onClick={() => setShowInfo(false)} className={`${t.textSecondary} hover:text-white transition`}><span className="material-symbols-outlined text-sm">close</span></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <p className={`${t.textSecondary} text-[10px] font-black uppercase tracking-widest opacity-60 border-b border-white/5 pb-1`}>Especificaciones de Temperatura</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <span className="font-bold text-amber-500">Cocción:</span>
                  <span className={t.text}>≥ 74°C por 15 segundos</span>
                  <span className="font-bold text-amber-500">Enfriamiento 1:</span>
                  <span className={t.text}>74°C a 21°C en 2 horas</span>
                  <span className="font-bold text-amber-500">Enfriamiento 2:</span>
                  <span className={t.text}>21°C a 5°C en 4 horas</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <p className={`${t.textSecondary} text-[10px] font-black uppercase tracking-widest opacity-60 border-b border-white/5 pb-1`}>Acciones Correctivas</p>
                <div className="space-y-2 text-[10px] leading-relaxed">
                  <p className={t.text}><span className="font-bold text-amber-500 uppercase text-[9px] mr-1">[Cocción]</span> Continuar hasta alcanzar 74°C. Si falla 2da vez, mermar.</p>
                  <p className={t.text}><span className="font-bold text-amber-500 uppercase text-[9px] mr-1">[Enfriado]</span> 1. Con abatidor: Golpe de frío hasta 5°C. 2. Sin abatidor: Recalentar a 74°C y re-enfriar.</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-white/5">
              <p className={`${t.textSecondary} text-[9px] italic opacity-70`}>
                * PRODUCTOS MUESTREADOS: Diariamente se debe controlar la temperatura de cocción y enfriado a la totalidad de la producción.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={`${t.bgCard} border ${t.border} rounded-3xl p-6 shadow-xl overflow-visible`}>
        <div className="relative flex items-center justify-center mb-10">
          <h2 className={`${t.text} font-black uppercase tracking-[0.3em] text-xs opacity-40`}>Registros del Día</h2>
          
          <div className="absolute right-0">
            {/* Tooltip Onboarding */}
            {showTooltip && (
              <div className="absolute -top-14 right-0 animate-bounce pointer-events-none z-50">
                <div className="relative bg-amber-500 text-white text-[11px] font-black uppercase tracking-tight px-4 py-2.5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(245,158,11,0.5)] whitespace-nowrap">
                  Agregar registro
                  <div className="absolute -bottom-1 right-6 w-3 h-3 bg-amber-500 rotate-45 rounded-sm"></div>
                </div>
              </div>
            )}

            <button 
              onClick={() => {
                setShowAddModal(true);
                setShowTooltip(false);
              }}
              onMouseEnter={() => setShowTooltip(false)}
              className="group flex items-center gap-0 hover:gap-3 px-3 py-3 hover:px-6 rounded-2xl bg-amber-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all duration-500 ease-in-out overflow-hidden animate-glow-pulse hover:animate-none"
            >
              <span className="material-symbols-outlined text-xl transition-transform duration-500 group-hover:rotate-90">add</span>
              <span className="max-w-0 group-hover:max-w-[200px] opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out whitespace-nowrap">
                Nuevo Registro
              </span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3 animate-pulse">
            <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
            <span className={t.textSecondary}>Cargando PCC...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-4 border-2 border-dashed border-gray-800 rounded-3xl">
            <span className="material-symbols-outlined text-5xl text-gray-700">pending_actions</span>
            <p className={t.textSecondary}>No hay registros para este día en {cuartoActivo}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2 min-w-[1000px]">
              <thead>
                <tr>
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] ${t.textSecondary} opacity-50`}>Producto</th>
                  {vista !== 'diaria' && <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] ${t.textSecondary} opacity-50`}>Fecha</th>}
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] ${t.textSecondary} opacity-50 text-center`}>Cocción</th>
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] ${t.textSecondary} opacity-50 text-center`}>Enfriamiento</th>
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] ${t.textSecondary} opacity-50 text-center`}>Acciones AC</th>
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] ${t.textSecondary} opacity-50 text-right`}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y-0">
                {entries.map((e, index) => (
                  <tr key={e.id || index} className={`${t.bgInput} hover:bg-white/5 transition-all duration-300 group`}>
                    {/* Producto */}
                    <td className="px-6 py-5 rounded-l-2xl border-y border-l border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                        <span className={`text-base font-black ${t.text} tracking-tight`}>{e.producto}</span>
                      </div>
                    </td>

                    {/* Fecha (opcional) */}
                    {vista !== 'diaria' && (
                      <td className="px-6 py-5 border-y border-white/5">
                        <span className="text-[10px] font-black text-amber-500/80 bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/10 uppercase tracking-widest">{e.fechaStr?.split('-').reverse().slice(0,2).join('/')}</span>
                      </td>
                    )}

                    {/* Cocción */}
                    <td className="px-6 py-5 border-y border-white/5">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-1 bg-emerald-500/5 px-2 py-1 rounded-xl border border-emerald-500/10">
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">{e.coccion_inicio || '--:--'}</span>
                          <span className="text-emerald-500/30 text-[10px] mx-0.5">➔</span>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">{e.coccion_fin_hora || '--:--'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-amber-500 text-sm">local_fire_department</span>
                          <span className="text-lg font-black text-white tracking-tighter italic">{e.coccion_fin_temp || '--'}°C</span>
                        </div>
                      </div>
                    </td>

                    {/* Enfriamiento */}
                    <td className="px-6 py-5 border-y border-white/5">
                      <div className="flex justify-center gap-6">
                        <div className="flex flex-col items-center group/item">
                          <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1 group-hover/item:text-blue-400 transition-colors">Inicio</span>
                          <span className="text-sm font-black text-white leading-tight">{e.enfrio_inicio_temp || '--'}°C</span>
                          <span className="text-[9px] text-blue-400/60 font-mono font-bold">{e.enfrio_inicio_hora || '--:--'}</span>
                        </div>
                        <div className="w-px h-8 bg-white/5 self-center"></div>
                        <div className="flex flex-col items-center group/item">
                          <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1 group-hover/item:text-blue-400 transition-colors">T1 (2h)</span>
                          <span className="text-sm font-black text-white leading-tight">{e.enfrio_t1_temp || '--'}°C</span>
                          <span className="text-[9px] text-blue-400/60 font-mono font-bold">{e.enfrio_t1_hora || '--:--'}</span>
                        </div>
                        <div className="w-px h-8 bg-white/5 self-center"></div>
                        <div className="flex flex-col items-center group/item">
                          <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1 group-hover/item:text-blue-400 transition-colors">T2 (4h)</span>
                          <span className="text-sm font-black text-white leading-tight">{e.enfrio_t2_temp || '--'}°C</span>
                          <span className="text-[9px] text-blue-400/60 font-mono font-bold">{e.enfrio_t2_hora || '--:--'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Acciones AC */}
                    <td className="px-6 py-5 border-y border-white/5">
                      <div className="max-w-[180px] mx-auto text-center">
                        {e.coccion_ac || e.enfrio_ac ? (
                          <div className="flex flex-col gap-1">
                            <p className="text-[10px] text-rose-400 font-bold leading-tight italic line-clamp-2">"{e.coccion_ac || e.enfrio_ac}"</p>
                            <span className="text-[9px] text-rose-500/50 font-black uppercase tracking-tighter">{e.coccion_ac_res || e.enfrio_ac_res}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-600 italic font-medium opacity-40 tracking-wide">Sin incidencias</span>
                        )}
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-5 rounded-r-2xl border-y border-r border-white/5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                        <button onClick={() => openEditModal(e)} className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all flex items-center justify-center">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        {esAdmin && (
                          <button onClick={() => removeEntry(e.id)} className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/20 transition-all flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FABs */}
      <div className="fixed bottom-24 right-6 md:bottom-10 md:right-10 flex flex-col gap-3 z-50">
        <button onClick={handleExportPDF} className="w-14 h-14 md:w-auto md:h-auto md:px-6 md:py-3 rounded-full md:rounded-xl bg-slate-950/40 backdrop-blur-md text-slate-200 font-bold shadow-2xl hover:bg-slate-900/60 transition-all flex items-center justify-center gap-2 border border-white/10 group">
          <span className="material-symbols-outlined">picture_as_pdf</span><span className="hidden md:inline">PDF</span>
        </button>
        <button onClick={() => handleSave()} disabled={saving} className="w-14 h-14 md:w-auto md:h-auto md:px-6 md:py-3 rounded-full md:rounded-xl bg-amber-500 text-white font-bold shadow-2xl shadow-amber-500/20 hover:scale-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 group">
          {saving ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <span className="material-symbols-outlined">cloud_upload</span>}
          <span className="hidden md:inline">{saving ? "Guardando..." : "Guardar"}</span>
        </button>
      </div>

      {/* Modal Agregar Registro */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className={`${t.bgCard} border ${t.border} rounded-3xl p-6 max-w-4xl w-full shadow-2xl my-8`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`${t.text} text-xl font-bold`}>{editEntry ? 'Editar Control PCC' : 'Nuevo Control PCC'}</h3>
              <div className="flex items-center gap-2">
                {!editEntry && entries.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => {
                      const last = entries[0];
                      setFormData({
                        ...formData,
                        producto: last.producto,
                        coccion_inicio: last.coccion_inicio,
                        coccion_fin_hora: last.coccion_fin_hora,
                        coccion_fin_temp: last.coccion_fin_temp,
                        enfrio_inicio_hora: last.enfrio_inicio_hora,
                        enfrio_inicio_temp: last.enfrio_inicio_temp,
                        enfrio_t1_hora: last.enfrio_t1_hora,
                        enfrio_t1_temp: last.enfrio_t1_temp,
                        enfrio_t2_hora: last.enfrio_t2_hora,
                        enfrio_t2_temp: last.enfrio_t2_temp
                      });
                      toast.success("Datos copiados");
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${t.bgInput} ${t.text} text-[10px] font-black uppercase tracking-widest border ${t.border} hover:bg-amber-500/10 hover:text-amber-500 transition-all`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                    Copiar último
                  </button>
                )}
                <button onClick={() => { setShowAddModal(false); setEditEntry(null); }} className={t.textSecondary}><span className="material-symbols-outlined">close</span></button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Columna Producto */}
              <div className="md:col-span-3">
                <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block tracking-widest">Nombre del Producto</label>
                <input type="text" value={formData.producto} onChange={e => setFormData({...formData, producto: e.target.value})} className={`w-full ${t.bgInput} ${t.text} p-4 rounded-2xl border ${t.border} focus:border-amber-500 font-bold`} placeholder="Ej: Piña Trozada" />
              </div>

              {/* Sección Cocción */}
              <div className="space-y-4 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                <h4 className="text-emerald-400 font-black text-xs uppercase mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-sm">local_fire_department</span> Fase Cocción</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><label className="text-[8px] text-gray-500 uppercase">Inicio (Hora)</label><input type="time" value={formData.coccion_inicio} onChange={e => setFormData({...formData, coccion_inicio: e.target.value})} className={`w-full ${t.bgInput} ${t.text} p-2 rounded-lg border ${t.border}`} /></div>
                  <div><label className="text-[8px] text-gray-500 uppercase">Fin (Hora)</label><input type="time" value={formData.coccion_fin_hora} onChange={e => setFormData({...formData, coccion_fin_hora: e.target.value})} className={`w-full ${t.bgInput} ${t.text} p-2 rounded-lg border ${t.border}`} /></div>
                  <div><label className="text-[8px] text-gray-500 uppercase">Temp (°C)</label><input type="number" value={formData.coccion_fin_temp} onChange={e => setFormData({...formData, coccion_fin_temp: e.target.value})} className={`w-full ${t.bgInput} ${t.text} p-2 rounded-lg border ${t.border}`} /></div>
                </div>
              </div>

              {/* Sección Enfriamiento */}
              <div className="md:col-span-2 space-y-4 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                <h4 className="text-blue-400 font-black text-xs uppercase mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-sm">ac_unit</span> Fase Enfriamiento</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-[8px] text-gray-500 uppercase font-black">Inicio</label><div className="flex gap-1"><input type="time" value={formData.enfrio_inicio_hora} onChange={e => setFormData({...formData, enfrio_inicio_hora: e.target.value})} className={`w-full ${t.bgInput} ${t.text} p-1 text-[10px] rounded-lg border ${t.border}`} /><input type="number" value={formData.enfrio_inicio_temp} onChange={e => setFormData({...formData, enfrio_inicio_temp: e.target.value})} placeholder="°C" className={`w-full ${t.bgInput} ${t.text} p-1 text-[10px] rounded-lg border ${t.border}`} /></div></div>
                  <div><label className="text-[8px] text-gray-500 uppercase font-black">T1 (2h)</label><div className="flex gap-1"><input type="time" value={formData.enfrio_t1_hora} onChange={e => setFormData({...formData, enfrio_t1_hora: e.target.value})} className={`w-full ${t.bgInput} ${t.text} p-1 text-[10px] rounded-lg border ${t.border}`} /><input type="number" value={formData.enfrio_t1_temp} onChange={e => setFormData({...formData, enfrio_t1_temp: e.target.value})} placeholder="°C" className={`w-full ${t.bgInput} ${t.text} p-1 text-[10px] rounded-lg border ${t.border}`} /></div></div>
                  <div><label className="text-[8px] text-gray-500 uppercase font-black">T2 (4h)</label><div className="flex gap-1"><input type="time" value={formData.enfrio_t2_hora} onChange={e => setFormData({...formData, enfrio_t2_hora: e.target.value})} className={`w-full ${t.bgInput} ${t.text} p-1 text-[10px] rounded-lg border ${t.border}`} /><input type="number" value={formData.enfrio_t2_temp} onChange={e => setFormData({...formData, enfrio_t2_temp: e.target.value})} placeholder="°C" className={`w-full ${t.bgInput} ${t.text} p-1 text-[10px] rounded-lg border ${t.border}`} /></div></div>
                </div>
              </div>

              {/* Acciones Correctivas */}
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                  <label className="text-[10px] text-amber-500 uppercase font-black block mb-2">Acción Correctiva (Detalle)</label>
                  <textarea value={formData.coccion_ac || formData.enfrio_ac} onChange={e => setFormData({...formData, coccion_ac: e.target.value})} className={`w-full ${t.bgInput} ${t.text} p-3 rounded-xl border ${t.border} h-20 text-xs`} placeholder="Describir acción tomada..." />
                </div>
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                  <label className="text-[10px] text-amber-500 uppercase font-black block mb-2">Resultado / Hora de AC</label>
                  <input type="text" value={formData.coccion_ac_res || formData.enfrio_ac_res} onChange={e => setFormData({...formData, coccion_ac_res: e.target.value})} className={`w-full ${t.bgInput} ${t.text} p-3 rounded-xl border ${t.border} text-xs`} placeholder="Ej: Alcanzó 75°C a las 14:30" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowAddModal(false)} className={`flex-1 py-4 rounded-2xl ${t.bgInput} ${t.text} font-bold`}>Cancelar</button>
              <button onClick={handleAddEntry} className="flex-1 py-4 rounded-2xl bg-amber-500 text-white font-bold shadow-xl shadow-amber-500/30">Guardar Control</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Auditoría */}
      {showAuditModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className={`${t.bgCard} border ${t.border} rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center`}>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-6"><span className="material-symbols-outlined" style={{ fontSize: 32 }}>shield_person</span></div>
            <h3 className={`${t.text} text-xl font-bold mb-2`}>Registro de Seguridad</h3>
            <p className={`${t.textSecondary} text-sm mb-8`}>Esta exportación PCC quedará vinculada a tu usuario para auditorías sanitarias.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowAuditModal(false)} className={`flex-1 py-3 rounded-xl ${t.bgInput} ${t.text} font-bold`}>Cerrar</button>
              <button onClick={confirmExport} className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold">Generar PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
