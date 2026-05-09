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

const CATEGORIAS_MATERIAS_CALIENTE = [
  {
    id: 'carnes_aves',
    nombre: 'Carnes y Aves',
    icon: 'kebab_dining',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    items: [
      'CARNE MOLIDA', 'TAPAPECHO', 'LOMO CERDO', 'MILANESA VACUNO', 'JAMON', 'COSTILLAR', 'TOCINO', 'CHORICILLO', 'PECHUGA DE POLLO', 'TRUTRO ALA'
    ]
  },
  {
    id: 'pescados_mariscos',
    nombre: 'Pescados y Mariscos',
    icon: 'set_meal',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    items: [
      'SALMON', 'CHORITOS', 'CHOLGAS', 'ALMEJAS', 'CAMARON SMALL', 'CAMARON GRANDE'
    ]
  },
  {
    id: 'vegetales',
    nombre: 'Vegetales y Frescos',
    icon: 'eco',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    items: [
      'CHAMPIÑON', 'CILANTRO', 'ZANAHORIA', 'CEBOLLA', 'CEBOLLIN', 'CIBOULETTE', 'PIMENTON', 'ARVEJAS', 'AJI JALAPEÑO'
    ]
  },
  {
    id: 'lacteos',
    nombre: 'Lácteos y Quesos',
    icon: 'egg_alt',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    items: [
      'QUESO MOZARELLA RALLADO', 'QUESO RALLADO', 'QUESO MOZARELLA', 'CREMA'
    ]
  },
  {
    id: 'abarrotes',
    nombre: 'Abarrotes y Aceites',
    icon: 'inventory_2',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    items: [
      'ARROZ PREGRANEADO', 'ARROZ', 'ACEITE ALTO OLEICO', 'ACEITE', 'MAICENA', 'SALSA TOMATE', 'CALDO CONGRIO', 'CIRUELA'
    ]
  },
  {
    id: 'condimentos',
    nombre: 'Condimentos y Especias',
    icon: 'grain',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    items: [
      'SAL', 'PIMIENTA NEGRA', 'AJO EN POLVO', 'AJO EN SALSA', 'OREGANO', 'AJI COLOR', 'CURRY', 'ROMERO', 'LAUREL', 'VINO BLANCO', 'BLACKENED SPICY', 'RUBB BRISKET', 'HUMO LIQUIDO', 'CONDIMENTOS'
    ]
  }
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
    id: 'pollo', 
    nombre: 'Pollo', 
    icon: 'kebab_dining', 
    color: 'text-yellow-500', 
    bg: 'bg-yellow-500/10', 
    items: [
      'AJI DE GALLINA', 'CANELON DE POLLO GRIEGO', 'CAZUELA DE POLLO UN', 'CORDON BLUE DE POLLO', 'ESCALOPA DE POLLO',
      'PECHUGA DE POLLO EN SALSA ARVEJADA', 'PECHUGA DE POLLO MILAN', 'PECHUGA DE POLLO SALSA ESCABECHADA',
      'PECHUGA POLLO PARRILLERA', 'PECHUGA POLLO PIAMONTES', 'POLLO A LA ESPAÑOLA', 'POLLO CHILINDRON',
      'POLLO CURRY MANI', 'POLLO ESPINACA QUESO DE CABRA', 'POLLO ORIENTAL', 'TRUTRO POLLO AL ROMERO',
      'TRUTRO A LA CHILENA', 'TRUTRO AL AJILLO', 'TRUTRO ALA COREANO', 'TRUTRO ALA TAMARINDO', 'TRUTRO BBQ',
      'TRUTRO DE ALA SWEET CHILI', 'TRUTRO DE POLLO A LA MOSTAZA', 'TRUTRO DE POLLO AL CHIMICHURRI',
      'TRUTRO DE POLLO AL JUGO', 'TRUTRO DE POLLO AL LIMON', 'TRUTRO DE POLLO AL OREGANO', 'TRUTRO DE POLLO ITALIANO',
      'TRUTRO FINAS HIERBAS', 'TRUTRO POLLLO AL COGNAC', 'TRUTRO POLLO AL MERKEN'
    ] 
  },
  { 
    id: 'pavo', 
    nombre: 'Pavo', 
    icon: 'restaurant', 
    color: 'text-orange-400', 
    bg: 'bg-orange-500/10', 
    items: [
      'PAVO EN SALSA DE CHAMPIGNON',
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

const DEFAULT_ACEITES = [
  { id: 'freidoras', nombre: 'Control de Freidoras', icon: 'water_drop', color: 'text-amber-400', bg: 'bg-amber-500/10', items: ['Freidora 1'] }
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

function formatName(str) {
  if (!str) return '';
  return str.split(' ').map(word => {
    if (word === 'UN' || word === 'BBQ') return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

export default function CalienteModule({ rol }) {
  const { t } = useTheme();
  const { user } = useAuth();
  const esAdmin = rol === 'admin' || rol === 'unico';
  
  const [activeTab, setActiveTab] = useState('materias');
  const [vista, setVista] = useState('diaria');
  const [fechaBase, setFechaBase] = useState(new Date());
  const [data, setData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  
  const lunesSemana = getLunes(fechaBase);
  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunesSemana, i));
  
  const [materiasState, setMateriasState] = useState(CATEGORIAS_MATERIAS_CALIENTE);
  const [acomState, setAcomState] = useState(PRODUCTOS_ACOMPANAMIENTOS);
  const [fondoState, setFondoState] = useState(PRODUCTOS_PLATOS_FONDO);
  const [aceitesState, setAceitesState] = useState(DEFAULT_ACEITES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Modales
  const [modalAddOpen, setModalAddOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [targetCatId, setTargetCatId] = useState(null);

  // Admin Edición
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState({ catId: null, originalCatId: null, oldName: '', newName: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const docRef = doc(db, 'trazabilidad_config', 'caliente');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const { materias, acom, fondo, aceites } = docSnap.data();
          
          let migratedMaterias = materias;
          if (materias) {
            const hasPrincipal = materias.some(c => c.id === 'principal');
            if (hasPrincipal) {
              migratedMaterias = CATEGORIAS_MATERIAS_CALIENTE;
              setMateriasState(CATEGORIAS_MATERIAS_CALIENTE);
            } else {
              setMateriasState(materias);
            }
          }

          let migratedFondo = fondo;
          if (fondo) {
            const hasAves = fondo.some(c => c.id === 'aves');
            if (hasAves) {
              migratedFondo = PRODUCTOS_PLATOS_FONDO;
              setFondoState(PRODUCTOS_PLATOS_FONDO);
            } else {
              setFondoState(fondo);
            }
          }

          if (acom) setAcomState(acom);
          if (aceites) setAceitesState(aceites);

          // Si hubo alguna migración, guardar en Firebase inmediatamente
          if ((materias && materias.some(c => c.id === 'principal')) || (fondo && fondo.some(c => c.id === 'aves'))) {
            setDoc(docRef, { 
              materias: migratedMaterias || CATEGORIAS_MATERIAS_CALIENTE, 
              acom: acom || acomState, 
              fondo: migratedFondo || PRODUCTOS_PLATOS_FONDO,
              aceites: aceites || aceitesState
            }, { merge: true });
          }
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

  const saveConfig = async (m, a, f, ac) => {
    try {
      const payload = { 
        materias: m || materiasState, 
        acom: a || acomState, 
        fondo: f || fondoState,
        aceites: ac || aceitesState
      };
      await setDoc(doc(db, 'trazabilidad_config', 'caliente'), payload, { merge: true });
    } catch (err) { console.error("Error al guardar config caliente:", err); }
  };

  const handleAddItem = () => {
    if (!newItemName.trim() || !targetCatId) return;
    
    let state, setState, type;
    if (activeTab === 'materias') { state = materiasState; setState = setMateriasState; type = 'materias'; }
    else if (activeTab === 'prod_acom') { state = acomState; setState = setAcomState; type = 'acom'; }
    else if (activeTab === 'prod_fondo') { state = fondoState; setState = setFondoState; type = 'fondo'; }
    else { state = aceitesState; setState = setAceitesState; type = 'aceites'; }

    const newState = state.map(cat => {
      if (cat.id !== targetCatId) return cat;
      return { ...cat, items: [...cat.items, newItemName.trim()] };
    });

    setState(newState);
    saveConfig(
      activeTab === 'materias' ? newState : null,
      activeTab === 'prod_acom' ? newState : null,
      activeTab === 'prod_fondo' ? newState : null,
      activeTab === 'aceites' ? newState : null
    );
    setNewItemName('');
    setModalAddOpen(false);
    toast.success("Item añade ✅");
  };

  const moveItem = (catId, originalIdx, dir) => {
    const state = activeTab === 'materias' ? materiasState : activeTab === 'prod_acom' ? acomState : activeTab === 'prod_fondo' ? fondoState : aceitesState;
    const setState = activeTab === 'materias' ? setMateriasState : activeTab === 'prod_acom' ? setAcomState : activeTab === 'prod_fondo' ? setFondoState : setAceitesState;
    
    const catIndex = state.findIndex(c => c.id === catId);
    if (catIndex === -1) return;
    
    const catItems = [...state[catIndex].items];
    const targetIdx = originalIdx + dir;
    if (targetIdx < 0 || targetIdx >= catItems.length) return;
    
    [catItems[originalIdx], catItems[targetIdx]] = [catItems[targetIdx], catItems[originalIdx]];
    
    const newState = [...state];
    newState[catIndex] = { ...newState[catIndex], items: catItems };
    
    setState(newState);
    saveConfig(activeTab === 'materias' ? newState : null, activeTab === 'prod_acom' ? newState : null, activeTab === 'prod_fondo' ? newState : null, activeTab === 'aceites' ? newState : null);
  };

  const handleEditItem = () => {
    if (!editingItem.newName.trim()) return;
    const { catId, originalCatId, oldName, newName } = editingItem;
    
    const state = activeTab === 'materias' ? materiasState : activeTab === 'prod_acom' ? acomState : activeTab === 'prod_fondo' ? fondoState : aceitesState;
    const setState = activeTab === 'materias' ? setMateriasState : activeTab === 'prod_acom' ? setAcomState : activeTab === 'prod_fondo' ? setFondoState : setAceitesState;
    
    let newState = [...state];
    if (catId === originalCatId) {
      const catIdx = newState.findIndex(c => c.id === catId);
      newState[catIdx].items = newState[catIdx].items.map(i => i === oldName ? newName.trim() : i);
    } else {
      const oldCatIdx = newState.findIndex(c => c.id === originalCatId);
      const newCatIdx = newState.findIndex(c => c.id === catId);
      newState[oldCatIdx].items = newState[oldCatIdx].items.filter(i => i !== oldName);
      newState[newCatIdx].items.push(newName.trim());
    }
    
    setState(newState);
    saveConfig(activeTab === 'materias' ? newState : null, activeTab === 'prod_acom' ? newState : null, activeTab === 'prod_fondo' ? newState : null, activeTab === 'aceites' ? newState : null);
    setModalEditOpen(false);
    toast.success("Item actualizado ✅");
  };

  const handleDeleteItem = (catId, itemName) => {
    if (confirmDeleteId !== `${catId}-${itemName}`) {
      setConfirmDeleteId(`${catId}-${itemName}`);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }
    
    const state = activeTab === 'materias' ? materiasState : activeTab === 'prod_acom' ? acomState : activeTab === 'prod_fondo' ? fondoState : aceitesState;
    const setState = activeTab === 'materias' ? setMateriasState : activeTab === 'prod_acom' ? setAcomState : activeTab === 'prod_fondo' ? setFondoState : setAceitesState;
    
    const newState = state.map(cat => {
      if (cat.id !== catId) return cat;
      return { ...cat, items: cat.items.filter(i => i !== itemName) };
    });
    
    setState(newState);
    saveConfig(activeTab === 'materias' ? newState : null, activeTab === 'prod_acom' ? newState : null, activeTab === 'prod_fondo' ? newState : null, activeTab === 'aceites' ? newState : null);
    setConfirmDeleteId(null);
    toast.success("Item eliminado 🗑️");
  };

  const handleGuardarDatos = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'trazabilidad_materias', 'caliente'), { ...data, updatedAt: new Date() });
      toast.success("Registros guardados ✅");
    } catch (err) { toast.error("Error al guardar"); }
    setSaving(false);
  };

  const handleOilChange = (item, dateKey, field, value) => {
    setData(prev => {
      const currentData = prev[item]?.[dateKey] || {};
      const parsedData = typeof currentData === 'object' ? { ...currentData } : {};
      
      let monitorName = user?.email?.split('@')[0] || '';
      if (user?.displayName) {
        const parts = user.displayName.trim().split(/\s+/);
        monitorName = parts.length >= 4 ? `${parts[0]} ${parts[2]}` : parts.length > 1 ? `${parts[0]} ${parts[1]}` : parts[0];
      }

      return {
        ...prev,
        [item]: {
          ...(prev[item] || {}),
          [dateKey]: { 
            ...parsedData, 
            [field]: value,
            monitor: parsedData.monitor !== undefined ? parsedData.monitor : monitorName
          }
        }
      };
    });
  };

  const handleClearDay = (item, dateKey) => {
    setData(prev => {
      const currentItemData = { ...(prev[item] || {}) };
      delete currentItemData[dateKey];
      return {
        ...prev,
        [item]: currentItemData
      };
    });
    toast.success("Registro vaciado 🧹");
  };

  const currentKey = toKey(fechaBase);

  const confirmExport = async () => {
    setShowAuditModal(false);
    const printId = `CAL-${Date.now().toString(36).toUpperCase()}`;
    const sections = activeTab === 'materias' ? ['materias'] : activeTab === 'aceites' ? ['aceites'] : ['prod_acom', 'prod_fondo'];
    const moduloNombre = activeTab === 'materias' ? 'Materias Primas Caliente' : activeTab === 'aceites' ? 'Control de Aceites' : 'Producción Completa Caliente';
    
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
      doc.text(activeTab === 'materias' ? "REGISTRO DE TRAZABILIDAD" : activeTab === 'aceites' ? "CONTROL DE ACEITES" : "REGISTRO DE PRODUCCION", 38, 18);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(activeTab === 'materias' ? "Trazabilidad de Materias Primas" : activeTab === 'aceites' ? "Planilla de Control Diario de Aceite en Freidora" : "Planilla de Producción Diaria", 38, 23);
      
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
        const seccionTitulo = s === 'materias' ? 'MATERIAS PRIMAS' : s === 'aceites' ? 'CONTROL DE ACEITE EN FREIDORA' : s === 'prod_acom' ? 'ACOMPAÑAMIENTOS' : 'PLATOS DE FONDO';
        doc.text(seccionTitulo, pageWidth / 2, currentY, { align: 'center' });

        // Tabla
        const state = s === 'materias' ? materiasState : s === 'aceites' ? aceitesState : s === 'prod_acom' ? acomState : fondoState;
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
        } else if (s === 'aceites') {
          head = [['Freidora', 'F. Cambio', 'Temp', 'Reactivo', 'Sólidos', 'Olor', 'Humo', 'Monitor', 'Observación']];
          body = [];
          state.forEach(cat => {
            cat.items.forEach(item => {
              const val = data[item]?.[currentKey];
              if (val && Object.keys(val).length > 0) {
                body.push([
                  item,
                  val.fechaCambio || '-',
                  val.temperatura ? `${val.temperatura} °C` : '-',
                  val.reactivo || '-',
                  val.solidos || '-',
                  val.malOlor || '-',
                  val.humoNegro || '-',
                  val.monitor || '-',
                  val.accion || '-'
                ]);
              }
            });
          });
          columnStyles = { 0: { cellWidth: 25 }, 1: { cellWidth: 20 }, 2: { cellWidth: 15 }, 8: { cellWidth: 35 } };
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
            { id: 'aceites', label: 'Control Aceites', icon: 'water_drop' },
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
                  {activeTab === 'materias' ? 'Materias Primas' : activeTab === 'prod_acom' ? 'Acompañamientos' : activeTab === 'aceites' ? 'Control de Aceites' : 'Platos de Fondo'}
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
            {esAdmin && activeTab !== 'aceites' && (
              <button onClick={() => { 
                const state = activeTab === 'materias' ? materiasState : activeTab === 'prod_acom' ? acomState : fondoState;
                setTargetCatId(state[0]?.id); 
                setModalAddOpen(true); 
              }} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span> NUEVO ITEM
              </button>
            )}
            {esAdmin && activeTab === 'aceites' && (
              <button onClick={() => { 
                setTargetCatId(aceitesState[0]?.id); 
                setModalAddOpen(true); 
              }} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span> NUEVA FREIDORA
              </button>
            )}
          </div>

          {vista === 'diaria' && (
            <div className="flex flex-col gap-10">
              {(activeTab === 'materias' ? materiasState : activeTab === 'prod_acom' ? acomState : activeTab === 'prod_fondo' ? fondoState : aceitesState).map(cat => {
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
                      {filtered.map((item, originalIdx) => (
                        <div 
                          key={item} 
                          className={`${t.bgCard} border ${t.border} rounded-3xl p-5 flex flex-col gap-5 hover:border-red-500/40 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-500 group relative overflow-hidden`}
                        >
                          {/* Glow Background */}
                          <div className={`absolute -top-24 -right-24 w-48 h-48 ${cat.bg ? cat.bg.replace('/10', '/5') : 'bg-red-500/5'} rounded-full blur-3xl group-hover:${cat.bg ? cat.bg.replace('/10', '/20') : 'bg-red-500/20'} transition-all duration-700 pointer-events-none`}></div>

                          {/* Header */}
                          <div className="flex items-center gap-3 w-full relative z-10">
                            {/* Icono de la categoría decorativo */}
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${cat.bg || 'bg-red-500/10'} ${cat.color || 'text-red-400'} border border-white/5 shadow-inner shrink-0`}>
                              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{cat.icon || 'restaurant'}</span>
                            </div>
                            
                            {/* Texto del Producto */}
                            <div className="flex-1">
                              <h4 className={`${t.text} text-[14px] font-black tracking-tight leading-tight drop-shadow-sm`}>
                                {formatName(item)}
                              </h4>
                              <span className={`text-[9px] uppercase tracking-widest ${activeTab === 'materias' ? 'text-cyan-400' : activeTab === 'aceites' ? 'text-amber-400' : 'text-orange-400'} opacity-70 font-bold`}>
                                {activeTab === 'materias' ? 'Ingreso (DD/MM)' : activeTab === 'aceites' ? 'Control Diario' : 'Cantidad'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Botonera de Admin Flotante (Solo visible en hover) */}
                          {esAdmin && !searchTerm && (
                            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-[#0f172a]/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-xl z-20 translate-y-2 group-hover:translate-y-0">
                              {activeTab !== 'aceites' && (
                                <>
                                  <button onClick={() => moveItem(cat.id, originalIdx, -1)} disabled={originalIdx === 0} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_upward</span></button>
                                  <button onClick={() => moveItem(cat.id, originalIdx, 1)} disabled={originalIdx === cat.items.length - 1} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_downward</span></button>
                                  <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
                                  <button onClick={() => { setEditingItem({ catId: cat.id, originalCatId: cat.id, oldName: item, newName: item }); setModalEditOpen(true); }} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/50 hover:text-blue-400 hover:bg-blue-500/20 transition-all"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span></button>
                                </>
                              )}
                              <button 
                                onClick={() => handleDeleteItem(cat.id, item)} 
                                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                                  confirmDeleteId === `${cat.id}-${item}` 
                                    ? "bg-red-600 text-white animate-pulse border-red-500" 
                                    : "text-white/50 hover:text-red-400 hover:bg-red-500/20 border-transparent"
                                }`}
                                title={confirmDeleteId === `${cat.id}-${item}` ? "Clic de nuevo para borrar" : "Eliminar"}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                  {confirmDeleteId === `${cat.id}-${item}` ? "priority_high" : "delete"}
                                </span>
                              </button>
                            </div>
                          )}
                          
                          {/* Divider */}
                          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent relative z-10"></div>
                          
                          {/* Input Area */}
                          {activeTab === 'aceites' ? (
                            <div className="flex flex-col gap-4 relative z-10 w-full mt-2">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-[9px] uppercase font-bold text-white/50 pl-1">Último Cambio</label>
                                  <input type="date" value={data[item]?.[currentKey]?.fechaCambio || ''} onChange={(e) => handleOilChange(item, currentKey, 'fechaCambio', e.target.value)} className={`w-full bg-black/20 ${t.text} text-center py-2.5 px-2 rounded-xl border ${t.border} focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 font-mono text-xs`} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-[9px] uppercase font-bold text-white/50 pl-1">Temp. (°C)</label>
                                  <input type="number" placeholder="Ej: 170" value={data[item]?.[currentKey]?.temperatura || ''} onChange={(e) => handleOilChange(item, currentKey, 'temperatura', e.target.value)} className={`w-full bg-black/20 ${t.text} text-center py-2.5 px-2 rounded-xl border ${t.border} focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 font-mono text-xs`} />
                                </div>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] uppercase font-bold text-white/50 pl-1">Evaluación Reactivo</label>
                                <select value={data[item]?.[currentKey]?.reactivo || ''} onChange={(e) => handleOilChange(item, currentKey, 'reactivo', e.target.value)} className={`w-full bg-black/20 ${t.text} text-center py-2.5 px-2 rounded-xl border ${t.border} focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 text-xs`}>
                                  <option className="bg-[#0f172a] text-white" value="">Seleccione...</option>
                                  <option className="bg-[#0f172a] text-white" value="1">1</option><option className="bg-[#0f172a] text-white" value="2">2</option><option className="bg-[#0f172a] text-white" value="3">3</option><option className="bg-[#0f172a] text-white" value="4">4</option><option className="bg-[#0f172a] text-white" value="5">5</option><option className="bg-[#0f172a] text-white" value="Sin reactivo">Sin reactivo</option>
                                </select>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                {['Sólidos', 'Mal Olor', 'Humo Negro'].map((f, idx) => {
                                  const keyMap = ['solidos', 'malOlor', 'humoNegro'][idx];
                                  const val = data[item]?.[currentKey]?.[keyMap] || '';
                                  return (
                                    <div key={keyMap} className="flex flex-col gap-1.5">
                                      <label className="text-[8px] uppercase font-bold text-white/50 text-center leading-tight h-6 flex items-center justify-center">{f}</label>
                                      <select value={val} onChange={(e) => handleOilChange(item, currentKey, keyMap, e.target.value)} className={`w-full bg-black/20 ${t.text} text-center py-2.5 px-1 rounded-xl border ${t.border} focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 text-xs`}>
                                        <option className="bg-[#0f172a] text-white" value="">-</option><option className="bg-[#0f172a] text-white" value="Sí">Sí</option><option className="bg-[#0f172a] text-white" value="No">No</option>
                                      </select>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] uppercase font-bold text-white/50 pl-1">Acción Correctiva / Obs.</label>
                                <input type="text" placeholder="N/A" value={data[item]?.[currentKey]?.accion || ''} onChange={(e) => handleOilChange(item, currentKey, 'accion', e.target.value)} className={`w-full bg-black/20 ${t.text} text-center py-2.5 px-2 rounded-xl border ${t.border} focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 text-xs`} />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] uppercase font-bold text-white/50 pl-1">Monitor</label>
                                <input type="text" placeholder="Nombre monitor" value={data[item]?.[currentKey]?.monitor !== undefined ? data[item]?.[currentKey]?.monitor : (user?.displayName || user?.email?.split('@')[0] || '')} onChange={(e) => handleOilChange(item, currentKey, 'monitor', e.target.value)} className={`w-full bg-black/20 ${t.text} text-center py-2.5 px-2 rounded-xl border ${t.border} focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 text-xs font-bold`} />
                              </div>
                              {Object.keys(data[item]?.[currentKey] || {}).some(k => data[item]?.[currentKey]?.[k]) && (
                                <button onClick={() => handleClearDay(item, currentKey)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em] mt-2 border border-red-500/20 active:scale-95">
                                  <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                                  Vaciar Registro
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex gap-3 relative z-10 w-full">
                              <div className="relative flex-1">
                                <input 
                                  type="text"
                                  placeholder={activeTab === 'materias' ? "30/04" : "0"}
                                  value={data[item]?.[currentKey] || ''}
                                  onChange={(e) => handleInputChange(item, currentKey, e.target.value)}
                                  className={`w-full bg-black/20 ${t.text} text-center py-3.5 pl-4 pr-4 rounded-2xl border ${t.border} focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 focus:bg-red-500/5 transition-all font-mono font-bold text-[15px] placeholder:opacity-30`}
                                />
                              </div>
                              <button 
                                title="Copiar del día anterior"
                                onClick={() => {
                                  const prev = addDays(fechaBase, -1);
                                  handleInputChange(item, currentKey, data[item]?.[toKey(prev)] || '');
                                }}
                                className={`w-14 flex items-center justify-center rounded-2xl bg-black/20 ${t.textSecondary} hover:text-red-400 hover:bg-red-500/10 border ${t.border} hover:border-red-500/30 transition-all active:scale-95 group/btn`}
                              >
                                <span className="material-symbols-outlined text-[20px] group-hover/btn:scale-110 transition-transform">content_copy</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VISTA SEMANAL - ACEITES */}
          {vista === 'semanal' && activeTab === 'aceites' && (
            <div className="flex flex-col gap-10">
              {aceitesState.map(cat => {
                const filtered = filterItems(cat.items);
                if (filtered.length === 0) return null;
                return (
                  <div key={cat.id} className={`${t.bgCard} border ${t.border} rounded-3xl p-6 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-12 h-12 rounded-2xl ${cat.bg || 'bg-amber-500/10'} flex items-center justify-center border border-amber-500/20`}>
                        <span className={`material-symbols-outlined ${cat.color || 'text-amber-400'}`} style={{ fontSize: 24 }}>{cat.icon || 'water_drop'}</span>
                      </div>
                      <h3 className={`text-xl font-black uppercase tracking-widest ${cat.color || 'text-amber-400'}`}>{cat.nombre}</h3>
                    </div>
                    
                    <div className="flex flex-col gap-8">
                      {filtered.map(item => (
                        <div key={item} className="flex flex-col gap-3">
                          <h4 className={`text-sm font-black uppercase tracking-widest ${t.text} pl-2 border-l-2 border-amber-500/50`}>{item}</h4>
                          <div className="overflow-x-auto pb-4 custom-scrollbar">
                            <table className="w-full text-left border-separate border-spacing-y-2">
                              <thead>
                                <tr className="text-[10px] uppercase tracking-widest text-white/50">
                                  <th className="px-2 py-2 font-black w-24">Día</th>
                                  <th className="px-2 py-2 font-black w-32 text-center">F. Cambio</th>
                                  <th className="px-2 py-2 font-black w-20 text-center">Temp (°C)</th>
                                  <th className="px-2 py-2 font-black w-24 text-center">Reactivo</th>
                                  <th className="px-2 py-2 font-black w-20 text-center">Sólidos</th>
                                  <th className="px-2 py-2 font-black w-20 text-center">Olor</th>
                                  <th className="px-2 py-2 font-black w-20 text-center">Humo</th>
                                  <th className="px-2 py-2 font-black">Acción / Obs.</th>
                                  <th className="px-2 py-2 font-black w-36">Monitor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {diasSemana.map(d => {
                                  const dayKey = toKey(d);
                                  const val = data[item]?.[dayKey] || {};
                                  const isHoy = dayKey === toKey(new Date());
                                  return (
                                    <tr key={dayKey} className={`group/row ${isHoy ? 'bg-blue-500/10' : 'bg-black/20 hover:bg-white/5'} transition-colors rounded-2xl`}>
                                      <td className={`px-4 py-3 rounded-l-2xl border-y border-l ${isHoy ? 'border-blue-500/30 text-blue-400' : `${t.border} ${t.textSecondary}`} text-xs font-bold whitespace-nowrap relative`}>
                                        <div className="flex items-center justify-between">
                                          <span>{DIAS[(d.getDay() + 6) % 7].slice(0, 3).toUpperCase()} {d.getDate()}</span>
                                          {Object.keys(val).length > 0 && (
                                            <button 
                                              onClick={() => handleClearDay(item, dayKey)} 
                                              className="opacity-0 group-hover/row:opacity-100 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 w-6 h-6 rounded-md flex items-center justify-center transition-all"
                                              title="Vaciar registro"
                                            >
                                              <span className="material-symbols-outlined text-[14px]">delete</span>
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                      <td className={`px-2 py-3 border-y ${isHoy ? 'border-blue-500/30' : t.border}`}>
                                        <input type="date" value={val.fechaCambio || ''} onChange={(e) => handleOilChange(item, dayKey, 'fechaCambio', e.target.value)} className={`w-full bg-transparent text-center text-[11px] font-mono focus:outline-none ${t.text}`} />
                                      </td>
                                      <td className={`px-2 py-3 border-y ${isHoy ? 'border-blue-500/30' : t.border}`}>
                                        <input type="number" placeholder="-" value={val.temperatura || ''} onChange={(e) => handleOilChange(item, dayKey, 'temperatura', e.target.value)} className={`w-full bg-transparent text-center text-xs font-mono focus:outline-none ${t.text}`} />
                                      </td>
                                      <td className={`px-2 py-3 border-y ${isHoy ? 'border-blue-500/30' : t.border}`}>
                                        <select value={val.reactivo || ''} onChange={(e) => handleOilChange(item, dayKey, 'reactivo', e.target.value)} className={`w-full bg-transparent text-center text-xs focus:outline-none appearance-none cursor-pointer ${t.text}`}>
                                          <option className="bg-[#0f172a] text-white" value="">-</option><option className="bg-[#0f172a] text-white" value="1">1</option><option className="bg-[#0f172a] text-white" value="2">2</option><option className="bg-[#0f172a] text-white" value="3">3</option><option className="bg-[#0f172a] text-white" value="4">4</option><option className="bg-[#0f172a] text-white" value="5">5</option><option className="bg-[#0f172a] text-white" value="Sin reactivo">Sin react</option>
                                        </select>
                                      </td>
                                      {['solidos', 'malOlor', 'humoNegro'].map((keyMap) => (
                                        <td key={keyMap} className={`px-2 py-3 border-y ${isHoy ? 'border-blue-500/30' : t.border}`}>
                                          <select value={val[keyMap] || ''} onChange={(e) => handleOilChange(item, dayKey, keyMap, e.target.value)} className={`w-full bg-transparent text-center text-xs focus:outline-none appearance-none cursor-pointer ${t.text}`}>
                                            <option className="bg-[#0f172a] text-white" value="">-</option><option className="bg-[#0f172a] text-white" value="Sí">Sí</option><option className="bg-[#0f172a] text-white" value="No">No</option>
                                          </select>
                                        </td>
                                      ))}
                                      <td className={`px-2 py-3 border-y ${isHoy ? 'border-blue-500/30' : t.border}`}>
                                        <input type="text" placeholder="N/A" value={val.accion || ''} onChange={(e) => handleOilChange(item, dayKey, 'accion', e.target.value)} className={`w-full bg-transparent text-xs focus:outline-none pl-2 ${t.text}`} />
                                      </td>
                                      <td className={`px-2 py-3 rounded-r-2xl border-y border-r ${isHoy ? 'border-blue-500/30' : t.border}`}>
                                        <input type="text" placeholder="-" value={val.monitor || ''} onChange={(e) => handleOilChange(item, dayKey, 'monitor', e.target.value)} className={`w-full bg-transparent text-xs focus:outline-none font-bold pl-2 ${t.text}`} />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal de Edición de Item */}
          {modalEditOpen && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className={`${t.bgCard} border ${t.border} rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300`}>
                <h3 className="text-white text-xl font-black mb-6 uppercase tracking-tight">Editar {activeTab === 'aceites' ? 'Freidora' : 'Item'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block tracking-widest">Nombre {activeTab === 'aceites' ? 'de la Freidora' : 'del Producto'}</label>
                    <input type="text" value={editingItem.newName} onChange={(e) => setEditingItem({...editingItem, newName: e.target.value})} className={`w-full ${t.bgInput} text-white p-4 rounded-2xl border ${t.border} focus:border-red-500 font-bold`} placeholder={activeTab === 'aceites' ? 'Ej: Freidora 2' : 'Ej: Salsa de Tomate'} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block tracking-widest">Categoría</label>
                    <select value={editingItem.catId} onChange={(e) => setEditingItem({...editingItem, catId: e.target.value})} className={`w-full ${t.bgInput} text-white p-4 rounded-2xl border ${t.border} focus:border-red-500 font-bold`}>
                      {(activeTab === 'materias' ? materiasState : activeTab === 'prod_acom' ? acomState : activeTab === 'prod_fondo' ? fondoState : aceitesState).map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button onClick={() => setModalEditOpen(false)} className={`flex-1 py-4 rounded-2xl ${t.bgInput} text-white font-bold hover:bg-white/5`}>Cancelar</button>
                  <button onClick={handleEditItem} className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-500/30">Guardar Cambios</button>
                </div>
              </div>
            </div>
          )}

          {modalAddOpen && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className={`${t.bgCard} border ${t.border} rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300`}>
                <h3 className="text-white text-xl font-black mb-6 uppercase tracking-tight">Agregar {activeTab === 'aceites' ? 'Nueva Freidora' : 'Nuevo Item'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block tracking-widest">Nombre {activeTab === 'aceites' ? 'de la Freidora' : 'del Producto'}</label>
                    <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className={`w-full ${t.bgInput} text-white p-4 rounded-2xl border ${t.border} focus:border-red-500 font-bold`} placeholder={activeTab === 'aceites' ? 'Ej: Freidora 2' : 'Ej: Salsa de Tomate'} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block tracking-widest">Categoría</label>
                    <select value={targetCatId} onChange={(e) => setTargetCatId(e.target.value)} className={`w-full ${t.bgInput} text-white p-4 rounded-2xl border ${t.border} focus:border-red-500 font-bold`}>
                      {(activeTab === 'materias' ? materiasState : activeTab === 'prod_acom' ? acomState : activeTab === 'prod_fondo' ? fondoState : aceitesState).map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
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
