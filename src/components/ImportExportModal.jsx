import { useState } from "react";
import * as XLSX from "xlsx";
import { db, auth } from "../firebase/config";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";

export default function ImportExportModal({ onClose }) {
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

      let agregados = 0;
      let errores = 0;

      for (const row of rows) {
        const codigo = row["codigo"]?.toString().trim();
        const nombre = row["nombre"]?.toString().trim();
        const categoria = row["categoria"]?.toString().trim() || "";
        const sap = row["sap"]?.toString().trim() || "";

        if (!codigo || !nombre) {
          errores++;
          continue;
        }

        await addDoc(collection(db, "merma"), {
          codigo,
          nombre,
          categoria,
          sap,
          creadoPor: auth.currentUser?.uid,
          fechaCreacion: serverTimestamp(),
        });
        agregados++;
      }

      setResultado({ agregados, errores });
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
          sap: d.sap || "",
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
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-white text-xl font-bold mb-6">📂 Importar / Exportar</h2>

        <div className="mb-6">
          <h3 className="text-gray-300 font-semibold mb-2">📥 Importar desde Excel</h3>
          <p className="text-gray-400 text-sm mb-3">
            El Excel debe tener columnas: <span className="text-blue-400">codigo, nombre</span> (categoria y sap son opcionales)
          </p>
          <label className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center cursor-pointer">
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
            <div className="mt-3 p-3 rounded-lg bg-gray-700">
              {resultado.error ? (
                <p className="text-red-400 text-sm">{resultado.error}</p>
              ) : (
                <p className="text-green-400 text-sm">
                  ✅ {resultado.agregados} productos importados
                  {resultado.errores > 0 && ` · ⚠️ ${resultado.errores} filas con error`}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="text-gray-300 font-semibold mb-2">📤 Exportar a Excel</h3>
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
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}