import { useState } from "react";
import * as XLSX from "xlsx";
import { db, auth } from "../firebase/config";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";

export default function ImportExportModal({ onClose }) {
  const { t } = useTheme();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [resultado, setResultado] = useState(null);

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setResultado(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      // Obtener códigos existentes en Merma
      const mermaSnap = await getDocs(collection(db, "merma"));
      const codigosExistentes = new Set(
        mermaSnap.docs.map(d => d.data().codigo?.toString().trim().toLowerCase()).filter(Boolean)
      );

      let agregados = 0;
      let errores = 0;
      const listaDuplicados = [];

      for (const row of rows) {
        const codigo = row["codigo"]?.toString().trim() || row["Codigo"]?.toString().trim();
        const nombre = row["nombre"]?.toString().trim() || row["Nombre"]?.toString().trim();
        const categoria = row["categoria"]?.toString().trim() || row["Categoria"]?.toString().trim() || "Otros";
        const unidadMedida = row["unidadMedida"]?.toString().trim() || row["sap"]?.toString().trim() || "";

        if (!codigo || !nombre) {
          errores++;
          continue;
        }

        if (codigosExistentes.has(codigo.toLowerCase())) {
          listaDuplicados.push({ codigo, nombre });
          continue;
        }

        await addDoc(collection(db, "merma"), {
          codigo,
          nombre,
          categoria,
          unidadMedida,
          creadoPor: auth.currentUser?.uid,
          fechaCreacion: serverTimestamp(),
        });
        agregados++;
        codigosExistentes.add(codigo.toLowerCase());
      }

      setResultado({ agregados, errores, listaDuplicados });
    } catch (err) {
      setResultado({ error: "Error al leer el archivo" });
    }

    setImporting(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const snapshot = await getDocs(collection(db, "merma"));
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          codigo: d.codigo || "",
          nombre: d.nombre || "",
          categoria: d.categoria || "",
          unidadMedida: d.unidadMedida || "",
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Merma");
      XLSX.writeFile(workbook, "merma_export.xlsx");
    } catch (err) {
      console.error("Error al exportar", err);
    }
    setExporting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className={`${t.bgCard} rounded-2xl p-6 w-full max-w-md shadow-xl`}>
        <h2 className={`${t.text} text-xl font-bold mb-6`}>📂 Importar / Exportar</h2>

        <div className="mb-6">
          <h3 className={`${t.text} font-semibold mb-2`}>📥 Importar desde Excel</h3>
          <p className={`${t.textSecondary} text-sm mb-3`}>
            El Excel debe tener columnas: <span className="text-blue-400">codigo, nombre</span> (categoria y unidadMedida son opcionales). Los códigos duplicados serán ignorados.
          </p>
          <label className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center cursor-pointer ${importing ? "opacity-50 cursor-not-allowed" : ""}`}>
            {importing ? "Importando..." : "Seleccionar archivo Excel"}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImport}
              className="hidden"
              disabled={importing}
            />
          </label>

          {resultado && (
            <div className={`mt-3 p-3 rounded-lg ${t.bgInput}`}>
              {resultado.error ? (
                <p className="text-red-400 text-sm">{resultado.error}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-green-400 text-sm">✅ {resultado.agregados} productos agregados</p>
                  {resultado.errores > 0 && <p className="text-red-400 text-sm">❌ {resultado.errores} filas con error</p>}
                  {resultado.listaDuplicados?.length > 0 && (
                    <div>
                      <p className="text-yellow-400 text-sm mb-2">⚠️ {resultado.listaDuplicados.length} duplicados ignorados:</p>
                      <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
                        {resultado.listaDuplicados.map((d, i) => (
                          <div key={i} className={`${t.bgCard} rounded-lg px-3 py-2`}>
                            <p className={`${t.text} text-xs font-semibold`}>{d.nombre}</p>
                            <p className={`${t.textSecondary} text-xs`}>Código: {d.codigo}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className={`${t.text} font-semibold mb-2`}>📤 Exportar a Excel</h3>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {exporting ? "Exportando..." : "Descargar Excel"}
          </button>
        </div>

        <button
          onClick={onClose}
          className={`w-full ${t.bgInput} ${t.hover} ${t.text} font-semibold py-3 rounded-lg transition`}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}