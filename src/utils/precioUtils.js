/**
 * Convierte un valor de precio (número o texto con separadores) en entero CLP válido.
 * @param {number|string|null|undefined} val
 * @returns {number|null}
 */
export function parsePrecioNumero(val) {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val === "number") {
    return Number.isFinite(val) && val >= 0 ? Math.round(val) : null;
  }
  const digits = String(val).replace(/[^\d]/g, "");
  if (!digits) return null;
  const num = Number(digits);
  return Number.isFinite(num) ? num : null;
}

/**
 * Resuelve el estado normalizado de precio normal y precio oferta de un producto.
 * @param {object|null|undefined} prod
 */
export function getPrecioProducto(prod) {
  if (!prod) {
    return {
      precioNormal: null,
      precioOferta: null,
      tieneOferta: false,
      precioActivo: null,
      descuentoPct: 0,
    };
  }

  const precioNormal = parsePrecioNumero(prod.precio);
  const precioOferta = parsePrecioNumero(prod.precioOferta);
  const tieneOferta = Boolean(prod.enOferta && precioOferta !== null && precioOferta > 0);
  const precioActivo = tieneOferta ? precioOferta : precioNormal;
  const descuentoPct =
    tieneOferta && precioNormal && precioNormal > precioOferta
      ? Math.round(((precioNormal - precioOferta) / precioNormal) * 100)
      : 0;

  return {
    precioNormal,
    precioOferta,
    tieneOferta,
    precioActivo,
    descuentoPct,
  };
}
