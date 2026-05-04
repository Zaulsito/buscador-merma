import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { normalizeText } from '../../utils/searchUtils';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import CoccionEnfriadoModule from './CoccionEnfriadoModule';
import SanitizacionModule from './SanitizacionModule';

const CATEGORIAS_MATERIAS = [
  {
    id: "frutas",
    nombre: "Frutas y Decoración",
    icon: "nutrition",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    items: [
      "Arándanos", "Arándanos Congelados", "Ciruela sin Carozo", "Durazno Conserva", 
      "Frambuesa", "Frambuesa Congelada", "Frutilla", "Frutos Rojos Congelados", 
      "Huesillo", "Kiwi", "Limón", "Manzana Verde", "Marrasquino", 
      "Melón Calameño", "Melón Tuna", "Mermelada Cuatro Frutas", "Mermelada Ligth Frutilla", 
      "Mora", "Naranja", "Papayas", "Pera", "Piña Fresca", "Piña Conserva", "Sandía"
    ]
  },
  {
    id: "lacteos",
    nombre: "Lácteos, Cremas y Huevos",
    icon: "egg_alt",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    items: [
      "Crema", "Crema Pasionatta", "Crema Manjar sin Azúcar", "Crema Pastelera sin Azúcar", 
      "Helado Crema Americana", "Helado NotCo Ice Cream", "Huevo", "Leche Condensada", 
      "Leche Entera", "Leche Evaporada", "Yogurth Natural"
    ]
  },
  {
    id: "masas",
    nombre: "Masas, Galletas y Repostería",
    icon: "bakery_dining",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    items: [
      "Apple Crumble", "Arroz", "Arroz Integral", "Bizcocho Chocolate", 
      "Bizcocho Vainilla", "Bizcocho Vainilla sin Azúcar", "Blondie Vegano", "Brownie", 
      "Churros Congelados", "Galleta Chocolate", "Galleta Champagne", "Galleta sin Azúcar", 
      "Galleta Tritón u Oreo", "Granola Keto", "Merengue en Polvo", "Merengue Frutilla Ligth", 
      "Pan Blanco", "Sémola", "Tiramisú Mezcla", "Trigo Mote"
    ]
  },
  {
    id: "dulces",
    nombre: "Chocolates, Azúcares y Esencias",
    icon: "icecream",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    items: [
      "Agave", "Azúcar Granulada", "Azúcar Flor", "Azúcar Rubia", "Belcolade Amargo", 
      "Belcolade Amargo sin Azúcar", "Belcolade Blanco sin Azúcar", "Cacao Amargo", 
      "Chocolate", "Chocolate Blanco sin Azúcar", "Chocolate sin Azúcar", "Chocolate Remo", 
      "Endulzante", "Esencia de Canela", "Esencia de Ron", "Esencia de Vainilla", 
      "Jarabe de Caramelo", "Syrup Caramelo", "Vainilla Líquida"
    ]
  },
  {
    id: "otros",
    nombre: "Frutos Secos y Despensa",
    icon: "grain",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    items: [
      "Almendra Entera", "Almendra Fileteada", "Avena Instantánea", "Avena Tradicional", 
      "Bebida de Coco", "Bebida Vegetal de Avena", "Café", "Canela en Polvo", 
      "Canela Entera", "Chancaca", "Chia", "Coco Rallado", "Nueces", "Pasas Morenas", 
      "Pasas Rubias", "Semillas Zapallo", "Aceite", "Gelatina sin Sabor", "Maicena", 
      "Mantequilla", "Mantequilla sin Sal", "Oporto", "Sal", "Vino Tinto"
    ]
  }
];

const PRODUCTOS_PRODUCCION = [
  {
    id: "postres_elaborados",
    nombre: "Postres Elaborados",
    icon: "icecream",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    items: [
      "AMERICANO", "ARROZ CON LECHE UN", "ARROZ INTEGRAL CON LECHE STEVIA", "BUDIN DIPLOMATICO UN",
      "BUMCHOCOLAT", "CLAFOUTTI UN", "COMPOTA DE FRUTA UN", "COOKIE CREAM", "CREME BRULLE",
      "DAMASCAKE SIN AZUCAR", "LECHE ASADA UN", "LECHE NEVADA UN", "MIX DE FRUTAS",
      "MOTE CON HUESILLO UN", "MOUSSE DE CAFÉ", "MOUSSE DE FRAMBUESA SIN AZUCAR", "MOUSSE DE FRUTILLA",
      "PANACOTA PAPAYA", "PANQUEQUE CELESTINO UN", "PASION CHOCOLATE SIN AZUCAR", "PASTEL DE MANZANA",
      "POSTRE TRES LECHES UN", "SEMOLA CON LECHE UN", "SEMOLA DEL BOSQUE STEVIA", "SUSPIRO LIMEÑO UN",
      "SUSPIRO MARACUYA", "TARTA ROJA", "TENTACION MARACUYA SIN AZUCAR", "TIRAMISU UN"
    ]
  }
];

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// ── Helpers de fecha ──
function fechaLocal(year, month, day) {
  return new Date(year, month, day, 12, 0, 0, 0);
}
function getLunes(date) {
  const y = date.getFullYear(), mo = date.getMonth(), d = date.getDate();
  const base = fechaLocal(y, mo, d);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return fechaLocal(y, mo, d + diff);
}
function addDays(date, n) {
  return fechaLocal(date.getFullYear(), date.getMonth(), date.getDate() + n);
}
function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function formatFechaShort(date) {
  return `${date.getDate()} ${MESES[date.getMonth()].slice(0, 3).toUpperCase()}`;
}

export default function PostresModule({ rol }) {
  const { t } = useTheme();
  const { user } = useAuth();
  const esAdmin = rol === 'admin' || rol === 'unico';
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('postres_active_tab') || 'materias');
  const [vista, setVista] = useState(() => localStorage.getItem('postres_vista') || 'diaria');
  const [fechaBase, setFechaBase] = useState(new Date());
  const [data, setData] = useState(() => {
    const draft = localStorage.getItem('postres_data_draft');
    return draft ? JSON.parse(draft) : {};
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para las listas de productos (permiten edición)
  const [materiasState, setMateriasState] = useState(CATEGORIAS_MATERIAS);
  const [produccionState, setProduccionState] = useState(PRODUCTOS_PRODUCCION);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // ── PERSISTENCIA: Cargar Configuración y Datos ──
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const docRef = doc(db, 'trazabilidad_config', 'postres');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const { materias, produccion } = docSnap.data();
          if (materias) setMateriasState(materias);
          if (produccion) setProduccionState(produccion);
        }
      } catch (err) {
        console.error("Error al cargar config postres:", err);
      }
    };

    const unsubData = onSnapshot(doc(db, 'trazabilidad_materias', 'postres'), (snap) => {
      if (snap.exists()) {
        const serverData = snap.data();
        setData(prev => ({ ...prev, ...serverData }));
      }
      setLoading(false);
    });

    loadConfig();
    return () => unsubData();
  }, []);

  useEffect(() => {
    localStorage.setItem('postres_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('postres_vista', vista);
  }, [vista]);

  useEffect(() => {
    localStorage.setItem('postres_data_draft', JSON.stringify(data));
  }, [data]);

  const saveConfig = async (newMaterias, newProduccion) => {
    try {
      await setDoc(doc(db, 'trazabilidad_config', 'postres'), {
        materias: newMaterias || materiasState,
        produccion: newProduccion || produccionState,
        updatedAt: new Date()
      });
    } catch (err) {
      console.error("Error al guardar config postres:", err);
      toast.error("No se pudo sincronizar la lista de productos");
    }
  };

  const handleGuardarDatos = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'trazabilidad_materias', 'postres'), {
        ...data,
        updatedAt: new Date()
      });
      toast.success("Registros guardados ✅");
    } catch (err) {
      console.error("Error al guardar datos postres:", err);
      toast.error("Error al guardar los registros");
    }
    setSaving(false);
  };

  const [modalAddOpen, setModalAddOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [targetCatId, setTargetCatId] = useState(null);

  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState({ catId: null, originalCatId: null, oldName: '', newName: '' });

  const navegar = (dir) => {
    const d = new Date(fechaBase);
    if (vista === 'semanal') d.setDate(d.getDate() + dir * 7);
    else if (vista === 'diaria') d.setDate(d.getDate() + dir);
    else d.setMonth(d.getMonth() + dir);
    setFechaBase(d);
  };

  const currentKey = toKey(fechaBase);

  const handleInputChange = (itemId, key, value) => {
    let finalValue = value;
    if (activeTab === 'materias') {
      const clean = value.replace(/\D/g, '');
      if (clean.length > 4) return;
      let dayPart = clean.slice(0, 2);
      let monthPart = clean.slice(2);
      if (dayPart.length === 1 && parseInt(dayPart) > 3) dayPart = '0' + dayPart;
      if (dayPart.length === 2) {
        const d = parseInt(dayPart);
        if (d === 0 || d > 31) return;
      }
      if (monthPart.length === 1 && parseInt(monthPart) > 1) monthPart = '0' + monthPart;
      if (monthPart.length === 2) {
        const m = parseInt(monthPart);
        if (m === 0 || m > 12) return;
      }
      const combined = dayPart + monthPart;
      if (combined.length > 2) finalValue = `${combined.slice(0, 2)}/${combined.slice(2)}`;
      else finalValue = combined;
      if (value.length < (data[itemId]?.[key]?.length || 0) && value.endsWith('/')) {
        finalValue = dayPart.slice(0, -1);
      }
    }

    setData(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), [key]: finalValue }
    }));
  };

  const filterItems = (items) => {
    if (!searchTerm) return items;
    const normalizedSearch = normalizeText(searchTerm);
    return items.filter(item => normalizeText(item).includes(normalizedSearch));
  };

  const moveItem = (catId, index, dir) => {
    if (!esAdmin) return;
    const isMaterias = activeTab === 'materias';
    const state = isMaterias ? materiasState : produccionState;
    const setState = isMaterias ? setMateriasState : setProduccionState;

    const newState = state.map(cat => {
      if (cat.id !== catId) return cat;
      const newItems = [...cat.items];
      const targetIndex = index + dir;
      if (targetIndex < 0 || targetIndex >= newItems.length) return cat;
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      return { ...cat, items: newItems };
    });
    setState(newState);
    saveConfig(isMaterias ? newState : null, isMaterias ? null : newState);
  };

  const handleAddItem = () => {
    if (!newItemName.trim() || !targetCatId) return;
    const isMaterias = activeTab === 'materias';
    const state = isMaterias ? materiasState : produccionState;
    const setState = isMaterias ? setMateriasState : setProduccionState;

    const newState = state.map(cat => {
      if (cat.id !== targetCatId) return cat;
      if (cat.items.includes(newItemName.trim())) return cat;
      return { ...cat, items: [...cat.items, newItemName.trim()] };
    });
    setState(newState);
    saveConfig(isMaterias ? newState : null, isMaterias ? null : newState);
    setNewItemName('');
    setModalAddOpen(false);
  };

  const handleDeleteItem = (catId, itemName) => {
    if (!window.confirm(`¿Seguro que deseas eliminar "${itemName}"?`)) return;
    const isMaterias = activeTab === 'materias';
    const state = isMaterias ? materiasState : produccionState;
    const setState = isMaterias ? setMateriasState : setProduccionState;
    
    const newState = state.map(cat => {
      if (cat.id !== catId) return cat;
      return { ...cat, items: cat.items.filter(i => i !== itemName) };
    });
    setState(newState);
    saveConfig(isMaterias ? newState : null, isMaterias ? null : newState);
  };

  const handleEditItem = () => {
    if (!editingItem.newName.trim()) {
      setModalEditOpen(false);
      return;
    }
    const isMaterias = activeTab === 'materias';
    const state = isMaterias ? materiasState : produccionState;
    const setState = isMaterias ? setMateriasState : setProduccionState;

    let newState;
    if (editingItem.catId === editingItem.originalCatId) {
      newState = state.map(cat => {
        if (cat.id !== editingItem.catId) return cat;
        return { ...cat, items: cat.items.map(i => i === editingItem.oldName ? editingItem.newName.trim() : i) };
      });
    } else {
      newState = state.map(cat => {
        if (cat.id === editingItem.originalCatId) return { ...cat, items: cat.items.filter(i => i !== editingItem.oldName) };
        if (cat.id === editingItem.catId) {
          if (cat.items.includes(editingItem.newName.trim())) return cat;
          return { ...cat, items: [...cat.items, editingItem.newName.trim()] };
        }
        return cat;
      });
    }
    
    if (editingItem.newName.trim() !== editingItem.oldName && data[editingItem.oldName]) {
      setData(prev => {
        const newData = { ...prev };
        newData[editingItem.newName.trim()] = newData[editingItem.oldName];
        delete newData[editingItem.oldName];
        return newData;
      });
    }

    setState(newState);
    saveConfig(isMaterias ? newState : null, isMaterias ? null : newState);
    setModalEditOpen(false);
  };

  const handleExportPDF = () => {
    const lastPrint = localStorage.getItem('last_print_postres');
    if (lastPrint) {
      const diff = Date.now() - parseInt(lastPrint);
      if (diff < 20000) {
        toast.error(`Seguridad: Espera ${Math.ceil((20000 - diff) / 1000)}s antes de otra impresión.`);
        return;
      }
    }
    setShowAuditModal(true);
  };

  const confirmExport = async () => {
    setShowAuditModal(false);
    const isMaterias = activeTab === 'materias';
    const state = activeTab === 'materias' ? materiasState : produccionState;
    const seccionNombre = activeTab === 'materias' ? 'Materias Primas' : 'Producción';
    const currentKey = toKey(fechaBase);
    const printId = `ID-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Captura de datos para el snapshot de auditoría
    let head = [];
    let body = [];
    if (vista === 'semanal') {
      head = [["Producto", ...diasSemana.map(d => formatFechaShort(d))]];
      state.forEach(cat => {
        cat.items.forEach(item => {
          const row = [item];
          diasSemana.forEach(dia => row.push(data[item]?.[toKey(dia)] || ""));
          body.push(row);
        });
      });
    } else {
      head = [["Categoría", "Producto", "Ingreso"]];
      state.forEach(cat => {
        cat.items.forEach(item => {
          body.push([cat.nombre, item, data[item]?.[currentKey] || ""]);
        });
      });
    }

    try {
      localStorage.setItem('last_print_postres', Date.now().toString());
      
      // ── REGISTRO OBLIGATORIO DE AUDITORÍA ──
      await toast.promise(
        addDoc(collection(db, 'log_impresiones'), {
          printId,
          usuario: user?.email || 'Desconocido',
          nombre: user?.displayName || 'Usuario Anónimo',
          modulo: 'Postres',
          seccion: seccionNombre,
          fechaImpresion: serverTimestamp(),
          reporteFecha: currentKey,
          headerSnapshot: JSON.stringify(head),
          dataSnapshot: JSON.stringify(body)
        }),
        {
          loading: 'Registrando auditoría de seguridad...',
          success: 'Auditoría registrada (ID: ' + printId + ')',
          error: (err) => 'Error de auditoría: ' + err.message
        }
      );

      const doc = new jsPDF({
        orientation: vista === 'semanal' ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const verdeCorporativo = [0, 85, 44]; // #00552c
      
      // 1. Logo y Encabezado
      const logoUrl = "https://lh3.googleusercontent.com/aida/ADBb0uir5XMMhq-pUU60m0zK39TGOy5T0JEuUO1VZ8IA1CXCqZVSr4F97l2TN61EFQapjfuKAkxb1H4YY2pNuWs1HFtUn8NQfaM7jXPcuLu6BtNd7xmDp6wSbvDh9okieUGu-yuCbCwa3YaJCbK97SZUduKZJ35hZu35PhhHpGJMB58ipKx1sQCTkxNiKLnPyXZ3ZXkaN2l7HmWqAWhQwFF41qNOG_HJeg01QG_Hahr6Amg7zJLp9t-9KXFau3q5B-8pwAFS9o-r9eKBqA";
      
      try {
        doc.addImage(logoUrl, 'PNG', 15, 10, 18, 18);
      } catch (e) {
        doc.setDrawColor(0, 85, 44);
        doc.setLineWidth(0.5);
        doc.circle(24, 19, 9, 'S');
        doc.setFontSize(6);
        doc.text("JUMBO", 24, 20, { align: 'center' });
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(0, 85, 44);
      doc.text("REGISTRO DE TRAZABILIDAD", 38, 18);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(`Trazabilidad de ${seccionNombre}`, 38, 23);
      doc.setFontSize(7);
      doc.text("CUARTO DE PRODUCCIÓN", 38, 27);
      doc.setFont("helvetica", "bold");
      doc.text("POSTRES", 38, 31);

      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.setFont("helvetica", "normal");
      doc.text("FECHA:", pageWidth - 70, 18);
      doc.setFont("helvetica", "bold");
      doc.text(getTitulo(), pageWidth - 55, 18);
      
      doc.setFont("helvetica", "normal");
      doc.text("LOCAL:", pageWidth - 70, 23);
      doc.setFont("helvetica", "bold");
      doc.text("J781 - RINCON JUMBO", pageWidth - 55, 23);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(15, 36, pageWidth - 15, 36);

      // 2. Tabla de Datos
      head = [];
      body = [];

      if (vista === 'semanal') {
        head = [["Producto", ...diasSemana.map(d => formatFechaShort(d))]];
        state.forEach(cat => {
          const rowsForCat = [];
          cat.items.forEach(item => {
            const row = [item];
            let hasData = false;
            diasSemana.forEach(d => {
              const val = data[item]?.[toKey(d)];
              if (val && val !== "—") hasData = true;
              row.push(val || "—");
            });
            if (hasData) rowsForCat.push(row);
          });

          if (rowsForCat.length > 0) {
            body.push([{ 
              content: cat.nombre.toUpperCase(), 
              colSpan: 8, 
              styles: { fillColor: [230, 240, 230], fontStyle: 'bold', halign: 'center', textColor: [0, 85, 44] } 
            }]);
            body.push(...rowsForCat);
          }
        });
      } else {
        head = [["Categoría", "Producto", "Ingreso"]];
        state.forEach(cat => {
          const rowsForCat = [];
          cat.items.forEach(item => {
            const val = data[item]?.[currentKey];
            if (val && val !== "—") {
              rowsForCat.push([item, val]);
            }
          });
          
          if (rowsForCat.length > 0) {
            const firstRow = [
              { content: cat.nombre, rowSpan: rowsForCat.length, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', textColor: [0, 85, 44] } },
              ...rowsForCat[0]
            ];
            body.push(firstRow);
            for (let i = 1; i < rowsForCat.length; i++) {
              body.push(rowsForCat[i]);
            }
          }
        });
      }

      if (body.length === 0) {
        body.push([{ content: "No se encontraron registros en el periodo seleccionado", colSpan: vista === 'semanal' ? 8 : 3, styles: { halign: 'center', fontStyle: 'italic', cellPadding: 10 } }]);
      }

      autoTable(doc, {
        startY: 42,
        head: head,
        body: body,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, halign: 'center' },
        headStyles: { fillColor: verdeCorporativo, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 10 },
        columnStyles: { 
          0: { cellWidth: vista === 'semanal' ? 'auto' : 40 },
          1: { halign: 'left' }
        },
        alternateRowStyles: { fillColor: [248, 250, 248] },
        margin: { left: 15, right: 15 }
      });

      // 3. Firmas y Footer
      let finalY = doc.lastAutoTable.finalY + 20;
      const pageHeight = doc.internal.pageSize.getHeight();
      
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
      const nombreResp = user?.displayName || "Yamir Alexis Sandoval";
      doc.text(nombreResp, col2 + 5, finalY + 10);
      
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "normal");
      doc.text("NOMBRE AUTOMATIZADO POR APLICACIÓN", col2 + 5, finalY + 15);

      doc.setFontSize(6);
      doc.setTextColor(180, 180, 180);
      doc.text(`© 2026 RINCON JUMBO INFORMACIONES / IMPRESION DE ALTO CONTRASTE`, 15, pageHeight - 10);
      doc.text(`ID ÚNICO: ${printId}`, pageWidth - 15, pageHeight - 10, { align: 'right' });

      doc.save(`REGISTRO_TRAZABILIDAD_POSTRES_${seccionNombre.toUpperCase()}_${currentKey}_${printId}.pdf`);
      toast.success("Esquema oficial generado con éxito 📄");
    } catch (error) {
      console.error("Error al generar PDF postres:", error);
      toast.error("Error crítico: " + error.message);
    }
  };

  const getTitulo = () => {
    if (vista === "semanal") {
      const lunes = getLunes(fechaBase);
      const domingo = addDays(lunes, 6);
      return `Semana del ${formatFechaShort(lunes)} al ${formatFechaShort(domingo)}`;
    }
    if (vista === "diaria") return `${DIAS[(fechaBase.getDay() + 6) % 7]} ${fechaBase.getDate()} de ${MESES[fechaBase.getMonth()]}`;
    return `${MESES[fechaBase.getMonth()]} ${fechaBase.getFullYear()}`;
  };

  const lunesSemana = getLunes(fechaBase);
  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunesSemana, i));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="w-12 h-12 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mb-4"></div>
        <p className={`${t.textSecondary} text-sm font-medium`}>Cargando registros de postres...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Selector de Pestañas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className={`flex p-1.5 rounded-2xl ${t.bgCard} border ${t.border} w-fit shadow-xl`}>
          <button 
            onClick={() => setActiveTab('materias')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === 'materias' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30 scale-105' : `${t.textSecondary} hover:${t.text}`}`}
          >
            Materias Primas
          </button>
          <button 
            onClick={() => setActiveTab('produccion')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === 'produccion' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30 scale-105' : `${t.textSecondary} hover:${t.text}`}`}
          >
            Producción
          </button>
          <button 
            onClick={() => setActiveTab('pcc')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === 'pcc' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30 scale-105' : `${t.textSecondary} hover:${t.text}`}`}
          >
            PCC Cocción
          </button>
          <button 
            onClick={() => setActiveTab('sanitizacion')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === 'sanitizacion' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30 scale-105' : `${t.textSecondary} hover:${t.text}`}`}
          >
            PCC Sanitización
          </button>
        </div>
        <div className="flex items-center gap-3">
          {(activeTab === 'materias' || activeTab === 'produccion' || activeTab === 'sanitizacion') && (
            <div className={`flex ${t.bgCard} border ${t.border} rounded-xl overflow-hidden`}>
              {['diaria', 'semanal', 'mensual'].map(v => (
                <button key={v} onClick={() => setVista(v)} className={`px-3 py-2 text-xs font-bold capitalize transition-colors ${vista === v ? "bg-rose-600 text-white" : `${t.textSecondary} hover:${t.text}`}`}>{v}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeTab === 'pcc' ? (
        <CoccionEnfriadoModule rol={rol} cuarto="postres" />
      ) : activeTab === 'sanitizacion' ? (
        <SanitizacionModule rol={rol} cuarto="postres" />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className={`${t.text} text-lg font-bold tracking-tight`}>{getTitulo()}</h2>
                <div className="flex items-center gap-1">
                  <button onClick={() => navegar(-1)} className={`w-8 h-8 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-rose-400 transition`}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span></button>
                  <button onClick={() => navegar(1)} className={`w-8 h-8 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-rose-400 transition`}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span></button>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" style={{ fontSize: 18 }}>search</span>
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full ${t.bgCard} ${t.text} text-sm pl-10 pr-4 py-2.5 rounded-xl border ${t.border} focus:outline-none focus:border-rose-500/50 transition-all`} />
              </div>
              {esAdmin && (
                <button 
                  onClick={() => { 
                    const state = activeTab === 'materias' ? materiasState : produccionState;
                    setTargetCatId(state[0]?.id); 
                    setModalAddOpen(true); 
                  }} 
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span> Nuevo Item
                </button>
              )}
            </div>
          </div>

      {vista === 'diaria' && (
        <div className="flex flex-col gap-12 animate-in fade-in duration-500">
          {(activeTab === 'materias' ? materiasState : produccionState).map(cat => {
            const filteredItems = filterItems(cat.items);
            if (filteredItems.length === 0) return null;
            return (
              <div key={cat.id} className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-3 relative">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${cat.bg} ${cat.color} shadow-xl border border-white/5`}><span className="material-symbols-outlined" style={{ fontSize: 28 }}>{cat.icon || 'icecream'}</span></div>
                  <div className="text-center">
                    <h3 className={`text-2xl font-black uppercase tracking-tight ${cat.color} leading-none`}>{cat.nombre}</h3>
                    <div className={`h-1 w-24 mx-auto rounded-full mt-3 ${cat.bg} opacity-50`}></div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map((item, idx) => (
                    <div key={item} className={`${t.bgCard} border ${t.border} rounded-2xl p-4 flex gap-3 hover:border-rose-500/30 transition-all group relative`}>
                      {/* Flechas de ordenamiento */}
                      {esAdmin && !searchTerm && (
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-center">
                          <button 
                            onClick={() => moveItem(cat.id, idx, -1)}
                            className={`w-6 h-6 flex items-center justify-center rounded-md ${t.bgInput} ${t.textSecondary} hover:text-rose-400 border ${t.border}`}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>expand_less</span>
                          </button>
                          <button 
                            onClick={() => moveItem(cat.id, idx, 1)}
                            className={`w-6 h-6 flex items-center justify-center rounded-md ${t.bgInput} ${t.textSecondary} hover:text-rose-400 border ${t.border}`}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>expand_more</span>
                          </button>
                        </div>
                      )}

                      <div className="flex-1 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className={`${t.text} text-sm font-bold`}>{item}</span>
                          {esAdmin && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingItem({ catId: cat.id, originalCatId: cat.id, oldName: item, newName: item }); setModalEditOpen(true); }} className={`w-6 h-6 flex items-center justify-center rounded-lg ${t.bgInput} ${t.textSecondary} hover:text-rose-400 border ${t.border}`}><span className="material-symbols-outlined text-xs">edit</span></button>
                              <button onClick={() => handleDeleteItem(cat.id, item)} className={`w-6 h-6 flex items-center justify-center rounded-lg ${t.bgInput} ${t.textSecondary} hover:text-red-400 border ${t.border}`}><span className="material-symbols-outlined text-xs">delete</span></button>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={data[item]?.[currentKey] || ""} 
                            onChange={(e) => handleInputChange(item, currentKey, e.target.value)}
                            placeholder={activeTab === 'materias' ? "DD/MM" : "Cant."}
                            className={`flex-1 ${t.bgInput} ${t.text} text-center py-2.5 rounded-xl border ${t.border} focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/10 transition-all font-mono font-bold placeholder:opacity-30`}
                          />
                          <button 
                            title="Copiar del día anterior"
                            onClick={() => {
                              const prevDate = new Date(fechaBase);
                              prevDate.setDate(prevDate.getDate() - 1);
                              const prevKey = toKey(prevDate);
                              handleInputChange(item, currentKey, data[item]?.[prevKey] || '');
                            }}
                            className={`p-2.5 rounded-xl ${t.bgInput} ${t.textSecondary} hover:text-rose-400 border ${t.border} transition-all`}
                          >
                            <span className="material-symbols-outlined text-sm">content_copy</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {vista === 'semanal' && (
        <div className="overflow-x-auto rounded-2xl border border-white/5 shadow-2xl">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-rose-500/10">
                <th className={`p-4 text-xs font-black uppercase tracking-wider ${t.textSecondary} sticky left-0 ${t.bgCard} z-20`}>Producto</th>
                {diasSemana.map(d => (
                  <th key={d.toString()} className={`p-4 text-xs font-black uppercase tracking-wider ${t.textSecondary} text-center`}>
                    {DIAS[(d.getDay() + 6) % 7]}<br/><span className="text-[10px] opacity-50">{formatFechaShort(d)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(activeTab === 'materias' ? materiasState : produccionState).map(cat => (
                <React.Fragment key={cat.id}>
                  <tr className="bg-rose-500/5">
                    <td colSpan={8} className={`p-3 text-[10px] font-black uppercase tracking-widest ${cat.color} bg-white/5`}>{cat.nombre}</td>
                  </tr>
                  {filterItems(cat.items).map(item => (
                    <tr key={item} className="hover:bg-white/5 transition-colors group">
                      <td className={`p-4 text-sm font-bold ${t.text} sticky left-0 ${t.bgCard} z-10 border-r ${t.border}`}>{item}</td>
                      {diasSemana.map(d => {
                        const key = toKey(d);
                        return (
                          <td key={key} className="p-1">
                            <input type="text" value={data[item]?.[key] || ""} onChange={(e) => handleInputChange(item, key, e.target.value)} className={`w-full h-10 bg-transparent text-center ${t.text} text-xs font-bold border-none focus:ring-2 focus:ring-rose-500/20 rounded-lg transition-all`} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {vista === 'mensual' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-7 gap-2">
            {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(d => (
              <div key={d} className={`p-2 text-[10px] font-black ${t.textSecondary} text-center tracking-widest`}>{d}</div>
            ))}
            {(() => {
              const firstDay = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), 1);
              const startOffset = (firstDay.getDay() + 6) % 7;
              const days = [];
              for (let i = 0; i < startOffset; i++) days.push(null);
              const lastDay = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + 1, 0).getDate();
              for (let i = 1; i <= lastDay; i++) days.push(i);

              return days.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="aspect-square"></div>;
                const isToday = day === new Date().getDate() && fechaBase.getMonth() === new Date().getMonth() && fechaBase.getFullYear() === new Date().getFullYear();
                const isSelected = day === fechaBase.getDate();
                
                return (
                  <button 
                    key={day}
                    onClick={() => {
                      const newDate = new Date(fechaBase);
                      newDate.setDate(day);
                      setFechaBase(newDate);
                      setVista('diaria');
                    }}
                    className={`aspect-square rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 group relative overflow-hidden
                      ${isSelected ? 'bg-rose-600 border-rose-500 shadow-lg shadow-rose-500/20 text-white z-10 scale-105' : `${t.bgCard} ${t.border} ${t.text} hover:border-rose-500/30 hover:bg-rose-500/5`}`}
                  >
                    <span className={`text-sm font-black ${isSelected ? 'text-white' : ''}`}>{day}</span>
                    {isToday && !isSelected && <div className="w-1 h-1 rounded-full bg-rose-500 mt-1"></div>}
                  </button>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Modales de Auditoría, Agregar y Editar */}
      {showAuditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`${t.bgCard} border ${t.border} rounded-3xl p-8 max-w-sm w-full shadow-2xl scale-in-center`}>
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-6"><span className="material-symbols-outlined" style={{ fontSize: 32 }}>security</span></div>
            <h3 className={`${t.text} text-xl font-bold text-center mb-2`}>Verificación de Seguridad</h3>
            <p className={`${t.textSecondary} text-sm text-center mb-8`}>Se registrará esta impresión con tu usuario ({user?.email}) para la trazabilidad oficial.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowAuditModal(false)} className={`flex-1 py-3 rounded-xl ${t.bgInput} ${t.text} font-bold hover:${t.hover} transition-all`}>Cancelar</button>
              <button onClick={confirmExport} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95 transition-all">Generar</button>
            </div>
          </div>
        </div>
      )}

      {modalAddOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`${t.bgCard} border ${t.border} rounded-3xl p-6 max-w-md w-full shadow-2xl`}>
            <h3 className={`${t.text} text-xl font-bold mb-4`}>Agregar Nuevo Item</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className={`text-xs font-bold ${t.textSecondary} uppercase mb-1 block`}>Nombre</label>
                <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className={`w-full ${t.bgInput} ${t.text} p-3 rounded-xl border ${t.border} focus:outline-none focus:border-rose-500`} placeholder="Ej: Mouse de Chocolate" />
              </div>
              <div>
                <label className={`text-xs font-bold ${t.textSecondary} uppercase mb-1 block`}>Categoría</label>
                <select value={targetCatId} onChange={(e) => setTargetCatId(e.target.value)} className={`w-full ${t.bgInput} ${t.text} p-3 rounded-xl border ${t.border} focus:outline-none focus:border-rose-500`}>
                  {(activeTab === 'materias' ? materiasState : produccionState).map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setModalAddOpen(false)} className={`flex-1 py-3 rounded-xl ${t.bgInput} ${t.text} font-bold`}>Cancelar</button>
              <button onClick={handleAddItem} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold">Agregar</button>
            </div>
          </div>
        </div>
      )}

      {modalEditOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`${t.bgCard} border ${t.border} rounded-3xl p-6 max-w-md w-full shadow-2xl`}>
            <h3 className={`${t.text} text-xl font-bold mb-4`}>Editar Item</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className={`text-xs font-bold ${t.textSecondary} uppercase mb-1 block`}>Nuevo Nombre</label>
                <input type="text" value={editingItem.newName} onChange={(e) => setEditingItem(prev => ({ ...prev, newName: e.target.value }))} className={`w-full ${t.bgInput} ${t.text} p-3 rounded-xl border ${t.border} focus:outline-none focus:border-rose-500`} />
              </div>
              <div>
                <label className={`text-xs font-bold ${t.textSecondary} uppercase mb-1 block`}>Cambiar Categoría</label>
                <select value={editingItem.catId} onChange={(e) => setEditingItem(prev => ({ ...prev, catId: e.target.value }))} className={`w-full ${t.bgInput} ${t.text} p-3 rounded-xl border ${t.border} focus:outline-none focus:border-rose-500`}>
                  {(activeTab === 'materias' ? materiasState : produccionState).map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setModalEditOpen(false)} className={`flex-1 py-3 rounded-xl ${t.bgInput} ${t.text} font-bold`}>Cancelar</button>
              <button onClick={handleEditItem} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold">Guardar</button>
            </div>
          </div>
        </div>
      )}
          {/* Botones Flotantes de Acción — solo para materias */}
          <div className="fixed bottom-24 right-6 md:bottom-10 md:right-10 flex flex-col gap-3 z-50">
            <button 
              onClick={handleExportPDF}
              className="w-14 h-14 md:w-auto md:h-auto md:px-6 md:py-3 rounded-full md:rounded-xl bg-rose-950/40 backdrop-blur-md text-rose-200 font-bold shadow-2xl hover:bg-rose-900/60 transition-all flex items-center justify-center gap-2 border border-rose-500/20 group"
              title="Exportar PDF"
            >
              <span className="material-symbols-outlined">picture_as_pdf</span>
              <span className="hidden md:inline">PDF</span>
            </button>

            <button 
              onClick={handleGuardarDatos}
              disabled={saving}
              className="w-14 h-14 md:w-auto md:h-auto md:px-6 md:py-3 rounded-full md:rounded-xl bg-rose-600 text-white font-bold shadow-2xl shadow-rose-500/20 hover:scale-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 group"
              title="Guardar Registros"
            >
              {saving ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <span className="material-symbols-outlined">cloud_upload</span>
              )}
              <span className="hidden md:inline">{saving ? "Guardando..." : "Guardar"}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
