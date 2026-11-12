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

/**
 * Extrae números de precio válidos cuando un campo de texto o arreglo contiene uno o más valores CLP.
 * @param {unknown} rawVal
 * @returns {number[]}
 */
function parseListaPrecios(rawVal) {
  if (Array.isArray(rawVal)) {
    return rawVal
      .map(parsePrecioNumero)
      .filter((n) => n !== null && n > 0);
  }
  if (typeof rawVal === "string") {
    const tokens = rawVal.match(/\d{1,3}(?:\.\d{3})+|\d{3,7}/g);
    if (tokens && tokens.length > 1) {
      return tokens
        .map(parsePrecioNumero)
        .filter((n) => n !== null && n > 0);
    }
  }
  const single = parsePrecioNumero(rawVal);
  return single !== null && single > 0 ? [single] : [];
}

/**
 * Normaliza precio normal y precio oferta a partir de la respuesta JSON de IA.
 * @param {object|null|undefined} parsed
 * @param {string} [rawText]
 */
export function resolverPreciosIA(parsed, rawText = "") {
  const safe = parsed && typeof parsed === "object" ? parsed : {};
  const preciosRaw = parseListaPrecios(safe.precio ?? safe.valor);

  let numPrecioExtraido = null;
  let numPrecioOfertaExtraido = parsePrecioNumero(
    safe.precioOferta ?? safe.precio_oferta ?? safe.precioDescuento ?? safe.precio_descuento
  );

  if (preciosRaw.length >= 2) {
    numPrecioExtraido = Math.max(...preciosRaw);
    if (numPrecioOfertaExtraido === null) {
      numPrecioOfertaExtraido = Math.min(...preciosRaw);
    }
  } else if (preciosRaw.length === 1) {
    numPrecioExtraido = preciosRaw[0];
  }

  if (numPrecioExtraido === null && rawText) {
    const matchPrecio = String(rawText).match(/\$\s*(\d{1,3}(?:\.\d{3})+|\d{3,6})/);
    if (matchPrecio) {
      numPrecioExtraido = parsePrecioNumero(matchPrecio[1]);
    }
  }

  const numPrecioAnterior = parsePrecioNumero(
    safe.precioAnterior ??
      safe.precio_anterior ??
      safe.precioOriginal ??
      safe.precio_original ??
      safe.precioNormal ??
      safe.precio_normal ??
      safe.precioLista
  );
  if (
    numPrecioAnterior !== null &&
    numPrecioExtraido !== null &&
    numPrecioAnterior > numPrecioExtraido &&
    numPrecioOfertaExtraido === null
  ) {
    numPrecioOfertaExtraido = numPrecioExtraido;
    numPrecioExtraido = numPrecioAnterior;
  }

  if (
    numPrecioExtraido !== null &&
    numPrecioOfertaExtraido !== null &&
    numPrecioOfertaExtraido > numPrecioExtraido
  ) {
    [numPrecioExtraido, numPrecioOfertaExtraido] = [
      numPrecioOfertaExtraido,
      numPrecioExtraido,
    ];
  }

  if (
    numPrecioExtraido !== null &&
    numPrecioOfertaExtraido !== null &&
    numPrecioOfertaExtraido === numPrecioExtraido
  ) {
    numPrecioOfertaExtraido = null;
  }

  const tieneOfertaExtraida = Boolean(
    numPrecioOfertaExtraido !== null && numPrecioOfertaExtraido > 0
  );

  return {
    numPrecioExtraido,
    numPrecioOfertaExtraido,
    tieneOfertaExtraida,
  };
}
