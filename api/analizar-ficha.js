export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") return res.status(405).end();

  res.setHeader("Access-Control-Allow-Origin", "*");

  // Verificar que existe la API key
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY no configurada en variables de entorno" });
  }

  try {
    const { image, mimeType } = req.body;

    if (!image) return res.status(400).json({ error: "No se recibió imagen" });
    if (!mimeType) return res.status(400).json({ error: "No se recibió mimeType" });

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: image,
                }
              },
              {
                text: `Transcribe EXACTAMENTE y al COMPLETO todo el texto del proceso de elaboración que aparece en esta imagen, tal cual como está escrito, sin resumir, sin omitir nada, sin parafrasear.

Mantén el formato original:
- Si tiene numeración (1-, 2-, 1., 2., etc.) respétala exactamente
- Si tiene pasos con guiones o viñetas, mantenlos
- Conserva mayúsculas, puntuación y acentos tal como aparecen
- No agregues ni quites palabras
- Transcribe TODO el texto del proceso, incluso si es largo

Si hay secciones con títulos como "PROCESO:", "ELABORACIÓN:", "PREPARACIÓN:", inclúyelos también.
Responde únicamente con el texto transcrito, sin explicaciones adicionales.`,
              }
            ]
          }]
        })
      }
    );

    const data = await geminiRes.json();

    // Log completo para debug
    console.log("Status Gemini:", geminiRes.status);
    console.log("Respuesta Gemini:", JSON.stringify(data));

    // Error de API key o cuota
    if (data.error) {
      return res.status(500).json({
        error: `Error de Gemini: ${data.error.message || JSON.stringify(data.error)}`
      });
    }

    if (!data.candidates?.[0]) {
      return res.status(500).json({
        error: "Gemini no devolvió candidatos",
        detalle: JSON.stringify(data)
      });
    }

    const texto = data.candidates[0].content?.parts?.[0]?.text?.trim() || "";

    if (!texto) {
      return res.status(500).json({ error: "Gemini respondió vacío" });
    }

    res.status(200).json({ descripcionProceso: texto });

  } catch (err) {
    console.error("Error handler:", err);
    res.status(500).json({ error: err.message });
  }
}
