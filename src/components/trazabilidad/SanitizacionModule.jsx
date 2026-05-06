import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
// Usaremos métodos nativos de JS para evitar la dependencia de date-fns que no está instalada
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
import autoTable from 'jspdf-autotable';

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
  const [expandedDays, setExpandedDays] = useState({}); // { '06/05': true }
  
  const [formData, setFormData] = useState({
    producto: '',
    proveedor: '',
    cantidad: '',
    concentracion: '',
    tiempo: '',
    accionCorrectiva: '',
    fecha: '',
    hora: '',
    monitor: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || ''
  });

  const [listaProveedores, setListaProveedores] = useState([]);
  const [showProvSugeridos, setShowProvSugeridos] = useState(false);

  const esAdmin = rol === 'admin' || rol === 'superadmin' || rol === 'unico';
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

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

  // Agrupar registros por fecha para la vista semanal/mensual
  const groupedRegistros = registros.reduce((acc, r) => {
    const key = formatDateOnly(r.fecha);
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  // Efecto para expandir por defecto el primer grupo cuando cambian los registros
  useEffect(() => {
    const keys = Object.keys(groupedRegistros);
    if (keys.length > 0) {
      setExpandedDays(prev => ({ [keys[0]]: true, ...prev }));
    }
  }, [registros]);

  const toggleDay = (key) => {
    setExpandedDays(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "proveedores"), (snap) => {
      setListaProveedores(
        snap.docs
          .filter(d => d.data().activo !== false)
          .map(d => d.data().nombre)
          .sort()
      );
    });
    return () => unsub();
  }, []);

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

      const combinedDate = (formData.fecha && formData.hora) 
        ? new Date(`${formData.fecha}T${formData.hora}`) 
        : new Date();

      if (editId) {
        await updateDoc(doc(db, 'trazabilidad_sanitizacion', editId), {
          ...data,
          fecha: combinedDate
        });
      } else {
        await addDoc(collection(db, 'trazabilidad_sanitizacion'), {
          ...data,
          fecha: combinedDate
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
    const f = reg.fecha.toDate ? reg.fecha.toDate() : new Date(reg.fecha);
    setFormData({
      producto: reg.producto,
      proveedor: reg.proveedor,
      cantidad: reg.cantidad,
      concentracion: reg.concentracion,
      tiempo: reg.tiempo,
      accionCorrectiva: reg.accionCorrectiva || '',
      fecha: f.toISOString().slice(0, 10),
      hora: f.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }),
      monitor: reg.monitor
    });
    setModalOpen(true);
  };
  
  const handleExportPDF = () => {
    setShowAuditModal(true);
  };

  const confirmExport = async () => {
    setShowAuditModal(false);
    const printId = `SAN-${Date.now().toString(36).toUpperCase()}`;
    const { inicio, fin } = getRango();
    
    try {
      // 1. Registro de Auditoría
      await addDoc(collection(db, 'log_impresiones'), {
        printId,
        usuario: auth.currentUser?.email,
        displayName: auth.currentUser?.displayName,
        modulo: 'PCC Sanitización',
        cuarto,
        fechaReporte: inicio.toLocaleDateString('es-ES'),
        fechaImpresion: serverTimestamp()
      });

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const verdeJumbo = [0, 85, 44];

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
        console.warn("Fallo al cargar logo en Sanitización");
      }

      // Título y Metadatos
      doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(verdeJumbo[0], verdeJumbo[1], verdeJumbo[2]);
      doc.text("REGISTRO PCC SANITIZACIÓN FRUTAS, HORTALIZAS Y HUEVOS", 32, 16);
      
      doc.setFontSize(8); doc.setTextColor(80, 80, 80); doc.setFont("helvetica", "bold");
      doc.text("SECCIÓN: RINCON", 32, 21);
      doc.text(`CUARTO: ${cuarto === 'postres' ? 'POSTRE' : cuarto.toUpperCase()}`, 32, 25);
      doc.setFont("helvetica", "normal");
      doc.text(`MONITOR: ${auth.currentUser?.displayName || 'Personal de Turno'}`, 32, 29);

      doc.setFontSize(8); doc.setTextColor(100, 100, 100);
      const inicioStr = inicio.toLocaleDateString('es-ES');
      const finStr = fin.toLocaleDateString('es-ES');
      doc.text(`PERIODO: ${inicioStr} - ${finStr}`, pageWidth - 15, 15, { align: 'right' });
      doc.text(`LOCAL: J781 - BELLAVISTA`, pageWidth - 15, 20, { align: 'right' });

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

      if (tableData.length === 0) {
        tableData.push([{ content: "No se encontraron registros para este periodo", colSpan: 8, styles: { halign: 'center', fontStyle: 'italic', cellPadding: 10 } }]);
      }

      autoTable(doc, {
        startY: 36,
        head: [['Fecha/Hora', 'Materia Prima', 'Proveedor', 'Cantidad', 'Conc. (ppm)', 'Tiempo (min)', 'Acción Correctiva', 'Monitor']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: verdeJumbo, textColor: 255, fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 40 },
          6: { cellWidth: 40 }
        }
      });

      // 3. Firmas y Footer
      const finalY = doc.lastAutoTable.finalY + 20;
      
      // Línea de firma responsable
      doc.setDrawColor(150, 150, 150);
      doc.line(15, finalY + 10, 80, finalY + 10);
      
      // Firma Digital
      doc.setFont("courier", "bolditalic");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(auth.currentUser?.displayName || "Monitor Responsable", 20, finalY + 8);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text("FIRMA RESPONSABLE", 30, finalY + 14);

      // Verificación AC
      doc.line(pageWidth - 95, finalY + 10, pageWidth - 15, finalY + 10);
      doc.text("VERIFICACIÓN ASEGURAMIENTO CALIDAD", pageWidth - 80, finalY + 14);

      // 4. Nota de Límites Críticos
      const footerY = doc.internal.pageSize.getHeight() - 15;
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text("LÍMITES CRÍTICOS: AFVT (Ecolab): 1:102-1:85 (3 min) | MG Quat: 200 ppm (3 min).", 15, footerY);
      doc.text("AC: Si hay desviación, realizar dilución manual (AFVT: 11ml/L | MG Quat: 2ml/L) y volver a sanitizar.", 15, footerY + 3);

      // Descarga robusta
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Sanitizacion_${cuarto}_${new Date().toLocaleDateString('es-ES').replace(/\//g, '')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF generado y registrado");
    } catch (err) {
      console.error("Error al exportar:", err);
      toast.error("Fallo al generar el PDF");
    }
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
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* 1. Encabezado Principal: Título */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/10 border border-rose-500/20">
              <span className="material-symbols-outlined" style={{ fontSize: 32 }}>clean_hands</span>
            </div>
            <div>
              <h1 className={`${t.text} text-2xl font-black tracking-tight leading-none mb-1 uppercase`}>PCC Sanitización</h1>
              <p className={`${t.textSecondary} text-[10px] uppercase font-black tracking-[0.2em] opacity-60`}>Frutas, Hortalizas y Huevos</p>
            </div>
          </div>

          <button 
            onClick={() => setShowInfo(!showInfo)}
            className={`w-10 h-10 rounded-xl border ${showInfo ? 'bg-rose-500/20 border-rose-500 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : `${t.bgCard} ${t.border} ${t.textSecondary} hover:border-rose-500/50 hover:text-rose-500`} transition-all flex items-center justify-center`}
            title="Ver Límites y Procedimientos"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>info</span>
          </button>
        </div>

        {/* 2. Barra de Control: Vista y Navegación de Fecha */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl ${t.bgCard} border ${t.border} shadow-sm`}>
          <div className={`flex p-1 rounded-xl ${t.bgInput} border ${t.border} w-fit shadow-inner`}>
            {['diaria', 'semanal', 'mensual'].map(v => (
              <button key={v} onClick={() => setVista(v)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${vista === v ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30' : `${t.textSecondary} hover:text-white`}`}>{v}</button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <h2 className={`${t.text} text-base font-bold tracking-tight`}>{getTitulo()}</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => navegar(-1)} className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-rose-500 hover:border-rose-500/50 transition-all shadow-sm active:scale-90`}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span></button>
              
              {/* Selector de Fecha (Calendario) */}
              <div className="relative">
                <button 
                  onClick={() => document.getElementById('date-picker-sanitizacion').showPicker()}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-rose-500 hover:border-rose-500/50 transition-all shadow-sm active:scale-90`}
                  title="Elegir fecha"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>calendar_month</span>
                </button>
                <input 
                  id="date-picker-sanitizacion"
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

              <button onClick={() => navegar(1)} className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-rose-500 hover:border-rose-500/50 transition-all shadow-sm active:scale-90`}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span></button>
            </div>
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
              <th className={`p-4 text-[10px] font-black uppercase tracking-widest ${t.textSecondary}`}>Fecha</th>
              <th className={`p-4 text-[10px] font-black uppercase tracking-widest ${t.textSecondary}`}>Hora</th>
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
              <tr><td colSpan={10} className="p-10 text-center"><span className="w-8 h-8 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin inline-block"></span></td></tr>
            ) : registros.length === 0 ? (
              <tr><td colSpan={10} className={`p-10 text-center ${t.textSecondary} italic`}>No hay registros para este periodo</td></tr>
            ) : (
              Object.entries(groupedRegistros).map(([dateKey, items]) => (
                <React.Fragment key={dateKey}>
                  {/* Header de Grupo (Solo en vista semanal/mensual) */}
                  {vista !== 'diaria' && (
                    <tr 
                      onClick={() => toggleDay(dateKey)}
                      className={`cursor-pointer ${t.bgInput} border-b border-white/5 hover:bg-rose-500/5 transition-colors`}
                    >
                      <td colSpan={10} className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-rose-500 transition-transform ${expandedDays[dateKey] ? 'rotate-90' : ''}`} style={{ fontSize: 18 }}>chevron_right</span>
                          <span className={`${t.text} text-[11px] font-black uppercase tracking-widest`}>REGISTROS DEL {dateKey}</span>
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[9px] font-black">{items.length} {items.length === 1 ? 'REGISTRO' : 'REGISTROS'}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  
                  {/* Filas del Grupo */}
                  {(vista === 'diaria' || expandedDays[dateKey]) && items.map(r => (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                      <td className={`p-4 text-xs font-bold ${t.text}`}>{formatDateOnly(r.fecha)}</td>
                      <td className={`p-4 text-xs font-bold ${t.text}`}>{formatTimeOnly(r.fecha)}</td>
                      <td className={`p-4 text-xs ${t.textSecondary}`}>{r.producto}</td>
                      <td className={`p-4 text-xs ${t.textSecondary}`}>{r.proveedor}</td>
                      <td className={`p-4 text-xs ${t.textSecondary}`}>{r.cantidad}</td>
                      <td className={`p-4 text-xs font-mono font-bold text-rose-400`}>{r.concentracion} ppm</td>
                      <td className={`p-4 text-xs font-bold text-amber-500`}>{r.tiempo} min</td>
                      <td className="p-4">
                        {r.accionCorrectiva ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-rose-400 font-bold leading-tight italic line-clamp-1 group-hover:line-clamp-none transition-all">"{r.accionCorrectiva}"</span>
                          </div>
                        ) : <span className="text-[10px] text-gray-600 opacity-40">Sin incidencias</span>}
                      </td>
                      <td className={`p-4 text-[10px] font-black uppercase tracking-tight ${t.textSecondary} opacity-70`}>{r.monitor}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(r)} className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"><span className="material-symbols-outlined text-sm">edit</span></button>
                          {esAdmin && (
                            <div className="relative">
                              {confirmDeleteId === r.id ? (
                                <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-300">
                                  <button onClick={async (e) => { e.preventDefault(); e.stopPropagation(); try { await deleteDoc(doc(db, 'trazabilidad_sanitizacion', r.id)); toast.success("Eliminado"); } catch(err){toast.error("Error");} }} className="px-2 py-1 rounded-md bg-red-600 text-[10px] font-black text-white uppercase hover:bg-red-700 transition-colors">Confirmar</button>
                                  <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} className="p-1 rounded-md bg-white/10 text-white/50 hover:text-white transition-colors"><span className="material-symbols-outlined text-sm">close</span></button>
                                </div>
                              ) : (
                                <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(r.id); }} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"><span className="material-symbols-outlined text-sm">delete</span></button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Botones Flotantes */}
      <div className="fixed bottom-10 right-10 flex flex-col gap-3 z-50">
        <button onClick={handleExportPDF} className="w-14 h-14 md:w-auto md:h-auto md:px-6 md:py-3 rounded-full md:rounded-xl bg-rose-950/40 backdrop-blur-md text-rose-200 font-bold shadow-2xl hover:bg-rose-900/60 transition-all flex items-center justify-center gap-2 border border-rose-500/20 group"><span className="material-symbols-outlined">picture_as_pdf</span><span className="hidden md:inline">PDF</span></button>
        <button onClick={() => { 
          const d = new Date(fechaBase);
          const now = new Date();
          const fechaStr = d.toISOString().slice(0, 10);
          const horaStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
          
          setEditId(null); 
          setFormData({ 
            producto: '', 
            proveedor: '', 
            cantidad: '', 
            concentracion: '', 
            tiempo: '', 
            accionCorrectiva: '', 
            fecha: fechaStr,
            hora: horaStr,
            monitor: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || '' 
          }); 
          setModalOpen(true); 
        }} className="w-14 h-14 md:w-auto md:h-auto md:px-6 md:py-3 rounded-full md:rounded-xl bg-rose-600 text-white font-bold shadow-2xl shadow-rose-500/20 hover:scale-110 active:scale-95 transition-all flex items-center justify-center gap-2 group"><span className="material-symbols-outlined">add</span><span className="hidden md:inline">Nuevo Registro</span></button>
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

              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest ${t.textSecondary} mb-1 block`}>Fecha de Proceso</label>
                  <input 
                    required 
                    type="date" 
                    value={formData.fecha} 
                    onChange={e => setFormData({...formData, fecha: e.target.value})} 
                    className={`w-full ${t.bgInput} ${t.text} p-3 rounded-xl border ${t.border} focus:outline-none focus:border-rose-500`} 
                  />
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest ${t.textSecondary} mb-1 block`}>Hora</label>
                  <input 
                    required 
                    type="time" 
                    value={formData.hora} 
                    onChange={e => setFormData({...formData, hora: e.target.value})} 
                    className={`w-full ${t.bgInput} ${t.text} p-3 rounded-xl border ${t.border} focus:outline-none focus:border-rose-500`} 
                  />
                </div>
              </div>
              <div className="relative">
                <label className={`text-[10px] font-black uppercase tracking-widest ${t.textSecondary} mb-1 block`}>Proveedor</label>
                <input 
                  required 
                  type="text" 
                  value={formData.proveedor} 
                  onChange={e => {
                    setFormData({...formData, proveedor: e.target.value});
                    setShowProvSugeridos(true);
                  }} 
                  onFocus={() => setShowProvSugeridos(true)}
                  onBlur={() => setTimeout(() => setShowProvSugeridos(false), 200)}
                  className={`w-full ${t.bgInput} ${t.text} p-3 rounded-xl border ${t.border} focus:outline-none focus:border-rose-500`} 
                  placeholder="Ej: Natfruit" 
                />
                {showProvSugeridos && (
                  <div className={`absolute z-[110] w-full mt-1 border ${t.border} ${t.bgCard} rounded-xl shadow-2xl max-h-48 overflow-y-auto backdrop-blur-md`}>
                    {listaProveedores
                      .filter(p => !formData.proveedor || p.toLowerCase().includes(formData.proveedor.toLowerCase()))
                      .map((p, i) => (
                        <button 
                          key={i} 
                          type="button"
                          onClick={() => {
                            setFormData({...formData, proveedor: p});
                            setShowProvSugeridos(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm ${t.text} hover:bg-rose-500/10 hover:text-rose-400 transition-colors border-b last:border-b-0 ${t.border}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-xs opacity-50">inventory</span>
                            {p}
                          </div>
                        </button>
                      ))}
                    {listaProveedores.filter(p => p.toLowerCase().includes(formData.proveedor?.toLowerCase() || "")).length === 0 && formData.proveedor && (
                      <div className={`px-4 py-3 text-xs ${t.textSecondary} italic`}>
                        Nuevo proveedor (se guardará solo en este registro)
                      </div>
                    )}
                  </div>
                )}
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
                <div className="flex items-center gap-2">
                  <input 
                    required 
                    type="text" 
                    value={formData.tiempo} 
                    onChange={e => setFormData({...formData, tiempo: e.target.value})} 
                    className={`flex-1 min-w-0 ${t.bgInput} ${t.text} p-3 rounded-xl border ${t.border} focus:outline-none focus:border-rose-500 transition-all`} 
                    placeholder="Ej: 5" 
                  />
                  {!editId && registros.length > 0 && (
                    <button 
                      type="button"
                      onClick={() => {
                        const last = registros[0];
                        setFormData({
                          ...formData,
                          concentracion: last.concentracion,
                          tiempo: last.tiempo
                        });
                        toast.success("Copiado de registro anterior");
                      }}
                      title="Copiar concentración y tiempo del registro anterior"
                      className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-xl ${t.bgInput} ${t.textSecondary} hover:text-rose-500 border ${t.border} hover:bg-rose-500/10 transition-all shadow-sm`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>content_copy</span>
                    </button>
                  )}
                </div>
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

      {/* Modal de Advertencia de Auditoría */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] px-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`${t.bgCard} border ${t.border} w-full max-w-sm rounded-3xl p-8 shadow-2xl border-rose-500/30 animate-in zoom-in-95 duration-300`}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-rose-500" style={{ fontSize: 32 }}>gavel</span>
              </div>
              <h3 className={`${t.text} text-xl font-black mb-2`}>Verificación de Auditoría</h3>
              <p className={`${t.textSecondary} text-sm mb-8 leading-relaxed`}>
                Estás a punto de generar un documento oficial. Esta acción quedará vinculada a tu usuario <span className="text-rose-400 font-bold">{auth.currentUser?.email}</span> para fines de trazabilidad y control.
              </p>
              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={confirmExport}
                  className="w-full bg-rose-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  GENERAR DOCUMENTO
                </button>
                <button 
                  onClick={() => setShowAuditModal(false)}
                  className={`w-full ${t.bgInput} ${t.textSecondary} font-bold py-4 rounded-2xl transition-all`}
                >
                  CANCELAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SanitizacionModule;
