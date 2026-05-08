import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import CoccionEnfriadoModule from './CoccionEnfriadoModule';
import SanitizacionModule from './SanitizacionModule';

export default function FrioModule({ rol }) {
  const { t } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('materias');
  const [fechaBase, setFechaBase] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});
  
  // Placeholders
  const [itemsMaterias, setItemsMaterias] = useState(['Insumo 1', 'Insumo 2']);
  const [itemsProduccion, setItemsProduccion] = useState(['Producto A', 'Producto B']);

  const toKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const currentKey = toKey(fechaBase);

  useEffect(() => {
    const coll = activeTab === 'materias' ? 'trazabilidad_materias' : 'trazabilidad_produccion';
    const unsub = onSnapshot(doc(db, coll, 'frio'), (snap) => {
      if (snap.exists()) setData(snap.data());
      setLoading(false);
    });
    return () => unsub();
  }, [activeTab]);

  const handleInputChange = (item, value) => {
    let finalValue = value;
    if (activeTab === 'materias') {
      finalValue = value.replace(/\D/g, '');
      if (finalValue.length > 4) finalValue = finalValue.slice(0, 4);
      if (finalValue.length > 2) finalValue = `${finalValue.slice(0, 2)}/${finalValue.slice(2)}`;
    }
    setData(prev => ({
      ...prev,
      [item]: { ...(prev[item] || {}), [currentKey]: finalValue }
    }));
  };

  const handleSaveChecklist = async () => {
    const coll = activeTab === 'materias' ? 'trazabilidad_materias' : 'trazabilidad_produccion';
    try {
      await setDoc(doc(db, coll, 'frio'), { ...data, updatedAt: new Date(), updatedBy: user?.email });
      toast.success("Registros guardados ✅");
    } catch (err) { toast.error("Error al guardar"); }
  };

  const renderChecklist = (items, colorClass, icon) => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl ${colorClass.replace('text-', 'bg-')}/20 ${colorClass} flex items-center justify-center shadow-lg border ${colorClass.replace('text-', 'border-')}/20`}><span className="material-symbols-outlined" style={{ fontSize: 32 }}>{icon}</span></div>
          <div><h1 className={`${t.text} text-2xl font-black tracking-tight leading-none mb-1 uppercase`}>{activeTab === 'materias' ? 'Materias Primas' : 'Producción'}</h1><p className={`${t.textSecondary} text-[10px] uppercase font-black tracking-[0.2em] opacity-60`}>Cuarto Frío</p></div>
        </div>
        <div className="flex items-center gap-4">
          <h2 className={`${t.text} text-base font-bold tracking-tight uppercase`}>{fechaBase.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setFechaBase(new Date(fechaBase.setDate(fechaBase.getDate() - 1)))} className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary} hover:${colorClass} transition-all shadow-sm`}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span></button>
            <button onClick={() => setFechaBase(new Date(fechaBase.setDate(fechaBase.getDate() + 1)))} className={`w-9 h-9 flex items-center justify-center rounded-lg ${t.bgCard} border ${t.border} ${t.textSecondary} hover:${colorClass} transition-all shadow-sm`}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span></button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item} className={`${t.bgCard} border ${t.border} rounded-2xl p-4 flex items-center justify-between group hover:${colorClass.replace('text-', 'border-')}/30 transition-all`}>
            <span className={`${t.text} font-bold text-sm`}>{item}</span>
            <input type="text" placeholder={activeTab === 'materias' ? 'DD/MM' : 'Cant.'} value={data[item]?.[currentKey] || ''} onChange={(e) => handleInputChange(item, e.target.value)} className={`w-20 ${t.bgInput} ${t.text} text-center p-2 rounded-xl border ${t.border} focus:${colorClass.replace('text-', 'border-')} font-bold text-xs`} />
          </div>
        ))}
      </div>
      <div className="fixed bottom-10 right-10 z-[100]"><button onClick={handleSaveChecklist} className={`px-8 py-4 rounded-2xl ${colorClass.replace('text-', 'bg-').replace('/10', '')} bg-opacity-100 text-white font-black shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3`} style={{ backgroundColor: activeTab === 'materias' ? '#06b6d4' : '#a855f7' }}><span className="material-symbols-outlined">save</span> Guardar</button></div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className={`flex p-1.5 rounded-2xl ${t.bgCard} border ${t.border} w-fit shadow-xl overflow-x-auto`}>
          {['materias', 'produccion', 'pcc', 'sanitizacion'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${activeTab === tab ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/30 scale-105' : `${t.textSecondary} hover:${t.text}`}`}>
              <span className="material-symbols-outlined text-base">{tab === 'materias' ? 'inventory_2' : tab === 'produccion' ? 'precision_manufacturing' : tab === 'pcc' ? 'thermostat' : 'clean_hands'}</span>
              {tab === 'materias' ? 'Materias Primas' : tab === 'produccion' ? 'Producción' : tab === 'pcc' ? 'PCC Cocción' : 'PCC Sanitización'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'materias' && renderChecklist(itemsMaterias, 'text-cyan-400', 'inventory_2')}
      {activeTab === 'produccion' && renderChecklist(itemsProduccion, 'text-purple-400', 'precision_manufacturing')}
      {activeTab === 'pcc' && <CoccionEnfriadoModule rol={rol} cuarto="Frío" />}
      {activeTab === 'sanitizacion' && <SanitizacionModule rol={rol} cuarto="Frío" />}
    </div>
  );
}
