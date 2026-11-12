import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import toast from "react-hot-toast";
import { calcEan13CheckDigit, buildEan13Modules } from "../utils/ean13Utils";
import { getPrecioProducto } from "../utils/precioUtils";

/**
 * Componente SVG para renderizar el código de barras EAN-13 con calidad vectorial.
 */
export function Ean13BarcodeSvg({ code13, className = "", scale = 1, showText = true }) {
  const modules = useMemo(() => buildEan13Modules(code13), [code13]);

  if (!modules || code13.length !== 13) {
    return (
      <div className="flex items-center justify-center p-4 bg-slate-800/50 rounded-xl border border-dashed border-slate-700 text-slate-400 text-xs">
        Código inválido (se requieren 13 dígitos numéricos)
      </div>
    );
  }

  const moduleWidth = 2.4;
  const quietLeft = 20;
  const dataHeight = 62;
  const guardHeight = 74;
  const totalWidth = quietLeft + modules.length * moduleWidth + 16;
  const totalHeight = showText ? 92 : 78;

  const leftText = code13.slice(1, 7);
  const rightText = code13.slice(7, 13);
  const leftX = quietLeft + (42 * moduleWidth) / 2 + 3 * moduleWidth;
  const rightX = quietLeft + 47 * moduleWidth + (42 * moduleWidth) / 2;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className={`select-none ${className}`}
      style={{ width: "100%", maxWidth: `${totalWidth * scale * 1.5}px` }}
    >
      {/* Fondo blanco estándar para lectura óptica óptima */}
      <rect width="100%" height="100%" fill="#ffffff" rx="6" />

      {/* Barras verticales */}
      {modules.map((mod, idx) => {
        if (!mod.bit) return null;
        const x = quietLeft + idx * moduleWidth;
        const h = mod.isGuard ? guardHeight : dataHeight;
        return (
          <rect
            key={idx}
            x={x.toFixed(2)}
            y="6"
            width={moduleWidth.toFixed(2)}
            height={h}
            fill="#000000"
          />
        );
      })}

      {/* Texto de dígitos legibles para humanos */}
      {showText && (
        <>
          {/* Primer dígito en la zona muda izquierda */}
          <text
            x="10"
            y="74"
            fontFamily="'Courier New', Courier, monospace, sans-serif"
            fontSize="15"
            fontWeight="bold"
            fill="#000000"
            textAnchor="middle"
          >
            {code13[0]}
          </text>

          {/* Bloque izquierdo de 6 dígitos */}
          <text
            x={leftX.toFixed(2)}
            y="81"
            fontFamily="'Courier New', Courier, monospace, sans-serif"
            fontSize="14"
            fontWeight="bold"
            fill="#000000"
            textAnchor="middle"
            letterSpacing="2.2"
          >
            {leftText}
          </text>

          {/* Bloque derecho de 6 dígitos */}
          <text
            x={rightX.toFixed(2)}
            y="81"
            fontFamily="'Courier New', Courier, monospace, sans-serif"
            fontSize="14"
            fontWeight="bold"
            fill="#000000"
            textAnchor="middle"
            letterSpacing="2.2"
          >
            {rightText}
          </text>

          {/* Símbolo de zona muda derecha '>' */}
          <text
            x={(totalWidth - 6).toFixed(2)}
            y="74"
            fontFamily="'Courier New', Courier, monospace, sans-serif"
            fontSize="13"
            fontWeight="bold"
            fill="#000000"
            textAnchor="middle"
          >
            &gt;
          </text>
        </>
      )}
    </svg>
  );
}

export default function GeneradorEan13View({ productos = [], productoInicial = null, onLimpiarProductoInicial }) {
  const { t } = useTheme();

  // Estados del generador
  const [modo, setModo] = useState("precio"); // "precio" (balanza CLP) | "peso" (gramos) | "manual"
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [busquedaProd, setBusquedaProd] = useState("");
  const [nombreProducto, setNombreProducto] = useState("Tofu Zenorganics Trozo Granel");
  const [marca, setMarca] = useState("ZenOrganics");
  
  // Base 7 dígitos (ej: 2495190)
  const [basePlu, setBasePlu] = useState("2495190");
  
  // Valores para el cálculo
  const [precioUnitario, setPrecioUnitario] = useState(9390); // $/kg
  const [pesoKg, setPesoKg] = useState(0.624); // kg (0.624 o 2.000)
  
  // Modo manual o sobreescritura de dígito
  const [sobreescribirCheckDigit, setSobreescribirCheckDigit] = useState(false);
  const [checkDigitManual, setCheckDigitManual] = useState("1");
  
  // Para modo manual libre
  const [codigoManual12, setCodigoManual12] = useState("249519005859");

  // Historial de códigos generados
  const [historial, setHistorial] = useState(() => {
    try {
      const saved = localStorage.getItem("ean13_historial");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fecha para la etiqueta de balanza
  const [fechaEtiqueta, setFechaEtiqueta] = useState(() => {
    const now = new Date();
    return now.toLocaleString("es-CL", { 
      day: "2-digit", month: "2-digit", year: "numeric", 
      hour: "2-digit", minute: "2-digit" 
    });
  });

  const printRef = useRef(null);

  // Inicializar si viene un producto inicial
  useEffect(() => {
    if (productoInicial) {
      cargarProducto(productoInicial);
      if (onLimpiarProductoInicial) onLimpiarProductoInicial();
    }
  }, [productoInicial]);

  // Cargar datos al seleccionar producto
  const cargarProducto = (prod) => {
    if (!prod) return;
    setProductoSeleccionado(prod);
    setNombreProducto(prod.nombre || "Producto Balanza");
    setMarca(prod.marca || prod.categoria || "Supermercado");

    // Extraer base PLU: si el EAN tiene 7+ dígitos, tomamos los primeros 7
    let cleanCode = (prod.ean || prod.sku || "").replace(/\D/g, "");
    if (cleanCode.length >= 7) {
      setBasePlu(cleanCode.slice(0, 7));
    } else if (cleanCode.length > 0) {
      // Si tiene menos de 7 (ej: un PLU de 5 dígitos como 95190), anteponemos 24
      const padded = cleanCode.padStart(5, "0").slice(-5);
      setBasePlu("24" + padded);
    } else {
      setBasePlu("2495190");
    }

    const { tieneOferta, precioNormal, precioOferta, precioActivo } = getPrecioProducto(prod);
    if (precioActivo !== null && precioActivo > 0) {
      setPrecioUnitario(precioActivo);
      if (tieneOferta && precioNormal) {
        toast.success(
          `Producto cargado: ${prod.nombre} (Oferta: $${precioOferta.toLocaleString("es-CL")} · Normal: $${precioNormal.toLocaleString("es-CL")})`
        );
      } else {
        toast.success(`Producto cargado: ${prod.nombre} ($${precioActivo.toLocaleString("es-CL")})`);
      }
    } else {
      toast.success(`Producto cargado: ${prod.nombre}`);
    }
  };

  // Cálculos reactivos
  const totalCalculado = useMemo(() => {
    const p = Number(precioUnitario) || 0;
    const w = Number(pesoKg) || 0;
    return Math.round(p * w);
  }, [precioUnitario, pesoKg]);

  // Payload embebido de 5 dígitos (precio o peso)
  const payload5Digitos = useMemo(() => {
    if (modo === "peso") {
      // Peso en gramos (ej: 0.624 kg -> 624 g -> 00624)
      const gramos = Math.round((Number(pesoKg) || 0) * 1000);
      return String(Math.min(99999, Math.max(0, gramos))).padStart(5, "0");
    }
    // Modo precio (default): valor en pesos CLP (ej: $5.859 -> 05859, $18.780 -> 18780)
    return String(Math.min(99999, Math.max(0, totalCalculado))).padStart(5, "0");
  }, [modo, totalCalculado, pesoKg]);

  // Los 12 primeros dígitos
  const code12 = useMemo(() => {
    if (modo === "manual") {
      const clean = codigoManual12.replace(/\D/g, "").slice(0, 12);
      return clean.padEnd(12, "0");
    }
    const cleanBase = basePlu.replace(/\D/g, "").slice(0, 7).padEnd(7, "0");
    return cleanBase + payload5Digitos;
  }, [modo, basePlu, payload5Digitos, codigoManual12]);

  // Dígito verificador GS1 automático
  const checkDigitGs1 = useMemo(() => {
    return calcEan13CheckDigit(code12);
  }, [code12]);

  // Dígito verificador final (GS1 o sobreescrito)
  const finalCheckDigit = useMemo(() => {
    if (sobreescribirCheckDigit) {
      const manual = parseInt(checkDigitManual, 10);
      return isNaN(manual) ? 0 : Math.min(9, Math.max(0, manual));
    }
    return checkDigitGs1;
  }, [sobreescribirCheckDigit, checkDigitManual, checkDigitGs1]);

  // Código EAN-13 completo de 13 dígitos
  const fullEan13 = useMemo(() => {
    return code12 + String(finalCheckDigit);
  }, [code12, finalCheckDigit]);

  // Desglose de segmentos para visualización explicativa
  const desglose = useMemo(() => {
    return {
      prefijo: fullEan13.slice(0, 2),       // "24"
      plu: fullEan13.slice(2, 7),           // "95190"
      payload: fullEan13.slice(7, 12),       // "05859" o "18780"
      checkDigit: fullEan13.slice(12, 13)   // "4" o "1"
    };
  }, [fullEan13]);

  // Guardar en historial cuando se genera o consulta
  const registrarEnHistorial = () => {
    const item = {
      id: Date.now(),
      codigo: fullEan13,
      nombre: nombreProducto,
      precioUnitario,
      pesoKg,
      total: totalCalculado,
      modo,
      fecha: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
    };
    setHistorial(prev => {
      // Evitar duplicado consecutivo
      if (prev.length > 0 && prev[0].codigo === fullEan13) return prev;
      const updated = [item, ...prev.slice(0, 9)];
      try {
        localStorage.setItem("ean13_historial", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  // Copiar código al portapapeles
  const copiarCodigo = async (codigo = fullEan13) => {
    try {
      await navigator.clipboard.writeText(codigo);
      registrarEnHistorial();
      toast.success(`Código copiado: ${codigo}`, {
        icon: "📋",
        style: { borderRadius: "12px", background: "#1e293b", color: "#fff" }
      });
    } catch {
      toast.error("No se pudo copiar el código");
    }
  };

  // Imprimir etiqueta de balanza
  const imprimirEtiqueta = () => {
    registrarEnHistorial();
    window.print();
  };

  // Descargar SVG
  const descargarSvg = () => {
    registrarEnHistorial();
    const modules = buildEan13Modules(fullEan13);
    if (!modules) return;

    const moduleWidth = 2.4;
    const quietLeft = 20;
    const dataHeight = 62;
    const guardHeight = 74;
    const totalWidth = quietLeft + modules.length * moduleWidth + 16;
    const totalHeight = 92;

    const leftText = fullEan13.slice(1, 7);
    const rightText = fullEan13.slice(7, 13);
    const leftX = quietLeft + (42 * moduleWidth) / 2 + 3 * moduleWidth;
    const rightX = quietLeft + 47 * moduleWidth + (42 * moduleWidth) / 2;

    let rects = "";
    modules.forEach((mod, idx) => {
      if (mod.bit) {
        const x = quietLeft + idx * moduleWidth;
        const h = mod.isGuard ? guardHeight : dataHeight;
        rects += `<rect x="${x.toFixed(2)}" y="6" width="${moduleWidth.toFixed(2)}" height="${h}" fill="#000000" />\n`;
      }
    });

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth * 2}" height="${totalHeight * 2}">
  <rect width="100%" height="100%" fill="#ffffff" rx="6" />
  ${rects}
  <text x="10" y="74" font-family="'Courier New', Courier, monospace, sans-serif" font-size="15" font-weight="bold" fill="#000000" text-anchor="middle">${fullEan13[0]}</text>
  <text x="${leftX.toFixed(2)}" y="81" font-family="'Courier New', Courier, monospace, sans-serif" font-size="14" font-weight="bold" fill="#000000" text-anchor="middle" letter-spacing="2.2">${leftText}</text>
  <text x="${rightX.toFixed(2)}" y="81" font-family="'Courier New', Courier, monospace, sans-serif" font-size="14" font-weight="bold" fill="#000000" text-anchor="middle" letter-spacing="2.2">${rightText}</text>
  <text x="${(totalWidth - 6).toFixed(2)}" y="74" font-family="'Courier New', Courier, monospace, sans-serif" font-size="13" font-weight="bold" fill="#000000" text-anchor="middle">&gt;</text>
</svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ean13_${fullEan13}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("SVG descargado correctamente");
  };

  // Descargar PNG
  const descargarPng = () => {
    registrarEnHistorial();
    const modules = buildEan13Modules(fullEan13);
    if (!modules) return;

    const canvas = document.createElement("canvas");
    const moduleWidth = 4;
    const quietLeft = 30;
    const dataHeight = 110;
    const guardHeight = 130;
    const totalWidth = quietLeft + modules.length * moduleWidth + 30;
    const totalHeight = 170;

    canvas.width = totalWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext("2d");

    // Fondo blanco
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Barras
    ctx.fillStyle = "#000000";
    modules.forEach((mod, idx) => {
      if (mod.bit) {
        const x = quietLeft + idx * moduleWidth;
        const h = mod.isGuard ? guardHeight : dataHeight;
        ctx.fillRect(x, 15, moduleWidth, h);
      }
    });

    // Texto
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(fullEan13[0], 16, 130);

    const leftX = quietLeft + (42 * moduleWidth) / 2 + 3 * moduleWidth;
    const rightX = quietLeft + 47 * moduleWidth + (42 * moduleWidth) / 2;
    ctx.fillText(fullEan13.slice(1, 7).split("").join(" "), leftX, 152);
    ctx.fillText(fullEan13.slice(7, 13).split("").join(" "), rightX, 152);
    ctx.fillText(">", totalWidth - 12, 130);

    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `ean13_${fullEan13}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("PNG descargado en alta resolución");
  };

  // Filtrar productos para el selector
  const productosFiltrados = useMemo(() => {
    if (!busquedaProd.trim()) return productos.slice(0, 15);
    const q = busquedaProd.toLowerCase();
    return productos.filter(p => 
      (p.nombre && p.nombre.toLowerCase().includes(q)) ||
      (p.ean && p.ean.includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.categoria && p.categoria.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [productos, busquedaProd]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Estilos para impresión única de la etiqueta */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #etiqueta-balanza-print, #etiqueta-balanza-print * {
            visibility: visible !important;
          }
          #etiqueta-balanza-print {
            position: fixed !important;
            left: 50% !important;
            top: 20px !important;
            transform: translateX(-50%) !important;
            width: 380px !important;
            box-shadow: none !important;
            border: 2px dashed #000 !important;
            padding: 16px !important;
            background: #fff !important;
            color: #000 !important;
          }
        }
      `}</style>

      {/* Banner Principal / Explicativo */}
      <div className={`p-4 sm:p-6 rounded-2xl ${t.bgCard} border ${t.border} shadow-lg relative overflow-hidden`}>
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-purple-500/10 to-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <span className="material-symbols-outlined text-[24px]">barcode_scanner</span>
              </span>
              <h2 className={`text-xl sm:text-2xl font-black ${t.text}`}>
                Generador de Códigos EAN-13 (Balanza & Pesables)
              </h2>
            </div>
            <p className={`text-xs sm:text-sm ${t.textSecondary} max-w-2xl`}>
              Crea códigos de barras estándar GS1 para productos de peso variable (tofus, quesos, fiambres, carnes) 
              con precio embebido según la fórmula de balanza de supermercado:{" "}
              <strong className="text-purple-400 font-mono">Precio Unitario × Peso (kg) = Total</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Balanza GS1 Activa
            </span>
          </div>
        </div>
      </div>

      {/* Contenido en 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Columna Izquierda: Entradas y Configuración (7 cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Selector de Producto Registrado */}
          <div className={`p-5 rounded-2xl ${t.bgCard} border ${t.border} shadow-md space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400 text-[20px]">inventory_2</span>
                <h3 className={`text-sm font-black uppercase tracking-wider ${t.text}`}>1. Seleccionar Producto</h3>
              </div>
              {productoSeleccionado && (
                <button
                  type="button"
                  onClick={() => {
                    setProductoSeleccionado(null);
                    setNombreProducto("Producto Personalizado");
                    setMarca("");
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 font-bold underline"
                >
                  Modo Manual / Libre
                </button>
              )}
            </div>

            {/* Buscador de productos */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar por nombre, EAN o SKU en el catálogo..."
                value={busquedaProd}
                onChange={(e) => setBusquedaProd(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-black/20 border ${t.border} ${t.text} placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors`}
              />
            </div>

            {/* Lista desplegable rápida de coincidencias */}
            {busquedaProd.trim() && productosFiltrados.length > 0 && (
              <div className={`max-h-48 overflow-y-auto rounded-xl border ${t.border} bg-slate-900/90 divide-y divide-white/5`}>
                {productosFiltrados.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      cargarProducto(prod);
                      setBusquedaProd("");
                    }}
                    className="w-full p-2.5 text-left hover:bg-purple-600/20 transition-colors flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {prod.imagen ? (
                        <img src={prod.imagen} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 text-slate-400">
                          <span className="material-symbols-outlined text-[16px]">image</span>
                        </div>
                      )}
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <p className="text-xs font-bold text-white group-hover:text-purple-300 truncate">{prod.nombre}</p>
                          {prod.marca && (
                            <span className="text-[9px] font-bold text-purple-300 bg-purple-500/20 px-1 rounded shrink-0">
                              {prod.marca}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
                          <span>EAN: {prod.ean || "S/N"}</span>
                          <span>&bull;</span>
                          <span>SKU: {prod.sku || "S/N"}</span>
                          {(() => {
                            const pInfo = getPrecioProducto(prod);
                            if (pInfo.tieneOferta) {
                              return (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-emerald-400 font-bold font-mono">
                                    Oferta ${pInfo.precioOferta.toLocaleString("es-CL")}
                                  </span>
                                  {pInfo.precioNormal !== null && (
                                    <span className="line-through text-slate-500 font-mono">
                                      ${pInfo.precioNormal.toLocaleString("es-CL")}
                                    </span>
                                  )}
                                </>
                              );
                            }
                            if (pInfo.precioNormal !== null) {
                              return (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-emerald-400 font-bold font-mono">
                                    ${pInfo.precioNormal.toLocaleString("es-CL")}
                                  </span>
                                </>
                              );
                            }
                            return null;
                          })()}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                      Cargar
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Producto actualmente activo */}
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                    Producto Seleccionado
                  </span>
                  {(() => {
                    const selInfo = getPrecioProducto(productoSeleccionado);
                    if (selInfo.tieneOferta) {
                      return (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30 flex items-center gap-1">
                          <span>Oferta: ${selInfo.precioOferta.toLocaleString("es-CL")}</span>
                          {selInfo.precioNormal !== null && (
                            <span className="line-through opacity-65">
                              ${selInfo.precioNormal.toLocaleString("es-CL")}
                            </span>
                          )}
                        </span>
                      );
                    }
                    if (selInfo.precioNormal !== null) {
                      return (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30">
                          Base: ${selInfo.precioNormal.toLocaleString("es-CL")}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
                <input
                  type="text"
                  value={nombreProducto}
                  onChange={(e) => setNombreProducto(e.target.value)}
                  className={`w-full bg-transparent font-bold text-sm ${t.text} focus:outline-none border-b border-transparent focus:border-purple-400`}
                  placeholder="Nombre del producto..."
                />
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block">Marca / Cat.</span>
                <input
                  type="text"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="bg-transparent text-xs text-purple-300 font-semibold text-right focus:outline-none border-b border-transparent focus:border-purple-400 max-w-[120px]"
                  placeholder="Marca..."
                />
              </div>
            </div>
          </div>

          {/* Modalidad y Prefijo */}
          <div className={`p-5 rounded-2xl ${t.bgCard} border ${t.border} shadow-md space-y-4`}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-[20px]">tune</span>
              <h3 className={`text-sm font-black uppercase tracking-wider ${t.text}`}>2. Parámetros de Balanza</h3>
            </div>

            {/* Pestañas de Modo */}
            <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-black/20 border border-white/5">
              <button
                type="button"
                onClick={() => setModo("precio")}
                className={`py-2 px-2 text-xs font-black rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
                  modo === "precio"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-500/30 scale-[1.01]"
                    : `${t.textSecondary} hover:text-white`
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">attach_money</span>
                <span className="truncate">Precio Embebido</span>
              </button>

              <button
                type="button"
                onClick={() => setModo("peso")}
                className={`py-2 px-2 text-xs font-black rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
                  modo === "peso"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-500/30 scale-[1.01]"
                    : `${t.textSecondary} hover:text-white`
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">scale</span>
                <span className="truncate">Peso en Gramos</span>
              </button>

              <button
                type="button"
                onClick={() => setModo("manual")}
                className={`py-2 px-2 text-xs font-black rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
                  modo === "manual"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-500/30 scale-[1.01]"
                    : `${t.textSecondary} hover:text-white`
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                <span className="truncate">Código Directo</span>
              </button>
            </div>

            {modo !== "manual" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Base PLU (7 dígitos) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`text-xs font-bold ${t.textSecondary}`}>
                      Prefijo Balanza + PLU (7 dígitos)
                    </label>
                    <span className="text-[10px] font-mono text-purple-400">
                      {basePlu.length}/7 dígitos
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={7}
                      value={basePlu}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setBasePlu(val);
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl font-mono text-sm font-bold bg-black/20 border ${
                        basePlu.length === 7 ? "border-purple-500/50" : "border-amber-500/70"
                      } ${t.text} focus:outline-none focus:ring-1 focus:ring-purple-500`}
                      placeholder="2495190"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Ej: <code className="text-purple-300">24</code> (prefijo balanza) + <code className="text-purple-300">95190</code> (PLU) = <strong className="text-white">2495190</strong>
                  </p>
                </div>

                {/* Preset rápidos para el código base */}
                <div>
                  <label className={`text-xs font-bold ${t.textSecondary} block mb-1.5`}>
                    Prefijos de Balanza Rápidos
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBasePlu("2495190")}
                      className="px-2.5 py-2 text-left rounded-xl bg-white/5 hover:bg-purple-600/20 border border-white/5 transition-colors"
                    >
                      <p className="text-[11px] font-bold text-white">2495190</p>
                      <p className="text-[9px] text-purple-300 truncate">Tofu Zenorganics</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBasePlu("2400123")}
                      className="px-2.5 py-2 text-left rounded-xl bg-white/5 hover:bg-purple-600/20 border border-white/5 transition-colors"
                    >
                      <p className="text-[11px] font-bold text-white">2400123</p>
                      <p className="text-[9px] text-slate-400 truncate">Queso Gauda</p>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className={`text-xs font-bold ${t.textSecondary} block mb-1.5`}>
                  Primeros 12 Dígitos del EAN-13
                </label>
                <input
                  type="text"
                  maxLength={12}
                  value={codigoManual12}
                  onChange={(e) => setCodigoManual12(e.target.value.replace(/\D/g, ""))}
                  className={`w-full px-3 py-2.5 rounded-xl font-mono text-base font-bold bg-black/20 border border-purple-500/50 ${t.text} focus:outline-none`}
                  placeholder="249519005859"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Ingresa exactamente 12 dígitos. El 13º dígito se calcula automáticamente vía Modulo-10.
                </p>
              </div>
            )}
          </div>

          {/* Calculadora de Precio y Peso (Solo en modo precio o peso) */}
          {modo !== "manual" && (
            <div className={`p-5 rounded-2xl ${t.bgCard} border ${t.border} shadow-md space-y-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-[20px]">calculate</span>
                  <h3 className={`text-sm font-black uppercase tracking-wider ${t.text}`}>3. Valores a Multiplicar</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Calculado</span>
                  <p className="text-lg font-black text-emerald-400">
                    ${totalCalculado.toLocaleString("es-CL")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Precio Unitario */}
                <div>
                  <label className={`text-xs font-bold ${t.textSecondary} block mb-1.5`}>
                    Precio Unitario ($ / kg)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step={10}
                      min={0}
                      value={precioUnitario}
                      onChange={(e) => setPrecioUnitario(Math.max(0, Number(e.target.value)))}
                      className={`w-full pl-8 pr-3 py-2.5 rounded-xl font-mono text-base font-bold bg-black/20 border ${t.border} ${t.text} focus:outline-none focus:border-purple-500`}
                    />
                  </div>
                  {/* Botones rápidos de precio del producto seleccionado (Oferta vs Normal) */}
                  {(() => {
                    const selInfo = getPrecioProducto(productoSeleccionado);
                    if (!selInfo.tieneOferta) return null;
                    return (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setPrecioUnitario(selInfo.precioOferta)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 ${
                            precioUnitario === selInfo.precioOferta
                              ? "bg-emerald-600 text-white border-emerald-400 shadow-sm"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                          }`}
                        >
                          <span>🏷️ Oferta:</span>
                          <span className="font-mono">${selInfo.precioOferta.toLocaleString("es-CL")}</span>
                        </button>
                        {selInfo.precioNormal !== null && (
                          <button
                            type="button"
                            onClick={() => setPrecioUnitario(selInfo.precioNormal)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 ${
                              precioUnitario === selInfo.precioNormal
                                ? "bg-purple-600 text-white border-purple-400 shadow-sm"
                                : "bg-white/5 text-slate-300 border-white/10 hover:border-purple-400/50"
                            }`}
                          >
                            <span>Normal:</span>
                            <span className="font-mono">${selInfo.precioNormal.toLocaleString("es-CL")}</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Presets de precios comunes */}
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {[5990, 8990, 9390, 12990, 15990].map((pr) => (
                      <button
                        key={pr}
                        type="button"
                        onClick={() => setPrecioUnitario(pr)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                          precioUnitario === pr ? "bg-purple-600 text-white" : "bg-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        ${pr.toLocaleString("es-CL")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Peso (kg) */}
                <div>
                  <label className={`text-xs font-bold ${t.textSecondary} block mb-1.5`}>
                    Peso / Cantidad (kg)
                  </label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">kg</span>
                    <input
                      type="number"
                      step={0.005}
                      min={0.001}
                      max={99}
                      value={pesoKg}
                      onChange={(e) => setPesoKg(Math.max(0, Number(e.target.value)))}
                      className={`w-full pl-3 pr-10 py-2.5 rounded-xl font-mono text-base font-bold bg-black/20 border ${t.border} ${t.text} focus:outline-none focus:border-purple-500`}
                    />
                  </div>
                  {/* Presets de peso */}
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {[
                      { label: "100g", val: 0.100 },
                      { label: "250g", val: 0.250 },
                      { label: "500g", val: 0.500 },
                      { label: "0.624 kg", val: 0.624 },
                      { label: "1.000 kg", val: 1.000 },
                      { label: "2.000 kg", val: 2.000 },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setPesoKg(item.val)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                          pesoKg === item.val ? "bg-purple-600 text-white" : "bg-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Caja de cálculo en vivo */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-emerald-500/10 to-transparent border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400 text-[18px]">functions</span>
                  <span className={`${t.textSecondary}`}>Fórmula Balanza:</span>
                  <span className="font-mono font-bold text-white">
                    ${precioUnitario.toLocaleString("es-CL")} × {pesoKg.toFixed(3)} kg ={" "}
                    <strong className="text-emerald-400 font-black text-sm">
                      ${totalCalculado.toLocaleString("es-CL")}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">5 dígitos:</span>
                  <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {payload5Digitos}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sección de Dígito Verificador y Personalización */}
          <div className={`p-5 rounded-2xl ${t.bgCard} border ${t.border} shadow-md space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400 text-[20px]">verified</span>
                <h3 className={`text-sm font-black uppercase tracking-wider ${t.text}`}>4. Dígito Verificador (13º)</h3>
              </div>
              
              <button
                type="button"
                onClick={() => setSobreescribirCheckDigit(!sobreescribirCheckDigit)}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                  sobreescribirCheckDigit
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-white/5 text-slate-400 border-white/5 hover:text-white"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {sobreescribirCheckDigit ? "lock_open" : "tune"}
                </span>
                <span>{sobreescribirCheckDigit ? "Dígito Manual Activo" : "Personalizar Dígito"}</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-black/20 border border-white/5">
              <div>
                <p className={`text-xs font-bold ${t.text}`}>
                  Algoritmo Estándar GS1 (Modulo 10):
                </p>
                <p className="text-[11px] text-slate-400">
                  Dígito calculado matemáticamente:{" "}
                  <strong className="font-mono text-purple-400 text-sm font-black">{checkDigitGs1}</strong>
                </p>
              </div>

              {sobreescribirCheckDigit ? (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-amber-300 font-bold">Sobreescribir a:</label>
                  <input
                    type="number"
                    min={0}
                    max={9}
                    value={checkDigitManual}
                    onChange={(e) => setCheckDigitManual(e.target.value.slice(-1))}
                    className="w-12 text-center py-1 font-mono font-black text-sm rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCheckDigitManual(String(checkDigitGs1));
                      setSobreescribirCheckDigit(false);
                    }}
                    className="text-[10px] text-slate-400 hover:text-white underline"
                  >
                    Restablecer
                  </button>
                </div>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                  Válido GS1
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Columna Derecha: Previsualización de Código & Etiqueta de Balanza (5 cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* Tarjeta de Código EAN-13 Generado */}
          <div className={`p-5 rounded-2xl ${t.bgCard} border ${t.border} shadow-xl space-y-4`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-purple-400">
                Código EAN-13 Generado
              </span>
              <button
                type="button"
                onClick={() => copiarCodigo()}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-500/30 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                <span>Copiar</span>
              </button>
            </div>

            {/* Código en Texto Grande */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-center">
              <p className="font-mono text-2xl sm:text-3xl font-black text-white tracking-widest selection:bg-purple-500">
                {fullEan13}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                EAN-13 estándar para escáneres de caja e inventario
              </p>
            </div>

            {/* Desglose visual por colores */}
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="p-2 rounded-lg bg-purple-500/15 border border-purple-500/30">
                <span className="text-[9px] text-purple-300 font-bold block uppercase">Prefijo</span>
                <span className="font-mono font-black text-sm text-purple-400">{desglose.prefijo}</span>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/15 border border-blue-500/30">
                <span className="text-[9px] text-blue-300 font-bold block uppercase">PLU</span>
                <span className="font-mono font-black text-sm text-blue-400">{desglose.plu}</span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
                <span className="text-[9px] text-emerald-300 font-bold block uppercase">
                  {modo === "peso" ? "Gramos" : "Precio"}
                </span>
                <span className="font-mono font-black text-sm text-emerald-400">{desglose.payload}</span>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30">
                <span className="text-[9px] text-amber-300 font-bold block uppercase">Dígito</span>
                <span className="font-mono font-black text-sm text-amber-400">{desglose.checkDigit}</span>
              </div>
            </div>

            {/* Renderizado de Código de Barras SVG Nítido */}
            <div className="p-4 rounded-xl bg-white shadow-inner flex flex-col items-center justify-center">
              <Ean13BarcodeSvg code13={fullEan13} scale={1} />
            </div>

            {/* Botones de Exportación Rápida */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={descargarSvg}
                className="py-2 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5"
                title="Descargar código como gráfico vectorial SVG"
              >
                <span className="material-symbols-outlined text-[16px]">draw</span>
                <span>SVG</span>
              </button>
              
              <button
                type="button"
                onClick={descargarPng}
                className="py-2 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5"
                title="Descargar código como imagen PNG en alta resolución"
              >
                <span className="material-symbols-outlined text-[16px]">image</span>
                <span>PNG</span>
              </button>

              <button
                type="button"
                onClick={imprimirEtiqueta}
                className="py-2 px-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                title="Imprimir sticker térmico de balanza"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Imprimir</span>
              </button>
            </div>
          </div>

          {/* Previsualización de Etiqueta Térmica de Balanza (Imprimible) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className={`text-xs font-bold ${t.textSecondary}`}>
                Simulador de Etiqueta Térmica (Sticker)
              </span>
              <button
                type="button"
                onClick={() => {
                  setFechaEtiqueta(new Date().toLocaleString("es-CL", { 
                    day: "2-digit", month: "2-digit", year: "numeric", 
                    hour: "2-digit", minute: "2-digit" 
                  }));
                  toast.success("Fecha y hora actualizadas");
                }}
                className="text-[11px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
                title="Actualizar fecha y hora al momento actual"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span>
                <span>Actualizar hora</span>
              </button>
            </div>

            {/* Sticker de Balanza Físico */}
            <div
              id="etiqueta-balanza-print"
              ref={printRef}
              className="bg-white text-slate-900 rounded-2xl p-5 border-2 border-slate-300 shadow-xl space-y-3 font-sans"
            >
              {/* Encabezado Supermercado */}
              <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm tracking-wider uppercase text-slate-900">
                    SUPERMERCADO JUMBO
                  </h4>
                  <p className="text-[10px] text-slate-600 font-semibold tracking-wide">
                    DELICATESSEN &bull; GRANEL &bull; PESABLES
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono text-slate-500 block">ENVASADO</span>
                  <span className="text-[10px] font-bold text-slate-800">{fechaEtiqueta}</span>
                </div>
              </div>

              {/* Nombre del Producto */}
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  {nombreProducto}
                </h3>
                {marca && (
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    {marca}
                  </p>
                )}
              </div>

              {/* Fila de Métricas: Precio/kg, Peso, Total */}
              <div className="grid grid-cols-3 gap-2 py-2 border-y border-dashed border-slate-300 text-center">
                <div className="border-r border-slate-200 pr-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">$/kg</span>
                  <span className="text-xs font-black text-slate-800 font-mono">
                    ${precioUnitario.toLocaleString("es-CL")}
                  </span>
                </div>

                <div className="border-r border-slate-200 pr-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Peso Neto</span>
                  <span className="text-xs font-black text-slate-800 font-mono">
                    {pesoKg.toFixed(3)} kg
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Total a Pagar</span>
                  <span className="text-sm font-black text-slate-900 font-mono">
                    ${totalCalculado.toLocaleString("es-CL")}
                  </span>
                </div>
              </div>

              {/* Código de Barras Centrado */}
              <div className="pt-1 flex flex-col items-center justify-center">
                <Ean13BarcodeSvg code13={fullEan13} scale={0.95} />
              </div>

              {/* Pie de etiqueta */}
              <div className="pt-1 text-center border-t border-slate-100">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                  MANTENER REFRIGERADO &bull; VALOR CALCULADO EN BALANZA
                </p>
              </div>
            </div>
          </div>

          {/* Historial de Códigos Recientes */}
          {historial.length > 0 && (
            <div className={`p-4 rounded-2xl ${t.bgCard} border ${t.border} shadow-md space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">history</span>
                  Historial Reciente ({historial.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setHistorial([]);
                    localStorage.removeItem("ean13_historial");
                    toast.success("Historial limpiado");
                  }}
                  className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                >
                  Limpiar
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {historial.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-xl bg-black/20 hover:bg-black/40 border border-white/5 flex items-center justify-between gap-2 text-xs transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate text-[11px]">{item.nombre}</p>
                      <p className="font-mono text-slate-400 text-[10px]">
                        ${item.total?.toLocaleString("es-CL")} &bull; {item.pesoKg} kg &bull;{" "}
                        <strong className="text-purple-400">{item.codigo}</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => copiarCodigo(item.codigo)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-600 text-slate-400 hover:text-white transition-colors"
                      title="Copiar este código"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
