// Tablas estándar de codificación EAN-13 (GS1)
export const L_CODES = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
export const G_CODES = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
export const R_CODES = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];

export const PARITIES = [
  "LLLLLL", // 0
  "LLGLGG", // 1
  "LLGGLG", // 2 (Prefijo 24, 20-29 balanzas)
  "LLGGGL", // 3
  "LGLLGG", // 4
  "LGGLLG", // 5
  "LGGGLL", // 6
  "LGLGLG", // 7
  "LGLGGL", // 8
  "LGGLGL"  // 9
];

/**
 * Calcula el Dígito Verificador GS1 Modulo 10 para los primeros 12 dígitos.
 */
export function calcEan13CheckDigit(code12) {
  if (!code12 || code12.length !== 12) return 0;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code12[i], 10);
    if (isNaN(digit)) return 0;
    sum += i % 2 === 0 ? digit * 1 : digit * 3;
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}

/**
 * Genera la secuencia de 95 módulos binarios (0 y 1) para un código EAN-13.
 */
export function buildEan13Modules(code13) {
  if (!code13 || code13.length !== 13) return null;
  const first = parseInt(code13[0], 10);
  if (isNaN(first)) return null;

  const parity = PARITIES[first] || "LLLLLL";
  const modules = [];

  // Guardia Inicial: 101 (3 módulos)
  "101".split("").forEach(b => modules.push({ bit: b === "1", isGuard: true }));

  // 6 Dígitos Izquierdos (posiciones 1 a 6)
  for (let i = 1; i <= 6; i++) {
    const d = parseInt(code13[i], 10);
    if (isNaN(d)) return null;
    const p = parity[i - 1];
    const pattern = p === "L" ? L_CODES[d] : G_CODES[d];
    pattern.split("").forEach(b => modules.push({ bit: b === "1", isGuard: false }));
  }

  // Guardia Central: 01010 (5 módulos)
  "01010".split("").forEach(b => modules.push({ bit: b === "1", isGuard: true }));

  // 6 Dígitos Derechos (posiciones 7 a 12)
  for (let i = 7; i <= 12; i++) {
    const d = parseInt(code13[i], 10);
    if (isNaN(d)) return null;
    const pattern = R_CODES[d];
    pattern.split("").forEach(b => modules.push({ bit: b === "1", isGuard: false }));
  }

  // Guardia Final: 101 (3 módulos)
  "101".split("").forEach(b => modules.push({ bit: b === "1", isGuard: true }));

  return modules; // Exactamente 95 módulos
}
