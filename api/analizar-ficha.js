export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") return res.status(405).end();

  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { image, mimeType } = req.body;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
                text: `Extrae SOLO los pasos del proceso de elaboración que aparecen en esta imagen.
Devuelve el texto en formato simple, un paso por línea, numerados así:
1- Primer paso
2- Segundo paso
3- Tercer paso

Ignora ingredientes, temperaturas, títulos y cualquier otro dato. Solo los pasos del proceso.
Si no hay pasos claramente definidos, extrae el texto descriptivo del proceso tal como aparece.
Responde únicamente en español.`,
              }
            ]
          }]
        })
      }
    );

    const data = await response.json();

    if (!data.candidates?.[0]) {
      return res.status(500).json({ error: "Sin respuesta de Gemini", raw: data });
    }

    const texto = data.candidates[0].content.parts[0].text?.trim() || "";
    
    // Devolver como descripcionProceso directamente
    res.status(200).json({ descripcionProceso: texto });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
