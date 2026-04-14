export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") return res.status(405).end();
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY no configurada" });
  }

  try {
    const { image, mimeType, tipo = "proceso" } = req.body;

    if (!image) return res.status(400).json({ error: "No se recibió imagen" });
    if (!mimeType) return res.status(400).json({ error: "No se recibió mimeType" });

    let prompt;

    if (tipo === "completa") {
      prompt = `Analiza esta ficha técnica de cocina y extrae TODOS los datos que aparezcan visualmente.
Devuelve SOLO un JSON válido sin markdown ni explicaciones con esta estructura exacta:
{
  "nombre": "NOMBRE EN MAYUSCULAS O VACIO",
  "codigo": "codigo si aparece o vacio",
  "seccion": "seccion o categoria si aparece o vacio",
  "porciones": "ej: 4 porciones o vacio",
  "tiempoPreparacion": "ej: 30 min o vacio",
  "descripcionProceso": "transcripcion exacta completa del proceso paso a paso, respetando numeracion",
  "tempCoccion": "solo el numero o NA",
  "tempEnfriado": "solo el numero o NA",
  "tempAlmacenamiento": "solo el numero o NA",
  "vidaUtilGrado": "ej: el dia o NA",
  "vidaUtilVacio": "ej: 3 dias o NA",
  "vidaUtilAnaquel": "ej: 5 dias o NA",
  "materiasPrimas": [
    { "nombre": "NOMBRE EN MAYUSCULAS", "cantidadBruta": "0.000", "cantidadNeta": "0.000", "unidad": "KG", "codSap": "" }
  ],
  "elementosDecorativos": [
    { "nombre": "NOMBRE EN MAYUSCULAS", "cantidadBruta": "0.000", "cantidadNeta": "0.000", "unidad": "KG", "codSap": "" }
  ],
  "envases": [
    { "descripcion": "DESCRIPCION EN MAYUSCULAS", "codigoSap": "", "cantidad": "", "pesoEnvase": "" }
  ],
  "formatosVenta": [
    { "codSap": "", "descripcion": "DESCRIPCION EN MAYUSCULAS", "numEnvase": "", "pesoProducto": "0.000", "codBarra": "" }
  ],
  "revisiones": [
    { "numero": "000", "fecha": "YYYY-MM-DD", "descripcion": "DESCRIPCION DEL CAMBIO" }
  ]
}
Reglas estrictas:
- SOLO extrae lo que aparece visualmente en la imagen, no inventes datos
- Nombres e ingredientes SIEMPRE en MAYUSCULAS
- Cantidades con 3 decimales como string (ej: "0.500")
- Si un campo no aparece en la imagen deja string vacio "" o "NA" segun corresponda
- Arrays vacios [] si no hay datos de esa seccion
- El proceso transcribelo COMPLETO y EXACTO tal como aparece
Responde UNICAMENTE con el JSON.`;

    } else if (tipo === "ingredientes") {
      prompt = `Extrae TODOS los ingredientes o materias primas que aparecen en esta imagen con sus cantidades.
Devuelve SOLO un JSON válido sin markdown, con este formato exacto:
[
  { "nombre": "NOMBRE EN MAYUSCULAS", "cantidadBruta": "0.000", "cantidadNeta": "0.000", "unidad": "KG", "codSap": "" }
]
Reglas:
- El nombre SIEMPRE en MAYÚSCULAS
- cantidadBruta y cantidadNeta como string con 3 decimales (ej: "0.500")
- Si solo hay una cantidad, úsala como cantidadBruta y cantidadNeta
- unidad puede ser: KG, LT, UN, GR, CC, u otras que aparezcan
- Si hay un código SAP o código de producto numérico asociado al ingrediente, ponlo en codSap, si no déjalo ""
- Si no hay cantidad visible usa "0.000"
- No incluyas filas vacías ni subtítulos, solo ingredientes reales
Responde ÚNICAMENTE con el JSON, sin explicaciones.`;

    } else if (tipo === "vida_util") {
      prompt = `Eres un extractor de datos de tablas. Analizarás una tabla de control de vida útil de insumos de cocina industrial.

ESTRUCTURA EXACTA DE LA TABLA que debes leer:
| INSUMOS | CERRADO: Modo de Almacenamiento | CERRADO: Retiro Cámara/Bodega antes del Vencimiento | ABIERTO: Modo de Almacenamiento | ABIERTO: Duración |

TAREA: Lee cada fila de la tabla y extrae los datos. Devuelve SOLO este JSON array sin markdown, sin explicaciones:
[
  {
    "insumo": "NOMBRE EXACTO EN MAYUSCULAS",
    "cerrado_modo": "Fresco y seco",
    "cerrado_retiro": "2 meses",
    "abierto_modo": "Fresco y seco",
    "abierto_duracion": "30 días"
  }
]

REGLAS ABSOLUTAS — NO NEGOCIABLES:
1. "insumo": copia el texto EXACTO de la columna INSUMOS en MAYÚSCULAS
2. "cerrado_modo": lee la columna "Modo de Almacenamiento" del bloque CERRADO. Usa EXACTAMENTE uno de: "Fresco y seco" | "Refrigerado" | "Congelado" | "N/A"
3. "cerrado_retiro": lee la columna "Retiro Cámara/Bodega antes del Vencimiento" del bloque CERRADO. Copia el texto tal cual (ej: "4 días", "2 meses", "1 día desde la recepción", "N/A"). Si dice "N/A" o está vacío → "N/A"
4. "abierto_modo": lee la columna "Modo de Almacenamiento" del bloque ABIERTO. Usa EXACTAMENTE uno de: "Fresco y seco" | "Refrigerado" | "Congelado" | "N/A"
5. "abierto_duracion": lee la columna "Duración" del bloque ABIERTO. Copia el valor NUMÉRICO con unidad (ej: "30 días", "2 días", "15 días"). Si hay texto entre paréntesis IGNORARLO completamente. Si vacío → "N/A"

ERRORES QUE DEBES EVITAR:
- NO confundas "Retiro antes del vencimiento" (cerrado_retiro) con "Duración abierto" (abierto_duracion)
- NO mezcles datos entre columnas
- NO inventes valores que no están en la imagen
- NO omitas filas aunque el insumo tenga nombre largo o difícil
- Si un insumo tiene múltiples filas (Refrigerado Y Congelado), crea un objeto por cada fila con el mismo nombre
- Una celda vacía o con "—" → "N/A"
- Los valores de días SIEMPRE en formato "X días" o "X meses" con tilde en días

Extrae ABSOLUTAMENTE TODOS los insumos de la tabla. No omitas ninguno.
Responde ÚNICAMENTE con el JSON array. Sin texto adicional. Sin markdown.`;

    } else if (tipo === "planograma") {
      prompt = `Eres un extractor de datos ESTRICTO. Analizarás la foto de un planograma semanal o mensual de cocina.

ESTRUCTURA DEL PLANOGRAMA:
- Es una tabla rectangular
- Las FILAS son categorías de platos (Entradas, Principal, Parrilla, Sopa, Acompañamiento, Ensaladas, Postres, etc.)
- Las COLUMNAS son los días: cada columna tiene un encabezado con el NOMBRE DEL DÍA DE SEMANA (LUNES, MARTES, MIÉRCOLES, JUEVES, VIERNES, SÁBADO, DOMINGO) y un NÚMERO de día del mes
- El encabezado de la imagen muestra el rango de fechas (ej: "06 AL 12 DE ABRIL") y/o el MES y AÑO

═══════════════════════════════════════════════
REGLA CRÍTICA N°1 — AÑO:
Lee el año CON EXACTITUD ABSOLUTA desde el encabezado de la imagen.
- Si el encabezado dice "2026" → anio: 2026
- Si el encabezado dice "2025" → anio: 2025
- NO asumas ni inventes el año. Léelo tal cual aparece en la imagen.
- Si no aparece explícitamente, deja anio: null.
═══════════════════════════════════════════════

═══════════════════════════════════════════════
REGLA CRÍTICA N°2 — DÍA DE SEMANA:
Lee el nombre del día de la semana del ENCABEZADO DE CADA COLUMNA.
- Ese encabezado es la fuente de verdad absoluta. Si dice "LUNES", ese día ES lunes.
- Incluye "diaSemana" en cada objeto con el valor exacto leído del encabezado.
- Valores válidos: "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"
- NO calcules el día de semana a partir del número: léelo directamente de la columna.
═══════════════════════════════════════════════

═══════════════════════════════════════════════
REGLA CRÍTICA N°3 — NÚMERO DE DÍA:
El campo "dia" es el NÚMERO CALENDARIO del día (1 a 31).
- Léelo del número visible en el encabezado de columna, o del rango en el título (ej: "06 AL 12" → días 6,7,8,9,10,11,12).
- NUNCA uses 0. NUNCA uses el índice de columna como número de día.
═══════════════════════════════════════════════

Devuelve SOLO este JSON sin markdown ni texto adicional:
{
  "mes": 4,
  "anio": 2026,
  "dias": [
    {
      "dia": 6,
      "diaSemana": "Lunes",
      "entradas": ["NOMBRE PLATO EN MAYUSCULAS"],
      "principal": ["NOMBRE PLATO EN MAYUSCULAS"],
      "parrilla": [],
      "sopa": ["NOMBRE PLATO EN MAYUSCULAS"],
      "acompanamiento": ["NOMBRE PLATO EN MAYUSCULAS"],
      "ensaladas": ["NOMBRE PLATO EN MAYUSCULAS"],
      "postres": ["NOMBRE PLATO EN MAYUSCULAS"]
    }
  ]
}

REGLAS ADICIONALES:
- "mes": número del mes (1=Enero ... 12=Diciembre). Léelo del encabezado.
- Nombres de platos SIEMPRE en MAYÚSCULAS tal como aparecen en la imagen.
- Celda vacía → array vacío []
- Incluye TODOS los días que aparezcan en la imagen.
- Si hay múltiples platos en una celda, ponlos como elementos separados del array.
- NO inventes datos que no estén visibles en la imagen.
- Categorías inexistentes en el planograma → array vacío []

Responde ÚNICAMENTE con el JSON. Sin explicaciones. Sin markdown. Sin bloques de código.`;
    } else if (tipo === "precio") {
      prompt = `Eres un extractor ESTRICTO de precios y productos desde imágenes. Analizarás fotos de: etiquetas de precio, gondolas de supermercado, listas de precios, recibos, tickets, pantallas de caja, o cualquier imagen con precios de productos.

TAREA: Extrae TODOS los productos con sus precios y códigos de barras visibles.

═══ REGLAS ABSOLUTAS ═══

PRECIO:
- Convierte formato chileno a número entero: $1.290 → 1290, $12.990 → 12990
- Si hay precio tachado (precio anterior) y precio actual, usa el precio actual
- Si no puedes leer el precio con certeza → null
- NO inventes precios

NOMBRE:
- Extrae el nombre del producto EXACTAMENTE como aparece en la imagen, en MAYÚSCULAS
- Si hay descripción larga, toma solo el nombre principal
- Si no hay nombre visible → string vacío ""

CÓDIGO DE BARRAS:
- Si hay un código de barras o número EAN/UPC visible, inclúyelo en "codBarra"
- Puede aparecer como número bajo el código de barras (ej: 7802300012345)
- Si no hay código visible → null

MÚLTIPLES PRODUCTOS:
- Si la imagen tiene VARIOS productos con precios → extrae TODOS en el array "precios"
- Máximo 20 productos por imagen

Devuelve SOLO este JSON sin markdown:
{
  "precio": 1290,
  "nombre": "NOMBRE PRINCIPAL DEL PRODUCTO",
  "codBarra": "7802300012345",
  "precios": [
    { "precio": 1290, "nombre": "PRODUCTO 1", "codBarra": "7802300012345" },
    { "precio": 890,  "nombre": "PRODUCTO 2", "codBarra": null }
  ]
}

Nota: si hay un solo producto → pon su precio en "precio" y "precios" como array vacío []. Si hay varios → pon el primero en "precio" y todos en "precios".
Responde ÚNICAMENTE con el JSON. Sin explicaciones. Sin markdown.`;

    } else {
      prompt = `Transcribe EXACTAMENTE y al COMPLETO todo el texto del proceso de elaboración que aparece en esta imagen, tal cual como está escrito, sin resumir, sin omitir nada, sin parafrasear.
Mantén el formato original:
- Si tiene numeración (1-, 2-, 1., 2., etc.) respétala exactamente
- Si tiene pasos con guiones o viñetas, mantenlos
- Conserva mayúsculas, puntuación y acentos tal como aparecen
- No agregues ni quites palabras
- Transcribe TODO el texto del proceso, incluso si es largo
Responde únicamente con el texto transcrito, sin explicaciones adicionales.`;
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: image } },
              { text: prompt }
            ]
          }]
        })
      }
    );

    const data = await geminiRes.json();

    if (data.error) {
      return res.status(500).json({ error: `Error de Gemini: ${data.error.message}` });
    }

    if (!data.candidates?.[0]) {
      return res.status(500).json({ error: "Sin respuesta de Gemini", detalle: JSON.stringify(data) });
    }

    const texto = data.candidates[0].content?.parts?.[0]?.text?.trim() || "";
    if (!texto) return res.status(500).json({ error: "Gemini respondió vacío" });

    if (tipo === "completa" || tipo === "ingredientes" || tipo === "vida_util" || tipo === "planograma" || tipo === "precio") {
      try {
        const clean = texto.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        if (tipo === "ingredientes") return res.status(200).json({ ingredientes: parsed });
        if (tipo === "vida_util") return res.status(200).json({ insumos: parsed });
        if (tipo === "planograma") return res.status(200).json({ planograma: parsed });
        if (tipo === "precio") return res.status(200).json({ resultado: parsed });
        return res.status(200).json(parsed);
      } catch {
        return res.status(500).json({ error: "No se pudo parsear la respuesta", raw: texto });
      }
    }

    res.status(200).json({ descripcionProceso: texto });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
