import * as XLSX from "xlsx";

export function exportarFichaExcel(ficha) {
  const wb = XLSX.utils.book_new();

  // Hoja 1 - General
  const general = [
    ["FICHA TECNICA", ""],
    ["Nombre", ficha.nombre],
    ["Código", ficha.codigo],
    ["Sección", ficha.seccion],
    ["Porciones", ficha.porciones],
    ["Tiempo Preparación", ficha.tiempoPreparacion],
    ["Foto Principal", ficha.foto],
  ];
  const wsGeneral = XLSX.utils.aoa_to_sheet(general);
  XLSX.utils.book_append_sheet(wb, wsGeneral, "General");

  // Hoja 2 - Materia Prima
  const mp = [["Ingrediente", "Cantidad Bruta", "Cantidad Neta", "Unidad"]];
  (ficha.materiasPrimas || []).forEach((m) => mp.push([m.nombre, m.cantidadBruta, m.cantidadNeta, m.unidad]));
  const wsMp = XLSX.utils.aoa_to_sheet(mp);
  XLSX.utils.book_append_sheet(wb, wsMp, "Materia Prima");

  // Hoja 3 - Elementos Decorativos
  const ed = [["Elemento", "Cantidad Bruta", "Cantidad Neta"]];
  (ficha.elementosDecorativos || []).forEach((e) => ed.push([e.nombre, e.cantidadBruta, e.cantidadNeta]));
  const wsEd = XLSX.utils.aoa_to_sheet(ed);
  XLSX.utils.book_append_sheet(wb, wsEd, "Elementos Decorativos");

  // Hoja 4 - Proceso
  const proceso = [
    ["Descripción del Proceso", ficha.descripcionProceso],
    ["", ""],
    ["Temp. Cocción", ficha.tempCoccion],
    ["Temp. Enfriado", ficha.tempEnfriado],
    ["Temp. Almacenamiento", ficha.tempAlmacenamiento],
    ["Vida Útil Granel", ficha.vidaUtilGrado],
    ["Vida Útil Vacío", ficha.vidaUtilVacio],
    ["Vida Útil Anaquel", ficha.vidaUtilAnaquel],
  ];
  const wsProceso = XLSX.utils.aoa_to_sheet(proceso);
  XLSX.utils.book_append_sheet(wb, wsProceso, "Proceso");

  // Hoja 5 - Envases
  const envases = [["Descripción", "Código SAP", "Cant. Batch/UN", "Peso Envase (kg)"]];
  (ficha.envases || []).forEach((e) => envases.push([e.descripcion, e.codigoSap, e.cantidad, e.pesoEnvase]));
  const wsEnvases = XLSX.utils.aoa_to_sheet(envases);
  XLSX.utils.book_append_sheet(wb, wsEnvases, "Envases");

  // Hoja 6 - Formatos de Venta
  const formatos = [["Cod. SAP", "Descripción", "N° Envase", "Peso (kg)", "Cod. Barra / Marcación"]];
  (ficha.formatosVenta || []).forEach((f) => formatos.push([f.codSap, f.descripcion, f.numEnvase, f.pesoProducto, f.codBarra]));
  const wsFormatos = XLSX.utils.aoa_to_sheet(formatos);
  XLSX.utils.book_append_sheet(wb, wsFormatos, "Formatos de Venta");

  // Hoja 7 - Revisiones
  const revisiones = [["N° Revisión", "Fecha", "Descripción del Cambio"]];
  (ficha.revisiones || []).forEach((r) => revisiones.push([r.numero, r.fecha, r.descripcion]));
  const wsRevisiones = XLSX.utils.aoa_to_sheet(revisiones);
  XLSX.utils.book_append_sheet(wb, wsRevisiones, "Revisiones");

  XLSX.writeFile(wb, `${ficha.nombre || "ficha"}.xlsx`);
}

export function importarFichaExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "binary" });

        const general = XLSX.utils.sheet_to_json(wb.Sheets["General"], { header: 1 });
        const mp = XLSX.utils.sheet_to_json(wb.Sheets["Materia Prima"], { header: 1 }).slice(1);
        const ed = XLSX.utils.sheet_to_json(wb.Sheets["Elementos Decorativos"], { header: 1 }).slice(1);
        const proceso = XLSX.utils.sheet_to_json(wb.Sheets["Proceso"], { header: 1 });
        const envases = XLSX.utils.sheet_to_json(wb.Sheets["Envases"], { header: 1 }).slice(1);
        const formatos = XLSX.utils.sheet_to_json(wb.Sheets["Formatos de Venta"], { header: 1 }).slice(1);
        const revisiones = XLSX.utils.sheet_to_json(wb.Sheets["Revisiones"], { header: 1 }).slice(1);

        const ficha = {
          nombre: general[1]?.[1] || "",
          codigo: general[2]?.[1] || "",
          seccion: general[3]?.[1] || "",
          porciones: general[4]?.[1] || "",
          tiempoPreparacion: general[5]?.[1] || "",
          foto: general[6]?.[1] || "",
          descripcionProceso: proceso[0]?.[1] || "",
          tempCoccion: proceso[2]?.[1] || "",
          tempEnfriado: proceso[3]?.[1] || "",
          tempAlmacenamiento: proceso[4]?.[1] || "",
          vidaUtilGrado: proceso[5]?.[1] || "",
          vidaUtilVacio: proceso[6]?.[1] || "",
          vidaUtilAnaquel: proceso[7]?.[1] || "",
          materiasPrimas: mp.map((r) => ({ nombre: r[0] || "", cantidadBruta: r[1] || "", cantidadNeta: r[2] || "", unidad: r[3] || "" })),
          elementosDecorativos: ed.map((r) => ({ nombre: r[0] || "", cantidadBruta: r[1] || "", cantidadNeta: r[2] || "" })),
          envases: envases.map((r) => ({ descripcion: r[0] || "", codigoSap: r[1] || "", cantidad: r[2] || "", pesoEnvase: r[3] || "" })),
          formatosVenta: formatos.map((r) => ({ codSap: r[0] || "", descripcion: r[1] || "", numEnvase: r[2] || "", pesoProducto: r[3] || "", codBarra: r[4] || "" })),
          revisiones: revisiones.map((r) => ({ numero: r[0] || "", fecha: r[1] || "", descripcion: r[2] || "" })),
          fotosExtra: [""],
        };

        resolve(ficha);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}