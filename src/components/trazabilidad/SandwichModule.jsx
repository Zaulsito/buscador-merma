import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { normalizeText } from '../../utils/searchUtils';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const CATEGORIAS_MATERIAS = [
  {
    id: "proteinas",
    nombre: "Proteínas / Carnes",
    icon: "restaurant",
    color: "text-red-400",
    bg: "bg-red-500/10",
    items: ["Churrasco Vacuno", "Carne Mechada", "Carne Vacuno Asiento", "Jamón Pierna", "Jamón Serrano", "Pechuga de Pollo", "Salmón Ahumado", "Trucha Ahumada Slice", "Longaniza Bratwurst", "Mortadella Pistacho", "Pastrami", "Pulpa de Cerdo", "Porción Brisket", "Porción Churrasco", "Porción Mechada Cerdo", "Porción Pulled Pork"]
  },
  {
    id: "panes",
    nombre: "Panes",
    icon: "bakery_dining",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    items: ["Marraqueta", "Pan Baguette", "Pan Brioche Hamburguesa", "Pan Ciabatta", "Pan Croissant", "Pan Frica", "Pan Italiano", "Pan Miga", "Pan Sandwich", "Pan Schiacciata", "Pan Toscano"]
  },
  {
    id: "vegetales",
    nombre: "Vegetales / Frutas",
    icon: "eco",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    items: ["Lechuga Hidropónica", "Tomate", "Tomate Cherry", "Tomate Deshidratado", "Tomates Asados", "Palta", "Cebolla", "Choclo", "Chucrut Morado", "Ciboulette", "Cilantro", "Pepino Dulce", "Pepinillo Dill", "Rúcula", "Rúcula Baby", "Zanahoria", "Vienesa", "Poroto Verde", "Pimentón Morrón", "Pimentón en Conserva"]
  },
  {
    id: "lacteos",
    nombre: "Lácteos y Quesos",
    icon: "egg_alt",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    items: ["Queso Laminado", "Queso de Cabra", "Queso Crema", "Mozzarella di Búfala", "Burrata de Búfala", "Ricotta"]
  },
  {
    id: "salsas",
    nombre: "Salsas y Otros",
    icon: "local_bar",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    items: ["Mayonesa", "Mayonesa Ligth", "Mayonesa Polvo", "Mostaza Dijon", "Mostaza Granulada", "Mostaza Old Style", "Pesto", "Hummus de Alcachofa", "Pasta Tuna Salad", "Pasta Seafood", "Pasta Roasted Chicken", "Salsa BBQ", "Salsa Coleslaw", "Pebre", "Miel", "Aceite Maravilla", "Aceite Oliva", "Aceto Balsámico", "Reducción de Aceto", "Sal", "Pimienta", "Ajo", "Albahaca", "Laurel", "Romero"]
  }
];

const PRODUCTOS_PRODUCCION = [
  { id: "hamburguesas", nombre: "Hamburguesas", items: ["HAMBURGUESA CHACARERA", "HAMBURGUESA CHAMPIÑÓN QUESO", "HAMBURGUESA CHEDDAR", "HAMBURGUESA ITALIANA", "HAMBURGUESA JUMBO", "HAMBURGUESA LUCO", "HAMBURGUESA VEGETARIANA"] },
  { id: "gourmet", nombre: "Sandwiches Gourmet", items: ["SANDWICH GOURMET CAMARÓN APANADO", "SANDWICH GOURMET JAMÓN LACHS", "SANDWICH GOURMET JAMÓN PROSCIUTTO", "SANDWICH GOURMET PASTRAMI", "SANDWICH GOURMET PAVO ASADO", "SANDWICH GOURMET ROAST BEEF", "SANDWICH GOURMET SALMÓN AHUMADO", "SANDWICH GOURMET TOMATE CAMEMBERT", "SANDWICH GOURMET VEGETARIANO"] },
  { id: "clasicos", nombre: "Sandwiches Clásicos", items: ["SANDWICH MECHADA CLÁSICA", "SANDWICH MECHADA ITALIANA", "SANDWICH MECHADA LUCO", "SANDWICH MECHADA PEPERONATA", "SANDWICH MECHADA QUESO", "SANDWICH AVE PALTA", "SANDWICH AVE PIMENTÓN", "SANDWICH BARROS LUCO", "SANDWICH CHACARERO", "SANDWICH ALEMÁN", "SANDWICH CHURRASCO LOMO LUCO", "SANDWICH MIXTO JAMÓN QUESO BARROS JARPA", "SANDWICH PULPA ITALIANA", "SANDWICH VEGETARIANO", "CROISSANT JAMÓN QUESO", "BAGUEL SALMÓN"] }
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

export default function SandwichModule({ rol }) {
  const { t } = useTheme();
  const { user } = useAuth();
  const esAdmin = rol === 'admin' || rol === 'unico';
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('sandwich_active_tab') || 'materias');
  const [vista, setVista] = useState(() => localStorage.getItem('sandwich_vista') || 'diaria');
  const [fechaBase, setFechaBase] = useState(new Date());
  const [data, setData] = useState(() => {
    const draft = localStorage.getItem('sandwich_data_draft');
    return draft ? JSON.parse(draft) : {};
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para las listas de productos (permiten edición)
  const [materiasState, setMateriasState] = useState(CATEGORIAS_MATERIAS);
  const [saving, setSaving] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // ── PERSISTENCIA: Cargar Configuración y Datos ──
  useEffect(() => {
    // 1. Cargar Configuración (Categorías e Ítems)
    const loadConfig = async () => {
      try {
        const docRef = doc(db, 'trazabilidad_config', 'sandwich');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const { materias, produccion } = docSnap.data();
          // Migración automática de nombres si es necesario
          const updatedMaterias = (materias || CATEGORIAS_MATERIAS).map(c => 
            c.id === 'vegetales' ? { ...c, nombre: "Vegetales / Frutas" } : c
          );
          setMateriasState(updatedMaterias);
          if (produccion) setProduccionState(produccion);
        }
      } catch (err) {
        console.error("Error al cargar config:", err);
      }
    };

    // 2. Escuchar Datos (Registros de trazabilidad)
    const unsubData = onSnapshot(doc(db, 'trazabilidad_data', 'sandwich'), (snap) => {
      if (snap.exists()) {
        const serverData = snap.data();
        setData(prev => {
          // Unimos lo que hay en el servidor con lo que tenemos localmente.
          // Lo del servidor manda si ya fue guardado oficialmente.
          return { ...prev, ...serverData };
        });
      }
      setLoading(false);
    });

    loadConfig();
    return () => unsubData();
  }, []);

  // ── Sincronización con LocalStorage (Borrador para evitar pérdida en refresh) ──
  useEffect(() => {
    localStorage.setItem('sandwich_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('sandwich_vista', vista);
  }, [vista]);

  useEffect(() => {
    localStorage.setItem('sandwich_data_draft', JSON.stringify(data));
  }, [data]);

  // Función para guardar la configuración (al agregar/editar/borrar/reordenar)
  const saveConfig = async (newMaterias, newProduccion) => {
    try {
      await setDoc(doc(db, 'trazabilidad_config', 'sandwich'), {
        materias: newMaterias || materiasState,
        produccion: newProduccion || produccionState,
        updatedAt: new Date()
      });
    } catch (err) {
      console.error("Error al guardar config:", err);
      toast.error("No se pudo sincronizar la lista de productos");
    }
  };

  // Función para guardar los registros
  const handleGuardarDatos = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'trazabilidad_data', 'sandwich'), {
        ...data,
        updatedAt: new Date()
      });
      toast.success("Registros guardados en la nube ✅");
    } catch (err) {
      console.error("Error al guardar datos:", err);
      toast.error("Error al guardar los registros");
    }
    setSaving(false);
  };

  // Estado para el modal de agregar ingrediente
  const [modalAddOpen, setModalAddOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [targetCatId, setTargetCatId] = useState(null);

  // Estado para el modal de editar ingrediente
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

    // Auto-formateo y Validación DD/MM para Materias Primas
    if (activeTab === 'materias') {
      const clean = value.replace(/\D/g, ''); // Solo números
      if (clean.length > 4) return;
      
      let dayPart = clean.slice(0, 2);
      let monthPart = clean.slice(2);

      // Auto-corrección y validación de día (01-31)
      if (dayPart.length === 1 && parseInt(dayPart) > 3) dayPart = '0' + dayPart;
      if (dayPart.length === 2) {
        const d = parseInt(dayPart);
        if (d === 0 || d > 31) return;
      }

      // Auto-corrección y validación de mes (01-12)
      if (monthPart.length === 1 && parseInt(monthPart) > 1) monthPart = '0' + monthPart;
      if (monthPart.length === 2) {
        const m = parseInt(monthPart);
        if (m === 0 || m > 12) return;
      }

      const combined = dayPart + monthPart;
      if (combined.length > 2) {
        finalValue = `${combined.slice(0, 2)}/${combined.slice(2)}`;
      } else {
        finalValue = combined;
      }
      
      // Permitir borrar el slash fácilmente
      if (value.length < (data[itemId]?.[key]?.length || 0) && value.endsWith('/')) {
        finalValue = dayPart.slice(0, -1);
      }
    }

    setData(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [key]: finalValue
      }
    }));
  };

  const filterItems = (items) => {
    if (!searchTerm) return items;
    const normalizedSearch = normalizeText(searchTerm);
    return items.filter(item => normalizeText(item).includes(normalizedSearch));
  };

  // ── Lógica de Reordenar ──
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

  // ── Lógica de Agregar ──
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
      // Solo cambiar nombre dentro de la misma categoría
      newState = state.map(cat => {
        if (cat.id !== editingItem.catId) return cat;
        return { 
          ...cat, 
          items: cat.items.map(i => i === editingItem.oldName ? editingItem.newName.trim() : i) 
        };
      });
    } else {
      // Cambiar de categoría (y opcionalmente nombre)
      newState = state.map(cat => {
        // Quitar de la original
        if (cat.id === editingItem.originalCatId) {
          return { ...cat, items: cat.items.filter(i => i !== editingItem.oldName) };
        }
        // Agregar a la nueva
        if (cat.id === editingItem.catId) {
          // Evitar duplicados si el nombre ya existe en la nueva categoría
          if (cat.items.includes(editingItem.newName.trim())) return cat;
          return { ...cat, items: [...cat.items, editingItem.newName.trim()] };
        }
        return cat;
      });
    }
    
    // Migrar datos si el nombre cambió
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


  // ── EXPORTAR A PDF (Esquema Oficial Jumbo) ──
  const handleExportPDF = () => {
    const lastPrint = localStorage.getItem('last_print_sandwich');
    if (lastPrint) {
      const diff = Date.now() - parseInt(lastPrint);
      if (diff < 20000) {
        const segs = Math.ceil((20000 - diff) / 1000);
        toast.error(`Seguridad: Por favor, espera ${segs} segundos antes de generar otra impresión oficial.`);
        return;
      }
    }
    setShowAuditModal(true);
  };

  const confirmExport = async () => {
    setShowAuditModal(false);
    const isMaterias = activeTab === 'materias';
    const state = isMaterias ? materiasState : produccionState;
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
      head = [["Categoría", "Producto", isMaterias ? "Ingreso" : "Cantidad"]];
      state.forEach(cat => {
        cat.items.forEach(item => {
          body.push([cat.nombre, item, data[item]?.[currentKey] || ""]);
        });
      });
    }

    try {
      // Registrar timestamp para coldown persistente
      localStorage.setItem('last_print_sandwich', Date.now().toString());
      // ── REGISTRO OBLIGATORIO DE AUDITORÍA ──
      await toast.promise(
        addDoc(collection(db, 'log_impresiones'), {
          printId,
          usuario: user?.email || 'Desconocido',
          nombre: user?.displayName || 'Usuario Anónimo',
          modulo: 'Sandwich',
          seccion: isMaterias ? 'Materias Primas' : 'Producción',
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
        // Fallback si falla el logo por CORS
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
      doc.text(isMaterias ? "Trazabilidad de Materias Primas" : "Planilla de Producción Diaria", 38, 23);
      doc.setFontSize(7);
      doc.text("CUARTO DE PRODUCCIÓN", 38, 27);
      doc.setFont("helvetica", "bold");
      doc.text("SANDWICH", 38, 31);
      doc.setFont("helvetica", "normal");

      // Info Local y Fecha (Derecha) - Swapped and moved left
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
      // (Reutilizamos head y body capturados arriba para la auditoría)
      // Pero si queremos regenerarlos para el PDF con el estilo jsPDF-autoTable:
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
        head = [["Categoría", "Producto", isMaterias ? "Ingreso" : "Cantidad"]];
        state.forEach(cat => {
          const rowsForCat = [];
          cat.items.forEach(item => {
            const val = data[item]?.[currentKey];
            if (val && val !== "—") {
              rowsForCat.push([item, val]); // Solo Producto e Ingreso por ahora
            }
          });
          
          if (rowsForCat.length > 0) {
            // Insertar la celda de Categoría con RowSpan solo en la primera fila de este grupo
            const firstRow = [
              { content: cat.nombre, rowSpan: rowsForCat.length, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', textColor: [0, 85, 44] } },
              ...rowsForCat[0]
            ];
            body.push(firstRow);
            
            // Las demás filas del grupo solo llevan sus 2 columnas originales
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

      // Columna Izquierda: Asegurador
      doc.setFontSize(8);
      doc.setTextColor(0, 85, 44);
      doc.setDrawColor(0, 85, 44);
      doc.line(15, finalY - 10, 15, finalY - 4); // Indicador lateral
      doc.text("ASEGURADOR DE CALIDAD", 18, finalY - 6);
      
      // Caja con bordes redondos para el asegurador
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

      // Columna Derecha: Persona Responsable
      const col2 = pageWidth / 2 + 5;
      doc.setDrawColor(0, 85, 44);
      doc.line(col2, finalY - 10, col2, finalY - 4);
      doc.setTextColor(0, 85, 44);
      doc.text("PERSONA RESPONSABLE", col2 + 3, finalY - 6);
      
      // Caja con bordes redondos para el responsable (Ajustada)
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

      /* Ya no necesitamos el try-catch aquí porque lo movimos arriba */

      // Metadatos inferiores
      doc.setFontSize(6);
      doc.setTextColor(180, 180, 180);
      doc.text(`© 2026 RINCON JUMBO INFORMACIONES / IMPRESION DE ALTO CONTRASTE`, 15, pageHeight - 10);
      doc.text(`ID ÚNICO: ${printId}`, pageWidth - 15, pageHeight - 10, { align: 'right' });

      doc.save(`REGISTRO_TRAZABILIDAD_SANDWICH_${currentKey}_${printId}.pdf`);
      toast.success("Esquema oficial generado con éxito 📄");
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast.error("Error crítico: " + error.message);
    }
  };

  // ── Títulos de navegación ──
  const getTitulo = () => {
    if (vista === "semanal") {
      const lunes = getLunes(fechaBase);
      const domingo = addDays(lunes, 6);
      return `Semana del ${formatFechaShort(lunes)} al ${formatFechaShort(domingo)}, ${lunes.getFullYear()}`;
    }
    if (vista === "diaria") {
      const dSem = DIAS[(fechaBase.getDay() + 6) % 7];
      return `${dSem} ${fechaBase.getDate()} de ${MESES[fechaBase.getMonth()]} ${fechaBase.getFullYear()}`;
    }
    return `${MESES[fechaBase.getMonth()]} ${fechaBase.getFullYear()}`;
  };

  const lunesSemana = getLunes(fechaBase);
  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunesSemana, i));

  return (
    <div className="flex flex-col gap-6">
      {/* Header: Tabs + Vista + Nav */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Tabs de categoría */}
        <div className={`flex p-1 rounded-xl ${t.bgInput} border ${t.border} w-fit`}>
          <button
            onClick={() => setActiveTab('materias')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'materias' ? `${t.accent} text-white shadow-lg` : `${t.textSecondary} hover:text-white`}`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">inventory_2</span>
              Materias Primas
            </div>
          </button>
          <button
            onClick={() => setActiveTab('produccion')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'produccion' ? `${t.accent} text-white shadow-lg` : `${t.textSecondary} hover:text-white`}`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">lunch_dining</span>
              Producción
            </div>
          </button>
        </div>

        {/* Vista Selector (Día/Semana/Mes) */}
        <div className="flex items-center gap-3">
          <div className={`flex ${t.bgCard} border ${t.border} rounded-xl overflow-hidden`}>
            {['diaria', 'semanal', 'mensual'].map(v => (
              <button key={v} onClick={() => setVista(v)}
                className={`px-3 py-2 text-xs font-bold capitalize transition-colors ${
                  vista === v ? "bg-blue-600 text-white" : `${t.textSecondary} hover:${t.text}`
                }`}>
                {v === "diaria" ? "Día" : v === "semanal" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>

          {/* Navegación temporal */}
          <div className="flex items-center gap-1">
            <button onClick={() => navegar(-1)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-blue-400 transition`}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
            </button>
            <button onClick={() => navegar(1)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary} hover:text-blue-400 transition`}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className={`${t.text} text-lg font-bold tracking-tight`}>{getTitulo()}</h2>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" style={{ fontSize: 18 }}>search</span>
            <input 
              type="text"
              placeholder={`Buscar en ${activeTab === 'materias' ? 'materias primas' : 'producción'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${t.bgCard} ${t.text} text-sm pl-10 pr-4 py-2.5 rounded-xl border ${t.border} focus:outline-none focus:border-purple-500/50 transition-all`}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            )}
          </div>

          {esAdmin && (
            <button 
              onClick={() => {
                const list = activeTab === 'materias' ? materiasState : produccionState;
                setTargetCatId(list[0]?.id);
                setModalAddOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span>
              Nuevo Item
            </button>
          )}
        </div>
      </div>

      {/* ── CONTENIDO SEGÚN VISTA ── */}
      {vista === 'diaria' && (
        <div className="flex flex-col gap-12 animate-in fade-in duration-500">
          {(activeTab === 'materias' ? materiasState : produccionState).map(cat => {
            const filteredItems = filterItems(cat.items);
            if (filteredItems.length === 0) return null;

            return (
              <div key={cat.id} className="flex flex-col gap-6">
                {/* Header Categoría Centralizado */}
                <div className="flex flex-col items-center gap-3 relative">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${cat.bg || 'bg-emerald-500/10'} ${cat.color || 'text-emerald-400'} shadow-xl border border-white/5`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>{cat.icon || 'lunch_dining'}</span>
                  </div>
                  <div className="text-center">
                    <h3 className={`text-2xl font-black uppercase tracking-tight ${cat.color || 'text-emerald-400'} leading-none`}>
                      {cat.nombre}
                    </h3>
                    <div className={`h-1 w-24 mx-auto rounded-full mt-3 ${cat.bg || 'bg-emerald-500/20'} opacity-50`}></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map((item, idx) => {
                    const originalIdx = cat.items.indexOf(item);
                    return (
                      <div 
                        key={item} 
                        className={`${t.bgCard} border ${t.border} rounded-2xl p-4 flex flex-col gap-3 hover:border-purple-500/30 hover:shadow-xl hover:shadow-purple-500/5 transition-all group relative`}
                      >
                        {/* Controles de Reordenar (Solo Admin) */}
                        {esAdmin && !searchTerm && (
                          <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button 
                              onClick={() => moveItem(cat.id, originalIdx, -1)}
                              disabled={originalIdx === 0}
                              className={`w-6 h-6 rounded-full ${t.bgInput} border ${t.border} ${t.text} flex items-center justify-center hover:bg-purple-500/20 disabled:opacity-30`}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>expand_less</span>
                            </button>
                            <button 
                              onClick={() => moveItem(cat.id, originalIdx, 1)}
                              disabled={originalIdx === cat.items.length - 1}
                              className={`w-6 h-6 rounded-full ${t.bgInput} border ${t.border} ${t.text} flex items-center justify-center hover:bg-purple-500/20 disabled:opacity-30`}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>expand_more</span>
                            </button>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`${t.text} text-sm font-bold leading-tight`}>{item}</span>
                            {esAdmin && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => {
                                    setEditingItem({ catId: cat.id, originalCatId: cat.id, oldName: item, newName: item });
                                    setModalEditOpen(true);
                                  }}
                                  className={`w-5 h-5 flex items-center justify-center rounded-md ${t.bgInput} ${t.textSecondary} hover:text-blue-400 border ${t.border}`}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>edit</span>
                                </button>
                                <button 
                                  onClick={() => handleDeleteItem(cat.id, item)}
                                  className={`w-5 h-5 flex items-center justify-center rounded-md ${t.bgInput} ${t.textSecondary} hover:text-red-400 border ${t.border}`}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                          <span className={`text-[10px] uppercase tracking-widest ${activeTab === 'materias' ? 'text-purple-400' : 'text-emerald-400'} font-black whitespace-nowrap`}>
                            {activeTab === 'materias' ? 'Ingreso (DD/MM)' : 'Cantidad'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder={activeTab === 'materias' ? "30/04" : "0"}
                            value={data[item]?.[currentKey] || ''}
                            onChange={(e) => handleInputChange(item, currentKey, e.target.value)}
                            className={`flex-1 ${t.bgInput} ${t.text} ${activeTab === 'materias' ? 'text-xs font-medium' : 'text-base font-black text-center'} p-2.5 rounded-xl border ${t.border} focus:outline-none focus:border-purple-500/50 transition-all`}
                          />
                          {activeTab === 'materias' && (
                            <button 
                              title="Copiar del día anterior"
                              className={`p-2.5 rounded-xl ${t.bgInput} ${t.textSecondary} hover:text-purple-400 border ${t.border} transition-all`}
                              onClick={() => {
                                const prevDate = new Date(fechaBase);
                                prevDate.setDate(prevDate.getDate() - 1);
                                const prevKey = toKey(prevDate);
                                handleInputChange(item, currentKey, data[item]?.[prevKey] || '');
                              }}
                            >
                              <span className="material-symbols-outlined text-sm">content_copy</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {vista === 'semanal' && (
        <div className={`${t.bgCard} border ${t.border} rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className={`${t.isDark ? "bg-white/5" : "bg-slate-50"} border-b ${t.border}`}>
                  <th className={`px-4 py-4 text-left text-[11px] font-black uppercase tracking-widest ${t.textSecondary}`}>Producto</th>
                  {diasSemana.map(d => {
                    const isHoy = toKey(d) === toKey(new Date());
                    return (
                      <th key={toKey(d)} className={`px-2 py-4 text-center ${isHoy ? 'bg-blue-500/10' : ''}`}>
                        <p className={`text-[10px] font-black uppercase ${isHoy ? 'text-blue-400' : t.textSecondary}`}>{DIAS[(d.getDay() + 6) % 7].slice(0, 3)}</p>
                        <p className={`text-base font-black ${isHoy ? 'text-blue-400' : t.text}`}>{d.getDate()}</p>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className={`divide-y ${t.border}`}>
                {(activeTab === 'materias' ? materiasState : produccionState).map(cat => {
                  const filteredItems = filterItems(cat.items);
                  if (filteredItems.length === 0) return null;
                  return (
                    <React.Fragment key={cat.id}>
                      {/* Header Categoría en Tabla - Estilo Independiente */}
                      <tr>
                        <td colSpan={8} className="py-10">
                          <div className="flex flex-col items-center gap-3 relative group">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cat.bg || 'bg-emerald-500/10'} ${cat.color || 'text-emerald-400'} shadow-lg border border-white/5`}>
                              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{cat.icon || 'lunch_dining'}</span>
                            </div>
                            <h3 className={`text-xl font-black uppercase tracking-tighter ${cat.color || 'text-emerald-400'}`}>
                              {cat.nombre}
                            </h3>
                            <div className={`h-1 w-16 rounded-full ${cat.bg || 'bg-emerald-500/20'} opacity-30`}></div>
                          </div>
                        </td>
                      </tr>
                      {filteredItems.map((item, idx) => {
                        const originalIdx = cat.items.indexOf(item);
                        return (
                          <tr key={item} className={`hover:${t.isDark ? 'bg-white/[0.02]' : 'bg-slate-50'} transition-colors group`}>
                            <td className="px-4 py-2 border-r border-white/5 relative">
                              <div className="flex items-center gap-3">
                                {/* Controles Reordenar Semanal */}
                                {esAdmin && !searchTerm && (
                                  <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => moveItem(cat.id, originalIdx, -1)} disabled={originalIdx === 0} className={`text-xs ${t.textSecondary} hover:text-purple-400`}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>expand_less</span></button>
                                    <button onClick={() => moveItem(cat.id, originalIdx, 1)} disabled={originalIdx === cat.items.length - 1} className={`text-xs ${t.textSecondary} hover:text-purple-400`}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>expand_more</span></button>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <span className={`${t.text} text-xs font-medium`}>{item}</span>
                                  {esAdmin && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => {
                                          setEditingItem({ catId: cat.id, originalCatId: cat.id, oldName: item, newName: item });
                                          setModalEditOpen(true);
                                        }}
                                        className={`w-4 h-4 flex items-center justify-center rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors`}
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: 10 }}>edit</span>
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteItem(cat.id, item)}
                                        className={`w-4 h-4 flex items-center justify-center rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors`}
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: 10 }}>delete</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            {diasSemana.map(d => {
                              const key = toKey(d);
                              return (
                                <td key={key} className="px-1 py-1">
                                  <input 
                                    type="text"
                                    value={data[item]?.[key] || ''}
                                    onChange={(e) => handleInputChange(item, key, e.target.value)}
                                    className={`w-full ${t.bgInput} ${t.text} text-[10px] p-1.5 rounded-lg border ${t.border} text-center focus:outline-none focus:border-purple-500/50 transition-all`}
                                    placeholder="—"
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {vista === 'mensual' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-7 gap-2">
            {DIAS.map(d => (
              <div key={d} className={`text-center py-2 text-[10px] font-black uppercase tracking-widest ${t.textSecondary}`}>
                {d.slice(0, 3)}
              </div>
            ))}
            {Array.from({ length: new Date(fechaBase.getFullYear(), fechaBase.getMonth(), 1).getDay() === 0 ? 6 : new Date(fechaBase.getFullYear(), fechaBase.getMonth(), 1).getDay() - 1 }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square"></div>
            ))}
            {Array.from({ length: new Date(fechaBase.getFullYear(), fechaBase.getMonth() + 1, 0).getDate() }).map((_, i) => {
              const d = i + 1;
              const date = fechaLocal(fechaBase.getFullYear(), fechaBase.getMonth(), d);
              const key = toKey(date);
              const isHoy = key === toKey(new Date());
              const isSelected = key === currentKey;
              
              // Contar registros para este día
              const count = Object.values(data).filter(itemData => itemData[key]).length;

              return (
                <button
                  key={d}
                  onClick={() => {
                    setFechaBase(date);
                    setVista('diaria');
                  }}
                  className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 transition-all
                    ${isSelected ? 'border-blue-500 bg-blue-500/10' : t.border}
                    ${isHoy ? ' ring-2 ring-blue-500/50' : ''}
                    ${t.bgCard} hover:border-blue-500/50 group`}
                >
                  <span className={`text-sm font-black ${isSelected ? 'text-blue-400' : t.text}`}>{d}</span>
                  {count > 0 && (
                    <span className="text-[9px] font-bold bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className={`${t.bgCard} border border-dashed ${t.border} rounded-2xl p-8 flex flex-col items-center justify-center text-center opacity-60`}>
            <span className="material-symbols-outlined text-4xl mb-3 text-slate-500">analytics</span>
            <p className={`${t.text} font-bold`}>Vista Mensual</p>
            <p className={`${t.textSecondary} text-sm max-w-xs mt-1`}>Selecciona un día para ver o editar los registros de trazabilidad de esa fecha.</p>
          </div>
        </div>
      )}
      
      {/* Modal Agregar Ingrediente */}
      {modalAddOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0f1923]/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`${t.bgCard} border ${t.border} w-full max-w-md rounded-3xl p-6 shadow-2xl shadow-purple-500/20`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`${t.text} text-xl font-black`}>Nuevo Ingrediente</h3>
              <button onClick={() => setModalAddOpen(false)} className={`${t.textSecondary} hover:text-white`}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className={`${t.textSecondary} text-[10px] font-black uppercase tracking-widest ml-1`}>Seleccionar Categoría</label>
                <select 
                  value={targetCatId}
                  onChange={(e) => setTargetCatId(e.target.value)}
                  className={`w-full ${t.bgInput} ${t.text} p-3.5 rounded-2xl border ${t.border} focus:outline-none focus:border-purple-500 transition-all appearance-none`}
                >
                  {(activeTab === 'materias' ? materiasState : produccionState).map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={`${t.textSecondary} text-[10px] font-black uppercase tracking-widest ml-1`}>Nombre del Ingrediente</label>
                <input 
                  autoFocus
                  type="text"
                  placeholder="Ej: Salmón Fresco, Pan de Masa Madre..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                  className={`w-full ${t.bgInput} ${t.text} p-3.5 rounded-2xl border ${t.border} focus:outline-none focus:border-purple-500 transition-all`}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setModalAddOpen(false)}
                  className={`flex-1 py-3.5 rounded-2xl ${t.bgInput} ${t.text} font-bold border ${t.border} hover:bg-white/5 transition-all`}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAddItem}
                  disabled={!newItemName.trim()}
                  className={`flex-1 py-3.5 rounded-2xl bg-purple-600 text-white font-black shadow-lg shadow-purple-500/30 hover:bg-purple-500 transition-all disabled:opacity-50`}
                >
                  Agregar Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Editar Ingrediente */}
      {modalEditOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0f1923]/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`${t.bgCard} border ${t.border} w-full max-w-md rounded-3xl p-6 shadow-2xl shadow-blue-500/20`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`${t.text} text-xl font-black`}>Editar Ingrediente</h3>
              <button onClick={() => setModalEditOpen(false)} className={`${t.textSecondary} hover:text-white`}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className={`${t.textSecondary} text-[10px] font-black uppercase tracking-widest ml-1`}>Cambiar Categoría</label>
                <select 
                  value={editingItem.catId}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, catId: e.target.value }))}
                  className={`w-full ${t.bgInput} ${t.text} p-3.5 rounded-2xl border ${t.border} focus:outline-none focus:border-blue-500 transition-all appearance-none`}
                >
                  {(activeTab === 'materias' ? materiasState : produccionState).map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={`${t.textSecondary} text-[10px] font-black uppercase tracking-widest ml-1`}>Nombre del Ingrediente</label>
                <input 
                  autoFocus
                  type="text"
                  value={editingItem.newName}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, newName: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleEditItem()}
                  className={`w-full ${t.bgInput} ${t.text} p-3.5 rounded-2xl border ${t.border} focus:outline-none focus:border-blue-500 transition-all`}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setModalEditOpen(false)}
                  className={`flex-1 py-3.5 rounded-2xl ${t.bgInput} ${t.text} font-bold border ${t.border} hover:bg-white/5 transition-all`}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleEditItem}
                  disabled={!editingItem.newName.trim() || (editingItem.newName === editingItem.oldName && editingItem.catId === editingItem.originalCatId)}
                  className={`flex-1 py-3.5 rounded-2xl bg-blue-600 text-white font-black shadow-lg shadow-blue-500/30 hover:bg-blue-500 transition-all disabled:opacity-50`}
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      

      {/* Action Footer */}
      <div className="mt-8 pt-6 border-t border-gray-700 flex flex-wrap justify-end gap-4">
        <button 
          onClick={handleExportPDF}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-700 text-white font-bold shadow-lg hover:bg-slate-600 transition-all`}
        >
          <span className="material-symbols-outlined">picture_as_pdf</span>
          Exportar PDF
        </button>

        <button 
          onClick={handleGuardarDatos}
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl ${t.accent} text-white font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-all disabled:opacity-50`}
        >
          {saving ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          ) : (
            <span className="material-symbols-outlined">save</span>
          )}
          {saving ? "Guardando..." : "Guardar Registros"}
        </button>
      </div>

      {/* ── Modal de Advertencia de Auditoría ── */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] px-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`${t.bgCard} border ${t.border} w-full max-w-sm rounded-3xl p-8 shadow-2xl border-emerald-500/30 animate-in zoom-in-95 duration-300`}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-emerald-500" style={{ fontSize: 32 }}>gavel</span>
              </div>
              <h3 className={`${t.text} text-xl font-black mb-3`}>Aviso de Auditoría</h3>
              <p className={`${t.textSecondary} text-sm leading-relaxed mb-8`}>
                Cada exportación genera un <span className="text-emerald-500 font-bold">ID ÚNICO</span> e irrepetible que queda vinculado a tu usuario en el registro central de seguridad.
              </p>
              
              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={confirmExport}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-600/20 transition-all active:scale-95"
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
}
