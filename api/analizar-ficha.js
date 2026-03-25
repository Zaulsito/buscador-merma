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
      prompt = `Eres un extractor de datos estricto. Analiza esta tabla de control de almacenamiento de insumos.

La tabla tiene exactamente estas columnas (de izquierda a derecha):
1. INSUMOS — nombre del producto
2. CERRADO / Modo de Almacenamiento
3. CERRADO / Retiro de Cámara y/o Bodega antes del Vencimiento
4. ABIERTO / Duración (puede tener texto entre paréntesis como "(antes del vcto original)")
5. ABIERTO / Modo de Almacenamiento

Devuelve SOLO este JSON sin markdown ni texto adicional:
[
  {
    "insumo": "NOMBRE EN MAYUSCULAS",
    "cerrado_modo": "Refrigerado",
    "cerrado_retiro": "4 días",
    "abierto_duracion": "2 días",
    "abierto_ejemplo": "antes del vcto original",
    "abierto_modo": "Refrigerado"
  }
]

REGLAS CRÍTICAS — lee celda por celda, NO combines columnas:
- insumo: nombre exacto en MAYÚSCULAS
- cerrado_modo: SOLO uno de: "Fresco y seco", "Refrigerado", "Congelado", "Refrigerado o Congelado", "N/A"
- cerrado_retiro: texto de la columna 3 exactamente (ej: "4 días", "1 día (desde la recepción)", "N/A")
- abierto_duracion: SOLO el número/días de la columna 4, SIN el texto entre paréntesis (ej: "2 días", "15 días")
- abierto_ejemplo: SOLO el texto entre paréntesis de la columna 4 si existe (ej: "antes del vcto original", "desde que se congela"), si no hay → "N/A"
- abierto_modo: SOLO uno de: "Fresco y seco", "Refrigerado", "Congelado", "N/A"
- Si un insumo tiene 2 filas (ej: Refrigerado Y Congelado), crea 2 objetos separados con el mismo nombre
- Celda vacía → "N/A"
- Extrae TODOS los insumos sin omitir ninguno
- NO inventes datos

Responde ÚNICAMENTE con el JSON array. Sin explicaciones. Sin markdown.`;

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

    if (tipo === "completa" || tipo === "ingredientes" || tipo === "vida_util") {
      try {
        const clean = texto.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        if (tipo === "ingredientes") return res.status(200).json({ ingredientes: parsed });
        if (tipo === "vida_util") return res.status(200).json({ insumos: parsed });
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
