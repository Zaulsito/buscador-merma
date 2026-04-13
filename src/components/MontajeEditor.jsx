import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import toast from "react-hot-toast";

// ── Configuración por defecto ─────────────────────────────────────────────
const DEFAULT_AM = {
  vapor: [
    { id: 1, producto: "HUEVOS REVUELTOS" },
    { id: 2, producto: "HUEVOS + JAMÓN" },
    { id: 3, producto: "TOCINO" },
    { id: 4, producto: "BRATWURST" },
    { id: 5, producto: "OMELETTE 1" },
    { id: 6, producto: "OMELETTE 2" },
    { id: 7, producto: "SOPAIPILLAS" },
    { id: 8, producto: "HASH BROWN" },
  ],
  maria: [
    { id: 9,  producto: "TORTILLA VARIEDAD" },
    { id: 10, producto: "ORZO CHERRY" },
    { id: 11, producto: "SOPAIPILLAS PASADAS" },
    { id: 12, producto: "CHURROS" },
    { id: 13, producto: "CALZONES ROTOS" },
    { id: 14, producto: "TAPA" },
    { id: 15, producto: "TAPA" },
    { id: 16, producto: "TAPA" },
    { id: 17, producto: "TAPA" },
    { id: 18, producto: "TAPA" },
    { id: 19, producto: "TAPA" },
  ],
};

const DEFAULT_PM = {
  vapor: [
    { id: 1, producto: "HUEVOS REVUELTOS" },
    { id: 2, producto: "OMELETTE 1" },
    { id: 3, producto: "OMELETTE 2" },
    { id: 4, producto: "TOCINO" },
    { id: 5, producto: "HASH BROWN" },
    { id: 6, producto: "ORZO CHERRY" },
    { id: 7, producto: "BAKED POTATO" },
    { id: 8, producto: "HUEVOS FRITOS C/ CEBOLLA" },
  ],
  maria: [
    { id: 9,  producto: "EMPANADAS" },
    { id: 10, producto: "SOPAIPILLAS" },
    { id: 11, producto: "SOPAIPILLAS PASADAS" },
    { id: 12, producto: "TAPA" },
    { id: 13, producto: "TAPA" },
    { id: 14, producto: "TAPA" },
    { id: 15, producto: "TAPA" },
    { id: 16, producto: "TAPA" },
    { id: 17, producto: "TAPA" },
    { id: 18, producto: "TAPA" },
  ],
};

const TURNO_INFO = {
  am: { label: "AM — Desayuno", icon: "free_breakfast", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", default: DEFAULT_AM },
  pm: { label: "PM — Once",     icon: "coffee",          color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", default: DEFAULT_PM },
};

// ── Slot individual ───────────────────────────────────────────────────────
function Slot({ slot, linea, esAdmin, onChange }) {
  const { t } = useTheme();
  const esTapa = slot.producto?.toUpperCase() === "TAPA" || !slot.producto;
  const isVapor = linea === "vapor";

  return (
    <div className={`relative flex flex-col min-h-[110px] rounded-xl border transition-all ${
      esTapa
        ? `${t.isDark ? "bg-white/[0.02]" : "bg-slate-50/50"} border-dashed ${t.border} opacity-60`
        : `${t.bgCard} ${isVapor ? "border-l-2 border-l-amber-400/50" : "border-l-2 border-l-blue-400/60"} ${t.border}`
    }`}>
      {/* Número de slot */}
      <div className="flex items-center justify-between px-3 pt-2.5">
        <span className={`text-[9px] font-black uppercase tracking-widest ${t.textSecondary} opacity-60`}>
          #{String(slot.id).padStart(2, "0")}
        </span>
        {!esTapa && (
          <span className={`w-1.5 h-1.5 rounded-full ${isVapor ? "bg-amber-400" : "bg-blue-400"}`} />
        )}
      </div>

      {/* Producto — rotado verticalmente para emular la imagen */}
      <div className="flex-1 flex items-center justify-center px-2 py-2">
        {esAdmin ? (
          <input
            value={slot.producto || ""}
            onChange={e => onChange(slot.id, e.target.value)}
            className={`w-full text-center text-[10px] font-black uppercase tracking-wider bg-transparent border-b ${
              esTapa ? `${t.border} ${t.textSecondary}` : `border-blue-500/30 ${t.text}`
            } outline-none focus:border-blue-400 py-1 placeholder-slate-500`}
            placeholder="TAPA"
          />
        ) : (
          <p className={`text-[10px] font-black uppercase tracking-wider text-center leading-tight ${
            esTapa ? t.textSecondary : t.text
          }`}>
            {slot.producto || "TAPA"}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────
export default function MontajeEditor({ esAdmin, user }) {
  const { t } = useTheme();
  const [turno, setTurno] = useState("am");
  const [configs, setConfigs] = useState({ am: null, pm: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // ── Local state del turno activo (editable) ──
  const [localConfig, setLocalConfig] = useState(null);

  // ── Listeners Firestore ──
  useEffect(() => {
    const unsubs = ["am", "pm"].map(t => {
      return onSnapshot(doc(db, "montaje_turnos", t), snap => {
        const data = snap.exists() ? snap.data() : { vapor: TURNO_INFO[t].default.vapor, maria: TURNO_INFO[t].default.maria };
        setConfigs(prev => ({ ...prev, [t]: data }));
        setLoading(false);
      });
    });
    return () => unsubs.forEach(u => u());
  }, []);

  // Sincronizar localConfig cuando cambia el turno o llegan datos
  useEffect(() => {
    if (configs[turno]) {
      setLocalConfig(JSON.parse(JSON.stringify(configs[turno])));
      setHasChanges(false);
    }
  }, [turno, configs]);

  const handleChange = (linea, id, value) => {
    setLocalConfig(prev => ({
      ...prev,
      [linea]: prev[linea].map(s => s.id === id ? { ...s, producto: value.toUpperCase() } : s),
    }));
    setHasChanges(true);
  };

  const addSlot = (linea) => {
    const nextId = Math.max(...localConfig[linea].map(s => s.id), 0) + 1;
    setLocalConfig(prev => ({
      ...prev,
      [linea]: [...prev[linea], { id: nextId, producto: "TAPA" }],
    }));
    setHasChanges(true);
  };

  const removeSlot = (linea, id) => {
    if (localConfig[linea].length <= 1) return;
    setLocalConfig(prev => ({
      ...prev,
      [linea]: prev[linea].filter(s => s.id !== id),
    }));
    setHasChanges(true);
  };

  const guardar = async () => {
    if (!localConfig) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "montaje_turnos", turno), {
        ...localConfig,
        updatedAt: serverTimestamp(),
        updatedBy: user?.displayName || user?.email || "Usuario",
      });
      setHasChanges(false);
      toast.success(`Turno ${TURNO_INFO[turno].label} guardado ✅`);
    } catch { toast.error("Error al guardar"); }
    setSaving(false);
  };

  const resetear = () => {
    setLocalConfig(JSON.parse(JSON.stringify({
      vapor: TURNO_INFO[turno].default.vapor,
      maria: TURNO_INFO[turno].default.maria,
    })));
    setHasChanges(true);
  };

  if (loading || !localConfig) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const info = TURNO_INFO[turno];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className={`${t.text} text-xl font-extrabold`}>Guías de Montaje — Baño María</h2>
          <p className={`${t.textSecondary} text-sm mt-0.5`}>Configura los slots de cada línea por turno</p>
        </div>

        {/* Selector de turno */}
        <div className={`flex p-1 ${t.bgCard} border ${t.border} rounded-xl gap-1`}>
          {Object.entries(TURNO_INFO).map(([key, inf]) => (
            <button key={key} onClick={() => setTurno(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${
                turno === key ? `${inf.bg} ${inf.color} shadow` : `${t.textSecondary} hover:${t.text}`
              }`}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>{inf.icon}</span>
              {inf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Línea A Vapor */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <h3 className={`${t.textSecondary} text-[11px] font-black uppercase tracking-[0.2em]`}>
              Línea A Vapor · {localConfig.vapor.length} slots
            </h3>
          </div>
          {esAdmin && (
            <button onClick={() => addSlot("vapor")}
              className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add_circle</span>
              Agregar slot
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
          {localConfig.vapor.map(slot => (
            <div key={slot.id} className="relative group/slot">
              <Slot slot={slot} linea="vapor" esAdmin={esAdmin} onChange={(id, val) => handleChange("vapor", id, val)} />
              {esAdmin && localConfig.vapor.length > 1 && (
                <button onClick={() => removeSlot("vapor", slot.id)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white opacity-0 group-hover/slot:opacity-100 transition flex items-center justify-center">
                  <span className="material-symbols-outlined" style={{ fontSize: 10 }}>close</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Línea María / Caliente */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <h3 className={`${t.textSecondary} text-[11px] font-black uppercase tracking-[0.2em]`}>
              Línea María / Caliente · {localConfig.maria.length} slots
            </h3>
          </div>
          {esAdmin && (
            <button onClick={() => addSlot("maria")}
              className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add_circle</span>
              Agregar slot
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
          {localConfig.maria.map(slot => (
            <div key={slot.id} className="relative group/slot">
              <Slot slot={slot} linea="maria" esAdmin={esAdmin} onChange={(id, val) => handleChange("maria", id, val)} />
              {esAdmin && localConfig.maria.length > 1 && (
                <button onClick={() => removeSlot("maria", slot.id)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white opacity-0 group-hover/slot:opacity-100 transition flex items-center justify-center">
                  <span className="material-symbols-outlined" style={{ fontSize: 10 }}>close</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Leyenda + acciones */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t ${t.border}`}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className={`${t.textSecondary} text-xs`}>Línea A Vapor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span className={`${t.textSecondary} text-xs`}>Línea María</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full border border-dashed ${t.isDark ? "border-slate-500" : "border-slate-300"}`} />
            <span className={`${t.textSecondary} text-xs`}>TAPA (vacío)</span>
          </div>
          <span className={`${t.textSecondary} text-xs`}>
            Total: {localConfig.vapor.length + localConfig.maria.length} slots
          </span>
        </div>

        {esAdmin && (
          <div className="flex items-center gap-3">
            <button onClick={resetear}
              className={`px-4 py-2 rounded-xl text-xs font-bold border ${t.bgInput} ${t.border} ${t.textSecondary} hover:text-blue-400 transition`}>
              Restablecer default
            </button>
            <button onClick={guardar} disabled={saving || !hasChanges}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition shadow-lg ${
                hasChanges
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                  : `${t.bgInput} ${t.border} border ${t.textSecondary} opacity-50 cursor-not-allowed`
              }`}>
              {saving
                ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Guardando...</>
                : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span> Guardar turno {turno.toUpperCase()}</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
