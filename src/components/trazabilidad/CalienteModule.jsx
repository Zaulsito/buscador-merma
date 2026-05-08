import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { normalizeText } from '../../utils/searchUtils';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CoccionEnfriadoModule from './CoccionEnfriadoModule';
import SanitizacionModule from './SanitizacionModule';

const DEFAULT_CATEGORIAS = [
  { id: 'principal', nombre: 'Materias Primas', icon: 'inventory_2', color: 'text-cyan-400', bg: 'bg-cyan-500/10', items: ['Insumo 1', 'Insumo 2'] }
];

const PRODUCTOS_ACOMPANAMIENTOS = [
  { 
    id: 'arroces', 
    nombre: 'Arroces', 
    icon: 'rice_bowl', 
    color: 'text-yellow-400', 
    bg: 'bg-yellow-500/10', 
    items: [
      'ARROZ AL CHAMPIÑON', 'ARROZ AL COCO', 'ARROZ AL CURRY', 'ARROZ ARABE', 'ARROZ ATOMATADO',
      'ARROZ CALLAMPAS SECAS', 'ARROZ CHAUFAN', 'ARROZ DE ZANAHORIA', 'ARROZ EGIPCIO', 'ARROZ GRIEGO',
      'ARROZ LYONESA', 'ARROZ MOROS Y CRISTIANOS', 'ARROZ PIAMONTESA', 'ARROZ PILAF UN', 'ARROZ TOCINO OLIVA'
    ] 
  },
  { 
    id: 'papas', 
    nombre: 'Papas y Guarniciones', 
    icon: 'bakery_dining', 
    color: 'text-orange-400', 
    bg: 'bg-orange-500/10', 
    items: [
      'PAPAS A LA CREMA', 'PAPAS AL MERKEN', 'PAPAS AL PEREJIL', 'PAPAS AL ROMERO', 
      'PAPAS ASADAS CREMA ACIDA', 'PAPAS BRAVAS', 'PAPAS FRITAS', 'PAPAS LYONESA', 
      'PAPAS PROVENZAL', 'PAPAS RISOLE'
    ] 
  },
  { 
    id: 'pures', 
    nombre: 'Purés', 
    icon: 'restaurant', 
    color: 'text-amber-400', 
    bg: 'bg-amber-500/10', 
    items: [
      'PURE CEBOLLIN', 'PURE CILANTRO', 'PURE DE PAPAS UN', 'PURE FLORENTINA', 
      'PURE FOCACCIA', 'PURE PIAMONTESA UN', 'PURE PICANTE'
    ] 
  },
  { 
    id: 'verduras', 
    nombre: 'Verduras y Guisos', 
    icon: 'eco', 
    color: 'text-emerald-400', 
    bg: 'bg-emerald-500/10', 
    items: [
      'ACELGAS A LA CREMA', 'ANTIPASTO DE VERDURAS', 'ARVEJITAS A LA CREMA', 'BROCCOLI AL GRATIN UN',
      'CHARQUICAN DE COCHAYUYO', 'CHOCLO A LA CREMA', 'CHUCRUT MORADO', 'GRATIN DE COLIFLOR',
      'PANACHE DE VERDURAS', 'QUINOA DE ARVEJAS', 'RATATOUILLE UN', 'TOMATE RELLENO',
      'VERDURAS A LA CREMA', 'VERDURAS ASADAS', 'VERDURAS ORIENTALES', 'PIMENTON RELLENO'
    ] 
  },
  { 
    id: 'tortillas', 
    nombre: 'Tortillas', 
    icon: 'egg_alt', 
    color: 'text-yellow-500', 
    bg: 'bg-yellow-500/10', 
    items: [
      'TORTILLA DE ACELGA', 'TORTILLA DE BROCOLI', 'TORTILLA DE PAPAS', 
      'TORTILLA DE POROTOS VERDES', 'TORTILLA DE VERDURAS', 'TORTILLA ZANAHORIAS'
    ] 
  },
  { 
    id: 'pastas_otros', 
    nombre: 'Pastas y Otros', 
    icon: 'dinner_dining', 
    color: 'text-rose-400', 
    bg: 'bg-rose-500/10', 
    items: [
      'LASAÑA DE VERDURAS', 'PASCUALINA DE ACELGA', 'PASTA INTEGRAL Y VEGETALES', 'PASTAS ORIENTALES',
      'PASTAS SECAS AL CHAMPIGNON', 'PASTAS SECAS AL CIBOULETTE', 'PASTAS SECAS AL CILANTRO',
      'PASTAS SECAS AL PESTO', 'PASTAS SECAS PRIMAVERA', 'POLENTA PEPERONATA', 'COUS COUS DE FRUTOS SECOS',
      'COUS COUS DE VEGETALES', 'COUS COUS DE ZANAHORIA', 'RISOTTO ATOMATADO RINCON UN', 'RISOTTO TRIGO DE MOTE CON VERDURAS'
    ] 
  }
];

const PRODUCTOS_PLATOS_FONDO = [
  { 
    id: 'vacuno', 
    nombre: 'Carnes Rojas (Vacuno)', 
    icon: 'restaurant', 
    color: 'text-red-400', 
    bg: 'bg-red-500/10', 
    items: [
      'CARNE MECHADA', 'CARNE A LA CACEROLA', 'CARNE A LA JARDINERA', 'CARNE ARVEJADA', 'CAZUELA DE VACUNO',
      'ESTOFADO DE VACUNO', 'GOULASH DE VACUNO', 'MILANESA DE VACUNO', 'MILANESA NAPOLITANA', 'OSOBUCO AL HORNO',
      'VACUNO A LA CERVEZA NEGRA', 'VACUNO AL OPORTO', 'VACUNO BOURGUIGNON', 'VACUNO EN CALLAMPAS SECAS',
      'VACUNO EN SALSA CHAMPIÑON QUESO', 'VACUNO EN SALSA DUXELLE', 'VACUNO EN SALSA PIMIENTA', 'VACUNO ESCABECHADO',
      'VACUNO MEDITERRANEO', 'VACUNO SALSA AL VINO TINTO', 'VACUNO SALSA CHAMPIÑON', 'VACUNO SALSA PEPERONATA',
      'VACUNO SYLVI', 'SALTIMBOCA DE VACUNO', 'STOGONOFF DE VACUNO', 'SALTADO PERUANO'
    ] 
  },
  { 
    id: 'cerdo', 
    nombre: 'Cerdo', 
    icon: 'skillet', 
    color: 'text-pink-400', 
    bg: 'bg-pink-500/10', 
    items: [
      'CERDO MONGOLIANO', 'CERDO MONGOLIANO PIÑA', 'CERDO PAPRIKA MIEL', 'CERDO SALSA CHARCUTERA',
      'COSTILLAR CERDO A LA CHILENA', 'COSTILLAR CERDO ASADO UN', 'COSTILLAR CERDO BBQ', 'COSTILLAR CERDO CHIMICHURRI',
      'ESTOFADO DE CERDO', 'LOMO DE CERDO EN SALSA DE CHAMPIÑON', 'LOMO DE CERDO EN SALSA DE PUERRO',
      'LOMO DE CERDO RELLENO CON CIRUELAS', 'LOMO VETADO UN', 'PULPA DE CERDO A LA CERVEZA RUBIA',
      'PULPA DE CERDO A LA ESPAÑOLA', 'PULPA DE CERDO AL CURRY', 'PULPA DE CERDO ASADA', 'PULPA DE CERDO CHAMPIGNON',
      'STROGONOFF DE CERDO', 'PLATEADA DE CERDO ARVERJADO'
    ] 
  },
  { 
    id: 'aves', 
    nombre: 'Pollo y Pavo', 
    icon: 'restaurant', 
    color: 'text-orange-400', 
    bg: 'bg-orange-500/10', 
    items: [
      'AJI DE GALLINA', 'CANELON DE POLLO GRIEGO', 'CAZUELA DE POLLO UN', 'CORDON BLUE DE POLLO', 'ESCALOPA DE POLLO',
      'PECHUGA DE POLLO EN SALSA ARVEJADA', 'PECHUGA DE POLLO MILAN', 'PECHUGA DE POLLO SALSA ESCABECHADA',
      'PECHUGA POLLO PARRILLERA', 'PECHUGA POLLO PIAMONTES', 'POLLO A LA ESPAÑOLA', 'POLLO CHILINDRON',
      'POLLO CURRY MANI', 'POLLO ESPINACA QUESO DE CABRA', 'POLLO ORIENTAL', 'TRUTRO POLLO AL ROMERO',
      'TRUTRO A LA CHILENA', 'TRUTRO AL AJILLO', 'TRUTRO ALA COREANO', 'TRUTRO ALA TAMARINDO', 'TRUTRO BBQ',
      'TRUTRO DE ALA SWEET CHILI', 'TRUTRO DE POLLO A LA MOSTAZA', 'TRUTRO DE POLLO AL CHIMICHURRI',
      'TRUTRO DE POLLO AL JUGO', 'TRUTRO DE POLLO AL LIMON', 'TRUTRO DE POLLO AL OREGANO', 'TRUTRO DE POLLO ITALIANO',
      'TRUTRO FINAS HIERBAS', 'TRUTRO POLLLO AL COGNAC', 'TRUTRO POLLO AL MERKEN', 'PAVO EN SALSA DE CHAMPIGNON',
      'PAVO EN SALSA DE CIRUELA Y CABERNET', 'PAVO EN SALSA DE MEMBRILLO', 'PAVO EN SALSA DE MOSTAZA', 'PAVO ASADO',
      'PAVO CON SALSA NOGADA', 'PAVO SALSA CILANTRO', 'PAVO SALSA VERDURAS'
    ] 
  },
  { 
    id: 'pescados', 
    nombre: 'Pescados y Mariscos', 
    icon: 'set_meal', 
    color: 'text-cyan-400', 
    bg: 'bg-cyan-500/10', 
    items: [
      'BLANQUILLO FRITO', 'CANCATO DE SALMON THAI', 'CANELONES DE MARISCO', 'CHUPE DE MARISCOS', 'LAZAÑA DE MERLUZA',
      'MERLUZA A LA CREMA', 'MERLUZA A LA ROMANA UN', 'MERLUZA ESPAÑOLA', 'MERLUZA NAPOLITANA', 'MERLUZA PUTANESCA',
      'PAELLA JUMBO UN', 'REINETA ASADA', 'REINETA EN CREMA DE LIMON', 'REINETA PARMESANA', 'REINETA SALSA ALCAPARRAS',
      'REINETA SALSA DE SOYA Y SESAMO', 'SALMON A LA PARRILLA', 'SALMON AL HORNO', 'SALMON EN CREMA DE LIMON',
      'SALMON PARMESANO', 'SALMON SALSA DE SOYA Y SESAMO', 'SALMON SALSA JENGIBRE'
    ] 
  },
  { 
    id: 'pastas_guisos', 
    nombre: 'Pastas y Guisos Típicos', 
    icon: 'soup_kitchen', 
    color: 'text-amber-400', 
    bg: 'bg-amber-500/10', 
    items: [
      'PASTA FRESCA SALSA ACEITUNAS', 'PASTA FRESCA SALSA ALFREDO', 'PASTA FRESCA SALSA BOLOGNESA',
      'PASTA FRESCA SALSA CARBONARA', 'PASTA FRESCA SALSA CHAMPIGNON', 'PASTA FRESCA SALSA NAPOLITANA',
      'PASTA FRESCA SALSA PEREJIL', 'PASTA FRESCA SALSA PIMENTON ASADO', 'PASTAS FRESCAS SALSA MARGARITA',
      'LAZAÑA BOLOGNESA', 'LAZAÑA DE PAPAS', 'AJIACO', 'CARBONADA UN', 'CHARQUICAN', 'CHAPSUI ESPECIAL',
      'CURANTO EN OLLA', 'GUATITAS ESPAÑOLAS', 'GUATITAS JARDINERAS', 'GUISO DE ZAPALLO ITALIANO',
      'HAMBURGUESA NAPOLITANA', 'PASTEL DE CHOCLO', 'PASTEL DE PAPA CARNE DE VACUNO', 'TORTILLA ESPAÑOLA',
      'ZAPALLO ITALIANO RELLENO', 'BRATWURTS PARRILLA UN'
    ] 
  }
];

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
function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function formatFechaShort(date) { return `${date.getDate()} ${MESES[date.getMonth()].slice(0, 3).toUpperCase()}`; }

export default function CalienteModule({ rol }) {
  const { t } = useTheme();
  const { user } = useAuth();
  const esAdmin = rol === 'admin' || rol === 'unico';
  
  const [activeTab, setActiveTab] = useState('materias');
  const [vista, setVista] = useState('diaria');
  const [fechaBase, setFechaBase] = useState(new Date());
  const [data, setData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  
  const [materiasState, setMateriasState] = useState(DEFAULT_CATEGORIAS);
  const [acomState, setAcomState] = useState(PRODUCTOS_ACOMPANAMIENTOS);
  const [fondoState, setFondoState] = useState(PRODUCTOS_PLATOS_FONDO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Modales
  const [modalAddOpen, setModalAddOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [targetCatId, setTargetCatId] = useState(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const docRef = doc(db, 'trazabilidad_config', 'caliente');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const { materias, acom, fondo } = docSnap.data();
          if (materias) setMateriasState(materias);
          if (acom) setAcomState(acom);
          if (fondo) setFondoState(fondo);
        }
      } catch (err) { console.error("Error al cargar config caliente:", err); }
    };

    const unsubData = onSnapshot(doc(db, 'trazabilidad_materias', 'caliente'), (snap) => {
      if (snap.exists()) setData(prev => ({ ...prev, ...snap.data() }));
      setLoading(false);
    });

    loadConfig();
    return () => unsubData();
  }, []);

  const saveConfig = async (newMaterias, newAcom, newFondo) => {
    try {
      await setDoc(doc(db, 'trazabilidad_config', 'caliente'), {
        materias: newMaterias || materiasState,
        acom: newAcom || acomState,
        fondo: newFondo || fondoState,
        updatedAt: new Date()
      });
    } catch (err) { toast.error("Error al sincronizar lista"); }
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    const state = activeTab === 'materias' ? materiasState : activeTab === 'prod_acom' ? acomState : fondoState;
    const setState = activeTab === 'materias' ? setMateriasState : activeTab === 'prod_acom' ? setAcomState : setFondoState;

    const newState = state.map(cat => {
      if (cat.id !== (targetCatId || state[0].id)) return cat;
      return { ...cat, items: [...cat.items, newItemName.trim()] };
    });

    setState(newState);
    saveConfig(
      activeTab === 'materias' ? newState : null,
      activeTab === 'prod_acom' ? newState : null,
      activeTab === 'prod_fondo' ? newState : null
    );
    setNewItemName('');
    setModalAddOpen(false);
    toast.success("Item añade ✅");
  };

  const handleGuardarDatos = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'trazabilidad_materias', 'caliente'), { ...data, updatedAt: new Date() });
      toast.success("Registros guardados ✅");
    } catch (err) { toast.error("Error al guardar"); }
    setSaving(false);
  };

  const currentKey = toKey(fechaBase);

  const confirmExport = async () => {
    setShowAuditModal(false);
    const printId = `CAL-${Date.now().toString(36).toUpperCase()}`;
    const sections = activeTab === 'materias' ? ['materias'] : ['prod_acom', 'prod_fondo'];
    const moduloNombre = activeTab === 'materias' ? 'Materias Primas Caliente' : 'Producción Completa Caliente';
    
    try {
      // 1. Registro Auditoría
      await addDoc(collection(db, 'log_impresiones'), {
        printId,
        usuario: user?.email,
        displayName: user?.displayName,
        modulo: moduloNombre,
        fechaReporte: currentKey,
        fechaImpresion: serverTimestamp()
      });

      // 2. Generación PDF
      const isDaily = vista === 'diaria' && activeTab !== 'materias';
      const doc = new jsPDF({ 
        orientation: isDaily ? 'portrait' : 'landscape', 
        unit: 'mm', 
        format: 'a4' 
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const verdeJumbo = [0, 85, 44];

      // Logo (Cargando desde URL con fallback)
      try {
        const img = new Image();
        img.src = "/jumbo_logo.png";
        img.crossOrigin = "Anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        doc.addImage(img, 'PNG', 15, 10, 18, 18);
      } catch (e) {
        doc.setFillColor(0, 85, 44);
        doc.circle(24, 19, 9, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text("J", 22, 20);
      }

      // Encabezado Estilo Postres (Una sola vez)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(verdeJumbo[0], verdeJumbo[1], verdeJumbo[2]);
      doc.text(activeTab === 'materias' ? "REGISTRO DE TRAZABILIDAD" : "REGISTRO DE PRODUCCION", 38, 18);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(activeTab === 'materias' ? "Trazabilidad de Materias Primas" : "Planilla de Producción Diaria", 38, 23);
      
      doc.setFontSize(8);
      doc.text("SECCIÓN: RINCON", 38, 27);
      doc.text("CUARTO: CALIENTE", 38, 31);

      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text("FECHA:", pageWidth - 70, 18);
      doc.setFont("helvetica", "bold");
      doc.text(getTitulo(), pageWidth - 55, 18);
      
      doc.setFont("helvetica", "normal");
      doc.text("LOCAL:", pageWidth - 70, 23);
      doc.setFont("helvetica", "bold");
      doc.text("J781 - RINCON JUMBO", pageWidth - 55, 23);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(15, 36, pageWidth - 15, 36);

      let currentY = 43;

      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        
        // Verificar si el título cabe, sino salto de página
        if (currentY > pageHeight - 40) {
          doc.addPage();
          currentY = 20;
        }

        // Título de Sección
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        const seccionTitulo = s === 'materias' ? 'MATERIAS PRIMAS' : s === 'prod_acom' ? 'ACOMPAÑAMIENTOS' : 'PLATOS DE FONDO';
        doc.text(seccionTitulo, pageWidth / 2, currentY, { align: 'center' });

        // Tabla
        const state = s === 'materias' ? materiasState : s === 'prod_acom' ? acomState : fondoState;
        let head, body, columnStyles;

        if (s === 'materias') {
          head = [['Categoría', 'Producto', 'F. Elaboración/Vcto']];
          body = [];
          state.forEach(cat => {
            cat.items.forEach(item => {
              const val = data[item]?.[currentKey];
              if (val) body.push([cat.nombre, item, val]);
            });
          });
          columnStyles = { 0: { cellWidth: 40 }, 1: { cellWidth: 80, halign: 'left' } };
        } else {
          if (vista === 'diaria') {
            head = [["Producto", "Cantidad", "Producto", "Cantidad"]];
            const allRows = [];
            state.forEach(cat => {
              cat.items.forEach(item => {
                const qty = data[item]?.[currentKey];
                if (qty && qty !== "-") allRows.push([item, qty]);
              });
            });
            const half = Math.ceil(allRows.length / 2);
            body = [];
            for (let j = 0; j < half; j++) {
              const leftRow = allRows[j] || ["", ""];
              const rightRow = allRows[j + half] || ["", ""];
              body.push([...leftRow, ...rightRow]);
            }
            columnStyles = { 0: { cellWidth: 65, halign: 'left' }, 1: { cellWidth: 25 }, 2: { cellWidth: 65, halign: 'left' }, 3: { cellWidth: 25 } };
          } else {
            const lunes = getLunes(fechaBase);
            const diasSemana = Array.from({ length: 7 }, (_, j) => toKey(addDays(lunes, j)));
            head = [['Producto', 'Lunes', 'Martes', 'Miér.', 'Juev.', 'Vier.', 'Sáb.', 'Dom.']];
            body = [];
            state.forEach(cat => {
              cat.items.forEach(item => {
                const row = [item];
                let hasData = false;
                diasSemana.forEach(dk => {
                  const val = data[item]?.[dk];
                  if (val && val !== "-") hasData = true;
                  row.push(val || "-");
                });
                if (hasData) body.push(row);
              });
            });
            columnStyles = { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 50 } };
          }
        }

        if (body.length === 0) {
          body.push([{ content: `No hay registros de ${seccionTitulo.toLowerCase()} para este periodo`, colSpan: 10, styles: { halign: 'center', fontStyle: 'italic' } }]);
        }

        autoTable(doc, {
          startY: currentY + 5,
          head,
          body,
          theme: 'grid',
          styles: { fontSize: 7, halign: 'center', valign: 'middle', cellPadding: 2 },
          headStyles: { fillColor: verdeJumbo, textColor: 255, fontStyle: 'bold', fontSize: 9 },
          columnStyles,
          alternateRowStyles: { fillColor: [248, 250, 248] },
          margin: { left: 15, right: 15 }
        });

        currentY = doc.lastAutoTable.finalY + 15;
      }

      // Firmas una sola vez al final
      let finalY = currentY + 5;
      if (finalY > pageHeight - 65) {
        doc.addPage();
        finalY = 30;
      }

      doc.setFontSize(8);
      doc.setTextColor(0, 85, 44);
      doc.setDrawColor(0, 85, 44);
      doc.line(15, finalY - 10, 15, finalY - 4);
      doc.text("ASEGURADOR DE CALIDAD", 18, finalY - 6);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(15, finalY, 80, 40, 3, 3, 'S');
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text("FIRMA O TIMBRE", 20, finalY + 18);
      doc.line(20, finalY + 15, 75, finalY + 15);
      doc.text("NOMBRE VERIFICADOR", 20, finalY + 33);
      doc.line(20, finalY + 30, 55, finalY + 30);
      doc.text("FECHA", 60, finalY + 33);
      doc.line(60, finalY + 30, 75, finalY + 30);

      const col2 = pageWidth / 2 + 5;
      doc.setDrawColor(0, 85, 44);
      doc.line(col2, finalY - 10, col2, finalY - 4);
      doc.setTextColor(0, 85, 44);
      doc.text("PERSONA RESPONSABLE", col2 + 3, finalY - 6);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(col2, finalY, 85, 20, 3, 3, 'S');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(user?.displayName || "Yamir Alexis Sandoval", col2 + 5, finalY + 10);
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "normal");
      doc.text("NOMBRE AUTOMATIZADO POR APLICACIÓN", col2 + 5, finalY + 15);

      // Footers en todas las páginas
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(6);
        doc.setTextColor(180, 180, 180);
        doc.text(`© 2026 RINCON JUMBO INFORMACIONES / IMPRESION DE ALTO CONTRASTE`, 15, pageHeight - 10);
        doc.text(`ID ÚNICO: ${printId}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`${i} - ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      doc.save(`PRODUCCION_CALIENTE_${currentKey}.pdf`);
      toast.success("Producción unificada generada 📄");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar PDF");
    }
  };

  const handleInputChange = (itemId, key, value) => {
    let finalValue = value;
    if (activeTab === 'materias') {
      const clean = value.replace(/\D/g, '');
      if (clean.length > 4) return;
      let dayPart = clean.slice(0, 2);
      let monthPart = clean.slice(2);
      if (dayPart.length === 1 && parseInt(dayPart) > 3) dayPart = '0' + dayPart;
      if (dayPart.length === 2 && (parseInt(dayPart) === 0 || parseInt(dayPart) > 31)) return;
      if (monthPart.length === 1 && parseInt(monthPart) > 1) monthPart = '0' + monthPart;
      if (monthPart.length === 2 && (parseInt(monthPart) === 0 || parseInt(monthPart) > 12)) return;
      const combined = dayPart + monthPart;
      finalValue = combined.length > 2 ? `${combined.slice(0, 2)}/${combined.slice(2)}` : combined;
    }
    setData(prev => ({ ...prev, [itemId]: { ...(prev[itemId] || {}), [key]: finalValue } }));
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

  const filterItems = (items) => {
    if (!searchTerm) return items;
    const norm = normalizeText(searchTerm);
    return items.filter(i => normalizeText(i).includes(norm));
  };

  if (loading) return <div className="py-20 text-center animate-pulse text-red-500 font-black uppercase tracking-widest">Cargando trazabilidad caliente...</div>;

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className={`flex p-1.5 rounded-2xl ${t.bgCard} border ${t.border} w-fit shadow-xl overflow-x-auto`}>
          {[
            { id: 'materias', label: 'Materias Primas', icon: 'inventory_2' },
            { id: 'prod_acom', label: 'Prod. Acompañamientos', icon: 'restaurant_menu' },
            { id: 'prod_fondo', label: 'Prod. Platos Fondo', icon: 'flatware' },
            { id: 'pcc', label: 'PCC Cocción', icon: 'thermostat' },
            { id: 'sanitizacion', label: 'PCC Sanitización', icon: 'clean_hands' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-red-600 text-white shadow-lg shadow-red-500/30 scale-105' : 'text-white/60 hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'pcc' ? (
        <CoccionEnfriadoModule rol={rol} cuarto="Caliente" />
      ) : activeTab === 'sanitizacion' ? (
        <SanitizacionModule rol={rol} cuarto="Caliente" />
      ) : (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${activeTab === 'materias' ? 'bg-cyan-500/20 text-cyan-500' : activeTab === 'prod_acom' ? 'bg-orange-500/20 text-orange-500' : 'bg-red-500/20 text-red-500'} flex items-center justify-center shadow-lg border border-white/5`}>
                <span className="material-symbols-outlined" style={{ fontSize: 32 }}>{activeTab === 'materias' ? 'inventory_2' : activeTab === 'prod_acom' ? 'restaurant_menu' : 'flatware'}</span>
              </div>
              <div>
                <h1 className="text-white text-2xl font-black tracking-tight leading-none mb-1 uppercase">
                  {activeTab === 'materias' ? 'Materias Primas' : activeTab === 'prod_acom' ? 'Acompañamientos' : 'Platos de Fondo'}
                </h1>
                <h2 className="text-white/60 text-[10px] uppercase font-black tracking-[0.2em] opacity-60">Cuarto Caliente</h2>
              </div>
            </div>
          </div>

          <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl ${t.bgCard} border ${t.border} shadow-sm`}>
            <div className={`flex p-1 rounded-xl ${t.bgInput} border ${t.border} w-fit shadow-inner`}>
              {['diaria', 'semanal', 'mensual'].map(v => (
                <button key={v} onClick={() => setVista(v)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${vista === v ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' : 'text-white/60 hover:text-white'}`}>{v}</button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <h2 className="text-white text-base font-bold tracking-tight">{getTitulo()}</h2>
              <div className="flex items-center gap-1">
                <button onClick={() => setFechaBase(addDays(fechaBase, -1))} className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} text-white/60 hover:text-red-500 transition-all shadow-sm active:scale-90`}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span></button>
                
                <div className="relative">
                  <button onClick={() => document.getElementById('date-picker-caliente').showPicker()} className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} text-white/60 hover:text-red-500 transition-all shadow-sm active:scale-90`}><span className="material-symbols-outlined" style={{ fontSize: 20 }}>calendar_month</span></button>
                  <input id="date-picker-caliente" type="date" className="absolute inset-0 opacity-0 pointer-events-none" value={fechaBase.toISOString().split('T')[0]} onChange={(e) => e.target.value && setFechaBase(new Date(e.target.value + 'T12:00:00'))} />
                </div>

                <button onClick={() => setFechaBase(addDays(fechaBase, 1))} className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} text-white/60 hover:text-red-500 transition-all shadow-sm active:scale-90`}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span></button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40" style={{ fontSize: 18 }}>search</span>
              <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full ${t.bgCard} text-white text-sm pl-10 pr-4 py-2.5 rounded-xl border ${t.border} focus:outline-none focus:border-red-500/50 transition-all shadow-sm placeholder:text-white/20`} />
            </div>
            {esAdmin && (
              <button onClick={() => { 
                const state = activeTab === 'materias' ? materiasState : activeTab === 'prod_acom' ? acomState : fondoState;
                setTargetCatId(state[0]?.id); 
                setModalAddOpen(true); 
              }} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span> NUEVO ITEM
              </button>
            )}
          </div>

          {vista === 'diaria' && (
            <div className="flex flex-col gap-10">
              {(activeTab === 'materias' ? materiasState : activeTab === 'prod_acom' ? acomState : fondoState).map(cat => {
                const filtered = filterItems(cat.items);
                if (filtered.length === 0) return null;
                return (
                  <div key={cat.id} className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 ml-1">
                      <div className={`w-10 h-10 rounded-xl ${cat.bg} ${cat.color} flex items-center justify-center shadow-lg border border-white/5`}>
                        <span className="material-symbols-outlined text-xl">{cat.icon}</span>
                      </div>
                      <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] opacity-80">{cat.nombre}</h3>
                      <div className="h-px flex-1 bg-white/5 ml-2"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filtered.map(item => (
                        <div key={item} className={`${t.bgCard} border ${t.border} rounded-2xl p-4 flex flex-col gap-3 group hover:border-red-500/30 transition-all shadow-sm hover:shadow-red-500/10`}>
                          <div className="flex items-center justify-between">
                            <span className="text-white font-bold text-sm tracking-tight">{item}</span>
                            <button onClick={() => {
                              const prev = addDays(fechaBase, -1);
                              handleInputChange(item, currentKey, data[item]?.[toKey(prev)] || '');
                            }} className={`p-1.5 rounded-lg ${t.bgInput} text-white/40 hover:text-red-400 border ${t.border} transition-all`} title="Copiar anterior"><span className="material-symbols-outlined text-xs">content_copy</span></button>
                          </div>
                          <input 
                            type="text" 
                            value={data[item]?.[currentKey] || ""} 
                            onChange={(e) => handleInputChange(item, currentKey, e.target.value)}
                            placeholder={activeTab === 'materias' ? "DD/MM" : "Cant."}
                            className={`w-full ${t.bgInput} text-white text-center py-2.5 rounded-xl border ${t.border} focus:border-red-500/50 font-mono font-black text-sm shadow-inner`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {modalAddOpen && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className={`${t.bgCard} border ${t.border} rounded-3xl p-8 max-md w-full shadow-2xl animate-in zoom-in duration-300`}>
                <h3 className="text-white text-xl font-black mb-6 uppercase tracking-tight">Agregar Nuevo Item</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block tracking-widest">Nombre del Producto</label>
                    <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className={`w-full ${t.bgInput} text-white p-4 rounded-2xl border ${t.border} focus:border-red-500 font-bold`} placeholder="Ej: Salsa de Tomate" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block tracking-widest">Categoría</label>
                    <select value={targetCatId} onChange={(e) => setTargetCatId(e.target.value)} className={`w-full ${t.bgInput} text-white p-4 rounded-2xl border ${t.border} focus:border-red-500 font-bold`}>
                      {(activeTab === 'materias' ? materiasState : activeTab === 'prod_acom' ? acomState : fondoState).map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button onClick={() => setModalAddOpen(false)} className={`flex-1 py-4 rounded-2xl ${t.bgInput} text-white font-bold hover:bg-white/5`}>Cancelar</button>
                  <button onClick={handleAddItem} className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-black shadow-xl shadow-red-500/30">Agregar</button>
                </div>
              </div>
            </div>
          )}

          <div className="fixed bottom-10 right-10 flex flex-col gap-3 z-[100]">
            <button onClick={() => setShowAuditModal(true)} className={`w-14 h-14 md:w-auto md:h-auto md:px-7 md:py-4 rounded-full md:rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 text-red-500 font-bold text-[15px] tracking-tight shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 group`} title="Exportar PDF"><span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontSize: 24 }}>picture_as_pdf</span><span className="hidden md:inline">PDF</span></button>
            <button onClick={handleGuardarDatos} disabled={saving} className="w-14 h-14 md:w-auto md:h-auto md:px-7 md:py-4 rounded-full md:rounded-2xl bg-red-600 text-white font-black shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 group" title="Guardar Registros">
              {saving ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontSize: 24 }}>cloud_upload</span>}
              <span className="hidden md:inline">{saving ? "Guardando..." : "Guardar"}</span>
            </button>
          </div>

          {/* Modal de Auditoría para PDF */}
          {showAuditModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
              <div className={`${t.bgCard} border ${t.border} p-8 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in duration-300`}>
                <div className="w-20 h-20 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-6 shadow-lg border border-red-500/20">
                  <span className="material-symbols-outlined" style={{ fontSize: 40 }}>security</span>
                </div>
                <h3 className="text-white text-2xl font-black text-center mb-2 uppercase tracking-tight">Confirmar Exportación</h3>
                <p className="text-white/60 text-center text-sm mb-8 leading-relaxed">Se generará un reporte oficial. Esta acción quedará registrada en el historial de auditoría con su usuario y marca de tiempo.</p>
                <div className="flex gap-4">
                  <button onClick={() => setShowAuditModal(false)} className={`flex-1 py-4 rounded-2xl ${t.bgInput} text-white font-bold hover:bg-white/5 transition-colors`}>Cancelar</button>
                  <button onClick={confirmExport} className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-black shadow-xl shadow-red-500/30 hover:brightness-110 transition-all uppercase text-xs tracking-widest">Generar PDF</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
